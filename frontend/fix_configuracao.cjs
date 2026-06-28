const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Configuracao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/catch \(_err: unknown\)/g, 'catch');
code = code.replace(/catch \(err\)/g, 'catch');
code = code.replace(/catch \(e\)\s*\{\}/g, 'catch { /* ignore */ }');
code = code.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
code = code.replace(/ as any\)/g, ' as Record<string, unknown>)');

fs.writeFileSync(filePath, code);
console.log('Fixed Configuracao');
