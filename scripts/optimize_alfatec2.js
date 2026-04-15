const mysql = require('mysql2/promise');

async function migrate() {
    const config = {
        host: 'alfatec2.mysql.uhserver.com',
        user: 'alfateccozinhas',
        password: 'jHAzhFG848@yN@U',
        database: 'alfatec2'
    };

    console.log('--- OTIMIZAÇÃO DE PERFORMANCE: alfatec2 ---');
    const connection = await mysql.createConnection(config);

    try {
        // 1. Adicionar coluna MaxRegistros se não existir
        console.log('[1/4] Verificando coluna MaxRegistros...');
        const [cols] = await connection.execute('SHOW COLUMNS FROM configuracaosistema');
        if (!cols.some(c => c.Field === 'MaxRegistros')) {
            await connection.execute('ALTER TABLE configuracaosistema ADD COLUMN MaxRegistros INT DEFAULT 500');
            console.log('      ✅ Coluna MaxRegistros adicionada.');
        } else {
            console.log('      ℹ️ Coluna MaxRegistros já existe.');
        }

        // 2. Criar índices de performance
        console.log('[2/4] Criando índice em ordemservicoitemcontrole...');
        try {
            await connection.execute('CREATE INDEX idx_item_processo ON ordemservicoitemcontrole (IdOrdemServicoItem, Processo)');
            console.log('      ✅ Índice IdOrdemServicoItem + Processo criado.');
        } catch (e) {
            console.log('      ℹ️ Índice já existe ou erro ignorado:', e.message);
        }

        console.log('[3/4] Criando índices em ordemservicoitem...');
        try {
            await connection.execute('CREATE INDEX idx_os_liberado ON ordemservicoitem (IdOrdemServico, Liberado_engenharia)');
            console.log('      ✅ Índice IdOrdemServico + Liberado criado.');
        } catch (e) {
            console.log('      ℹ️ Índice já existe ou erro ignorado:', e.message);
        }

        console.log('[4/4] Criando índices em ordemservico...');
        try {
            await connection.execute('CREATE INDEX idx_os_delete ON ordemservico (D_E_L_E_T_E)');
            console.log('      ✅ Índice D_E_L_E_T_E criado.');
        } catch (e) {
            console.log('      ℹ️ Índice já existe ou erro ignorado:', e.message);
        }

        console.log('\n--- OTIMIZAÇÃO CONCLUÍDA COM SUCESSO ---');

    } catch (err) {
        console.error('❌ ERRO NA OTIMIZAÇÃO:', err.message);
    } finally {
        await connection.end();
    }
}

migrate();
