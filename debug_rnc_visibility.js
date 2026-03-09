
const pool = require('./src/config/db');
require('dotenv').config();

async function debugRNC() {
    try {
        console.log('--- All RNC records in viewordemservicoitempendencia ---');
        const [rows] = await pool.query(`
            SELECT 
                IdOrdemServicoItemPendencia, 
                IdOrdemServicoItem, 
                Estatus, 
                OrigemPendencia, 
                TipoRegistro, 
                DescricaoPendencia,
                D_E_L_E_T_E
            FROM viewordemservicoitempendencia 
            WHERE TipoRegistro = 'RNC'
        `);
        console.table(rows);

        console.log('\n--- Checking row 15 specifically ---');
        const [row15] = await pool.query("SELECT * FROM viewordemservicoitempendencia WHERE IdOrdemServicoItemPendencia = 15");
        console.log(JSON.stringify(row15[0], null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugRNC();
