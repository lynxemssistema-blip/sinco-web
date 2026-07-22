const db = require('./src/config/db.js');
async function run() {
    try {
        const sql = `SELECT IdMontaPeca, IdMaterial, IdMaterialPeca, CodMatFabricante, CodMatFabricantePeca, PecaQtde, QtdeUnitaria FROM lynxlocal.montapeca WHERE CodMatFabricante LIKE '%TEST_PESO_COM%' OR CodMatFabricante LIKE '%IC CB1 CT1 E%' ORDER BY IdMontaPeca DESC LIMIT 10`;
        const [rows] = await db.executeOnDefault(sql);
        console.log(rows);
    } catch(e) { console.error(e) }
    process.exit(0);
}
run();
