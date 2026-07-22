const pool = require('./src/config/db');

async function test() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM ordemservicoitem LIKE "%Galvanizar%"');
        console.log(rows);
    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
test();
