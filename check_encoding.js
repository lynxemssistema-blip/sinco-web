const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
const txt = fs.readFileSync(file, 'utf8');

let count = 0;
const lines = txt.split('\n');
lines.forEach((l, i) => {
    if (l.includes('\uFFFD')) { // The standard replacement character
        console.log('Line ' + (i+1) + ': ' + l.trim());
        count++;
    }
});
console.log('Found ' + count + ' replacement characters.');
