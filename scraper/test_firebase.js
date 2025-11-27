const fs = require('fs');

async function check() {
    const baseUrl = 'https://hamropatro.firebaseio.com';
    const endpoints = [
        '/calendar/2075.json',
        '/years/2075.json',
        '/data/2075.json',
        '/nepali_calendar/2075.json',
        '/events/2075.json',
        '/public/calendar/2075.json'
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Fetching ${baseUrl}${ep}...`);
            const res = await fetch(`${baseUrl}${ep}`);
            if (res.ok) {
                console.log(`SUCCESS: ${ep}`);
                const text = await res.text();
                console.log(text.substring(0, 500));
            } else {
                console.log(`FAILED: ${ep} - ${res.status}`);
            }
        } catch (e) {
            console.log(`ERROR: ${ep} - ${e.message}`);
        }
    }
}

check();
