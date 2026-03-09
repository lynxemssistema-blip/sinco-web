const mysql = require('mysql2/promise');
require('dotenv').config();

async function findPatterns() {
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
                txtCorte, CorteTotalExecutar, 
                txtDobra, DobraTotalExecutar, 
                txtSolda, SoldaTotalExecutar, 
                txtPintura, PinturaTotalExecutar, 
                TxtMontagem, MontagemTotalExecutar 
            FROM ordemservicoitem 
            WHERE 
                (CorteTotalExecutar > 0 OR DobraTotalExecutar > 0 OR SoldaTotalExecutar > 0 OR PinturaTotalExecutar > 0 OR MontagemTotalExecutar > 0)
            LIMIT 20
        `;

        const [rows] = await connection.execute(query);
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findPatterns();
