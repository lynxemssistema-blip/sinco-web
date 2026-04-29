const fs = require('fs');
const path = require('path');
const pagesDir = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages';

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
let totalFixes = 0;

// Simple string replacements for known patterns per file
const replacements = [
  // CadastroUsuario root container
  { file: 'CadastroUsuario.tsx', from: 'flex flex-col h-[calc(100vh-4rem)] bg-slate-50 p-3 gap-2 overflow-hidden', to: 'flex flex-col flex-1 min-h-0 bg-slate-50 p-3 gap-2' },
];

// Generic: fix any root page container "flex flex-col h-full ... overflow-hidden"
files.forEach(file => {
  const fp = path.join(pagesDir, file);
  let c = fs.readFileSync(fp, 'utf8');
  let orig = c;

  // Replace the specific calc-height pattern
  c = c.replace(/className="flex flex-col h-\[calc\(100vh[^\]]+\]\s+([^"]*?)overflow-hidden([^"]*?)"/g, (m, pre, post) => {
    return `className="flex flex-col flex-1 min-h-0 ${(pre + post).trim().replace(/\s+/g, ' ')}"`;
  });

  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    totalFixes++;
    console.log('Fixed calc-height:', file);
    orig = c;
  }
});

// Apply explicit replacements
replacements.forEach(({ file, from, to }) => {
  const fp = path.join(pagesDir, file);
  if (!fs.existsSync(fp)) { console.log('NOT FOUND:', file); return; }
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes(from)) {
    fs.writeFileSync(fp, c.replace(from, to), 'utf8');
    totalFixes++;
    console.log('Fixed explicit:', file);
  }
});

console.log('Done. Total fixes:', totalFixes);
