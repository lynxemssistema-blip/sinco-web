
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

async function checkData() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
            user: process.env.DB_USER || 'lynxlocal',
            password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
            database: process.env.DB_NAME || 'lynxlocal'
        });

        console.log('Connected to DB');

        const [rows] = await pool.query("SELECT idRomaneio, Descricao, D_E_L_E_T_E FROM romaneio ORDER BY idRomaneio DESC LIMIT 10");
        console.log('Romaneio records:', rows);

        pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
