const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

content = content.replace(
    /PlanejadoInicioMontagem: string; PlanejadoFinalMontagem: string; RealizadoInicioMontagem: string; RealizadoFinalMontagem: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; flagMontagem: number;/g,
    `PlanejadoInicioMontagem: string; PlanejadoFinalMontagem: string; RealizadoInicioMontagem: string; RealizadoFinalMontagem: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; flagMontagem: number;
 PlanejadoInicioCorteaLaser?: string; PlanejadoFinalCorteaLaser?: string; flagCorteaLaser?: number;
 PlanejadoInicioPULSIONADEIRA?: string; PlanejadoFinalPULSIONADEIRA?: string; flagPULSIONADEIRA?: number;
 PlanejadoInicioGALVANIZAR?: string; PlanejadoFinalGALVANIZAR?: string; flagGALVANIZAR?: number;`
);

fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
console.log('Fixed Tag interface');
