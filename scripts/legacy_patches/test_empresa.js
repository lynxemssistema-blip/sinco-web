const pool = require('./src/config/db');

async function testCols() {
    try {
        const [rows] = await pool.execute('SELECT * FROM empresa LIMIT 1');
        console.log("EMPRESA:", rows[0] ? rows[0].IdEmpresa : 'No row');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testCols();
