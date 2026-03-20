const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });
async function run() {
    const conn = await mysql.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME});
    const [rows] = await conn.execute("SHOW COLUMNS FROM ordemservicoitempendencia");
    console.log(rows.map(r=>r.Field).filter(f=>f.toLowerCase().includes('data')));
    process.exit(0);
}
run();
