const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');
file = file.replace(/} else if \(sf === 'todos'\) {\r?\n\s*qs.set\('modo', 'todos'\);\r?\n\s*}/,
    `} else if (sf === 'todos') {\n  qs.set('modo', 'todos');\n } else if (sf === 'nao_finalizados') {\n  qs.set('modo', 'nao_finalizados');\n }`);
fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
console.log('Fixed sf');
