const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'server.js');
let src = fs.readFileSync(file, 'utf8');

// The exact old block (with backslash inside template literals - they appear as-is in the file)
const OLD = `                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,\r\n                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,\r\n\r\n                /* \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 Setor Dobra \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 */\r\n                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,\r\n                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,\r\n\r\n                /* \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 Setor Solda \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 */\r\n                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,\r\n                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,\r\n\r\n                /* \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 Setor Pintura \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 */\r\n                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,\r\n                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,\r\n\r\n                /* \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 Setor Montagem \xc3\xa2\xc2\x80\xc2\x94\xc3\xa2\xc2\x80\xc2\x94 */\r\n                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalMontagem,\r\n                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecMontagem`;

// Look for key markers to do a targeted replacement using line-based search
const lines = src.split('\n');
let startLine = -1, endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('CorteTotalExecutar') && lines[i].includes('TotalCorte')) {
        startLine = i - 1; // one line before (the comment line)
        break;
    }
}
for (let i = startLine; i < lines.length; i++) {
    if (lines[i].includes('MontagemTotalExecutado') && lines[i].includes('ExecMontagem')) {
        endLine = i;
        break;
    }
}

if (startLine === -1 || endLine === -1) {
    console.error('Could not find target lines!', { startLine, endLine });
    process.exit(1);
}

console.log(`Found target block at lines ${startLine+1} to ${endLine+1}`);
console.log('Before:', lines[startLine]);
console.log('After:', lines[endLine]);

const newBlock = `                /* -- Setor Corte -- */
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,
                MIN(NULLIF(t.RealizadoInicioCorte,'')) AS RealizadoInicioCorte,
                MAX(NULLIF(t.RealizadoFinalCorte,''))  AS RealizadoFinalCorte,

                /* -- Setor Dobra -- */
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,
                MIN(NULLIF(t.RealizadoInicioDobra,'')) AS RealizadoInicioDobra,
                MAX(NULLIF(t.RealizadoFinalDobra,''))  AS RealizadoFinalDobra,

                /* -- Setor Solda -- */
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,
                MIN(NULLIF(t.RealizadoInicioSolda,'')) AS RealizadoInicioSolda,
                MAX(NULLIF(t.RealizadoFinalSolda,''))  AS RealizadoFinalSolda,

                /* -- Setor Pintura -- */
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,
                MIN(NULLIF(t.RealizadoInicioPintura,'')) AS RealizadoInicioPintura,
                MAX(NULLIF(t.RealizadoFinalPintura,''))  AS RealizadoFinalPintura,

                /* -- Setor Montagem -- */
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalMontagem,
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecMontagem,
                MIN(NULLIF(t.RealizadoInicioMontagem,'')) AS RealizadoInicioMontagem,
                MAX(NULLIF(t.RealizadoFinalMontagem,''))  AS RealizadoFinalMontagem`;

// Replace the block
const newLines = [
    ...lines.slice(0, startLine),
    ...newBlock.split('\n'),
    ...lines.slice(endLine + 1),
];

fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Done! File updated.');
console.log(`Replaced lines ${startLine+1} to ${endLine+1} (${endLine - startLine + 1} lines) with ${newBlock.split('\n').length} lines`);
