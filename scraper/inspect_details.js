const fs = require('fs');

function check() {
    const text = fs.readFileSync('scraper/month_view.html', 'utf-8');

    // Check headers
    const daysUlStart = text.indexOf('<ul class="days clearfix"');
    if (daysUlStart !== -1) {
        const daysUlEnd = text.indexOf('</ul>', daysUlStart);
        const daysContent = text.substring(daysUlStart, daysUlEnd);
        console.log("--- Week Headers ---");
        console.log(daysContent.replace(/\s+/g, ' '));
    }

    // Check for English day in LI
    const ulStart = text.indexOf('<ul class="dates clearfix">');
    const ulEnd = text.indexOf('</ul>', ulStart);
    const content = text.substring(ulStart, ulEnd);
    const items = content.split('<li').slice(1);

    console.log("\n--- Item 3 Content (Full) ---");
    console.log('<li' + items[3]);
}

check();
