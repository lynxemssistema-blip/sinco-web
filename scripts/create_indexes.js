const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS.trim(),
        database: 'amceletrica'
    });

    try {
        const queries = [
            "CREATE INDEX idx_osi_idordemservico ON ordemservicoitem(IdOrdemServico);",
            "CREATE INDEX idx_osi_liberado ON ordemservicoitem(Liberado_Engenharia);",
            "CREATE INDEX idx_osi_delete ON ordemservicoitem(D_E_L_E_T_E);",
            "CREATE INDEX idx_osi_codmat ON ordemservicoitem(CodMatFabricante);",
            "CREATE INDEX idx_osi_produto_principal ON ordemservicoitem(ProdutoPrincipal);",
            
            "CREATE INDEX idx_os_idprojeto ON ordemservico(IdProjeto);",
            "CREATE INDEX idx_os_delete ON ordemservico(D_E_L_E_T_E);"
        ];

        for (const q of queries) {
            try {
                console.log('Running:', q);
                await conn.query(q);
                console.log('Success');
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME') {
                    console.log('Index already exists, skipping.');
                } else {
                    console.error('Error:', err.message);
                }
            }
        }
    } catch(e) {
        console.error(e);
    } finally {
        conn.end();
    }
}
run();
