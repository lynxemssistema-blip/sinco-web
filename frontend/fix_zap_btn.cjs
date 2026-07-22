const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Encontra a linha exata antes do botão Reposição
const search = '<div className="flex gap-0.5 border-l border-gray-200 pl-1">\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao(\'\');\r\n  setMotivoReposicao(\'\');\r\n  setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"\r\n  title="Reposição"\r\n  >';

const zapBtn = `<div className="flex gap-0.5 border-l border-gray-200 pl-1">
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
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItem(item);
 setQtdeReposicao('');
 setMotivoReposicao('');
 setReposicaoModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
 title="Reposição"
 >`;

if (file.includes(search)) {
  file = file.replace(search, zapBtn);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
  console.log('✅ Botão Zap inserido antes do Reposição');
} else {
  // Tentar match mais flexível
  const idx = file.indexOf('flex gap-0.5 border-l border-gray-200 pl-1');
  console.log('❌ Não encontrou o bloco exato. Posição do border-l:', idx);
  
  // Mostrar contexto
  if (idx >= 0) {
    console.log('Contexto:', JSON.stringify(file.substring(idx, idx + 300)));
  }
}
