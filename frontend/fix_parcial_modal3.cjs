const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// ── Fix 1: Update Zap buttons ─────────────────────────────────────────────────
// Find all "Apontamento Parcial" buttons - the ones that open the old modal
let countZap = 0;
// Signature unique to zap: opens modal in the old way
const sig1 = 'setParcialItem(item);\n  setParcialRecurso';
const sig2 = 'setSelectedItem(item);\n  setModalSetor(setorAtivo);\n  setModalOpen(true);\n  setLoadingDetails(true);\n  setQtdeApontar(\'\');\n  setConfirmingMapa(false);\n  fetch(`${API_BASE}/apontamento/item/${item.IdOrdemServicoItem}/${setorAtivo}`)\n  .then(r => r.json())\n  .then(json => { if (json.success) setItemDetails(json.data); })\n  .catch(console.error)\n  .finally(() => setLoadingDetails(false));';

if (file.includes(sig1)) {
  console.log('Zap already updated to parcialItem');
} else {
  while (file.includes(sig2)) {
    file = file.replace(sig2, 'setParcialItem(item);\n  setParcialRecurso(setorAtivo);\n  setQtdeParcial(\'\');\n  setParcialModalOpen(true);');
    countZap++;
  }
  console.log('Zap updated:', countZap, 'occurrences');
}

// ── Fix 2: Add parcial modal before pendencia modal ────────────────────────────
const anchor = ' {/* Modal de Gerar Pendência */}\r\n  <AnimatePresence>';
const idx = file.indexOf(anchor);
console.log('Modal anchor:', idx);

if (idx >= 0) {
  const parcialModal = ` {/* Modal de Apontamento Parcial (Excecao) */}\r\n  <AnimatePresence>\r\n  {parcialModalOpen && parcialItem && (\r\n  <motion.div\r\n  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}\r\n  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"\r\n  onClick={() => setParcialModalOpen(false)}\r\n  >\r\n  <motion.div\r\n  initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}\r\n  className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"\r\n  onClick={e => e.stopPropagation()}\r\n  >\r\n  <div className="bg-blue-600 px-4 py-3 text-white flex items-center justify-between">\r\n  <div className="flex items-center gap-2"><Zap size={20} />\r\n  <div><h2 className="font-bold text-sm">Apontamento Parcial</h2>\r\n  <p className="text-[10px] text-white/80">OS {parcialItem.IdOrdemServico} — Item #{parcialItem.IdOrdemServicoItem}</p></div>\r\n  </div>\r\n  <button onClick={() => setParcialModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"><X size={14} /></button>\r\n  </div>\r\n  <div className="p-5 space-y-4">\r\n  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">\r\n  <p className="font-black text-[#32423D]">{parcialItem.CodMatFabricante || '-'}</p>\r\n  <p className="text-gray-600 mt-0.5 truncate">{parcialItem.DescResumo || '-'}</p>\r\n  <div className="mt-2 flex items-center gap-2">\r\n  <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{parcialRecurso}</span>\r\n  <span className="text-gray-500 text-[10px]">Qt. Total: <strong>{parcialItem.QtdeTotal}</strong></span>\r\n  </div></div>\r\n  <div><label className="block text-xs font-bold text-gray-700 mb-1.5">Quantidade a Apontar</label>\r\n  <input type="number" min="1" max={parcialItem.QtdeTotal} value={qtdeParcial}\r\n  onChange={(e) => { let v = e.target.value; if (v !== '' && Number(v) > Number(parcialItem.QtdeTotal)) v = String(parcialItem.QtdeTotal); setQtdeParcial(v); }}\r\n  className="w-full px-3 py-2 text-2xl font-black text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"\r\n  placeholder="0" autoFocus />\r\n  <div className="flex gap-2 mt-2">\r\n  <button onClick={() => setQtdeParcial(String(parcialItem.QtdeTotal))} className="flex-1 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Total ({parcialItem.QtdeTotal})</button>\r\n  <button onClick={() => setQtdeParcial('1')} className="flex-1 py-1.5 text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Unid (1)</button>\r\n  </div></div></div>\r\n  <div className="px-5 py-3 bg-gray-50 flex gap-2 border-t">\r\n  <button onClick={() => setParcialModalOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm">Cancelar</button>\r\n  <button\r\n  disabled={submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0}\r\n  onClick={async () => {\r\n  if (!qtdeParcial || parseInt(qtdeParcial) <= 0) return;\r\n  setSubmittingParcial(true);\r\n  try {\r\n  const resp = await fetch(\`\${API_BASE}/apontamento-parcial\`, {\r\n  method: 'POST', headers: { 'Content-Type': 'application/json' },\r\n  body: JSON.stringify({ IdOrdemServicoItem: parcialItem.IdOrdemServicoItem, IdOrdemServico: parcialItem.IdOrdemServico, Processo: parcialRecurso, QtdeProduzida: parseInt(qtdeParcial), CriadoPor: (user as any)?.NomeCompleto || (user as any)?.name || 'Sistema' })\r\n  });\r\n  const json = await resp.json();\r\n  if (json.success) { addToast({ type: 'success', title: 'Sucesso', message: 'Apontamento parcial registrado!' }); setParcialModalOpen(false); }\r\n  else { addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao registrar' }); }\r\n  } catch { addToast({ type: 'error', title: 'Erro', message: 'Erro de conexao' }); }\r\n  finally { setSubmittingParcial(false); }\r\n  }}\r\n  className={\`flex-1 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-2 text-sm transition-colors \${submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}\`}\r\n  >\r\n  {submittingParcial ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : <><Zap size={14} /> Confirmar Parcial</>}\r\n  </button></div>\r\n  </motion.div>\r\n  </motion.div>\r\n  )}\r\n  </AnimatePresence>\r\n\r\n`;

  file = file.substring(0, idx) + parcialModal + file.substring(idx);
  console.log('✅ Parcial modal inserted');
} else {
  // Try without CRLF
  const idx2 = file.indexOf('{/* Modal de Gerar Pendência */}');
  if (idx2 >= 0) {
    console.log('Found at idx2:', idx2, '| char before:', JSON.stringify(file.substring(idx2-5, idx2+5)));
  }
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
console.log('\n✅ File saved');
