const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find _handlePlanoItens and replace the whole SELECT statement
const handleIdx = content.indexOf('function _handlePlanoItens');
if (handleIdx === -1) { console.log('NOT FOUND'); process.exit(1); }

const routeRegIdx = content.indexOf("app.get('/api/plano-corte/itens/", handleIdx);
const handleBlock = content.substring(handleIdx, routeRegIdx);

// Find the SELECT part
const selectStart = handleBlock.indexOf("const [rows] = await connection.execute(`");
const selectEnd = handleBlock.indexOf("`, params);", selectStart);

if (selectStart === -1 || selectEnd === -1) {
    console.log('Could not find SELECT boundaries');
    console.log('selectStart:', selectStart, 'selectEnd:', selectEnd);
    // Try alternate
    const alt = handleBlock.indexOf("const [rows] = await connection.execute(");
    console.log('Alt search:', alt);
    if (alt !== -1) {
        console.log('Context:', handleBlock.substring(alt, alt + 50));
    }
    process.exit(1);
}

// New SELECT block - with CORRECT escaping
// In JS template literal: \\\\ produces \\ which MySQL treats as one literal backslash
// For UNC paths (\\server\share) we need \\, which means \\\\\\\\ in template literal produces \\\\
// But MySQL REPLACE needs: REPLACE(col, '##', '\\\\') to produce \\
// In template literal: '\\\\\\\\' -> produces string '\\\\' -> MySQL sees \\\\ -> treats as \\
//
// WAIT - the test script (test_itens_query.js) used '\\\\\\\\' and it WORKED!
// Let me check what that test actually used...
// The test had: REPLACE(EnderecoArquivo, '##', '\\\\\\\\') 
// Which is '\\\\' in the JS string -> '\\' in SQL -> works!
//
// The handler source code has 4 raw backslash chars: \\\\ 
// which is the SAME as the test... so why does it fail?
//
// AH WAIT - the issue might be the \r characters or encoding differences!
// The handler was inserted via the fix_add_itens_handler.js script which used \r line endings
// Perhaps those \r characters are causing the SQL parser to choke

// Let me just rebuild the entire SELECT with clean encoding
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
console.log('Old SELECT length:', oldSelect.length);
console.log('New SELECT length:', newSelect.length);

// Replace in full content
const fullOldStart = handleIdx + selectStart;
const fullOldEnd = handleIdx + selectStart + oldSelect.length;

content = content.substring(0, fullOldStart) + newSelect + content.substring(fullOldEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: SELECT block replaced with clean version');
console.log('Changes: Removed UPPER/REPLACE on EnderecoArquivo (frontend can handle ##->\\\\)');
console.log('Changes: Parcial now uses / separator instead of \\\\');
