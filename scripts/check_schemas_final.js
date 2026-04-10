const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env and trim values
const envPath = path.join(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k].trim();
}

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.CENTRAL_DB_HOST,
    user: process.env.CENTRAL_DB_USER,
    password: process.env.CENTRAL_DB_PASS,
    database: process.env.CENTRAL_DB_NAME,
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
