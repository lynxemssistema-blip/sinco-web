const mysql = require('mysql2/promise');
require('dotenv').config();

const conf = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal',
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function test() {
    try {
        const conn = await mysql.createConnection(conf);

        console.log('--- Checking View: viewordemservicoitemstatussetor ---');
        const [viewRows] = await conn.execute("SHOW FULL TABLES WHERE Table_Type = 'VIEW' AND Tables_in_lynxlocal = 'viewordemservicoitemstatussetor'");
        console.log('VIEW EXISTS:', viewRows.length > 0);

        if (viewRows.length > 0) {
            const [cols] = await conn.execute('DESCRIBE viewordemservicoitemstatussetor');
            console.log('COLUMNS:');
            cols.forEach(c => console.log(c.Field));
        }

        console.log('\n--- Checking ordemservicoitem Columns ---');
        const [itemCols] = await conn.execute('DESCRIBE ordemservicoitem');
        itemCols.forEach(c => {
            if (['OrdemServicoItemFinalizado', 'ProdutoPrincipal'].includes(c.Field)) {
                console.log('Column Found:', c.Field);
            }
        });

        await conn.end();
    } catch (e) {
        console.error(e);
    }
}
test();
