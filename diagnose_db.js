const mysql = require('mysql2/promise');
require('dotenv').config();

const CENTRAL_DB_CONFIG = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal',
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

(async () => {
    let conn;
    try {
        console.log('--- Connecting to LYNXLOCAL (Default) ---');
        conn = await mysql.createConnection(CENTRAL_DB_CONFIG);

        // 1. List Users in Lynxlocal
        const [lynxUsers] = await conn.execute("SELECT idUsuario, NomeCompleto, Login FROM usuario LIMIT 5");
        console.log('Listing Users in Lynxlocal (First 5):');
        console.table(lynxUsers);

        // 2. Find Construcare Config
        console.log('\n--- Searching for "Construcare" Database Config ---');
        const [dbRows] = await conn.execute("SELECT * FROM conexoes_bancos WHERE nome_cliente LIKE '%construcare%' LIMIT 1");

        if (dbRows.length === 0) {
            console.error('❌ Construcare database config NOT FOUND in conexoes_bancos!');
            process.exit(1);
        }

        const dbConfig = dbRows[0];
        console.log('Found Config:', {
            Host: dbConfig.db_host,
            User: dbConfig.db_user,
            DB: dbConfig.db_name
        });

        await conn.end(); // Close Central connection

        // 3. Connect to Construcare
        console.log('\n--- Connecting to CONSTRUCARE ---');
        const tenantConn = await mysql.createConnection({
            host: dbConfig.db_host,
            user: dbConfig.db_user,
            password: dbConfig.db_pass,
            database: dbConfig.db_name,
            port: dbConfig.db_port || 3306
        });

        // 4. List Users in Construcare
        const [construcareUsers] = await tenantConn.execute("SELECT idUsuario, NomeCompleto, Login FROM usuario LIMIT 5");
        console.log('Listing Users in Construcare (First 5):');
        console.table(construcareUsers);

        await tenantConn.end();
        console.log('\n--- Diagnosis Complete ---');

    } catch (error) {
        console.error('Error during diagnosis:', error);
        if (conn) await conn.end();
    }
})();
