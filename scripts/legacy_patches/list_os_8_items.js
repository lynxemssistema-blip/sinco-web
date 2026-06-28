const mysql = require('mysql2/promise');
require('dotenv').config();

async function showOS8Items() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = `
            SELECT osi.IdOrdemServicoItem, osi.IdOrdemServico, osi.txtCorte, osi.txtDobra, osi.txtSolda, osi.txtPintura, osi.TxtMontagem, osi.Liberado_engenharia
            FROM ordemservicoitem osi
            WHERE osi.IdOrdemServico = 8
            AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens da OS 8:');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

showOS8Items();
