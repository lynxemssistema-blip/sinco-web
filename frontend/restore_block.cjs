const fs = require('fs');
const cp = require('child_process');

try {
  // get old file content from git
  const oldContent = cp.execSync('git show HEAD:frontend/src/pages/MontaPecaManufaturada.tsx').toString('utf8');
  const lines = oldContent.split(/\r?\n/);
  
  // extract from line 674 to 743 (0-indexed) which are lines 675 to 744 in 1-indexed.
  // Actually let's just find the start and end of the block in the array!
  const startIdx = lines.findIndex(l => l.includes('BASE: TABELA DE PROCESSOS'));
  const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('BOTÃO SALVAR PROCESSOS'));
  
  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find block boundaries in old file', startIdx, endIdx);
    process.exit(1);
  }
  
  console.log(`Found block in old file from line ${startIdx} to ${endIdx}`);
  const missingLines = lines.slice(startIdx, endIdx).join('\n');
  
  let currentContent = fs.readFileSync('src/pages/MontaPecaManufaturada.tsx', 'utf8');
  
  const targetReplace = '            ========================================= */}\r\n        \r\n          <div className="flex flex-col';
  const targetReplace2 = '            ========================================= */}\n        \n          <div className="flex flex-col';
  
  let success = false;
  
  const replacement = missingLines + '\n        </div>\n\n        {/* =========================================\n            GRID 3: INCLUSÃO DE NOVOS MATERIAIS\n            ========================================= */}\n        \n          <div className="flex flex-col';
  
  if (currentContent.includes(targetReplace)) {
    currentContent = currentContent.replace(targetReplace, replacement);
    success = true;
  } else if (currentContent.includes(targetReplace2)) {
    currentContent = currentContent.replace(targetReplace2, replacement);
    success = true;
  }
  
  if (success) {
    fs.writeFileSync('src/pages/MontaPecaManufaturada.tsx', currentContent);
    console.log('Successfully patched file!');
  } else {
    console.log('Failed to find replace target in current file');
  }
} catch(e) {
  console.error(e);
}
