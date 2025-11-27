const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

const START_YEAR = 2075;
const END_YEAR = 2089;
const MONTHS = [
    "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];
const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

async function fetchMonth(year, month) {
    const url = `https://www.hamropatro.com/calendar/${year}/${month}`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return await res.text();
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return null;
    }
}

function parseMonth(html, year, monthIndex) {
    const $ = cheerio.load(html);
    const days = [];

    // Find the calendar grid
    const grid = $('ul.dates.clearfix');
    if (!grid.length) {
        console.error(`Grid not found for ${year}/${monthIndex + 1}`);
        return [];
    }

    grid.find('li').each((i, el) => {
        const $li = $(el);
        const isDisable = $li.hasClass('disable');
        const isHolidayClass = $li.hasClass('holiday');

        // Extract data
        let event = $li.find('.event').text().trim();
        if (event === '--') event = '';

        const nep = $li.find('.nep').text().trim();
        const tithi = $li.find('.tithi').text().trim();
        const eng = $li.find('.eng').first().text().trim(); // First .eng is the date

        // Determine if holiday
        // Logic: Saturday is holiday OR if it has 'holiday' class
        const dayOfWeekIndex = i % 7;
        const dayName = DAYS_OF_WEEK[dayOfWeekIndex];
        const isSaturday = dayName === 'sat';
        const isHoliday = isSaturday || isHolidayClass;

        // Special day logic: if event is present?
        const isSpecial = event.length > 0;

        // Construct object
        // If disabled (padding), we might want to leave fields empty to match convention
        // In 2074.json, padding days have empty strings.
        // BUT the first padding day in 2074.json had data.
        // Let's try to be smart: if it's disabled, check if we should include it.
        // Actually, the simplest way to match the visual grid is to include everything but mark as padding?
        // The existing JSON doesn't have an 'is_padding' field. It just has empty strings.
        // Let's assume if 'disable' class is present, we zero out the data.

        let dayObj = {
            np: nep,
            en: eng,
            tithi: tithi,
            event: event,
            day: dayName,
            specialday: isSpecial,
            holiday: isHoliday
        };

        if (isDisable) {
            dayObj = {
                np: "",
                en: "",
                tithi: "",
                event: "",
                day: dayName,
                specialday: false,
                holiday: false
            };
        }

        days.push(dayObj);
    });

    return days;
}

async function main() {
    const apiDir = path.join(__dirname, '../api');
    if (!fs.existsSync(apiDir)) {
        fs.mkdirSync(apiDir, { recursive: true });
    }

    for (let year = START_YEAR; year <= END_YEAR; year++) {
        const yearData = {};

        for (let m = 0; m < 12; m++) {
            const monthName = MONTHS[m];
            const html = await fetchMonth(year, m + 1);
            if (html) {
                const monthDays = parseMonth(html, year, m);
                yearData[monthName] = monthDays;
            } else {
                console.error(`Skipping ${monthName} ${year} due to fetch error`);
                yearData[monthName] = [];
            }

            // Be nice to the server
            await new Promise(r => setTimeout(r, 500));
        }

        const filePath = path.join(apiDir, `${year}.json`);
        fs.writeFileSync(filePath, JSON.stringify(yearData, null, 0)); // Compact JSON
        console.log(`Saved ${year}.json`);
    }
}

main();
