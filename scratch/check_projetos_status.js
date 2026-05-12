const db = require('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/config/db');

async function check() {
    try {
        const [rows] = await db.query("SELECT IdProjeto, Projeto, liberado, Finalizado, D_E_L_E_T_E FROM projetos");
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
