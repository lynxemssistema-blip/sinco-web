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

// Remove unused state variables that might have been left over
const statesToRemove = [
    'const [showModalClonar, setShowModalClonar]',
    'const [projetosClonagem, setProjetosClonagem]',
    'const [showModalExcluirItens, setShowModalExcluirItens]',
    'const [deletandoSelecionados, setDeletandoSelecionados]',
    'const [liberacaoFatorModal, setLiberacaoFatorModal]',
    'const [pendenciaModalOpen, setPendenciaModalOpen]',
    'const [selectedItemRnc, setSelectedItemRnc]',
    'const [idRncEdicao, setIdRncEdicao]',
    'const [projetosClonagem',
    'const [expandedOrdens',
    'const [itensOSExcluir',
    'const [itensCheckExcluir',
    'const [itens',
    'const [novaRnc',
    'const [showToast',
    'const [toastMessage',
    'const [showConfirmModal',
    'const [selectedPendenciaToDelete',
    'const [uploading',
    'const [uploadProgress',
    'const [uploadingItemIndex'
];

for (const st of statesToRemove) {
    const regex = new RegExp(`^.*${st.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')}.*$\\n`, 'gm');
    code = code.replace(regex, '');
}

fs.writeFileSync(filePath, code);
console.log('Dead functions removed');
