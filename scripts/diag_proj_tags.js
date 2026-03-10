require('dotenv').config();
const mysql = require('mysql2/promise');
async function main() {
    const c = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST || process.env.DB_HOST,
        user: process.env.CENTRAL_DB_USER || process.env.DB_USER,
        password: process.env.CENTRAL_DB_PASS || process.env.DB_PASSWORD || process.env.DB_PASS,
        database: process.env.CENTRAL_DB_NAME || process.env.DB_NAME,
        port: 3306
    });
    for (const t of ['projetos', 'tags']) {
        const [r] = await c.execute(`SHOW FULL COLUMNS FROM ${t}`);
        const filtered = r.filter(x => /final|Final|Usuario|usuario/i.test(x.Field));
        console.log(`\n=== ${t} ===`);
        if (filtered.length === 0) console.log('  [NENHUM CAMPO ENCONTRADO]');
        filtered.forEach(x => console.log(`  ${x.Field} (${x.Type})`));
    }
    await c.end();
}
main().catch(console.error);
