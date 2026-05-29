/**
 * create_sync_history_table.js
 * Cria a tabela sinco_sync_historico no banco lynxlocal para auditoria.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'lynxlocal',
        port: parseInt(process.env.DB_PORT || '3306')
    });

    await conn.execute(`
        CREATE TABLE IF NOT EXISTS sinco_sync_historico (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            data_execucao DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            usuario       VARCHAR(100) NOT NULL DEFAULT 'superadmin',
            banco_origem  VARCHAR(100),
            banco_destino VARCHAR(100),
            tipo_acao     VARCHAR(50),
            descricao     TEXT,
            sql_executado LONGTEXT     NOT NULL,
            status        ENUM('ok', 'erro') NOT NULL DEFAULT 'ok',
            mensagem_erro TEXT,
            INDEX idx_data          (data_execucao),
            INDEX idx_banco_destino (banco_destino),
            INDEX idx_status        (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Tabela sinco_sync_historico criada/verificada no banco lynxlocal');
    await conn.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
