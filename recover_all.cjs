const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\MEC050922\\.gemini\\antigravity\\brain';
const conversations = fs.readdirSync(brainDir);

let bestFileContent = '';
let maxLines = 0;
let bestConv = '';

for (let conv of conversations) {
    const logFile = path.join(brainDir, conv, '.system_generated', 'logs', 'overview.txt');
    if (!fs.existsSync(logFile)) continue;
    
    let log = fs.readFileSync(logFile, 'utf8');
    // Find view_file tool response for MontaPecaManufaturada.tsx
    let lines = log.split('\n');
    let currentBlock = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // This regex matches lines that start with a number and a colon, possibly preceded by >
        let match = line.match(/^>?[ \t]*(\d+): (.*)$/);
        
        if (match) {
            let num = parseInt(match[1]);
            let content = match[2];
            
            if (num === 1) {
                if (currentBlock.length > maxLines && currentBlock.join('\n').includes('MontaPecaManufaturada')) {
                    maxLines = currentBlock.length;
                    bestFileContent = currentBlock.map(x => x.content).join('\n');
                    bestConv = conv;
                }
                currentBlock = [];
            }
            currentBlock.push({ num, content });
        }
    }
    
    if (currentBlock.length > maxLines && currentBlock.map(x=>x.content).join('\n').includes('MontaPecaManufaturada')) {
        maxLines = currentBlock.length;
        bestFileContent = currentBlock.map(x => x.content).join('\n');
        bestConv = conv;
    }
}

if (bestFileContent) {
    fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada_recovered2.tsx', bestFileContent);
    console.log(`Recovered file from conv ${bestConv} with ${maxLines} lines.`);
} else {
    console.log("Could not find source code block.");
}
