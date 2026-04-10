const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Marcadores da rota duplicada a ser removida
const startMarker = '// Configura\u00e7\u00e3o - UPDATE\r\napp.put(\'/api/config\'';
const endMarker = '// MENU CONFIGURATION';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1) {
    // Tenta com encoding diferente (arquivo pode ter caracteres quebrados)
    const fallbackStart = 'app.put(\'/api/config\', async (req, res) => {\r\n    const { restringirApontamento, processosVisiveis } = req.body;';
    const fallbackIdx = content.indexOf(fallbackStart);
    
    if (fallbackIdx === -1) {
        console.log('AVISO: Rota duplicada nao encontrada pelo texto exato. Tentando por numero de linha...');
        
        // Remove linhas 6994-7012 (0-indexed: 6993-7011)
        const lines = content.split('\n');
        console.log('Total linhas:', lines.length);
        
        // Encontrar a segunda ocorrencia de app.put('/api/config'
        let count = 0;
        let startLine = -1;
        let endLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("app.put('/api/config'")) {
                count++;
                if (count === 2) {
                    startLine = i - 1; // Include comment line before
                    console.log('Segunda ocorrencia encontrada na linha', i + 1);
                }
            }
            if (startLine !== -1 && endLine === -1 && lines[i].includes('// MENU CONFIGURATION')) {
                endLine = i;
                console.log('Fim encontrado na linha', i + 1);
                break;
            }
        }
        
        if (startLine !== -1 && endLine !== -1) {
            console.log('Removendo linhas', startLine + 1, 'ate', endLine);
            lines.splice(startLine, endLine - startLine);
            fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
            console.log('OK! Rota duplicada removida.');
        } else {
            console.log('Nao foi possivel encontrar os limites. startLine:', startLine, 'endLine:', endLine);
        }
        return;
    }
    
    console.log('Encontrado pelo fallback na posicao', fallbackIdx);
    const endIdx2 = content.indexOf(endMarker, fallbackIdx);
    if (endIdx2 === -1) {
        console.log('Fim nao encontrado');
        process.exit(1);
    }
    const removed = content.slice(fallbackIdx, endIdx2);
    console.log('Removendo bloco:', removed.substring(0, 150));
    content = content.slice(0, fallbackIdx) + content.slice(endIdx2);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('OK!');
    return;
}

console.log('Encontrado pelo marcador principal em posicao', startIdx);
const removed = content.slice(startIdx, endIdx);
console.log('Removendo:\n', removed.substring(0, 200));

content = content.slice(0, startIdx) + content.slice(endIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('OK! Rota duplicada removida com sucesso.');
