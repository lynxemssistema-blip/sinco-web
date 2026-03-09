const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

async function checkTables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal'
    });

    try {
        console.log("Checking tables...");
        const [tables] = await connection.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log("Tables found:", tableNames);

        if (tableNames.includes('romaneio')) {
            const [columns] = await connection.query("DESCRIBE romaneio");
            console.log("\nStructure of 'romaneio':", columns.map(c => `${c.Field} (${c.Type})`));
        } else {
            console.log("\nTable 'romaneio' DOES NOT EXIST.");
        }

        if (tableNames.includes('configuracaosistema')) {
            const [columns] = await connection.query("DESCRIBE configuracaosistema");
            console.log("\nStructure of 'configuracaosistema':", columns.map(c => `${c.Field} (${c.Type})`));

            const [rows] = await connection.query("SELECT * FROM configuracaosistema LIMIT 1");
            console.log("\nContent of 'configuracaosistema':", rows);
        } else {
            console.log("\nTable 'configuracaosistema' DOES NOT EXIST.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await connection.end();
    }
}

checkTables();
