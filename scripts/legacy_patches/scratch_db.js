const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/.env' });
async function run() {
    const conn = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS || '10207597Rdv*' });
    const [dbs] = await conn.query('SHOW DATABASES');
    for (const row of dbs) {
        const dbName = row.Database;
        if (dbName === 'information_schema' || dbName === 'mysql' || dbName === 'performance_schema' || dbName === 'sys') continue;
        try {
            await conn.query(`USE \`${dbName}\``);
            const [tables] = await conn.query('SHOW TABLES LIKE "configuracaosistema"');
            if (tables.length > 0) {
                await conn.query(`UPDATE configuracaosistema SET valor = REPLACE(valor, 'ConfiguraÃ§Ãµes', 'Configurações') WHERE chave = 'EnderecoTemplateExcelOrdemServico'`);
                const [cfg] = await conn.query('SELECT valor FROM configuracaosistema WHERE chave = "EnderecoTemplateExcelOrdemServico"');
                if (cfg.length > 0) console.log(dbName, '=>', cfg[0].valor);
            }
        } catch (e) {
        }
    }
    conn.end();
}
run();
