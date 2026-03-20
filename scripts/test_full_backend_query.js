const pool = require('../src/config/db.js');

async function testFetchAll() {
    try {
        const query = `
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, IdMaterial, Projeto, DescEmpresa, Tag, DescTag, 
                CodMatFabricante, DescResumo, DescDetal, Espessura, 
                MaterialSW, EnderecoArquivo, EnderecoArquivoItemOrdemServico,
                CriadoPor, DataCriacao, QtdeTotal, SetorReposicao, 
                IdOrdemservicoReposicao, IdOrdemServicoItemReposicao, IdPendenciaReposicao, 
                Reposicao, D_E_L_E_T_E,
                cortetotalexecutado, cortetotalexecutar,
                txtcorte, txtdobra, txtsolda, txtpintura, txtmontagem,
                sttxtCorte, sttxtDobra, sttxtSolda, sttxtPintura, sttxtMontagem, 
                sttxtMEDICAO, sttxtISOMETRICO, sttxtENGENHARIA, sttxtACABAMENTO, sttxtAPROVACAO
            FROM ordemservicoitem
            WHERE Reposicao = 'S' 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
              AND IdMatriz = ?
        `;
        const [rows] = await pool.query(query, [1]);
        console.log("Total items:", rows.length);
        const item43 = rows.find(r => r.IdOrdemServicoItem === 43);
        console.log("ITEM 43:", item43 ? "FOUND" : "NOT FOUND");
        if (item43) console.log(item43);
    } catch (err) {
        console.error("SQL ERROR:", err.message);
    } finally {
        process.exit(0);
    }
}

testFetchAll();
