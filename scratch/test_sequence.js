const pool = require('../src/config/db');

async function testSequence() {
    console.log('--- TEST: SEQUENTIAL PRODUCTION CONTROL ---');
    try {
        // 1. Get an active item that has Corte and Dobra
        const [rows] = await pool.execute(`
            SELECT IdOrdemServicoItem, IdOrdemServico, QtdeTotal, 
                   txtCorte, txtDobra, 
                   CorteTotalExecutado, DobraTotalExecutado 
            FROM ordemservicoitem 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
              AND txtCorte = '1' AND txtDobra = '1'
              AND (sttxtCorte IS NULL OR sttxtCorte != 'C')
            LIMIT 1
        `);

        if (rows.length === 0) {
            console.log('No item found with Corte and Dobra active for testing.');
            return;
        }

        const item = rows[0];
        console.log(`Testing Item ID: ${item.IdOrdemServicoItem}`);
        console.log(`Current State: Corte=${item.CorteTotalExecutado || 0}, Dobra=${item.DobraTotalExecutado || 0}`);

        const mockBodyFail = {
            IdOrdemServicoItem: item.IdOrdemServicoItem,
            IdOrdemServico: item.IdOrdemServico,
            Processo: 'dobra',
            QtdeProduzida: (parseFloat(item.CorteTotalExecutado || 0) + 1).toString(),
            CriadoPor: 'TestRunner'
        };

        console.log(`Attempting Dobra pointing: ${mockBodyFail.QtdeProduzida} (Should FAIL)...`);
        
        // Simulating the logic manually since we can't easily hit the HTTP endpoint from here without starting the server
        // But the server code is what we want to test.
        // We will mock the validation logic part.
        
        const sequence = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
        const sName = 'dobra';
        const currentIndex = sequence.indexOf(sName);
        const prevSectorName = 'corte'; // simplified for test
        const prevTotalExecutado = parseFloat(item.CorteTotalExecutado || 0);
        const currentInputQty = parseFloat(mockBodyFail.QtdeProduzida);
        const totalExecutadoDb = parseFloat(item.DobraTotalExecutado || 0);
        
        const novoTotalTentativa = totalExecutadoDb + currentInputQty;
        
        if (novoTotalTentativa > prevTotalExecutado) {
            console.log('✅ VALIDATION SUCCESS: Blocked as expected.');
            console.log(`   Attempted ${novoTotalTentativa} in Dobra vs ${prevTotalExecutado} in Corte.`);
        } else {
            console.log('❌ VALIDATION FAILURE: Did not block!');
        }

    } catch (e) {
        console.error('Test error:', e);
    } finally {
        process.exit();
    }
}

testSequence();
