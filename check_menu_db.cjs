const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await c.execute('SELECT MenuStructure FROM configuracaosistema LIMIT 1');
  if (rows.length === 0 || !rows[0].MenuStructure) {
    console.log('Nenhum MenuStructure salvo no banco.');
    await c.end();
    return;
  }

  const menu = JSON.parse(rows[0].MenuStructure);
  console.log('Total itens no menu salvo:', menu.length);
  
  console.log(JSON.stringify(menu, null, 2));

  await c.end();
}
main().catch(console.error);
