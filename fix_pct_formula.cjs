const fs = require('fs');
const filePath = 'frontend/src/pages/VisaoGeralProducao.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Corrigir as linhas 1443 e 1518 (0-indexed 1442 e 1517)
// TotalExecutar é o TOTAL do setor (não saldo restante)
// Portanto: pct = TotalExecutado / TotalExecutar = e / saldo

const oldLine = '  const e = toNum(t[s.ex as keyof Tag] as any), saldo = toNum(t[s.t as keyof Tag] as any), raw = toNum(t[s.p as keyof Tag] as any), pct = raw > 0 ? raw : safePct(e as any, (e + saldo) as any);';
const newLine = '  const e = toNum(t[s.ex as keyof Tag] as any), saldo = toNum(t[s.t as keyof Tag] as any), raw = toNum(t[s.p as keyof Tag] as any), pct = raw > 0 ? raw : safePct(e as any, saldo as any);';

let count = 0;
for (let i = 0; i < lines.length; i++) {
    if (lines[i] === oldLine) {
        lines[i] = newLine;
        count++;
        console.log(`[OK] Linha ${i+1} corrigida`);
    }
}
console.log(`Total substituídas: ${count}`);

// Corrigir também a exibição e/{e+saldo} -> e/{saldo}
const oldDisplay = '  <span className={`text-[10px] font-black ${pct >= 100 && (e + saldo) > 0 ? "text-emerald-600" : "text-slate-700"}`}>{pct}% <span className="text-[8px] text-slate-400 font-normal ml-0.5">({e}/{e+saldo})</span></span>';
const newDisplay = '  <span className={`text-[10px] font-black ${pct >= 100 && saldo > 0 ? "text-emerald-600" : "text-slate-700"}`}>{pct}% <span className="text-[8px] text-slate-400 font-normal ml-0.5">({e}/{saldo})</span></span>';

for (let i = 0; i < lines.length; i++) {
    if (lines[i] === oldDisplay) {
        lines[i] = newDisplay;
        console.log(`[OK] Display linha ${i+1} corrigida`);
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Concluído.');
