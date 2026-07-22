const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

// Update state definition
content = content.replace(
    "useState<'finalizados'|'liberados'|'todos'|null>",
    "useState<'finalizados'|'liberados'|'nao_liberados'|'todos'|null>"
);

// Update fetchProj signature
content = content.replace(
    "const fetchProj = async (sf: 'finalizados' | 'liberados' | 'todos' | null = null) => {",
    "const fetchProj = async (sf: 'finalizados' | 'liberados' | 'nao_liberados' | 'todos' | null = null) => {"
);

// Update fetchProj mode mapping
content = content.replace(
    "} else if (sf === 'liberados') {\n   qs.set('modo', 'liberados');\n   } else if (sf === 'todos') {",
    "} else if (sf === 'liberados') {\n   qs.set('modo', 'liberados');\n   } else if (sf === 'nao_liberados') {\n   qs.set('modo', 'nao_liberados');\n   } else if (sf === 'todos') {"
);

// Insert Não Liberados button
const liberadosButton = `   {/* 2 - Liberados */}
   <button
   onClick={() => {
   const next = statusFilter === 'liberados' ? null : 'liberados';
   setStatusFilter(next);
   fetchProj(next);
   }}
   className={\`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all \${
   statusFilter === 'liberados'
   ? 'bg-[#32423D] text-white shadow-sm'
   : 'text-slate-500 hover:text-[#32423D]/70 hover:bg-[#E0E800]/10'
   }\`}
   >
   <Filter size={11} /> Liberados
   </button>`;

const naoLiberadosButton = `
   {/* 2.5 - Não Liberados */}
   <button
   onClick={() => {
   const next = statusFilter === 'nao_liberados' ? null : 'nao_liberados';
   setStatusFilter(next);
   fetchProj(next);
   }}
   className={\`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all \${
   statusFilter === 'nao_liberados'
   ? 'bg-amber-600 text-white shadow-sm'
   : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
   }\`}
   >
   <Filter size={11} /> Não Liberados
   </button>`;

content = content.replace(liberadosButton, liberadosButton + naoLiberadosButton);

fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed status filter logic and button');
