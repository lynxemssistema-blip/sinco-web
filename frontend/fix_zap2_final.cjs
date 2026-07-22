const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Split into lines for targeted replacement
const lines = file.split('\n');

// Find line 1803 (0-indexed: 1802) which has "if ((Number(item.QtdeTotal)"
// and line 1804 has setSelectedItem(item), 1805 has setModalSetor
// Replace lines 1804-1814 (0-indexed 1803-1813) with the new body

// Find the specific block between lines 1803-1815
let found = false;
for (let i = 1800; i < 1820; i++) {
  const line = lines[i] || '';
  if (line.includes('setSelectedItem(item)') && (lines[i+1] || '').includes('setModalSetor(setorAtivo)')) {
    console.log('Found at line', i+1);
    // Remove lines i through i+11 (12 lines: setSelectedItem...finally)
    lines.splice(i, 12,
      '  setParcialItem(item);',
      '  setParcialRecurso(setorAtivo);',
      "  setQtdeParcial('');",
      '  setParcialModalOpen(true);'
    );
    found = true;
    console.log('✅ Second zap button fixed');
    break;
  }
}

if (!found) {
  // Show context around line 1804
  console.log('Lines 1802-1816:', lines.slice(1801, 1816).map((l, i) => `${1802+i}: ${l}`).join('\n'));
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', lines.join('\n'));
console.log('✅ File saved');
