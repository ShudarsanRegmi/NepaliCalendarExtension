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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;
const _ = ExtensionUtils.gettext;

// Helper function to convert Nepali numerals to Arabic numerals
function nepaliToArabicNumeral(nepaliNum) {
    if (!nepaliNum || nepaliNum === '') return NaN;
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    let arabicStr = '';
    for (let char of nepaliNum) {
        let index = nepaliDigits.indexOf(char);
        if (index !== -1) {
            arabicStr += index.toString();
        } else if (char >= '0' && char <= '9') {
            // Already an Arabic numeral
            arabicStr += char;
        }
    }
    return arabicStr ? parseInt(arabicStr, 10) : NaN;
}

const NepaliCalendarIndicator = GObject.registerClass(
    class NepaliCalendarIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.5, _('Nepali Calendar')); // 0.5 centers the button

            this._signalConnections = [];
            this._gridSignalConnections = [];
            
            // Track update state
            this._isUpdating = false;
            this._updateProgress = '';

            // Create a centered container for the flag and date
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

            // Add date label beside flag
            this._panelDateLabel = new St.Label({
                text: '',
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'panel-date-label'
            });
            flagContainer.add_child(this._panelDateLabel);

            this.add_child(flagContainer);

            this._calendarData = new CalendarData.CalendarData();
            this._dateConverter = new DateConverter.DateConverter();
            
            // Get current Nepali date and set it as default
            this._currentNepaliDate = this._dateConverter.getCurrentNepaliDate();
            this._selectedNepaliDate = null; // Track user selected date
            
            if (this._currentNepaliDate) {
                this._currentYear = this._currentNepaliDate.year;
                this._currentMonthIndex = this._currentNepaliDate.month - 1; // Convert to 0-based index
                // Update panel date label with full Nepali date
                this._updatePanelDate();
            } else {
                this._currentYear = 2074; // Fallback
                this._currentMonthIndex = 0;
            }

            this._buildUI();
            this._loadYear(this._currentYear);

            // Build separate context menu for right-click
            this._buildContextMenu();

            // Reset to current date when menu opens
            const menuSignalId = this.menu.connect('open-state-changed', (menu, isOpen) => {
                if (isOpen) {
                    this._resetToCurrentDate();
                }
            });
            this._signalConnections.push({ object: this.menu, id: menuSignalId });
        }

        vfunc_event(event) {
            // Handle right-click separately for context menu
            if (event.type() === Clutter.EventType.BUTTON_PRESS) {
                let button = event.get_button();
                if (button === 3) { // Right-click
                    // Close the main menu if open
                    if (this.menu.isOpen) {
                        this.menu.close();
                    }
                    this._contextMenu.toggle();
                    return Clutter.EVENT_STOP;
                } else if (button === 1) { // Left-click
                    // Close context menu if open
                    if (this._contextMenu.isOpen) {
                        this._contextMenu.close();
                    }
                }
            }
            // Let parent handle left-click (opens calendar)
            return super.vfunc_event(event);
        }

        _updatePanelDate() {
            if (this._currentNepaliDate) {
                const nepaliMonthNames = {
                    'Baishakh': 'बैशाख', 'Jestha': 'जेठ', 'Ashadh': 'असार',
                    'Shrawan': 'साउन', 'Bhadra': 'भदौ', 'Ashwin': 'असोज',
                    'Kartik': 'कार्तिक', 'Mangsir': 'मंसिर', 'Poush': 'पुस',
                    'Magh': 'माघ', 'Falgun': 'फागुन', 'Chaitra': 'चैत्र'
                };
                let monthName = this._currentNepaliDate.monthName;
                let nepaliMonth = nepaliMonthNames[monthName] || monthName;
                let nepaliYear = this._arabicToNepaliNumeral(this._currentNepaliDate.year.toString());
                // Full date with year: "१७ मंसिर २०८२"
                this._panelDateLabel.set_text(`${this._currentNepaliDate.dayNp} ${nepaliMonth} ${nepaliYear}`);
            }
        }

        _buildContextMenu() {
            // Create separate popup menu for right-click context menu
            this._contextMenu = new PopupMenu.PopupMenu(
                this,
                0.0,
                St.Side.TOP,
                0
            );
            
            // Use PopupMenuManager to handle outside clicks properly
            this._contextMenuManager = new PopupMenu.PopupMenuManager(this);
            this._contextMenuManager.addMenu(this._contextMenu);
            
            Main.uiGroup.add_actor(this._contextMenu.actor);
            this._contextMenu.actor.hide();
            
            // Add "Update Calendar Data" option
            this._updateMenuItem = new PopupMenu.PopupMenuItem('Update Calendar Data');
            const updateMenuSignalId = this._updateMenuItem.connect('activate', () => {
                this._updateCalendarData();
            });
            this._signalConnections.push({ object: this._updateMenuItem, id: updateMenuSignalId });
            this._contextMenu.addMenuItem(this._updateMenuItem);
            
            // Add a separator
            this._contextMenu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            
            // Add status label (hidden initially)
            this._statusMenuItem = new PopupMenu.PopupMenuItem('', { reactive: false });
            this._statusMenuItem.actor.hide();
            this._contextMenu.addMenuItem(this._statusMenuItem);
        }

        _updateStatusDisplay(message) {
            if (message) {
                this._statusMenuItem.label.set_text(message);
                this._statusMenuItem.actor.show();
                // Keep context menu open to show status
                if (!this._contextMenu.isOpen) {
                    this._contextMenu.open();
                }
            } else {
                this._statusMenuItem.actor.hide();
            }
        }

        _resetToCurrentDate() {
            // Refresh current date
            this._currentNepaliDate = this._dateConverter.getCurrentNepaliDate();
            this._selectedNepaliDate = null;
            
            if (this._currentNepaliDate) {
                this._currentYear = this._currentNepaliDate.year;
                this._currentMonthIndex = this._currentNepaliDate.month - 1;
                this._loadYear(this._currentYear);
                this._updatePanelDate();
                // Show today's event details
                this._showTodayDetails();
            } else {
                // Hide event box if no current date
                this._eventBox.hide();
            }
        }

        _showTodayDetails() {
            if (!this._yearData || !this._currentNepaliDate) {
                this._eventBox.hide();
                return;
            }
            
            const months = Object.keys(this._yearData);
            const monthName = months[this._currentMonthIndex];
            const monthData = this._yearData[monthName];
            
            // Find today's data
            for (const dayData of monthData) {
                if (dayData.np && dayData.np !== '') {
                    const dayNum = nepaliToArabicNumeral(dayData.np);
                    if (dayNum === this._currentNepaliDate.day) {
                        this._showDetails(dayData);
                        return;
                    }
                }
            }
            
            this._eventBox.hide();
        }

        _buildUI() {
            // Main Container
            this._mainBox = new St.BoxLayout({
                vertical: true,
                style_class: 'calendar-menu-box'
            });
            this.menu.box.add_child(this._mainBox);

            // Nepali Branding Header
            this._buildBrandingHeader();

            // Header (Year/Month Navigation)
            this._buildHeader();

            // Decorative divider
            let divider = new St.Widget({
                style_class: 'calendar-divider'
            });
            this._mainBox.add_child(divider);

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
            const prevMonthSignalId = prevMonthBtn.connect('clicked', () => this._changeMonth(-1));
            this._signalConnections.push({ object: prevMonthBtn, id: prevMonthSignalId });
            monthNavBox.add_child(prevMonthBtn);

            // Month Button (smaller and compact)
            this._monthBtn = new St.Button({
                label: 'Loading...',
                style_class: 'calendar-month-selector-compact'
            });
            const monthBtnSignalId = this._monthBtn.connect('clicked', () => this._cycleMonth());
            this._signalConnections.push({ object: this._monthBtn, id: monthBtnSignalId });
            monthNavBox.add_child(this._monthBtn);

            // Next Month Button
            let nextMonthBtn = new St.Button({
                label: '>',
                style_class: 'nav-button nav-button-small'
            });
            const nextMonthSignalId = nextMonthBtn.connect('clicked', () => this._changeMonth(1));
            this._signalConnections.push({ object: nextMonthBtn, id: nextMonthSignalId });
            monthNavBox.add_child(nextMonthBtn);

            headerBox.add_child(monthNavBox);

            // Spacer to separate month and year controls
            let spacer = new St.Widget({
                style_class: 'header-spacer',
                width: 6
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
            const prevYearSignalId = prevYearBtn.connect('clicked', () => this._changeYear(-1));
            this._signalConnections.push({ object: prevYearBtn, id: prevYearSignalId });
            yearNavBox.add_child(prevYearBtn);

            // Year Button (smaller and compact)
            this._yearBtn = new St.Button({
                label: 'Year',
                style_class: 'calendar-year-selector-compact'
            });
            const yearBtnSignalId = this._yearBtn.connect('clicked', () => this._cycleYear());
            this._signalConnections.push({ object: this._yearBtn, id: yearBtnSignalId });
            yearNavBox.add_child(this._yearBtn);

            // Next Year Button
            let nextYearBtn = new St.Button({
                label: '>',
                style_class: 'nav-button nav-button-small'
            });
            const nextYearSignalId = nextYearBtn.connect('clicked', () => this._changeYear(1));
            this._signalConnections.push({ object: nextYearBtn, id: nextYearSignalId });
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
                style_class: 'calendar-grid',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true
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
                visible: false,
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true
            });

            this._eventTitle = new St.Label({ 
                style_class: 'event-title',
                x_expand: true
            });
            this._eventTitle.clutter_text.set_line_wrap(true);
            this._eventTitle.clutter_text.set_ellipsize(0); // Pango.EllipsizeMode.NONE
            
            this._eventText = new St.Label({ 
                style_class: 'event-text',
                x_expand: true
            });
            this._eventText.clutter_text.set_line_wrap(true);
            this._eventText.clutter_text.set_ellipsize(0);

            this._eventTithi = new St.Label({ 
                style_class: 'event-tithi',
                x_expand: true
            });
            this._eventTithi.clutter_text.set_line_wrap(true);
            this._eventTithi.clutter_text.set_ellipsize(0);

            this._eventBox.add_child(this._eventTitle);
            this._eventBox.add_child(this._eventText);
            this._eventBox.add_child(this._eventTithi);

            this._mainBox.add_child(this._eventBox);
        }

        _buildBrandingHeader() {
            // Main branding container
            let brandingBox = new St.BoxLayout({
                vertical: true,
                style_class: 'branding-header',
                x_align: Clutter.ActorAlign.CENTER
            });

            // Decorative top border
            let topDecor = new St.Label({
                text: '༺ ࿇ ༻',
                style_class: 'branding-decor-top',
                x_align: Clutter.ActorAlign.CENTER
            });
            brandingBox.add_child(topDecor);

            // Title row with flag
            let titleRow = new St.BoxLayout({
                vertical: false,
                style_class: 'branding-title-row',
                x_align: Clutter.ActorAlign.CENTER
            });

            // Left decorative element
            let leftDecor = new St.Label({
                text: '🪷',
                style_class: 'branding-side-decor',
                y_align: Clutter.ActorAlign.CENTER
            });
            titleRow.add_child(leftDecor);

            // Main title in Nepali
            let mainTitle = new St.Label({
                text: 'नेपाली पात्रो',
                style_class: 'branding-main-title',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true
            });
            titleRow.add_child(mainTitle);

            // Right decorative element
            let rightDecor = new St.Label({
                text: '🪷',
                style_class: 'branding-side-decor',
                y_align: Clutter.ActorAlign.CENTER
            });
            titleRow.add_child(rightDecor);

            brandingBox.add_child(titleRow);

            // Subtitle in English
            let subtitle = new St.Label({
                text: 'Bikram Sambat Calendar',
                style_class: 'branding-subtitle',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true
            });
            brandingBox.add_child(subtitle);

            // Decorative bottom pattern
            let bottomDecor = new St.Label({
                text: '࿈࿈࿈࿈࿈࿈࿈࿈',
                style_class: 'branding-decor-bottom',
                x_align: Clutter.ActorAlign.CENTER
            });
            brandingBox.add_child(bottomDecor);

            this._mainBox.add_child(brandingBox);
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

            // Disconnect all grid signal connections before clearing
            this._gridSignalConnections.forEach(conn => {
                if (conn.object && conn.id) {
                    conn.object.disconnect(conn.id);
                }
            });
            this._gridSignalConnections = [];

            // Clear previous days (keep headers)
            let children = this._gridWidget.get_children();
            for (let i = 7; i < children.length; i++) {
                children[i].destroy();
            }

            // Day mapping
            const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
            
            // First pass: find the index of the last valid day
            let lastValidIndex = -1;
            for (let i = 0; i < monthData.length; i++) {
                if (monthData[i].np && monthData[i].np !== '') {
                    lastValidIndex = i;
                }
            }
            
            // Track row - start at row 1 (row 0 is headers)
            let currentRow = 1;

            // Process entries only up to the last valid day
            for (let index = 0; index <= lastValidIndex; index++) {
                const dayData = monthData[index];
                let dayCol = dayMap[dayData.day.toLowerCase()];
                
                // If we go back to Sunday (col 0) and not first entry, move to next row
                if (dayCol === 0 && index > 0) {
                    currentRow++;
                }
                
                let labelText = dayData.np || '';
                
                // Create button (empty or with date)
                let btn = new St.Button({
                    style_class: 'calendar-day',
                    can_focus: labelText ? true : false,
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER
                });
                
                if (!labelText) {
                    // Empty placeholder cell for first row
                    btn.add_style_class_name('calendar-day-empty');
                    this._gridWidget.add_child(btn);
                    this._grid.attach(btn, dayCol, currentRow, 1, 1);
                    continue;
                }

                if (dayData.holiday) {
                    btn.add_style_class_name('calendar-day-holiday');
                }

                // Add Saturday styling
                if (dayData.day && dayData.day.toLowerCase() === 'sat') {
                    btn.add_style_class_name('calendar-day-saturday');
                }

                // Check if this is today's date
                const isToday = this._currentNepaliDate && 
                               this._currentNepaliDate.year === this._currentYear &&
                               this._currentNepaliDate.month === this._currentMonthIndex + 1 &&
                               this._currentNepaliDate.day === nepaliToArabicNumeral(labelText);

                // Check if this is the selected date
                const isSelected = this._selectedNepaliDate &&
                                  this._selectedNepaliDate.year === this._currentYear &&
                                  this._selectedNepaliDate.month === this._currentMonthIndex + 1 &&
                                  this._selectedNepaliDate.day === nepaliToArabicNumeral(labelText);

                // Check if user has selected a different date than today
                const hasOtherSelection = this._selectedNepaliDate && 
                                         !(this._currentNepaliDate &&
                                           this._selectedNepaliDate.year === this._currentNepaliDate.year &&
                                           this._selectedNepaliDate.month === this._currentNepaliDate.month &&
                                           this._selectedNepaliDate.day === this._currentNepaliDate.day);

                if (isToday) {
                    if (hasOtherSelection) {
                        // Mild styling for today when other date is selected
                        btn.add_style_class_name('calendar-day-today-mild');
                    } else {
                        btn.add_style_class_name('calendar-day-today');
                    }
                }

                if (isSelected && !isToday) {
                    btn.add_style_class_name('calendar-day-selected');
                }

                btn.set_child(new St.Label({
                    text: labelText,
                    style_class: 'calendar-day-label',
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    y_expand: true
                }));

                const dayBtnSignalId = btn.connect('clicked', () => {
                    // Set selected date
                    this._selectedNepaliDate = {
                        year: this._currentYear,
                        month: this._currentMonthIndex + 1,
                        day: nepaliToArabicNumeral(labelText)
                    };
                    
                    this._showDetails(dayData);
                    this._updateView(); // Refresh to show selection
                });
                this._gridSignalConnections.push({ object: btn, id: dayBtnSignalId });

                this._gridWidget.add_child(btn);
                this._grid.attach(btn, dayCol, currentRow, 1, 1);
            }
        }

        _showDetails(dayData) {
            this._eventBox.show();
            let eventText = dayData.event || 'No events';
            let tithiText = dayData.tithi || '';

            // Nepali month names mapping
            const nepaliMonthNames = {
                'Baishakh': 'बैशाख', 'Jestha': 'जेठ', 'Ashadh': 'असार',
                'Shrawan': 'साउन', 'Bhadra': 'भदौ', 'Ashwin': 'असोज',
                'Kartik': 'कार्तिक', 'Mangsir': 'मंसिर', 'Poush': 'पुस',
                'Magh': 'माघ', 'Falgun': 'फागुन', 'Chaitra': 'चैत्र'
            };

            // English month names
            const englishMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Get month and year for display
            let monthName = this._monthBtn.get_label();
            let year = this._yearBtn.get_label();
            let nepaliMonth = nepaliMonthNames[monthName] || monthName;
            let nepaliYear = this._arabicToNepaliNumeral(year);

            // Calculate full English date
            let englishDay = dayData.en || '';
            let englishDateStr = '';
            if (englishDay) {
                // Get the English date by finding the corresponding date
                // We need to calculate the English month and year
                // Nepali months roughly map: Baishakh=Apr-May, ..., Mangsir=Nov-Dec, etc.
                const nepaliToEnglishMonthStart = {
                    'Baishakh': { month: 3, yearOffset: 0 },   // April
                    'Jestha': { month: 4, yearOffset: 0 },     // May
                    'Ashadh': { month: 5, yearOffset: 0 },     // June
                    'Shrawan': { month: 6, yearOffset: 0 },    // July
                    'Bhadra': { month: 7, yearOffset: 0 },     // August
                    'Ashwin': { month: 8, yearOffset: 0 },     // September
                    'Kartik': { month: 9, yearOffset: 0 },     // October
                    'Mangsir': { month: 10, yearOffset: 0 },   // November
                    'Poush': { month: 11, yearOffset: 0 },     // December
                    'Magh': { month: 0, yearOffset: 1 },       // January (next year)
                    'Falgun': { month: 1, yearOffset: 1 },     // February
                    'Chaitra': { month: 2, yearOffset: 1 }     // March
                };
                
                let mapping = nepaliToEnglishMonthStart[monthName];
                let englishDayNum = parseInt(englishDay);
                let englishMonth = mapping ? mapping.month : 0;
                let englishYear = parseInt(year) - 57 + (mapping ? mapping.yearOffset : 0);
                
                // If day number is small (1-15) and month mapping suggests mid-month start,
                // the English month might have rolled over
                if (englishDayNum <= 15 && ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 
                    'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'].includes(monthName)) {
                    // Check if we need to advance to next month
                    // Nepali months start around 14-17 of English month
                    englishMonth = (englishMonth + 1) % 12;
                    if (englishMonth === 0) englishYear++;
                }
                
                englishDateStr = ` / ${englishDay} ${englishMonthNames[englishMonth]} ${englishYear}`;
            }

            // Format: "१७ मंसिर २०८२ / 3 Dec 2025" (Nepali / English)
            let dateText = `${dayData.np} ${nepaliMonth} ${nepaliYear}${englishDateStr}`;

            this._eventTitle.set_text(dateText);
            this._eventText.set_text(eventText);
            this._eventTithi.set_text(tithiText);
            
            // Hide tithi label if no tithi
            if (tithiText) {
                this._eventTithi.show();
            } else {
                this._eventTithi.hide();
            }
        }

        // Helper function to convert Arabic numerals to Nepali numerals
        _arabicToNepaliNumeral(numStr) {
            const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
            return numStr.toString().split('').map(char => {
                if (char >= '0' && char <= '9') {
                    return nepaliDigits[parseInt(char)];
                }
                return char;
            }).join('');
        }

        // Method to update calendar data from GitHub
        _updateCalendarData() {
            if (this._isUpdating) {
                Main.notify('Nepali Calendar', 'Update already in progress...');
                return;
            }
            
            this._isUpdating = true;
            this._updateStatusDisplay('Fetching file list from GitHub...');
            this._updateMenuItem.setSensitive(false);
            
            // GitHub API URL to list files in api directory
            const githubApiUrl = 'https://api.github.com/repos/ShudarsanRegmi/NepaliCalendarExtension/contents/api';
            const githubRawBaseUrl = 'https://raw.githubusercontent.com/ShudarsanRegmi/NepaliCalendarExtension/refs/heads/main/api/';
            
            // Get the api directory paths
            const apiDirPath = GLib.build_filenamev([Me.path, 'api']);
            const apiDir = Gio.File.new_for_path(apiDirPath);
            
            const apiTempDirPath = GLib.build_filenamev([Me.path, 'api-temp']);
            const apiTempDir = Gio.File.new_for_path(apiTempDirPath);
            
            // Create api-temp directory for downloads (delete if exists)
            if (apiTempDir.query_exists(null)) {
                // Delete existing api-temp directory
                try {
                    this._deleteDirectory(apiTempDir);
                } catch (e) {
                    log('Failed to delete existing api-temp: ' + e.message);
                }
            }
            
            // Create fresh api-temp directory
            try {
                apiTempDir.make_directory_with_parents(null);
            } catch (e) {
                this._updateStatusDisplay('Error: Failed to create api-temp directory');
                this._isUpdating = false;
                this._updateMenuItem.setSensitive(true);
                Main.notify('Nepali Calendar', 'Failed to create temporary directory');
                return;
            }

            // Initialize Soup session for HTTP requests
            let session;
            if (Soup.Session.prototype.hasOwnProperty('new')) {
                session = new Soup.Session();
            } else {
                session = Soup.Session.new();
            }
            
            let successCount = 0;
            let failCount = 0;
            let totalFiles = 0;
            let completedFiles = 0;
            let fileList = [];

            // Function to fetch file list from GitHub API
            const fetchFileList = () => {
                return new Promise((resolve, reject) => {
                    const message = Soup.Message.new('GET', githubApiUrl);
                    
                    if (!message) {
                        reject(new Error('Failed to create API request'));
                        return;
                    }

                    // Set User-Agent header (required by GitHub API)
                    message.request_headers.append('User-Agent', 'GNOME-Shell-Extension');

                    if (Soup.Session.prototype.hasOwnProperty('queue_message')) {
                        session.queue_message(message, (sess, msg) => {
                            if (msg.status_code === 200) {
                                try {
                                    let data = msg.response_body.data;
                                    let files = JSON.parse(data);
                                    
                                    // Filter for .json files only
                                    fileList = files
                                        .filter(file => file.name.endsWith('.json') && file.name !== 'guidelines.txt')
                                        .map(file => file.name.replace('.json', ''));
                                    
                                    totalFiles = fileList.length;
                                    resolve(fileList);
                                } catch (e) {
                                    reject(new Error(`Failed to parse file list: ${e.message}`));
                                }
                            } else {
                                reject(new Error(`GitHub API returned ${msg.status_code}`));
                            }
                        });
                    } else {
                        reject(new Error('Soup 3.x not fully implemented yet'));
                    }
                });
            };

            // Function to download a single file
            const downloadFile = (fileName) => {
                return new Promise((resolve, reject) => {
                    const url = githubRawBaseUrl + fileName + '.json';
                    const message = Soup.Message.new('GET', url);
                    
                    if (!message) {
                        reject(new Error(`Failed to create request for ${fileName}`));
                        return;
                    }

                    // For Soup 2.x (GNOME 42-44)
                    if (Soup.Session.prototype.hasOwnProperty('queue_message')) {
                        session.queue_message(message, (sess, msg) => {
                            if (msg.status_code === 200) {
                                try {
                                    const tempFilePath = GLib.build_filenamev([apiTempDirPath, fileName + '.json']);
                                    const tempFile = Gio.File.new_for_path(tempFilePath);
                                    
                                    // Get response body data
                                    let data;
                                    if (msg.response_body && msg.response_body.data) {
                                        data = msg.response_body.data;
                                    } else if (msg.response_body && msg.response_body.flatten) {
                                        data = msg.response_body.flatten().get_as_bytes();
                                    }
                                    
                                    // Write to api-temp file
                                    tempFile.replace_contents(
                                        data,
                                        null,
                                        false,
                                        Gio.FileCreateFlags.REPLACE_DESTINATION,
                                        null
                                    );
                                    
                                    resolve(fileName);
                                } catch (e) {
                                    reject(new Error(`Failed to save ${fileName}: ${e.message}`));
                                }
                            } else {
                                reject(new Error(`HTTP ${msg.status_code} for ${fileName}`));
                            }
                        });
                    } else {
                        // For Soup 3.x (GNOME 45+) - fallback
                        reject(new Error('Soup 3.x not fully implemented yet'));
                    }
                });
            };

            // Download all files sequentially (to avoid overwhelming the server)
            const downloadAllFiles = async () => {
                // First, fetch the file list from GitHub
                try {
                    await fetchFileList();
                    this._updateStatusDisplay(`Found ${totalFiles} files. Starting download...`);
                } catch (e) {
                    this._updateStatusDisplay(`Error fetching file list: ${e.message}`);
                    this._isUpdating = false;
                    this._updateMenuItem.setSensitive(true);
                    Main.notify('Nepali Calendar', `Failed to fetch file list: ${e.message}`);
                    return;
                }
                
                // Download each file
                for (let fileName of fileList) {
                    try {
                        await downloadFile(fileName);
                        successCount++;
                    } catch (e) {
                        log(`Failed to download ${fileName}.json: ${e.message}`);
                        failCount++;
                    }
                    
                    completedFiles++;
                    
                    // Update status in menu every 10 files
                    if (completedFiles % 10 === 0 || completedFiles === totalFiles) {
                        this._updateStatusDisplay(`Downloading: ${completedFiles}/${totalFiles} files`);
                    }
                }
                
                // If we successfully downloaded files, replace the api directory
                if (successCount > 0) {
                    this._updateStatusDisplay('Replacing api directory...');
                    try {
                        // Delete old api directory
                        if (apiDir.query_exists(null)) {
                            this._deleteDirectory(apiDir);
                        }
                        
                        // Rename api-temp to api
                        apiTempDir.move(
                            apiDir,
                            Gio.FileCopyFlags.NONE,
                            null,
                            null
                        );
                        
                        // Reload calendar data
                        this._calendarData = new CalendarData.CalendarData();
                        this._dateConverter = new DateConverter.DateConverter();
                        
                        // Reload current year
                        this._loadYear(this._currentYear);
                        
                        this._updateStatusDisplay(`Update complete! ${successCount} files updated.${failCount > 0 ? ` (${failCount} failed)` : ''}`);
                        this._isUpdating = false;
                        this._updateMenuItem.setSensitive(true);
                        
                        Main.notify('Nepali Calendar', 
                            `Update complete! Successfully updated ${successCount} files.${failCount > 0 ? ` (${failCount} failed)` : ''}`);
                    } catch (e) {
                        this._updateStatusDisplay(`Error: ${e.message}`);
                        this._isUpdating = false;
                        this._updateMenuItem.setSensitive(true);
                        
                        // Clean up api-temp on error
                        try {
                            if (apiTempDir.query_exists(null)) {
                                this._deleteDirectory(apiTempDir);
                            }
                        } catch (cleanupError) {
                            log('Failed to cleanup api-temp: ' + cleanupError.message);
                        }
                        
                        Main.notify('Nepali Calendar', 
                            `Error updating calendar data: ${e.message}`);
                        log('Calendar update error: ' + e.message);
                    }
                } else {
                    this._updateStatusDisplay('Update failed. Could not download data.');
                    this._isUpdating = false;
                    this._updateMenuItem.setSensitive(true);
                    
                    // Clean up api-temp on failure
                    try {
                        if (apiTempDir.query_exists(null)) {
                            this._deleteDirectory(apiTempDir);
                        }
                    } catch (cleanupError) {
                        log('Failed to cleanup api-temp: ' + cleanupError.message);
                    }
                    
                    Main.notify('Nepali Calendar', 
                        'Update failed. Could not download calendar data.');
                }
            };
            
            // Start the download process
            downloadAllFiles().catch(e => {
                this._updateStatusDisplay(`Error: ${e.message}`);
                this._isUpdating = false;
                this._updateMenuItem.setSensitive(true);
                
                // Clean up api-temp on error
                try {
                    if (apiTempDir.query_exists(null)) {
                        this._deleteDirectory(apiTempDir);
                    }
                } catch (cleanupError) {
                    log('Failed to cleanup api-temp: ' + cleanupError.message);
                }
                
                Main.notify('Nepali Calendar', 
                    `Update failed: ${e.message}`);
                log('Calendar update error: ' + e.message);
            });
        }

        // Helper method to delete a directory recursively
        _deleteDirectory(dir) {
            if (!dir.query_exists(null)) {
                return;
            }
            
            const dirEnum = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );
            
            let fileInfo;
            while ((fileInfo = dirEnum.next_file(null)) !== null) {
                const child = dir.get_child(fileInfo.get_name());
                const fileType = fileInfo.get_file_type();
                
                if (fileType === Gio.FileType.DIRECTORY) {
                    this._deleteDirectory(child);
                } else {
                    child.delete(null);
                }
            }
            
            dir.delete(null);
        }

        // Cleanup method to disconnect all signals and destroy objects
        cleanup() {
            // Disconnect all grid signals
            this._gridSignalConnections.forEach(conn => {
                if (conn.object && conn.id) {
                    conn.object.disconnect(conn.id);
                }
            });
            this._gridSignalConnections = [];

            // Disconnect all permanent signals
            this._signalConnections.forEach(conn => {
                if (conn.object && conn.id) {
                    conn.object.disconnect(conn.id);
                }
            });
            this._signalConnections = [];

            // Cleanup context menu manager
            if (this._contextMenuManager) {
                this._contextMenuManager = null;
            }

            // Cleanup context menu
            if (this._contextMenu) {
                this._contextMenu.destroy();
                this._contextMenu = null;
            }

            // Cleanup data objects
            if (this._calendarData) {
                this._calendarData = null;
            }

            if (this._dateConverter) {
                this._dateConverter = null;
            }
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new NepaliCalendarIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'center');
    }

    disable() {
        if (this._indicator) {
            this._indicator.cleanup();
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init(meta) {
    ExtensionUtils.initTranslations();
    return new Extension(meta.uuid);
}
