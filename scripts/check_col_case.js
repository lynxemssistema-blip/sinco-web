const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306
    });
    try {
        const [cols] = await pool.execute("SHOW COLUMNS FROM planodecorte LIKE '%nviad%'");
        console.log('Column definition:', JSON.stringify(cols));
        
        const [row] = await pool.execute("SELECT EnviadoCorte FROM planodecorte WHERE IdPlanodecorte = 2 LIMIT 1");
        console.log('Result keys:', Object.keys(row[0]));
        console.log('Value:', JSON.stringify(row[0]));
    } finally { await pool.end(); }
}
main().catch(console.error);
