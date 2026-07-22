const fs = require('fs');
const content = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/OrdemServico.tsx', 'utf8');
const lines = content.split('\n');

const prevLine = lines.findIndex(l => l.includes('Prev:'));
if (prevLine !== -1) {
    console.log('\n--- PREV RENDERING ---');
    console.log(lines.slice(prevLine - 25, prevLine + 25).join('\n'));
}

const renderStart = lines.findIndex(l => l.includes('OS / Tag / Projeto'));
if (renderStart !== -1) {
    console.log('\n--- HEADERS ---');
    console.log(lines.slice(renderStart - 10, renderStart + 25).join('\n'));
}
