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

        const [res] = await connection.execute("UPDATE ordemservicoitem SET OrdemServicoItemFinalizado = 'C' WHERE IdOrdemServicoItem = 67");
        console.log("Update executed:", res);

        const [check67] = await connection.execute("SELECT IdOrdemServicoItem, IdOrdemServico, OrdemServicoItemFinalizado FROM ordemservicoitem WHERE IdOrdemServicoItem = 67");
        console.log("Status detalhado do item 67 no banco AGORA:", check67[0]);

        await connection.end();
    } catch (error) {
        console.error("Erro na execução:", error);
    }
}

run();
