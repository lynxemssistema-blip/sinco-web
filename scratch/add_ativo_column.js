require('dotenv').config();
const mysql = require('mysql2/promise');

async function alterSchema() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS,
        database: process.env.CENTRAL_DB_NAME
    });

    try {
        await conn.execute('ALTER TABLE usuarios_central ADD COLUMN ativo TINYINT(1) DEFAULT 1 AFTER superadmin');
        console.log("Coluna 'ativo' adicionada com sucesso.");
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log("Coluna 'ativo' já existe.");
        } else {
            console.error(err);
        }
    } finally {
        await conn.end();
    }
}
alterSchema();
