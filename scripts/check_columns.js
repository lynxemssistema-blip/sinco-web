const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306
};

async function checkColumns() {
    let connection;
    try {
        console.log('Connecting to DB:', dbConfig.database);
        connection = await mysql.createConnection(dbConfig);
        const [cols] = await connection.execute('DESCRIBE ordemservicoitem');
        console.log('Columns in ordemservicoitem:');
        console.log(cols.map(c => c.Field).filter(f => f.toLowerCase().includes('txt')).join(', '));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkColumns();
