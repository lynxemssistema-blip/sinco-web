const fs = require('fs');
const file = './frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const realEnd = bar\.realEnd \|\| \(hasReal \? today : null\);/g,
    'const realEnd = bar.realEnd || (hasReal ? bar.realStart : null);'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed realEnd');
