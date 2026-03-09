require('dotenv').config();
const mysql = require('mysql2/promise');

async function execute() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Buscando todas as tabelas do banco de dados...');

        const [tables] = await connection.execute(
            `SELECT TABLE_NAME 
             FROM information_schema.tables 
             WHERE TABLE_SCHEMA = ?`,
            [process.env.DB_NAME]
        );

        // Tabelas do sistema que não devem receber a coluna multi-tenant
        const ignoredTables = ['matriz', 'usuarios_central', 'conexoes_bancos'];

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const row of tables) {
            const tableName = row.TABLE_NAME;

            if (ignoredTables.includes(tableName)) {
                console.log(`[IGNORADA] Tabela de sistema: ${tableName}`);
                skipCount++;
                continue;
            }

            try {
                // Tenta adicionar a coluna (vai falhar se já existir, o que é seguro)
                await connection.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN IdMatriz INT;`);

                // Tenta adicionar um índice para melhorar as buscas futuras por tenant
                try {
                    await connection.execute(`ALTER TABLE \`${tableName}\` ADD INDEX idx_idmatriz (IdMatriz);`);
                } catch (idxError) {
                    // Ignora erro de índice já existente
                    if (idxError.code !== 'ER_DUP_KEYNAME') {
                        console.log(`  - Aviso ao criar índice em ${tableName}: ${idxError.message}`);
                    }
                }

                console.log(`[SUCESSO] Coluna 'IdMatriz' adicionada em: ${tableName}`);
                successCount++;
            } catch (alterError) {
                if (alterError.code === 'ER_DUP_FIELDNAME') {
                    console.log(`[PULADA] A tabela '${tableName}' já possui a coluna 'IdMatriz'.`);
                    skipCount++;
                } else {
                    console.error(`[ERRO] Falha ao alterar a tabela '${tableName}':`, alterError.message);
                    errorCount++;
                }
            }
        }

        console.log('\n=======================================');
        console.log('RESUMO DA EXECUÇÃO:');
        console.log(`- Tabelas Alteradas: ${successCount}`);
        console.log(`- Tabelas Ignoradas/Puladas: ${skipCount}`);
        console.log(`- Erros: ${errorCount}`);
        console.log('=======================================');

    } catch (error) {
        console.error('Erro crítico na execução:', error);
    } finally {
        await connection.end();
    }
}

execute();
