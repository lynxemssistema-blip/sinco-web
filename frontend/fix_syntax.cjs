const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AcompanhamentoGeral.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/CheckCircle2,   , /g, 'CheckCircle2, ');

fs.writeFileSync(filePath, code);
console.log('Fixed syntax error');
