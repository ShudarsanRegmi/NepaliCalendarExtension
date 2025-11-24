const Gtk = imports.gi.Gtk;
const Adw = imports.gi.Adw;
const ExtensionUtils = imports.misc.extensionUtils;
const _ = ExtensionUtils.gettext;

function init() {
    // Initialize extension utils for translations
    ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
        title: _('General Settings'),
        description: _('Configure the extension behavior'),
    });

    page.add(group);

    // Create a simple row
    const row = new Adw.ActionRow({
        title: _('Show Notification'),
        subtitle: _('Whether to show a notification when clicked'),
    });
    group.add(row);

    // Add a switch to the row
    const toggle = new Gtk.Switch({
        active: true,
        valign: Gtk.Align.CENTER,
    });
    row.add_suffix(toggle);
    row.activatable_widget = toggle;

    window.add(page);
}
