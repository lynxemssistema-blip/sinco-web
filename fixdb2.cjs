const mysql=require('mysql2/promise');
async function fix() {
    const c = await mysql.createConnection({host:'lynxlocal.mysql.uhserver.com',user:'lynxlocal',password:'jHAzhFG848@yN@U',database:'lynxlocal',port:3306});
    
    // Delete the erroneous record
    await c.query("DELETE FROM material_processo WHERE IdMaterialProcesso = 170");
    
    console.log("Database fixed. Record 170 deleted.");
    c.destroy();
}
fix();
