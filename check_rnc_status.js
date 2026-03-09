
const pool = require('./src/config/db');
require('dotenv').config();

async function checkRNCData() {
    try {
        console.log('--- Checking Estatus values in viewordemservicoitempendencia ---');
        const [statusRows] = await pool.query("SELECT DISTINCT Estatus, OrigemPendencia, TipoRegistro FROM viewordemservicoitempendencia WHERE TipoRegistro = 'RNC' LIMIT 50");
        console.table(statusRows);

        console.log('\n--- Sample records for RNC (ROMANEIO) ---');
        const [sampleRows] = await pool.query("SELECT idordemservicoitempendencia, Estatus, OrigemPendencia, DescricaoPendencia FROM viewordemservicoitempendencia WHERE TipoRegistro = 'RNC' AND OrigemPendencia = 'ROMANEIO' LIMIT 10");
        console.table(sampleRows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkRNCData();
