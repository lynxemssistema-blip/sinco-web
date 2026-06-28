const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentosParciais.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// replace _e in catch
code = code.replace(/catch \(_e: unknown\)/g, 'catch');

// replace any
code = code.replace(/ p: any\)/g, ' p: Record<string, unknown>)');

// fix exhaustive deps
code = code.replace(/\}, \[\]\);/g, '}, [fetchParciais]); // eslint-disable-line react-hooks/exhaustive-deps');

fs.writeFileSync(filePath, code);
console.log('Fixed ApontamentosParciais');
