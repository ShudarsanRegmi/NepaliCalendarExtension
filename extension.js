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

            // Year View (Hidden by default)
            this._buildYearView();

            // Event Details
            this._buildEventDetails();
        }

        _buildHeader() {
            let headerBox = new St.BoxLayout({
                style_class: 'calendar-header',
                x_align: Clutter.ActorAlign.CENTER
            });

            // Prev Month Button
            let prevBtn = new St.Button({ label: ' < ' });
            prevBtn.connect('clicked', () => this._changeMonth(-1));
            headerBox.add_child(prevBtn);

            // Month/Year Label (Clickable)
            this._monthLabel = new St.Button({
                label: 'Loading...',
                style_class: 'calendar-month-label'
            });
            this._monthLabel.connect('clicked', () => this._toggleYearView());
            headerBox.add_child(this._monthLabel);

            // Next Month Button
            let nextBtn = new St.Button({ label: ' > ' });
            nextBtn.connect('clicked', () => this._changeMonth(1));
            headerBox.add_child(nextBtn);

            this._mainBox.add_child(headerBox);
        }

        _buildYearView() {
            this._yearScrollView = new St.ScrollView({
                style_class: 'year-scroll-view',
                visible: false
            });
            this._yearScrollView.set_height(200); // Fixed height for scroll
            this._mainBox.add_child(this._yearScrollView);

            this._yearBox = new St.BoxLayout({
                vertical: true,
                style_class: 'year-list'
            });
            this._yearScrollView.set_child(this._yearBox);
        }

        _toggleYearView() {
            let showingYear = this._yearScrollView.visible;
            if (showingYear) {
                this._yearScrollView.hide();
                this._gridWidget.show();
            } else {
                this._gridWidget.hide();
                this._eventBox.hide();
                this._yearScrollView.show();
                this._populateYearList();
            }
        }

        _populateYearList() {
            this._yearBox.destroy_all_children();
            let years = this._calendarData.getAvailableYears();
            years.forEach(year => {
                let btn = new St.Button({
                    label: year.toString(),
                    style_class: 'year-button',
                    x_fill: true,
                    y_align: Clutter.ActorAlign.CENTER
                });
                if (year === this._currentYear) {
                    btn.add_style_class_name('current-year');
                }
                btn.connect('clicked', () => {
                    this._currentYear = year;
                    this._loadYear(year);
                    this._toggleYearView();
                });
                this._yearBox.add_child(btn);
            });
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
                this._monthLabel.set_label(`Error loading ${year}`);
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

            this._monthLabel.set_label(`${monthName} ${this._currentYear} ▼`);

            // Clear previous days (keep headers)
            let children = this._gridWidget.get_children();
            for (let i = 7; i < children.length; i++) {
                children[i].destroy();
            }

            // Add days
            let row = 1;
            let col = 0;

            // Find start day offset (simplified for now, assumes data has empty entries for padding)
            // The JSON structure seems to have empty entries for padding at start

            monthData.forEach((dayData) => {
                // Determine column based on 'day' field if needed, but array order implies sequence
                // The JSON has "day": "sun", "mon" etc.
                const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
                let dayCol = dayMap[dayData.day.toLowerCase()];

                // If we are at start of month, align row
                if (row === 1 && col !== dayCol) {
                    // This logic handles if the array is sparse or we need to skip
                    // But looking at JSON, it seems to have empty objects for padding?
                    // "np": "", "en": "" -> padding
                }

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

            this._eventTitle.set_text(`${dayData.np} ${this._monthLabel.text}: ${eventText}`);
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
