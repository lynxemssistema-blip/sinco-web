require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || process.env.CENTRAL_DB_NAME || 'lynxlocal',
        port: process.env.DB_PORT || 3306,
    });

    // Checar colunas de finalização em cada tabela
    const tables = ['projetos', 'tags', 'ordemservico', 'ordemservicoitem'];
    for (const t of tables) {
        const [cols] = await conn.execute(`SHOW COLUMNS FROM ${t} WHERE Field LIKE '%final%' OR Field LIKE '%Finaliz%' OR Field LIKE '%usuario%' OR Field LIKE '%Usuario%'`);
        console.log(`\n=== ${t} ===`);
        cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
    }

    // Checar se existe coluna de usuario logado em ordemservico/item
    const [osi] = await conn.execute(`SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE '%item%'`);
    console.log('\n=== ordemservicoitem (campos *item*) ===');
    osi.forEach(c => console.log(`  ${c.Field} (${c.Type})`));

    await conn.end();
}
main().catch(console.error);
