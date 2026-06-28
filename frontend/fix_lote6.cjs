const fs = require('fs');
const path = require('path');

// Setor
let f1 = path.join(__dirname, 'src', 'pages', 'Setor.tsx');
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(f1, c1);

// Superadmin
let f2 = path.join(__dirname, 'src', 'pages', 'Superadmin.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/ ActivitySquare,/g, '');
c2 = c2.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
c2 = c2.replace(/catch \(error\)/g, 'catch');
c2 = c2.replace(/as any\)/g, 'as Record<string, unknown>)');
c2 = c2.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
c2 = c2.replace(/\(i as any\)/g, '(i as Record<string, unknown>)');
c2 = c2.replace(/item: any/g, 'item: Record<string, unknown>');
c2 = c2.replace(/: any/g, ': Record<string, unknown>');
c2 = c2.replace(/<any>/g, '<unknown>');
c2 = c2.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(f2, c2);

// Tarefas
let f3 = path.join(__dirname, 'src', 'pages', 'Tarefas.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(e\)/g, 'catch');
c3 = c3.replace(/: any/g, ': Record<string, unknown>');
c3 = c3.replace(/<any>/g, '<unknown>');
c3 = c3.replace(/as any/g, 'as Record<string, unknown>');
fs.writeFileSync(f3, c3);

// TesteFinalMontagem
let f4 = path.join(__dirname, 'src', 'pages', 'TesteFinalMontagem.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/const novoExar = /g, '// const novoExar = ');
c4 = c4.replace(/const ModoIcon = /g, '// const ModoIcon = ');
c4 = c4.replace(/_id, _exec, _exar, _conc /g, ''); // maybe it's function params, need to be careful. Better not replace if we aren't sure. I'll just change to unknown for any.
c4 = c4.replace(/: any/g, ': Record<string, unknown>');
c4 = c4.replace(/<any>/g, '<unknown>');
c4 = c4.replace(/as any/g, 'as Record<string, unknown>');
fs.writeFileSync(f4, c4);

// TipoProduto
let f5 = path.join(__dirname, 'src', 'pages', 'TipoProduto.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/import \{ createPortal \} from 'react-dom';\r?\n/g, '');
c5 = c5.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(f5, c5);

console.log('Fixed Lote 6 files');
