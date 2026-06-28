const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'OrdemServico.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const functionsToRemove = [
    'const handleAbrirModalExcluirItens =',
    'const toggleExcluirCheck =',
    'const toggleTodosExcluir =',
    'const handleConfirmarExclusaoItens =',
    'const getStatusIcon =',
    'const handleAbrirModalClonar =',
    'const handleNovaPendenciaOS =',
    'const loadPendenciaForEditOS =',
    'const handleSubmitPendenciaOS =',
    'const handleConfirmarInclusao =',
    'const executeClone =',
    'const fetchHistoricoRNC =',
    'const handleGerarRnc ='
];

for (const fn of functionsToRemove) {
    let index = code.indexOf(fn);
    if (index !== -1) {
        // Find the first '{' after the function declaration
        let openBraceIndex = code.indexOf('{', index);
        if (openBraceIndex !== -1) {
            let braceCount = 1;
            let closeBraceIndex = openBraceIndex + 1;
            while (braceCount > 0 && closeBraceIndex < code.length) {
                if (code[closeBraceIndex] === '{') braceCount++;
                if (code[closeBraceIndex] === '}') braceCount--;
                closeBraceIndex++;
            }
            // Remove the function
            code = code.substring(0, index) + '/* removed ' + fn + ' */' + code.substring(closeBraceIndex);
            console.log('Removed', fn);
        }
    }
}

// Write the file
fs.writeFileSync(filePath, code);
console.log('Dead functions removed');
