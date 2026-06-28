const fs = require('fs');
const file = 'src/pages/OrdemServico.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const itens = ordensItens\[os.IdOrdemServico\] \|\| \[\];/g, '');

fs.writeFileSync(file, code);
console.log('OrdemServico minor lint fixes applied part 4');
