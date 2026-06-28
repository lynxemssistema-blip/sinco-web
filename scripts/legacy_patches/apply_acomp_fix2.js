const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /className="flex-1 min-w-0 grid grid-cols-\[80px_50px_50px_1fr\] items-center gap-1"/g,
    'className="flex-1 min-w-0 flex items-center justify-between gap-1"'
);

content = content.replace(
    /className="flex items-center gap-1\.5 min-w-0"/g,
    'className="flex items-center gap-1.5 min-w-0 w-[70px]"'
);

content = content.replace(
    /className="text-center"/g,
    'className="text-center w-[40px]"'
);

content = content.replace(
    /className="flex flex-col items-end pr-2"/g,
    'className="flex flex-col items-end pr-2 w-[60px]"'
);

content = content.replace(
    /style={{ width: LABEL_WIDTH, backgroundColor: `\$\{bar\.color\}10` }}/g,
    'style={{ width: LABEL_WIDTH, backgroundColor: `${bar.color}10`, borderLeft: `4px solid ${bar.color}` }}'
);

content = content.replace(
    /className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer"/g,
    'className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer min-w-[110px]"'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed');
