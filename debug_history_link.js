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
        console.log('--- SEARCHING FOR VIEWS ---');
        const [views] = await conn.execute("SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW' AND Tables_in_" + process.env.DB_NAME + " LIKE '%ordemservicoitem%'");
        console.table(views);

        console.log('\n--- CHECKING ordemservicoitem FOR ITEM #62 ---');
        const [item] = await conn.execute("SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = 62");
        console.table(item);

        if (item.length > 0) {
            const row = item[0];
            console.log('\n--- SEARCHING HISTORY FOR ITEM #62 ---');
            // Try different possible link fields
            const possibleLinks = ['IdOrdemServicoItem', 'IdTag', 'Tag', 'IdOrdemServico'];
            for (const link of possibleLinks) {
                if (row[link]) {
                    const [hist] = await conn.execute(`SELECT COUNT(*) as count, Processo FROM ordemservicoitemcontrole WHERE ${link} = ? GROUP BY Processo`, [row[link]]);
                    console.log(`History count by ${link} (${row[link]}):`);
                    console.table(hist);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

check();
