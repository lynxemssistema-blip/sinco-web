const mysql = require('mysql2/promise');
require('dotenv').config();

async function describeTable() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('[DB] Describing configuracaosistema...');
        const [rows] = await pool.execute("DESCRIBE configuracaosistema");
        rows.forEach(row => {
            console.log(`${row.Field} (${row.Type})`);
        });
        await pool.end();

    } catch (err) {
        console.error('[DB] Error:', err.message);
    }
}

describeTable();
