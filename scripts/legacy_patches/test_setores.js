const mysql = require('mysql2/promise');

async function test() {
    const conn = await mysql.createConnection({
        host: 'lynxlocal.mysql.uhserver.com',
        user: 'lynxlocal',
        password: 'jHAzhFG848@yN@U',
        database: 'lynxlocal'
    });
    const [rows] = await conn.execute("SELECT idSetor, Setor, DataLiberada FROM setor WHERE DataLiberada = 'SIM' AND D_E_L_E_T_E = ''");
    console.log(rows);
    process.exit(0);
}
test();
