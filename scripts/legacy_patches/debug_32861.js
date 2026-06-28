const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('\n--- CHECKING ordemservicoitem FOR ITEM #62 and #32861 ---');
        const [items] = await conn.execute("SELECT IdOrdemServicoItem, CodMatFabricante, DescResumo FROM ordemservicoitem WHERE IdOrdemServicoItem IN (62, 32861)");
        console.table(items);

        console.log('\n--- CHECKING HISTORY FOR THESE ITEMS ---');
        const [hist] = await conn.execute("SELECT IdOrdemServicoItem, COUNT(*) as count FROM ordemservicoitemcontrole WHERE IdOrdemServicoItem IN (62, 32861) GROUP BY IdOrdemServicoItem");
        console.table(hist);

        console.log('\n--- SEARCHING FOR ITEM 32861 IN ordemservicoitemcontrole BY OTHER FIELDS ---');
        // Search if maybe it's linked by CodMatFabricante or something else
        const [item32861] = await conn.execute("SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = 32861");
        if (item32861.length > 0) {
            const row = item32861[0];
            const [histComp] = await conn.execute("SELECT Processo, QtdeProduzida FROM ordemservicoitemcontrole WHERE CodMatFabricante = ? AND IdOrdemServico = ?", [row.CodMatFabricante, row.IdOrdemServico]);
            console.log(`History for ${row.CodMatFabricante} in OS ${row.IdOrdemServico}:`);
            console.table(histComp);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

check();
