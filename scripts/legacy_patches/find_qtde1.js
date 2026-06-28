const mysql = require('mysql2/promise');
require('dotenv').config();

async function findQtde1() {
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
                CodMatFabricante, 
                QtdeTotal, 
                txtCorte, 
                txtDobra, 
                txtSolda, 
                txtPintura, 
                TxtMontagem 
            FROM ordemservicoitem 
            WHERE IdOrdemServico = 8 
            AND QtdeTotal = 1
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens na OS 8 com QtdeTotal = 1:');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findQtde1();
