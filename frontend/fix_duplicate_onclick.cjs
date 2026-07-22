const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const regex = /onClick=\{\(\) => \{ [\s]+setSelTag\(t\); [\s]+setTagSectorDates\(\{[\s]+PlanejadoInicioCorte: brToIso\(t\.PlanejadoInicioCorte\), PlanejadoFinalCorte: brToIso\(t\.PlanejadoFinalCorte\),[\s]+PlanejadoInicioDobra: brToIso\(t\.PlanejadoInicioDobra\), PlanejadoFinalDobra: brToIso\(t\.PlanejadoFinalDobra\),[\s]+PlanejadoInicioSolda: brToIso\(t\.PlanejadoInicioSolda\), PlanejadoFinalSolda: brToIso\(t\.PlanejadoFinalSolda\),[\s]+PlanejadoInicioPintura: brToIso\(t\.PlanejadoInicioPintura\), PlanejadoFinalPintura: brToIso\(t\.PlanejadoFinalPintura\),[\s]+PlanejadoInicioMontagem: brToIso\(t\.PlanejadoInicioMontagem\), PlanejadoFinalMontagem: brToIso\(t\.PlanejadoFinalMontagem\),[\s]+\}\);[\s]+setMsg\(null\); setActionModal\('dateTagSetores'\); [\s]+\}\}[\s]+className=\{`w-full text-\[9px\] border border-slate-200 font-bold py-1\.5 rounded flex items-center justify-center gap-1 transition-colors mb-1 \$\{selProj\?\.Finalizado === 'C' \? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-\[#32423D\] hover:text-white text-slate-500'\}\`\}[\s]+title=\{selProj\?\.Finalizado === 'C' \? 'Projeto finalizado\. Planejamento bloqueado\.' : 'Planejar Setores'\}[\s]+onClick=\{\(e\) => \{[\s]+if \(selProj\?\.Finalizado === 'C'\) \{[\s]+e\.stopPropagation\(\);[\s]+\}[\s]+\}\}/;

const replaceWith = `onClick={() => { 
 if (selProj?.Finalizado === 'C') return;
 setSelTag(t); 
 setTagSectorDates({
 PlanejadoInicioCorte: brToIso(t.PlanejadoInicioCorte), PlanejadoFinalCorte: brToIso(t.PlanejadoFinalCorte),
 PlanejadoInicioDobra: brToIso(t.PlanejadoInicioDobra), PlanejadoFinalDobra: brToIso(t.PlanejadoFinalDobra),
 PlanejadoInicioSolda: brToIso(t.PlanejadoInicioSolda), PlanejadoFinalSolda: brToIso(t.PlanejadoFinalSolda),
 PlanejadoInicioPintura: brToIso(t.PlanejadoInicioPintura), PlanejadoFinalPintura: brToIso(t.PlanejadoFinalPintura),
 PlanejadoInicioMontagem: brToIso(t.PlanejadoInicioMontagem), PlanejadoFinalMontagem: brToIso(t.PlanejadoFinalMontagem),
 });
 setMsg(null); setActionModal('dateTagSetores'); 
 }}
 className={\`w-full text-[9px] border border-slate-200 font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors mb-1 \${selProj?.Finalizado === 'C' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-[#32423D] hover:text-white text-slate-500'}\`}
 title={selProj?.Finalizado === 'C' ? 'Projeto finalizado. Planejamento bloqueado.' : 'Planejar Setores'}`;

if (regex.test(file)) {
    file = file.replace(regex, replaceWith);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralProducao.tsx', file);
    console.log("Corrigido onClick duplicado.");
} else {
    console.log("NÃO achou regex do onclick duplicado.");
}
