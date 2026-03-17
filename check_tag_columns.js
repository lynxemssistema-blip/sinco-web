const pool = require('./src/config/db');

async function check() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM tags');
        const cols = rows.map(r => r.Field);
        console.log('Columns in tags:', cols.join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
