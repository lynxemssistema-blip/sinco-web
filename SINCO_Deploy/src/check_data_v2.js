
const pool = require('./config/db');
require('dotenv').config();

async function check() {
    try {
        const [columns] = await pool.query("DESCRIBE romaneio");
        const estatusCol = columns.find(c => c.Field === 'Estatus');
        console.log('Estatus Column Type:', estatusCol ? estatusCol.Type : 'Not Found');

        const [rows] = await pool.query("SELECT DISTINCT Estatus FROM romaneio");
        console.log('Distinct Estatus Values:', rows.map(r => r.Estatus));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
