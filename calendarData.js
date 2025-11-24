const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var CalendarData = class CalendarData {
    constructor() {
        this._apiPath = GLib.build_filenamev([Me.path, 'api']);
        this._cache = {};
    }

    getAvailableYears() {
        let years = [];
        let dir = Gio.File.new_for_path(this._apiPath);
        let enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);

        let info;
        while ((info = enumerator.next_file(null))) {
            let name = info.get_name();
            if (name.endsWith('.json')) {
                let year = parseInt(name.replace('.json', ''));
                if (!isNaN(year)) {
                    years.push(year);
                }
            }
        }

        years.sort((a, b) => a - b);
        return years;
    }

    getYearData(year) {
        if (this._cache[year]) {
            return this._cache[year];
        }

        let filePath = GLib.build_filenamev([this._apiPath, `${year}.json`]);
        let file = Gio.File.new_for_path(filePath);

        if (!file.query_exists(null)) {
            return null;
        }

        let [success, contents] = file.load_contents(null);
        if (!success) {
            return null;
        }

        let decoder = new TextDecoder('utf-8');
        let jsonString = decoder.decode(contents);

        try {
            let data = JSON.parse(jsonString);
            this._cache[year] = data;
            return data;
        } catch (e) {
            logError(e, `Failed to parse JSON for year ${year}`);
            return null;
        }
    }
};
