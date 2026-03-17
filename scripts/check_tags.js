const pool = require('../src/config/db');

async function checkTags() {
    try {
        const [rows] = await pool.execute(`
            SELECT
                IdTag, Tag, DescTag, DataEntrada, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag, ValorTag, StatusTag,
                QtdeOS, QtdeOSExecutadas, QtdePecasOS, QtdePecasExecutadas, PercentualPecas, PercentualOS, QtdeTotalPecas,
                qtdetotal, Finalizado, qtdernc, PesoTotal, ProjetistaPlanejado, PlanejadoInicioEngenharia, PlanejadoFinalEngenharia
            FROM tags
            LIMIT 1
        `);
        console.log("Returned keys for tag record:", Object.keys(rows[0]));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkTags();
