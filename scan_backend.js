const fs = require('fs');

const content = fs.readFileSync('src/server.js', 'utf8');
const lines = content.split('\n');

let missingReturns = 0;
let unawaitedQueries = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for res.status(500).json without return
    if (line.includes('res.status(500).json') || line.includes('res.status(400).json')) {
        if (!line.includes('return') && !lines[i-1].includes('return')) {
            // Check if it's the last statement in a catch block
            const nextLines = lines.slice(i+1, i+5).join('');
            if (!nextLines.includes('}')) {
                // Potential missing return
                missingReturns++;
            }
        }
    }
    
    // Check for unawaited db calls
    if (line.includes('db(req).execute') || line.includes('db(req).query')) {
        if (!line.includes('await') && !line.includes('return')) {
            unawaitedQueries++;
        }
    }
}

console.log('Potenciais missing returns após res.status:', missingReturns);
console.log('Consultas não aguardadas (sem await):', unawaitedQueries);
