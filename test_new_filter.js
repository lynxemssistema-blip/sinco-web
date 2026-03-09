const mysql = require('mysql2/promise');
require('dotenv').config();

async function check91() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        // Updated filter logic from server.js
        const query = `
            SELECT IdOrdemServicoItem, IdOrdemServico, CodMatFabricante, TxtMontagem
            FROM ordemservicoitem 
            WHERE IdOrdemServicoItem = 91
            AND (
                NULLIF(TRIM(txtCorte), '') = '1' OR 
                NULLIF(TRIM(txtDobra), '') = '1' OR 
                NULLIF(TRIM(txtSolda), '') = '1' OR 
                NULLIF(TRIM(txtPintura), '') = '1' OR 
                NULLIF(TRIM(TxtMontagem), '') = '1'
            )
        `;

        const [rows] = await connection.execute(query);
        if (rows.length > 0) {
            console.log('Item 91 AINDA PASSA pelo filtro robusto!');
            console.table(rows);
        } else {
            console.log('Item 91 agora está OCULTO pelo filtro robusto.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

check91();
