const fs = require('fs');
let content = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');
const lines = content.split('\n');

// Fix the second block around line 1809 (0-indexed 1808)
// "setParcialModalOpen(true);" followed directly by "disabled=" (missing }})
for (let i = 1800; i < 1820; i++) {
  const line = (lines[i] || '').trimEnd();
  if (line.includes('setParcialModalOpen(true);')) {
    const nextLine = (lines[i+1] || '').trimEnd();
    if (nextLine.includes('disabled=') && !nextLine.includes('}}')) {
      console.log(`Found broken block at line ${i+1}. Next: "${nextLine.substring(0, 50)}"`);
      lines.splice(i+1, 0, '  }}');
      console.log('✅ Fixed: inserted }} at line', i+2);
      break;
    } else if (!nextLine.includes('}}')) {
      console.log(`Line ${i+1}: next="${nextLine.substring(0, 80)}"`);
    }
  }
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', lines.join('\n'));
console.log('✅ File saved');
