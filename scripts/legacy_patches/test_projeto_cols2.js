const pool = require('./src/config/db');

async function testCols() {
    try {
        const [fields] = await pool.execute('SHOW COLUMNS FROM projetos');
        console.log("FIELDS:", fields.map(f => f.Field).join(', '));

        const [rows] = await pool.execute('SELECT * FROM projetos LIMIT 1');
        console.log("SAMPLE:", JSON.stringify(rows[0], null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
testCols();
