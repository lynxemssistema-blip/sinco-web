const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// =====================================================================
// FIX 1: Liberar Plano - update correct fields
// Current (WRONG):
//   SET Enviadocorte = 'S', LiberacaoParaCorte = 'S',
//       DataLiberacaoParaCorte = ?, UsuarioLiberacaoParaCorte = ?
//
// Correct (per user request):
//   SET Enviadocorte = 'S',
//       DataLiberacao = ?, UsuarioLiberacao = ?
//   (DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte not touched)
// =====================================================================
const oldLiberar = `SET Enviadocorte = 'S', \r\n                 LiberacaoParaCorte = 'S',\r\n                 DataLiberacaoParaCorte = ?, \r\n                 UsuarioLiberacaoParaCorte = ?`;

const newLiberar = `SET Enviadocorte = 'S', \r\n                 DataLiberacao = ?, \r\n                 UsuarioLiberacao = ?`;

if (content.includes(oldLiberar)) {
    content = content.replace(oldLiberar, newLiberar);
    changes++;
    console.log('FIX 1: Liberar - updated SET fields (DataLiberacao, UsuarioLiberacao)');
} else {
    console.log('FIX 1: Old liberar SET not found, checking variant...');
    // Try without \r
    const oldV2 = `SET Enviadocorte = 'S', \n                 LiberacaoParaCorte = 'S',\n                 DataLiberacaoParaCorte = ?, \n                 UsuarioLiberacaoParaCorte = ?`;
    if (content.includes(oldV2)) {
        content = content.replace(oldV2, `SET Enviadocorte = 'S', \n                 DataLiberacao = ?, \n                 UsuarioLiberacao = ?`);
        changes++;
        console.log('FIX 1: Liberar - updated SET fields (variant 2)');
    } else {
        console.log('FIX 1: SKIP - cannot find liberar SET block. Manual check needed.');
        // Let's find it via regex
        const match = content.match(/SET Enviadocorte = 'S'[\s\S]{0,200}?UsuarioLiberacaoParaCorte/);
        if (match) {
            console.log('  Found at:', JSON.stringify(match[0].substring(0, 120)));
        }
    }
}

// =====================================================================
// FIX 2: Cancelar Liberação - move fields properly
// Current:
//   SET Enviadocorte='', LiberacaoParaCorte='', 
//       DataLiberacaoParaCorte=NULL, UsuarioLiberacaoParaCorte='',
//       DataLiberacao=NULL, UsuarioLiberacao=''
//
// Correct (per user):
//   SET Enviadocorte = '',
//       DataLiberacao = NULL,
//       UsuarioLiberacao = ''
//   (move DataLiberacaoParaCorte → not touched during cancel)
// Actually user wants:
//   On CANCEL: clear Enviadocorte, clear DataLiberacao, clear UsuarioLiberacao
//   Move DataLiberacaoParaCorte values aren't relevant during cancel - just clear everything
// =====================================================================
// Actually the cancel route seems fine already - it clears all fields. Let me verify it's correct.
const cancelCheck = content.indexOf("cancelar-liberacao");
if (cancelCheck !== -1) {
    console.log('FIX 2: Cancelar liberacao route EXISTS, checking UPDATE...');
    const cancelBlock = content.substring(cancelCheck, cancelCheck + 500);
    if (cancelBlock.includes("Enviadocorte") && cancelBlock.includes("DataLiberacao")) {
        console.log('FIX 2: Cancel route appears correct (clears all fields)');
    }
} else {
    console.log('FIX 2: WARN - cancelar-liberacao route not found');
}

// =====================================================================
// FIX 3: Item query - ensure idplanodecorte comparison works for string values
// The _handlePlanoItens uses params.push(idPlano) - idPlano comes from URL as string
// The DB field is VARCHAR. Using '= ?' with string param should work fine.
// But let's verify the table name is correct (ordemservicoitem not viewordemservicoitem)
// =====================================================================
const handleIdx = content.indexOf('function _handlePlanoItens');
if (handleIdx !== -1) {
    const handleBlock = content.substring(handleIdx, handleIdx + 3000);
    if (handleBlock.includes('FROM ordemservicoitem')) {
        console.log('FIX 3: Handler queries ordemservicoitem - correct');
    } else if (handleBlock.includes('FROM viewordemservicoitem')) {
        console.log('FIX 3: Handler queries viewordemservicoitem - may need columns check');
    }
    
    // Check the column used for select
    if (handleBlock.includes("idplanodecorte = ?")) {
        console.log('FIX 3: Filter uses idplanodecorte = ? - correct');
    }
} else {
    console.log('FIX 3: WARN - _handlePlanoItens not found');
}

// Write changes
if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`\nWrote ${changes} fix(es) to server.js`);
} else {
    console.log('\nNo changes written - manual review needed');
}

console.log('\nDone.');
