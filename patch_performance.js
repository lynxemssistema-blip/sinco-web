/**
 * Patch de performance — Projetos (subqueries correlacionadas) e Apontamento
 * Usa indexOf + substring para manipulação cirúrgica do arquivo
 */
const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');
const originalSize = content.length;
console.log('📂 server.js lido. Tamanho:', originalSize, 'bytes');

let patchesApplied = 0;

// ─────────────────────────────────────────────────────────────────────────────
// PATCH PROJETOS: Substituir o bloco de subqueries correlacionadas
// Localiza entre "Get projects with aggregated" e o GROUP BY/LIMIT/backtick
// ─────────────────────────────────────────────────────────────────────────────
const P_ANCHOR = '// Get projects with aggregated sector totals from their tags + RNC count';
const pIdx = content.indexOf(P_ANCHOR);

if (pIdx === -1) {
    console.log('ℹ️  PROJETOS: âncora não encontrada (patch já aplicado ou bloco alterado)');
} else {
    // Encontrar fim do bloco: a linha com LIMIT 300 e fechamento do template literal
    const P_END_MARKER = 'LIMIT 300\r\n        `);';
    const pEnd = content.indexOf(P_END_MARKER, pIdx);
    if (pEnd === -1) {
        console.log('⚠️  PROJETOS: marcador de fim não encontrado');
    } else {
        const endPos = pEnd + P_END_MARKER.length;
        const block = content.substring(pIdx, endPos);
        console.log('🔍 Bloco Projetos localizado (' + block.length + ' chars)');

        // Novo bloco — JOINs pré-agregados substituem subqueries correlacionadas
        const newBlock = [
            '// PERF: subqueries correlacionadas (4x por projeto) substituídas por LEFT JOINs',
            '        // Antes: até 4 queries extras por projeto = centenas de viagens ao banco',
            '        // Agora: 2 JOINs pré-agregados trazem todos os contadores em 1 única query',
            "        const [rows] = await queryPool.execute(`",
            '            SELECT',
            '                p.IdProjeto, p.Projeto, p.DescProjeto, p.DataPrevisao, p.DataCriacao,',
            '                p.Finalizado, p.liberado, p.StatusProj, p.DescStatus,',
            '',
            '                /* -- Tags / Pecas nativos da tabela Projetos -- */',
            '                COUNT(t.IdTag) AS QtdeTags,',
            '                COALESCE(p.QtdeTagsExecutadas, 0) AS QtdeTagsExecutadas,',
            '                COALESCE(p.QtdePecasTags, 0) AS QtdePecasTags,',
            '                COALESCE(p.QtdePecasExecutadas, 0) AS QtdePecasExecutadas,',
            '',
            '                /* -- OS Count via LEFT JOIN pre-agregado -- */',
            '                COALESCE(osAgg.QtdeOS, 0) AS QtdeOS,',
            '',
            '                /* -- RNC via LEFT JOIN pre-agregado (substitui 4 subqueries) -- */',
            '                COALESCE(rncAgg.TotalRnc, 0)          AS TotalRnc,',
            '                COALESCE(rncAgg.qtdernc, 0)           AS qtdernc,',
            '                COALESCE(rncAgg.qtderncPendente, 0)   AS qtderncPendente,',
            '                COALESCE(rncAgg.qtderncFinalizada, 0) AS qtderncFinalizada,',
            '',
            "                /* -- Novas req -- */",
            "                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,'') AS DECIMAL(10,2))), 0) AS qtdetotalpecas,",
            '',
            '                /* -- Setor Corte -- */',
            "                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,",
            "                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,",
            '',
            '                /* -- Setor Dobra -- */',
            "                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,",
            "                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,",
            '',
            '                /* -- Setor Solda -- */',
            "                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,",
            "                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,",
            '',
            '                /* -- Setor Pintura -- */',
            "                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,",
            "                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,",
            '',
            '                /* -- Setor Montagem -- */',
            "                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalMontagem,",
            "                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecMontagem",
            '',
            '            FROM projetos p',
            "            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto",
            "                AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')",
            '            /* Agrega OS por projeto -- substitui subquery correlacionada */',
            '            LEFT JOIN (',
            '                SELECT IdProjeto, COUNT(*) AS QtdeOS',
            '                FROM ordemservico',
            "                WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')",
            '                GROUP BY IdProjeto',
            '            ) osAgg ON osAgg.IdProjeto = p.IdProjeto',
            '            /* Agrega RNCs por projeto -- substitui 4 subqueries correlacionadas */',
            '            LEFT JOIN (',
            '                SELECT',
            '                    IdProjeto,',
            '                    COUNT(*) AS qtdernc,',
            "                    COUNT(CASE WHEN Estatus = 'PENDENCIA' THEN 1 END) AS TotalRnc,",
            "                    COUNT(CASE WHEN (Estatus = 'PENDENCIA' OR Estatus IS NULL OR Estatus = '') THEN 1 END) AS qtderncPendente,",
            "                    COUNT(CASE WHEN (Estatus LIKE '%FIN%' OR Estatus = 'FINALIZADA') THEN 1 END) AS qtderncFinalizada",
            '                FROM ordemservicoitempendencia',
            "                WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')",
            '                GROUP BY IdProjeto',
            '            ) rncAgg ON rncAgg.IdProjeto = p.IdProjeto',
            '            WHERE ${where}',
            '            GROUP BY p.IdProjeto',
            '            ORDER BY p.IdProjeto DESC',
            '            LIMIT 300',
            '        `);'
        ].join('\r\n');

        content = content.substring(0, pIdx) + newBlock + content.substring(endPos);
        patchesApplied++;
        console.log('✅ PROJETOS: patch aplicado');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH APONTAMENTO: subquery correlacionada no SELECT da query principal
// ─────────────────────────────────────────────────────────────────────────────
const APT_ANCHOR = "osi.ProdutoPrincipal as IsProdutoPrincipal,\r\n            (SELECT DescResumo FROM ordemservicoitem WHERE IdOrdemServico = osi.IdOrdemServico AND ProdutoPrincipal = 'sim' LIMIT 1) as NomeProdutoPrincipal,";
const aptIdx = content.indexOf(APT_ANCHOR);

if (aptIdx === -1) {
    console.log('ℹ️  APONTAMENTO: âncora não encontrada (patch já aplicado ou bloco alterado)');
} else {
    const APT_END_MARKER = "LIMIT 300\r\n    `, [setor, ...params]);";
    const aptEnd = content.indexOf(APT_END_MARKER, aptIdx);
    if (aptEnd === -1) {
        console.log('⚠️  APONTAMENTO: marcador de fim não encontrado');
    } else {
        const endPos = aptEnd + APT_END_MARKER.length;
        console.log('🔍 Bloco Apontamento localizado');

        const newAptBlock = [
            "osi.ProdutoPrincipal as IsProdutoPrincipal,",
            "            prodNome.DescResumo as NomeProdutoPrincipal,",
            "            /* PERF: subqueries correlacionadas substituidas por LEFT JOINs pre-agregados */",
            "            COALESCE(hist.QtdeProduzidaHistory, 0) as QtdeProduzidaHistory",
            "            FROM ordemservicoitem osi",
            "            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico",
            "            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto",
            "            /* Pre-agrega historico de producao por item - elimina subquery correlacionada */",
            "            LEFT JOIN (",
            "                SELECT",
            "                    IdOrdemServicoItem,",
            "                    COALESCE(SUM(CAST(NULLIF(QtdeProduzida,'') AS UNSIGNED)), 0) AS QtdeProduzidaHistory",
            "                FROM ordemservicoitemcontrole",
            "                WHERE Processo = ?",
            "                  AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')",
            "                GROUP BY IdOrdemServicoItem",
            "            ) hist ON hist.IdOrdemServicoItem = osi.IdOrdemServicoItem",
            "            /* Nome produto principal via JOIN - substitui subquery */",
            "            LEFT JOIN (",
            "                SELECT IdOrdemServico, DescResumo",
            "                FROM ordemservicoitem",
            "                WHERE ProdutoPrincipal = 'sim'",
            "                GROUP BY IdOrdemServico",
            "            ) prodNome ON prodNome.IdOrdemServico = osi.IdOrdemServico",
            "            WHERE ${whereClause}",
            "            ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem",
            "            LIMIT 300",
            "    `, [setor, setor, ...params]);"
        ].join('\r\n');

        content = content.substring(0, aptIdx) + newAptBlock + content.substring(endPos);
        patchesApplied++;
        console.log('✅ APONTAMENTO: patch aplicado');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Salvar resultado
// ─────────────────────────────────────────────────────────────────────────────
if (patchesApplied > 0) {
    fs.writeFileSync(serverFile, content, 'utf8');
    console.log('\n📁 server.js salvo!');
    console.log('   Tamanho antes:', originalSize, 'bytes');
    console.log('   Tamanho depois:', content.length, 'bytes');
    console.log('   Patches aplicados:', patchesApplied);
} else {
    console.log('\n⚠️  Nenhum patch foi necessário (já aplicados ou formato diferente).');
}
