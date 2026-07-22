const db = require('./src/config/db.js');
async function run() {
    try {
        const sql = `UPDATE lynxlocal.montapeca SET PecaQtde = QtdeUnitaria WHERE PecaQtde > 1000 OR PecaQtde IS NULL`;
        const [result] = await db.executeOnDefault(sql);
        console.log(result);
    } catch(e) { console.error(e) }
    process.exit(0);
}
run();
