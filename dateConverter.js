const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const CalendarData = Me.imports.calendarData;

var DateConverter = class DateConverter {
    constructor() {
        this._calendarData = new CalendarData.CalendarData();
        
        this.monthNames = [
            'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
            'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
        ];
        
        // Mapping of English months to approximate Nepali year and months to search
        // Each English month spans across 2 Nepali months typically
        this.englishToNepaliMonthMap = {
            0:  { years: [0, 0], months: ['Poush', 'Magh'] },      // January
            1:  { years: [0, 0], months: ['Magh', 'Falgun'] },     // February
            2:  { years: [0, 0], months: ['Falgun', 'Chaitra'] },  // March
            3:  { years: [0, 1], months: ['Chaitra', 'Baishakh'] }, // April
            4:  { years: [1, 1], months: ['Baishakh', 'Jestha'] }, // May
            5:  { years: [1, 1], months: ['Jestha', 'Ashadh'] },   // June
            6:  { years: [1, 1], months: ['Ashadh', 'Shrawan'] },  // July
            7:  { years: [1, 1], months: ['Shrawan', 'Bhadra'] },  // August
            8:  { years: [1, 1], months: ['Bhadra', 'Ashwin'] },   // September
            9:  { years: [1, 1], months: ['Ashwin', 'Kartik'] },   // October
            10: { years: [1, 1], months: ['Kartik', 'Mangsir'] },  // November
            11: { years: [1, 1], months: ['Mangsir', 'Poush'] }    // December
        };
    }

    // Convert English date to Nepali date using API data
    englishToNepali(englishDate) {
        if (!englishDate) {
            englishDate = new Date();
        }

        const englishYear = englishDate.getFullYear();
        const englishMonth = englishDate.getMonth(); // 0-11
        const englishDay = englishDate.getDate().toString();
        
        // Calculate approximate Nepali year (Nepali year is ~56-57 years ahead)
        // Nepali new year starts mid-April, so before April we're in previous Nepali year
        const baseNepaliYear = englishYear + 56;
        
        // Get the month mapping
        const monthMapping = this.englishToNepaliMonthMap[englishMonth];
        
        // Try to find the English date in the relevant Nepali months
        for (let i = 0; i < monthMapping.months.length; i++) {
            const nepaliMonth = monthMapping.months[i];
            const yearOffset = monthMapping.years[i];
            const nepaliYear = baseNepaliYear + yearOffset;
            
            const yearData = this._calendarData.getYearData(nepaliYear);
            if (!yearData) continue;
            
            const monthData = yearData[nepaliMonth];
            if (!monthData) continue;
            
            // Search for the English day in this month's data
            for (const dayData of monthData) {
                if (dayData.en === englishDay && dayData.np !== '') {
                    const monthIndex = this.monthNames.indexOf(nepaliMonth);
                    return {
                        year: nepaliYear,
                        month: monthIndex + 1,
                        day: this._nepaliToArabic(dayData.np),
                        dayNp: dayData.np,
                        monthName: nepaliMonth,
                        formatted: `${nepaliMonth} ${dayData.np}, ${nepaliYear}`
                    };
                }
            }
        }
        
        // Fallback: try adjacent years if not found
        for (let yearOffset = -1; yearOffset <= 1; yearOffset++) {
            const nepaliYear = baseNepaliYear + yearOffset;
            const yearData = this._calendarData.getYearData(nepaliYear);
            if (!yearData) continue;
            
            for (const monthName of this.monthNames) {
                const monthData = yearData[monthName];
                if (!monthData) continue;
                
                for (const dayData of monthData) {
                    if (dayData.en === englishDay && dayData.np !== '') {
                        const monthIndex = this.monthNames.indexOf(monthName);
                        return {
                            year: nepaliYear,
                            month: monthIndex + 1,
                            day: this._nepaliToArabic(dayData.np),
                            dayNp: dayData.np,
                            monthName: monthName,
                            formatted: `${monthName} ${dayData.np}, ${nepaliYear}`
                        };
                    }
                }
            }
        }
        
        return null;
    }
    
    // Helper to convert Nepali numeral to Arabic
    _nepaliToArabic(nepaliNum) {
        if (!nepaliNum || nepaliNum === '') return NaN;
        const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
        let arabicStr = '';
        for (let char of nepaliNum) {
            let index = nepaliDigits.indexOf(char);
            if (index !== -1) {
                arabicStr += index.toString();
            } else if (char >= '0' && char <= '9') {
                arabicStr += char;
            }
        }
        return arabicStr ? parseInt(arabicStr, 10) : NaN;
    }

    // Get current Nepali date
    getCurrentNepaliDate() {
        return this.englishToNepali(new Date());
    }

    // Check if a Nepali date matches another date
    isSameNepaliDate(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.year === date2.year && 
               date1.month === date2.month && 
               date1.day === date2.day;
    }

    // Get day of week for English date (0=Sunday, 6=Saturday)
    getDayOfWeek(englishDate) {
        return englishDate.getDay();
    }
};
