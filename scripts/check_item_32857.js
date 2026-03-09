const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sincoweb'
        });

        console.log("Conectado ao banco de dados.");

        const [item] = await connection.execute("SELECT IdOrdemServicoItem, QtdeTotal, txtDobra, DobraTotalExecutado, sttxtDobra FROM ordemservicoitem WHERE IdOrdemServicoItem = 32857");
        console.log("Status detalhado do item 32857:", item[0]);

        await connection.end();
    } catch (error) {
        console.error("Erro na execução:", error);
    }
}

run();
