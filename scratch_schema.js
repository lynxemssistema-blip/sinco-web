const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log("=== COLUMNS IN metta.usuario ===");
        const [mettaCols] = await connection.execute(`SHOW COLUMNS FROM metta.usuario`);
        console.log(mettaCols.map(c => c.Field).join(', '));

        console.log("\n=== COLUMNS IN lynxlocal.usuarios_central ===");
        const [centralCols] = await connection.execute(`SHOW COLUMNS FROM lynxlocal.usuarios_central`);
        console.log(centralCols.map(c => c.Field).join(', '));
    } catch (e) {
        console.error(e.message);
    } finally {
        await connection.end();
    }
}

checkSchema();
