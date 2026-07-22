const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

// 1. Plan em Lote
const planEmLoteRegex = /<button[\s]+onClick=\{\(\) => \{ setBulkSectorDates\(\{\}\); setMsg\(null\); setActionModal\('bulkDateTags'\); \}\}[\s]+className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0"[\s]+title="Planejar datas para TODAS as tags deste projeto"[\s]+>[\s]+<CalendarDays size=\{14\} \/> <span>Plan\. em Lote<\/span>[\s]+<\/button>/;

const planEmLoteReplace = `<button 
 onClick={() => { 
 if (selProj?.Finalizado === 'C') return;
 setBulkSectorDates({}); setMsg(null); setActionModal('bulkDateTags'); 
 }} 
 className={\`p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0 \${selProj?.Finalizado === 'C' ? 'bg-slate-400 cursor-not-allowed opacity-60' : 'bg-indigo-600 hover:bg-indigo-700'}\`}
 title={selProj?.Finalizado === 'C' ? 'Projeto finalizado. Planejamento bloqueado.' : 'Planejar datas para TODAS as tags deste projeto'}
 >
 <CalendarDays size={14} /> <span>Plan. em Lote</span>
 </button>`;

if (planEmLoteRegex.test(file)) {
    file = file.replace(planEmLoteRegex, planEmLoteReplace);
    console.log("Plan em Lote substituído.");
} else {
    console.log("Plan em Lote NÃO encontrado.");
}

// 2. Planejar Setores
const planejarSetoresRegex = /className="w-full text-\[9px\] bg-slate-100 hover:bg-\[#32423D\] hover:text-white border border-slate-200 text-slate-500 font-bold py-1\.5 rounded flex items-center justify-center gap-1 transition-colors mb-1"[\s]+>[\s]+<CalendarDays size=\{10\} \/> Planejar Setores[\s]+<\/button>/;

const planejarSetoresReplace = `className={\`w-full text-[9px] border border-slate-200 font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors mb-1 \${selProj?.Finalizado === 'C' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-[#32423D] hover:text-white text-slate-500'}\`}
 title={selProj?.Finalizado === 'C' ? 'Projeto finalizado. Planejamento bloqueado.' : 'Planejar Setores'}
 onClick={(e) => {
   if (selProj?.Finalizado === 'C') {
     e.stopPropagation();
   }
 }}
 >
 <CalendarDays size={10} /> Planejar Setores
 </button>`;

if (planejarSetoresRegex.test(file)) {
    file = file.replace(planejarSetoresRegex, planejarSetoresReplace);
    console.log("Planejar Setores substituído.");
} else {
    console.log("Planejar Setores NÃO encontrado.");
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
