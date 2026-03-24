const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

if (!code.includes('useApplication')) {
    code = code.replace(
        "import { SetorDatas } from '../components/ordem-servico/SetorDatas';",
        "import { SetorDatas } from '../components/ordem-servico/SetorDatas';\nimport { useApplication } from '../../context/ApplicationContext';"
    );
}

if (!code.includes('ArrowLeft')) {
    code = code.replace(
        "Filter, Layers, X",
        "Filter, Layers, X, ArrowLeft"
    );
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Imports ajustados com sucesso.');
