/**
 * Corrigir datas em formato YYYY-MM-DD → DD/MM/YYYY nas colunas de apontamento
 * 
 * Colunas afetadas: RealizadoInicio{Setor}, RealizadoFinal{Setor}
 */
const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();

// Todas as colunas de data de realização nos itens
const dateCols = [
    'RealizadoInicioCorte', 'RealizadoFinalCorte',
    'RealizadoInicioDobra', 'RealizadoFinalDobra',
    'RealizadoInicioSolda', 'RealizadoFinalSolda',
    'RealizadoInicioPintura', 'RealizadoFinalPintura',
    'RealizadoInicioMontagem', 'RealizadoFinalMontagem',
    'RealizadoInicioCorteaLaser', 'RealizadoFinalCorteaLaser',
    'RealizadoInicioPULSIONADEIRA', 'RealizadoFinalPULSIONADEIRA',
    'RealizadoInicioGALVANIZAR', 'RealizadoFinalGALVANIZAR',
    'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
    'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
    'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
    'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
    'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem',
    'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
    'PlanejadoInicioPULSIONADEIRA', 'PlanejadoFinalPULSIONADEIRA',
    'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
];

// Regex para detectar YYYY-MM-DD
const isYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;

function toBR(val) {
    // MySQL2 pode retornar Date objects ou strings
    if (val instanceof Date) {
        const d = val;
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }
    const str = String(val);
    const m = str.match(isYYYYMMDD);
    if (!m) return null;
    return `${m[3]}/${m[2]}/${m[1]}`; // DD/MM/YYYY
}

async function main() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST, user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });

    let totalFixed = 0;

    for (const col of dateCols) {
        // Verificar se coluna existe
        const [colCheck] = await c.execute(
            `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordemservicoitem' AND COLUMN_NAME = ?`,
            [col]
        );
        if (colCheck[0].c === 0) {
            console.log(`[SKIP] Coluna ${col} não existe`);
            continue;
        }

        // Buscar registros com formato errado
        const [rows] = await c.execute(
            `SELECT IdOrdemServicoItem, \`${col}\` as val FROM ordemservicoitem WHERE \`${col}\` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`
        );

        if (rows.length === 0) {
            console.log(`[OK] ${col}: nenhum registro errado`);
            continue;
        }

        console.log(`[FIX] ${col}: ${rows.length} registros com formato YYYY-MM-DD`);

        for (const row of rows) {
            const converted = toBR(row.val);
            if (converted) {
                await c.execute(
                    `UPDATE ordemservicoitem SET \`${col}\` = ? WHERE IdOrdemServicoItem = ?`,
                    [converted, row.IdOrdemServicoItem]
                );
                console.log(`  Item ${row.IdOrdemServicoItem}: ${row.val} → ${converted}`);
                totalFixed++;
            }
        }
    }

    // Verificar também nas tags
    const tagDateCols = [
        'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
        'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
        'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
        'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
        'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem',
        'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
        'PlanejadoInicioPULSIONADEIRA', 'PlanejadoFinalPULSIONADEIRA',
        'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
    ];

    for (const col of tagDateCols) {
        const [colCheck] = await c.execute(
            `SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags' AND COLUMN_NAME = ?`,
            [col]
        );
        if (colCheck[0].c === 0) continue;

        const [rows] = await c.execute(
            `SELECT IdTag, \`${col}\` as val FROM tags WHERE \`${col}\` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`
        );

        if (rows.length === 0) continue;
        console.log(`[FIX TAG] ${col}: ${rows.length} registros com formato errado`);

        for (const row of rows) {
            const converted = toBR(row.val);
            if (converted) {
                await c.execute(
                    `UPDATE tags SET \`${col}\` = ? WHERE IdTag = ?`,
                    [converted, row.IdTag]
                );
                console.log(`  Tag ${row.IdTag}: ${row.val} → ${converted}`);
                totalFixed++;
            }
        }
    }

    console.log(`\n✅ Total de datas corrigidas: ${totalFixed}`);
    await c.end();
}

main().catch(console.error);
