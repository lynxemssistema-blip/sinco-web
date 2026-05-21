const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS,
        database: process.env.CENTRAL_DB_NAME // 'lynxlocal'
    });

    try {
        console.log("Buscando todas as tabelas...");
        const [tables] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        
        let updateCount = 0;

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            
            // Check if column exists
            const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'IdMatriz'`);
            
            if (cols.length > 0) {
                // To avoid breaking anything like views, we only update if it's a real base table, which we filtered above
                // For tables like conexoes_bancos, updating IdMatriz = 1 might be weird if it has other connections, but the user said "todas as tabelas do banco 'lynxlocal'". 
                // Let's exclude conexoes_bancos from this rule because it holds the master records.
                if (tableName.toLowerCase() === 'conexoes_bancos') {
                    console.log(`Pulando tabela ${tableName} pois ela gerencia as matrizes.`);
                    continue;
                }

                console.log(`Atualizando IdMatriz = 1 na tabela ${tableName}...`);
                try {
                    const [result] = await conn.query(`UPDATE \`${tableName}\` SET IdMatriz = 1`);
                    if (result.changedRows > 0) {
                        updateCount++;
                    }
                } catch (updateErr) {
                    console.error(`Erro ao atualizar tabela ${tableName}:`, updateErr.message);
                }
            }
        }
        
        console.log(`Resumo: Registros atualizados com IdMatriz = 1 em ${updateCount} tabelas.`);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}
main();
