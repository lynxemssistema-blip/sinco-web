const fs = require('fs');
const path = require('path');

const targetFile = 'src/server.js';
const content = fs.readFileSync(targetFile, 'utf8');

const queryPattern = /const \[rows\] = await queryPool\.execute\(`([\s\S]+?)`\);/;
const match = content.match(queryPattern);

if (!match) {
    console.error('Could not find the query pattern');
    process.exit(1);
}

const newQuery = `
            SELECT
                p.IdProjeto, p.Projeto, p.DescProjeto, p.DataPrevisao, p.DataCriacao,
                TRIM(p.Finalizado) as Finalizado, p.liberado, p.StatusProj, p.DescStatus,

                /* -- Tags / Pecas nativos da tabela Projetos -- */
                COUNT(t.IdTag) AS QtdeTags,
                COALESCE(p.QtdeTagsExecutadas, 0) AS QtdeTagsExecutadas,
                COALESCE(p.QtdePecasTags, 0) AS QtdePecasTags,
                COALESCE(p.QtdePecasExecutadas, 0) AS QtdePecasExecutadas,

                /* -- OS Count -- */
                COALESCE((SELECT COUNT(*) FROM ordemservico os 
                           WHERE (os.IdProjeto = p.IdProjeto OR (os.Projeto = p.Projeto AND p.Projeto IS NOT NULL))
                             AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')), 0) AS QtdeOS,

                /* -- RNC -- */
                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND r.Estatus = 'PENDENCIA'), 0) AS TotalRnc,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')), 0) AS qtdernc,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND (r.Estatus = 'PENDENCIA' OR r.Estatus IS NULL OR r.Estatus = '')), 0) AS qtderncPendente,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND (r.Estatus LIKE '%FIN%' OR r.Estatus = 'FINALIZADA')), 0) AS qtderncFinalizada,
                             
                /* -- Novas req -- */
                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,'') AS DECIMAL(10,2))), 0) AS qtdetotalpecas,

                /* -- Setor Corte -- */
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,
                MIN(t.PlanejadoInicioCorte) as PlanejadoInicioCorte, MAX(t.PlanejadoFinalCorte) as PlanejadoFinalCorte,
                MIN(t.RealizadoInicioCorte) as RealizadoInicioCorte, MAX(t.RealizadoFinalCorte) as RealizadoFinalCorte,

                /* -- Setor Dobra -- */
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,
                MIN(t.PlanejadoInicioDobra) as PlanejadoInicioDobra, MAX(t.PlanejadoFinalDobra) as PlanejadoFinalDobra,
                MIN(t.RealizadoInicioDobra) as RealizadoInicioDobra, MAX(t.RealizadoFinalDobra) as RealizadoFinalDobra,

                /* -- Setor Solda -- */
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,
                MIN(t.PlanejadoInicioSolda) as PlanejadoInicioSolda, MAX(t.PlanejadoFinalSolda) as PlanejadoFinalSolda,
                MIN(t.RealizadoInicioSolda) as RealizadoInicioSolda, MAX(t.RealizadoFinalSolda) as RealizadoFinalSolda,

                /* -- Setor Pintura -- */
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,
                MIN(t.PlanejadoInicioPintura) as PlanejadoInicioPintura, MAX(t.PlanejadoFinalPintura) as PlanejadoFinalPintura,
                MIN(t.RealizadoInicioPintura) as RealizadoInicioPintura, MAX(t.RealizadoFinalPintura) as RealizadoFinalPintura,

                /* -- Setor Montagem -- */
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalMontagem,
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecMontagem,
                MIN(t.PlanejadoInicioMontagem) as PlanejadoInicioMontagem, MAX(t.PlanejadoFinalMontagem) as PlanejadoFinalMontagem,
                MIN(t.RealizadoInicioMontagem) as RealizadoInicioMontagem, MAX(t.RealizadoFinalMontagem) as RealizadoFinalMontagem

            FROM projetos p
            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto
                AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE \${where}
            GROUP BY p.IdProjeto
            ORDER BY p.IdProjeto DESC
            LIMIT 300
        `;

const newContent = content.replace(queryPattern, `const [rows] = await queryPool.execute(\`${newQuery}\`);`);
fs.writeFileSync(targetFile, newContent);
console.log('File updated successfully');
