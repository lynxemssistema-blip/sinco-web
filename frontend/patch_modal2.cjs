const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/components/ModalIncluirMaterialOS.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Grid 1 - Quantidade como número inteiro
content = content.replace(
    /type="number" min="0\.01" step="0\.01"/g,
    'type="number" min="1" step="1"'
);

content = content.replace(
    /parseFloat\(e\.target\.value\) \|\| 0/g,
    'parseInt(e.target.value) || 1'
);

// 2. Grid 2 - Excluir exibição de Qtde e Acabamento
// The code to replace:
/*
                        <div className="text-[10px] text-[#32423D] font-medium mt-0.5">
                          Qtde: {item.qtde} {item.acabamento ? `| Acabamento: ${item.acabamento}` : ''}
                        </div>
*/
const blockToRem = `                        <div className="text-[10px] text-[#32423D] font-medium mt-0.5">
                          Qtde: {item.qtde} {item.acabamento ? \\\`| Acabamento: \${item.acabamento}\\\` : ''}
                        </div>`;

content = content.replace(
    /<div className="text-\[10px\] text-\[\#32423D\] font-medium mt-0\.5">\s*Qtde: \{item\.qtde\} \{item\.acabamento \? `\| Acabamento: \$\{item\.acabamento\}` : ''\}\s*<\/div>/g,
    ''
);

fs.writeFileSync(file, content);
console.log('Successfully patched Qtde integer and removed Qtde/Acabamento from Grid 2');
