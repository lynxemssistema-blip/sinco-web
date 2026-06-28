const fs = require('fs');
const path = require('path');

// Fix ListaReposicao
let f2 = path.join(__dirname, 'src', 'pages', 'ListaReposicao.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/\[key: string\]: any;/g, '[key: string]: unknown;');
fs.writeFileSync(f2, c2);

// Fix MontagemPlanoCorte
let f5 = path.join(__dirname, 'src', 'pages', 'MontagemPlanoCorte.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
// Fix all `any`
c5 = c5.replace(/ as any\)/g, ' as Record<string, unknown>)');
c5 = c5.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
c5 = c5.replace(/\(i as any\)/g, '(i as Record<string, unknown>)');
c5 = c5.replace(/\(m as any\)/g, '(m as Record<string, unknown>)');
c5 = c5.replace(/\(h as any\)/g, '(h as Record<string, unknown>)');
c5 = c5.replace(/\(p as any\)/g, '(p as Record<string, unknown>)');
c5 = c5.replace(/const resData: any =/g, 'const resData: Record<string, unknown> =');
c5 = c5.replace(/const headers: any =/g, 'const headers: Record<string, string> =');
c5 = c5.replace(/\[key: string\]: any/g, '[key: string]: unknown');
c5 = c5.replace(/Record<string, any>/g, 'Record<string, unknown>');

// Fix ternary statement
c5 = c5.replace(/n\.has\(id\) \? n\.delete\(id\) : n\.add\(id\);/g, 'if (n.has(id)) { n.delete(id); } else { n.add(id); }');

// Unused parcialSelec
c5 = c5.replace(/const parcialSelec = /g, '// const parcialSelec = ');

fs.writeFileSync(f5, c5);
console.log('Fixed ListaReposicao and MontagemPlanoCorte');
