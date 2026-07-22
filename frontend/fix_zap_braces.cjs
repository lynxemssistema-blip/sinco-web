const fs = require('fs');
let content = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');
const lines = content.split('\n');

// Fix occurrence 1: around line 1555 (0-indexed: 1554)
// Line 1552-1555 (0-indexed 1551-1554) has the new body, but missing }} and disabled
// The line after setParcialModalOpen(true); is className={...}
// We need to insert }} and disabled between them

function fixZapBlock(lines, searchFrom) {
  for (let i = searchFrom; i < searchFrom + 30; i++) {
    const line = (lines[i] || '').trimEnd();
    if (line.includes('setParcialModalOpen(true);')) {
      // Check next line
      const nextLine = (lines[i+1] || '').trimEnd();
      if (nextLine.includes('className={') && !nextLine.includes('}}')) {
        console.log(`Found broken block at line ${i+1}. Next: "${nextLine.substring(0, 50)}"`);
        // Insert }} and disabled before className
        lines.splice(i+1, 0, 
          '  }}',
          '  disabled={(Number(item.QtdeTotal) || 0) <= 0}'
        );
        console.log(`✅ Fixed at line ${i+1}`);
        return i + 3; // skip past inserted lines
      }
    }
  }
  return -1;
}

let next = fixZapBlock(lines, 1540);
if (next > 0) fixZapBlock(lines, next);

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', lines.join('\n'));
console.log('✅ File saved');
