/**
 * Script: Adicionar coluna MaxRegistros na tabela configuracaosistema
 * Executar uma única vez para migrar o schema do banco.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function run() {
    // Try to use the same connection logic as the server
    const dbConfig = {
        host: process.env.CENTRAL_DB_HOST || process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || process.env.DB_USER,
        password: process.env.CENTRAL_DB_PASSWORD || process.env.DB_PASSWORD,
        database: process.env.CENTRAL_DB_NAME || process.env.DB_NAME,
        port: parseInt(process.env.CENTRAL_DB_PORT || process.env.DB_PORT || '3306'),
        ssl: false,
    };

    console.log(`Conectando ao banco: ${dbConfig.host} / ${dbConfig.database}`);

    const conn = await mysql.createConnection(dbConfig);

    try {
        // Check if column already exists
        const [cols] = await conn.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema' AND COLUMN_NAME = 'MaxRegistros'
        `, [dbConfig.database]);

        if (cols.length > 0) {
            console.log('✅ Coluna MaxRegistros já existe. Nenhuma alteração necessária.');
        } else {
            await conn.execute(`
                ALTER TABLE configuracaosistema 
                ADD COLUMN MaxRegistros INT NOT NULL DEFAULT 500 
                COMMENT 'Limite máximo de registros retornados nas listagens'
            `);
            console.log('✅ Coluna MaxRegistros adicionada com sucesso! (padrão: 500)');
        }

        // Show current config row
        const [rows] = await conn.execute('SELECT id, MaxRegistros, RestringirApontamentoSemSaldoAnterior FROM configuracaosistema LIMIT 3');
        console.log('Linhas da tabela:', rows);

    } finally {
        await conn.end();
    }
}

run().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
