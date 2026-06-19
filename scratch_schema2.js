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
        console.log("=== TABLES IN lynxlocal ===");
        const [tables] = await connection.execute(`SHOW TABLES`);
        console.log(tables.map(t => Object.values(t)[0]).join(', '));
        
        // Se houver uma tabela conexoes ou empresas
        if (tables.some(t => Object.values(t)[0] === 'conexoes')) {
            const [conexoes] = await connection.execute(`SELECT * FROM conexoes`);
            console.log("\n=== CONEXOES ===");
            console.log(conexoes);
        }
    } catch (e) {
        console.error(e.message);
    } finally {
        await connection.end();
    }
}

checkSchema();
