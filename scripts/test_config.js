const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'Mec@1984#',
        database: process.env.DB_NAME || 'lynxlocal'
    });
    const [rows] = await pool.query('SELECT * FROM configuracaosistema LIMIT 1');
    console.log(JSON.stringify(rows[0], null, 2));
    process.exit(0);
}
run();
