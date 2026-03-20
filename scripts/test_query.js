const pool = require('../src/config/db.js');

async function testQuery() {
    try {
        const query = `
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, Projeto, Tag, DescTag, 
                CodMatFabricante, DescResumo, DescDetal, Espessura, 
                MaterialSW, EnderecoArquivo, EnderecoArquivoItemOrdemServico,
                CriadoPor, DataCriacao, QtdeTotal, SetorReposicao, 
                IdPendenciaReposicao, Reposicao, D_E_L_E_T_E,
                sttxtCorte, sttxtDobra, sttxtSolda, sttxtPintura, sttxtMontagem, 
                sttxtMEDICAO, sttxtISOMETRICO, sttxtENGENHARIA, sttxtACABAMENTO, sttxtAPROVACAO
            FROM ordemservicoitem
            WHERE Reposicao = 'S' 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
              AND IdMatriz = ?
        `;
        // Pass a tenantId = 1 as dummy to just parse the Query
        const [rows] = await pool.query(query, [1]);
        console.log("SUCCESS! Row count:", rows.length);
    } catch (err) {
        console.error("SQL ERROR:", err.message);
    } finally {
        process.exit(0);
    }
}

testQuery();
