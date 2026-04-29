const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages';

// For each page: 
// 1. Replace the root container class with 'page-root' utility (or add to existing)
// 2. Replace the table scroll wrapper from 'flex-1 overflow-auto custom-scrollbar' to 'table-container'

const pagePatterns = [
  // ListaReposicao
  { file: 'ListaReposicao.tsx',
    tableWrapper: 'flex-1 overflow-auto custom-scrollbar' },
  // PesquisarDesenho  
  { file: 'PesquisarDesenho.tsx',
    tableWrapper: 'flex-1 overflow-auto custom-scrollbar relative' },
  // RomaneioRetorno
  { file: 'RomaneioRetorno.tsx', 
    tableWrapper: 'flex-1 overflow-auto custom-scrollbar' },
  // Tarefas
  { file: 'Tarefas.tsx',
    tableWrapper: 'flex-1 overflow-auto custom-scrollbar' },
];

let total = 0;
pagePatterns.forEach(({ file, tableWrapper }) => {
  const fp = path.join(pagesDir, file);
  if (!fs.existsSync(fp)) { console.log('NOT FOUND:', file); return; }
  let c = fs.readFileSync(fp, 'utf8');
  let orig = c;
  
  if (tableWrapper && c.includes(tableWrapper)) {
    c = c.replace(tableWrapper, 'table-container');
    console.log('Fixed table wrapper in:', file);
  } else if (tableWrapper) {
    console.log('Table wrapper NOT FOUND in:', file, '|', tableWrapper);
  }
  
  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    total++;
  }
});

// Also fix ControleExpedicao which uses a different pattern
const ctrlFile = path.join(pagesDir, 'ControleExpedicao.tsx');
let c = fs.readFileSync(ctrlFile, 'utf8');
let orig = c;
c = c.replace(/className="flex-1 overflow-auto custom-scrollbar"/g, 'className="table-container"');
if (c !== orig) { fs.writeFileSync(ctrlFile, c, 'utf8'); console.log('Fixed ControleExpedicao'); total++; }

console.log('Done. Total files modified:', total);
