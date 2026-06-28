const pool = require('./src/config/db');

async function testCols() {
    try {
        const [rows] = await pool.execute('SELECT * FROM empresas LIMIT 1');
        console.log("EMPRESAS:", rows[0] ? rows[0] : 'No row');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testCols();
