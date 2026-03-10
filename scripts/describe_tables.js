const mysql = require('mysql2/promise');
const db = require('../src/config/db');

(async () => {
    const pool = db.pool || mysql.createPool(db.getConfig ? db.getConfig() : { host: 'localhost', user: 'root', password: '', database: 'alfatec' });

    const [projCols] = await pool.execute('DESCRIBE projetos');
    const [tagCols] = await pool.execute('DESCRIBE tags');

    console.log('=== PROJETOS FIELDS ===');
    projCols.forEach(c => console.log(c.Field, '|', c.Type));

    console.log('\n=== TAGS FIELDS ===');
    tagCols.forEach(c => console.log(c.Field, '|', c.Type));

    process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
