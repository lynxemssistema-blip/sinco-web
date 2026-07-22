const pool = require('./src/config/db');
async function main() {
    try {
        const [rows] = await pool.query("SELECT * FROM tags WHERE IdProjeto = 1 OR Projeto = '0001'");
        console.log(rows.map(r => {
            return Object.keys(r).filter(k => k.toLowerCase().startsWith('txt') && r[k] == '1');
        }));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
main();
