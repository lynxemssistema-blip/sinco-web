// Debug script: verifica conteúdo da tabela projetos e simula query do visao-geral
const db = require('../src/config/db');

async function debug() {
    try {
        // 1. Total de projetos
        const [count] = await db.executeOnDefault('SELECT COUNT(*) as total FROM projetos', []);
        console.log('Total projetos (sem filtro):', count[0].total);

        // 2. Amostra de projetos
        const [sample] = await db.executeOnDefault(
            "SELECT IdProjeto, Projeto, D_E_L_E_T_E, Finalizado, liberado FROM projetos ORDER BY IdProjeto DESC LIMIT 10",
            []
        );
        console.log('\nAmostra projetos:');
        sample.forEach(p => console.log(` #${p.IdProjeto} | ${p.Projeto} | DELETE=${p.D_E_L_E_T_E} | Finalizado=${p.Finalizado} | liberado=${p.liberado}`));

        // 3. Simula query do visao-geral sem filtros
        const [rows] = await db.executeOnDefault(
            `SELECT p.IdProjeto, p.Projeto, p.Finalizado, p.liberado FROM projetos p WHERE COALESCE(p.D_E_L_E_T_E,'') = '' AND COALESCE(p.Finalizado,'') = '' AND COALESCE(p.liberado,'') = '' ORDER BY p.IdProjeto DESC LIMIT 20`,
            []
        );
        console.log('\nQuery visão geral (sem filtros ativos) - resultado:', rows.length, 'projetos');
        rows.forEach(p => console.log(` #${p.IdProjeto} | ${p.Projeto}`));

        // 4. Checar conexoes_bancos
        const [tenants] = await db.executeOnDefault('SELECT db_name, db_host, ativo FROM conexoes_bancos', []);
        console.log('\nTenants registrados:');
        tenants.forEach(t => console.log(` ${t.db_name} @ ${t.db_host} | ativo=${t.ativo}`));

    } catch (e) {
        console.error('ERRO:', e.message);
    }
    process.exit(0);
}

debug();
