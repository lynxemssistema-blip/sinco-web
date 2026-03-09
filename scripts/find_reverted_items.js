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

        const [itemDobra] = await connection.execute("SELECT * FROM ordemservicoitem WHERE txtDobra = '1' AND sttxtDobra IS NULL AND DobraTotalExecutado < QtdeTotal AND RealizadoFinalDobra IS NOT NULL");
        console.log("Possible items affected in Dobra:", itemDobra.map(i => i.IdOrdemServicoItem));

        const [itemPintura] = await connection.execute("SELECT * FROM ordemservicoitem WHERE txtPintura = '1' AND sttxtPintura IS NULL AND PinturaTotalExecutado < QtdeTotal AND RealizadoFinalPintura IS NOT NULL");
        console.log("Possible items affected in Pintura:", itemPintura.map(i => i.IdOrdemServicoItem));

        await connection.end();
    } catch (error) {
        console.error("Erro na execução:", error);
    }
}

run();
