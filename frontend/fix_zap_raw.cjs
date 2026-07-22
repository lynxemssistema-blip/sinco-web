const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Anchor exato - usar o que está visível no raw content acima
const anchor = ' <div className="flex gap-0.5 border-l border-gray-200 pl-1">\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao(\'\');\r\n  setMotivoReposicao(\'\');\r\n  setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50';

const idx = file.indexOf(anchor);
console.log('Anchor idx:', idx);

if (idx >= 0) {
  const zapSection = ` {/* Apontamento Parcial */}\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  if ((Number(item.QtdeTotal) || 0) <= 0) return;\r\n  setSelectedItem(item);\r\n  setModalSetor(setorAtivo);\r\n  setModalOpen(true);\r\n  setLoadingDetails(true);\r\n  setQtdeApontar('');\r\n  setConfirmingMapa(false);\r\n  fetch(\`\${API_BASE}/apontamento/item/\${item.IdOrdemServicoItem}/\${setorAtivo}\`)\r\n  .then(r => r.json())\r\n  .then(json => { if (json.success) setItemDetails(json.data); })\r\n  .catch(console.error)\r\n  .finally(() => setLoadingDetails(false));\r\n  }}\r\n  disabled={(Number(item.QtdeTotal) || 0) <= 0}\r\n  className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${\r\n  (Number(item.QtdeTotal) || 0) <= 0\r\n  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'\r\n  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'\r\n  }\`}\r\n  title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}\r\n  >\r\n  <Zap size={12} />\r\n  </button>\r\n`;

  // Insert after the opening div line
  const insertAfter = ' <div className="flex gap-0.5 border-l border-gray-200 pl-1">\r\n';
  const insertIdx = file.indexOf(insertAfter, idx);
  
  if (insertIdx >= 0) {
    file = file.substring(0, insertIdx + insertAfter.length) + zapSection + file.substring(insertIdx + insertAfter.length);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', file);
    console.log('✅ Zap button inserted!');
  } else {
    console.log('❌ Could not find insertAfter');
  }
} else {
  // Mostrar os primeiros 50 chars do que temos
  const testIdx = file.indexOf('flex gap-0.5 border-l border-gray-200 pl-1');
  if (testIdx >= 0) {
    const snippet = file.substring(testIdx - 5, testIdx + 300);
    // Mostrar bytes
    console.log('Snippet bytes:');
    for (let i = 0; i < Math.min(snippet.length, 50); i++) {
      process.stdout.write(snippet.charCodeAt(i) + ' ');
    }
    console.log();
  }
}
