const db = require('./src/config/db');

async function testSchema() {
    try {
        const [oRows] = await db.executeOnDefault("DESCRIBE ordemservico");
        console.log("oRows qtderncPendente:", oRows.find(r => r.Field.toLowerCase().includes('qtde')));
        console.log("oRows ALL:", oRows.map(r => r.Field).filter(f => f.toLowerCase().includes('qtdern')));

        const [tRows] = await db.executeOnDefault("DESCRIBE tags");
        console.log("tRows ALL:", tRows.map(r => r.Field).filter(f => f.toLowerCase().includes('qtdern')));

        const [pRows] = await db.executeOnDefault("DESCRIBE projetos");
        console.log("pRows ALL:", pRows.map(r => r.Field).filter(f => f.toLowerCase().includes('qtdern')));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
testSchema();
