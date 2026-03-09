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

        const tables = ['ordemservico', 'tags', 'projetos'];
        for (const table of tables) {
            console.log(`\n--- DESCRIBE ${table} ---`);
            const [cols] = await conn.execute(`DESCRIBE ${table}`);
            cols.forEach(c => {
                if (/finalizado|data|status|situacao/i.test(c.Field)) {
                    console.log('Column Found:', c.Field);
                }
            });
        }

        await conn.end();
    } catch (e) {
        console.error(e);
    }
}
test();
