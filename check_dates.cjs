const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  // 1. Verificar tipo das colunas de data
  const [cols] = await c.execute(`
    SHOW COLUMNS FROM ordemservicoitem 
    WHERE Field LIKE 'Planejado%' OR Field LIKE 'Realizado%'
    LIMIT 10
  `);
  console.log('=== Tipos das colunas de data ===');
  cols.forEach(r => console.log(`${r.Field}: ${r.Type}`));

  // 2. Verificar samples de datas gravadas
  const [samples] = await c.execute(`
    SELECT IdOrdemServicoItem,
           PlanejadoInicioCorte, PlanejadoFinalCorte,
           RealizadoInicioCorte, RealizadoFinalCorte,
           RealizadoInicioGALVANIZAR, RealizadoFinalGALVANIZAR
    FROM ordemservicoitem
    WHERE PlanejadoInicioCorte IS NOT NULL 
      AND PlanejadoInicioCorte != ''
    LIMIT 10
  `);
  console.log('\n=== Amostras de datas gravadas ===');
  samples.forEach(r => console.log(JSON.stringify(r)));

  // 3. Verificar se há datas em formato errado (YYYY-MM-DD)
  const [wrongFmt] = await c.execute(`
    SELECT COUNT(*) as total FROM ordemservicoitem
    WHERE (PlanejadoInicioCorte REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        OR RealizadoInicioCorte REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        OR RealizadoInicioGALVANIZAR REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
  `);
  console.log('\n=== Registros com datas em formato YYYY-MM-DD ===');
  console.log(wrongFmt[0]);

  // 4. Verificar tipo da coluna de data nas tags
  const [tagCols] = await c.execute(`
    SHOW COLUMNS FROM tags 
    WHERE Field LIKE 'Planejado%' OR Field LIKE 'Realizado%'
    LIMIT 10
  `);
  console.log('\n=== Tipo colunas data em TAGS ===');
  tagCols.forEach(r => console.log(`${r.Field}: ${r.Type}`));

  await c.end();
}
main().catch(console.error);
