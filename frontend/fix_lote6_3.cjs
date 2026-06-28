const fs = require('fs');
const path = require('path');

// Tarefas
let f3 = path.join(__dirname, 'src', 'pages', 'Tarefas.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(f3, c3);

console.log('Fixed Lote 6 files - pass 3');
