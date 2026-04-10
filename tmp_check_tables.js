const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
  });

  const tables = ['ordemservicoitem', 'ordemservico', 'projetos', 'tags'];
  
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(`DESCRIBE ${table}`);
      console.log(`\nTable: ${table}`);
      console.log(rows.map(r => r.Field).join(', '));
    } catch (e) {
      console.log(`\nTable: ${table} - Error: ${e.message}`);
    }
  }
  
  await connection.end();
}

check();
