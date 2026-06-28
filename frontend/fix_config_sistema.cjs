const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ConfiguracaoSistema.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/ as any\)/g, ' as Record<string, unknown>)');

fs.writeFileSync(filePath, code);
console.log('Fixed ConfiguracaoSistema');
