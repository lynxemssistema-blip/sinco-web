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
        console.log('Alterando coluna Id da tabela matriz para AUTO_INCREMENT...');
        await connection.execute(`ALTER TABLE matriz MODIFY COLUMN Id INT AUTO_INCREMENT;`);
        console.log('Coluna alterada com sucesso!');
    } catch (error) {
        console.error('Erro ao alterar tabela matriz:', error);
    } finally {
        await connection.end();
    }
}

execute();
