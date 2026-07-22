const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Find the exact occurrence
const searchStr = 'flex gap-0.5 border-l border-gray-200 pl-1">\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao(\'\');\r\n  setMotivoReposicao(\'\');';

const replaceStr = `flex gap-0.5 border-l border-gray-200 pl-1">
 {/* Apontamento Parcial */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 if ((Number(item.QtdeTotal) || 0) <= 0) return;
 setSelectedItem(item);
 setModalSetor(setorAtivo);
 setModalOpen(true);
 setLoadingDetails(true);
 setQtdeApontar('');
 setConfirmingMapa(false);
 fetch(\`\${API_BASE}/apontamento/item/\${item.IdOrdemServicoItem}/\${setorAtivo}\`)
 .then(r => r.json())
 .then(json => { if (json.success) setItemDetails(json.data); })
 .catch(console.error)
 .finally(() => setLoadingDetails(false));
 }}
 disabled={(Number(item.QtdeTotal) || 0) <= 0}
 className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${
 (Number(item.QtdeTotal) || 0) <= 0
 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
 : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
 }\`}
 title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}
 >
 <Zap size={12} />
 </button>
 <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao('');\r\n  setMotivoReposicao('');`;

if (file.includes(searchStr)) {
  file = file.replace(searchStr, replaceStr);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
  console.log('✅ Zap button inserted');
} else {
  console.log('❌ Not found. Trying simplified search...');
  // Try with just part of the string
  const idx = file.indexOf('flex gap-0.5 border-l border-gray-200 pl-1');
  if (idx >= 0) {
    const snippet = file.substring(idx, idx + 400);
    console.log('Snippet:', JSON.stringify(snippet));
  }
}
