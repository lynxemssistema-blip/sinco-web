const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.DB_USER || 'lynxlocal',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'lynxlocal'
  });

  const [rows] = await db.execute('SELECT IdMotorista, Motorista, ImagemCNH FROM motorista WHERE Motorista = "JAIR"');
  console.log(rows);
  await db.end();
}
run();
