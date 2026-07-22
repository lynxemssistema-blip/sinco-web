const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf-8');

content = content.replace(/filteredTagSectors\.map\(s => \{\r?\n(\s*)const e = toNum\(t\[s\.ex/g, 
  `filteredTagSectors.map(s => {\n$1if (t[\`flag\${s.k}\` as keyof Tag] !== 1) return <td key={s.k} className="px-2 py-0.5 align-top border-r border-slate-100 bg-slate-50/50"><div className="flex flex-col items-center justify-center h-full text-slate-300 text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-slate-200 mb-1"></div>N/A</div></td>;\n$1const e = toNum(t[s.ex`);

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content);
