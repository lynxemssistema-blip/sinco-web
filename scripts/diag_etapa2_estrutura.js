const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS,
        database: process.env.CENTRAL_DB_NAME,
        port: 3306,
    });

    // 1. Estrutura ordemservicoitem (setores de montagem)
    const [cols1] = await conn.execute(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ordemservicoitem'
         AND (COLUMN_NAME LIKE '%ontagem%' OR COLUMN_NAME LIKE '%Finaliz%' OR COLUMN_NAME LIKE '%sttxt%' OR COLUMN_NAME LIKE '%txt%')
         ORDER BY ORDINAL_POSITION`,
        [process.env.CENTRAL_DB_NAME]
    );
    console.log('ordemservicoitem — colunas relevantes:');
    cols1.forEach(c => console.log(' ', c.COLUMN_NAME, '-', c.DATA_TYPE));

    // 2. Estrutura tabela tags (campos relevantes)
    const [cols2] = await conn.execute(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tags'
         AND (COLUMN_NAME LIKE '%Finaliz%' OR COLUMN_NAME LIKE '%Montagem%' OR COLUMN_NAME LIKE '%Data%')
         ORDER BY ORDINAL_POSITION`,
        [process.env.CENTRAL_DB_NAME]
    );
    console.log('\ntags — colunas relevantes:');
    cols2.forEach(c => console.log(' ', c.COLUMN_NAME, '-', c.DATA_TYPE));

    // 3. Tabela controle de setor (viewordemservicoitemstatussetor)
    const [cols3] = await conn.execute(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%status%setor%'`,
        [process.env.CENTRAL_DB_NAME]
    );
    console.log('\nViews/tabelas de status setores:', cols3.map(r => r.TABLE_NAME));

    // 4. Estrutura ordemservico (finalização da OS)
    const [cols4] = await conn.execute(
        `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ordemservico'
         AND (COLUMN_NAME LIKE '%Finaliz%' OR COLUMN_NAME LIKE '%Data%' OR COLUMN_NAME LIKE '%status%')
         ORDER BY ORDINAL_POSITION`,
        [process.env.CENTRAL_DB_NAME]
    );
    console.log('\nordemservico — colunas relevantes:');
    cols4.forEach(c => console.log(' ', c.COLUMN_NAME, '-', c.DATA_TYPE));

    // 5. Verificar exemplo do item 43
    const [item43] = await conn.execute(
        `SELECT IdOrdemServico, IdOrdemServicoItem, MontagemTotalExecutado, MontagemTotalExecutar, 
                sttxtMontagem, txtMontagem, OrdemServicoItemFinalizado, QtdeTotal, ProdutoPrincipal
         FROM ordemservicoitem WHERE IdOrdemServicoItem = 43 LIMIT 1`
    );
    console.log('\nDados diretos do item 43 em ordemservicoitem:');
    console.table(item43);

    await conn.end();
}
check().catch(e => console.error('Erro:', e.message));
