const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    let connection;
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'sinco',
            port: process.env.DB_PORT || 3306
        };

        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Add ImagemProduto column if it doesn't exist
        console.log('Checking/Adding ImagemProduto column...');
        try {
            // MySQL 5.0 syntax: ADD COLUMN
            await connection.execute(`
                ALTER TABLE material 
                ADD COLUMN ImagemProduto LONGTEXT DEFAULT NULL
            `);
            console.log('Column ImagemProduto added successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Column ImagemProduto already exists.');
            } else {
                console.error('Error adding column:', err.message);
                throw err;
            }
        }

    } catch (error) {
        console.error('Schema update failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Connection closed.');
        }
    }
}

updateSchema();
