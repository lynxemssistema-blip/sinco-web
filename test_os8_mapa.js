const mysql = require('mysql2/promise');
require('dotenv').config();

async function testQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = `
            SELECT 
                osi.IdOrdemServicoItem, 
                osi.txtCorte, 
                osi.txtDobra, 
                osi.txtSolda, 
                osi.txtPintura, 
                osi.TxtMontagem 
            FROM ordemservicoitem osi 
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico 
            WHERE osi.IdOrdemServico = 8 
            AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*') 
            AND osi.Liberado_engenharia = 'S' 
            AND (
                NULLIF(TRIM(osi.txtCorte), '') = '1' OR 
                NULLIF(TRIM(osi.txtDobra), '') = '1' OR 
                NULLIF(TRIM(osi.txtSolda), '') = '1' OR 
                NULLIF(TRIM(osi.txtPintura), '') = '1'
            )
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens da OS 8 que passam no filtro do MAPA:');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

testQuery();
