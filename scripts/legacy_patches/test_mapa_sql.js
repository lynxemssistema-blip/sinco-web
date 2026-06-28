const mysql = require('mysql2/promise');
require('dotenv').config();

async function testQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        // Exact logic from server.js
        let whereClause = `
            (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            AND (
                NULLIF(TRIM(osi.txtCorte), '') = '1' OR 
                NULLIF(TRIM(osi.txtDobra), '') = '1' OR 
                NULLIF(TRIM(osi.txtSolda), '') = '1' OR 
                NULLIF(TRIM(osi.txtPintura), '') = '1'
            )
        `;

        // Add OS 8 filter as in screenshot
        whereClause += ' AND os.IdOrdemServico = 8';

        const sql = `
            SELECT 
                osi.IdOrdemServicoItem,
                osi.txtCorte,
                osi.txtDobra,
                osi.txtSolda,
                osi.txtPintura,
                osi.TxtMontagem
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            WHERE ${whereClause}
            ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem
        `;

        const [rows] = await connection.execute(sql);
        console.log('Total items matching:', rows.length);
        console.table(rows.filter(r => [63, 64, 65, 66].includes(r.IdOrdemServicoItem)));

        // Also check if they exist at all
        const [all] = await connection.execute("SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE IdOrdemServicoItem IN (63, 64, 65, 66)");
        console.log('Existing IDs in DB:', all.map(a => a.IdOrdemServicoItem).join(', '));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

testQuery();
