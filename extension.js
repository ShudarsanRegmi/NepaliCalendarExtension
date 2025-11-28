const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const CalendarData = Me.imports.calendarData;
const _ = ExtensionUtils.gettext;

const NepaliCalendarIndicator = GObject.registerClass(
    class NepaliCalendarIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('Nepali Calendar'));

            this.add_child(new St.Label({
                text: '🇳🇵',
                y_align: Clutter.ActorAlign.CENTER,
            }));

            this._calendarData = new CalendarData.CalendarData();
            this._currentYear = 2074; // Default to last available year
            this._currentMonthIndex = 0; // Baishakh
            this._selectedDay = null;

            this._buildUI();
            this._loadYear(this._currentYear);
        }

        _buildUI() {
            // Main Container
            this._mainBox = new St.BoxLayout({
                vertical: true,
                style_class: 'calendar-menu-box'
            });
            this.menu.box.add_child(this._mainBox);

            // Header (Year/Month Navigation)
            this._buildHeader();

            // Calendar Grid
            this._buildGrid();

            // Event Details
            this._buildEventDetails();
        }

        _buildHeader() {
            let headerBox = new St.BoxLayout({
                style_class: 'calendar-header',
                x_align: Clutter.ActorAlign.CENTER
            });

            // Month Navigation Container
            let monthNavBox = new St.BoxLayout({
                style_class: 'month-nav-container'
            });

            // Prev Month Button
            let prevMonthBtn = new St.Button({
                label: '<',
                style_class: 'nav-button nav-button-small'
            });
            prevMonthBtn.connect('clicked', () => this._changeMonth(-1));
            monthNavBox.add_child(prevMonthBtn);

            // Month Button (smaller and compact)
            this._monthBtn = new St.Button({
                label: 'Loading...',
                style_class: 'calendar-month-selector-compact'
            });
            this._monthBtn.connect('clicked', () => this._cycleMonth());
            monthNavBox.add_child(this._monthBtn);

            // Next Month Button
            let nextMonthBtn = new St.Button({
                label: '>',
                style_class: 'nav-button nav-button-small'
            });
            nextMonthBtn.connect('clicked', () => this._changeMonth(1));
            monthNavBox.add_child(nextMonthBtn);

            headerBox.add_child(monthNavBox);

            // Year Navigation Container
            let yearNavBox = new St.BoxLayout({
                style_class: 'year-nav-container'
            });

            // Prev Year Button
            let prevYearBtn = new St.Button({
                label: '<',
                style_class: 'nav-button nav-button-small'
            });
            prevYearBtn.connect('clicked', () => this._changeYear(-1));
            yearNavBox.add_child(prevYearBtn);

            // Year Button (smaller and compact)
            this._yearBtn = new St.Button({
                label: 'Year',
                style_class: 'calendar-year-selector-compact'
            });
            this._yearBtn.connect('clicked', () => this._cycleYear());
            yearNavBox.add_child(this._yearBtn);

            // Next Year Button
            let nextYearBtn = new St.Button({
                label: '>',
                style_class: 'nav-button nav-button-small'
            });
            nextYearBtn.connect('clicked', () => this._changeYear(1));
            yearNavBox.add_child(nextYearBtn);

            headerBox.add_child(yearNavBox);

            this._mainBox.add_child(headerBox);
        }

        _cycleMonth() {
            this._currentMonthIndex++;
            if (this._currentMonthIndex > 11) {
                this._currentMonthIndex = 0;
            }
            this._updateView();
        }

        _cycleYear() {
            let years = this._calendarData.getAvailableYears();
            let currentIndex = years.indexOf(this._currentYear);
            currentIndex++;
            if (currentIndex >= years.length) {
                currentIndex = 0;
            }
            this._currentYear = years[currentIndex];
            this._loadYear(this._currentYear);
        }

        _changeYear(delta) {
            let years = this._calendarData.getAvailableYears();
            let currentIndex = years.indexOf(this._currentYear);
            currentIndex += delta;
            
            if (currentIndex < 0) {
                currentIndex = years.length - 1;
            } else if (currentIndex >= years.length) {
                currentIndex = 0;
            }
            
            this._currentYear = years[currentIndex];
            this._loadYear(this._currentYear);
        }

        _buildGrid() {
            this._grid = new Clutter.GridLayout();

            this._gridWidget = new St.Widget({
                layout_manager: this._grid,
                style_class: 'calendar-grid'
            });

            // Day Headers
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach((day, col) => {
                let label = new St.Label({
                    text: day,
                    style_class: 'calendar-day-header'
                });
                this._gridWidget.add_child(label);
                this._grid.attach(label, col, 0, 1, 1);
            });

            this._mainBox.add_child(this._gridWidget);
        }

        _buildEventDetails() {
            this._eventBox = new St.BoxLayout({
                vertical: true,
                style_class: 'event-box',
                visible: false
            });

            this._eventTitle = new St.Label({ style_class: 'event-title' });
            this._eventTithi = new St.Label({ style_class: 'event-tithi' });

            this._eventBox.add_child(this._eventTitle);
            this._eventBox.add_child(this._eventTithi);

            this._mainBox.add_child(this._eventBox);
        }

        _loadYear(year) {
            this._yearData = this._calendarData.getYearData(year);
            if (!this._yearData) {
                this._monthBtn.set_label(`Error`);
                this._yearBtn.set_label(`${year}`);
                return;
            }
            this._updateView();
        }

        _changeMonth(delta) {
            this._currentMonthIndex += delta;

            if (this._currentMonthIndex < 0) {
                this._currentMonthIndex = 11;
                this._currentYear--;
                this._loadYear(this._currentYear);
            } else if (this._currentMonthIndex > 11) {
                this._currentMonthIndex = 0;
                this._currentYear++;
                this._loadYear(this._currentYear);
            } else {
                this._updateView();
            }
        }

        _updateView() {
            if (!this._yearData) return;

            const months = Object.keys(this._yearData);
            const monthName = months[this._currentMonthIndex];
            const monthData = this._yearData[monthName];

            // Update button labels (no dropdown arrows needed)
            this._monthBtn.set_label(monthName);
            this._yearBtn.set_label(this._currentYear.toString());

            // Clear previous days (keep headers)
            let children = this._gridWidget.get_children();
            for (let i = 7; i < children.length; i++) {
                children[i].destroy();
            }

            // Add days
            let row = 1;
            let col = 0;

            monthData.forEach((dayData) => {
                const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
                let dayCol = dayMap[dayData.day.toLowerCase()];

                let btn = new St.Button({
                    style_class: 'calendar-day',
                    can_focus: true
                });

                if (dayData.holiday) {
                    btn.add_style_class_name('calendar-day-holiday');
                }

                let labelText = dayData.np || '';
                if (labelText) {
                    btn.set_child(new St.Label({
                        text: labelText,
                        style_class: 'calendar-day-label'
                    }));

                    btn.connect('clicked', () => this._showDetails(dayData));
                }

                this._gridWidget.add_child(btn);
                this._grid.attach(btn, dayCol, row, 1, 1);

                if (dayCol === 6) {
                    row++;
                }
            });
        }

        _showDetails(dayData) {
            this._eventBox.show();
            let eventText = dayData.event || 'No events';
            let tithiText = dayData.tithi || '';

            // Fix: Use get_label() for buttons
            let monthName = this._monthBtn.get_label();
            let year = this._yearBtn.get_label();

            this._eventTitle.set_text(`${dayData.np} ${monthName} ${year}: ${eventText}`);
            this._eventTithi.set_text(tithiText);
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        log('NepaliCalendar: Enabling extension version with Year Selector');
        this._indicator = new NepaliCalendarIndicator();
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
