const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

const anchor = 'flex gap-0.5 border-l border-gray-200 pl-1';

// Localizar SEGUNDA ocorrência
const first = file.indexOf(anchor);
const second = file.indexOf(anchor, first + 1);
console.log('Second occurrence at:', second);

if (second >= 0) {
  // Localizar o ">" de fechamento do div
  const divEnd = file.indexOf('>', second) + 1;
  const afterDiv = file.substring(divEnd, divEnd + 2);
  const eol = afterDiv.includes('\r') ? '\r\n' : '\n';
  
  const zapBlock = `\n {/* Apontamento Parcial */}\n <button\n onClick={(e) => {\n e.stopPropagation();\n if ((Number(item.QtdeTotal) || 0) <= 0) return;\n setSelectedItem(item);\n setModalSetor(setorAtivo);\n setModalOpen(true);\n setLoadingDetails(true);\n setQtdeApontar('');\n setConfirmingMapa(false);\n fetch(\`\${API_BASE}/apontamento/item/\${item.IdOrdemServicoItem}/\${setorAtivo}\`)\n .then(r => r.json())\n .then(json => { if (json.success) setItemDetails(json.data); })\n .catch(console.error)\n .finally(() => setLoadingDetails(false));\n }}\n disabled={(Number(item.QtdeTotal) || 0) <= 0}\n className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${\n (Number(item.QtdeTotal) || 0) <= 0\n ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'\n : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'\n }\`}\n title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}\n >\n <Zap size={12} />\n </button>`;

  file = file.substring(0, divEnd) + zapBlock + file.substring(divEnd);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
  console.log('✅ Zap inserted into list view');
} else {
  console.log('❌ Second occurrence not found');
}
