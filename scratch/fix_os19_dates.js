const mysql = require('mysql2/promise');
async function main() {
    const c = await mysql.createConnection({
        host: 'lynxlocal.mysql.uhserver.com',
        user: 'lynxlocal',
        password: 'jHAzhFG848@yN@U',
        database: 'lynxlocal'
    });

    const dateNow = '17/04/2026';
    const user = 'Edson';

    console.log('=== Corrigindo dados retroativos para OS 19 / Item 32915 ===');

    // 1. Preencher RealizadoInicioCorte no item (existia apontamento mas campo ficou NULL)
    const [r1] = await c.query(
        `UPDATE ordemservicoitem SET RealizadoInicioCorte = ?, UsuarioRealizadoInicioCorte = ?
         WHERE IdOrdemServicoItem = 32915 AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
        [dateNow, user]
    );
    console.log(`Item 32915 - RealizadoInicioCorte: ${r1.affectedRows} linha(s) afetada(s)`);

    // 2. Preencher RealizadoInicioCorte na OS 19 (primeiro apontamento)
    const [r2] = await c.query(
        `UPDATE ordemservico SET RealizadoInicioCorte = ?
         WHERE IdOrdemServico = 19 AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
        [dateNow]
    );
    console.log(`OS 19 - RealizadoInicioCorte: ${r2.affectedRows} linha(s) afetada(s)`);

    // 3. RealizadoFinalCorte na OS 19: verificar se TODOS os itens ativos com corte têm RealizadoFinal
    const [pendFinal] = await c.query(
        `SELECT COUNT(*) as cnt FROM ordemservicoitem
         WHERE IdOrdemServico = 19
           AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
           AND NULLIF(txtCorte, '') = '1'
           AND (RealizadoFinalCorte IS NULL OR RealizadoFinalCorte = '')`
    );
    console.log(`Itens pendentes de RealizadoFinalCorte na OS 19: ${pendFinal[0].cnt}`);
    if (pendFinal[0].cnt == 0) {
        const [r3] = await c.query(
            `UPDATE ordemservico SET RealizadoFinalCorte = ? WHERE IdOrdemServico = 19`,
            [dateNow]
        );
        console.log(`OS 19 - RealizadoFinalCorte: ${r3.affectedRows} linha(s) afetada(s)`);
    }

    // 4. Propagar para Tag 26
    const [os] = await c.query(`SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = 19`);
    if (os.length > 0) {
        const { IdTag, IdProjeto } = os[0];
        
        // Inicio na Tag
        const [r4] = await c.query(
            `UPDATE tags SET RealizadoInicioCorte = ? WHERE IdTag = ? AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
            [dateNow, IdTag]
        );
        console.log(`Tag ${IdTag} - RealizadoInicioCorte: ${r4.affectedRows} linha(s) afetada(s)`);

        // Final na Tag: verificar se todas OS da Tag têm RealizadoFinal
        const [pendFinalTag] = await c.query(
            `SELECT COUNT(*) as cnt FROM ordemservico
             WHERE IdTag = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
               AND (RealizadoFinalCorte IS NULL OR RealizadoFinalCorte = '')`,
            [IdTag]
        );
        console.log(`OS pendentes de RealizadoFinalCorte na Tag ${IdTag}: ${pendFinalTag[0].cnt}`);
        if (pendFinalTag[0].cnt == 0) {
            const [r5] = await c.query(
                `UPDATE tags SET RealizadoFinalCorte = ? WHERE IdTag = ?`,
                [dateNow, IdTag]
            );
            console.log(`Tag ${IdTag} - RealizadoFinalCorte: ${r5.affectedRows} linha(s) afetada(s)`);
        }

        // Inicio no Projeto
        const [r6] = await c.query(
            `UPDATE projetos SET RealizadoInicioCorte = ? WHERE IdProjeto = ? AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
            [dateNow, IdProjeto]
        );
        console.log(`Projeto ${IdProjeto} - RealizadoInicioCorte: ${r6.affectedRows} linha(s) afetada(s)`);

        // Final no Projeto: verificar se todas Tags têm RealizadoFinal
        const [pendFinalProj] = await c.query(
            `SELECT COUNT(*) as cnt FROM tags
             WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
               AND (RealizadoFinalCorte IS NULL OR RealizadoFinalCorte = '')`,
            [IdProjeto]
        );
        console.log(`Tags pendentes de RealizadoFinalCorte no Projeto ${IdProjeto}: ${pendFinalProj[0].cnt}`);
        if (pendFinalProj[0].cnt == 0) {
            const [r7] = await c.query(
                `UPDATE projetos SET RealizadoFinalCorte = ? WHERE IdProjeto = ?`,
                [dateNow, IdProjeto]
            );
            console.log(`Projeto ${IdProjeto} - RealizadoFinalCorte: ${r7.affectedRows} linha(s) afetada(s)`);
        }
    }

    console.log('\n=== Verificação final ===');
    const [osi] = await c.query(`SELECT IdOrdemServicoItem, RealizadoInicioCorte, RealizadoFinalCorte FROM ordemservicoitem WHERE IdOrdemServicoItem = 32915`);
    console.log('Item:', JSON.stringify(osi[0]));
    const [oss] = await c.query(`SELECT IdOrdemServico, RealizadoInicioCorte, RealizadoFinalCorte FROM ordemservico WHERE IdOrdemServico = 19`);
    console.log('OS:', JSON.stringify(oss[0]));
    const [tag] = await c.query(`SELECT IdTag, Tag, RealizadoInicioCorte, RealizadoFinalCorte FROM tags WHERE IdTag = 26`);
    console.log('Tag:', JSON.stringify(tag[0]));
    const [proj] = await c.query(`SELECT IdProjeto, RealizadoInicioCorte, RealizadoFinalCorte FROM projetos WHERE IdProjeto = 16`);
    console.log('Projeto:', JSON.stringify(proj[0]));

    await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
