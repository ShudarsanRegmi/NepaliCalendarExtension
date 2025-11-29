const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const CalendarData = Me.imports.calendarData;
const DateConverter = Me.imports.dateConverter;
const _ = ExtensionUtils.gettext;

const NepaliCalendarIndicator = GObject.registerClass(
    class NepaliCalendarIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.5, _('Nepali Calendar')); // 0.5 centers the button

            // Create a centered container for the flag
            let flagContainer = new St.BoxLayout({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-flag-container'
            });

            flagContainer.add_child(new St.Label({
                text: '🇳🇵',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-flag-label'
            }));

            this.add_child(flagContainer);

            this._calendarData = new CalendarData.CalendarData();
            this._dateConverter = new DateConverter.DateConverter();
            
            // Get current Nepali date and set it as default
            this._currentNepaliDate = this._dateConverter.getCurrentNepaliDate();
            this._selectedNepaliDate = null; // Track user selected date
            
            if (this._currentNepaliDate) {
                this._currentYear = this._currentNepaliDate.year;
                this._currentMonthIndex = this._currentNepaliDate.month - 1; // Convert to 0-based index
                log(`[NepaliCalendar] Current Nepali Date: ${this._currentNepaliDate.formatted}`);
            } else {
                this._currentYear = 2074; // Fallback
                this._currentMonthIndex = 0;
            }

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
                x_align: Clutter.ActorAlign.CENTER,
                vertical: false
            });

            // Month Navigation Container
            let monthNavBox = new St.BoxLayout({
                style_class: 'month-nav-container',
                vertical: false
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

            // Spacer to separate month and year controls
            let spacer = new St.Widget({
                style_class: 'header-spacer',
                width: 25
            });
            headerBox.add_child(spacer);

            // Year Navigation Container
            let yearNavBox = new St.BoxLayout({
                style_class: 'year-nav-container',
                vertical: false
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
            
            // Clear selection when changing month
            if (this._selectedNepaliDate && 
                this._selectedNepaliDate.month !== this._currentMonthIndex + 1) {
                this._selectedNepaliDate = null;
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
            
            // Clear selection when changing year
            if (this._selectedNepaliDate && 
                this._selectedNepaliDate.year !== this._currentYear) {
                this._selectedNepaliDate = null;
            }
            
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
            
            // Clear selection when changing year
            if (this._selectedNepaliDate && 
                this._selectedNepaliDate.year !== this._currentYear) {
                this._selectedNepaliDate = null;
            }
            
            this._loadYear(this._currentYear);
        }

        _buildGrid() {
            this._grid = new Clutter.GridLayout();
            this._grid.set_row_spacing(0);
            this._grid.set_column_spacing(0);

            this._gridWidget = new St.Widget({
                layout_manager: this._grid,
                style_class: 'calendar-grid'
            });

            // Day Headers
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            days.forEach((day, col) => {
                let label = new St.Label({
                    text: day,
                    style_class: 'calendar-day-header',
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER
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

            // Clear selection when navigating to different month
            if (this._selectedNepaliDate && 
                (this._selectedNepaliDate.month !== this._currentMonthIndex + 1 || 
                 this._selectedNepaliDate.year !== this._currentYear)) {
                this._selectedNepaliDate = null;
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
                    can_focus: true,
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER
                });

                if (dayData.holiday) {
                    btn.add_style_class_name('calendar-day-holiday');
                }

                // Add Saturday styling
                if (dayData.day && dayData.day.toLowerCase() === 'sat') {
                    btn.add_style_class_name('calendar-day-saturday');
                }

                let labelText = dayData.np || '';
                if (labelText) {
                    // Check if this is today's date
                    const isToday = this._currentNepaliDate && 
                                   this._currentNepaliDate.year === this._currentYear &&
                                   this._currentNepaliDate.month === this._currentMonthIndex + 1 &&
                                   this._currentNepaliDate.day === parseInt(labelText);

                    // Check if this is the selected date
                    const isSelected = this._selectedNepaliDate &&
                                      this._selectedNepaliDate.year === this._currentYear &&
                                      this._selectedNepaliDate.month === this._currentMonthIndex + 1 &&
                                      this._selectedNepaliDate.day === parseInt(labelText);

                    if (isToday) {
                        btn.add_style_class_name('calendar-day-today');
                    }

                    if (isSelected) {
                        btn.add_style_class_name('calendar-day-selected');
                    }

                    btn.set_child(new St.Label({
                        text: labelText,
                        style_class: 'calendar-day-label',
                        x_align: Clutter.ActorAlign.CENTER,
                        y_align: Clutter.ActorAlign.CENTER
                    }));

                    btn.connect('clicked', () => {
                        // Set selected date
                        this._selectedNepaliDate = {
                            year: this._currentYear,
                            month: this._currentMonthIndex + 1,
                            day: parseInt(labelText)
                        };
                        
                        this._showDetails(dayData);
                        this._updateView(); // Refresh to show selection
                    });
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

            // Get month and year for display
            let monthName = this._monthBtn.get_label();
            let year = this._yearBtn.get_label();

            // Create the selected Nepali date
            let selectedNepaliDate = {
                year: this._currentYear,
                month: this._currentMonthIndex + 1,
                day: parseInt(dayData.np)
            };

            // Try to convert to English date (this is approximate since we don't have reverse conversion)
            let englishDateText = '';
            try {
                // For now, show a note that this is a Nepali date
                englishDateText = ` (${selectedNepaliDate.day}/${selectedNepaliDate.month}/${selectedNepaliDate.year} BS)`;
            } catch (e) {
                log(`[NepaliCalendar] Date conversion error: ${e}`);
                englishDateText = ' (BS)';
            }

            this._eventTitle.set_text(`${dayData.np} ${monthName} ${year}${englishDateText}: ${eventText}`);
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
        Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'center');
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
