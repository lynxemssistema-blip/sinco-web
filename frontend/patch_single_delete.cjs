const fs = require('fs');

const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/OrdemServico.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `addToast({ type: 'success', title: 'Sucesso', message: 'Item excluído com sucesso!' });`;
const replaceStr = targetStr + '\n                    refreshOS(osId);';

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Patched single item delete');
