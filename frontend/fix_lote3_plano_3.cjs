const fs = require('fs');
const path = require('path');

// Fix MatrizAdmin
let f4 = path.join(__dirname, 'src', 'pages', 'MatrizAdmin.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/\}, \[fetchMatrizes\]\); \/\/ eslint-disable-line react-hooks\/exhaustive-deps/g, '}, []);');
fs.writeFileSync(f4, c4);

// Fix MontagemPlanoCorte
let f5 = path.join(__dirname, 'src', 'pages', 'MontagemPlanoCorte.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/ User,/g, '');
c5 = c5.replace(/ CalendarDays,/g, '');
c5 = c5.replace(/ Edit3,/g, '');
c5 = c5.replace(/ Shield,/g, '');
c5 = c5.replace(/ ArrowRight,/g, '');
c5 = c5.replace(/type Rnc = \{[^}]+\};\r?\n/g, ''); // not that simple, wait
c5 = c5.replace(/type Rnc =/g, '// type Rnc =');

fs.writeFileSync(f5, c5);
console.log('Fixed Lote 3 - 3');
