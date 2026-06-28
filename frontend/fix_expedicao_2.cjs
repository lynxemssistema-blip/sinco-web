const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ControleExpedicao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/catch \(_err: unknown\)/g, 'catch');

fs.writeFileSync(filePath, code);
console.log('Fixed _err in ControleExpedicao');
