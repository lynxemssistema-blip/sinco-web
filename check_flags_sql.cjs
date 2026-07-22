const pool = require('./src/config/db');
async function main() {
    try {
        const [rows] = await pool.query(`
            SELECT
                p.IdProjeto, p.Projeto, p.DescProjeto, 
                (SELECT MAX(CASE WHEN osi.txtCorte = '1' OR osi.txtCorte = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagCorte,
                (SELECT MAX(CASE WHEN osi.txtGALVANIZAR = '1' OR osi.txtGALVANIZAR = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdProjeto = p.IdProjeto AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flagGalvanizar
            FROM projetos p
            WHERE p.IdProjeto = 1 OR p.Projeto = '0001'
        `);
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
