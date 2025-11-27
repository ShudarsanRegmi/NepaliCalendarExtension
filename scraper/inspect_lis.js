const fs = require('fs');

function check() {
    const text = fs.readFileSync('scraper/month_view.html', 'utf-8');
    const ulStart = text.indexOf('<ul class="dates clearfix">');
    if (ulStart === -1) {
        console.log("UL not found");
        return;
    }

    const ulEnd = text.indexOf('</ul>', ulStart);
    const content = text.substring(ulStart, ulEnd);

    // Split by <li to get items
    const items = content.split('<li').slice(1); // skip first empty part

    console.log(`Found ${items.length} items.`);

    // Print first 5 items
    for (let i = 0; i < 5; i++) {
        console.log(`--- Item ${i} ---`);
        console.log('<li' + items[i].substring(0, 500));
    }
}

check();
