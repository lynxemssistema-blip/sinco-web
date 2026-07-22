const fs = require('fs');

let log = fs.readFileSync('restore_file.txt', 'utf8');

// Find the last occurrence of "1: import React,"
let lines = log.split('\n');
let codeLines = [];
let capturing = false;

// We iterate backwards to find the most recent full view of the file
// But since the lines are 1: ..., 2: ..., we can just collect all lines that match the pattern `^\d+: ` from the last block.

let currentBlock = [];
let allBlocks = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let match = line.match(/^>?[ \t]*(\d+): (.*)$/);
    if (match) {
        let num = parseInt(match[1]);
        let content = match[2];
        if (num === 1) {
            if (currentBlock.length > 0) {
                allBlocks.push(currentBlock);
            }
            currentBlock = [];
        }
        currentBlock.push({ num, content });
    }
}
if (currentBlock.length > 0) {
    allBlocks.push(currentBlock);
}

// Find the longest block
let bestBlock = allBlocks.sort((a, b) => b.length - a.length)[0];

if (!bestBlock || bestBlock.length === 0) {
    console.error("Could not find source code block.");
    process.exit(1);
}

// Reconstruct the file
let fileContent = bestBlock.map(l => l.content).join('\n');

// Since we have carriage returns in windows, maybe we need to be careful.
fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada_recovered.tsx', fileContent);
console.log(`Recovered file with ${bestBlock.length} lines.`);
