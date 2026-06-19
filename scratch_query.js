const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("=== CONEXOES_BANCOS ===");
        const [conexoes] = await connection.execute(`SELECT * FROM conexoes_bancos`);
        console.log(conexoes);

        console.log("\n=== COLUMNS IN lynxlocal.usuarios_central ===");
        const [centralCols] = await connection.execute(`SHOW COLUMNS FROM lynxlocal.usuarios_central`);
        console.log(centralCols.map(c => c.Field).join(', '));
        
        console.log("\n=== COLUMNS IN lynxlocal.usuario ===");
        const [usuarioCols] = await connection.execute(`SHOW COLUMNS FROM lynxlocal.usuario`);
        console.log(usuarioCols.map(c => c.Field).join(', '));
    } catch (e) {
        console.error(e.message);
    } finally {
        await connection.end();
    }
}

checkSchema();
