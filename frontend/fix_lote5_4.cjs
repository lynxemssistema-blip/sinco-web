const fs = require('fs');
const path = require('path');

// ProducaoPlanoCorte
let f2 = path.join(__dirname, 'src', 'pages', 'ProducaoPlanoCorte.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/catch \(e\) \{\}/g, 'catch { /* ignore */ }');
fs.writeFileSync(f2, c2);

// Projeto
let f3 = path.join(__dirname, 'src', 'pages', 'Projeto.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(e\) \{\}/g, 'catch { /* ignore */ }');
fs.writeFileSync(f3, c3);

// Romaneio
let f4 = path.join(__dirname, 'src', 'pages', 'Romaneio.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/type RomaneioPageProps = \{\r?\n\};\r?\n/g, ''); // if it was like this
c4 = c4.replace(/type RomaneioPageProps = \{\};\r?\n/g, ''); // or this
fs.writeFileSync(f4, c4);

console.log('Fixed Lote 5 files - pass 4');
