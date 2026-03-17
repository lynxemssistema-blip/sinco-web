const db = require('./src/config/db');

async function checkAllTriggers() {
    try {
        const [rows_os] = await db.executeOnDefault("SHOW TRIGGERS WHERE `Table` = 'ordemservico'");
        console.log("Triggers attached to ordemservico:", rows_os);

        const [rows_tags] = await db.executeOnDefault("SHOW TRIGGERS WHERE `Table` = 'tags'");
        console.log("Triggers attached to tags:", rows_tags);

        const [all_trigs] = await db.executeOnDefault("SHOW TRIGGERS");
        const found = all_trigs.filter(t => t.Statement.toLowerCase().includes('qtdenc'));
        console.log("Any trigger containing 'qtdenc':", found);
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
checkAllTriggers();
