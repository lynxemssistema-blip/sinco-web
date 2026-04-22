
const pool = require('./config/db');
require('dotenv').config();

async function checkStatus() {
    try {
        const [rows] = await pool.query("SELECT DISTINCT Estatus, Liberado, D_E_L_E_T_E FROM romaneio");
        console.log('Distinct Values:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkStatus();
