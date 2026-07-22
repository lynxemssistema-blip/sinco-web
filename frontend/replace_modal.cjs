const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/OrdemServico.tsx';
let content = fs.readFileSync(file, 'utf8');

const modalStartTag = '{showModalIncluirItens && (';
const startIdx = content.indexOf(modalStartTag);
if (startIdx !== -1) {
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIdx = i;
                break;
            }
        }
    }
    
    if (endIdx !== -1) {
        const replacement = `{showModalIncluirItens && (
    <ModalIncluirMaterialOS
        isOpen={!!showModalIncluirItens}
        onClose={() => setShowModalIncluirItens(null)}
        osId={showModalIncluirItens.IdOrdemServico}
        osContext={showModalIncluirItens}
        onSuccess={() => {
            setShowModalIncluirItens(null);
            // Will fetch itens in OrdemServico when closed by user
        }}
        token={token}
    />
)}`;
        content = content.substring(0, startIdx) + replacement + content.substring(endIdx + 1);
        fs.writeFileSync(file, content);
        console.log('Successfully replaced inline modal!');
    } else {
        console.log('Failed to find end of modal chunk');
    }
} else {
    console.log('Could not find modal start tag');
}
