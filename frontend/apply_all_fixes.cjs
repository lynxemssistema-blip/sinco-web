const fs = require('fs');
let content = fs.readFileSync('src/pages/VisaoGeralProducao.tsx', 'utf-8');

// 1. Add missing sectors to SECTORS
content = content.replace(
  /\{ k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' \},(\r?\n)\];/g,
  `{ k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },$1 { k: 'CorteaLaser', ex: 'ExecCorteaLaser', t: 'TotalCorteaLaser', c: 'bg-purple-600' },$1 { k: 'Pulsionadeira', ex: 'ExecPULSIONADEIRA', t: 'TotalPULSIONADEIRA', c: 'bg-pink-600' },$1 { k: 'Galvanizar', ex: 'ExecGALVANIZAR', t: 'TotalGALVANIZAR', c: 'bg-cyan-600' },$1];`
);

// 2. Add missing sectors to TAG_SECTORS
content = content.replace(
  /\{ k: 'Montagem', ex: 'MontagemTotalExecutado', t: 'MontagemTotalExecutar', p: 'MontagemPercentual', c: 'bg-emerald-500',(\r?\n)\s*fields: \{ pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem', ri: 'RealizadoInicioMontagem', rf: 'RealizadoFinalMontagem' \} \},(\r?\n)\];/g,
  `{ k: 'Montagem', ex: 'MontagemTotalExecutado', t: 'MontagemTotalExecutar', p: 'MontagemPercentual', c: 'bg-emerald-500',$1 fields: { pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem', ri: 'RealizadoInicioMontagem', rf: 'RealizadoFinalMontagem' } },$2 { k: 'CorteaLaser', ex: 'CorteaLaserTotalExecutado', t: 'CorteaLaserTotalExecutar', p: 'CorteaLaserPercentual', c: 'bg-purple-500',$1 fields: { pi: 'PlanejadoInicioCorteaLaser', pf: 'PlanejadoFinalCorteaLaser', ri: 'RealizadoInicioCorteaLaser', rf: 'RealizadoFinalCorteaLaser' } },$2 { k: 'Pulsionadeira', ex: 'PULSIONADEIRATotalExecutado', t: 'PULSIONADEIRATotalExecutar', p: 'PULSIONADEIRAPercentual', c: 'bg-pink-500',$1 fields: { pi: 'PlanejadoInicioPULSIONADEIRA', pf: 'PlanejadoFinalPULSIONADEIRA', ri: 'RealizadoInicioPULSIONADEIRA', rf: 'RealizadoFinalPULSIONADEIRA' } },$2 { k: 'Galvanizar', ex: 'GALVANIZARTotalExecutado', t: 'GALVANIZARTotalExecutar', p: 'GALVANIZARPercentual', c: 'bg-cyan-500',$1 fields: { pi: 'PlanejadoInicioGALVANIZAR', pf: 'PlanejadoFinalGALVANIZAR', ri: 'RealizadoInicioGALVANIZAR', rf: 'RealizadoFinalGALVANIZAR' } },$2];`
);

// 3. Add flags to Tag interface
// Wait, I should make sure I don't add flagGalvanizar twice if it's there
content = content.replace(/CortePercentual: string;(?! flagCorte)/g, "CortePercentual: string; flagCorte: number;");
content = content.replace(/DobraPercentual: string;(?! flagDobra)/g, "DobraPercentual: string; flagDobra: number;");
content = content.replace(/SoldaPercentual: string;(?! flagSolda)/g, "SoldaPercentual: string; flagSolda: number;");
content = content.replace(/PinturaPercentual: string;(?! flagPintura)/g, "PinturaPercentual: string; flagPintura: number;");
content = content.replace(/MontagemPercentual: string;(?! flagMontagem)/g, "MontagemPercentual: string; flagMontagem: number;");
content = content.replace(/CorteaLaserPercentual: string;(?! flagCorteaLaser)/g, "CorteaLaserPercentual: string; flagCorteaLaser: number;");
content = content.replace(/PULSIONADEIRAPercentual: string;(?! flagPULSIONADEIRA)/g, "PULSIONADEIRAPercentual: string; flagPulsionadeira: number;");
content = content.replace(/GALVANIZARPercentual: string;(?! flagGALVANIZAR)/g, "GALVANIZARPercentual: string; flagGalvanizar: number;");

// 4. Fix detailed mode to render N/A for sectors that do not apply
content = content.replace(/\{filteredTagSectors\.map\(s => \{\r?\n(\s*)const e = toNum\(t\[s\.ex/g, 
  `{filteredTagSectors.map(s => {\n$1if (t[\`flag\${s.k}\` as keyof Tag] !== 1) return <td key={s.k} className="px-2 py-0.5 align-top border-r border-slate-100 bg-slate-50/50"><div className="flex flex-col items-center justify-center h-full text-slate-300 text-[10px] font-bold"><div className="w-1.5 h-1.5 rounded-full bg-slate-200 mb-1"></div>N/A</div></td>;\n$1const e = toNum(t[s.ex`);

// 5. Fix list mode to completely filter out sectors that do not apply
content = content.replace(/(<CalendarDays size=\{10\} \/> Planejar Setores\r?\n\s*<\/button>\r?\n\s*)\{filteredTagSectors\.map\(s => \{/g,
  `$1{filteredTagSectors.filter(s => t[\`flag\${s.k}\` as keyof Tag] === 1).map(s => {`);

fs.writeFileSync('src/pages/VisaoGeralProducao.tsx', content);
