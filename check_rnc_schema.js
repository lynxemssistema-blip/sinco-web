const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    // 1. Connect to Central DB (lynxlocal)
    const centralConfig = {
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal'
    };

    let tenantConfig = null;

    try {
        console.log('--- Connecting to Central DB (lynxlocal) ---');
        const centralConn = await mysql.createConnection(centralConfig);
        const [rows] = await centralConn.query(
            "SELECT * FROM conexoes_bancos WHERE db_name = 'construcare' AND ativo = 1"
        );

        if (rows.length > 0) {
            const config = rows[0];
            tenantConfig = {
                host: config.db_host,
                user: config.db_user,
                password: config.db_pass,
                database: config.db_name
            };
            console.log(`Found tenant config for ${config.db_name}`);
        } else {
            console.error('CONSTRUCARE config not found in central DB.');
            await centralConn.end();
            return;
        }
        await centralConn.end();
    } catch (err) {
        console.error('Error connecting to central DB:', err);
        return;
    }

    // 2. Connect to Tenant DB (CONSTRUCARE)
    try {
        console.log('\n--- Connecting to CONSTRUCARE ---');
        const connection = await mysql.createConnection(tenantConfig);

        const tablesToCheck = ['setor', 'tipotarefa', 'usuario', 'romaneio', 'romaneioitem', 'ordemservicoitempendencia'];

        for (const table of tablesToCheck) {
            try {
                const [cols] = await connection.query(`DESCRIBE ${table}`);
                console.log(`\nTable: ${table}`);
                console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
            } catch (err) {
                console.log(`\nTable: ${table} NOT FOUND or error: ${err.message}`);
            }
        }

        await connection.end();
    } catch (err) {
        console.error('Error connecting to tenant DB:', err);
    }
}

checkSchema();
