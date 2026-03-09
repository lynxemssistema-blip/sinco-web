const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.DB_USER || 'lynxlocal',
    password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.DB_NAME || 'lynxlocal',
    port: 3306
};

async function checkTable() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        console.log('Checking table pessoajuridica...');
        const [cols] = await connection.execute('DESCRIBE pessoajuridica');
        console.log('Columns:', cols.map(c => c.Field).join(', '));

        const [rows] = await connection.execute("SELECT COUNT(*) as total FROM pessoajuridica WHERE D_E_L_E_T_E != '*' OR D_E_L_E_T_E IS NULL");
        console.log('Count (active):', rows[0].total);

        const [sample] = await connection.execute("SELECT D_E_L_E_T_E FROM pessoajuridica LIMIT 10");
        console.log('Sample D_E_L_E_T_E:', sample);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkTable();
