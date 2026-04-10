require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    const [rows] = await pool.execute('SHOW COLUMNS FROM usuario');
    rows.forEach(r => console.log(r.Field + ' | ' + r.Type));
    pool.end();
})();
