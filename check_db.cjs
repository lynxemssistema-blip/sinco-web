const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '', database: 'lynxlocal'
    });
    
    // Check montapeca
    const [rows] = await conn.execute(`SELECT IdMontaPeca, IdMaterial, IdMaterialPeca, CodMatFabricante, CodMatFabricantePeca FROM montapeca LIMIT 10`);
    console.log("MontaPeca Sample:");
    console.table(rows);
    
    // Check materials with PecaManufat = 'S'
    const [mats] = await conn.execute(`SELECT IdMaterial, CodMatFabricante, PecaManufat FROM material WHERE PecaManufat = 'S'`);
    console.log(`\nMaterials with PecaManufat = 'S': ${mats.length}`);
    console.table(mats.slice(0, 10));
    
    conn.end();
}
check().catch(console.error);
