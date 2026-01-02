# Nepali Calendar GNOME Extension

A GNOME Shell extension that shows the current Nepali date in the top panel and a dropdown calendar with day details.

## Files
- `metadata.json`: Extension manifest.
- `extension.js`: Main code for panel indicator and calendar menu.
- `calendarData.js`: Loads year data from `api/*.json`.
- `dateConverter.js`: Converts English date to Nepali date.
- `prefs.js`: Preferences (uses libadwaita).
- `stylesheet.css`: Styles for the UI.
- `api/*.json`: Calendar data (years 1970–2089).

## Install
1. Copy the folder to `~/.local/share/gnome-shell/extensions/simple-extension@example.com/`.
2. Restart GNOME Shell (Alt+F2, enter `r`) or log out/in.
3. Enable the extension via `gnome-extensions` app or `gnome-extensions enable simple-extension@example.com`.

## Development
- The extension uses GJS (GNOME JavaScript) APIs, no Node.js runtime.
- Data lives under `api/*.json` and is loaded with Gio/GLib.

## Troubleshooting
- If the indicator doesn't appear, check `journalctl --user -u gnome-shell | grep simple-extension` for errors.
- Ensure GNOME Shell version is one of those listed in `metadata.json`.