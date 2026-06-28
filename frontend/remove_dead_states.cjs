const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'OrdemServico.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const statesToRemove = [
    'showModalClonar',
    'projetosClonagem',
    'showModalExcluirItens',
    'deletandoSelecionados',
    'liberacaoFatorModal',
    'pendenciaModalOpen',
    'selectedItemRnc',
    'idRncEdicao',
    'expandedOrdens',
    'itensOSExcluir',
    'itensCheckExcluir',
    'itens',
    'novaRnc',
    'showToast',
    'toastMessage',
    'showConfirmModal',
    'selectedPendenciaToDelete',
    'uploading',
    'uploadProgress',
    'uploadingItemIndex',
    'espessurasRncConfig',
    'materiaisSWRncConfig'
];

let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
    for (const st of statesToRemove) {
        if (lines[i].includes(`const [${st}`) || lines[i].includes(`const ${st} =`)) {
            // Make sure we only comment out lines containing useState or similar declarations
            if (lines[i].includes('useState') || lines[i].includes('ordensItens[')) {
                lines[i] = '// ' + lines[i];
            }
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Dead states removed');
