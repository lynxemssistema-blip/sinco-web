require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    try {
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'lynxlocal'
        });

        const [r] = await tempPool.query('SELECT chave, valor FROM configuracaosistema WHERE chave LIKE "%Enderecoplanodecorte%"');
        console.table(r);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
