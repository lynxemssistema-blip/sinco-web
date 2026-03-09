const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkView() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('Connected to DB...');
        const [rows] = await pool.execute("DESCRIBE viewordemservicoitempendencia");

        console.log('Columns in viewordemservicoitempendencia:');
        rows.forEach(r => console.log(r.Field));

        pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkView();
