const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306
    });
    try {
        // Simulate montagem query with the alias
        const [rows] = await pool.execute(`
            SELECT IdPlanodecorte, DescPlanodecorte, Espessura, MaterialSW,
                   DataCad, DataLimite, CriadoPor, EnviadoCorte AS Enviadocorte, Concluido,
                   EnderecoCompletoPlanoCorte, DataLiberacao, UsuarioLiberacao,
                   DataInicial, DataFinal, QtdeTotalPecas, QtdeTotalPecasExecutadas
            FROM planodecorte
            WHERE (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
            ORDER BY IdPlanodecorte DESC LIMIT 3
        `);
        rows.forEach(r => {
            console.log(`Plan #${r.IdPlanodecorte}: Enviadocorte=${JSON.stringify(r.Enviadocorte)} | Keys: ${Object.keys(r).filter(k=>k.toLowerCase().includes('enviad')).join(',')}`);
        });
    } finally { await pool.end(); }
}
main().catch(console.error);
