const mysql=require('mysql2/promise');
async function q() {
    const c = await mysql.createConnection({host:'lynxlocal.mysql.uhserver.com',user:'lynxlocal',password:'jHAzhFG848@yN@U',database:'lynxlocal',port:3306});
    const [r] = await c.query("SELECT IdMaterial, CodMatFabricante, PecaManufat FROM material WHERE IdMaterial IN (477, 460)");
    console.log(r);
    c.destroy();
}
q();
