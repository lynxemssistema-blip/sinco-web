const mysql = require('mysql2/promise');
require('dotenv').config();

async function findPHA() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = `
            SELECT IdOrdemServicoItem, IdOrdemServico, txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem 
            FROM ordemservicoitem 
            WHERE CodMatFabricante = 'PHA84411'
            AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens PHA84411:');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findPHA();
