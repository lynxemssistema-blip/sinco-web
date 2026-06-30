const mysql=require('mysql2/promise');
async function test() {
    const c = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'lynxlocal'});
    const [r] = await c.query("SELECT IdMaterial, CodMatFabricante FROM material WHERE CodMatFabricante = '21217104'");
    console.log(r);
    c.destroy();
}
test();
