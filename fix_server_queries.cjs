const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// First, fix the missing Corte and Dobra.
const anchor = '                /* -- Novas req -- */\\n                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,\\'\\') AS DECIMAL(10,2))), 0) AS qtdetotalpecas,'.replace(/\\\\/g, ''); // just for typing simplicity

const lines = code.split('\\n');
const lineIndex = lines.findIndex(l => l.includes('AS qtdetotalpecas'));

if (lineIndex !== -1 && !code.includes('TotalCorte')) {
    const insertCorteDobra = \`
                /* -- Setor Corte -- */
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,
                MIN(t.PlanejadoInicioCorte) as PlanejadoInicioCorte, MAX(t.PlanejadoFinalCorte) as PlanejadoFinalCorte,
                MIN(t.RealizadoInicioCorte) as RealizadoInicioCorte, MAX(t.RealizadoFinalCorte) as RealizadoFinalCorte,

                /* -- Setor Dobra -- */
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,
                MIN(t.PlanejadoInicioDobra) as PlanejadoInicioDobra, MAX(t.PlanejadoFinalDobra) as PlanejadoFinalDobra,
                MIN(t.RealizadoInicioDobra) as RealizadoInicioDobra, MAX(t.RealizadoFinalDobra) as RealizadoFinalDobra,\`;
    lines.splice(lineIndex + 1, 0, insertCorteDobra);
    code = lines.join('\\n');
}

// Second, add the flags
const anchorIndex = code.indexOf('MIN(t.RealizadoInicioMontagem) as RealizadoInicioMontagem, MAX(t.RealizadoFinalMontagem) as RealizadoFinalMontagem');

if (anchorIndex !== -1 && !code.includes('flagCorte')) {
    const insertFlags = \`,
                (SELECT MAX(CASE WHEN osi.txtCorte = '1' OR osi.txtCorte = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagCorte,
                (SELECT MAX(CASE WHEN osi.txtDobra = '1' OR osi.txtDobra = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagDobra,
                (SELECT MAX(CASE WHEN osi.txtSolda = '1' OR osi.txtSolda = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagSolda,
                (SELECT MAX(CASE WHEN osi.txtPintura = '1' OR osi.txtPintura = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagPintura,
                (SELECT MAX(CASE WHEN osi.TxtMontagem = '1' OR osi.TxtMontagem = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagMontagem,
                (SELECT MAX(CASE WHEN osi.txtCorteaLaser = '1' OR osi.txtCorteaLaser = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagCorteaLaser,
                (SELECT MAX(CASE WHEN osi.txtPULSIONADEIRA = '1' OR osi.txtPULSIONADEIRA = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagPulsionadeira,
                (SELECT MAX(CASE WHEN osi.txtGALVANIZAR = '1' OR osi.txtGALVANIZAR = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagGalvanizar\`;
    
    code = code.substring(0, anchorIndex + 116) + insertFlags + code.substring(anchorIndex + 116);
}

fs.writeFileSync('src/server.js', code);
console.log('Restored and injected!');
