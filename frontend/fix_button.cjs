const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const todosBlock = `{/* 3 - Todos */}`;
const naoFinalizadosBlock = `{/* 3 - Nao Finalizados */}
  <button
  onClick={() => {
  const next = statusFilter === 'nao_finalizados' ? null : 'nao_finalizados';
  setStatusFilter(next);
  fetchProj(next);
  }}
  className={\`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all \${
  statusFilter === 'nao_finalizados'
  ? 'bg-orange-500 text-white shadow-sm'
  : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50'
  }\`}
  >
  <List size={11} /> Não Finalizados
  </button>
  {/* 4 - Todos */}`;

file = file.replace(todosBlock, naoFinalizadosBlock);
fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
console.log('Added Nao Finalizados button');
