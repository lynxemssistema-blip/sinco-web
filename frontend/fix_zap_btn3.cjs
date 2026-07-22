const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Usar substituição por índice — localizar o padrão e fazer a inserção
const anchor = 'flex gap-0.5 border-l border-gray-200 pl-1">\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao(\'\');\r\n  setMotivoReposicao(\'\');\r\n  setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"\r\n  title="Reposição"\r\n  >';

const idx = file.indexOf(anchor);
if (idx >= 0) {
  const insertion = `flex gap-0.5 border-l border-gray-200 pl-1">
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
 <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao('');\r\n  setMotivoReposicao('');\r\n  setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"\r\n  title="Reposição"\r\n  >`;
  file = file.substring(0, idx) + insertion + file.substring(idx + anchor.length);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
  console.log('✅ Zap button inserted successfully');
} else {
  // Mostrar trecho real para depurar
  const idx2 = file.indexOf('setReposicaoModalOpen(true)');
  if (idx2 >= 0) {
    console.log('Contexto real ao redor de setReposicaoModalOpen:');
    console.log(JSON.stringify(file.substring(idx2 - 300, idx2 + 200)));
  } else {
    console.log('❌ setReposicaoModalOpen também não encontrado');
  }
}
