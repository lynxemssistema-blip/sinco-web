const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });
async function run() {
    const conn = await mysql.createConnection({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME});
    const [rows] = await conn.execute("SELECT IdOrdemServicoItemPendencia, DataAcertoProjeto, DescricaoFinalizacao, SetorResponsavelFinalizacao, FinalizadoPorUsuarioSetor, Estatus FROM ordemservicoitempendencia WHERE IdOrdemServicoItemPendencia = 116");
    console.log(rows);
    process.exit(0);
}
run();
