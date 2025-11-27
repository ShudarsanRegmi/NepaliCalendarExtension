const fs = require('fs');

function check() {
    const text = fs.readFileSync('scraper/page.html', 'utf-8');

    let pos = 0;
    while (true) {
        const ulStart = text.indexOf('<ul', pos);
        if (ulStart === -1) break;

        const ulEnd = text.indexOf('>', ulStart);
        const ulTag = text.substring(ulStart, ulEnd + 1);

        // Find closing </ul> matching this one (simple nesting check)
        let depth = 1;
        let current = ulEnd + 1;
        let ulClose = -1;

        while (depth > 0 && current < text.length) {
            const nextOpen = text.indexOf('<ul', current);
            const nextClose = text.indexOf('</ul>', current);

            if (nextClose === -1) break; // formatting error or end

            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                current = nextOpen + 3;
            } else {
                depth--;
                if (depth === 0) ulClose = nextClose;
                current = nextClose + 5;
            }
        }

        if (ulClose !== -1) {
            const content = text.substring(ulEnd + 1, ulClose);
            const liCount = (content.match(/<li/g) || []).length;
            console.log(`UL at ${ulStart}: ${ulTag} has ${liCount} LIs`);

            if (liCount > 20) {
                console.log(`Snippet: ${content.substring(0, 200).replace(/\s+/g, ' ')}`);
            }
        }

        pos = ulStart + 1;
    }
}

check();
