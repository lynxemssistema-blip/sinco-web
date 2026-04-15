const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkHierarchy() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal',
        port: 3306
    });

    try {
        // Pick a project with tags
        const [projects] = await connection.execute('SELECT IdProjeto, Projeto FROM projetos WHERE COALESCE(D_E_L_E_T_E,"") = "" LIMIT 5');
        
        for (const p of projects) {
            console.log(`\n=== Checking Project ${p.IdProjeto} (${p.Projeto}) ===`);
            
            // Sum of Tags TotalExecutar (Corte)
            const [tagsSum] = await connection.execute(`
                SELECT 
                    SUM(CAST(NULLIF(CorteTotalExecutar,'') AS DECIMAL(10,2))) as SumCorteExecutar,
                    SUM(CAST(NULLIF(CorteTotalExecutado,'') AS DECIMAL(10,2))) as SumCorteExecutado
                FROM tags 
                WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [p.IdProjeto]);

            console.log(`Tags Sum Corte Executar: ${tagsSum[0].SumCorteExecutar}`);
            console.log(`Tags Sum Corte Executado: ${tagsSum[0].SumCorteExecutado}`);

            // Pick one tag and check against OS items
            const [tag] = await connection.execute('SELECT IdTag, Tag, CorteTotalExecutar, CorteTotalExecutado FROM tags WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = "") LIMIT 1', [p.IdProjeto]);
            
            if (tag.length > 0) {
                const t = tag[0];
                console.log(`\n--- Checking Tag ${t.IdTag} (${t.Tag}) ---`);
                console.log(`Tag Corte Executar: ${t.CorteTotalExecutar}`);
                
                const [itemsSum] = await connection.execute(`
                    SELECT 
                        SUM(CorteTotalExecutar) as SumCorteExecutar,
                        SUM(CorteTotalExecutado) as SumCorteExecutado
                    FROM ordemservicoitem 
                    WHERE IdTag = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                `, [t.IdTag]);

                console.log(`OS Items Sum Corte Executar: ${itemsSum[0].SumCorteExecutar}`);
                console.log(`OS Items Sum Corte Executado: ${itemsSum[0].SumCorteExecutado}`);
                
                if (Math.abs((t.CorteTotalExecutar || 0) - (itemsSum[0].SumCorteExecutar || 0)) > 0.01) {
                    console.log(`[WARNING] Mismatch in Tag ${t.IdTag}!`);
                } else {
                    console.log(`[OK] Tag totals match OS items sum.`);
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkHierarchy();
