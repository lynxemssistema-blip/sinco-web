
const pool = require('./config/db');
require('dotenv').config();

async function checkSchema() {
    try {
        const [columns] = await pool.query("DESCRIBE romaneioitem");
        console.log('Columns:', columns.map(c => c.Field));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
