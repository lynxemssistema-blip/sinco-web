const mysql = require('mysql2/promise');
require('dotenv').config();

const CENTRAL_DB_CONFIG = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    waitForConnections: true,
    connectionLimit: 10
};

async function verificarPercentuais() {
    let pool;

    try {
        console.log('🔍 Conectando ao banco de dados...\n');
        pool = mysql.createPool(CENTRAL_DB_CONFIG);

        // Teste 1: Verificar consistência dos percentuais
        console.log('📊 TESTE 1: Consistência de Percentuais\n');
        console.log('═'.repeat(80));

        const [rows] = await pool.execute(`
            SELECT 
                osi.IdOrdemServicoItem,
                osi.QtdeTotal,
                osi.CortePercentual,
                COALESCE(SUM(CASE WHEN c.Processo = 'corte' THEN CAST(c.QtdeProduzida AS UNSIGNED) ELSE 0 END), 0) as QtdeProduzidaCorte,
                ROUND((COALESCE(SUM(CASE WHEN c.Processo = 'corte' THEN CAST(c.QtdeProduzida AS UNSIGNED) ELSE 0 END), 0) / NULLIF(osi.QtdeTotal, 0)) * 100, 0) AS PercentualCalculado,
                CASE 
                    WHEN osi.CortePercentual = ROUND((COALESCE(SUM(CASE WHEN c.Processo = 'corte' THEN CAST(c.QtdeProduzida AS UNSIGNED) ELSE 0 END), 0) / NULLIF(osi.QtdeTotal, 0)) * 100, 0)
                    THEN '✅ OK'
                    ELSE '⚠️ DIVERGENTE'
                END AS Status
            FROM ordemservicoitem osi
            LEFT JOIN ordemservicoitemcontrole c ON osi.IdOrdemServicoItem = c.IdOrdemServicoItem 
                AND c.Processo = 'corte'
                AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E = '')
            WHERE osi.QtdeTotal > 0 
              AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
            GROUP BY osi.IdOrdemServicoItem, osi.QtdeTotal, osi.CortePercentual
            HAVING QtdeProduzidaCorte > 0
            LIMIT 15
        `);

        console.log('\n| Item | Qtde Total | Produzida | % Banco | % Calculado | Status |');
        console.log('|------|-----------|-----------|---------|-------------|--------|');

        let divergentes = 0;
        rows.forEach(row => {
            const status = row.Status === '✅ OK' ? '✅' : '⚠️';
            if (row.Status !== '✅ OK') divergentes++;

            console.log(
                `| ${String(row.IdOrdemServicoItem).padEnd(5)} | ` +
                `${String(row.QtdeTotal).padEnd(10)} | ` +
                `${String(row.QtdeProduzidaCorte || 0).padEnd(10)} | ` +
                `${String(row.CortePercentual || 0).padEnd(8)}% | ` +
                `${String(row.PercentualCalculado || 0).padEnd(12)}% | ` +
                `${status.padEnd(7)} |`
            );
        });

        console.log('\n' + '═'.repeat(80));
        console.log(`📈 Total analisado: ${rows.length} itens`);
        console.log(`✅ Consistentes: ${rows.length - divergentes}`);
        console.log(`⚠️ Divergentes: ${divergentes}\n`);

        // Teste 2: Verificar triggers
        console.log('🔧 TESTE 2: Verificando Triggers\n');
        console.log('═'.repeat(80));

        const [triggers] = await pool.execute(`
            SHOW TRIGGERS WHERE \`Table\` IN ('ordemservicoitemcontrole', 'ordemservicoitem')
        `);

        if (triggers.length === 0) {
            console.log('⚠️ NENHUM TRIGGER ENCONTRADO!');
            console.log('   Isso explica possíveis divergências nos percentuais.\n');
        } else {
            console.log(`✅ Encontrados ${triggers.length} trigger(s):\n`);
            triggers.forEach(t => {
                console.log(`   - ${t.Trigger} (${t.Event} on ${t.Table})`);
            });
            console.log();
        }

        // Teste 3: Últimos apontamentos
        console.log('📝 TESTE 3: Últimos Apontamentos Registrados\n');
        console.log('═'.repeat(80));

        const [apontamentos] = await pool.execute(`
            SELECT 
                c.IdOrdemServicoItem,
                c.Processo,
                c.QtdeProduzida,
                c.DataCriacao,
                i.QtdeTotal,
                CASE c.Processo
                    WHEN 'corte' THEN i.CortePercentual
                    WHEN 'dobra' THEN i.DobraPercentual
                    WHEN 'solda' THEN i.SoldaPercentual
                    WHEN 'pintura' THEN i.PinturaPercentual
                    WHEN 'montagem' THEN i.MontagemPercentual
                END as PercentualAtual
            FROM ordemservicoitemcontrole c
            INNER JOIN ordemservicoitem i ON c.IdOrdemServicoItem = i.IdOrdemServicoItem
            WHERE (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E = '')
            ORDER BY c.DataCriacao DESC
            LIMIT 10
        `);

        console.log('\n| Item | Processo | Qtde | Data | % Atual |');
        console.log('|------|----------|------|------|---------|');

        apontamentos.forEach(a => {
            const data = new Date(a.DataCriacao).toLocaleString('pt-BR');
            console.log(
                `| ${String(a.IdOrdemServicoItem).padEnd(5)} | ` +
                `${String(a.Processo).padEnd(9)} | ` +
                `${String(a.QtdeProduzida).padEnd(5)} | ` +
                `${data.padEnd(20)} | ` +
                `${String(a.PercentualAtual || 0).padEnd(8)}% |`
            );
        });

        console.log('\n' + '═'.repeat(80));

        // Teste 4: Stored Procedures
        console.log('\n🔨 TESTE 4: Verificando Stored Procedures\n');
        console.log('═'.repeat(80));

        const [procedures] = await pool.execute(`
            SHOW PROCEDURE STATUS WHERE Db = '${CENTRAL_DB_CONFIG.database}'
        `);

        if (procedures.length === 0) {
            console.log('ℹ️ Nenhuma stored procedure encontrada.\n');
        } else {
            console.log(`✅ Encontradas ${procedures.length} procedure(s):\n`);
            procedures.forEach(p => {
                console.log(`   - ${p.Name} (${p.Type})`);
            });
            console.log();
        }

        // Conclusão
        console.log('📋 CONCLUSÃO\n');
        console.log('═'.repeat(80));

        if (divergentes > 0 && triggers.length === 0) {
            console.log('⚠️ PROBLEMA IDENTIFICADO:');
            console.log('   - Existem divergências nos percentuais');
            console.log('   - NÃO há triggers para atualizar automaticamente');
            console.log('   - Frontend está calculando manualmente (fallback)\n');
            console.log('💡 RECOMENDAÇÃO:');
            console.log('   Opção A: Criar triggers para atualizar percentuais automaticamente');
            console.log('   Opção B: Sempre calcular no frontend (mais simples)\n');
        } else if (divergentes === 0) {
            console.log('✅ SISTEMA FUNCIONANDO CORRETAMENTE!');
            console.log('   - Percentuais consistentes entre banco e cálculo');
            console.log('   - Apontamentos sendo registrados corretamente\n');
        }

        console.log('═'.repeat(80));

    } catch (error) {
        console.error('❌ Erro durante verificação:', error.message);
    } finally {
        if (pool) {
            await pool.end();
            console.log('\n✅ Conexão encerrada.\n');
        }
    }
}

// Executar verificação
verificarPercentuais();
