const fs = require('fs');

async function check() {
    const res = await fetch('https://www.hamropatro.com/');
    const text = await res.text();
    fs.writeFileSync('scraper/home.html', text);
    console.log("Saved to scraper/home.html");
}

check();
