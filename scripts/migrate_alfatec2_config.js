const mysql = require('mysql2/promise');

const config = {
    host: 'alfatec2.mysql.uhserver.com',
    user: 'alfateccozinhas',
    password: 'jHAzhFG848@yN@U',
    database: 'alfatec2'
};

async function migrate() {
    console.log('--- MIGRATION: alfatec2.configuracaosistema ---');
    let connection;
    try {
        connection = await mysql.createConnection(config);

        console.log('[1/2] Adicionando coluna RestringirApontamentoSemSaldoAnterior...');
        try {
            await connection.execute(`
                ALTER TABLE configuracaosistema 
                ADD COLUMN RestringirApontamentoSemSaldoAnterior VARCHAR(10) DEFAULT 'Não'
            `);
            console.log('      ✅ Coluna adicionada com sucesso.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('      ⚠️ Coluna já existe.');
            } else {
                throw err;
            }
        }

        console.log('[2/2] Adicionando coluna ProcessosVisiveis...');
        try {
            await connection.execute(`
                ALTER TABLE configuracaosistema 
                ADD COLUMN ProcessosVisiveis TEXT
            `);
            // Set default value for existing record
            await connection.execute(`
                UPDATE configuracaosistema 
                SET ProcessosVisiveis = '["corte","dobra","solda","pintura","montagem"]'
                WHERE ProcessosVisiveis IS NULL
            `);
            console.log('      ✅ Coluna adicionada e inicializada com sucesso.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME') {
                console.log('      ⚠️ Coluna já existe.');
            } else {
                throw err;
            }
        }

        console.log('\n--- MIGRAÇÃO CONCLUÍDA COM SUCESSO ---');

    } catch (error) {
        console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
