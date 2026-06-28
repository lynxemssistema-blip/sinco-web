const fs = require('fs');
const path = require('path');

// Motorista
let f1 = path.join(__dirname, 'src', 'pages', 'Motorista.tsx');
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(f1, c1);

// PendenciaRomaneio
let f3 = path.join(__dirname, 'src', 'pages', 'PendenciaRomaneio.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(err\)/g, 'catch');
c3 = c3.replace(/const body: any =/g, 'const body: Record<string, unknown> =');
c3 = c3.replace(/as any\)/g, 'as Record<string, unknown>)');
c3 = c3.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
c3 = c3.replace(/item: any/g, 'item: Record<string, unknown>');
c3 = c3.replace(/const resData: any =/g, 'const resData: Record<string, unknown> =');
c3 = c3.replace(/headers: any/g, 'headers: Record<string, string>');
fs.writeFileSync(f3, c3);

// PesquisarDesenho
let f4 = path.join(__dirname, 'src', 'pages', 'PesquisarDesenho.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/catch \(e\)/g, 'catch');
c4 = c4.replace(/headers: any/g, 'headers: Record<string, string>');
fs.writeFileSync(f4, c4);

// PessoaJuridica
let f5 = path.join(__dirname, 'src', 'pages', 'PessoaJuridica.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/catch \(err\)/g, 'catch');
c5 = c5.replace(/import \{ createPortal \} from 'react-dom';\r?\n/g, '');
fs.writeFileSync(f5, c5);

console.log('Fixed Lote 4 files');
