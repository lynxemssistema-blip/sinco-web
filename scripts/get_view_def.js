const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function main() {
    const viewName = process.argv[2];
    if (!viewName) {
        console.error('Please provide a view name');
        process.exit(1);
    }

    const connection = await mysql.createConnection(dbConfig);
    try {
        const [rows] = await connection.execute(`SHOW CREATE VIEW ${viewName}`);
        const key = Object.keys(rows[0]).find(k => k.toLowerCase().includes('create'));
        console.log(rows[0][key]);
    } catch (error) {
        try {
            const [rows] = await connection.execute(`SHOW CREATE TABLE ${viewName}`);
            const key = Object.keys(rows[0]).find(k => k.toLowerCase().includes('create'));
            console.log(rows[0][key]);
        } catch (err2) {
            console.error('Error fetching definition:', err2.message);
        }
    } finally {
        await connection.end();
    }
}

main();
