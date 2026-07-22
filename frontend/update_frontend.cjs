const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf-8');

// 1. Add flags to Tag interface
content = content.replace(/CortePercentual: string;/, "CortePercentual: string; flagCorte: number;");
content = content.replace(/DobraPercentual: string;/, "DobraPercentual: string; flagDobra: number;");
content = content.replace(/SoldaPercentual: string;/, "SoldaPercentual: string; flagSolda: number;");
content = content.replace(/PinturaPercentual: string;/, "PinturaPercentual: string; flagPintura: number;");
content = content.replace(/MontagemPercentual: string;/, "MontagemPercentual: string; flagMontagem: number;");
content = content.replace(/CorteaLaserPercentual: string;/, "CorteaLaserPercentual: string; flagCorteaLaser: number;");
content = content.replace(/PULSIONADEIRAPercentual: string;/, "PULSIONADEIRAPercentual: string; flagPULSIONADEIRA: number;");
content = content.replace(/GALVANIZARPercentual: string;/, "GALVANIZARPercentual: string; flagGALVANIZAR: number;");

// 2. Fix detailed mode to render N/A for sectors that do not apply
content = content.replace(/\{filteredTagSectors\.map\(s => \{\r?\n(\s*)const e = toNum\(t\[s\.ex/g, 
  `{filteredTagSectors.map(s => {\n$1if (t[\`flag\${s.k}\` as keyof Tag] !== 1) return <td key={s.k} className="px-2 py-0.5 align-top border-r border-slate-100 bg-slate-50/50"><div className="flex flex-col items-center justify-center h-full text-slate-300 text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-slate-200 mb-1"></div>N/A</div></td>;\n$1const e = toNum(t[s.ex`);

// 3. Fix list mode to completely filter out sectors that do not apply
// We need to target the second `{filteredTagSectors.map(s => {` which is inside the `list` mode block (after `Planejar Setores` button)
// The regex below targets the button then the map.
content = content.replace(/(<CalendarDays size=\{10\} \/> Planejar Setores\r?\n\s*<\/button>\r?\n\s*)\{filteredTagSectors\.map\(s => \{/g,
  `$1{filteredTagSectors.filter(s => t[\`flag\${s.k}\` as keyof Tag] === 1).map(s => {`);

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content);
