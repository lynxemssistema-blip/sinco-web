const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sincoweb'
        });

        console.log("Conectado ao banco de dados para corrigir status dos setores...");

        // Passo 1: Reverter setores com status 'C' prematuro (onde TotalExecutado < QtdeTotal)
        const queriesRevertSectors = [
            { desc: 'Corte', sql: "UPDATE ordemservicoitem SET sttxtCorte = NULL WHERE txtCorte = '1' AND sttxtCorte = 'C' AND COALESCE(CorteTotalExecutado, 0) < COALESCE(QtdeTotal, 0)" },
            { desc: 'Dobra', sql: "UPDATE ordemservicoitem SET sttxtDobra = NULL WHERE txtDobra = '1' AND sttxtDobra = 'C' AND COALESCE(DobraTotalExecutado, 0) < COALESCE(QtdeTotal, 0)" },
            { desc: 'Solda', sql: "UPDATE ordemservicoitem SET sttxtSolda = NULL WHERE txtSolda = '1' AND sttxtSolda = 'C' AND COALESCE(SoldaTotalExecutado, 0) < COALESCE(QtdeTotal, 0)" },
            { desc: 'Pintura', sql: "UPDATE ordemservicoitem SET sttxtPintura = NULL WHERE txtPintura = '1' AND sttxtPintura = 'C' AND COALESCE(PinturaTotalExecutado, 0) < COALESCE(QtdeTotal, 0)" },
            { desc: 'Montagem', sql: "UPDATE ordemservicoitem SET sttxtMontagem = NULL WHERE (txtMontagem = '1' OR TxtMontagem = '1') AND sttxtMontagem = 'C' AND COALESCE(MontagemTotalExecutado, 0) < COALESCE(QtdeTotal, 0)" }
        ];

        let totalSectorsFixed = 0;
        for (const q of queriesRevertSectors) {
            const [result] = await connection.execute(q.sql);
            if (result.affectedRows > 0) {
                console.log(`Corrigidos ${result.affectedRows} itens no setor ${q.desc} (removeu 'C' indevido).`);
                totalSectorsFixed += result.affectedRows;
            }
        }

        if (totalSectorsFixed === 0) {
            console.log("Nenhum setor estava com 'C' indevido.");
        }

        // Passo 2: Reverter o status 'C' geral do Item se algum de seus setores ativos não estiver mais 'C'
        const revertItemQuery = `
            UPDATE ordemservicoitem 
            SET OrdemServicoItemFinalizado = NULL
            WHERE OrdemServicoItemFinalizado = 'C'
            AND (
                (NULLIF(txtCorte, '') = '1' AND COALESCE(sttxtCorte, '') != 'C') OR
                (NULLIF(txtDobra, '') = '1' AND COALESCE(sttxtDobra, '') != 'C') OR
                (NULLIF(txtSolda, '') = '1' AND COALESCE(sttxtSolda, '') != 'C') OR
                (NULLIF(txtPintura, '') = '1' AND COALESCE(sttxtPintura, '') != 'C') OR
                ((NULLIF(txtMontagem, '') = '1' OR NULLIF(TxtMontagem, '') = '1') AND COALESCE(sttxtMontagem, '') != 'C')
            )
        `;

        const [itemResult] = await connection.execute(revertItemQuery);
        if (itemResult.affectedRows > 0) {
            console.log(`Corrigidos ${itemResult.affectedRows} itens (removeu 'C' geral porque um dos setores voltou a ficar pendente).`);
        } else {
            console.log("Nenhum item geral precisou ter o status 'C' revertido.");
        }

        // Verificando novamente o status do item 32857 como solicitado
        const [check32857] = await connection.execute("SELECT IdOrdemServicoItem, QtdeTotal, txtDobra, DobraTotalExecutado, sttxtDobra, OrdemServicoItemFinalizado FROM ordemservicoitem WHERE IdOrdemServicoItem = 32857");
        if (check32857.length > 0) {
            console.log("Status final validado do item 32857:", check32857[0]);
        }

    } catch (error) {
        console.error("Erro na execução do script:", error);
    } finally {
        if (connection) await connection.end();
    }
}

run();
