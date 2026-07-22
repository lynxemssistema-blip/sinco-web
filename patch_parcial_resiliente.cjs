
const newEndpoint = `app.post('/api/apontamento-parcial', async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({ success: false, message: 'IdOrdemServicoItem, Processo e QtdeProduzida sao obrigatorios' });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const queryPool = req.tenantDbPool || pool;
    const conn = await queryPool.getConnection();
    try {
        await conn.beginTransaction();

        const now = getCurrentDateTimeBR();
        const processoKey = String(Processo).trim().toUpperCase();
        const usuario = CriadoPor || 'Sistema';

        // 1. Buscar dados completos do item
        const [itemRows] = await conn.execute(
            \`SELECT osi.*, os.IdProjeto, os.IdTag
             FROM ordemservicoitem osi
             INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
             WHERE osi.IdOrdemServicoItem = ?\`,
            [IdOrdemServicoItem]
        );
        if (itemRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item nao encontrado' });
        }

        const item = itemRows[0];
        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
        const idOS = item.IdOrdemServico || IdOrdemServico;

        // 2. Resolver config do setor (estático ou dinamicamente)
        const sConfig = await resolveSetorConfig(processoKey, conn);

        if (!sConfig) {
            // Recurso não mapeado e não existe no banco — registra log e retorna sucesso gracioso
            console.warn(\`[RECURSO_NAO_MAPEADO] Apontamento Parcial ignorado — Processo '\${processoKey}' sem colunas no banco. Item=\${IdOrdemServicoItem}\`);
            await conn.rollback();
            return res.json({ success: true, message: \`Apontamento registrado (recurso '\${processoKey}' ainda não mapeado no sistema — log gerado).\` });
        }

        // 3. Verificar flag txt{Recurso} = '1' — confirma que o recurso está ativo neste item
        const txtFlag = sConfig.txt ? String(item[sConfig.txt] || '').trim() : null;
        if (txtFlag !== null && txtFlag !== '1') {
            console.warn(\`[RECURSO_INATIVO] Processo '\${processoKey}' não está ativo (txt=\${txtFlag}) no Item=\${IdOrdemServicoItem}. Apontamento ignorado.\`);
            await conn.rollback();
            return res.json({ success: true, message: \`Recurso '\${processoKey}' não está ativo para este item — operação ignorada sem erro.\` });
        }

        // 4. Calcular novo TotalExecutado e Percentual do setor
        const totalExecutadoAtual = parseFloat(item[sConfig.total]) || 0;
        const novoTotalExecutado = totalExecutadoAtual + inputQty;
        const novoPercentual = qtdeTotal > 0 ? Math.min(100, Math.round((novoTotalExecutado / qtdeTotal) * 100)) : 0;

        // 5. Atualizar ordemservicoitem: TotalExecutado + Percentual do setor
        let updateQuery = \`UPDATE ordemservicoitem SET \${sConfig.total} = ?, \${sConfig.percentual || sConfig.total} = ?\`;
        const updateParams = [novoTotalExecutado, novoPercentual];

        // Gravar data de início realizado se for o primeiro apontamento deste setor (coluna pode não existir em setores dinâmicos)
        if (sConfig.inicio && !item[sConfig.inicio]) {
            updateQuery += \`, \${sConfig.inicio} = ?\`;
            updateParams.push(getCurrentDateSQL());
            if (sConfig.userInicio) {
                updateQuery += \`, \${sConfig.userInicio} = ?\`;
                updateParams.push(usuario);
            }
        }
        updateQuery += \` WHERE IdOrdemServicoItem = ?\`;
        updateParams.push(IdOrdemServicoItem);
        await conn.execute(updateQuery, updateParams);

        // 6. Propagar saldo para o próximo setor ativo na cadeia produtiva (Fluxo Push)
        // Busca todos os recursos ativos do item dinamicamente
        const allSectorKeys = Object.keys(setorColumns).filter(k => k !== 'mapa');
        const currentPosInStatic = allSectorKeys.indexOf(processoKey.toLowerCase());
        let nextSectorName = null;

        if (currentPosInStatic >= 0) {
            // Recurso é estático — usa sequência conhecida
            for (let i = currentPosInStatic + 1; i < allSectorKeys.length; i++) {
                const checkConfig = setorColumns[allSectorKeys[i]];
                if (checkConfig && checkConfig.txt && NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                    nextSectorName = allSectorKeys[i];
                    break;
                }
            }
        } else {
            // Recurso dinâmico — busca próxima coluna txt* = '1' no item após o atual
            // Como não há ordem definida, apenas logamos sem propagar
            console.log(\`[RECURSO_DINAMICO] Recurso '\${processoKey}' é dinâmico — propagação de saldo para próximo setor não aplicada.\`);
        }

        if (nextSectorName) {
            const nextConfig = await resolveSetorConfig(nextSectorName.toUpperCase(), conn);
            if (nextConfig) {
                await conn.execute(
                    \`UPDATE ordemservicoitem SET \${nextConfig.executar} = COALESCE(\${nextConfig.executar}, 0) + ? WHERE IdOrdemServicoItem = ?\`,
                    [inputQty, IdOrdemServicoItem]
                );
                console.log(\`[API Apontamento Parcial] Propagando \${inputQty} para próximo setor: \${nextSectorName}\`);
            }
        }

        // 7. Inserir registro de controle (histórico)
        await conn.execute(
            \`INSERT INTO ordemservicoitemcontrole (IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, QtdeTotal, TipoApontamento, Situacao, CriadoPor, DataCriacao)
             VALUES (?, ?, ?, ?, ?, 'Parcial', 'P', ?, ?)\`,
            [IdOrdemServicoItem, idOS || null, processoKey.toLowerCase(), inputQty, qtdeTotal, usuario, now]
        );

        // 8. Recalcular totais em cascata (OS -> Tag -> Projeto)
        await recalcularQuantidadesTotais(idOS, conn);

        await conn.commit();
        console.log(\`[API Apontamento Parcial] OK | Item=\${IdOrdemServicoItem} | Processo=\${processoKey} | Qtde=\${inputQty} | NovoExecutado=\${novoTotalExecutado}\`);
        res.json({ success: true, message: 'Apontamento parcial registrado com sucesso.' });

    } catch (error) {
        await conn.rollback();
        console.error('[API Apontamento Parcial] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar apontamento parcial: ' + error.message });
    } finally {
        conn.release();
    }
});
`;

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'server.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Encontrar a linha inicial e final do endpoint existente
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("app.post('/api/apontamento-parcial'") && startIdx === -1) {
        startIdx = i;
    }
    if (startIdx !== -1 && i > startIdx && lines[i].includes('// DELETE: Excluir apontamento parcial')) {
        // O endpoint termina 2 linhas antes do comentário DELETE
        endIdx = i - 1;
        break;
    }
}

if (startIdx === -1 || endIdx === -1) {
    console.error('Não foi possível localizar o endpoint. Start:', startIdx, 'End:', endIdx);
    process.exit(1);
}

console.log(`Substituindo linhas ${startIdx+1} a ${endIdx+1}`);

const beforeLines = lines.slice(0, startIdx);
const afterLines = lines.slice(endIdx + 1);
const newContent = [...beforeLines, ...newEndpoint.split('\n'), ...afterLines].join('\n');

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Endpoint substituído com sucesso.');
