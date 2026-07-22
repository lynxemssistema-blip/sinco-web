const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// Split into lines and do targeted replacement
const lines = file.split('\n');

// Find the "Apontamento Parcial" comment lines (there are 2 in the file - mapa view and list view)
const zapCommentIdxs = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Apontamento Parcial */}') || lines[i].includes('Apontamento Parcial */}\r')) {
    zapCommentIdxs.push(i);
  }
}
console.log('Zap comment lines:', zapCommentIdxs.map(i => i+1));

// For each zap block, replace the onClick body
for (const commentIdx of zapCommentIdxs) {
  // Find the setSelectedItem line within the next 20 lines
  for (let j = commentIdx; j < commentIdx + 20; j++) {
    if ((lines[j] || '').includes('setSelectedItem(item)') && (lines[j+1] || '').includes('setModalSetor(setorAtivo)')) {
      console.log('Found old zap body at line', j+1);
      // Replace lines j through j+12 (the full body)
      lines.splice(j, 13,
        '  setParcialItem(item);',
        '  setParcialRecurso(setorAtivo);',
        "  setQtdeParcial('');",
        '  setParcialModalOpen(true);'
      );
      console.log('✅ Replaced at line', j+1);
      break;
    }
  }
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', lines.join('\n'));
console.log('\n✅ File saved');
