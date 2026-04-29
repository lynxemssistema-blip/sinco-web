const db = require('../src/config/db');

async function testInsert() {
    await db.asyncLocalStorage.run(new Map([['dbName', 'lynxlocal']]), async () => {
        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            console.log('Testing insert...');
            // Hardcoded fake data that matches the query
            // Let's use item 32874 which exists
            const [rows] = await db.query(`
                INSERT INTO ordemservicoitemcontrole(
                    IdOrdemServicoItem, IdOrdemServico, Processo, QtdeTotal, QtdeProduzida, txtCorte, TipoApontamento, CriadoPor, DataCriacao, D_E_L_E_T_E, idmatriz
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)
            `, [32874, 12, 'corte', 6, 1, 1, 'Parcial', 'Sistema', now, null]);
            
            console.log('Insert success:', rows.insertId);
            
            // Cleanup
            await db.query(`DELETE FROM ordemservicoitemcontrole WHERE IdOrdemServicoItemControle = ?`, [rows.insertId]);
        } catch (err) {
            console.error('Insert failed:', err);
        }
        process.exit(0);
    });
}
testInsert();
