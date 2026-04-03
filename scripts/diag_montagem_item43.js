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

    const [rows] = await conn.execute(
        `SELECT IdOrdemServicoItem, RealizadoInicioMontagem, 
                MontagemTotalExecutado, MontagemTotalExecutar, ParcialMontagem,
                sttxtmontagem, txtmontagem
         FROM viewmapaproducaoapontamento01
         WHERE IdOrdemServicoItem = 43 LIMIT 5`
    );
    
    console.log('Resultado para item 43:');
    if (rows.length === 0) {
        console.log('  ❌ Item não encontrado na view');
    } else {
        rows.forEach(r => {
            console.log('---');
            console.log('  IdOrdemServicoItem:', r.IdOrdemServicoItem);
            console.log('  RealizadoInicioMontagem:', r.RealizadoInicioMontagem, '(tipo:', typeof r.RealizadoInicioMontagem, ')');
            console.log('  Executado:', r.MontagemTotalExecutado);
            console.log('  AExecutar:', r.MontagemTotalExecutar);
            console.log('  ParcialMontagem:', r.ParcialMontagem);
            console.log('  sttxtmontagem:', r.sttxtmontagem);
        });
    }

    // Verificar colunas disponíveis na view
    const [cols] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'viewmapaproducaoapontamento01'
         AND COLUMN_NAME LIKE '%Mont%' OR (TABLE_SCHEMA = ? AND TABLE_NAME = 'viewmapaproducaoapontamento01' AND COLUMN_NAME LIKE '%Realizado%')
         ORDER BY COLUMN_NAME`,
        [process.env.CENTRAL_DB_NAME, process.env.CENTRAL_DB_NAME]
    );
    console.log('\nColunas com "Mont" ou "Realizado" na view:');
    cols.forEach(c => console.log(' -', c.COLUMN_NAME));

    await conn.end();
}
check().catch(e => console.error('Erro:', e.message));
