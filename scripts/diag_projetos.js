require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || process.env.CENTRAL_DB_NAME || 'lynxlocal',
        port: process.env.DB_PORT || 3306,
    });

    // Simular exatamente o WHERE que a API usa
    const where = `COALESCE(p.D_E_L_E_T_E,'') = ''
        AND (
            COALESCE(p.Finalizado,'') = ''
            OR COALESCE(p.liberado,'') = ''
        )`;

    const [rows] = await conn.execute(`
        SELECT
            p.IdProjeto, p.Projeto,
            IFNULL(p.D_E_L_E_T_E,'(null)') AS DEL,
            IFNULL(p.Finalizado,'(null)')  AS Fin,
            IFNULL(p.liberado,'(null)')    AS Lib,
            COUNT(DISTINCT t.IdTag) AS QtdeTags
        FROM projetos p
        LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto
            AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
        WHERE ${where}
        GROUP BY p.IdProjeto
        ORDER BY p.IdProjeto DESC
        LIMIT 300
    `);

    console.log(`\n=== PROJETOS RETORNADOS PELO WHERE (${rows.length} total) ===`);
    rows.forEach(r => {
        console.log(`ID ${String(r.IdProjeto).padEnd(4)} | ${String(r.Projeto).padEnd(30)} | DEL="${r.DEL}" | Fin="${r.Fin}" | Lib="${r.Lib}" | Tags=${r.QtdeTags}`);
    });

    // Verificar quais NÃO passam
    const [todos] = await conn.execute(`SELECT IdProjeto, Projeto, IFNULL(D_E_L_E_T_E,'(null)') AS DEL, IFNULL(Finalizado,'(null)') AS Fin, IFNULL(liberado,'(null)') AS Lib FROM projetos ORDER BY IdProjeto`);
    const idsRetornados = new Set(rows.map(r => r.IdProjeto));
    const excluidos = todos.filter(r => !idsRetornados.has(r.IdProjeto));
    if (excluidos.length > 0) {
        console.log(`\n=== PROJETOS EXCLUÍDOS PELO WHERE (${excluidos.length}) ===`);
        excluidos.forEach(r => console.log(`ID ${String(r.IdProjeto).padEnd(4)} | ${String(r.Projeto).padEnd(30)} | DEL="${r.DEL}" | Fin="${r.Fin}" | Lib="${r.Lib}"`));
    }

    await conn.end();
}
main().catch(console.error);
