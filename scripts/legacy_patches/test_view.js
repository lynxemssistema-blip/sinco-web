const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await pool.query("SHOW CREATE VIEW viewromaneioitem");
        console.log(rows[0]['Create View']);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
