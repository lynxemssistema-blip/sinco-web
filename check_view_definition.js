const pool = require('./src/config/db');

async function checkView() {
    try {
        const [rows] = await pool.execute("SHOW CREATE VIEW viewordemservicoitemstatussetor");
        console.log("VIEW DEFINITION:");
        console.log(rows[0]['Create View']);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkView();
