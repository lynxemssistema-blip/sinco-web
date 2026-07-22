/**
 * Implementação do Modal de Planejamento de Setores — Frontend
 * 
 * Mudanças:
 * 1. Adicionar state: propagarParaOS, propagacaoFeita
 * 2. Reescrever salvarDatasTagSetores para dois passos:
 *    a. Salvar datas na TAG
 *    b. Mostrar seção de propagação para OS (se tag tiver OS)
 * 3. Nova função: propagarDatasParaOS
 * 4. Atualizar modal HTML: adicionar seção de propagação após salvar
 */

const fs = require('fs');
const frontPath = 'frontend/src/pages/VisaoGeralProducao.tsx';
let content = fs.readFileSync(frontPath, 'utf8');

// ─── 1. Adicionar novos estados após tagSectorDates ────────────────────────────
const stateOld = `  // Estado para editar datas de setor da Tag
  const [tagSectorDates, setTagSectorDates] = useState<{ [key: string]: string }>({});`;

const stateNew = `  // Estado para editar datas de setor da Tag
  const [tagSectorDates, setTagSectorDates] = useState<{ [key: string]: string }>({});
  // Estado para propagação de datas para OS
  const [tagDatasStep, setTagDatasStep] = useState<'edit' | 'saved'>('edit');
  const [propagarOS, setPropagarlOS] = useState(false);
  const [propagacaoMsg, setPropagacaoMsg] = useState<string | null>(null);`;

content = content.replace(stateOld, stateNew);
if (!content.includes('tagDatasStep')) {
    console.error('[ERRO] State não inserido');
    process.exit(1);
}
console.log('[OK] States adicionados');

// ─── 2. Reescrever salvarDatasTagSetores ──────────────────────────────────────
const saveOld = `  const salvarDatasTagSetores = async () => {
  if (!selTag) return; setIsSaving(true); setMsg(null);
  try {
  // we will fire a promise.all for all changed fields via the existing endpoint
  const promises = [];
  for (const [field, isoVal] of Object.entries(tagSectorDates)) {
  const dataBr = isoToBr(isoVal);
  promises.push(
  fetch(\`\${API_BASE}/visao-geral/tag/\${selTag.IdTag}/setor-data\`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ field, value: dataBr })
  }).then(r => r.json())
  );
  }
  if (promises.length === 0) {
  setMsg({ ok: true, t: 'Nenhuma alteração feita.' });
  setTimeout(() => setActionModal(null), 1000);
  return;
  }
  await Promise.all(promises);
  // Re-fetch tags
  if (selProj) fetchTags(selProj.IdProjeto);
  setMsg({ ok: true, t: 'Datas atualizadas!' }); setTimeout(() => setActionModal(null), 1500);
  } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
  };`;

const saveNew = `  const salvarDatasTagSetores = async () => {
  if (!selTag) return; setIsSaving(true); setMsg(null); setPropagacaoMsg(null);
  try {
  const promises = [];
  for (const [field, isoVal] of Object.entries(tagSectorDates)) {
  const dataBr = isoToBr(isoVal) || (isoVal === '' ? '' : isoVal);
  promises.push(
  fetch(\`\${API_BASE}/visao-geral/tag/\${selTag.IdTag}/setor-data\`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ field, value: dataBr })
  }).then(r => r.json())
  );
  }
  if (promises.length === 0) {
  setMsg({ ok: true, t: 'Nenhuma alteração feita.' });
  setTimeout(() => setActionModal(null), 1000);
  return;
  }
  await Promise.all(promises);
  if (selProj) fetchTags(selProj.IdProjeto);
  // Avançar para etapa de propagação (se tag tem OS)
  const hasOS = selTag && parseInt(String(selTag.QtdeOS)) > 0;
  if (hasOS) {
  setTagDatasStep('saved');
  setMsg({ ok: true, t: 'Datas da TAG salvas! Deseja propagar para as Ordens de Serviço?' });
  } else {
  setMsg({ ok: true, t: 'Datas atualizadas com sucesso!' });
  setTimeout(() => setActionModal(null), 1500);
  }
  } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
  };

  const propagarDatasParaOS = async () => {
  if (!selTag) return;
  setIsSaving(true); setPropagacaoMsg(null);
  try {
  // Montar payload com setores que têm datas preenchidas
  const setores = TAG_SECTORS
  .filter(s => selTag[\`flag\${s.k}\` as keyof Tag] === 1)
  .map(s => {
  const piVal = isoToBr(tagSectorDates[s.fields.pi] || '') || tagSectorDates[s.fields.pi] || '';
  const pfVal = isoToBr(tagSectorDates[s.fields.pf] || '') || tagSectorDates[s.fields.pf] || '';
  return { sectorName: s.k, piField: s.fields.pi, pfField: s.fields.pf, piValue: piVal, pfValue: pfVal };
  })
  .filter(s => s.piValue || s.pfValue);

  if (!setores.length) {
  setPropagacaoMsg('Nenhuma data preenchida para propagar.');
  return;
  }

  const r = await (await fetch(\`\${API_BASE}/visao-geral/tag/\${selTag.IdTag}/propagar-datas-os\`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ setores })
  })).json();

  if (r.success) {
  setPropagacaoMsg(r.message || 'Datas propagadas com sucesso!');
  setTimeout(() => { setActionModal(null); setTagDatasStep('edit'); setPropagarlOS(false); }, 2000);
  } else {
  setPropagacaoMsg('Erro: ' + r.message);
  }
  } catch { setPropagacaoMsg('Erro de conexão ao propagar datas.'); } finally { setIsSaving(false); }
  };`;

