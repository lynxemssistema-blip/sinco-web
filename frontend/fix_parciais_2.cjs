const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentosParciais.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/const headers: any = \{/g, 'const headers: Record<string, string> = {');

fs.writeFileSync(filePath, code);
console.log('Fixed any in ApontamentosParciais');
