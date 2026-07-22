const fs = require('fs');
const filePath = 'frontend/src/pages/VisaoGeralProducao.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Linha 1523 (0-indexed 1522): corrigir 'tot' -> '(e+saldo)'
const old = lines[1522];
console.log('Old line:', old);

lines[1522] = '  <span className={`text-[10px] font-black ${pct >= 100 && (e + saldo) > 0 ? "text-emerald-600" : "text-slate-700"}`}>{pct}% <span className="text-[8px] text-slate-400 font-normal ml-0.5">({e}/{e+saldo})</span></span>';

console.log('New line:', lines[1522]);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done');
