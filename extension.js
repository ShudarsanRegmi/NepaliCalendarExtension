import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {CalendarData} from './calendarData.js';
import {DateConverter} from './dateConverter.js';

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
        _init(extension) {
            super._init(0.5, _('Nepali Calendar')); // 0.5 centers the button

            this._extension = extension;

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

            this._calendarData = new CalendarData(this._extension);
            this._dateConverter = new DateConverter(this._extension);
            
            // Get current Nepali date and set it as default
            this._currentNepaliDate = this._dateConverter.getCurrentNepaliDate();
            this._selectedNepaliDate = null; // Track user selected date
            
            if (this._currentNepaliDate) {
                this._currentYear = this._currentNepaliDate.year;
                this._currentMonthIndex = this._currentNepaliDate.month - 1; // Convert to 0-based index
                log(`[NepaliCalendar] Current Nepali Date: ${this._currentNepaliDate.formatted}`);
                // Update panel date label with full Nepali date
                this._updatePanelDate();
            } else {
                this._currentYear = 2074; // Fallback
                this._currentMonthIndex = 0;
            }

            this._buildUI();
            this._loadYear(this._currentYear);

            // Reset to current date when menu opens
            this.menu.connect('open-state-changed', (menu, isOpen) => {
                if (isOpen) {
                    this._resetToCurrentDate();
                }
            });
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

                btn.connect('clicked', () => {
                    // Set selected date
                    this._selectedNepaliDate = {
                        year: this._currentYear,
                        month: this._currentMonthIndex + 1,
                        day: nepaliToArabicNumeral(labelText)
                    };
                    
                    this._showDetails(dayData);
                    this._updateView(); // Refresh to show selection
                });

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
    });

export default class NepaliCalendarExtension extends Extension {
    enable() {
        log('NepaliCalendar: Enabling extension for GNOME 45+');
        this._indicator = new NepaliCalendarIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'center');
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        log('NepaliCalendar: Disabled');
    }
}
