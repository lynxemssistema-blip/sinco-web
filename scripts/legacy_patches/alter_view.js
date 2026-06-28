const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        const sql = `
CREATE OR REPLACE ALGORITHM=UNDEFINED DEFINER=\`lynxlocal\`@\`%\` SQL SECURITY DEFINER VIEW \`viewromaneioitem\` AS 
select \`romaneioitem\`.\`IdRomaneio\` AS \`IdRomaneio\`,
\`romaneioitem\`.\`IdRomaneioItem\` AS \`IdRomaneioItem\`,
\`ordemservicoitem\`.\`IdOrdemServico\` AS \`IDOrdemServico\`,
\`romaneioitem\`.\`IDOrdemServicoITEM\` AS \`IDOrdemServicoITEM\`,
\`ordemservicoitem\`.\`idProjeto\` AS \`idProjeto\`,
\`ordemservicoitem\`.\`Projeto\` AS \`PROJETO\`,
\`ordemservicoitem\`.\`IdTag\` AS \`IdTag\`,
\`ordemservicoitem\`.\`Tag\` AS \`TAG\`,
\`ordemservicoitem\`.\`DescTag\` AS \`DescTag\`,
\`ordemservicoitem\`.\`IdEmpresa\` AS \`IdEmpresa\`,
\`ordemservicoitem\`.\`descempresa\` AS \`DescEmpresa\`,
\`ordemservicoitem\`.\`QtdeTotal\` AS \`QtdeTotal\`,
\`ordemservicoitem\`.\`Acabamento\` AS \`ACABAMENTO\`,
\`ordemservicoitem\`.\`DescResumo\` AS \`DescResumo\`,
\`ordemservicoitem\`.\`DescDetal\` AS \`DescDetal\`,
\`romaneioitem\`.\`PesoUnit\` AS \`PesoUnit\`,
\`romaneioitem\`.\`PesoTotal\` AS \`PesoTotal\`,
\`romaneioitem\`.\`AreaPinturaUnit\` AS \`AreaPinturaUnit\`,
\`romaneioitem\`.\`AreaPinturaTotal\` AS \`AreaPinturaTotal\`,
\`romaneioitem\`.\`QtdeTotalRetorno\` AS \`QtdeTotalRetorno\`,
\`romaneioitem\`.\`PesoTotalRetorno\` AS \`PesoTotalRetorno\`,
\`romaneioitem\`.\`AreaTotalRetorno\` AS \`AreaTotalRetorno\`,
\`ordemservicoitem\`.\`Unidade\` AS \`Unidade\`,
\`ordemservicoitem\`.\`CodMatFabricante\` AS \`CodMatFabricante\`,
\`romaneioitem\`.\`AreaPinturaCalculada\` AS \`AreaPinturaCalculada\`,
\`romaneioitem\`.\`qtdeUsuario\` AS \`QtdeRomaneio\`,
\`romaneioitem\`.\`SaldoRomaneio\` AS \`SaldoRomaneio\`,
\`romaneioitem\`.\`qtdeUsuario\` AS \`QtdeUsuario\`,
'\\\\' AS \`\\\`,
\`romaneioitem\`.\`SaldoRomaneio\` AS \`ParcialRomaneio\`,
\`ordemservicoitem\`.\`IdMaterial\` AS \`IdMaterial\`,
\`ordemservicoitem\`.\`Espessura\` AS \`Espessura\`,
\`ordemservicoitem\`.\`MaterialSW\` AS \`MaterialSW\`,
\`ordemservicoitem\`.\`Largura\` AS \`Largura\`,
\`ordemservicoitem\`.\`Altura\` AS \`comprimento\`,
\`material\`.\`EnderecoArquivo\` AS \`EnderecoArquivo\`,
\`material\`.\`Comprimentocaixadelimitadora\` AS \`Comprimentocaixadelimitadora\`,
\`material\`.\`Larguracaixadelimitadora\` AS \`Larguracaixadelimitadora\`,
\`material\`.\`Espessuracaixadelimitadora\` AS \`Espessuracaixadelimitadora\`,
\`ordemservicoitem\`.\`txtTipoDesenho\` AS \`txtTipoDesenho\`,
\`romaneioitem\`.\`EnviadoParaRomaneio\` AS \`EnviadoParaRomaneio\`,
\`romaneioitem\`.\`MarcarComoFinalizado\` AS \`MarcarComoFinalizado\`,
\`romaneioitem\`.\`DataFinalizacao\` AS \`DataFinalizacao\`,
\`romaneioitem\`.\`PesoUnitario\` AS \`PesoUnitario\`,
\`romaneioitem\`.\`UsuarioLogado\` AS \`UsuarioLogado\`,
\`romaneioitem\`.\`Observacao\` AS \`Observacao\`,
\`romaneioitem\`.\`Situacao\` AS \`Situacao\` 
from ((\`romaneioitem\` 
left join \`ordemservicoitem\` on((\`ordemservicoitem\`.\`IdOrdemServicoItem\` = \`romaneioitem\`.\`IDOrdemServicoITEM\`))) 
left join \`material\` on((\`material\`.\`CodMatFabricante\` = \`ordemservicoitem\`.\`CodMatFabricante\`))) 
where (isnull(\`romaneioitem\`.\`D_E_L_E_T_E\`) or (\`romaneioitem\`.\`D_E_L_E_T_E\` = '')) 
group by \`romaneioitem\`.\`IdRomaneioItem\` 
order by \`romaneioitem\`.\`IdRomaneio\`,\`romaneioitem\`.\`IdRomaneioItem\`;
        `;

        await pool.query(sql);
        console.log("View updated successfully.");

        console.log("\nChecking viewromaneioitem for IdRomaneio=3 after update:");
        const [rows2] = await pool.query("SELECT * FROM viewromaneioitem WHERE IdRomaneio = 3");
        console.log("viewromaneioitem rows:", rows2.length);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
