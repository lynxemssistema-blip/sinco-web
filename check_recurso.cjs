const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [cols] = await c.execute(
    "SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%ecurso%'"
  );
  console.log('Recurso cols:', JSON.stringify(cols.map(r => r.Field)));

  // Também verificar se Liberado_Engenharia pode ser o filtro correto
  const [cols2] = await c.execute(
    "SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%Liberad%' OR Field LIKE '%liberad%'"
  );
  console.log('Liberado cols:', JSON.stringify(cols2.map(r => r.Field)));
  await c.end();
}
main().catch(console.error);
