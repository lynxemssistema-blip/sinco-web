const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal',
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function deleteTestData() {
    const romaneioId = 18; // ID created in previous step
    console.log(`--- Excluindo Romaneio de Teste (ID: ${romaneioId}) ---`);
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        // 1. Delete Items first (Foreign Key constraint usually, but good practice)
        const [resItems] = await connection.execute(
            "DELETE FROM romaneioitem WHERE IdRomaneio = ?",
            [romaneioId]
        );
        console.log(`   -> Itens excluídos: ${resItems.affectedRows}`);

        // 2. Delete Romaneio
        const [resRom] = await connection.execute(
            "DELETE FROM romaneio WHERE idRomaneio = ?",
            [romaneioId]
        );
        console.log(`   -> Romaneio excluído: ${resRom.affectedRows}`);

        if (resRom.affectedRows > 0) {
            console.log('✅ Limpeza concluída com sucesso.');
        } else {
            console.log('⚠️ Romaneio não encontrado (já foi excluído?).');
        }

    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
    } finally {
        if (connection) await connection.end();
    }
}

deleteTestData();
