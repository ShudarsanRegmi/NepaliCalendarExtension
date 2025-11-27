const fs = require('fs');

async function check() {
    const baseUrl = 'https://everestbackend-api.hamropatro.com';
    const endpoints = [
        '/calendar/2075/1',
        '/calendar/2075/01',
        '/date/2075-1-1',
        '/dates/2075/1',
        '/api/calendar/2075/1'
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
