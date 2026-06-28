const fs = require('fs');
const file = 'src/pages/OrdemServico.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/catch \(_err: unknown\)/g, 'catch');
code = code.replace(/catch \(_e: unknown\)/g, 'catch');
code = code.replace(/catch \(_err\)/g, 'catch');
code = code.replace(/catch \(_e\)/g, 'catch');

code = code.replace(/import { createPortal } from 'react-dom';/, '');
code = code.replace(/Eye,/, '');
code = code.replace(/Clock,/, '');
code = code.replace(/AlertTriangle,/, '');
code = code.replace(/const \[, setItens\] = useState/g, '// const [, setItens] = useState');
code = code.replace(/const \[itens, setItens\] = useState/g, '// const [itens, setItens] = useState');

fs.writeFileSync(file, code);
console.log('OrdemServico minor lint fixes applied part 2');
