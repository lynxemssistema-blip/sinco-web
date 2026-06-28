const fs = require('fs');
const path = require('path');

let f5 = path.join(__dirname, 'src', 'pages', 'MontagemPlanoCorte.tsx');
let c5 = fs.readFileSync(f5, 'utf8');

c5 = c5.replace(/interface Rnc \{\r?\n\s*IdRnc: number;\r?\n\s*Estatus: string;\r?\n\s*Tag: string;\r?\n\}/g, '');

// Since that didn't match perfectly, I'll do a simple string replace
c5 = c5.replace('interface Rnc { \r\n  IdRnc: number; \r\n  Estatus: string; \r\n  Tag: string; \r\n}', '');
c5 = c5.replace('interface Rnc { \n  IdRnc: number; \n  Estatus: string; \n  Tag: string; \n}', '');

c5 = c5.replace(/interface Rnc \{[^}]+\}/g, '');

fs.writeFileSync(f5, c5);
console.log('Fixed Lote 3 - 5');
