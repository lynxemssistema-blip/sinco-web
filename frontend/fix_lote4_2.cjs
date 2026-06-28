const fs = require('fs');
const path = require('path');

// PendenciaRomaneio
let f3 = path.join(__dirname, 'src', 'pages', 'PendenciaRomaneio.tsx');
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/catch \(err: any\) \{\r?\n\s*setError\(err\.message \|\| 'Erro ao carregar dados'\);/g, 'catch (err: unknown) {\n      setError(err instanceof Error ? err.message : "Erro ao carregar dados");');
fs.writeFileSync(f3, c3);

// PesquisarDesenho
let f4 = path.join(__dirname, 'src', 'pages', 'PesquisarDesenho.tsx');
let c4 = fs.readFileSync(f4, 'utf8');
c4 = c4.replace(/\[key: string\]: any;/g, '[key: string]: unknown;');
fs.writeFileSync(f4, c4);

console.log('Fixed Lote 4 remaining files');
