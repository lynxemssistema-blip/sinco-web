const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  // 1. Corrigir Fabrica='SIM' para PULSIONADEIRA (IdProcessoFabricacao=17)
  const [upd] = await conn.execute(
    "UPDATE processofabricacao SET Fabrica = 'SIM' WHERE IdProcessoFabricacao = 17"
  );
  console.log('UPDATE PULSIONADEIRA Fabrica→SIM:', upd.affectedRows, 'linha(s) afetada(s)');

  // 2. Verificar resultado
  const [pf] = await conn.execute(
    "SELECT IdProcessoFabricacao, processofabricacao, Fabrica FROM processofabricacao WHERE IdProcessoFabricacao = 17"
  );
  console.log('PULSIONADEIRA após correção:', pf[0]);

  // 3. Ver todos os processos com Fabrica para confirmar estado geral
  const [all] = await conn.execute(
    "SELECT IdProcessoFabricacao, processofabricacao, Fabrica FROM processofabricacao WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdProcessoFabricacao"
  );
  console.log('\nTodos os processos:');
  all.forEach(p => console.log(`  [${p.IdProcessoFabricacao}] ${p.processofabricacao} → Fabrica=${p.Fabrica}`));

  await conn.end();
}

fix().catch(e => console.error(e.message));
