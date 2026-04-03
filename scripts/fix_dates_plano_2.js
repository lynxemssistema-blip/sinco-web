require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Conectado. Corrigindo Plano 2...');

        // 1. Plan dates
        await connection.execute(`
            UPDATE planodecorte 
            SET DataLiberacao = '02/04/2026', 
                DataLiberacaoParaCorte = '03/04/2026' 
            WHERE IdPlanodecorte = 2
        `);

        // 2. Item dates (RealizadoInicioCorte: '2026-04-03 18:03:06' -> '03/04/2026 18:03:06')
        const [items] = await connection.execute(
            'SELECT IdOrdemServicoItem, RealizadoInicioCorte FROM ordemservicoitem WHERE idplanodecorte = 2'
        );

        for (const it of items) {
            if (it.RealizadoInicioCorte && it.RealizadoInicioCorte.includes('-')) {
                const parts = it.RealizadoInicioCorte.split(' ');
                const dateParts = parts[0].split('-');
                if (dateParts.length === 3) {
                    const brDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                    const brFull = parts[1] ? `${brDate} ${parts[1]}` : brDate;
                    
                    await connection.execute(
                        'UPDATE ordemservicoitem SET RealizadoInicioCorte = ? WHERE IdOrdemServicoItem = ?',
                        [brFull, it.IdOrdemServicoItem]
                    );
                    console.log(`Item ${it.IdOrdemServicoItem} corrigido para ${brFull}`);
                }
            }
        }

        console.log('Operação concluída com sucesso.');
    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

run();
