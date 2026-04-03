// Check item 32881 and plan 2 data
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'lynxlocal',
        port: Number(process.env.DB_PORT) || 3306
    });

    try {
        // Check item 32881
        console.log('=== ITEM 32881 ===');
        const [item] = await pool.execute(
            `SELECT IdOrdemServicoItem, idplanodecorte, txtCorte, sttxtCorte, 
                    OrdemServicoItemFinalizado, d_e_l_e_t_e, Liberado_Engenharia,
                    Espessura, MaterialSW, Projeto, Tag, DescResumo
             FROM ordemservicoitem WHERE IdOrdemServicoItem = 32881`
        );
        if (item.length > 0) {
            console.log(JSON.stringify(item[0], null, 2));
        } else {
            console.log('NOT FOUND');
        }

        // Check all items for plan 2
        console.log('\n=== ALL ITEMS WHERE idplanodecorte = 2 ===');
        const [items] = await pool.execute(
            `SELECT IdOrdemServicoItem, idplanodecorte, txtCorte, sttxtCorte, 
                    OrdemServicoItemFinalizado, d_e_l_e_t_e
             FROM ordemservicoitem WHERE idplanodecorte = '2'`
        );
        console.log(`Found ${items.length} items`);
        items.forEach(r => console.log(`  ID: ${r.IdOrdemServicoItem}, txtCorte=${JSON.stringify(r.txtCorte)}, sttxtCorte=${JSON.stringify(r.sttxtCorte)}, finalizado=${JSON.stringify(r.OrdemServicoItemFinalizado)}, deleted=${JSON.stringify(r.d_e_l_e_t_e)}`));

        // Check plan 2 details
        console.log('\n=== PLAN 2 DETAILS ===');
        const [plan] = await pool.execute(
            `SELECT IdPlanodecorte, Enviadocorte, Concluido, d_e_l_e_t_e,
                    DataLiberacao, UsuarioLiberacao,
                    DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte, LiberacaoParaCorte
             FROM planodecorte WHERE IdPlanodecorte = 2`
        );
        if (plan.length > 0) {
            console.log(JSON.stringify(plan[0], null, 2));
        }

    } finally {
        await pool.end();
    }
}
main().catch(console.error);
