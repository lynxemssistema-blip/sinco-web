const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Check if _handlePlanoItens already exists via a more reliable check
const hasHandler = content.includes('function _handlePlanoItens');
console.log('Has _handlePlanoItens:', hasHandler);

if (hasHandler) {
    console.log('Handler already exists. Exiting.');
    process.exit(0);
}

// Find the anchor: the itens-disponiveis route
const anchor = "app.get('/api/plano-corte/itens-disponiveis'";
const anchorIdx = content.indexOf(anchor);
if (anchorIdx === -1) {
    console.log('ERROR: Cannot find itens-disponiveis route');
    process.exit(1);
}

// Find the start of the comment block before it
// Go back to find "// ============" before itens-disponiveis
let searchBack = content.lastIndexOf('// ============', anchorIdx);
if (searchBack === -1 || anchorIdx - searchBack > 200) {
    // Just insert right before the app.get line
    searchBack = anchorIdx;
}

console.log('Inserting _handlePlanoItens at position', searchBack);

const itensBlock = `// ============================================================================
// PLANO DE CORTE - Itens de um plano especifico
// /api/plano-corte/itens/:idPlano  e  /api/producao-plano-corte/itens/:idPlano
// ============================================================================
async function _handlePlanoItens(req, res) {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { idPlano } = req.params;
        const { exibirTodos, Projeto, Tag, DescResumo, CodMatFabricante } = req.query;
        const mostrarTodos = exibirTodos === 'true';

        const filtros = [];
        const params = [];

        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");
        filtros.push('idplanodecorte = ?');
        params.push(idPlano);

        if (!mostrarTodos) {
            filtros.push("(txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))");
            filtros.push("(ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')");
        }

        if (Projeto)          { filtros.push('Projeto LIKE ?');          params.push(\`%\${Projeto}%\`); }
        if (Tag)              { filtros.push('Tag LIKE ?');              params.push(\`%\${Tag}%\`); }
        if (DescResumo)       { filtros.push('DescResumo LIKE ?');       params.push(\`%\${DescResumo}%\`); }
        if (CodMatFabricante) { filtros.push('CodMatFabricante LIKE ?'); params.push(\`%\${CodMatFabricante}%\`); }

        const [rows] = await connection.execute(\`
            SELECT
                CodMatFabricante, idplanodecorte AS IdPlanodecorte,
                IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,
                IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,
                QtdeTotal, txtCorte,
                COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,
                COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,
                CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '\\\\\\\\', QtdeTotal) AS Parcial,
                OrdemServicoItemFinalizado, DescResumo, DescDetal,
                UPPER(REPLACE(EnderecoArquivo, '##', '\\\\\\\\\\\\\\\\')) AS EnderecoArquivo,
                UPPER(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\\\\\\\\\\\\\')) AS EnderecoArquivoItemOrdemServico,
                qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,
                RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia
            FROM ordemservicoitem
            WHERE \${filtros.join(' AND ')}
            ORDER BY IdOrdemServicoItem ASC
        \`, params);

        res.json({ success: true, data: rows, total: rows.length, exibirTodos: mostrarTodos });
    } catch (err) {
        console.error('[PlanoCorte/Itens] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
}

app.get('/api/plano-corte/itens/:idPlano', _handlePlanoItens);
app.get('/api/producao-plano-corte/itens/:idPlano', _handlePlanoItens);

`;

content = content.substring(0, searchBack) + itensBlock + content.substring(searchBack);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: _handlePlanoItens inserted');
console.log('New file size:', content.length);
