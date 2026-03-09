const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const conn = await mysql.createConnection(process.env.DB_URL || {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Check if column exists
        const [rows] = await conn.execute("SHOW COLUMNS FROM configuracaosistema LIKE 'RestringirApontamentoSemSaldoAnterior'");
        if (rows.length === 0) {
            await conn.execute("ALTER TABLE configuracaosistema ADD COLUMN RestringirApontamentoSemSaldoAnterior VARCHAR(3) DEFAULT 'Não'");
            console.log('Coluna RestringirApontamentoSemSaldoAnterior adicionada com sucesso!');
        } else {
            console.log('Coluna RestringirApontamentoSemSaldoAnterior já existe.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
})();
