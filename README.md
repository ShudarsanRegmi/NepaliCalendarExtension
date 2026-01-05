# Nepali Calendar GNOME Extension

A GNOME Shell extension that shows the current Nepali date in the top panel and a dropdown calendar with day details.

## Features
- 🇳🇵 Nepali date display in the top panel
- 📅 Full Bikram Sambat calendar (1970-2089 BS)
- 🎉 Festivals and events display
- 🌙 Tithi (lunar day) information
- 🔄 **Update calendar data directly from GitHub** - Keep your calendar up-to-date with the latest events and festivals!

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

## How to Update Calendar Data
The Nepali calendar requires annual updates for festivals and events. To update:

1. Click on the Nepali Calendar icon in the top panel
2. Click the **settings icon** (⚙️) in the top-right corner of the calendar
3. Select **"Update Calendar Data"**
4. The extension will download the latest calendar data from GitHub
5. You'll receive a notification when the update is complete

This feature is particularly useful because:
- Bikram Sambat festival dates are calculated annually
- Events for the upcoming year are typically declared at the end of each year
- You can get the latest updates without reinstalling the extension

## Development
- The extension uses GJS (GNOME JavaScript) APIs, no Node.js runtime.
- Data lives under `api/*.json` and is loaded with Gio/GLib.
- Uses Soup library for HTTP downloads

## Troubleshooting
- If the indicator doesn't appear, check `journalctl --user -u gnome-shell | grep simple-extension` for errors.
- Ensure GNOME Shell version is one of those listed in `metadata.json`.
- If calendar update fails, check your internet connection and try again.