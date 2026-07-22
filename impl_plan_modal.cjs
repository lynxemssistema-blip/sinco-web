const fs = require('fs');
const path = 'frontend/src/pages/VisaoGeralProducao.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Linhas 1642-1654 (0-indexed: 1641-1653) = footer do modal dateTagSetores
// Substituir pelo novo footer + seção de propagação

const oldLines = lines.slice(1642, 1654); // [1643..1654] (1-indexed)
console.log('Linhas a substituir:');
oldLines.forEach((l, i) => console.log(`[${i+1643}]: ${l}`));

const newFooterLines = [
'',
' {/* Seção de Propagação para OS — aparece após salvar TAG */}',
" {tagDatasStep === 'saved' && selTag && parseInt(String(selTag.QtdeOS)) > 0 && (",
' <div className="mx-5 mb-3 bg-blue-50 border border-blue-200 rounded-md p-4 flex flex-col gap-3">',
' <div className="flex items-start gap-3">',
' <CalendarDays size={18} className="text-blue-600 shrink-0 mt-0.5" />',
' <div className="flex-1">',
' <p className="text-xs font-black text-blue-800">Propagar datas para Ordens de Serviço?</p>',
" <p className=\"text-[10px] text-blue-600 mt-0.5\">Esta TAG possui <strong>{selTag.QtdeOS} OS</strong>. Deseja aplicar as mesmas datas planejadas às OS e seus itens?</p>",
" <p className=\"text-[10px] text-blue-400 mt-0.5\">Somente itens com o recurso ativo (txt{'{'Recurso'}='1') serão atualizados.</p>",
' </div>',
' </div>',
' {propagacaoMsg && (',
' <div className={`text-xs font-bold px-3 py-1.5 rounded-md ${propagacaoMsg.startsWith(\'Erro\') ? \'bg-red-100 text-red-700\' : \'bg-emerald-100 text-emerald-700\'}`}>{propagacaoMsg}</div>',
' )}',
' <div className="flex gap-2 justify-end">',
" <button onClick={() => { setActionModal(null); setTagDatasStep('edit'); setPropagacaoMsg(null); }} className=\"px-4 py-1.5 rounded-md text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors\">Não, apenas a Tag</button>",
' <button onClick={propagarDatasParaOS} disabled={isSaving} className="px-5 py-1.5 rounded-md text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors">',
' {isSaving ? <Loader size={12} className="animate-spin" /> : <><CheckCircle size={12} /> Sim, propagar para OS</>}',
' </button>',
' </div>',
' </div>',
' )}',
'',
' <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 flex items-center justify-between">',
" <span className=\"text-xs font-medium text-slate-500\">{tagDatasStep === 'edit' ? 'Deixe em branco para limpar a data.' : '✓ Datas salvas na TAG.'}</span>",
' <div className="flex gap-3">',
" {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}",
" <button onClick={() => { setActionModal(null); setTagDatasStep('edit'); setPropagacaoMsg(null); }} className=\"px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors\">Fechar</button>",
" {tagDatasStep === 'edit' && (",
' <button onClick={salvarDatasTagSetores} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-[#32423D] hover:bg-[#32423D]/80 text-white shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">',
" {isSaving ? <Loader className=\"animate-spin\" size={14} /> : 'Salvar Todos os Setores'}",
' </button>',
' )}',
' </div>',
' </div>'
];

lines.splice(1642, 12, ...newFooterLines);
console.log('[OK] Footer do modal substituído com seção de propagação');

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('✅ Modal HTML atualizado');
