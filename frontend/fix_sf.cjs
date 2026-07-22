const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

file = file.replace(/sf: 'finalizados' \| 'liberados' \| 'todos' \|sf: 'finalizados' \| 'liberados' \| 'todos' \| 'nao_finalizados' \| null = null/, "sf: 'finalizados' | 'liberados' | 'todos' | 'nao_finalizados' | null = null");

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
console.log('Fixed sf typo!');
