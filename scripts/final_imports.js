const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

// Insert useToast unconditionally and ArrowLeft
const lines = code.split(/\r?\n/);
let lucideIndex = -1;
let setorIndex = -1;

for (let i=0; i<lines.length; i++) {
    if (lines[i].includes("} from 'lucide-react';")) lucideIndex = i;
    if (lines[i].includes("import { SetorDatas }")) setorIndex = i;
}

if (lucideIndex > 0) {
    if (!lines[lucideIndex - 1].includes('ArrowLeft')) {
        lines[lucideIndex - 1] = lines[lucideIndex - 1] + ', ArrowLeft';
    }
}

if (setorIndex > 0) {
    const hasToast = lines.some(l => l.includes('useToast'));
    if (!hasToast) {
        lines.splice(setorIndex + 1, 0, "import { useToast } from '../contexts/ToastContext';");
    }
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', lines.join('\n'));
console.log('Imports finalizados com sucesso.');
