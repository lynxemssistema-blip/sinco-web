const pool = require('../src/config/db.js');

async function checkItem43() {
    try {
        const query = `
            SELECT 
                IdOrdemServicoItem, Reposicao, D_E_L_E_T_E, sttxtCorte
            FROM ordemservicoitem
            WHERE IdOrdemServicoItem = 43
        `;
        const [rows] = await pool.query(query);
        console.log("ITEM 43:", rows.length > 0 ? rows[0] : "NOT FOUND");
    } catch (err) {
        console.error("SQL ERROR:", err.message);
    } finally {
        process.exit(0);
    }
}

checkItem43();
