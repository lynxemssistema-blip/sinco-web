const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// The corrupted line 8433: "await connection.execute(\r// ====..."
// followed by comment block and app.get('/api/plano-corte/lista'...
// We need to replace from "if (Number(countRow.pendentes) === 0) {" 
// through "app.get('/api/plano-corte/lista', async (req, res) => {"

const badStart = "                if (Number(countRow.pendentes) === 0) {\r\n                    await connection.execute(";
const badMiddle = "// ============================================================================\r\n// PLANO DE CORTE";

// Find the corrupted section
const startIdx = content.indexOf(badStart);
if (startIdx === -1) {
    console.log('ERROR: Could not find start of corrupted block');
    process.exit(1);
}

// The corrupted execute( has \r// on the same line
const lineEnd = content.indexOf('\n', startIdx + badStart.length);
const corruptedLine = content.substring(startIdx + badStart.length, lineEnd);
console.log('Found corrupted content after execute(:', JSON.stringify(corruptedLine.substring(0, 80)));

// Find where the new route starts (the app.get that should be separate)
const routeStart = "app.get('/api/plano-corte/lista', async (req, res) => {";
const routeIdx = content.indexOf(routeStart, startIdx);
if (routeIdx === -1) {
    console.log('ERROR: Could not find route start');
    process.exit(1);
}

console.log(`Corrupted block: chars ${startIdx} to ${routeIdx + routeStart.length}`);

// The replacement: restore the missing handler code + properly separate route
const replacement = `                if (Number(countRow.pendentes) === 0) {
                    await connection.execute(
                        \`UPDATE ordemservico SET OrdemServicoFinalizado = 'S', DataFinalizado = ?
                         WHERE IdOrdemServico = ?\`,
                        [agoraData, IdOrdemServico]
                    );
                    osFinalizada = true;
                }
            }

            await connection.commit();
            return res.json({
                success: true,
                concluido: true,
                itemFinalizado,
                osFinalizada,
                novoExecutado,
                novoExecutar: 0,
                percentual: '100',
                message: itemFinalizado
                    ? (osFinalizada ? 'Item finalizado! Ordem de Servico encerrada!' : 'Item finalizado com sucesso!')
                    : 'Setor Montagem concluido!'
            });

        } else {
            // Parcial
            const inicioUpdate = !item.RealizadoInicioMontagem ? agora : item.RealizadoInicioMontagem;

            await connection.execute(
                \`UPDATE ordemservicoitem SET
                    MontagemTotalExecutado   = ?,
                    MontagemTotalExecutar    = ?,
                    MontagemPercentual       = ?,
                    RealizadoInicioMontagem  = ?
                 WHERE IdOrdemServicoItem = ?\`,
                [novoExecutado, novoExecutar, parseFloat(percentual), inicioUpdate, IdOrdemServicoItem]
            );

            await connection.commit();
            return res.json({
                success: true,
                concluido: false,
                novoExecutado,
                novoExecutar,
                percentual,
                message: 'Lancamento salvo com sucesso!'
            });
        }

    } catch (err) {
        if (connection) await connection.rollback().catch(() => {});
        console.error('[TesteFinalMontagem/Lancar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao salvar: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Lista para tela de MONTAGEM
// GET /api/plano-corte/lista
// ============================================================================
app.get('/api/plano-corte/lista', async (req, res) => {`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(routeIdx + routeStart.length);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: File fixed!');
console.log('Lines before:', content.split('\n').length);
console.log('Lines after:', newContent.split('\n').length);
