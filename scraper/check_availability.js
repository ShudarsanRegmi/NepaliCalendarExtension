const https = require('https');

const years = Array.from({ length: 15 }, (_, i) => 2075 + i);

async function checkYear(year) {
    return new Promise((resolve) => {
        const url = `https://www.hamropatro.com/calendar/${year}/1`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const hasTithi = data.includes('class="tithi"');
                console.log(`${year}: ${hasTithi ? 'YES' : 'NO'}`);
                resolve();
            });
        }).on('error', (err) => {
            console.log(`${year}: ERROR`);
            resolve();
        });
    });
}

async function run() {
    for (const year of years) {
        await checkYear(year);
        // small delay to be nice
        await new Promise(r => setTimeout(r, 200));
    }
}

run();
