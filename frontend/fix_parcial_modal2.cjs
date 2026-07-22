const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// ── 1. Add state after submittingReposicao ──────────────────────────────────────
const stateAnchor = 'const [submittingReposicao, setSubmittingReposicao] = useState(false);';
const stateIdx = file.indexOf(stateAnchor);
console.log('State anchor:', stateIdx);

if (stateIdx >= 0) {
  const after = file.indexOf('\r\n', stateIdx + stateAnchor.length) + 2; // skip to next line
  const newStates = ` const [parcialModalOpen, setParcialModalOpen] = useState(false);\r\n const [parcialItem, setParcialItem] = useState<any>(null);\r\n const [qtdeParcial, setQtdeParcial] = useState('');\r\n const [submittingParcial, setSubmittingParcial] = useState(false);\r\n const [parcialRecurso, setParcialRecurso] = useState('');\r\n`;
  file = file.substring(0, after) + newStates + file.substring(after);
  console.log('✅ States added');
} else {
  console.log('❌ State anchor not found');
}

// ── 2. Update Zap buttons (all occurrences via unique signature) ─────────────────
// The unique string: "if ((Number(item.QtdeTotal) || 0) <= 0) return;\n  setSelectedItem(item);\n  setModalSetor(setorAtivo);\n  setModalOpen(true);"
const zapSignature = 'if ((Number(item.QtdeTotal) || 0) <= 0) return;\n  setSelectedItem(item);\n  setModalSetor(setorAtivo);\n  setModalOpen(true);';
const zapReplacement = 'if ((Number(item.QtdeTotal) || 0) <= 0) return;\n  setParcialItem(item);\n  setParcialRecurso(setorAtivo);\n  setQtdeParcial(\'\');\n  setParcialModalOpen(true);';

let countZap = 0;
while (file.includes(zapSignature)) {
  file = file.replace(zapSignature, zapReplacement);
  countZap++;
}
console.log('✅ Zap buttons updated:', countZap);

// ── 3. Add parcial modal before pendencia modal ────────────────────────────────
const modalAnchor = '  {/* Modal de Gerar Pend';
const modalIdx = file.indexOf(modalAnchor);
console.log('Modal anchor:', modalIdx);

const parcialModal = `  {/* Modal de Apontamento Parcial (Excecao) */}
  <AnimatePresence>
  {parcialModalOpen && parcialItem && (
  <motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
  onClick={() => setParcialModalOpen(false)}
  >
  <motion.div
  initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
  className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
  onClick={e => e.stopPropagation()}
  >
  <div className="bg-blue-600 px-4 py-3 text-white flex items-center justify-between">
  <div className="flex items-center gap-2">
  <Zap size={20} />
  <div>
  <h2 className="font-bold text-sm">Apontamento Parcial</h2>
  <p className="text-[10px] text-white/80">OS {parcialItem.IdOrdemServico} — Item #{parcialItem.IdOrdemServicoItem}</p>
  </div>
  </div>
  <button onClick={() => setParcialModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"><X size={14} /></button>
  </div>
  <div className="p-5 space-y-4">
  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
  <p className="font-black text-[#32423D]">{parcialItem.CodMatFabricante || '-'}</p>
  <p className="text-gray-600 mt-0.5 truncate">{parcialItem.DescResumo || '-'}</p>
  <div className="mt-2 flex items-center gap-2">
  <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{parcialRecurso}</span>
  <span className="text-gray-500">Qt. Total: <strong>{parcialItem.QtdeTotal}</strong></span>
  </div>
  </div>
  <div>
  <label className="block text-xs font-bold text-gray-700 mb-1.5">Quantidade a Apontar</label>
  <input
  type="number" min="1" max={parcialItem.QtdeTotal}
  value={qtdeParcial}
  onChange={(e) => { let v = e.target.value; if (v !== '' && Number(v) > Number(parcialItem.QtdeTotal)) v = String(parcialItem.QtdeTotal); setQtdeParcial(v); }}
  className="w-full px-3 py-2 text-2xl font-black text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
  placeholder="0" autoFocus
  />
  <div className="flex gap-2 mt-2">
  <button onClick={() => setQtdeParcial(String(parcialItem.QtdeTotal))} className="flex-1 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Total ({parcialItem.QtdeTotal})</button>
  <button onClick={() => setQtdeParcial('1')} className="flex-1 py-1.5 text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Unid (1)</button>
  </div>
  </div>
  </div>
  <div className="px-5 py-3 bg-gray-50 flex gap-2 border-t">
  <button onClick={() => setParcialModalOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm">Cancelar</button>
  <button
  disabled={submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0}
  onClick={async () => {
  if (!qtdeParcial || parseInt(qtdeParcial) <= 0) return;
  setSubmittingParcial(true);
  try {
  const resp = await fetch(\`\${API_BASE}/apontamento-parcial\`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ IdOrdemServicoItem: parcialItem.IdOrdemServicoItem, IdOrdemServico: parcialItem.IdOrdemServico, Processo: parcialRecurso, QtdeProduzida: parseInt(qtdeParcial), CriadoPor: (user as any)?.NomeCompleto || (user as any)?.name || 'Sistema' })
  });
  const json = await resp.json();
  if (json.success) { addToast({ type: 'success', title: 'Sucesso', message: 'Apontamento parcial registrado!' }); setParcialModalOpen(false); }
  else { addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao registrar' }); }
  } catch { addToast({ type: 'error', title: 'Erro', message: 'Erro de conexao' }); }
  finally { setSubmittingParcial(false); }
  }}
  className={\`flex-1 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-2 text-sm transition-colors \${submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}\`}
  >
  {submittingParcial ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : <><Zap size={14} /> Confirmar Parcial</>}
  </button>
  </div>
  </motion.div>
  </motion.div>
  )}
  </AnimatePresence>

`;

if (modalIdx >= 0) {
  file = file.substring(0, modalIdx) + parcialModal + file.substring(modalIdx);
  console.log('✅ Parcial modal inserted');
} else {
  console.log('❌ Parcial modal anchor not found');
  // Try alternate
  const idx2 = file.indexOf('Modal de Gerar Pend');
  console.log('Alternate:', idx2, JSON.stringify(file.substring(idx2 - 5, idx2 + 30)));
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
console.log('\n✅ File saved');
