const db = require('./src/config/db.js');
async function run() {
    try {
        const sql = `SELECT IdMontaPeca, IdMaterial, IdMaterialPeca, CodMatFabricante, PecaQtde, QtdeUnitaria FROM lynxlocal.montapeca WHERE PecaQtde > 1000 OR QtdeUnitaria > 1000`;
        const [rows] = await db.executeOnDefault(sql);
        console.log(rows);
    } catch(e) { console.error(e) }
    process.exit(0);
}
run();
