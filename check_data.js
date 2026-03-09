require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'sinco_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

async function checkData() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(`
            SELECT IdOrdemServicoItem, MaterialSW, IdPlanodecorte 
            FROM ordemservicoitem 
            WHERE MaterialSW IS NOT NULL OR IdPlanodecorte IS NOT NULL
            LIMIT 10
        `);
        console.table(rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

checkData();
