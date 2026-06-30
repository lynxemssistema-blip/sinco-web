const mysql = require('mysql2/promise');
async function test() {
  const conn = await mysql.createConnection({ host: 'lynxlocal.mysql.uhserver.com', user: 'lynxlocal', password: 'jHAzhFG848@yN@U', database: 'lynxlocal' });
  try {
    await conn.execute(
      "INSERT INTO processofabricacao (processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao, CriadoPor, DataCriacao, IdMatriz) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['Teste', 'T01', 'SIM', 'SIM', 10.5, 20.2, 'Admin', '01/01/2026 10:00:00', 1]
    );
    console.log('Insert succeeded');
  } catch (err) {
    console.error('Insert failed:', err.message);
  }
  conn.end();
}
test();
