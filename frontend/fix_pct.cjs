const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const pctRegex = /const e = toNum\(t\[s\.ex as keyof Tag\]\), tot = toNum\(t\[s\.t as keyof Tag\]\), raw = toNum\(t\[s\.p as keyof Tag\]\), pct = raw \|\| safePct\(e, tot\);/;

const pctReplace = `const e = toNum(t[s.ex as keyof Tag] as any), tot = toNum(t.QtdeTotalPecas as any), raw = toNum(t[s.p as keyof Tag] as any), pct = raw || safePct(e as any, tot as any);`;

if (pctRegex.test(file)) {
    file = file.replace(pctRegex, pctReplace);
    console.log("PCT substituído.");
} else {
    console.log("PCT NÃO encontrado.");
}

fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
