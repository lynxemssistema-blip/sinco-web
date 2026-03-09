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

        console.log("Conectado ao banco de dados...");

        // 1. Restore 'C' for sectors where Percentual is 100 but sttxt is not 'C' (reverting our previous incorrect change)
        const queriesRestoreSectors = [
            { sql: "UPDATE ordemservicoitem SET sttxtCorte = 'C' WHERE txtCorte = '1' AND sttxtCorte IS NULL AND CortePercentual = 100" },
            { sql: "UPDATE ordemservicoitem SET sttxtDobra = 'C' WHERE txtDobra = '1' AND sttxtDobra IS NULL AND DobraPercentual = 100" },
            { sql: "UPDATE ordemservicoitem SET sttxtSolda = 'C' WHERE txtSolda = '1' AND sttxtSolda IS NULL AND SoldaPercentual = 100" },
            { sql: "UPDATE ordemservicoitem SET sttxtPintura = 'C' WHERE txtPintura = '1' AND sttxtPintura IS NULL AND PinturaPercentual = 100" },
            { sql: "UPDATE ordemservicoitem SET sttxtMontagem = 'C' WHERE (txtMontagem = '1' OR TxtMontagem = '1') AND sttxtMontagem IS NULL AND MontagemPercentual = 100" }
        ];

        let restored = 0;
        for (const q of queriesRestoreSectors) {
            const [result] = await connection.execute(q.sql);
            restored += result.affectedRows;
        }
        console.log(`Foram restaurados o status 'C' de ${restored} setores que estavam com Percentual 100.`);

        // 2. Global Finalization Logic: Mark item as 'C' if ALL its active sectors are 'C'
        const finalizationQuery = `
            UPDATE ordemservicoitem 
            SET OrdemServicoItemFinalizado = 'C'
            WHERE (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')
            AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
            AND (
                COALESCE(CASE WHEN NULLIF(txtCorte, '') = '1' AND COALESCE(sttxtCorte, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtDobra, '') = '1' AND COALESCE(sttxtDobra, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtSolda, '') = '1' AND COALESCE(sttxtSolda, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtPintura, '') = '1' AND COALESCE(sttxtPintura, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN (NULLIF(txtMontagem, '') = '1' OR NULLIF(TxtMontagem, '') = '1') AND COALESCE(sttxtMontagem, '') != 'C' THEN 1 ELSE 0 END, 0)
            ) = 0
            AND (
                NULLIF(txtCorte, '') = '1' OR 
                NULLIF(txtDobra, '') = '1' OR 
                NULLIF(txtSolda, '') = '1' OR 
                NULLIF(txtPintura, '') = '1' OR 
                NULLIF(TxtMontagem, '') = '1' OR
                NULLIF(TxtMontagem, '') = '1'
            )
        `;

        const [itemResult] = await connection.execute(finalizationQuery);
        console.log(`Corrigidos e Finalizados ${itemResult.affectedRows} itens (onde todos os setores em uso têm o status 'C').`);

        // Verificando o item 32857 para validação do usuário
        const [check32857] = await connection.execute("SELECT IdOrdemServicoItem, QtdeTotal, txtDobra, DobraTotalExecutado, DobraPercentual, sttxtDobra, OrdemServicoItemFinalizado FROM ordemservicoitem WHERE IdOrdemServicoItem = 32857");
        if (check32857.length > 0) {
            console.log("Validação do Item 32857 após a correção:");
            console.log(check32857[0]);
        }

    } catch (error) {
        console.error("Erro na execução do script:", error);
    } finally {
        if (connection) await connection.end();
    }
}

run();
