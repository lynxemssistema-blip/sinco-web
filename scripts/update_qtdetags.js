const db = require('../src/config/db.js');

async function updateQtdeTags() {
    try {
        console.log('Using pool from config/db.js...');

        const [rows] = await db.executeOnDefault(`
            SELECT IdProjeto, COUNT(*) as TotalTags 
            FROM tags 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*') 
            GROUP BY IdProjeto
        `);

        console.log(`Found ${rows.length} projects with tags. Updating...`);

        let updated = 0;
        for (const row of rows) {
            await db.executeOnDefault(`
                UPDATE projetos 
                SET QtdeTags = ? 
                WHERE IdProjeto = ?
            `, [row.TotalTags, row.IdProjeto]);
            updated++;
        }

        console.log(`Successfully updated QtdeTags for ${updated} projects!`);

        // Also let's set QtdeTags to 0 for projects that have no tags just in case
        const [resetResult] = await db.executeOnDefault(`
            UPDATE projetos p
            LEFT JOIN tags t ON p.IdProjeto = t.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E <> '*')
            SET p.QtdeTags = 0
            WHERE t.IdTag IS NULL AND p.QtdeTags > 0
        `);

        console.log(`Reset QtdeTags to 0 for ${resetResult.affectedRows || 0} projects with no tags.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

updateQtdeTags();
