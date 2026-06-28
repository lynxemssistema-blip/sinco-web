const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkItem() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [rows] = await connection.execute(
            'SELECT IdOrdemServicoItem, txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem FROM ordemservicoitem WHERE IdOrdemServicoItem = 91'
        );
        console.log('--- DADOS REAIS ITEM 91 ---');
        rows.forEach(row => {
            console.log(`ID: ${row.IdOrdemServicoItem}`);
            console.log(`txtCorte: "${row.txtCorte}" (type: ${typeof row.txtCorte}, length: ${String(row.txtCorte || '').length})`);
            console.log(`txtDobra: "${row.txtDobra}" (type: ${typeof row.txtDobra}, length: ${String(row.txtDobra || '').length})`);
            console.log(`txtSolda: "${row.txtSolda}" (type: ${typeof row.txtSolda}, length: ${String(row.txtSolda || '').length})`);
            console.log(`txtPintura: "${row.txtPintura}" (type: ${typeof row.txtPintura}, length: ${String(row.txtPintura || '').length})`);
            console.log(`TxtMontagem: "${row.TxtMontagem}" (type: ${typeof row.TxtMontagem}, length: ${String(row.TxtMontagem || '').length})`);
        });

        // Test filter logic
        const [filtered] = await connection.execute(`
            SELECT IdOrdemServicoItem 
            FROM ordemservicoitem 
            WHERE IdOrdemServicoItem = 91
            AND (txtCorte = '1' OR txtDobra = '1' OR txtSolda = '1' OR txtPintura = '1' OR TxtMontagem = '1')
        `);
        console.log('\n--- TESTE DE FILTRO SQL ---');
        console.log(`Filtro localizou o item? ${filtered.length > 0 ? 'SIM' : 'NÃO'}`);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

checkItem();
