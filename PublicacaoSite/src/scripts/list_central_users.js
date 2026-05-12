const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // lynxlocal
    port: process.env.DB_PORT || 3306
};

async function listUsers() {
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log(`Connected to ${dbConfig.database}`);

        const [rows] = await conn.execute('SELECT id, login, superadmin, id_conexao_banco FROM usuarios_central');
        console.log('--- Users in CENTRAL table ---');
        console.table(rows);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (conn) await conn.end();
    }
}

listUsers();
