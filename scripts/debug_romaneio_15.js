const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function main() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Checking romaneioitem for IdRomaneio = 15 ---');
        const [rows] = await connection.execute(
            "SELECT * FROM romaneioitem WHERE IdRomaneio = 15"
        );
        console.table(rows);

        console.log('\n--- Checking viewromaneioitem for IdRomaneio = 15 ---');
        const [viewRows] = await connection.execute(
            "SELECT * FROM viewromaneioitem WHERE IdRomaneio = 15"
        );
        console.table(viewRows);

        if (viewRows.length === 0 && rows.length > 0) {
            console.log('\n[!] Warning: Items exist in table but NOT in view.');
            // Check why view might be filtering
            const [item] = rows;
            console.log('Sample item D_E_L_E_T_E value:', item.D_E_L_E_T_E);

            // Check the join condition in the view
            // viewromaneioitem joins romaneioitem with ordemservicoitem
            console.log('\n--- Checking ordemservicoitem link ---');
            for (const r of rows) {
                const [osRows] = await connection.execute(
                    "SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = ?",
                    [r.IDOrdemServicoITEM]
                );
                console.log(`Item ${r.IdRomaneioItem} -> OS Item ${r.IDOrdemServicoITEM}: ${osRows.length} matches`);
                if (osRows.length > 0) {
                    console.log(`OS Item ${r.IDOrdemServicoITEM} D_E_L_E_T_E:`, osRows[0].D_E_L_E_T_E);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

main();
