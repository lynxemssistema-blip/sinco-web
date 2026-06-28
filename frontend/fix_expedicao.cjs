const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ControleExpedicao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Unused vars
code = code.replace(/catch \(_err\)/g, 'catch');
code = code.replace(/catch \(e\)/g, 'catch');
code = code.replace(/const hasFilters = /g, '// const hasFilters = ');

fs.writeFileSync(filePath, code);
console.log('Fixed ControleExpedicao');
