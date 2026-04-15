const express = require('express');
const db = require('../src/config/db');
const app = express();
const port = 3001;

app.post('/fix', async (req, res) => {
    let conn;
    try {
        console.log('[TEMP-FIX] Iniciando normalização...');
        conn = await db.getConnection();
        
        const sequence = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
        const setorColumns = {
            corte: { txt: 'txtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' },
            dobra: { txt: 'txtDobra', total: 'DobraTotalExecutado', executar: 'DobraTotalExecutar' },
            solda: { txt: 'txtSolda', total: 'SoldaTotalExecutado', executar: 'SoldaTotalExecutar' },
            pintura: { txt: 'txtPintura', total: 'PinturaTotalExecutado', executar: 'PinturaTotalExecutar' },
            montagem: { txt: 'TxtMontagem', total: 'MontagemTotalExecutado', executar: 'MontagemTotalExecutar' }
        };

        const [items] = await conn.execute(`
            SELECT IdOrdemServicoItem, QtdeTotal, 
                   txtCorte, CorteTotalExecutado, CorteTotalExecutar,
                   txtDobra, DobraTotalExecutado, DobraTotalExecutar,
                   txtSolda, SoldaTotalExecutado, SoldaTotalExecutar,
                   txtPintura, PinturaTotalExecutado, PinturaTotalExecutar,
                   TxtMontagem, MontagemTotalExecutado, MontagemTotalExecutar
            FROM ordemservicoitem
            WHERE (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `);

        let correctedTotal = 0;
        for (const item of items) {
            const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
            const updates = [];
            const params = [];
            const activeSectors = [];

            for (const sName of sequence) {
                const config = setorColumns[sName];
                const val = (item[config.txt] || '').toString().trim();
                // O VB usa '1' para ativo
                if (val === '1' || val === 'S') activeSectors.push(sName);
            }

            if (activeSectors.length === 0) continue;

            for (let i = 0; i < activeSectors.length; i++) {
                const sName = activeSectors[i];
                const config = setorColumns[sName];
                let targetExecutar = 0;

                if (i === 0) {
                    targetExecutar = Math.max(0, qtdeTotal - (parseFloat(item[config.total]) || 0));
                } else {
                    const prevSName = activeSectors[i - 1];
                    const prevConfig = setorColumns[prevSName];
                    const vindoDoAnterior = parseFloat(item[prevConfig.total]) || 0;
                    const jaProduzidoAqui = parseFloat(item[config.total]) || 0;
                    targetExecutar = Math.max(0, vindoDoAnterior - jaProduzidoAqui);
                }

                const currentVal = parseFloat(item[config.executar]) || 0;
                if (Math.abs(currentVal - targetExecutar) > 0.001) {
                    updates.push(`${config.executar} = ?`);
                    params.push(targetExecutar);
                }
            }

            if (updates.length > 0) {
                params.push(item.IdOrdemServicoItem);
                await conn.execute(`UPDATE ordemservicoitem SET ${updates.join(', ')} WHERE IdOrdemServicoItem = ?`, params);
                correctedTotal++;
            }
        }
        console.log(`[TEMP-FIX] Sucesso: ${correctedTotal} itens corrigidos.`);
        res.json({ success: true, correctedTotal });
    } catch (e) {
        console.error('[TEMP-FIX] Erro:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (conn) conn.release();
    }
});

app.listen(port, () => {
    console.log(`Temp fix server listening at http://localhost:${port}`);
});
