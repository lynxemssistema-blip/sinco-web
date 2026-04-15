const pool = require('../src/config/db');
async function check() {
    try {
        const [rows] = await pool.execute('DESCRIBE ordemservico');
        const fields = rows.map(r => r.Field);
        console.log('Status cols:', fields.filter(f => f.startsWith('sttxt')));
        console.log('Total cols:', fields.filter(f => f.endsWith('TotalExecutado')));
        
        const [tagRows] = await pool.execute('DESCRIBE tags');
        const tagFields = tagRows.map(r => r.Field);
        console.log('Tag Status cols:', tagFields.filter(f => f.startsWith('sttxt')));
        console.log('Tag Total cols:', tagFields.filter(f => f.endsWith('TotalExecutado')));

        const [projRows] = await pool.execute('DESCRIBE projetos');
        const projFields = projRows.map(r => r.Field);
        console.log('Proj Status cols:', projFields.filter(f => f.startsWith('sttxt')));
        console.log('Proj Total cols:', projFields.filter(f => f.endsWith('TotalExecutado')));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
