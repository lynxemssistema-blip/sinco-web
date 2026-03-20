require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT || 3306
    });

    const query = `
        SELECT IdOrdemServicoItemPendencia, Projeto, Estatus, TipoRegistro
        FROM viewordemservicoitempendencia
        WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
          AND TipoRegistro = 'TAREFA'
          AND Estatus = 'TarefaAberta'
        LIMIT 5
    `;
    const [rows] = await connection.execute(query);
    console.log("Tarefas Abertas:", rows.length);

    await connection.end();
  } catch (error) {
    console.error("Error", error);
  }
}
test();
