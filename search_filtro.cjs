const fs = require('fs');

const logFile = 'C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\629cae92-bcae-49a4-9ed9-24a9cd8dfb62\\.system_generated\\logs\\overview.txt';
let log = fs.readFileSync(logFile, 'utf8');
let lines = log.split('\n');

let matches = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('filtroManutCod')) {
        matches.push(`Line ${i}: ${lines[i].substring(0, 200)}...`);
    }
}

fs.writeFileSync('matches_filtro.txt', matches.join('\n'));
console.log("Found " + matches.length + " matches.");
