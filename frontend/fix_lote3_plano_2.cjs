const fs = require('fs');
const path = require('path');

// Fix ListaReposicao
let f2 = path.join(__dirname, 'src', 'pages', 'ListaReposicao.tsx');
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/\[key: string\]: any/g, '[key: string]: unknown');
c2 = c2.replace(/Record<string, any>/g, 'Record<string, unknown>');
c2 = c2.replace(/any\[\]/g, 'unknown[]');
c2 = c2.replace(/: any\)/g, ': Record<string, unknown>)');
fs.writeFileSync(f2, c2);

// Fix MontagemPlanoCorte
let f5 = path.join(__dirname, 'src', 'pages', 'MontagemPlanoCorte.tsx');
let c5 = fs.readFileSync(f5, 'utf8');
c5 = c5.replace(/catch \(e: any\)/g, 'catch (e: unknown)');
c5 = c5.replace(/catch \(_e: any\)/g, 'catch (_e: unknown)');
c5 = c5.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
c5 = c5.replace(/\(item: any\)/g, '(item: Record<string, unknown>)');
c5 = c5.replace(/\(h: any\)/g, '(h: Record<string, unknown>)');
c5 = c5.replace(/\(p: any\)/g, '(p: Record<string, unknown>)');
c5 = c5.replace(/usuarios\?: any\[\];/g, 'usuarios?: Record<string, unknown>[];');
c5 = c5.replace(/any\[\]/g, 'unknown[]');
c5 = c5.replace(/: any/g, ': Record<string, unknown>');
c5 = c5.replace(/<any>/g, '<unknown>');

fs.writeFileSync(f5, c5);
console.log('Fixed ListaReposicao and MontagemPlanoCorte 2');
