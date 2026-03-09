const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function updateConfig() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal'
    });

    try {
        const key = 'EnderecoPastaRaizRomaneio';
        const value = 'G:\\Meu Drive\\01-Romaneio';
        const desc = 'Caminho raiz para salvar pastas de romaneio';

        // Check if exists
        const [rows] = await connection.query("SELECT * FROM configuracaosistema WHERE chave = ?", [key]);

        if (rows.length === 0) {
            console.log(`Inserting configuration: ${key}`);
            await connection.query(
                "INSERT INTO configuracaosistema (chave, valor, descricao, tipo) VALUES (?, ?, ?, 'caminho')",
                [key, value, desc]
            );
            console.log("Inserted successfully.");
        } else {
            console.log(`Configuration ${key} already exists. Updating value...`);
            await connection.query(
                "UPDATE configuracaosistema SET valor = ? WHERE chave = ?",
                [value, key]
            );
            console.log("Updated successfully.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await connection.end();
    }
}

updateConfig();
