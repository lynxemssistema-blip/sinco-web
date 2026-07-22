const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Find the actual string using the exact chars from the debug output
const anchor = 'flex gap-0.5 border-l border-gray-200 pl-1">\r\n  <button\r\n  onClick={(e) => {\r\n  e.stopPropagation();\r\n  setSelectedItem(item);\r\n  setQtdeReposicao(\'\');\r\n  setMotivoReposicao(\'\');\r\n  setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"\r\n  title="Reposi';

const idx = file.indexOf(anchor);
console.log('Anchor found at:', idx);

if (idx >= 0) {
  // What comes after anchor to find the full closing >
  const afterAnchor = file.substring(idx + anchor.length, idx + anchor.length + 100);
  console.log('After anchor:', JSON.stringify(afterAnchor));
} else {
  // Try just the key unique part
  const idx2 = file.indexOf('setReposicaoModalOpen(true);\r\n  }}\r\n  className="flex items-center justify-center w-6 h-6 bg-amber-50');
  console.log('Alt search idx:', idx2);
}
