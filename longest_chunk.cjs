const fs = require('fs');

let content = fs.readFileSync('snippets.txt', 'utf8');
let chunks = content.split('=== CHUNK ===');
// Find the longest chunk
let longest = chunks.sort((a,b) => b.length - a.length)[0];
fs.writeFileSync('longest_chunk.txt', longest);
