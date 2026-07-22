const mysql = require('mysql2/promise');
require('dotenv').config();
async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  // Verificar colunas de ordemservico
  const [cols] = await conn.execute("SHOW COLUMNS FROM ordemservico WHERE Field LIKE '%Tag%' OR Field LIKE '%Projeto%' OR Field = 'D_E_L_E_T_E'");
  console.log('Colunas relevantes:', cols.map(c => c.Field));

  // OS da tag 34
  const [os] = await conn.execute("SELECT * FROM ordemservico WHERE IdTag = 34 LIMIT 10");
  if (os.length) {
    const keys = Object.keys(os[0]);
    console.log('\nCampos OS:', keys.join(', '));
    os.forEach(row => {
      const del = row['D_E_L_E_T_E'];
      const delHex = del != null ? Buffer.from(String(del)).toString('hex') : 'null';
      console.log(`  OS ID=${row.IdOrdemServico} IdTag=${row.IdTag} IdProjeto=${row.IdProjeto} D_E_L_E_T_E=[${del}](hex:${delHex})`);
    });
  } else {
    console.log('\nNenhuma OS com IdTag=34');
  }

  // OS do projeto 15
  const [os2] = await conn.execute("SELECT IdOrdemServico, IdTag, IdProjeto, D_E_L_E_T_E FROM ordemservico WHERE IdProjeto = 15 LIMIT 10");
  console.log('\nOS com IdProjeto=15:');
  os2.forEach(row => {
    const del = row['D_E_L_E_T_E'];
    const delHex = del != null ? Buffer.from(String(del)).toString('hex') : 'null';
    console.log(`  OS ID=${row.IdOrdemServico} IdTag=${row.IdTag} IdProjeto=${row.IdProjeto} D_E_L_E_T_E=[${del}](hex:${delHex})`);
  });

  // Buscar por nome do projeto
  const [os3] = await conn.execute("SELECT IdOrdemServico, IdTag, IdProjeto, Projeto, D_E_L_E_T_E FROM ordemservico WHERE Projeto = '010799' LIMIT 10");
  console.log('\nOS com Projeto=010799:');
  os3.forEach(row => {
    const del = row['D_E_L_E_T_E'];
    console.log(`  OS ID=${row.IdOrdemServico} IdTag=${row.IdTag} IdProjeto=${row.IdProjeto} D_E_L_E_T_E=[${del}]`);
  });

  await conn.end();
}
check().catch(e => console.error(e.message));
