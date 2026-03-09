require('dotenv').config({ path: '../.env' }); // try one level up if run from scripts
const pool = require('../src/config/db'); // assuming run from scripts folder

async function createMatrizTable() {
    try {
        console.log("Starting to create 'matriz' table...");
        const query = `
            CREATE TABLE IF NOT EXISTS matriz (
                Id INT PRIMARY KEY,
                Descricao VARCHAR(255) NOT NULL
            );
        `;

        await pool.query(query);
        console.log("Table 'matriz' created successfully or already exists.");

        // Add a default entry for alfatec if it doesn't exist
        const insertQuery = `
            INSERT IGNORE INTO matriz (Id, Descricao) VALUES (1, 'alfatec');
        `;
        await pool.query(insertQuery);
        console.log("Default record (Id: 1, Descricao: 'alfatec') ensured.");

    } catch (error) {
        console.error("Error creating 'matriz' table:", error);
    } finally {
        process.exit(0);
    }
}

createMatrizTable();
