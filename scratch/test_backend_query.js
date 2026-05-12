const db = require('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/config/db');

async function testQuery() {
    try {
        let whereClause = "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";
        whereClause += " AND (liberado = 'S')";
        whereClause += " AND (Finalizado IS NULL OR Finalizado = '')";

        const query = `
            SELECT p.IdProjeto as value, p.Projeto as label
            FROM projetos p
            ${whereClause}
            ORDER BY p.IdProjeto DESC
        `;
        
        console.log('Query:', query);
        const [rows] = await db.query(query);
        console.log('Rows:', rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testQuery();
