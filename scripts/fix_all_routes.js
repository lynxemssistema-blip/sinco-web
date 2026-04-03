const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('=== Fix Script: Restoring plano-corte routes ===');
console.log('File size:', content.length, 'bytes');

// =====================================================================
// FIX 1: Restore the missing app.get('/api/plano-corte/lista',...) header
// =====================================================================
// The comment block exists but the function declaration was deleted.
// We need to find the comment and insert the route declaration after it.
const montagemComment = "// GET /api/plano-corte/lista\n// ============================================================================\n";
const montagemCommentCRLF = "// GET /api/plano-corte/lista\r\n// ============================================================================\r\n";

let insertPoint = content.indexOf(montagemComment);
let commentLen = montagemComment.length;
if (insertPoint === -1) {
    insertPoint = content.indexOf(montagemCommentCRLF);
    commentLen = montagemCommentCRLF.length;
}

if (insertPoint === -1) {
    console.log('ERROR: Could not find montagem comment block');
    process.exit(1);
}

// Check what comes after the comment block
const afterComment = content.substring(insertPoint + commentLen, insertPoint + commentLen + 80);
console.log('After montagem comment:', JSON.stringify(afterComment.substring(0, 60)));

// Verify the app.get declaration is missing
if (!afterComment.includes("app.get('/api/plano-corte/lista'")) {
    console.log('FIX 1: Inserting missing app.get header for montagem route...');
    const routeHeader = `app.get('/api/plano-corte/lista', async (req, res) => {\r\n    let connection = null;\r\n    try {\r\n        const tenantPool = req.tenantDbPool || pool;\r\n        connection = await tenantPool.getConnection();\r\n\r\n        const { Espessura, MaterialSW, exibirConcluidos, IdPlanodecorte, descplanodecorte } = req.query;\r\n        const mostrarTodos = exibirConcluidos === 'true';\r\n\r\n`;
    content = content.substring(0, insertPoint + commentLen) + routeHeader + content.substring(insertPoint + commentLen);
    console.log('FIX 1: Done');
} else {
    console.log('FIX 1: app.get header already present, skipping');
}

// =====================================================================
// FIX 2: Insert the itens handler before itens-disponiveis
// =====================================================================
const itensDisponiveisAnchor = "app.get('/api/plano-corte/itens-disponiveis'";
const itensRouteCheck = "_handlePlanoItens";

if (content.indexOf(itensRouteCheck) !== -1) {
    console.log('FIX 2: _handlePlanoItens already exists, skipping');
} else {
    const dispIdx = content.indexOf(itensDisponiveisAnchor);
    if (dispIdx === -1) {
        console.log('ERROR: Could not find itens-disponiveis anchor');
        process.exit(1);
    }

    console.log('FIX 2: Inserting _handlePlanoItens before itens-disponiveis...');

    const itensHandler = `// ============================================================================\r
// PLANO DE CORTE - Itens de um plano especifico\r
// Rotas: /api/plano-corte/itens/:idPlano  e  /api/producao-plano-corte/itens/:idPlano\r
// ============================================================================\r
async function _handlePlanoItens(req, res) {\r
    let connection = null;\r
    try {\r
        const tenantPool = req.tenantDbPool || pool;\r
        connection = await tenantPool.getConnection();\r
        const { idPlano } = req.params;\r
        const { exibirTodos, Projeto, Tag, DescResumo, CodMatFabricante } = req.query;\r
        const mostrarTodos = exibirTodos === 'true';\r
\r
        const filtros = [];\r
        const params = [];\r
\r
        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");\r
        filtros.push('idplanodecorte = ?');\r
        params.push(idPlano);\r
\r
        if (!mostrarTodos) {\r
            filtros.push("(txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))");\r
            filtros.push("(ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')");\r
        }\r
\r
        if (Projeto)          { filtros.push('Projeto LIKE ?');          params.push(\`%\${Projeto}%\`); }\r
        if (Tag)              { filtros.push('Tag LIKE ?');              params.push(\`%\${Tag}%\`); }\r
        if (DescResumo)       { filtros.push('DescResumo LIKE ?');       params.push(\`%\${DescResumo}%\`); }\r
        if (CodMatFabricante) { filtros.push('CodMatFabricante LIKE ?'); params.push(\`%\${CodMatFabricante}%\`); }\r
\r
        const [rows] = await connection.execute(\`\r
            SELECT\r
                CodMatFabricante, idplanodecorte AS IdPlanodecorte,\r
                IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,\r
                IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,\r
                QtdeTotal, txtCorte,\r
                COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,\r
                COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,\r
                CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '\\\\\\\\', QtdeTotal) AS Parcial,\r
                OrdemServicoItemFinalizado, DescResumo, DescDetal,\r
                UPPER(REPLACE(EnderecoArquivo, '##', '\\\\\\\\\\\\\\\\')) AS EnderecoArquivo,\r
                UPPER(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\\\\\\\\\\\\\')) AS EnderecoArquivoItemOrdemServico,\r
                qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,\r
                RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia\r
            FROM ordemservicoitem\r
            WHERE \${filtros.join(' AND ')}\r
            ORDER BY IdOrdemServicoItem ASC\r
        \`, params);\r
\r
        res.json({ success: true, data: rows, total: rows.length, exibirTodos: mostrarTodos });\r
    } catch (err) {\r
        console.error('[PlanoCorte/Itens] Erro:', err.message);\r
        res.status(500).json({ success: false, message: 'Erro: ' + err.message });\r
    } finally {\r
        if (connection) connection.release();\r
    }\r
}\r
\r
app.get('/api/plano-corte/itens/:idPlano', _handlePlanoItens);\r
app.get('/api/producao-plano-corte/itens/:idPlano', _handlePlanoItens);\r
\r
`;

    content = content.substring(0, dispIdx) + itensHandler + content.substring(dispIdx);
    console.log('FIX 2: Done');
}

// Write file
fs.writeFileSync(filePath, content, 'utf8');
console.log('File written successfully.');
console.log('New size:', content.length, 'bytes');
console.log('Lines:', content.split('\n').length);
