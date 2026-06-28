const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Configuracao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/useState<any\[\]>\(\[\]\)/g, 'useState<Record<string, unknown>[]>([])');
code = code.replace(/catch\(e\) \{\}/g, 'catch { /* ignore */ }');
code = code.replace(/handleSelectDb = \(db: any\)/g, 'handleSelectDb = (db: Record<string, unknown>)');

fs.writeFileSync(filePath, code);
console.log('Fixed Configuracao 2');
