require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkCols() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
    
    try {
        const [rows] = await conn.execute('SHOW COLUMNS FROM ordemservicoitem LIKE "%TotalExecutado"');
        console.table(rows);
    } catch(err) {
        console.error(err);
    }
    
    conn.end();
}
checkCols().catch(console.error);
