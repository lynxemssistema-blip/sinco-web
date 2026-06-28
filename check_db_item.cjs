require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST_CENTRAL || 'lynxlocal.mysql.uhserver.com',
    user: process.env.DB_USER_CENTRAL || 'lynxlocal',
    password: process.env.DB_PASSWORD_CENTRAL || 'V173v001851213*',
    database: process.env.DB_NAME_CENTRAL || 'lynxlocal'
  });
  const [rows] = await conn.execute("SELECT CodMatFabricante, PecaManufat, D_E_L_E_T_E FROM material WHERE CodMatFabricante = '21217104'");
  console.log('Result for 21217104:', rows);
  conn.end();
}
check();
