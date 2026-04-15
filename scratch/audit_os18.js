const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function auditOS18() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);

        console.log('\n--- Auditing Ordem de Serviço 18 ---');
        
        // 1. Check OS items
        const [items] = await connection.execute(`
            SELECT IdOrdemServicoItem, IdOrdemServico, CodMatFabricante, DescResumo, QtdeTotal, 
                   txtCorte, CorteTotalExecutado, CorteTotalExecutar,
                   txtDobra, DobraTotalExecutado, DobraTotalExecutar,
                   sttxtCorte, sttxtDobra
            FROM ordemservicoitem 
            WHERE IdOrdemServico = '18'
        `);

        console.log(`Found ${items.length} items for OS 18.`);
        console.table(items);

        // 2. Check logs for these items
        if (items.length > 0) {
            const itemIds = items.map(i => i.IdOrdemServicoItem);
            const [logs] = await connection.execute(`
                SELECT idordemservicoitemControle, IdOrdemServicoItem, Processo, QtdeProduzida, DataCriacao, CriadoPor
                FROM ordemservicoitemcontrole
                WHERE IdOrdemServicoItem IN (${itemIds.join(',')})
                ORDER BY DataCriacao DESC
            `);
            console.log('\n--- Logs for OS 18 items ---');
            console.table(logs);
        }

        // 3. Check specific Corte -> Dobra propagation mismatch
        items.forEach(item => {
            if (item.CorteTotalExecutado > 0 && item.DobraTotalExecutar === 0) {
                console.log(`\n[ALERT] Item ${item.IdOrdemServicoItem} (${item.CodMatFabricante}) has ${item.CorteTotalExecutado} in Corte but 0 in DobraExecutar.`);
            }
        });

    } catch (error) {
        console.error('Error during audit:', error);
    } finally {
        if (connection) await connection.end();
    }
}

auditOS18();
