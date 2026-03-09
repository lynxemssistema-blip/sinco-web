const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarEstrutura() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal'
    });

    try {
        const [cols] = await pool.execute('DESCRIBE ordemservicoitem');
        console.log('\n📋 Colunas da tabela ordemservicoitem:\n');

        const percentualCols = [];
        const qtdeCols = [];

        cols.forEach(c => {
            const field = c.Field;
            if (field.includes('ercentual') || field.includes('Percentual')) {
                percentualCols.push(`  ✓ ${field} (${c.Type})`);
            } else if (field.includes('tde') || field.includes('Qtde')) {
                qtdeCols.push(`  ✓ ${field} (${c.Type})`);
            }
        });

        console.log('Colunas de Percentual:');
        percentualCols.forEach(c => console.log(c));

        console.log('\nColunas de Quantidade:');
        qtdeCols.forEach(c => console.log(c));

    } finally {
        await pool.end();
    }
}

verificarEstrutura();
