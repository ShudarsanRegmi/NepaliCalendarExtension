const ExtensionUtils = imports.misc.extensionUtils;

var DateConverter = class DateConverter {
    constructor() {
        // Nepali calendar data - days in each month for each year
        this.nepaliCalendar = {
            '2074': { 'months': [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'totalDays': 365 },
            '2075': { 'months': [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'totalDays': 365 },
            '2076': { 'months': [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'totalDays': 365 },
            '2077': { 'months': [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], 'totalDays': 366 },
            '2078': { 'months': [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], 'totalDays': 365 },
            '2079': { 'months': [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], 'totalDays': 365 },
            '2080': { 'months': [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], 'totalDays': 365 },
            '2081': { 'months': [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 366 },
            '2082': { 'months': [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2083': { 'months': [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2084': { 'months': [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2085': { 'months': [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2086': { 'months': [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2087': { 'months': [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], 'totalDays': 366 },
            '2088': { 'months': [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30], 'totalDays': 365 },
            '2089': { 'months': [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], 'totalDays': 365 }
        };

        this.monthNames = [
            'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
            'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
        ];

        // Reference date: 2074/1/1 BS = 2017/4/14 AD
        this.referenceNepaliDate = { year: 2074, month: 1, day: 1 };
        this.referenceEnglishDate = new Date(2017, 3, 14); // April 14, 2017
    }

    // Convert English date to Nepali date
    englishToNepali(englishDate) {
        if (!englishDate) {
            englishDate = new Date();
        }

        // Calculate difference in days from reference date
        const dayDifference = Math.floor((englishDate - this.referenceEnglishDate) / (1000 * 60 * 60 * 24));
        
        if (dayDifference < 0) {
            // Date is before our reference date
            return null;
        }

        let nepaliYear = this.referenceNepaliDate.year;
        let nepaliMonth = this.referenceNepaliDate.month;
        let nepaliDay = this.referenceNepaliDate.day;
        let remainingDays = dayDifference;

        // Add days to reach the target date
        while (remainingDays > 0) {
            const yearData = this.nepaliCalendar[nepaliYear.toString()];
            if (!yearData) {
                // Year not supported
                return null;
            }

            const daysInCurrentMonth = yearData.months[nepaliMonth - 1];
            const daysLeftInMonth = daysInCurrentMonth - nepaliDay + 1;

            if (remainingDays < daysLeftInMonth) {
                nepaliDay += remainingDays;
                remainingDays = 0;
            } else {
                remainingDays -= daysLeftInMonth;
                nepaliMonth++;
                nepaliDay = 1;

                if (nepaliMonth > 12) {
                    nepaliMonth = 1;
                    nepaliYear++;
                }
            }
        }

        return {
            year: nepaliYear,
            month: nepaliMonth,
            day: nepaliDay,
            monthName: this.monthNames[nepaliMonth - 1],
            formatted: `${this.monthNames[nepaliMonth - 1]} ${nepaliDay}, ${nepaliYear}`
        };
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
