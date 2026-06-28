const fs = require('fs');
const path = require('path');

// Setor
let f1 = path.join(__dirname, 'src', 'pages', 'Setor.tsx');
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/const inputOptional = /g, '// const inputOptional = ');
fs.writeFileSync(f1, c1);

// Superadmin
let f2 = path.join(__dirname, 'src', 'pages', 'Superadmin.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
c2 = c2.replace(/s\.has\(idx\) \? s\.delete\(idx\) : s\.add\(idx\);/g, 'if (s.has(idx)) { s.delete(idx); } else { s.add(idx); }');
fs.writeFileSync(f2, c2);

// Tarefas
let f3 = path.join(__dirname, 'src', 'pages', 'Tarefas.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
fs.writeFileSync(f3, c3);

// TesteFinalMontagem
let f4 = path.join(__dirname, 'src', 'pages', 'TesteFinalMontagem.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/const handleLancamentoSucesso = \([^)]*\) =>/g, 'const handleLancamentoSucesso = () =>');
fs.writeFileSync(f4, c4);

console.log('Fixed Lote 6 files - pass 2');
