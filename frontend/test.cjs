const fs = require('fs');
const content = fs.readFileSync('src/components/OrdemServico/ExcluirItensModal.tsx', 'utf8');

let braces = 0;
let parens = 0;

for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{') braces++;
    if (c === '}') braces--;
    if (c === '(') parens++;
    if (c === ')') parens--;
}
console.log('braces', braces);
console.log('parens', parens);
