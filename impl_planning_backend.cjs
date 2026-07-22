/**
 * Implementação do Modal de Planejamento de Setores
 * 
 * Changes:
 * 1. Backend: completar allowedFields no setor-data e corrigir propagação respeitando txt{Recurso}='1'
 * 2. Backend: novo endpoint POST /api/visao-geral/tag/:idTag/propagar-datas-os
 * 3. Frontend: adicionar seção de propagação para OS no modal
 * 4. Frontend: converter data ISO → BR antes de enviar
 */

const fs = require('fs');

// ─── BACKEND ──────────────────────────────────────────────────────────────────
const serverPath = 'src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// 1. Completar allowedFields e corrigir propagação no setor-data endpoint
const oldSetorData = `app.put('/api/visao-geral/tag/:idTag/setor-data', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { field, value } = req.body;

        const allowedFields = [
            'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
            'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
            'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
            'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
            'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem'
        ];

        if (!allowedFields.includes(field)) {
            return res.status(400).json({ success: false, message: 'Campo invǟ\u{FFFD}lido.' });
        }

        const queryPool = req.tenantDbPool || pool;
        await queryPool.execute(
            \`UPDATE tags SET \${field} = ? WHERE IdTag = ? AND (Finalizado IS NULL OR Finalizado != 'C')\`,
            [value, idTag]
        );
        await queryPool.execute(
            \`UPDATE ordemservico SET \${field} = ? WHERE IdTag = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')\`,
            [value, idTag]
        );
        await queryPool.execute(
            \`UPDATE ordemservicoitem SET \${field} = ? WHERE IdTag = ? AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')\`,
            [value, idTag]
        );

        res.json({ success: true, message: 'Data do setor atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag sector date:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data do setor: ' + error.message });
    }
});`;

// Mapeamento setor → campo flag no OSItem
const SECTOR_FLAG_MAP = {
    'Corte':         'txtCorte',
    'Dobra':         'txtDobra',
    'Solda':         'txtSolda',
    'Pintura':       'txtPintura',
    'Montagem':      'TxtMontagem',
    'CorteaLaser':   'txtCorteaLaser',
    'PULSIONADEIRA': 'txtPULSIONADEIRA',
    'GALVANIZAR':    'txtGALVANIZAR',
};

