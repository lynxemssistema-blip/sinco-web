const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const bulkRegex = /\{filteredTagSectors\.map\(s => \([\s]+<div key=\{`bulk_\$\{s\.k\}`\} className="bg-slate-50 border border-slate-200 rounded-md p-4 shadow-sm">/;
const bulkReplace = `{filteredTagSectors.filter(s => selProj && (selProj as any)[\`flag\${s.k}\`] === 1).map(s => (
 <div key={\`bulk_\${s.k}\`} className="bg-slate-50 border border-slate-200 rounded-md p-4 shadow-sm">`;

if (bulkRegex.test(file)) {
    file = file.replace(bulkRegex, bulkReplace);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
    console.log("Substituição do bulkDateTags feita com sucesso.");
} else {
    console.log("Falha ao encontrar o padrão bulkDateTags.");
}
