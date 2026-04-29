require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  // Check what filters projects 9 and 10 would hit
  const [rows] = await pool.execute(`
    SELECT IdProjeto, Projeto, Finalizado, liberado, D_E_L_E_T_E,
           COALESCE(Finalizado,'') as fin_coalesce,
           COALESCE(liberado,'') as lib_coalesce
    FROM projetos
    WHERE IdProjeto IN (9, 10)
  `);
  
  console.log('Projetos #9 e #10:');
  rows.forEach(r => {
    console.log(`  #${r.IdProjeto} ${r.Projeto}`);
    console.log(`    Finalizado: [${r.Finalizado}] => coalesce: [${r.fin_coalesce}]`);
    console.log(`    liberado:   [${r.liberado}] => coalesce: [${r.lib_coalesce}]`);
    console.log(`    D_E_L_E_T_E: [${r.D_E_L_E_T_E}]`);
    
    const isDeleted = (r.D_E_L_E_T_E || '').trim() !== '';
    const isFinalizado = r.fin_coalesce === 'C';
    const isLiberado = r.lib_coalesce === 'S';
    
    console.log(`    => Excluído: ${isDeleted} | Finalizado(C): ${isFinalizado} | Liberado(S): ${isLiberado}`);
    console.log(`    Apareceria em:`);
    console.log(`      [Todos]:       ${!isDeleted}`);
    console.log(`      [Finalizados]: ${!isDeleted && isFinalizado}`);
    console.log(`      [Liberados]:   ${!isDeleted && isLiberado}`);
    console.log(`      [Default]:     ${!isDeleted && !isFinalizado && !isLiberado}`);
  });

  await pool.end();
}

check().catch(console.error);
