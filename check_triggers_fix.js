const db = require('./src/config/db');

async function checkTriggers() {
    try {
        const [rows] = await db.executeOnDefault("SHOW TRIGGERS WHERE `Table` = 'ordemservicoitempendencia'");
        console.log("Triggers attached to the table:", rows);

        // Also check ordemservico, tags, projetos just in case
        const [rows2] = await db.executeOnDefault("SHOW TRIGGERS WHERE `Table` = 'projetos'");
        console.log("Triggers attached to projetos:", rows2);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
checkTriggers();
