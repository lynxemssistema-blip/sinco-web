const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const regex = /<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style=\{\{ gridTemplateColumns: `repeat\(\$\{Math\.min\(filteredTagSectors\.length, 3\)\}, minmax\(0, 1fr\)\)` \}\}>[\s]+{filteredTagSectors\.map\(s => \([\s]+<div key=\{s\.k\} className="bg-slate-50 border border-slate-200 rounded-md p-4">/;

const replaceStr = `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ gridTemplateColumns: \`repeat(\${Math.min(filteredTagSectors.filter(s => selTag && selTag[\`flag\${s.k}\` as keyof Tag] === 1).length, 3)}, minmax(0, 1fr))\` }}>
 {filteredTagSectors.filter(s => selTag && selTag[\`flag\${s.k}\` as keyof Tag] === 1).map(s => (
 <div key={s.k} className="bg-slate-50 border border-slate-200 rounded-md p-4">`;

if (regex.test(file)) {
    file = file.replace(regex, replaceStr);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
    console.log("Substituição feita com sucesso.");
} else {
    console.log("Falha ao encontrar o padrão na regex.");
}
