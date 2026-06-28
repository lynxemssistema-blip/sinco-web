const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the Gantt Row alignments
content = content.replace(
    /className="flex-1 min-w-0 flex items-center justify-between gap-1"/g,
    'className="flex-1 min-w-0 flex items-center justify-start gap-3"'
);

// push totals to the right
content = content.replace(
    /className="flex flex-col items-end pr-2 w-\[60px\]"/g,
    'className="flex flex-col items-end pr-2 w-[60px] ml-auto"'
);

// fix date fields in filter
content = content.replace(
    /className="flex items-center gap-1\.5 bg-white border border-slate-200 rounded-lg px-2 py-1"/g,
    'className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shrink-0"'
);

content = content.replace(
    /className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer min-w-\[110px\]"/g,
    'className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer w-[115px] shrink-0"'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed again');
