// Robust all-in-one fix script - handles any line endings
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function fixBySearch(name, search, replacement) {
    const idx = content.indexOf(search);
    if (idx !== -1) {
        content = content.substring(0, idx) + replacement + content.substring(idx + search.length);
        changes++;
        console.log(`✅ ${name} (pos ${idx})`);
        return true;
    }
    console.log(`⚠️  ${name} - NOT FOUND`);
    return false;
}

// ======================================================================
// FIX 1: Already applied by previous run - verify
// ======================================================================
if (content.includes('DataLiberacao = ?,') && content.includes('UsuarioLiberacao = ?')) {
    console.log('✅ FIX 1: Already applied (DataLiberacao fields)');
} else {
    console.log('⚠️  FIX 1: Needs manual check');
}

// ======================================================================
// FIX 2: Montagem SELECT - alias EnviadoCorte
// ======================================================================
// Search for the exact column list in the montagem query
const montagemMarker = "Lista para tela de MONTAGEM";
const montagemIdx = content.indexOf(montagemMarker);
if (montagemIdx !== -1) {
    const subBlock = content.substring(montagemIdx, montagemIdx + 2000);
    const colSearch = "EnviadoCorte, Concluido,";
    const colIdx = subBlock.indexOf(colSearch);
    if (colIdx !== -1) {
        const absIdx = montagemIdx + colIdx;
        content = content.substring(0, absIdx) + "EnviadoCorte AS Enviadocorte, Concluido," + content.substring(absIdx + colSearch.length);
        changes++;
        console.log('✅ FIX 2: Montagem SELECT - Enviadocorte alias');
    } else {
        // Check if already aliased
        if (subBlock.includes("EnviadoCorte AS Enviadocorte")) {
            console.log('✅ FIX 2: Already aliased in Montagem');
        } else {
            console.log('⚠️  FIX 2: Column pattern not found in Montagem');
        }
    }
} else {
    console.log('⚠️  FIX 2: Montagem marker not found');
}

// ======================================================================
// FIX 3: Producao SELECT - alias + LiberacaoParaCorte
// ======================================================================
const producaoMarker = "Lista-Producao";
const producaoCheckIdx = content.indexOf(producaoMarker);
if (producaoCheckIdx !== -1) {
    // Find the SELECT around this area
    const searchStart = Math.max(0, producaoCheckIdx - 3000);
    const producaoBlock = content.substring(searchStart, producaoCheckIdx);
    
    // Find EnviadoCorte in the producao SELECT
    const envSearchProd = "EnviadoCorte, Concluido,";
    const envProdIdx = producaoBlock.lastIndexOf(envSearchProd);
    if (envProdIdx !== -1) {
        const absIdx = searchStart + envProdIdx;
        // Replace and also add LiberacaoParaCorte fields
        const oldLine = content.substring(absIdx, absIdx + envSearchProd.length);
        const afterEnv = content.indexOf("DataInicial, DataFinal", absIdx);
        if (afterEnv !== -1) {
            // Find what's between EnviadoCorte line and DataInicial
            const blockToReplace = content.substring(absIdx, afterEnv);
            const newBlock = "EnviadoCorte AS Enviadocorte, Concluido," + 
                content.substring(absIdx + envSearchProd.length, afterEnv).replace(
                    /DataLiberacao, UsuarioLiberacao,/,
                    "DataLiberacao, UsuarioLiberacao,\n                   LiberacaoParaCorte, DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte,"
                );
            content = content.substring(0, absIdx) + newBlock + content.substring(afterEnv);
            changes++;
            console.log('✅ FIX 3: Producao SELECT - alias + LiberacaoParaCorte');
        }
    } else {
        if (content.substring(searchStart, producaoCheckIdx).includes("EnviadoCorte AS Enviadocorte")) {
            console.log('✅ FIX 3: Already aliased in Producao');
            // But still need to add LiberacaoParaCorte
            if (!content.substring(searchStart, producaoCheckIdx).includes("LiberacaoParaCorte")) {
                const dl = content.indexOf("DataLiberacao, UsuarioLiberacao,", searchStart);
                if (dl !== -1 && dl < producaoCheckIdx) {
                    const insertAfter = content.indexOf(",", dl + "DataLiberacao, UsuarioLiberacao,".length - 1);
                    const insertPos = dl + "DataLiberacao, UsuarioLiberacao,".length;
                    content = content.substring(0, insertPos) + "\n                   LiberacaoParaCorte, DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte," + content.substring(insertPos);
                    changes++;
                    console.log('✅ FIX 3b: Added LiberacaoParaCorte to Producao SELECT');
                }
            }
        } else {
            console.log('⚠️  FIX 3: Column pattern not found in Producao');
        }
    }
}

