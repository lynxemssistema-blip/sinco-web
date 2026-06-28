require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'sinco_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function testUpdate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Get current config
        const [rows] = await connection.execute('SELECT ProcessosVisiveis FROM configuracaosistema LIMIT 1');
        console.log('Current Config:', rows[0]);

        // 2. Update config
        const newVal = JSON.stringify(['corte', 'dobra']);
        console.log('Updating to:', newVal);

        await connection.execute('UPDATE configuracaosistema SET ProcessosVisiveis = ? WHERE idConfiguracaoSistema = 1', [newVal]);

        // 3. Verify update
        const [rows2] = await connection.execute('SELECT ProcessosVisiveis FROM configuracaosistema LIMIT 1');
        console.log('New Config:', rows2[0]);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testUpdate();
