const pool = require('./src/config/db');
const colBase = 'CorteaLaser';
const cols = [
    { name: `txt${colBase}`, type: 'VARCHAR(100) DEFAULT NULL' },
    { name: `sttxt${colBase}`, type: 'VARCHAR(50) DEFAULT NULL' },
    { name: `PlanejadoInicio${colBase}`, type: 'DATE DEFAULT NULL' },
    { name: `PlanejadoFinal${colBase}`, type: 'DATE DEFAULT NULL' },
    { name: `RealizadoInicio${colBase}`, type: 'DATETIME DEFAULT NULL' },
    { name: `UsuarioRealizadoInicio${colBase}`, type: 'VARCHAR(100) DEFAULT NULL' },
    { name: `RealizadoFinal${colBase}`, type: 'DATETIME DEFAULT NULL' },
    { name: `UsuarioRealizadoFinal${colBase}`, type: 'VARCHAR(100) DEFAULT NULL' },
    { name: `${colBase}TotalExecutado`, type: 'DECIMAL(10,2) DEFAULT 0' },
    { name: `${colBase}TotalExecutar`, type: 'DECIMAL(10,2) DEFAULT 0' },
    { name: `${colBase}Percentual`, type: 'DECIMAL(5,2) DEFAULT 0' }
];

(async function() {
    const conn = await pool.getConnection();
    for (const tbl of ['ordemservicoitem', 'ordemservico', 'tags', 'projetos']) {
        const [c] = await conn.execute(`SHOW COLUMNS FROM ${tbl}`);
        const ex = c.map(x => x.Field.toLowerCase());
        for (const col of cols) {
            if (!ex.includes(col.name.toLowerCase())) {
                try {
                    await conn.execute(`ALTER TABLE ${tbl} ADD COLUMN \`${col.name}\` ${col.type}`);
                    console.log(`Added ${col.name} to ${tbl}`);
                } catch(e) {
                    console.log(e.message);
                }
            }
        }
    }
    conn.release();
    process.exit(0);
})();
