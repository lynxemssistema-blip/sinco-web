const db = require('../src/config/db');

async function testQuery() {
    try {
        const sql = `SELECT * FROM viewromaneioitem WHERE 1=1 AND IdRomaneio = ? ORDER BY IdRomaneio DESC, IdRomaneioItem ASC LIMIT 500`;
        const [rows] = await db.execute(sql, [15]);
        console.log('Sucesso! Linhas encontradas para Romaneio 15:', rows.length);
        if (rows.length > 0) {
            console.log('Primeiro item:', rows[0].TAG);
        }
        process.exit(0);
    } catch (err) {
        console.error('Erro na query:', err.message);
        process.exit(1);
    }
}

testQuery();
