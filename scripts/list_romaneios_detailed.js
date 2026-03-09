
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function listDetailed() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
            user: process.env.DB_USER || 'lynxlocal',
            password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
            database: process.env.DB_NAME || 'lynxlocal'
        });

        console.log('Connected to DB');

        const [rows] = await pool.query(`
            SELECT idRomaneio, Descricao, EnviadoPara, DATACRIACAO, CriadoPor, NomeMotorista, DataEnvio, Estatus, Liberado
            FROM romaneio 
            ORDER BY idRomaneio ASC
        `);

        console.log('--- LISTA DE ROMANEIOS ---');
        rows.forEach(r => {
            console.log(`[ID: ${r.idRomaneio}] Status: ${r.Estatus} | Lib: ${r.Liberado} | Motorista: ${r.NomeMotorista || '-'} | Envio: ${r.DataEnvio || '-'}`);
        });

        pool.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

listDetailed();