if (content.includes(saveOld)) {
    content = content.replace(saveOld, saveNew);
    console.log('[OK] salvarDatasTagSetores reescrito');
} else {
    console.error('[ERRO] salvarDatasTagSetores não encontrado pelo texto exato');
    // Fallback: tentar match parcial
    const idx = content.indexOf('const salvarDatasTagSetores = async ()');
    const idxEnd = content.indexOf('\n  const salvarDatasBulkTags');
    if (idx > -1 && idxEnd > -1) {
        content = content.slice(0, idx) + saveNew + '\n\n' + content.slice(idxEnd);
        console.log('[OK] salvarDatasTagSetores substituído por fallback');
    }
}

// ─── 3. Atualizar o modal HTML: Seção de propagação + reset do step ao fechar ─
// Resetar tagDatasStep ao fechar o modal
const closeModalOld = `{actionModal === 'dateTagSetores' && (
 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
 <div className="bg-white rounded-md w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
 <div><h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={15} className="text-[#32423D]" /> Planejamento de Setores</h3><p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag?.Tag}</p></div>
 <button onClick={() => setActionModal(null)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
             <X size={14} /> Fechar
         </button>
 </div>`;

const closeModalNew = `{actionModal === 'dateTagSetores' && (
 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4">
 <div className="bg-white rounded-md w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
 <div><h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={15} className="text-[#32423D]" /> Planejamento de Setores</h3><p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag?.Tag}</p></div>
 <button onClick={() => { setActionModal(null); setTagDatasStep('edit'); setPropagarlOS(false); setPropagacaoMsg(null); }} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
             <X size={14} /> Fechar
         </button>
 </div>`;

if (content.includes(closeModalOld)) {
    content = content.replace(closeModalOld, closeModalNew);
    console.log('[OK] Botão fechar com reset de step');
} else {
    console.warn('[AVISO] closeModalOld não encontrado — continuando');
}

// ─── 4. Adicionar seção de propagação ao corpo do modal ──────────────────────
// Inserir APÓS a grid de setores (após </div>\n </div>\n\n e antes do footer)
const footerOld = ` <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 flex items-center justify-between">
 <span className="text-xs font-medium text-slate-500">Deixe em branco para limpar a data.</span>
 <div className="flex gap-3">
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center \${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
 <button onClick={salvarDatasTagSetores} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-[#32423D] hover:bg-[#32423D]/80 text-white shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Todos os Setores'}
 </button>
 </div>
 </div>`;

const footerNew = ` {/* Seção de Propagação para OS — aparece após salvar */}
 {tagDatasStep === 'saved' && selTag && parseInt(String(selTag.QtdeOS)) > 0 && (
 <div className="mx-5 mb-3 bg-blue-50 border border-blue-200 rounded-md p-4 flex flex-col gap-3">
 <div className="flex items-center gap-2">
 <CalendarDays size={16} className="text-blue-600 shrink-0" />
 <div>
 <p className="text-xs font-black text-blue-800">Propagar datas para Ordens de Serviço?</p>
 <p className="text-[10px] text-blue-600 mt-0.5">Esta TAG possui <strong>{selTag.QtdeOS} OS</strong>. Deseja aplicar as mesmas datas às OS e seus itens?</p>
 <p className="text-[10px] text-blue-500 mt-0.5">Somente itens com o recurso ativo (txt&#123;Recurso&#125;='1') serão atualizados.</p>
 </div>
 </div>
 {propagacaoMsg && (
 <div className={`text-xs font-bold px-3 py-1.5 rounded-md \${propagacaoMsg.startsWith('Erro') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{propagacaoMsg}</div>
 )}
 <div className="flex gap-2 justify-end">
 <button onClick={() => { setActionModal(null); setTagDatasStep('edit'); setPropagarlOS(false); }} className="px-4 py-1.5 rounded-md text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors">Não, apenas a Tag</button>
 <button onClick={propagarDatasParaOS} disabled={isSaving} className="px-5 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors">
 {isSaving ? <Loader size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Sim, propagar para OS</>}
 </button>
 </div>
 </div>
 )}

 <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 flex items-center justify-between">
 <span className="text-xs font-medium text-slate-500">{tagDatasStep === 'edit' ? 'Deixe em branco para limpar a data.' : '✓ Datas salvas na TAG.'}</span>
 <div className="flex gap-3">
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center \${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <button onClick={() => { setActionModal(null); setTagDatasStep('edit'); setPropagarlOS(false); setPropagacaoMsg(null); }} className="px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Fechar</button>
 {tagDatasStep === 'edit' && (
 <button onClick={salvarDatasTagSetores} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-[#32423D] hover:bg-[#32423D]/80 text-white shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Todos os Setores'}
 </button>
 )}
 </div>
 </div>`;

if (content.includes(footerOld)) {
    content = content.replace(footerOld, footerNew);
    console.log('[OK] Footer do modal atualizado com seção de propagação');
} else {
    console.error('[ERRO] Footer não encontrado — verificar manualmente');
}

fs.writeFileSync(frontPath, content, 'utf8');
console.log('\n✅ Frontend atualizado!');
