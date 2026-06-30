const mysql=require('mysql2/promise');
async function test() {
    const c = await mysql.createConnection({host:'lynxlocal.mysql.uhserver.com',user:'lynxlocal',password:'jHAzhFG848@yN@U',database:'lynxlocal',port:3306});
    const [r1] = await c.query("SELECT IdMaterial, CodMatFabricante FROM material WHERE IdMaterial IN (460, 477)");
    console.log("Materials:", r1);
    
    const [r2] = await c.query("SELECT * FROM material_processo WHERE IdMaterial = 477 OR IdMaterial = 460");
    console.log("Processos:", r2);

    c.destroy();
}
test();
