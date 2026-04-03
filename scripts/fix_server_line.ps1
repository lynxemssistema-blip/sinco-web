$file = "src\server.js"
$content = Get-Content $file -Raw -Encoding UTF8

# The corrupted string (CRLF embedded in code)
$bad = "await connection.execute(`r// ============================================================================`r// PLANO DE CORTE `u{2014} Lista para tela de MONTAGEM (cria`u{00e7}`u{00e3}o)`r// GET /api/plano-corte/lista`r//`r// Espelha VB.NET `u{2014} tela de Montagem Plano de Corte:`r//   chkTodos=false: NOT sent (enviadocorte = '' OR NULL), NOT concluded`r//   chkTodos=true:  sem restri`u{00e7}`u{00e3}o `u{2014} todos os planos ativos`r// ============================================================================`r"

$good = @"
await connection.execute(
                        ``UPDATE ordemservico SET OrdemServicoFinalizado = 'S', DataFinalizado = ?
                         WHERE IdOrdemServico = ?``,
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
            const inicioUpdate = !item.RealizadoInicioMontagem ? agora : item.RealizadoInicioMontagem;
            await connection.execute(
                ``UPDATE ordemservicoitem SET
                    MontagemTotalExecutado   = ?,
                    MontagemTotalExecutar    = ?,
                    MontagemPercentual       = ?,
                    RealizadoInicioMontagem  = ?
                 WHERE IdOrdemServicoItem = ?``,
                [novoExecutado, novoExecutar, parseFloat(percentual), inicioUpdate, IdOrdemServicoItem]
            );
            await connection.commit();
            return res.json({
                success: true, concluido: false,
                novoExecutado, novoExecutar, percentual,
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

"@

if ($content.Contains($bad)) {
    $newContent = $content.Replace($bad, $good)
    [System.IO.File]::WriteAllText((Resolve-Path $file), $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "FIX APPLIED - bad string replaced"
} else {
    Write-Host "BAD STRING NOT FOUND - showing hex around line 8433"
    $lines = Get-Content $file
    Write-Host ($lines[8432] | Format-Hex | Out-String)
}
