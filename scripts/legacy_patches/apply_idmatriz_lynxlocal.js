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
        // 1. Inserir a nova conexão na tabela conexoes_bancos
        console.log("Verificando tabela conexoes_bancos...");
        
        // Obter as colunas para garantir o nome correto
        const [columns] = await conn.query('SHOW COLUMNS FROM conexoes_bancos');
        const colNames = columns.map(c => c.Field);
        console.log("Colunas encontradas:", colNames.join(', '));

        // Nome provável das colunas
        const hostCol = colNames.includes('db_host') ? 'db_host' : 'host';
        const userCol = colNames.includes('db_user') ? 'db_user' : 'usuario';
        const passCol = colNames.includes('db_pass') ? 'db_pass' : 'senha';
        const nameCol = colNames.includes('db_name') ? 'db_name' : 'banco';
        const clientCol = colNames.includes('nome_cliente') ? 'nome_cliente' : 'cliente';
        
        // Verificar se já existe
        const [existing] = await conn.query(`SELECT * FROM conexoes_bancos WHERE ${nameCol} = 'mettapaineis'`);
        let newId = null;

        if (existing.length === 0) {
            console.log("Inserindo nova conexão 'mettapaineis'...");
            const [result] = await conn.query(
                `INSERT INTO conexoes_bancos (${clientCol}, ${hostCol}, ${userCol}, ${passCol}, ${nameCol}, ativo) VALUES (?, ?, ?, ?, ?, ?)`,
                ['Metta Paineis', 'mettapaineis.mysql.uhserver.com', 'rubensmetta', 'jHAzhFG848@yN@U', 'mettapaineis', 1]
            );
            newId = result.insertId;
            console.log("Conexão inserida com sucesso. ID:", newId);
        } else {
            newId = existing[0].id || existing[0].Id;
            console.log("Conexão 'mettapaineis' já existe. ID:", newId);
        }

        // 2. Adicionar IdMatriz INT(3) em todas as tabelas do lynxlocal
        console.log("\\nBuscando todas as tabelas no banco lynxlocal...");
        const [tables] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        
        const dbName = process.env.CENTRAL_DB_NAME;
        const tableKey = `Tables_in_${dbName}`;
        
        let countAdded = 0;
        let countSkipped = 0;

        for (const row of tables) {
            const tableName = row[tableKey] || Object.values(row)[0];
            
            // Verificar se IdMatriz já existe
            const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'IdMatriz'`);
            
            if (cols.length === 0) {
                console.log(`Adicionando IdMatriz na tabela: ${tableName}`);
                try {
                    await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN IdMatriz INT(3) NULL`);
                    countAdded++;
                } catch (alterErr) {
                    console.error(`Erro ao alterar tabela ${tableName}:`, alterErr.message);
                }
            } else {
                countSkipped++;
            }
        }
        
        console.log(`\\nResumo: Coluna IdMatriz adicionada em ${countAdded} tabelas. Já existia em ${countSkipped} tabelas.`);

    } catch (e) {
        console.error("Erro geral:", e);
    } finally {
        await conn.end();
    }
}
main();
