const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages';

// Fix root containers using 'flex flex-col h-full' - replace with 'flex flex-col flex-1 min-h-0'
// These are root page containers that need flex-1 instead of h-full now that the parent is flex column
const targets = [
  { file: 'AcompanhamentoGeral.tsx', line: 304 },
  { file: 'ControleExpedicao.tsx', line: 302 },
  { file: 'RomaneioRetorno.tsx', line: 129 },
  { file: 'Tarefas.tsx', line: 288 },
  { file: 'VisaoGeralPendencias.tsx', line: 157 },
  { file: 'VisaoGeralProducao.tsx', line: 561 },
];

targets.forEach(({ file, line }) => {
  const fp = path.join(pagesDir, file);
  if (!fs.existsSync(fp)) { console.log('NOT FOUND:', file); return; }
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  const idx = line - 1;
  const original = lines[idx];
  
  // Replace h-full with flex-1 min-h-0 in the class string
  const fixed = original.replace(/\bh-full\b/, 'flex-1 min-h-0');
  
  if (fixed !== original) {
    lines[idx] = fixed;
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    console.log(`FIXED ${file}:${line} - h-full -> flex-1 min-h-0`);
  } else {
    console.log(`NO CHANGE ${file}:${line} |`, original.trim().substring(0, 80));
  }
});

console.log('Done.');
