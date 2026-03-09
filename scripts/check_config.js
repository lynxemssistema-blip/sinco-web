const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkConfig() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('[DB] Checking config key...');
        const [rows] = await pool.execute("SELECT * FROM configuracaosistema WHERE chave = 'EnderecoPastaRaizRomaneio'");
        if (rows.length > 0) {
            console.log('[DB] Found:', rows[0]);
        } else {
            console.log('[DB] NOT FOUND. Inserting default...');
            await pool.execute("INSERT INTO configuracaosistema (chave, valor, descricao, tipo, data_criacao) VALUES (?, ?, ?, ?, NOW())",
                ['EnderecoPastaRaizRomaneio', 'C:\\Romaneios', 'Caminho raiz para salvar PDFs dos romaneios', 'caminho']
            );
            console.log('[DB] Default inserted.');
        }
        await pool.end();

    } catch (err) {
        console.error('[DB] Error:', err.message);
    }
}

checkConfig();
