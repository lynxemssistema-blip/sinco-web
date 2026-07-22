const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

content = content.replace(
    /PlanejadoInicioMontagem: brToIso\(t.PlanejadoInicioMontagem\), PlanejadoFinalMontagem: brToIso\(t.PlanejadoFinalMontagem\),\n   \}\);/g,
    `PlanejadoInicioMontagem: brToIso(t.PlanejadoInicioMontagem), PlanejadoFinalMontagem: brToIso(t.PlanejadoFinalMontagem),
   PlanejadoInicioCorteaLaser: brToIso(t.PlanejadoInicioCorteaLaser), PlanejadoFinalCorteaLaser: brToIso(t.PlanejadoFinalCorteaLaser),
   PlanejadoInicioPULSIONADEIRA: brToIso(t.PlanejadoInicioPULSIONADEIRA), PlanejadoFinalPULSIONADEIRA: brToIso(t.PlanejadoFinalPULSIONADEIRA),
   PlanejadoInicioGALVANIZAR: brToIso(t.PlanejadoInicioGALVANIZAR), PlanejadoFinalGALVANIZAR: brToIso(t.PlanejadoFinalGALVANIZAR),
   });`
);

fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed sectors initialization in tagSectorDates');
