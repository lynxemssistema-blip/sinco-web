const pool = require('./config/db');

async function run() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM ordemservicoitem");
        console.log("COLUMNS IN ordemservicoitem:");
        rows.forEach(r => console.log(`${r.Field} - ${r.Type}`));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
