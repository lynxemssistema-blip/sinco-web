/**
 * Atualiza as views do Romaneio adicionando SaldoReal calculado dinamicamente
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
});

const V1 = `CREATE OR REPLACE VIEW v_rom_itens_disponiveis AS
SELECT
    osi.IdOrdemServico          AS IdOrdemServico,
    osi.IdOrdemServicoItem      AS IdOrdemServicoItem,
    osi.idProjeto               AS IdProjeto,
    osi.Projeto                 AS Projeto,
    osi.IdTag                   AS IdTag,
    osi.Tag                     AS Tag,
    osi.CodMatFabricante        AS CodMatFabricante,
    osi.Unidade                 AS Unidade,
    osi.DescDetal               AS DescDetal,
    osi2.DescResumo             AS DescResumo,
    osi.Acabamento              AS Acabamento,
    osi.txtPintura              AS TxtPintura,
    osi.Liberado_Engenharia     AS Liberado_Engenharia,
    osi.OrdemServicoItemFinalizado AS OrdemServicoItemFinalizado,
    osi.EnderecoArquivoItemOrdemServico AS EnderecoArquivo,
    osi2.ProdutoPrincipal       AS ProdutoPrincipal,
    osi2.EnviadoParaRomaneio    AS EnviadoParaRomaneio,
    ROUND(osi.QtdeTotal, 2)                         AS QtdeTotal,
    ROUND(osi.Peso, 2)                              AS Peso,
    ROUND(osi.PesoUnitario / NULLIF(osi.qtde,0), 2) AS PesoUnitario,
    ROUND(osi.AreaPintura, 2)                       AS AreaPintura,
    ROUND(osi.AreaPinturaUnitario / NULLIF(osi.qtde,0), 2) AS AreaPinturaUnitario,
    ROUND(osi2.Comprimentocaixadelimitadora, 2)     AS Comprimento,
    ROUND(osi2.Larguracaixadelimitadora, 2)         AS Largura,
    ROUND(osi2.Espessuracaixadelimitadora, 2)       AS Espessura,
    ROUND(COALESCE((
        SELECT SUM(COALESCE(ri.qtdeUsuario, 0))
        FROM romaneioitem ri
        WHERE ri.IDOrdemServicoITEM = osi.IdOrdemServicoItem
          AND (ri.D_E_L_E_T_E IS NULL OR ri.D_E_L_E_T_E <> '*')
    ), 0), 2) AS RomaneioTotalEnviado,
    ROUND(osi.RomaneioSaldoEnviar, 2) AS RomaneioSaldoEnviar,
    ROUND(osi.QtdeTotal - COALESCE((
        SELECT SUM(COALESCE(ri.qtdeUsuario, 0))
        FROM romaneioitem ri
        WHERE ri.IDOrdemServicoITEM = osi.IdOrdemServicoItem
          AND (ri.D_E_L_E_T_E IS NULL OR ri.D_E_L_E_T_E <> '*')
    ), 0), 2) AS SaldoReal
FROM ordemservicoitem osi
JOIN projetos p  ON p.IdProjeto = osi.idProjeto
JOIN tags     t  ON t.IdTag     = osi.IdTag
LEFT JOIN ordemservicoitem osi2 ON osi2.IdOrdemServicoItem = osi.IdOrdemServicoItem
WHERE COALESCE(p.Finalizado, '') = ''
  AND COALESCE(t.Finalizado, '') = ''
  AND COALESCE(TRIM(osi.D_E_L_E_T_E), '') = ''
ORDER BY osi.IdOrdemServicoItem, osi.IdOrdemServico`;

const V2 = `CREATE OR REPLACE VIEW v_rom_itens_incluidos AS
SELECT
    ri.IdRomaneio               AS IdRomaneio,
    ri.IdRomaneioItem           AS IdRomaneioItem,
    ri.IDOrdemServicoITEM       AS IdOrdemServicoItem,
    osi.IdOrdemServico          AS IdOrdemServico,
    osi.idProjeto               AS IdProjeto,
    osi.Projeto                 AS Projeto,
    osi.IdTag                   AS IdTag,
    osi.Tag                     AS Tag,
    osi.DescTag                 AS DescTag,
    osi.IdEmpresa               AS IdEmpresa,
    osi.descempresa             AS DescEmpresa,
    osi.CodMatFabricante        AS CodMatFabricante,
    osi.Unidade                 AS Unidade,
    osi.QtdeTotal               AS QtdeTotal,
    osi.Acabamento              AS Acabamento,
    osi.DescResumo              AS DescResumo,
    osi.DescDetal               AS DescDetal,
    osi.txtTipoDesenho          AS TxtTipoDesenho,
    ri.qtdeUsuario              AS QtdeRomaneio,
    ri.PesoUnitario             AS PesoUnitario,
    ri.PesoTotal                AS PesoTotal,
    ri.AreaPinturaCalculada     AS AreaPinturaCalculada,
    ri.AreaPinturaTotal         AS AreaPinturaTotal,
    ri.QtdeTotalRetorno         AS QtdeTotalRetorno,
    ri.PesoTotalRetorno         AS PesoTotalRetorno,
    ri.AreaTotalRetorno         AS AreaTotalRetorno,
    ROUND(osi.QtdeTotal - COALESCE((
        SELECT SUM(COALESCE(ri2.qtdeUsuario,0))
        FROM romaneioitem ri2
        WHERE ri2.IDOrdemServicoITEM = ri.IDOrdemServicoITEM
          AND (ri2.D_E_L_E_T_E IS NULL OR ri2.D_E_L_E_T_E <> '*')
    ),0), 2) AS SaldoRomaneio,
    ri.MarcarComoFinalizado     AS MarcarComoFinalizado,
    ri.DataFinalizacao          AS DataFinalizacao,
    ri.Observacao               AS Observacao,
    ri.Situacao                 AS Situacao,
    ri.EnviadoParaRomaneio      AS EnviadoParaRomaneio,
    COALESCE(osi.EnderecoArquivoItemOrdemServico, mat.EnderecoArquivo) AS EnderecoArquivo,
    mat.Comprimentocaixadelimitadora AS Comprimento,
    mat.Larguracaixadelimitadora     AS Largura,
    mat.Espessuracaixadelimitadora   AS Espessura,
    osi.Espessura                    AS EspessuraMat,
    osi.MaterialSW                   AS MaterialSW
FROM romaneioitem ri
LEFT JOIN ordemservicoitem osi ON osi.IdOrdemServicoItem = ri.IDOrdemServicoITEM
LEFT JOIN material mat         ON mat.CodMatFabricante    = osi.CodMatFabricante
WHERE (ri.D_E_L_E_T_E IS NULL OR ri.D_E_L_E_T_E = '')
GROUP BY ri.IdRomaneioItem
ORDER BY ri.IdRomaneio, ri.IdRomaneioItem`;

async function run() {
    console.log('Atualizando v_rom_itens_disponiveis...');
    await pool.query(V1);
    console.log('OK: v_rom_itens_disponiveis');

    console.log('Atualizando v_rom_itens_incluidos...');
    await pool.query(V2);
    console.log('OK: v_rom_itens_incluidos');

    // Validação
    const [r1] = await pool.query(
        'SELECT IdOrdemServicoItem,QtdeTotal,RomaneioTotalEnviado,SaldoReal FROM v_rom_itens_disponiveis WHERE IdOrdemServicoItem=32872'
    );
    console.log('Validação item 32872:', JSON.stringify(r1));

    const [r2] = await pool.query(
        'SELECT IdRomaneioItem,IdRomaneio,QtdeRomaneio,SaldoRomaneio FROM v_rom_itens_incluidos WHERE IdRomaneio=23'
    );
    console.log('Validação itens romaneio 23:', JSON.stringify(r2));

    await pool.end();
    console.log('\nViews atualizadas com sucesso!');
}

run().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
