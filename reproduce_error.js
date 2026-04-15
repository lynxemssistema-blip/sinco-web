const pool = require('./src/config/db');

async function test() {
    try {
        const limitVal = NaN;
        const pageVal = 1;
        const offsetVal = NaN;
        const params = [];

        let whereClause = `
            (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            AND (
                NULLIF(TRIM(osi.txtCorte), '') = '1' OR 
                NULLIF(TRIM(osi.txtDobra), '') = '1' OR 
                NULLIF(TRIM(osi.txtSolda), '') = '1' OR 
                NULLIF(TRIM(osi.txtPintura), '') = '1'
            )
        `;

        const queryStr = `
            SELECT 
                osi.IdOrdemServicoItem,
                osi.IdOrdemServico,
                osi.CodMatFabricante,
                osi.DescResumo,
                osi.QtdeTotal,
                osi.EnderecoArquivo,
                osi.EnderecoArquivoItemOrdemServico,
                osi.IdPlanodecorte as PlanoCorte,
                osi.MaterialSW,
                osi.Espessura,
                osi.txtCorte,
                osi.txtDobra,
                osi.txtSolda,
                osi.txtPintura,
                osi.TxtMontagem,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.CorteTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as CortePercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.DobraTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as DobraPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.SoldaTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as SoldaPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.PinturaTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as PinturaPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.MontagemTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as MontagemPercentual,
                osi.CorteTotalExecutado,
                osi.DobraTotalExecutado,
                osi.SoldaTotalExecutado,
                osi.PinturaTotalExecutado,
                osi.MontagemTotalExecutado,
                os.Projeto,
                os.IdProjeto,
                p.DescProjeto,
                os.Tag,
                os.IdTag,
                os.DescTag,
                os.DescEmpresa as Cliente,
                osi.ProdutoPrincipal,
                (SELECT DescResumo FROM ordemservicoitem WHERE IdOrdemServico = osi.IdOrdemServico AND ProdutoPrincipal = 'sim' LIMIT 1) as NomeProdutoPrincipal
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
            ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem
            LIMIT ? OFFSET ?
        `;

        console.log('Testing query...');
        const [rows] = await pool.execute(queryStr, [...params, limitVal, offsetVal]);
        console.log('Query successful, found ' + rows.length + ' rows');
        
    } catch (error) {
        console.error('QUERY FAILED:', error);
    } finally {
        process.exit();
    }
}

test();
