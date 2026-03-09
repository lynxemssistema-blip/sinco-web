const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.execute("SHOW TABLES LIKE 'viewordemservicoitempendencia'");
        console.log('VIEW EXISTS:', rows.length > 0);

        if (rows.length > 0) {
            const [cols] = await pool.execute('DESCRIBE viewordemservicoitempendencia');
            console.log('COLUMNS:', JSON.stringify(cols, null, 2));
        } else {
            const [cols] = await pool.execute('DESCRIBE ordemservicoitempendencia');
            console.log('FALLBACK TABLE COLUMNS:', JSON.stringify(cols, null, 2));
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}

run();
