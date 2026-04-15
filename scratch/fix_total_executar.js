const mysql = require('mysql2/promise');
const path = require('path');

// Configuração manual para garantir conexão (baseada no db.js observado)
const dbConfig = {
    host: 'lynxlocal.mysql.uhserver.com',
    user: 'lynxlocal_root',
    password: 'lynx@2022',
    database: 'lynxlocal',
    port: 3306
};

const sequence = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
const setorColumns = {
    corte: { txt: 'txtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' },
    dobra: { txt: 'txtDobra', total: 'DobraTotalExecutado', executar: 'DobraTotalExecutar' },
    solda: { txt: 'txtSolda', total: 'SoldaTotalExecutado', executar: 'SoldaTotalExecutar' },
    pintura: { txt: 'txtPintura', total: 'PinturaTotalExecutado', executar: 'PinturaTotalExecutar' },
    montagem: { txt: 'TxtMontagem', total: 'MontagemTotalExecutado', executar: 'MontagemTotalExecutar' }
};

const NULLIF_TRIM = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    return s === '' ? '' : s;
};

async function fixBalances() {
    let conn;
    try {
        console.log('[FIX] Iniciando conexão com lynxlocal...');
        conn = await mysql.createConnection(dbConfig);
        console.log('[FIX] Conectado com sucesso.');

        // 1. Buscar todos os itens que não estão finalizados
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

        console.log(`[FIX] Processando ${items.length} itens...`);

        for (const item of items) {
            const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
            const updates = [];
            const params = [];

            // Identificar setores ativos
            const activeSectors = [];
            for (const sName of sequence) {
                const config = setorColumns[sName];
                if (NULLIF_TRIM(item[config.txt]) === '1') {
                    activeSectors.push(sName);
                }
            }

            if (activeSectors.length === 0) continue;

            // Regra de Normalização:
            // - Primeiro setor ativo: Executar = QtdeTotal - TotalExecutado (para permitir terminar o que já começou)
            //   Na verdade, o usuário disse: "o total a executar não pode ser a quantidade total e sim a quantidade executada do setor anterior"
            //   Mas o primeiro setor não tem anterior. Logo ele deve ser o único com o total.
            
            for (let i = 0; i < activeSectors.length; i++) {
                const sName = activeSectors[i];
                const config = setorColumns[sName];
                let targetExecutar = 0;

                if (i === 0) {
                    // Primeiro setor ativo: Saldo total disponível
                    targetExecutar = Math.max(0, qtdeTotal); 
                    // Nota: Não subtraímos o 'TotalExecutado' do próprio setor no campo 'Executar' do BD, 
                    // pois o campo 'Executar' no SincoWeb parece representar o TOTAL que entrou no setor, 
                    // e a lógica de UI subtrai o executado. 
                    // OU, se o campo 'Executar' for o SALDO RESTANTE:
                    // Verificando lógica do server.js anterior: 'const novoTotalExecutar = Math.max(0, totalExecutarLimit - currentInputQty);'
                    // Isso sugere que 'Executar' é o SALDO RESTANTE.
                    
                    // Então: 
                    targetExecutar = Math.max(0, qtdeTotal - (parseFloat(item[config.total]) || 0));
                } else {
                    // Setores subsequentes: Saldo = o que o anterior produziu - o que eu já produzi
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
                console.log(`[FIX] Item ${item.IdOrdemServicoItem} corrigido: ${updates.length} campos.`);
            }
        }

        console.log('[FIX] Finalizado com sucesso.');
    } catch (error) {
        console.error('[FIX] Erro:', error);
    } finally {
        if (conn) await conn.end();
    }
}

fixBalances();
