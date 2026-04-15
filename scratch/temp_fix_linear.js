const express = require('express');
const db = require('../src/config/db');
const app = express();
const port = 3001;

app.post('/fix-linear', async (req, res) => {
    let conn;
    try {
        console.log('[LINEAR-FIX] Iniciando normalização linear no LYNXLOCAL...');
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
                   CorteTotalExecutado, CorteTotalExecutar,
                   DobraTotalExecutado, DobraTotalExecutar,
                   SoldaTotalExecutado, SoldaTotalExecutar,
                   PinturaTotalExecutado, PinturaTotalExecutar,
                   MontagemTotalExecutado, MontagemTotalExecutar
            FROM ordemservicoitem
            WHERE (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `);

        console.log(`[LINEAR-FIX] Processando ${items.length} itens...`);
        let correctedCount = 0;

        for (const item of items) {
            const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
            const updates = [];
            const params = [];

            // A normalização linear aplica-se a todos os setores na ordem da sequência
            for (let i = 0; i < sequence.length; i++) {
                const sName = sequence[i];
                const config = setorColumns[sName];
                let targetExecutar = 0;

                if (i === 0) {
                    // Primeiro setor (Corte): Saldo do item
                    targetExecutar = Math.max(0, qtdeTotal - (parseFloat(item[config.total]) || 0));
                } else {
                    // Setores seguintes: Saldo é o que veio do anterior - o que já fiz aqui
                    const prevSName = sequence[i - 1];
                    const prevConfig = setorColumns[prevSName];
                    const vindoDoAnterior = parseFloat(item[prevConfig.total]) || 0;
                    const jaProduzidoAqui = parseFloat(item[config.total]) || 0;
                    targetExecutar = Math.max(0, vindoDoAnterior - jaProduzidoAqui);
                }

                const currentVal = (item[config.executar] === null) ? -1 : parseFloat(item[config.executar]);
                if (Math.abs(currentVal - targetExecutar) > 0.001) {
                    updates.push(`${config.executar} = ?`);
                    params.push(targetExecutar);
                }
            }

            if (updates.length > 0) {
                params.push(item.IdOrdemServicoItem);
                await conn.execute(`UPDATE ordemservicoitem SET ${updates.join(', ')} WHERE IdOrdemServicoItem = ?`, params);
                correctedCount++;
            }
        }

        console.log(`[LINEAR-FIX] Sucesso: ${correctedCount} itens normalizados linearmente.`);
        res.json({ success: true, itemsProcessed: items.length, correctedCount });
    } catch (e) {
        console.error('[LINEAR-FIX] Erro:', e);
        res.status(500).json({ error: e.message });
    } finally {
        if (conn) conn.release();
    }
});

app.listen(port, () => {
    console.log(`Linear Fix server listening at http://localhost:${port}`);
});
