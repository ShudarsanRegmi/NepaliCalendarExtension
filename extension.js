const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const _ = ExtensionUtils.gettext;

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Simple Extension Indicator'));

            this.add_child(new St.Icon({
                icon_name: 'face-smile-symbolic',
                style_class: 'system-status-icon',
            }));

            this._buildMenu();
        }

        _buildMenu() {
            // Add a simple menu item
            this._item = new PopupMenu.PopupMenuItem(_('Click Me'));
            this._item.connect('activate', () => {
                Main.notify(_('Hello!'), _('You clicked the menu item.'));
            });
            this.menu.addMenuItem(this._item);

            // Add a toggle switch
            this._toggle = new PopupMenu.PopupSwitchMenuItem(_('Toggle Switch'), false);
            this._toggle.connect('toggled', (item, state) => {
                Main.notify(_('Toggle Changed'), _(`State is now: ${state}`));
            });
            this.menu.addMenuItem(this._toggle);

            // Add a separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add a sub-menu
            let subMenu = new PopupMenu.PopupSubMenuMenuItem(_('Sub Menu'));
            subMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem(_('Item 1')));
            subMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem(_('Item 2')));
            this.menu.addMenuItem(subMenu);
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init(meta) {
    ExtensionUtils.initTranslations();
    return new Extension(meta.uuid);
}
