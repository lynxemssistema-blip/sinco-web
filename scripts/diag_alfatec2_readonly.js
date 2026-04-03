/**
 * DIAGNÓSTICO READ-ONLY: alfatec2
 * Verifica estrutura da tabela configuracaosistema sem fazer nenhuma modificação.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function diagnostic() {
    // 1. Buscar configuração de conexão do alfatec2 na tabela central
    const central = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
        port: 3306,
    });

    console.log('\n=== DIAGNÓSTICO READ-ONLY: alfatec2 ===\n');
    console.log('[1] Buscando configuração de conexão do alfatec2...');
    const [connRows] = await central.execute(
        'SELECT db_name, db_host, db_user, db_pass, db_port, ativo FROM conexoes_bancos WHERE db_name = ?',
        ['alfatec2']
    );

    if (connRows.length === 0) {
        console.log('  ❌ alfatec2 NÃO encontrado na tabela conexoes_bancos!');
        console.log('  → Isso significa que o tenant middleware não pode criar o pool para este banco.');
        
        // Listar bancos disponíveis
        const [allBanks] = await central.execute('SELECT db_name, ativo FROM conexoes_bancos ORDER BY db_name');
        console.log(`\n  Bancos disponíveis (${allBanks.length}):`);
        allBanks.forEach(b => console.log(`    - ${b.db_name} (ativo=${b.ativo})`));
        await central.end();
        return;
    }

    const cfg = connRows[0];
    console.log(`  ✅ alfatec2 encontrado. Host: ${cfg.db_host}, Ativo: ${cfg.ativo}`);

    if (!cfg.ativo) {
        console.log('  ⚠️  BANCO INATIVO — o middleware ignora bancos inativos!');
    }

    await central.end();

    // 2. Conectar ao alfatec2 (READ ONLY — apenas SELECT)
    console.log('\n[2] Conectando ao banco alfatec2...');
    const conn = await mysql.createConnection({
        host: cfg.db_host,
        user: cfg.db_user,
        password: cfg.db_pass,
        database: cfg.db_name,
        port: cfg.db_port || 3306,
    });

    // 3. Verificar se tabela configuracaosistema existe
    console.log('\n[3] Verificando existência da tabela configuracaosistema...');
    const [tables] = await conn.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema'`,
        [cfg.db_name]
    );

    if (tables.length === 0) {
        console.log('  ❌ TABELA NÃO EXISTE no banco alfatec2!');
        console.log('  → Isso causa o erro ao salvar — o INSERT/UPDATE falha.');
        
        // Listar tabelas existentes para referência
        const [allTables] = await conn.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
            [cfg.db_name]
        );
        console.log(`\n  Tabelas disponíveis no alfatec2 (${allTables.length}):`);
        allTables.slice(0, 30).forEach(t => console.log(`    - ${t.TABLE_NAME}`));
        if (allTables.length > 30) console.log(`    ... e mais ${allTables.length - 30} tabelas`);

        await conn.end();
        return;
    }

    // 4. Verificar colunas existentes
    console.log('  ✅ Tabela existe. Verificando colunas...');
    const [cols] = await conn.execute(
        `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'configuracaosistema'
         ORDER BY ORDINAL_POSITION`,
        [cfg.db_name]
    );

    console.log(`\n  Colunas na tabela configuracaosistema (${cols.length}):`);
    cols.forEach(c => console.log(`    - ${c.COLUMN_NAME} (${c.DATA_TYPE}, nullable=${c.IS_NULLABLE}, default=${c.COLUMN_DEFAULT})`));

    // Verificar colunas necessárias
    const colNames = cols.map(c => c.COLUMN_NAME);
    const needed = ['RestringirApontamentoSemSaldoAnterior', 'ProcessosVisiveis'];
    console.log('\n  Colunas necessárias para o GET/PUT /api/config:');
    needed.forEach(n => {
        const ok = colNames.includes(n);
        console.log(`    ${ok ? '✅' : '❌'} ${n} ${ok ? '' : '— AUSENTE!'}`);
    });

    // 5. Verificar dados existentes
    const [rows] = await conn.execute('SELECT * FROM configuracaosistema LIMIT 5');
    console.log(`\n[4] Registros existentes (${rows.length}):`);
    console.table(rows);

    // 6. Testar se SELECT funciona (simula o GET /api/config)
    console.log('\n[5] Simulando GET /api/config...');
    try {
        const [configRows] = await conn.execute(
            'SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1'
        );
        console.log('  ✅ SELECT OK:', configRows);
    } catch (e) {
        console.log('  ❌ ERRO no SELECT:', e.message);
        console.log('  → Este é o motivo da falha!');
    }

    await conn.end();
    console.log('\n=== FIM DO DIAGNÓSTICO ===');
}

diagnostic().catch(err => {
    console.error('\n❌ Erro fatal no diagnóstico:', err.message);
    process.exit(1);
});
