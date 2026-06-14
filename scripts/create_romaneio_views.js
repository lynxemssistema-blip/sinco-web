/**
 * create_romaneio_views.js
 * Cria as views dedicadas do módulo Romaneio-Envio com nomes padronizados.
 * Execute: node scripts/create_romaneio_views.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
});

// ------------------------------------------------------------------
// VIEW 1: v_rom_itens_disponiveis
// Itens disponíveis para incluir no romaneio (projetos/tags não finalizados)
// Colunas com nomes 100% padronizados (camelCase consistente)
// ------------------------------------------------------------------
const VIEW_ITENS_DISPONIVEIS = `
CREATE OR REPLACE VIEW v_rom_itens_disponiveis AS
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
    -- Total já enviado para qualquer romaneio
    ROUND(COALESCE((
        SELECT SUM(COALESCE(ri.qtdeUsuario, 0))
        FROM romaneioitem ri
        WHERE ri.IDOrdemServicoITEM = osi.IdOrdemServicoItem
          AND (ri.D_E_L_E_T_E IS NULL OR ri.D_E_L_E_T_E <> '*')
    ), 0), 2) AS RomaneioTotalEnviado,
    ROUND(osi.RomaneioSaldoEnviar, 2)               AS RomaneioSaldoEnviar
FROM ordemservicoitem osi
JOIN projetos p  ON p.IdProjeto = osi.idProjeto
JOIN tags     t  ON t.IdTag     = osi.IdTag
LEFT JOIN ordemservicoitem osi2 ON osi2.IdOrdemServicoItem = osi.IdOrdemServicoItem
WHERE COALESCE(p.Finalizado, '') = ''
  AND COALESCE(t.Finalizado, '') = ''
  AND COALESCE(TRIM(osi.D_E_L_E_T_E), '') = ''
ORDER BY osi.IdOrdemServicoItem, osi.IdOrdemServico
`;

// ------------------------------------------------------------------
// VIEW 2: v_rom_itens_incluidos
// Itens já incluídos em um romaneio, com todos os dados necessários
// ------------------------------------------------------------------
const VIEW_ITENS_INCLUIDOS = `
CREATE OR REPLACE VIEW v_rom_itens_incluidos AS
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
    ri.SaldoRomaneio            AS SaldoRomaneio,
    ri.MarcarComoFinalizado     AS MarcarComoFinalizado,
    ri.DataFinalizacao          AS DataFinalizacao,
    ri.Observacao               AS Observacao,
    ri.Situacao                 AS Situacao,
    ri.EnviadoParaRomaneio      AS EnviadoParaRomaneio,
    -- Arquivo de desenho: preferência pelo item de OS, fallback para material
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
ORDER BY ri.IdRomaneio, ri.IdRomaneioItem
`;

async function run() {
    console.log('Criando view v_rom_itens_disponiveis...');
    await pool.query(VIEW_ITENS_DISPONIVEIS);
    console.log('✅ v_rom_itens_disponiveis criada.');

    console.log('Criando view v_rom_itens_incluidos...');
    await pool.query(VIEW_ITENS_INCLUIDOS);
    console.log('✅ v_rom_itens_incluidos criada.');

    // Verifica com 1 row de cada
    const [r1] = await pool.query('SELECT COUNT(*) AS total FROM v_rom_itens_disponiveis');
    console.log(`v_rom_itens_disponiveis: ${r1[0].total} itens disponíveis.`);

    const [r2] = await pool.query('SELECT COUNT(*) AS total FROM v_rom_itens_incluidos');
    console.log(`v_rom_itens_incluidos: ${r2[0].total} itens incluídos em romaneios.`);

    await pool.end();
    console.log('\nViews criadas com sucesso!');
}

run().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
