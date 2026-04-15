const pool = require('../src/config/db');

async function fixBalances() {
    try {
        console.log('--- Starting Production Balance Correction ---');

        // Target Items: 32874 and others in same OS (12, 15)
        const osIds = [12, 15];
        
        for (const osId of osIds) {
            console.log(`\nChecking OS ${osId}...`);
            const [items] = await pool.execute(`
                SELECT IdOrdemServicoItem, QtdeTotal, 
                       CorteTotalExecutado, DobraTotalExecutado, SoldaTotalExecutado, 
                       PinturaTotalExecutado, MontagemTotalExecutado
                FROM ordemservicoitem 
                WHERE IdOrdemServico = ?
            `, [osId]);

            for (const item of items) {
                const qtdeTotal = Number(item.QtdeTotal) || 0;
                if (qtdeTotal === 0) continue;

                const updates = [];
                const params = [];

                const sectors = [
                    { exec: 'CorteTotalExecutado', pend: 'CorteTotalExecutar' },
                    { exec: 'DobraTotalExecutado', pend: 'DobraTotalExecutar' },
                    { exec: 'SoldaTotalExecutado', pend: 'SoldaTotalExecutar' },
                    { exec: 'PinturaTotalExecutado', pend: 'PinturaTotalExecutar' },
                    { exec: 'MontagemTotalExecutado', pend: 'MontagemTotalExecutar' }
                ];

                let needsFix = false;
                for (const s of sectors) {
                    const exec = Number(item[s.exec]) || 0;
                    const expectedPend = Math.max(0, qtdeTotal - exec);
                    
                    // We check if it needs fix (we'll query the current Pend to be sure, or just update All for these items)
                    updates.push(`${s.pend} = ?`);
                    params.push(expectedPend);
                }

                if (updates.length > 0) {
                    console.log(`  Updating Item ${item.IdOrdemServicoItem} (Qtde: ${qtdeTotal})...`);
                    params.push(item.IdOrdemServicoItem);
                    await pool.execute(`
                        UPDATE ordemservicoitem 
                        SET ${updates.join(', ')}
                        WHERE IdOrdemServicoItem = ?
                    `, params);
                }
            }
        }

        console.log('\n--- Balance Correction Completed ---');
    } catch (e) {
        console.error('Error during correction:', e);
    } finally {
        process.exit();
    }
}

fixBalances();
