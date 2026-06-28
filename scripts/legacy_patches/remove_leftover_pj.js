const fs = require('fs');
const f = 'frontend/src/pages/PessoaJuridica.tsx';
let c = fs.readFileSync(f, 'utf8');

// Remove leftover block: searchTerm && ( <button ... </button> )} </div>
// These are lines 362-367 that got left behind
const idx1 = c.indexOf('\r\n                {searchTerm && (');
if (idx1 > -1) {
    const idx2 = c.indexOf('</div>', idx1 + 1);
    if (idx2 > -1) {
        const removed = c.substring(idx1, idx2 + 6);
        console.log('Removing:', JSON.stringify(removed.substring(0, 150)));
        c = c.substring(0, idx1) + c.substring(idx2 + 6);
        console.log('Removed leftover block');
    }
} else {
    console.log('Leftover not found, checking...');
    const idx = c.indexOf('searchTerm');
    if (idx > -1) console.log('searchTerm at:', idx, JSON.stringify(c.substring(idx - 10, idx + 100)));
}

fs.writeFileSync(f, c, 'utf8');
console.log('Saved');
