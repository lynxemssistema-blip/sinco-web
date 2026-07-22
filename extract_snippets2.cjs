const fs = require('fs');

const logFile = 'C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\629cae92-bcae-49a4-9ed9-24a9cd8dfb62\\.system_generated\\logs\\overview.txt';
let log = fs.readFileSync(logFile, 'utf8');

// Use regex to find everything between "ReplacementContent":" and the next property like ","StartLine" or whatever
let matches = log.match(/"ReplacementContent":"(.*?)"(?:,"StartLine"|,"TargetContent"|})/g);
let extracted = [];
if (matches) {
    for (let m of matches) {
        let content = m.replace(/"ReplacementContent":"/, '').replace(/","StartLine"|","TargetContent"|"}$/g, '');
        // unescape the JSON string
        try {
            content = JSON.parse('"' + content + '"');
        } catch (e) { }
        extracted.push(content);
    }
}

fs.writeFileSync('snippets.txt', extracted.join('\n\n\n=== CHUNK ===\n\n\n'));
console.log("Found " + (extracted ? extracted.length : 0) + " snippets.");
