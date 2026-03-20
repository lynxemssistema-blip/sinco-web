const pool = require('./src/config/db');

async function run() {
    const tables = ['ordemservicoitem', 'ordemservico', 'tags', 'projetos'];
    for (const t of tables) {
        const [rows] = await pool.query(`SHOW COLUMNS FROM \`${t}\``);
        console.log(`\n=== Table: ${t} ===`);
        const cols = rows.map(r => r.Field);
        console.log("Expedição fields:", cols.filter(c => c.toLowerCase().includes('exped')));
        console.log("Realizado fields:", cols.filter(c => c.toLowerCase().includes('realizado')));
        console.log("ID fields:", cols.filter(c => c.toLowerCase().includes(t.toLowerCase()) || c.toLowerCase().includes('id')));
    }
    process.exit(0);
}
run();
