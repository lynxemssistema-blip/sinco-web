const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

if (!code.includes('ArrowLeft')) {
    code = code.replace(/Filter, Layers, X/, 'Filter, Layers, X, ArrowLeft');
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('ArrowLeft done.');
