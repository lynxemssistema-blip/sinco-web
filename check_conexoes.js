const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    try {
        const pool = mysql.createPool({
            host: process.env.CENTRAL_DB_HOST,
            user: process.env.CENTRAL_DB_USER,
            password: process.env.CENTRAL_DB_PASS,
            database: process.env.CENTRAL_DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [rows] = await pool.query("DESCRIBE conexoes_bancos");
        console.table(rows);
        
        const [data] = await pool.query("SELECT * FROM conexoes_bancos");
        console.log("\nCurrent Data in conexoes_bancos:");
        console.table(data);
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkSchema();
