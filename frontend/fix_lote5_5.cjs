const fs = require('fs');
const path = require('path');

// ProducaoPlanoCorte
let f2 = path.join(__dirname, 'src', 'pages', 'ProducaoPlanoCorte.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/catch\s*\{\}/g, 'catch { /* ignore */ }');
fs.writeFileSync(f2, c2);

// Projeto
let f3 = path.join(__dirname, 'src', 'pages', 'Projeto.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch\s*\{\}/g, 'catch { /* ignore */ }');
fs.writeFileSync(f3, c3);

// Romaneio
let f4 = path.join(__dirname, 'src', 'pages', 'Romaneio.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/interface RomaneioPageProps \{[^}]*\};\r?\n/g, ''); // if it ends with ;
c4 = c4.replace(/interface RomaneioPageProps \{\r?\n\s*onNavigate: \(pageId: string\) => void;\r?\n\s*onSetRncItem\?: \(id: number \| null\) => void;\r?\n\}\r?\n/g, ''); // specific
fs.writeFileSync(f4, c4);

console.log('Fixed Lote 5 files - pass 5');
