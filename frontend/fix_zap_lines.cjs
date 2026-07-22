const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Split by lines, insert before the reposicao button block
const lines = file.split('\n');

// Find the line with the Reposição div (border-l)
// Procurar setReposicaoModalOpen(true) no contexto correto
let reposicaoLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setReposicaoModalOpen(true)')) {
    // Confirm it's the right one by checking a few lines before
    const prevLines = lines.slice(Math.max(0, i-6), i).join('\n');
    if (prevLines.includes('setQtdeReposicao') && prevLines.includes('border-l')) {
      // Find the start of the <div className="flex gap-0.5 border-l...">
      for (let j = i-1; j >= Math.max(0, i-10); j--) {
        if (lines[j].includes('flex gap-0.5 border-l border-gray-200 pl-1')) {
          reposicaoLineIdx = j;
          break;
        }
      }
      break;
    }
  }
}

console.log('Reposição div line:', reposicaoLineIdx + 1);

if (reposicaoLineIdx >= 0) {
  const zapButtonLines = [
    ` {/* Apontamento Parcial */}`,
    ` <button`,
    `  onClick={(e) => {`,
    `  e.stopPropagation();`,
    `  if ((Number(item.QtdeTotal) || 0) <= 0) return;`,
    `  setSelectedItem(item);`,
    `  setModalSetor(setorAtivo);`,
    `  setModalOpen(true);`,
    `  setLoadingDetails(true);`,
    `  setQtdeApontar('');`,
    `  setConfirmingMapa(false);`,
    "  fetch(`${API_BASE}/apontamento/item/${item.IdOrdemServicoItem}/${setorAtivo}`)",
    `  .then(r => r.json())`,
    `  .then(json => { if (json.success) setItemDetails(json.data); })`,
    `  .catch(console.error)`,
    `  .finally(() => setLoadingDetails(false));`,
    `  }}`,
    "  disabled={(Number(item.QtdeTotal) || 0) <= 0}",
    "  className={`flex items-center justify-center w-6 h-6 rounded transition-colors border ${",
    "  (Number(item.QtdeTotal) || 0) <= 0",
    "  ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'",
    "  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'",
    "  }`}",
    "  title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}",
    `  >`,
    `  <Zap size={12} />`,
    `  </button>`,
  ];

  // Insert after the div opening line (which is reposicaoLineIdx)
  lines.splice(reposicaoLineIdx + 1, 0, ...zapButtonLines);
  
  const result = lines.join('\n');
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', result);
  console.log('✅ Zap button inserted after line', reposicaoLineIdx + 1);
} else {
  console.log('❌ Could not find the Reposição div');
}
