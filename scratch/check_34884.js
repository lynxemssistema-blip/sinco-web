const db = require('../src/config/db');

async function checkItem() {
    let conn;
    try {
        conn = await db.getConnection();
        const [rows] = await conn.execute(`
            SELECT IdOrdemServicoItem, QtdeTotal, 
                   txtCorte, CorteTotalExecutado, CorteTotalExecutar,
                   txtDobra, DobraTotalExecutado, DobraTotalExecutar,
                   txtSolda, SoldaTotalExecutado, SoldaTotalExecutar,
                   txtPintura, PinturaTotalExecutado, PinturaTotalExecutar,
                   TxtMontagem, MontagemTotalExecutado, MontagemTotalExecutar
            FROM ordemservicoitem
            WHERE IdOrdemServicoItem = '34884'
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        if (conn) conn.release();
        process.exit();
    }
}

checkItem();
