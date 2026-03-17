const db = require('./src/config/db');

async function checkTriggers() {
    try {
        const [rows] = await db.executeOnDefault("SHOW TRIGGERS LIKE 'ordemservicoitempendencia'");
        console.log("Triggers:", rows);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
checkTriggers();
