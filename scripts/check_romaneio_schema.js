require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.DB_USER || 'lynxlocal',
    password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.DB_NAME || 'lynxlocal',
    port: 3306
});

async function checkSchema() {
    try {
        const [columns] = await pool.execute("DESCRIBE romaneio");
        console.log("Table 'romaneio' columns:");
        const columnNames = columns.map(c => c.Field);
        console.log(columnNames.join(', '));

        const required = ['endereco', 'numero', 'bairro', 'complemento', 'cidade', 'estado', 'cep', 'email'];
        const missing = required.filter(f => !columnNames.includes(f));

        if (missing.length > 0) {
            console.log("MISSING COLUMNS:", missing);
        } else {
            console.log("SUCCESS: All required columns are present.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

checkSchema();
