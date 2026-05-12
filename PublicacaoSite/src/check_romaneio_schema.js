
const pool = require('./config/db');
require('dotenv').config();

async function checkSchema() {
    try {
        const [columns] = await pool.query("DESCRIBE romaneio");
        const deleteCol = columns.find(c => c.Field === 'D_E_L_E_T_E');
        console.log('D_E_L_E_T_E Column:', deleteCol);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
