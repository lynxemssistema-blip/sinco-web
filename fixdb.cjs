const mysql=require('mysql2/promise');
async function fix() {
    const c = await mysql.createConnection({host:'lynxlocal.mysql.uhserver.com',user:'lynxlocal',password:'jHAzhFG848@yN@U',database:'lynxlocal',port:3306});
    
    // Update the record 170 to belong to IdMaterial 460, and set sequence to 80
    // Wait, codmatFabricante should also be updated!
    await c.query("UPDATE material_processo SET IdMaterial = 460, SequenciaExecucao = 80, codmatFabricante = '3 - FD CB1 CT1 ES1 VP1 - COL.3_TF-521001' WHERE IdMaterialProcesso = 170");
    
    console.log("Database fixed.");
    c.destroy();
}
fix();