// ======================================================================
// FIX 4: _handlePlanoItens - fix SQL
// ======================================================================
const handleIdx = content.indexOf('function _handlePlanoItens');
if (handleIdx !== -1) {
    const nextRouteSearch = content.indexOf("app.get('/api/plano-corte/itens/", handleIdx);
    if (nextRouteSearch === -1) {
        // Try alternate marker
        const altSearch = content.indexOf("app.get(['/api/plano-corte/itens/", handleIdx);
        if (altSearch !== -1) {
            let handleBlock = content.substring(handleIdx, altSearch);
            const selectStart = handleBlock.indexOf("const [rows] = await connection.execute(");
            const selectEnd = handleBlock.indexOf("`, params);", selectStart);
            
            if (selectStart !== -1 && selectEnd !== -1) {
                const newSelect = `const [rows] = await connection.execute(\`
            SELECT
                CodMatFabricante, idplanodecorte AS IdPlanodecorte,
                IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,
                IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,
                QtdeTotal, txtCorte,
                COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,
                COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,
                CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '/', QtdeTotal) AS Parcial,
                OrdemServicoItemFinalizado, DescResumo, DescDetal,
                EnderecoArquivo,
                EnderecoArquivoItemOrdemServico,
                qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,
                RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia
            FROM ordemservicoitem
            WHERE \${filtros.join(' AND ')}
            ORDER BY IdOrdemServicoItem ASC
        \`, params);`;
                
                const oldSelect = handleBlock.substring(selectStart, selectEnd + "`, params);".length);
                const fullOldStart = handleIdx + selectStart;
                content = content.substring(0, fullOldStart) + newSelect + content.substring(fullOldStart + oldSelect.length);
                changes++;
                console.log('✅ FIX 4: _handlePlanoItens SELECT cleaned');
            } else {
                console.log('⚠️  FIX 4: SELECT boundaries not found');
            }
        } else {
            console.log('⚠️  FIX 4: Could not find next route after _handlePlanoItens');
        }
    } else {
        let handleBlock = content.substring(handleIdx, nextRouteSearch);
        const selectStart = handleBlock.indexOf("const [rows] = await connection.execute(");
        const selectEnd = handleBlock.indexOf("`, params);", selectStart);
        
        if (selectStart !== -1 && selectEnd !== -1) {
            const newSelect = `const [rows] = await connection.execute(\`
            SELECT
                CodMatFabricante, idplanodecorte AS IdPlanodecorte,
                IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,
                IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,
                QtdeTotal, txtCorte,
                COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,
                COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,
                CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '/', QtdeTotal) AS Parcial,
                OrdemServicoItemFinalizado, DescResumo, DescDetal,
                EnderecoArquivo,
                EnderecoArquivoItemOrdemServico,
                qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,
                RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia
            FROM ordemservicoitem
            WHERE \${filtros.join(' AND ')}
            ORDER BY IdOrdemServicoItem ASC
        \`, params);`;
            
            const oldSelect = handleBlock.substring(selectStart, selectEnd + "`, params);".length);
            const fullOldStart = handleIdx + selectStart;
            content = content.substring(0, fullOldStart) + newSelect + content.substring(fullOldStart + oldSelect.length);
            changes++;
            console.log('✅ FIX 4: _handlePlanoItens SELECT cleaned');
        }
    }
} else {
    console.log('⚠️  FIX 4: _handlePlanoItens not found');
}

// ======================================================================
// FIX 5: Add liberar-producao route
// ======================================================================
if (!content.includes('liberar-producao')) {
    // Find the producao-plano-corte itens route
    const itensRoute = content.indexOf("app.get('/api/producao-plano-corte/itens/");
    // Also try with array syntax
    const itensRouteAlt = content.indexOf("'/api/producao-plano-corte/itens/");
    const insertPoint = itensRoute !== -1 ? itensRoute : (itensRouteAlt !== -1 ? content.lastIndexOf('\n', itensRouteAlt) + 1 : -1);
    
    if (insertPoint !== -1) {
        const newRoute = `
// POST /api/producao-plano-corte/:id/liberar-producao
// Espelha VB.NET: Liberar Plano de Corte para Produção
// Atualiza LiberacaoParaCorte = 'S', DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte
app.post('/api/producao-plano-corte/:id/liberar-producao', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;
        const usuario = req.user?.NomeCompleto || req.user?.nome || 'Sistema';
        const agora = new Date().toLocaleDateString('pt-BR');

        // Verificar se já foi liberado
        const [[plano]] = await connection.execute(
            'SELECT LiberacaoParaCorte FROM planodecorte WHERE IdPlanodecorte = ?', [id]
        );

        if (!plano) {
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        if (plano.LiberacaoParaCorte === 'S') {
            return res.json({ success: false, message: 'Plano de corte já liberado para produção!' });
        }

        await connection.execute(
            \`UPDATE planodecorte SET
                LiberacaoParaCorte = 'S',
                DataLiberacaoParaCorte = ?,
                UsuarioLiberacaoParaCorte = ?
             WHERE IdPlanodecorte = ?\`,
            [agora, usuario, id]
        );

        res.json({ success: true, message: \`Plano #\${id} liberado para produção com sucesso.\` });
    } catch (err) {
        console.error('[Producao/Liberar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao liberar plano para produção.' });
    } finally {
        if (connection) connection.release();
    }
});

`;
        content = content.substring(0, insertPoint) + newRoute + content.substring(insertPoint);
        changes++;
        console.log('✅ FIX 5: Added liberar-producao route');
    } else {
        console.log('⚠️  FIX 5: Could not find insertion point');
    }
} else {
    console.log('✅ FIX 5: liberar-producao route already exists');
}

// ======================================================================
// WRITE & VERIFY
// ======================================================================
fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nApplied ${changes} fix(es). Verifying syntax...`);

const { execSync } = require('child_process');
try {
    execSync('node --check src/server.js', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    console.log('✅ Syntax OK');
} catch (e) {
    console.log('❌ Syntax ERROR:', e.stderr?.toString() || e.message);
}
