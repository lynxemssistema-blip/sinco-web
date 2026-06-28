const mysql = require('mysql2/promise');
require('dotenv').config();

async function findEmpty() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = `
            SELECT IdOrdemServicoItem, IdOrdemServico, txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem 
            FROM ordemservicoitem 
            WHERE (txtCorte='' OR txtCorte IS NULL OR txtCorte='0') 
            AND (txtDobra='' OR txtDobra IS NULL OR txtDobra='0') 
            AND (txtSolda='' OR txtSolda IS NULL OR txtSolda='0') 
            AND (txtPintura='' OR txtPintura IS NULL OR txtPintura='0') 
            AND (TxtMontagem='' OR TxtMontagem IS NULL OR TxtMontagem='0')
            AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
            AND Liberado_engenharia = 'S'
            LIMIT 20
        `;

        const [rows] = await connection.execute(query);
        console.log('Itens com TODOS os setores vazios (Deveriam estar ocultos):');
        console.table(rows);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

findEmpty();
