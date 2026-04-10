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

  try {
    const [itemRows] = await connection.execute(
      `SELECT IdOrdemServicoItem, IdOrdemServico, IdProjeto, IdTag, RealizadoInicioCorte 
       FROM ordemservicoitem WHERE IdOrdemServicoItem = 32874`
    );
    console.log('Item 32874:', JSON.stringify(itemRows[0], null, 2));

    const [osRows] = await connection.execute(
      `SELECT IdOrdemServico, RealizadoInicioCorte 
       FROM ordemservico WHERE IdOrdemServico = 12`
    );
    console.log('OS 12:', JSON.stringify(osRows[0], null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await connection.end();
}

check();
