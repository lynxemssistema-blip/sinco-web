const fs = require('fs');
const path = require('path');

// PlanejamentoProducao
let f1 = path.join(__dirname, 'src', 'pages', 'PlanejamentoProducao.tsx');
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(f1, c1);

// ProducaoPlanoCorte
let f2 = path.join(__dirname, 'src', 'pages', 'ProducaoPlanoCorte.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/catch \(e\)\{\}/g, 'catch { /* ignore */ }');
c2 = c2.replace(/catch \(e\)/g, 'catch');
c2 = c2.replace(/: any/g, ': Record<string, unknown>');
c2 = c2.replace(/<any>/g, '<unknown>');
fs.writeFileSync(f2, c2);

// Projeto
let f3 = path.join(__dirname, 'src', 'pages', 'Projeto.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(e\)\{\}/g, 'catch { /* ignore */ }');
c3 = c3.replace(/catch \(e\) \{\}/g, 'catch { /* ignore */ }');
c3 = c3.replace(/: any/g, ': Record<string, unknown>');
c3 = c3.replace(/<any>/g, '<unknown>');
fs.writeFileSync(f3, c3);

// Romaneio
let f4 = path.join(__dirname, 'src', 'pages', 'Romaneio.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/export default function RomaneioPage\(\{ \}: RomaneioPageProps\) \{/g, 'export default function RomaneioPage() {');
c4 = c4.replace(/: any\)/g, ': Record<string, unknown>)');
c4 = c4.replace(/<any>/g, '<unknown>');
c4 = c4.replace(/: any/g, ': Record<string, unknown>');
fs.writeFileSync(f4, c4);

// RomaneioRetorno
let f5 = path.join(__dirname, 'src', 'pages', 'RomaneioRetorno.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/: any/g, ': Record<string, unknown>');
c5 = c5.replace(/<any>/g, '<unknown>');
c5 = c5.replace(/: any\)/g, ': Record<string, unknown>)');
fs.writeFileSync(f5, c5);

console.log('Fixed Lote 5 remaining files');
