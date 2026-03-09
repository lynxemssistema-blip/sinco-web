const mysql = require('mysql2/promise');
require('dotenv').config();

async function corrigirTabelaConfiguracao() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal'
    });

    try {
        console.log('🔍 Verificando estrutura da tabela configuracaosistema...\n');

        // Verificar estrutura atual
        const [cols] = await pool.execute('SHOW COLUMNS FROM configuracaosistema');

        console.log('📋 Colunas atuais:');
        const existingColumns = [];
        cols.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
            existingColumns.push(col.Field);
        });
        console.log('');

        // Adicionar colunas faltantes
        const requiredColumns = {
            'RestringirApontamentoSemSaldoAnterior': "VARCHAR(10) DEFAULT 'Não'",
            'ProcessosVisiveis': "TEXT",
            'MenuStructure': "LONGTEXT"
        };

        for (const [colName, colDef] of Object.entries(requiredColumns)) {
            if (!existingColumns.includes(colName)) {
                console.log(`⚠️ Adicionando coluna ${colName}...`);
                await pool.execute(`ALTER TABLE configuracaosistema ADD COLUMN ${colName} ${colDef}`);
                console.log(`✅ Coluna ${colName} adicionada!\n`);
            } else {
                console.log(`✅ Coluna ${colName} já existe.\n`);
            }
        }

        // Verificar se existe registro
        const [rows] = await pool.execute('SELECT * FROM configuracaosistema LIMIT 1');

        if (rows.length === 0) {
            console.log('⚠️ Tabela vazia. Inserindo configuração padrão...');
            await pool.execute(`
                INSERT INTO configuracaosistema 
                (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, MenuStructure)
                VALUES (?, ?, NULL)
            `, ['Não', '["corte","dobra","solda","pintura","montagem"]']);
            console.log('✅ Configuração padrão inserida!\n');
        } else {
            console.log('✅ Registro de configuração encontrado:\n');
            const config = rows[0];
            console.log(`   ID: ${config.id}`);
            console.log(`   RestringirApontamento: ${config.RestringirApontamentoSemSaldoAnterior || 'não definido'}`);
            console.log(`   ProcessosVisiveis: ${config.ProcessosVisiveis || 'não definido'}`);
            console.log(`   MenuStructure: ${config.MenuStructure ? 'definido' : 'NULL'}\n`);

            // Atualizar valores NULL para defaults usando o ID correto
            if (!config.ProcessosVisiveis) {
                console.log('⚠️ ProcessosVisiveis NULL. Atualizando...');
                await pool.execute(`
                    UPDATE configuracaosistema 
                    SET ProcessosVisiveis = ? 
                    WHERE id = ?
                `, ['["corte","dobra","solda","pintura","montagem"]', config.id]);
                console.log('✅ ProcessosVisiveis atualizado!\n');
            }

            if (!config.RestringirApontamentoSemSaldoAnterior || config.RestringirApontamentoSemSaldoAnterior === '') {
                console.log('⚠️ RestringirApontamentoSemSaldoAnterior NULL/vazio. Atualizando...');
                await pool.execute(`
                    UPDATE configuracaosistema 
                    SET RestringirApontamentoSemSaldoAnterior = ? 
                    WHERE id = ?
                `, ['Não', config.id]);
                console.log('✅ RestringirApontamentoSemSaldoAnterior atualizado!\n');
            }
        }

        console.log('📋 Estrutura final:\n');
        const [finalCols] = await pool.execute('SHOW COLUMNS FROM configuracaosistema');
        finalCols.forEach(col => {
            console.log(`   ${col.Field.padEnd(40)} ${col.Type.padEnd(15)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n✅ Tabela configurada com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

corrigirTabelaConfiguracao();
