const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

if (!code.includes("import { useToast } from")) {
    code = code.replace(
        "import { SetorDatas } from '../components/ordem-servico/SetorDatas';",
        "import { SetorDatas } from '../components/ordem-servico/SetorDatas';\nimport { useToast } from '../contexts/ToastContext';"
    );
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Final fix done.');
