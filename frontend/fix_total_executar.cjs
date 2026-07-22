const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', 'utf8');

const regex = /const totalExecutarLimit = isFirstActiveSector[\s\S]*?const finalizado = novoTotalExecutado >= qtdeTotal;/;

const replacementStr = `const capacidadeSetor = isFirstActiveSector
                ? qtdeTotal
                : (parseFloat(item[sConfig.executar]) || 0);

            const saldoAExecutar = capacidadeSetor - totalExecutadoDb;

            if (!isMapa) {
                // 1. Validação de Saldo a Executar Normal
                if (saldoAExecutar <= 0) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: \`Não há saldo a executar para o setor \${sName}.\` });
                }

                if (currentInputQty > saldoAExecutar) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: \`Quantidade informada(\${currentInputQty}) excede o saldo a executar(\${saldoAExecutar}) no setor \${sName} !\`
                    });
                }

                // 2. Validação de Sequência (Saldo Anterior)
                const currentIndex = sequence.indexOf(sName);
                if (currentIndex > 0) {
                    let prevSectorName = null;
                    // Procurar o setor anterior que é ativado para este item
                    for (let i = currentIndex - 1; i >= 0; i--) {
                        const checkSName = sequence[i];
                        const checkConfig = setorColumns[checkSName];
                        if (NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                            prevSectorName = checkSName;
                            break;
                        }
                    }

                    if (prevSectorName) {
                        const prevConfig = setorColumns[prevSectorName];
                        const prevTotalExecutado = parseFloat(item[prevConfig.total]) || 0;
                        const novoTotalTentativa = totalExecutadoDb + currentInputQty;

                        if (novoTotalTentativa > prevTotalExecutado) {
                            await conn.rollback();
                            const msg = \`Não é aceito apontar produção no setor '\${sName.charAt(0).toUpperCase() + sName.slice(1)}' pois o setor anterior '\${prevSectorName.charAt(0).toUpperCase() + prevSectorName.slice(1)}' possui apenas \${prevTotalExecutado} unidades concluídas.\`;
                            return res.status(400).json({ success: false, message: msg });
                        }
                    }
                }
            }

            const novoTotalExecutado = isMapa ? qtdeTotal : totalExecutadoDb + currentInputQty;
            const novoTotalExecutar = isMapa ? qtdeTotal : capacidadeSetor; // NUNCA MOVIDO! Apenas preservado.
            const novoPercentual = isMapa ? 100 : (qtdeTotal > 0 ? Math.min(100, Math.round((novoTotalExecutado / qtdeTotal) * 100)) : 0);
            const finalizado = novoTotalExecutado >= qtdeTotal;`;

if (regex.test(file)) {
    file = file.replace(regex, replacementStr);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', file);
    console.log("Substituicao executada com sucesso!");
} else {
    console.log("Regex alvo não encontrada!");
}
