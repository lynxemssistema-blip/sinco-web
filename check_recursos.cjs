const pool = require('./src/config/db');
async function main() {
    try {
        const [rows] = await pool.query("SHOW TABLES LIKE '%recurso%'");
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
