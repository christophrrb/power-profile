//    Power Profile Indicator
//    GNOME Shell extension
//    @fthx 2024


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';


const PowerProfileIndicator = GObject.registerClass(
class PowerProfileIndicator extends SystemIndicator {
    _init() {
        super._init();

        this._indicator = this._addIndicator();

        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._power_profile_toggle = Main.panel.statusArea.quickSettings._powerProfiles.quickSettingsItems[0];
            this._power_profile_toggle._proxy.connectObject('g-properties-changed', this._set_icon.bind(this), this);
            this._set_icon();

            return GLib.SOURCE_REMOVE;
        });
    }

    _set_icon() {
        this._indicator.icon_name = this._power_profile_toggle.icon_name;
    }

    _destroy() {
        this._power_profile_toggle._proxy.disconnectObject(this);
        this._power_profile_toggle = null;

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
