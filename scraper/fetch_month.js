const fs = require('fs');

async function check() {
    const url = 'https://www.hamropatro.com/calendar/2078/8';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync('scraper/month_view.html', text);
    console.log("Saved to scraper/month_view.html");
}

check();
