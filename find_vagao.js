const mysql = require('mysql2/promise');
require('dotenv').config();

async function findVagao() {
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
                IdOrdemServicoItem, 
                IdOrdemServico, 
                DescResumo, 
                CodMatFabricante, 
                QtdeTotal, 
                txtCorte, 
                txtDobra, 
                txtSolda, 
                txtPintura, 
                TxtMontagem 
            FROM ordemservicoitem 
            WHERE DescResumo LIKE '%VAGÃO%' 
            OR CodMatFabricante = 'PHA84411'
            LIMIT 50
        `;

        const [rows] = await connection.execute(query);
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findVagao();
