const pool = require('./src/config/db');
async function main() {
    try {
        const [rows] = await pool.query("SELECT IdTag, GALVANIZARTotalExecutar FROM tags WHERE IdProjeto = 1 OR Projeto = '0001'");
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
