
const pool = require('./src/config/db');
async function test() {
    try {
        const [rows] = await pool.query("SELECT IdProjeto as value, Projeto as label FROM projetos WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND (liberado IS NULL OR liberado <> 'S') AND (Finalizado IS NULL OR Finalizado <> 'C') ORDER BY Projeto");
        console.log('Project list length:', rows.length);
        const pedido = rows.find(r => r.label === 'PEDIDO');
        if (pedido) {
            console.log('FOUND PEDIDO:', pedido);
        } else {
            console.log('PEDIDO NOT FOUND (Correct)');
        }
        
        // Let's also check what we DO have
        console.log('Sample matches:', rows.slice(0, 5).map(r => r.label));
    } catch (err) {
        console.error(err);
    } finally {
        if (pool.end) await pool.end();
        process.exit();
    }
}
test();
