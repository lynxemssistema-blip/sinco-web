const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

// The exact string to remove from the Gantt bar
const barTextRegex = /<span className="relative z-10 px-1 text-\[7px\] font-black text-slate-800 whitespace-nowrap leading-none mix-blend-multiply drop-shadow-\[0_0_2px_rgba\(255,255,255,0\.8\)\]">[\s\S]*?<\/span>/g;

content = content.replace(barTextRegex, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Removed text from Gantt bars');
