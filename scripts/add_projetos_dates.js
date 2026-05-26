const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal'
    });

    const colunas = [
        'PlanejadoInicioMedicao', 'PlanejadoFinalMedicao', 'RealizadoInicioMedicao', 'RealizadoFinalMedicao',
        'PlanejadoInicioIsometrico', 'PlanejadoFinalIsometrico', 'RealizadoInicioIsometrico', 'RealizadoFinalIsometrico',
        'PlanejadoInicioEngenharia', 'PlanejadoFinalEngenharia', 'RealizadoInicioEngenharia', 'RealizadoFinalEngenharia',
        'PlanejadoInicioAprovacao', 'PlanejadoFinalAprovacao', 'RealizadoInicioAprovacao', 'RealizadoFinalAprovacao',
        'PlanejadoInicioAcabamento', 'PlanejadoFinalAcabamento', 'RealizadoInicioAcabamento', 'RealizadoFinalAcabamento',
        'PlanejadoInicioExpedicao', 'PlanejadoFinalExpedicao', 'RealizadoInicioExpedicao', 'RealizadoFinalExpedicao'
    ];

    try {
        console.log('Verificando colunas na tabela projetos...');
        const [rows] = await pool.execute('DESCRIBE projetos');
        const existing = rows.map(r => r.Field);
        
        const toAdd = colunas.filter(c => !existing.some(f => f.toLowerCase() === c.toLowerCase()));
        
        if (toAdd.length > 0) {
            console.log('Adicionando colunas:', toAdd.join(', '));
            for (const col of toAdd) {
                await pool.execute(`ALTER TABLE projetos ADD COLUMN ${col} VARCHAR(20) DEFAULT ''`);
            }
            console.log('Colunas adicionadas com sucesso.');
        } else {
            console.log('Todas as colunas já existem.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
