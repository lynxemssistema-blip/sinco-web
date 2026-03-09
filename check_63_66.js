const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSectors() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = "SELECT IdOrdemServicoItem, txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem FROM ordemservicoitem WHERE IdOrdemServicoItem IN (63, 64, 65, 66)";
        const [rows] = await connection.execute(query);
        console.table(rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

checkSectors();
