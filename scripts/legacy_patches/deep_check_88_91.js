const mysql = require('mysql2/promise');
require('dotenv').config();

async function deepCheck() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = "SELECT IdOrdemServicoItem, HEX(txtCorte) as hCorte, HEX(txtDobra) as hDobra, HEX(txtSolda) as hSolda, HEX(txtPintura) as hPintura, HEX(TxtMontagem) as hMontagem FROM ordemservicoitem WHERE IdOrdemServicoItem IN (88, 89, 90, 91)";
        const [rows] = await connection.execute(query);
        console.table(rows);
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

deepCheck();
