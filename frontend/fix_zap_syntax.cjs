const fs = require('fs');
let content = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', 'utf8');

// The broken block at ~line 1547 - fix by replacing the broken button section
// Old broken: missing }} and disabled after setParcialModalOpen(true);
const broken1 = ` setParcialItem(item);\n   setParcialRecurso(setorAtivo);\n   setQtdeParcial('');\n   setParcialModalOpen(true);\n  className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${`;

const fixed1 = `  setParcialItem(item);\r\n  setParcialRecurso(setorAtivo);\r\n  setQtdeParcial('');\r\n  setParcialModalOpen(true);\r\n  }}\r\n  disabled={(Number(item.QtdeTotal) || 0) <= 0}\r\n  className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${`;

if (content.includes(broken1)) {
  content = content.replace(broken1, fixed1);
  console.log('✅ First broken zap fixed');
} else {
  console.log('❌ First broken pattern not found, trying alternate...');
  // Show actual context
  const idx = content.indexOf('setParcialModalOpen(true);\n  className');
  if (idx >= 0) {
    console.log('Found at:', idx, JSON.stringify(content.substring(idx-30, idx+120)));
  }
}

// Also check the second occurrence (list view)
const broken2 = ` setParcialItem(item);\n   setParcialRecurso(setorAtivo);\n   setQtdeParcial('');\n   setParcialModalOpen(true);\n  className={\`flex items-center justify-center w-6 h-6 rounded transition-colors border \${`;

// They might be identical, already done above via replace (which replaces first occurrence)
// Check if still present
if (content.includes(broken1) || content.includes('setParcialModalOpen(true);\n  className')) {
  console.log('Second one still needs fixing');
  content = content.replace(broken1, fixed1);
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx', content);
console.log('✅ File saved');
