require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    
    try {
        const [rows] = await pool.query("DESCRIBE ordemservicoitem");
        console.log(rows.filter(r => r.Field.includes('Qtde')).map(r => r.Field));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
