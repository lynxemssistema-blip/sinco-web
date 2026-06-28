require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: 'alfatec2' });
    try {
        const [rows] = await pool.query(`
            SELECT 
                p.IdProjeto, p.Projeto, p.DescEmpresa, t.Tag, t.DescTag, o.CodMatFabricante, 
                t.DataPrevisao, o.QtdeTotal, o.Peso as PesoUnitario, 
                t.MontagemTotalExecutado, t.TotalExpedicao, 
                o.Comprimento, o.Profundidade, o.Largura, o.DescResumo, o.DescDetal, 
                t.RealizadoInicioExpedicao, t.RealizadoFinalExpedicao, 
                t.IdTag, os.IdOrdemServico, o.IdOrdemServicoItem, 
                t.Finalizado as Finalizadotag, p.Finalizado as FinalizadoProjeto, 
                o.OrdemServicoItemFinalizado, o.EnderecoArquivo, o.ProdutoPrincipal 
            FROM ordemservicoitem o 
            JOIN ordemservico os ON o.IdOrdemServico = os.IdOrdemServico 
            JOIN tags t ON os.IdTag = t.IdTag 
            JOIN projetos p ON os.IdProjeto = p.IdProjeto 
            LIMIT 1
        `);
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
