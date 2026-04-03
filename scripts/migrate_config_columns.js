/**
 * Script direto: Adicionar PlanoCorteFiltroDC e MaxRegistros
 * Usa exatamente as mesmas credenciais que o servidor usa
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
    const config = {
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
        port: 3306,
    };

    console.log(`Conectando: ${config.host} / ${config.database}`);
    const conn = await mysql.createConnection(config);

    try {
        // Verificar estrutura atual
        const [cols] = await conn.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema'`,
            [config.database]
        );
        console.log('Colunas existentes:', cols.map(c => c.COLUMN_NAME).join(', '));

        // Adicionar PlanoCorteFiltroDC
        const hasPCFDC = cols.some(c => c.COLUMN_NAME === 'PlanoCorteFiltroDC');
        if (!hasPCFDC) {
            await conn.query(
                `ALTER TABLE \`configuracaosistema\` ADD COLUMN \`PlanoCorteFiltroDC\` VARCHAR(20) NOT NULL DEFAULT 'corte'`
            );
            console.log('✅ PlanoCorteFiltroDC adicionada');
        } else {
            console.log('ℹ️  PlanoCorteFiltroDC já existe');
        }

        // Adicionar MaxRegistros
        const hasMR = cols.some(c => c.COLUMN_NAME === 'MaxRegistros');
        if (!hasMR) {
            await conn.query(
                `ALTER TABLE \`configuracaosistema\` ADD COLUMN \`MaxRegistros\` INT NOT NULL DEFAULT 500`
            );
            console.log('✅ MaxRegistros adicionada');
        } else {
            console.log('ℹ️  MaxRegistros já existe');
        }

        // Confirmar resultado
        const [rows] = await conn.execute(
            'SELECT id, PlanoCorteFiltroDC, MaxRegistros FROM configuracaosistema LIMIT 5'
        );
        console.log('\nRegistros na tabela após migração:');
        console.table(rows);

        // Buscar tenants e aplicar em cada banco deles também
        try {
            const [tenants] = await conn.execute(
                `SELECT db_name, db_host, db_user, db_password FROM clientes 
                 WHERE ativo = 1 AND db_name IS NOT NULL AND db_name != '' AND db_name != ?`,
                [config.database]
            );
            console.log(`\n${tenants.length} tenants encontrados para processar...`);

            for (const t of tenants) {
                try {
                    const tc = await mysql.createConnection({
                        host: t.db_host || config.host,
                        user: t.db_user || config.user,
                        password: t.db_password || config.password,
                        database: t.db_name,
                        port: 3306,
                    });

                    const [tcols] = await tc.execute(
                        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema'`,
                        [t.db_name]
                    );
                    const tExisting = tcols.map(c => c.COLUMN_NAME);

                    if (!tExisting.includes('PlanoCorteFiltroDC')) {
                        await tc.query(`ALTER TABLE \`configuracaosistema\` ADD COLUMN \`PlanoCorteFiltroDC\` VARCHAR(20) NOT NULL DEFAULT 'corte'`);
                        console.log(`  [${t.db_name}] ✅ PlanoCorteFiltroDC adicionada`);
                    }
                    if (!tExisting.includes('MaxRegistros')) {
                        await tc.query(`ALTER TABLE \`configuracaosistema\` ADD COLUMN \`MaxRegistros\` INT NOT NULL DEFAULT 500`);
                        console.log(`  [${t.db_name}] ✅ MaxRegistros adicionada`);
                    }
                    await tc.end();
                } catch (te) {
                    console.log(`  [${t.db_name}] ⚠️  Erro: ${te.message}`);
                }
            }
        } catch (te) {
            console.log('Tabela clientes não encontrada — apenas banco principal migrado.');
        }

    } finally {
        await conn.end();
    }

    console.log('\n✅ Migração concluída!');
}

main().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
