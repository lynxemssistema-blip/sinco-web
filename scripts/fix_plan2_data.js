// Fix Plan #2 data: move DataLiberacaoParaCorte -> DataLiberacao, 
// UsuarioLiberacaoParaCorte -> UsuarioLiberacao, then clear the source fields
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306
    });

    try {
        // Show current state
        console.log('=== BEFORE ===');
        const [before] = await pool.execute(
            `SELECT IdPlanodecorte, DataLiberacao, UsuarioLiberacao, 
                    DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte, LiberacaoParaCorte
             FROM planodecorte WHERE IdPlanodecorte = 2`
        );
        console.log(JSON.stringify(before[0], null, 2));

        // Move values
        console.log('\n=== Fixing Plan #2... ===');
        await pool.execute(
            `UPDATE planodecorte 
             SET DataLiberacao = DataLiberacaoParaCorte,
                 UsuarioLiberacao = UsuarioLiberacaoParaCorte,
                 DataLiberacaoParaCorte = NULL,
                 UsuarioLiberacaoParaCorte = ''
             WHERE IdPlanodecorte = 2`,
        );
        console.log('UPDATE done.');

        // Show after state
        console.log('\n=== AFTER ===');
        const [after] = await pool.execute(
            `SELECT IdPlanodecorte, DataLiberacao, UsuarioLiberacao, 
                    DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte, LiberacaoParaCorte
             FROM planodecorte WHERE IdPlanodecorte = 2`
        );
        console.log(JSON.stringify(after[0], null, 2));

    } finally {
        await pool.end();
    }
}
main().catch(console.error);
