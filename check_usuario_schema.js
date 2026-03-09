const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const centralConfig = {
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal'
    };

    let tenantConfig = null;
    try {
        const centralConn = await mysql.createConnection(centralConfig);
        const [rows] = await centralConn.query("SELECT * FROM conexoes_bancos WHERE db_name = 'construcare' AND ativo = 1");
        if (rows.length > 0) {
            const config = rows[0];
            tenantConfig = { host: config.db_host, user: config.db_user, password: config.db_pass, database: config.db_name };
        }
        await centralConn.end();
    } catch (err) { console.error(err); return; }

    try {
        const connection = await mysql.createConnection(tenantConfig);
        const [cols] = await connection.query('DESCRIBE usuario');
        console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
        await connection.end();
    } catch (err) { console.error(err); }
}

checkSchema();
