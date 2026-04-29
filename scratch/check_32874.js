const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '@mec^$56#22lynx',
    database: 'lynxlocal'
};

async function main() {
    const conn = await mysql.createConnection(dbConfig);
    console.log("Checking item 32874...");
    const [rows] = await conn.execute("SELECT IdOrdemServicoItemControle, IdOrdemServicoItem, IdOrdemServico, Processo, QtdeTotal, QtdeProduzida, TipoApontamento, D_E_L_E_T_E, DataCriacao FROM ordemservicoitemcontrole WHERE IdOrdemServicoItem = 32874");
    console.log("Results for 32874:", rows);

    const [rows2] = await conn.execute("SELECT IdOrdemServicoItemControle, IdOrdemServicoItem, TipoApontamento, Processo FROM ordemservicoitemcontrole ORDER BY IdOrdemServicoItemControle DESC LIMIT 5");
    console.log("Recent:", rows2);
    conn.end();
}
main().catch(console.error);
