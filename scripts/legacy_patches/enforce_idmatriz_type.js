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
        
        let alteredCount = 0;

        for (const row of tables) {
            const tableName = Object.values(row)[0];
            
            // Check the column
            const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'IdMatriz'`);
            
            if (cols.length > 0) {
                const colType = cols[0].Type.toLowerCase();
                // Ensure it's INT(3) and also update NULLs to 1 (since lynxlocal ID is 1)
                
                if (!colType.includes('int(3)')) {
                    console.log(`Alterando tipo de IdMatriz na tabela ${tableName} de ${colType} para INT(3)...`);
                    await conn.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN IdMatriz INT(3)`);
                    alteredCount++;
                }

                // Update rows where IdMatriz is NULL to 1 (lynxlocal)
                // Commented out the update for now, just logging
                // await conn.query(`UPDATE \`${tableName}\` SET IdMatriz = 1 WHERE IdMatriz IS NULL`);
            }
        }
        
        console.log(`Resumo: Alterado o tipo da coluna em ${alteredCount} tabelas.`);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}
main();
