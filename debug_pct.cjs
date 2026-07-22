const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();
async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });
  const idProjeto = 65;
  
  // Verificar o que a query agora retorna para projeto 65
  const [r] = await c.execute(`
    SELECT
      (SELECT COALESCE(SUM(CAST(NULLIF(osi.QtdeTotal,'') AS DECIMAL(10,2))), 0)
       FROM ordemservicoitem osi
       INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
       WHERE os.IdProjeto = ? AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
       AND osi.txtCorte = '1') AS TotalCorte_QtdeTotal,
       
      (SELECT COALESCE(SUM(CAST(NULLIF(osi.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)
       FROM ordemservicoitem osi
       INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
       WHERE os.IdProjeto = ? AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
       AND osi.txtCorte = '1') AS ExecCorte,
       
      (SELECT COALESCE(SUM(CAST(NULLIF(osi.QtdeTotal,'') AS DECIMAL(10,2))), 0)
       FROM ordemservicoitem osi
       INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
       WHERE os.IdProjeto = ? AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
       AND osi.txtGALVANIZAR = '1') AS TotalGalvanizar_QtdeTotal,
       
      (SELECT COALESCE(SUM(CAST(NULLIF(osi.GALVANIZARTotalExecutado,'') AS DECIMAL(10,2))), 0)
       FROM ordemservicoitem osi
       INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
       WHERE os.IdProjeto = ? AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
       AND osi.txtGALVANIZAR = '1') AS ExecGalvanizar,
       
      (SELECT COALESCE(SUM(QtdeTotal), 0)
       FROM ordemservicoitem osi
       INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
       WHERE os.IdProjeto = ?) AS TotalGeralPecas
  `, [idProjeto, idProjeto, idProjeto, idProjeto, idProjeto]);
  
  console.log('Resultado DB para projeto 65:');
  console.log(JSON.stringify(r[0], null, 2));
  
  // Também listar os itens do projeto para debug
  const [items] = await c.execute(`
    SELECT osi.IdOrdemServicoItem, osi.CodMatFabricante, osi.QtdeTotal,
           osi.txtCorte, osi.txtGALVANIZAR,
           osi.CorteTotalExecutado, osi.GALVANIZARTotalExecutado
    FROM ordemservicoitem osi
    INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
    WHERE os.IdProjeto = ?
  `, [idProjeto]);
  
  console.log('\nItens do projeto 65:');
  items.forEach(i => console.log(JSON.stringify(i)));
  
  await c.end();
}
main().catch(console.error);
