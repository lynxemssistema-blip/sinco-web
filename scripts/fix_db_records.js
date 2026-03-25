const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDB() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || 'Mec@1984#',
        database: process.env.DB_NAME || 'lynxlocal',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Fixing IdEmpresa/DescEmpresa in ordemservico...');
        const [resOs] = await pool.execute(`
            UPDATE ordemservico os_clone
            JOIN ordemservico os_orig ON os_clone.idOSReferencia = os_orig.IdOrdemServico
            SET os_clone.IdEmpresa = os_orig.IdEmpresa, 
                os_clone.DescEmpresa = os_orig.DescEmpresa
            WHERE os_clone.idOSReferencia IS NOT NULL 
              AND os_clone.idOSReferencia != ''
              AND os_clone.IdEmpresa != os_orig.IdEmpresa
        `);
        console.log('Affected rows (OS):', resOs.affectedRows);

        console.log('Fixing IdEmpresa/DescEmpresa in ordemservicoitem...');
        const [resOsi] = await pool.execute(`
            UPDATE ordemservicoitem osi
            JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            SET osi.IdEmpresa = os.IdEmpresa, 
                osi.DescEmpresa = os.DescEmpresa
            WHERE osi.IdEmpresa != os.IdEmpresa
        `);
        console.log('Affected rows (OSI):', resOsi.affectedRows);

        console.log('Fixing DataCriacao format in ordemservico...');
        const [resDataOs] = await pool.execute(`
            UPDATE ordemservico 
            SET DataCriacao = DATE_FORMAT(DataCriacao, '%d/%m/%Y')
            WHERE DataCriacao LIKE '202%' OR DataCriacao LIKE '201%'
        `);
        console.log('Affected rows formatting dates (OS):', resDataOs.affectedRows);

        console.log('Fixing DataCriacao format in ordemservicoitem...');
        const [resDataOsi] = await pool.execute(`
            UPDATE ordemservicoitem 
            SET DataCriacao = DATE_FORMAT(DataCriacao, '%d/%m/%Y')
            WHERE DataCriacao LIKE '202%' OR DataCriacao LIKE '201%'
        `);
        console.log('Affected rows formatting dates (OSI):', resDataOsi.affectedRows);

    } catch (e) {
        console.error('Error fixing DB:', e);
    } finally {
        await pool.end();
    }
}

fixDB();
