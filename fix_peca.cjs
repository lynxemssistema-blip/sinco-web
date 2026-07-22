const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'lynxlocal.mysql.uhserver.com', 
        user: 'lynxlocal', 
        password: 'jHAzhFG848@yN@U', 
        database: 'lynxlocal',
        port: 3306
    });
    
    // Find all materials with PecaManufat = 'S'
    const [mats] = await conn.execute(`SELECT IdMaterial, CodMatFabricante, PecaManufat FROM material WHERE PecaManufat = 'S'`);
    
    let toUpdate = [];
    
    for (const mat of mats) {
        // Check if this material is the PARENT of any composition
        // The user said: "a pesquisa na tabela 'montapeca' é o codigo sendo comparado ao campo codmatfabricante"
        // Wait, the user specifically wants to compare `mat.CodMatFabricante` against `montapeca.CodMatFabricante`?
        // No, if `montapeca.CodMatFabricante` is the child's code, then the parent's code might be missing?
        // Let's check both IdMaterialPeca and CodMatFabricantePeca.
        const [comps] = await conn.execute(`
            SELECT IdMontaPeca FROM montapeca 
            WHERE IdMaterialPeca = ? 
            AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `, [mat.IdMaterial]);
        
        if (comps.length === 0) {
            toUpdate.push(mat.CodMatFabricante);
            // Execute update
            await conn.execute(`UPDATE material SET PecaManufat = '' WHERE IdMaterial = ?`, [mat.IdMaterial]);
        }
    }
    
    console.log(`Updated ${toUpdate.length} materials that had PecaManufat='S' but no valid composition.`);
    if (toUpdate.length > 0) {
        console.log("Examples updated:", toUpdate.slice(0, 10));
    }
    
    conn.end();
}
check().catch(console.error);
