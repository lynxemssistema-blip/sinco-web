const pool = require('./src/config/db');
const fs = require('fs');

async function check() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM tags');
        const cols = rows.map(r => r.Field);
        fs.writeFileSync('tag_columns_utf8.txt', 'Columns in tags: ' + cols.join(', '), 'utf8');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
