const pool = require('./src/config/db');

async function testCols() {
    try {
        const [fields] = await pool.execute('SHOW COLUMNS FROM projetos');
        console.log(fields.map(f => f.Field).join(', '));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testCols();
