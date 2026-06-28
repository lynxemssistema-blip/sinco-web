const mysql = require('mysql2/promise');
require('dotenv').config();

async function showMapaItems() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = `
            SELECT osi.IdOrdemServicoItem, osi.IdOrdemServico, osi.txtCorte, osi.txtDobra, osi.txtSolda, osi.txtPintura, osi.TxtMontagem 
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            WHERE (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            AND (osi.txtCorte = '1' OR osi.txtDobra = '1' OR osi.txtSolda = '1' OR osi.txtPintura = '1' OR osi.TxtMontagem = '1')
            LIMIT 20
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens que estão aparecendo no Mapa:');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

showMapaItems();
