const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
        password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
        database: process.env.CENTRAL_DB_NAME || 'lynxlocal'
    });

    try {
        const [t] = await pool.execute('DESCRIBE tags');
        const existing = t.map(r => r.Field);
        const needed = ['UsuarioPlanejadoInicioExpedicao', 'UsuarioPlanejadoFinalExpedicao'];
        const missing = needed.filter(c => !existing.includes(c) && !existing.includes(c.toLowerCase()));
        
        if (missing.length > 0) {
            console.log('Adicionando colunas de usuário ausentes:', missing);
            for (const c of missing) {
                await pool.execute(`ALTER TABLE tags ADD COLUMN ${c} VARCHAR(100) DEFAULT ''`);
            }
        } else {
            console.log('Todas as colunas Usuario... de Expedição já existem.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
