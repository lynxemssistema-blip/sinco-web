const fs = require('fs');

let content = fs.readFileSync('snippets.txt', 'utf8');
let chunks = content.split('=== CHUNK ===');
let tsxChunks = chunks.filter(c => c.includes('<div') || c.includes('<table') || c.includes('showModalManutencao'));
fs.writeFileSync('tsx_chunks.txt', tsxChunks.join('\n\n--- NEXT CHUNK ---\n\n'));