const newSetorData = `app.put('/api/visao-geral/tag/:idTag/setor-data', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { field, value } = req.body;

        // Campos permitidos — todos os setores (VARCHAR e DATE)
        const allowedFields = [
            'PlanejadoInicioCorte',         'PlanejadoFinalCorte',
            'PlanejadoInicioDobra',         'PlanejadoFinalDobra',
            'PlanejadoInicioSolda',         'PlanejadoFinalSolda',
            'PlanejadoInicioPintura',       'PlanejadoFinalPintura',
            'PlanejadoInicioMontagem',      'PlanejadoFinalMontagem',
            'PlanejadoInicioCorteaLaser',   'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPULSIONADEIRA', 'PlanejadoFinalPULSIONADEIRA',
            'PlanejadoInicioGALVANIZAR',    'PlanejadoFinalGALVANIZAR',
        ];

        if (!allowedFields.includes(field)) {
            return res.status(400).json({ success: false, message: 'Campo inválido: ' + field });
        }

        // Determinar o setor a partir do nome do campo
        // Ex: PlanejadoInicioCorte → setor = 'Corte' → flag = 'txtCorte'
        const sectorFlagMap = ${JSON.stringify(SECTOR_FLAG_MAP, null, 12).replace(/^/gm, '        ').trimStart()};
        const sectorName = Object.keys(sectorFlagMap).find(k => field.includes(k));
        const txtFlag = sectorName ? sectorFlagMap[sectorName] : null;

        // Colunas DATE no banco precisam de YYYY-MM-DD; VARCHAR aceitam DD/MM/YYYY
        const dateCols = [
            'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPULSIONADEIRA', 'PlanejadoFinalPULSIONADEIRA',
            'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
        ];
        const isDateCol = dateCols.includes(field);

        // Converter DD/MM/YYYY → YYYY-MM-DD para colunas DATE
        let dbValue = value;
        if (isDateCol && value && /^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(value)) {
            const [d, m, y] = value.split('/');
            dbValue = \`\${y}-\${m}-\${d}\`;
        }
        // Para limpar o campo: value vazio → NULL
        if (!value || value.trim() === '') dbValue = null;

        const queryPool = req.tenantDbPool || pool;

        // 1. Atualizar a TAG
        await queryPool.execute(
            \`UPDATE tags SET \${field} = ? WHERE IdTag = ? AND (Finalizado IS NULL OR Finalizado != 'C')\`,
            [dbValue, idTag]
        );

        res.json({ success: true, message: 'Data do setor atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag sector date:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data do setor: ' + error.message });
    }
});

// Propagar datas de planejamento da TAG → OS e OSItens respeitando txt{Recurso}='1'
app.post('/api/visao-geral/tag/:idTag/propagar-datas-os', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { setores } = req.body;
        // setores = [{ sectorName, piField, pfField, piValue, pfValue }]

        if (!setores || !setores.length) {
            return res.status(400).json({ success: false, message: 'Nenhum setor informado.' });
        }

        const sectorFlagMap = ${JSON.stringify(SECTOR_FLAG_MAP, null, 12).replace(/^/gm, '        ').trimStart()};

        const dateCols = [
            'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPULSIONADEIRA', 'PlanejadoFinalPULSIONADEIRA',
            'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
        ];

        const toDbVal = (field, value) => {
            if (!value || value.trim() === '') return null;
            if (dateCols.includes(field) && /^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(value)) {
                const [d, m, y] = value.split('/');
                return \`\${y}-\${m}-\${d}\`;
            }
            return value;
        };

        const queryPool = req.tenantDbPool || pool;
        let totalUpdated = 0;

        for (const s of setores) {
            const { sectorName, piField, pfField, piValue, pfValue } = s;
            const txtFlag = sectorFlagMap[sectorName];
            if (!txtFlag) continue;

            const piDb = toDbVal(piField, piValue);
            const pfDb = toDbVal(pfField, pfValue);

            // Campos a atualizar nas OS e OSItens
            const setClauses = [];
            const params = [];

            if (piDb !== undefined && piField) {
                setClauses.push(\`\${piField} = ?\`);
                params.push(piDb);
            }
            if (pfDb !== undefined && pfField) {
                setClauses.push(\`\${pfField} = ?\`);
                params.push(pfDb);
            }

            if (!setClauses.length) continue;

            // Atualizar ordemservico (OS nesta tag)
            await queryPool.execute(
                \`UPDATE ordemservico SET \${setClauses.join(', ')} WHERE IdTag = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')\`,
                [...params, idTag]
            );

            // Atualizar ordemservicoitem somente onde txt{Recurso}='1'
            const [result] = await queryPool.execute(
                \`UPDATE ordemservicoitem osi
                  INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
                  SET \${setClauses.map(c => 'osi.' + c).join(', ')}
                  WHERE os.IdTag = ?
                    AND osi.\${txtFlag} = '1'
                    AND (osi.OrdemServicoItemFinalizado IS NULL OR osi.OrdemServicoItemFinalizado != 'C')\`,
                [...params, idTag]
            );

            totalUpdated += result.affectedRows || 0;
            console.log(\`[PropDatas] Setor \${sectorName}: \${result.affectedRows} itens atualizados\`);
        }

        res.json({ success: true, message: \`Datas propagadas para OS: \${totalUpdated} itens atualizados.\` });
    } catch (error) {
        console.error('Error propagating dates to OS:', error);
        res.status(500).json({ success: false, message: 'Erro ao propagar datas: ' + error.message });
    }
});`;

if (serverContent.includes(oldSetorData.substring(0, 80))) {
    // Substituição direta por match parcial
    const startIdx = serverContent.indexOf("app.put('/api/visao-geral/tag/:idTag/setor-data'");
    const endMarker = "// POST: Finalizar Projeto em cascata";
    const endIdx = serverContent.indexOf(endMarker);
    if (startIdx > -1 && endIdx > -1) {
        serverContent = serverContent.slice(0, startIdx) + newSetorData + '\n\n' + serverContent.slice(endIdx);
        console.log('[OK] Backend: setor-data e propagar-datas-os inseridos');
    } else {
        console.error('[ERRO] Marcador não encontrado no server.js');
        process.exit(1);
    }
} else {
    console.log('[SKIP ou diferente] Verificando marcadores...');
    const startIdx = serverContent.indexOf("app.put('/api/visao-geral/tag/:idTag/setor-data'");
    const endMarker = "// POST: Finalizar Projeto em cascata";
    const endIdx = serverContent.indexOf(endMarker);
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);
    if (startIdx > -1 && endIdx > -1) {
        serverContent = serverContent.slice(0, startIdx) + newSetorData + '\n\n' + serverContent.slice(endIdx);
        console.log('[OK] Backend substituído');
    }
}

fs.writeFileSync(serverPath, serverContent, 'utf8');

// Verificar sintaxe
const { execSync } = require('child_process');
try {
    execSync('node -c src/server.js', { stdio: 'pipe' });
    console.log('[OK] Sintaxe do server.js válida');
} catch (e) {
    console.error('[ERRO] Sintaxe inválida:', e.stderr?.toString());
    process.exit(1);
}

console.log('\nBackend concluído. Agora aplicar frontend...');
