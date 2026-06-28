const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDb() {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.CENTRAL_DB_HOST,
            user: process.env.CENTRAL_DB_USER,
            password: process.env.CENTRAL_DB_PASS,
            database: process.env.CENTRAL_DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log("Excluindo 'construcare'...");
        await pool.query("DELETE FROM conexoes_bancos WHERE nome_cliente = 'construcare'");
        
        console.log("Inserindo 'alfatec2'...");
        await pool.query(`
            INSERT INTO conexoes_bancos (nome_cliente, db_host, db_user, db_pass, db_name, ativo) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, ['alfatec2', 'alfatec2.mysql.uhserver.com', 'alfateccozinhas', 'jHAzhFG848@yN@U', 'alfatec2', 1]);

        console.log("Operação concluída com sucesso.");
        
        const [data] = await pool.query("SELECT * FROM conexoes_bancos");
        console.log("\nDados atualizados em conexoes_bancos:");
        console.table(data);
        
        process.exit(0);
    } catch (err) {
        console.error("Erro:", err);
        process.exit(1);
    }
}

updateDb();
