const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();

async function main() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });

    // Verificar tipos das colunas de data - separar DATE de VARCHAR
    const [cols] = await c.execute(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ordemservicoitem'
        AND (COLUMN_NAME LIKE 'Planejado%' OR COLUMN_NAME LIKE 'Realizado%')
        ORDER BY COLUMN_NAME
    `);
    
    const dateType = [];
    const varcharType = [];
    
    cols.forEach(r => {
        if (r.DATA_TYPE === 'date' || r.DATA_TYPE === 'datetime') {
            dateType.push(r.COLUMN_NAME);
        } else {
            varcharType.push(r.COLUMN_NAME);
        }
    });
    
    console.log('=== Colunas tipo DATE/DATETIME (precisam YYYY-MM-DD no banco, conversão no código) ===');
    dateType.forEach(c => console.log(`  ${c}`));
    
    console.log('\n=== Colunas tipo VARCHAR (armazenam DD/MM/YYYY direto) ===');
    varcharType.forEach(c => console.log(`  ${c}`));
    
    await c.end();
}
main().catch(console.error);
