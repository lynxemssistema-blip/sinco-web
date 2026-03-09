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

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if ProcessosVisiveis column exists in configuracaosistema
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema' AND COLUMN_NAME = 'ProcessosVisiveis'
        `, [dbConfig.database]);

        if (columns.length === 0) {
            console.log('Adding ProcessosVisiveis column to configuracaosistema...');
            await connection.execute(`
                ALTER TABLE configuracaosistema 
                ADD COLUMN ProcessosVisiveis TEXT DEFAULT NULL COMMENT 'JSON array of visible processes'
            `);
            console.log('Column ProcessosVisiveis added successfully.');
        } else {
            console.log('Column ProcessosVisiveis already exists.');
        }

        console.log('Schema update complete.');

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
