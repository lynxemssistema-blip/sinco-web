const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sincoweb'
        });

        console.log("Conectado ao banco de dados.");

        // Query to find all items that have all their active sectors completed,
        // but are NOT marked as finalized ('C')
        const selectQuery = `
            SELECT IdOrdemServicoItem, IdOrdemServico
            FROM ordemservicoitem
            WHERE (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')
            AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
            AND (
                COALESCE(CASE WHEN NULLIF(txtCorte, '') = '1' AND COALESCE(sttxtCorte, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtDobra, '') = '1' AND COALESCE(sttxtDobra, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtSolda, '') = '1' AND COALESCE(sttxtSolda, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(txtPintura, '') = '1' AND COALESCE(sttxtPintura, '') != 'C' THEN 1 ELSE 0 END, 0) +
                COALESCE(CASE WHEN NULLIF(TxtMontagem, '') = '1' AND COALESCE(sttxtMontagem, '') != 'C' THEN 1 ELSE 0 END, 0)
            ) = 0
            AND (
                NULLIF(txtCorte, '') = '1' OR 
                NULLIF(txtDobra, '') = '1' OR 
                NULLIF(txtSolda, '') = '1' OR 
                NULLIF(txtPintura, '') = '1' OR 
                NULLIF(TxtMontagem, '') = '1'
            )
        `;

        const [rows] = await connection.execute(selectQuery);
        console.log(`Encontrados ${rows.length} itens que devem ser finalizados.`);

        const item67 = rows.find(r => r.IdOrdemServicoItem === 67);
        if (item67) {
            console.log("O item 67 está na lista para ser atualizado!");
        } else {
            const [check67] = await connection.execute("SELECT IdOrdemServicoItem, OrdemServicoItemFinalizado, txtCorte, sttxtCorte, txtDobra, sttxtDobra FROM ordemservicoitem WHERE IdOrdemServicoItem = 67");
            console.log("Status atual do item 67 no banco:", check67[0]);
        }

        if (rows.length > 0) {
            const ids = rows.map(r => r.IdOrdemServicoItem);

            const updateQuery = `
                UPDATE ordemservicoitem 
                SET OrdemServicoItemFinalizado = 'C' 
                WHERE IdOrdemServicoItem IN (${ids.join(',')})
            `;

            const [result] = await connection.execute(updateQuery);
            console.log(`Atualizados ${result.affectedRows} itens para 'C'.`);
        }

        await connection.end();
    } catch (error) {
        console.error("Erro na execução:", error);
    }
}

run();
