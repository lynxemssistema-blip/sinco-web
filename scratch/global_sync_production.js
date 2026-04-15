const pool = require('../src/config/db');

async function globalSync() {
    try {
        console.log('--- Starting Global Production Synchronization ---');

        const sectors = [
            { exec: 'CorteTotalExecutado', pend: 'CorteTotalExecutar', perc: 'CortePercentual', status: 'sttxtCorte', txt: 'txtCorte' },
            { exec: 'DobraTotalExecutado', pend: 'DobraTotalExecutar', perc: 'DobraPercentual', status: 'sttxtDobra', txt: 'txtDobra' },
            { exec: 'SoldaTotalExecutado', pend: 'SoldaTotalExecutar', perc: 'SoldaPercentual', status: 'sttxtSolda', txt: 'txtSolda' },
            { exec: 'PinturaTotalExecutado', pend: 'PinturaTotalExecutar', perc: 'PinturaPercentual', status: 'sttxtPintura', txt: 'txtPintura' },
            { exec: 'MontagemTotalExecutado', pend: 'MontagemTotalExecutar', perc: 'MontagemPercentual', status: 'sttxtMontagem', txt: 'TxtMontagem' }
        ];

        // 1. Sync Items
        console.log('\n[1/4] Synchronizing Items (Saldos, Percentuais e Status)...');
        for (const s of sectors) {
            console.log(`  Processing ${s.exec}...`);
            // Update Balance, Percent and Status in one go if possible, or per row for precision
            // We use SQL logic to ensure consistency
            await pool.execute(`
                UPDATE ordemservicoitem 
                SET 
                    ${s.pend} = CASE 
                        WHEN QtdeTotal > 0 THEN GREATEST(0, QtdeTotal - COALESCE(${s.exec}, 0))
                        ELSE 0 
                    END,
                    ${s.perc} = CASE 
                        WHEN QtdeTotal > 0 THEN ROUND((COALESCE(${s.exec}, 0) / QtdeTotal) * 100)
                        ELSE 0 
                    END,
                    ${s.status} = CASE 
                        WHEN QtdeTotal > 0 AND COALESCE(${s.exec}, 0) >= QtdeTotal THEN 'C'
                        ELSE ${s.status}
                    END
                WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
            `);
        }

        // 2. Sync OS
        console.log('\n[2/4] Synchronizing Ordem de Servico Totals...');
        for (const s of sectors) {
            console.log(`  Processing ${s.exec} for OS...`);
            await pool.execute(`
                UPDATE ordemservico os
                SET os.${s.exec} = (
                    SELECT COALESCE(SUM(COALESCE(osi.${s.exec}, 0)), 0)
                    FROM ordemservicoitem osi
                    WHERE osi.IdOrdemServico = os.IdOrdemServico
                      AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
                )
                WHERE (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            `);
        }

        // 3. Sync Tags
        console.log('\n[3/4] Synchronizing Tag Totals...');
        for (const s of sectors) {
            console.log(`  Processing ${s.exec} for Tags...`);
             await pool.execute(`
                UPDATE tags t
                SET t.${s.exec} = (
                    SELECT COALESCE(SUM(COALESCE(os.${s.exec}, 0)), 0)
                    FROM ordemservico os
                    WHERE os.Tag = t.DescTag
                      AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
                )
            `);
        }

        // 4. Sync Projects
        console.log('\n[4/4] Synchronizing Project Totals...');
        for (const s of sectors) {
            console.log(`  Processing ${s.exec} for Projects...`);
            await pool.execute(`
                UPDATE projetos p
                SET p.${s.exec} = (
                    SELECT COALESCE(SUM(COALESCE(os.${s.exec}, 0)), 0)
                    FROM ordemservico os
                    WHERE os.IdProjeto = p.IdProjeto
                      AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
                )
            `);
        }

        console.log('\n--- Global Synchronization Completed Successfully ---');
    } catch (e) {
        console.error('CRITICAL ERROR during global sync:', e);
    } finally {
        process.exit();
    }
}

globalSync();
