const fs = require('fs');

async function check() {
    const res = await fetch('https://www.hamropatro.com/js/script.js');
    const text = await res.text();
    fs.writeFileSync('scraper/script.js', text);
    console.log("Saved to scraper/script.js");
}

check();
