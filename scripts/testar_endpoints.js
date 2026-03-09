const mysql = require('mysql2/promise');
require('dotenv').config();

async function testarEndpoints() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal'
    });

    try {
        console.log('🔍 Testando queries que os endpoints executam...\n');

        // Teste 1: SELECT usado por GET /api/config
        console.log('📋 Teste 1: GET /api/config query');
        console.log('Query: SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1');

        try {
            const [rows] = await pool.execute('SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1');
            console.log('✅ Sucesso!');
            console.log('Resultado:', rows);
        } catch (error) {
            console.log('❌ ERRO:', error.message);
        }

        console.log('\n' + '='.repeat(80) + '\n');

        // Teste 2: SELECT usado por GET /api/config/menu
        console.log('📋 Teste 2: GET /api/config/menu query');
        console.log('Query: SELECT MenuStructure FROM configuracaosistema LIMIT 1');

        try {
            const [rows] = await pool.execute('SELECT MenuStructure FROM configuracaosistema LIMIT 1');
            console.log('✅ Sucesso!');
            console.log('Resultado:', rows);
        } catch (error) {
            console.log('❌ ERRO:', error.message);
        }

        console.log('\n' + '='.repeat(80) + '\n');

        // Teste 3: Verificar estrutura da tabela
        console.log('📋 Teste 3: Estrutura da tabela');
        const [cols] = await pool.execute('SHOW COLUMNS FROM configuracaosistema');
        console.log('Colunas disponíveis:');
        cols.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        console.log('\n' + '='.repeat(80) + '\n');

        // Teste 4: Contar registros
        console.log('📋 Teste 4: Contagem de registros');
        const [count] = await pool.execute('SELECT COUNT(*) as total FROM configuracaosistema');
        console.log(`Total de registros: ${count[0].total}`);

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    } finally {
        await pool.end();
    }
}

testarEndpoints();
