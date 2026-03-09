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

        const [item] = await connection.execute("SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = 32857");
        console.log("Full details of item 32857:");
        console.log(item[0]);

        await connection.end();
    } catch (error) {
        console.error("Erro na execução:", error);
    }
}

run();
