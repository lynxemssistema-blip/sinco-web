const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Buscar colunas de GALVANIZAR
  const [g] = await c.execute("SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%GALVANIZAR%' OR Field LIKE '%Galvanizar%'");
  console.log('GALVANIZAR cols:', g.map(r => r.Field));

  // Buscar colunas de PULSIONADEIRA
  const [p] = await c.execute("SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%PULSIONADEIRA%' OR Field LIKE '%Pulsionadeira%'");
  console.log('PULSIONADEIRA cols:', p.map(r => r.Field));

  // Buscar colunas de Realizado para confirmar padrão de casing
  const [r] = await c.execute("SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%Realizado%' OR Field LIKE '%REALIZADO%'");
  console.log('Realizado cols (padrão):', r.map(row => row.Field));

  // Verificar getCurrentDateBR vs getCurrentDateTimeBR
  const [d] = await c.execute("SELECT NOW() as now, CURDATE() as today");
  console.log('DB date formats:', d[0]);

  await c.end();
}
main().catch(console.error);
