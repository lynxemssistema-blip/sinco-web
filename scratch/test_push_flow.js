const mysql = require('mysql2/promise');
require('dotenv').config();

async function testPushFlow() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'lynxlocal',
        database: process.env.DB_NAME || 'lynxlocal',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    console.log('--- TESTE DE FLUXO PUSH ---');
    
    // 1. Localizar um item que tenha Corte e Dobra ativos
    const [itens] = await pool.execute(`
        SELECT IdOrdemServicoItem, IdOrdemServico, QtdeTotal, 
               CorteTotalExecutado, CorteTotalExecutar,
               DobraTotalExecutado, DobraTotalExecutar
        FROM ordemservicoitem 
        WHERE txtCorte = '1' AND txtDobra = '1' 
          AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') 
        LIMIT 1
    `);

    if (itens.length === 0) {
        console.error('Nenhum item com Corte e Dobra encontrado para teste.');
        process.exit(1);
    }

    const item = itens[0];
    console.log(`Testando Item ID: ${item.IdOrdemServicoItem}`);
    console.log(`Saldo inicial Dobra: ${item.DobraTotalExecutar}`);

    // Mock do POST /api/apontamento logic
    // Simulando apontamento de 1 unidade no Corte
    const currentInputQty = 1;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Simular o que o server.js faz agora:
        // 1. Incrementa o que foi produzido no Corte
        await connection.execute(`UPDATE ordemservicoitem SET CorteTotalExecutado = CorteTotalExecutado + ? WHERE IdOrdemServicoItem = ?`, [currentInputQty, item.IdOrdemServicoItem]);
        
        // 2. INCREMENTA O SALDO A EXECUTAR DA DOBRA (PUSH)
        console.log(`Incrementando Dobra em ${currentInputQty}...`);
        await connection.execute(`UPDATE ordemservicoitem SET DobraTotalExecutar = COALESCE(DobraTotalExecutar, 0) + ? WHERE IdOrdemServicoItem = ?`, [currentInputQty, item.IdOrdemServicoItem]);
        
        await connection.commit();
        
        // Verificar resultado
        const [result] = await connection.execute(`SELECT DobraTotalExecutar FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`, [item.IdOrdemServicoItem]);
        console.log(`Saldo final Dobra: ${result[0].DobraTotalExecutar}`);
        
        if (result[0].DobraTotalExecutar == (Number(item.DobraTotalExecutar) + currentInputQty)) {
            console.log('SUCESSO: O fluxo push funcionou.');
        } else {
            console.log('FALHA: O saldo da Dobra não foi incrementado corretamente.');
        }

        // Rollback do teste (Manter banco limpo)
        await connection.beginTransaction();
        await connection.execute(`UPDATE ordemservicoitem SET CorteTotalExecutado = CorteTotalExecutado - ?, DobraTotalExecutar = DobraTotalExecutar - ? WHERE IdOrdemServicoItem = ?`, [currentInputQty, currentInputQty, item.IdOrdemServicoItem]);
        await connection.commit();

    } catch (e) {
        await connection.rollback();
        console.error('Erro no teste:', e);
    } finally {
        connection.release();
        await pool.end();
    }
}

testPushFlow();
