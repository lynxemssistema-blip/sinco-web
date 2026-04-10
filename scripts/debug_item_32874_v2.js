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
    const item = itemRows[0];
    console.log('Item 32874:', JSON.stringify(item, null, 2));

    const [osRows] = await connection.execute(
      `SELECT IdOrdemServico, RealizadoInicioCorte FROM ordemservico WHERE IdOrdemServico = ?`, [item.IdOrdemServico]
    );
    console.log('OS 12:', JSON.stringify(osRows[0], null, 2));

    const [projRows] = await connection.execute(
      `SELECT IdProjeto, RealizadoInicioCorte FROM projetos WHERE IdProjeto = ?`, [item.IdProjeto]
    );
    console.log('Projeto 10:', JSON.stringify(projRows[0], null, 2));

    const [tagRows] = await connection.execute(
      `SELECT IdTag, RealizadoInicioCorte FROM tags WHERE IdTag = ?`, [item.IdTag]
    );
    console.log('Tag 22:', JSON.stringify(tagRows[0], null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await connection.end();
}

check();
