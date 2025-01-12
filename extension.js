//    Power Profile Indicator
//    GNOME Shell extension
//    @fthx 2024


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';


const PowerProfileIndicator = GObject.registerClass(
class PowerProfileIndicator extends SystemIndicator {
    powerProfiles = ['power-saver', 'balanced', 'performance'];
    counter = 0; //To prevent overscrolling
    ignoreUp = false; //To prevent locking the main thread
    ingoreDown = false;
    
    _handleScrollEvent(event) {
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.UP:
                if (this.counter < 0) 
                    this.counter = 0;
                else 
                    this.counter++;
                if (this.counter > 3 && !this.ignoreUp) { //When the counter reaches 5 and power-saver hasn't been activated yet, 
                    //Check the current power saver mode
                    let currentProfileUp = new TextDecoder().decode(GLib.spawn_command_line_sync('powerprofilesctl get')[1]).trim();
                    //Check for the next one
                    let newPowerProfileUp = this.powerProfiles[this.powerProfiles.indexOf(currentProfileUp) - 1];
                    //If power-saver isn't on, this should execute since there is a lower mode
                    if (newPowerProfileUp) {
                        GLib.spawn_command_line_async(`powerprofilesctl set ${newPowerProfileUp}`);
                        this.counter = 0;
                        this.ingoreDown = false;
                    } else {
                        //There are no lower power modes
                        this.ignoreUp = true;
                    }
                }
                break;

            case Clutter.ScrollDirection.DOWN:
                if (this.counter > 0) 
                    this.counter = 0;
                else 
                    this.counter--;
                if (this.counter < -3 && !this.ingoreDown) {
                    let currentProfileDown = new TextDecoder().decode(GLib.spawn_command_line_sync('powerprofilesctl get')[1]).trim();
                    let newPowerProfileDown = this.powerProfiles[this.powerProfiles.indexOf(currentProfileDown) + 1];
                    if (newPowerProfileDown) {
                        GLib.spawn_command_line_async(`powerprofilesctl set ${newPowerProfileDown}`);
                        this.counter = 0;
                        this.ignoreUp = false;
                    } else {
                        this.ingoreDown = true;
                    }
                }
                break;
        }
    }
    
    _init() {
        super._init();

        this._indicator = this._addIndicator();

        this._timeout = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._power_profile_toggle = Main.panel.statusArea.quickSettings._powerProfiles.quickSettingsItems[0];
            if (this._power_profile_toggle) {
                this.connect('scroll-event', (actor, event) => {this._handleScrollEvent(event)});
                this._power_profile_toggle._proxy.connectObject('g-properties-changed', this._set_icon.bind(this), this);
                this._set_icon();
            }

            return GLib.SOURCE_REMOVE;
        });
    }

    _set_icon() {
        this._indicator.icon_name = this._power_profile_toggle.icon_name;

        if (this._active_style_class_name) {
            this._indicator.remove_style_class_name(this._active_style_class_name);
        }
        this._active_style_class_name = this._power_profile_toggle._proxy.ActiveProfile;
        if (this._active_style_class_name) {
            this._indicator.add_style_class_name(this._active_style_class_name);
        }
    }

    _destroy() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }

        if (this._power_profile_toggle) {
            this._power_profile_toggle._proxy.disconnectObject(this);
            this._power_profile_toggle = null;
        }

        this._indicator.destroy();
        this._indicator = null;

        super.destroy();
    }
});

export default class PowerProfileIndicatorExtension {
    enable() {
        this._indicator = new PowerProfileIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator._destroy();
        this._indicator = null;
    }
}
