const mysql = require('mysql2/promise');
require('dotenv').config();

async function findFinished() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = "SELECT IdOrdemServicoItem, OrdemServicoItemFinalizado, CorteTotalExecutar, DobraTotalExecutar, SoldaTotalExecutar, PinturaTotalExecutar, MontagemTotalExecutar FROM ordemservicoitem WHERE OrdemServicoItemFinalizado = 'C' LIMIT 10";

        const [rows] = await connection.execute(query);
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findFinished();
