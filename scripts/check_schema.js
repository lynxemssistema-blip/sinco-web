const pool = require('../src/config/db');

async function checkSchema() {
    try {
        const [osCols] = await pool.execute("SHOW COLUMNS FROM ordemservico");
        console.log("ordemservico columns:", osCols.map(c => c.Field));
        
        const [osiCols] = await pool.execute("SHOW COLUMNS FROM ordemservicoitem");
        console.log("ordemservicoitem columns:", osiCols.map(c => c.Field));
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkSchema();
