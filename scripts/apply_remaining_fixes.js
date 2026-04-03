// Apply remaining 2 fixes: LiberacaoParaCorte in SELECT + liberar-producao route
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// ======================================================================
// FIX A: Add LiberacaoParaCorte to producao SELECT
// ======================================================================
// Find the producao-plano-corte/lista route and add LiberacaoParaCorte fields
const producaoListaIdx = content.indexOf("app.get('/api/producao-plano-corte/lista'");
if (producaoListaIdx !== -1) {
    // Find the SELECT inside this route
    const searchBlock = content.substring(producaoListaIdx, producaoListaIdx + 2000);
    const dataLibIdx = searchBlock.indexOf("DataLiberacao, UsuarioLiberacao,");
    if (dataLibIdx !== -1) {
        const absIdx = producaoListaIdx + dataLibIdx;
        const oldStr = "DataLiberacao, UsuarioLiberacao,";
        const newStr = "DataLiberacao, UsuarioLiberacao,\r\n                   LiberacaoParaCorte, DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte,";
        content = content.substring(0, absIdx) + newStr + content.substring(absIdx + oldStr.length);
        changes++;
        console.log('✅ FIX A: Added LiberacaoParaCorte to producao SELECT');
    } else {
        console.log('⚠️  FIX A: DataLiberacao pattern not found in producao route');
    }
} else {
    console.log('⚠️  FIX A: producao-plano-corte/lista route not found');
}

// ======================================================================
// FIX B: Add liberar-producao route
// ======================================================================
if (!content.includes('liberar-producao')) {
    const itensRouteIdx = content.indexOf("app.get('/api/producao-plano-corte/itens/");
    if (itensRouteIdx === -1) {
        // Try with _handlePlanoItens registration
        const altIdx = content.indexOf("'/api/producao-plano-corte/itens/");
        if (altIdx !== -1) {
            // Find start of line
            let lineStart = content.lastIndexOf('\n', altIdx) + 1;
            insertRoute(lineStart);
        } else {
            console.log('⚠️  FIX B: Could not find insertion point');
        }
    } else {
        insertRoute(itensRouteIdx);
    }
} else {
    console.log('✅ FIX B: liberar-producao route already exists');
}

function insertRoute(insertPoint) {
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

        res.json({ success: true, message: 'Plano #' + id + ' liberado para produção com sucesso.' });
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
    console.log('✅ FIX B: Added liberar-producao route');
}

// ======================================================================
// WRITE & VERIFY
// ======================================================================
fs.writeFileSync(filePath, content, 'utf8');
console.log('\nApplied ' + changes + ' fix(es). Verifying syntax...');

const { execSync } = require('child_process');
try {
    execSync('node --check src/server.js', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    console.log('✅ Syntax OK');
} catch (e) {
    console.log('❌ Syntax ERROR:', e.stderr?.toString().substring(0, 300) || e.message);
}
