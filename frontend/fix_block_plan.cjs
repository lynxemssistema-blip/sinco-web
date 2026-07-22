const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

// 1. Add variable to define block status
const searchStr = `const [bulkSectorDates, setBulkSectorDates] = useState<Partial<TagSectorDates>>({});`;
const replaceStr = `const [bulkSectorDates, setBulkSectorDates] = useState<Partial<TagSectorDates>>({});\n  const isProjectBloqueadoParaPlan = selProj?.liberado === 'S' || selProj?.liberado === 'SIM' || selProj?.Finalizado === 'C' || selProj?.Finalizado === 'S' || selProj?.StatusProj === 'FINALIZADO';`;
file = file.replace(searchStr, replaceStr);

// 2. Disable "Plan. em Lote"
const planLoteBtn = `<button \n onClick={() => { setBulkSectorDates({}); setMsg(null); setActionModal('bulkDateTags'); }} \n className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0"\n title="Planejar datas para TODAS as tags deste projeto"\n >`;
const planLoteBtnNew = `<button \n onClick={() => { setBulkSectorDates({}); setMsg(null); setActionModal('bulkDateTags'); }} \n className={\`p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0 \${isProjectBloqueadoParaPlan ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}\`}\n title={isProjectBloqueadoParaPlan ? "Planejamento desabilitado para projetos liberados/finalizados" : "Planejar datas para TODAS as tags deste projeto"}\n disabled={isProjectBloqueadoParaPlan}\n >`;
file = file.replace(planLoteBtn, planLoteBtnNew);

// 3. Disable "Planejar Setores"
const planSetoresBtn = `<button \n onClick={() => { \n setSelTag(t); \n setTagSectorDates({\n PlanejadoInicioCorte: brToIso(t.PlanejadoInicioCorte), PlanejadoFinalCorte: brToIso(t.PlanejadoFinalCorte),\n PlanejadoInicioDobra: brToIso(t.PlanejadoInicioDobra), PlanejadoFinalDobra: brToIso(t.PlanejadoFinalDobra),\n PlanejadoInicioSolda: brToIso(t.PlanejadoInicioSolda), PlanejadoFinalSolda: brToIso(t.PlanejadoFinalSolda),\n PlanejadoInicioPintura: brToIso(t.PlanejadoInicioPintura), PlanejadoFinalPintura: brToIso(t.PlanejadoFinalPintura),\n PlanejadoInicioMontagem: brToIso(t.PlanejadoInicioMontagem), PlanejadoFinalMontagem: brToIso(t.PlanejadoFinalMontagem),\n });\n setMsg(null); setActionModal('dateTagSetores'); \n }}\n className="w-full text-[9px] bg-slate-100 hover:bg-[#32423D] hover:text-white border border-slate-200 text-slate-500 font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors mb-1"\n >`;

const planSetoresBtnNew = `<button \n onClick={() => { \n setSelTag(t); \n setTagSectorDates({\n PlanejadoInicioCorte: brToIso(t.PlanejadoInicioCorte), PlanejadoFinalCorte: brToIso(t.PlanejadoFinalCorte),\n PlanejadoInicioDobra: brToIso(t.PlanejadoInicioDobra), PlanejadoFinalDobra: brToIso(t.PlanejadoFinalDobra),\n PlanejadoInicioSolda: brToIso(t.PlanejadoInicioSolda), PlanejadoFinalSolda: brToIso(t.PlanejadoFinalSolda),\n PlanejadoInicioPintura: brToIso(t.PlanejadoInicioPintura), PlanejadoFinalPintura: brToIso(t.PlanejadoFinalPintura),\n PlanejadoInicioMontagem: brToIso(t.PlanejadoInicioMontagem), PlanejadoFinalMontagem: brToIso(t.PlanejadoFinalMontagem),\n });\n setMsg(null); setActionModal('dateTagSetores'); \n }}\n className={\`w-full text-[9px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors mb-1 border border-slate-200 \${isProjectBloqueadoParaPlan ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' : 'bg-slate-100 hover:bg-[#32423D] hover:text-white text-slate-500'}\`}\n disabled={isProjectBloqueadoParaPlan}\n title={isProjectBloqueadoParaPlan ? "Planejamento desabilitado para projetos liberados/finalizados" : ""}\n >`;
file = file.replace(planSetoresBtn, planSetoresBtnNew);

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
console.log('Fixed block planning');
