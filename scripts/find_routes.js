const fs = require('fs');
const code = fs.readFileSync('src/server.js', 'utf-8');
const lines = code.split('\n');
const res = [];
lines.forEach((l, i) => {
    if (l.toLowerCase().includes('ordemservico')) {
        res.push((i+1) + ': ' + l.trim());
    }
});
fs.writeFileSync('routes_ordemservico.txt', res.join('\n'));
