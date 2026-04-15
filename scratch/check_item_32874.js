const pool = require('../src/config/db');

async function checkItem() {
    const id = 32874;
    try {
        console.log(`--- Checking Item ${id} ---`);
        const [rows] = await pool.execute('SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = ?', [id]);
        if (rows.length === 0) {
            console.log('Item not found.');
            return;
        }
        const item = rows[0];
        console.log('Current Database State:');
        console.log(`- QtdeTotal: ${item.QtdeTotal}`);
        console.log(`- Corte: Exec:${item.CorteTotalExecutado}, Pend:${item.CorteTotalExecutar}, Status:${item.sttxtCorte}`);
        console.log(`- Dobra: Exec:${item.DobraTotalExecutado}, Pend:${item.DobraTotalExecutar}, Status:${item.sttxtDobra}`);
        console.log(`- Solda: Exec:${item.SoldaTotalExecutado}, Pend:${item.SoldaTotalExecutar}, Status:${item.sttxtSolda}`);
        console.log(`- Pintura: Exec:${item.PinturaTotalExecutado}, Pend:${item.PinturaTotalExecutar}, Status:${item.sttxtPintura}`);
        console.log(`- Montagem: Exec:${item.MontagemTotalExecutado}, Pend:${item.MontagemTotalExecutar}, Status:${item.sttxtMontagem}`);

        console.log('\n--- Checking Pointing Logs (ordemservicoitemcontrole) ---');
        const [logs] = await pool.execute(`
            SELECT IdOrdemServicoItemControle, Processo, QtdeProduzida, DataCriacao, CriadoPor 
            FROM ordemservicoitemcontrole 
            WHERE IdOrdemServicoItem = ? 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
            ORDER BY DataCriacao ASC
        `, [id]);
        
        if (logs.length === 0) {
            console.log('No pointing logs found.');
        } else {
            logs.forEach(l => {
                console.log(`- [${l.DataCriacao}] ${l.Processo}: ${l.QtdeProduzida} by ${l.CriadoPor}`);
            });
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkItem();
