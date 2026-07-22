const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');
code = code.replace(
    /\/\* -- Setor Montagem -- \*\//,
    `/* -- Setor Corte a Laser -- */
                COALESCE(SUM(CAST(NULLIF(t.CorteaLaserTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalCorteaLaser,
                COALESCE(SUM(CAST(NULLIF(t.CorteaLaserTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecCorteaLaser,
                MIN(t.PlanejadoInicioCorteaLaser) as PlanejadoInicioCorteaLaser, MAX(t.PlanejadoFinalCorteaLaser) as PlanejadoFinalCorteaLaser,
                MIN(t.RealizadoInicioCorteaLaser) as RealizadoInicioCorteaLaser, MAX(t.RealizadoFinalCorteaLaser) as RealizadoFinalCorteaLaser,

                /* -- Setor Pulsionadeira -- */
                COALESCE(SUM(CAST(NULLIF(t.PULSIONADEIRATotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPulsionadeira,
                COALESCE(SUM(CAST(NULLIF(t.PULSIONADEIRATotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPulsionadeira,
                MIN(t.PlanejadoInicioPULSIONADEIRA) as PlanejadoInicioPulsionadeira, MAX(t.PlanejadoFinalPULSIONADEIRA) as PlanejadoFinalPulsionadeira,
                MIN(t.RealizadoInicioPULSIONADEIRA) as RealizadoInicioPulsionadeira, MAX(t.RealizadoFinalPULSIONADEIRA) as RealizadoFinalPulsionadeira,

                /* -- Setor Galvanizar -- */
                COALESCE(SUM(CAST(NULLIF(t.GALVANIZARTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalGalvanizar,
                COALESCE(SUM(CAST(NULLIF(t.GALVANIZARTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecGalvanizar,
                MIN(t.PlanejadoInicioGALVANIZAR) as PlanejadoInicioGalvanizar, MAX(t.PlanejadoFinalGALVANIZAR) as PlanejadoFinalGalvanizar,
                MIN(t.RealizadoInicioGALVANIZAR) as RealizadoInicioGalvanizar, MAX(t.RealizadoFinalGALVANIZAR) as RealizadoFinalGalvanizar,

                /* -- Setor Montagem -- */`
);
code = code.replace(
    /PctMontagem: pctSetor\(Number\(r\.ExecMontagem\), Number\(r\.TotalMontagem\)\),/,
    `PctMontagem: pctSetor(Number(r.ExecMontagem), Number(r.TotalMontagem)),
            PctCorteaLaser: pctSetor(Number(r.ExecCorteaLaser), Number(r.TotalCorteaLaser)),
            PctPulsionadeira: pctSetor(Number(r.ExecPulsionadeira), Number(r.TotalPulsionadeira)),
            PctGalvanizar: pctSetor(Number(r.ExecGalvanizar), Number(r.TotalGalvanizar)),`
);
code = code.replace(
    /MontagemTotalExecutado, MontagemTotalExecutar, MontagemPercentual,/,
    `MontagemTotalExecutado, MontagemTotalExecutar, MontagemPercentual,
                PlanejadoInicioCorteaLaser as PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser as PlanejadoFinalCorteaLaser, RealizadoInicioCorteaLaser as RealizadoInicioCorteaLaser, RealizadoFinalCorteaLaser as RealizadoFinalCorteaLaser,
                CorteaLaserTotalExecutado as CorteaLaserTotalExecutado, CorteaLaserTotalExecutar as CorteaLaserTotalExecutar, CorteaLaserPercentual as CorteaLaserPercentual,
                PlanejadoInicioPULSIONADEIRA as PlanejadoInicioPulsionadeira, PlanejadoFinalPULSIONADEIRA as PlanejadoFinalPulsionadeira, RealizadoInicioPULSIONADEIRA as RealizadoInicioPulsionadeira, RealizadoFinalPULSIONADEIRA as RealizadoFinalPulsionadeira,
                PULSIONADEIRATotalExecutado as PulsionadeiraTotalExecutado, PULSIONADEIRATotalExecutar as PulsionadeiraTotalExecutar, PULSIONADEIRAPercentual as PulsionadeiraPercentual,
                PlanejadoInicioGALVANIZAR as PlanejadoInicioGalvanizar, PlanejadoFinalGALVANIZAR as PlanejadoFinalGalvanizar, RealizadoInicioGALVANIZAR as RealizadoInicioGalvanizar, RealizadoFinalGALVANIZAR as RealizadoFinalGalvanizar,
                GALVANIZARTotalExecutado as GalvanizarTotalExecutado, GALVANIZARTotalExecutar as GalvanizarTotalExecutar, GALVANIZARPercentual as GalvanizarPercentual,`
);
fs.writeFileSync('src/server.js', code);
console.log('patched server.js');
