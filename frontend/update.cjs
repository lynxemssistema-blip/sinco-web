const fs = require('fs');
let c = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf-8');
c = c.replace(/useState<string\[\]>\(\['corte', 'dobra', 'solda', 'pintura', 'montagem'\]\)/g, "useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem', 'cortealaser', 'pulsionadeira', 'galvanizar'])");
fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', c);
