const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modifiedCount = 0;

walkDir('frontend/src', (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let original = fs.readFileSync(filePath, 'utf8');
    let content = original;
    
    // 1. Modais: Remover glassmorphism
    content = content.replace(/bg-black\/50\s+backdrop-blur-sm/g, 'bg-slate-900/60');
    content = content.replace(/bg-black\/50\s+backdrop-blur-md/g, 'bg-slate-900/60');
    content = content.replace(/backdrop-blur-sm/g, ''); // Remover resquícios
    content = content.replace(/backdrop-blur-md/g, ''); 
    content = content.replace(/backdrop-filter/g, ''); 
    
    // 2. Bordas: Remover rounded excessivo (mantendo arredondado industrial md/lg)
    content = content.replace(/rounded-3xl/g, 'rounded-md');
    content = content.replace(/rounded-2xl/g, 'rounded-md');
    content = content.replace(/rounded-xl/g, 'rounded-md');
    
    // 3. Densidade de Dados: Reduzir padding em tabelas (py-3/py-4 para py-1.5 ou py-2)
    // Usaremos uma regex um pouco mais focada em classes de th/td ou tabelas
    content = content.replace(/px-4 py-4/g, 'px-3 py-2');
    content = content.replace(/px-6 py-4/g, 'px-4 py-2');
    content = content.replace(/px-4 py-3/g, 'px-3 py-1.5');
    content = content.replace(/px-6 py-3/g, 'px-4 py-1.5');
    
    // Limpar espaços duplos
    content = content.replace(/  +/g, ' ');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Atualizado:', filePath);
        modifiedCount++;
    }
});

console.log('Arquivos modificados:', modifiedCount);
