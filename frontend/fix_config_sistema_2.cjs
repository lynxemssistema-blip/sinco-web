const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ConfiguracaoSistema.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/tipo: e\.target\.value as any/g, 'tipo: e.target.value as "string" | "number" | "boolean"');

fs.writeFileSync(filePath, code);
console.log('Fixed any in ConfiguracaoSistema');
