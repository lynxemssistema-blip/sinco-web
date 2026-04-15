const pool = require('../src/config/db');

async function verify() {
    try {
        console.log('1. Testing Clonagem Filter...');
        const [rows1] = await pool.execute("SELECT IdProjeto, Projeto, Finalizado, liberado FROM projetos WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND (liberado IS NULL OR liberado <> 'S') AND (Finalizado IS NULL OR Finalizado <> 'C') LIMIT 5");
        console.log('   OK, found ' + rows1.length + ' active projects:');
        rows1.forEach(r => console.log(`   - [${r.IdProjeto}] ${r.Projeto} (Fin:${r.Finalizado}, Lib:${r.liberado})`));

        console.log('\n2. Testing Mapa Query (casing)...');
        const [rows2] = await pool.execute("SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE Liberado_Engenharia = 'S' LIMIT 1");
        console.log('   OK, column Liberado_Engenharia exists and query works.');

        console.log('\n3. Testing Config Schema Robustness...');
        const [cols] = await pool.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracaosistema'");
        const names = cols.map(c => c.COLUMN_NAME);
        console.log('   OK, available columns in configuracaosistema: ' + names.join(', '));
        
        const testCols = ['PlanoCorteFiltroDC', 'MaxRegistros'].filter(c => names.includes(c));
        console.log('   Our targeted columns present: ' + testCols.join(', '));

    } catch (e) {
        console.error('\nVERIFICATION FAILED:', e.message);
    } finally {
        process.exit();
    }
}

verify();
