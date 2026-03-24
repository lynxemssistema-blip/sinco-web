const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

code = code.replace(
    "import { useApplication } from '../../context/ApplicationContext';",
    "import { useToast } from '../contexts/ToastContext';"
);

code = code.replace(
    "const { addToast } = useApplication();",
    "const { addToast } = useToast();"
);

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Hooks de contexto corrigidos!');
