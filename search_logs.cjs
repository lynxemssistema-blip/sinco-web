const fs = require('fs');
let log = fs.readFileSync('C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\629cae92-bcae-49a4-9ed9-24a9cd8dfb62\\.system_generated\\logs\\overview.txt', 'utf8');

// Find all matches of MontaPecaManufaturada
let lines = log.split('\n');
let matches = [];
for (let line of lines) {
    if (line.includes('MontaPecaManufaturada.tsx') && line.includes('The following code has been modified')) {
        matches.push(line);
    }
}

fs.writeFileSync('matches.json', JSON.stringify(matches, null, 2));
console.log("Found " + matches.length + " matches.");
