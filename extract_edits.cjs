const fs = require('fs');
const logFile = 'C:\\Users\\MEC050922\\.gemini\\antigravity\\brain\\34b648ae-7da4-4f36-9ee0-8e18076979ea\\.system_generated\\logs\\overview.txt';
const log = fs.readFileSync(logFile, 'utf8');

const regex = /The following changes were made by the replace_file_content tool to.*?MontaPecaManufaturada\.tsx.*?\[diff_block_start\](.*?)\[diff_block_end\]/gs;

let match;
const matches = [];
while ((match = regex.exec(log)) !== null) {
    matches.push(match[1]);
}

fs.writeFileSync('matches.json', JSON.stringify(matches, null, 2));
console.log('Found ' + matches.length + ' edits.');
