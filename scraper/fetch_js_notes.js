const fs = require('fs');

async function check() {
    const res = await fetch('https://www.hamropatro.com/js/scriptNotes.js');
    const text = await res.text();
    fs.writeFileSync('scraper/scriptNotes.js', text);
    console.log("Saved to scraper/scriptNotes.js");
}

check();
