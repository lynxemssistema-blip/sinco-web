const mysql = require('mysql2/promise');
async function main() {
    const c = await mysql.createConnection({host:'lynxlocal.mysql.uhserver.com',user:'lynxlocal',password:'jHAzhFG848@yN@U',database:'lynxlocal'});
    
    // Check items in OS 19
    const [items] = await c.query(`SELECT IdOrdemServicoItem, DescResumo, QtdeTotal, 
        cortetotalexecutado, cortetotalexecutar, 
        RealizadoInicioCorte, UsuarioRealizadoInicioCorte, 
        RealizadoFinalCorte, UsuarioRealizadoFinalCorte
        FROM ordemservicoitem WHERE IdOrdemServico=19 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') LIMIT 5`);
    console.log('=== ITENS OS 19 ===');
    console.log(JSON.stringify(items, null, 2));
    
    // Check OS 19 header
    const [os] = await c.query(`SELECT IdOrdemServico, RealizadoInicioCorte, RealizadoFinalCorte, IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico=19`);
    console.log('\n=== OS 19 HEADER ===');
    console.log(JSON.stringify(os, null, 2));
    
    // Check tag
    if (os.length > 0 && os[0].IdTag) {
        const [tag] = await c.query(`SELECT IdTag, Tag, RealizadoInicioCorte, RealizadoFinalCorte FROM tags WHERE IdTag=?`, [os[0].IdTag]);
        console.log('\n=== TAG ===');
        console.log(JSON.stringify(tag, null, 2));
    }
    
    // Check projeto
    if (os.length > 0 && os[0].IdProjeto) {
        const [proj] = await c.query(`SELECT IdProjeto, Projeto, RealizadoInicioCorte, RealizadoFinalCorte FROM projetos WHERE IdProjeto=?`, [os[0].IdProjeto]);
        console.log('\n=== PROJETO ===');
        console.log(JSON.stringify(proj, null, 2));
    }
    
    // Check apontamento logs
    const [logs] = await c.query(`SELECT * FROM ordemservicoitemcontrole WHERE IdOrdemServico=19 ORDER BY IdOrdemServicoItemControle DESC LIMIT 5`);
    console.log('\n=== LOGS APONTAMENTO ===');
    console.log(JSON.stringify(logs, null, 2));
    
    await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
