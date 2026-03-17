const fs = require('fs');
const path = require('path');

const pagesDir = 'c:\\SincoWeb\\SINCO-WEB\\SINCO-WEB\\frontend\\src\\pages';

const filesToUpdate = [
    'Usuario.tsx',
    'UnidadeMedida.tsx',
    'TipoProduto.tsx',
    'Projeto.tsx',
    'PessoaJuridica.tsx',
    'OrdemServico.tsx',
    'Material.tsx',
    'Familia.tsx',
    'ConfiguracaoSistema.tsx',
    'Acabamento.tsx'
];

filesToUpdate.forEach(file => {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // To handle variations in formatting, let's use a bit more relaxed regex or simple substring search
    const searchDivs = content.match(/<div className="relative max-w-md">[\s\S]*?<\/div>/g) || [];
    
    let updated = false;
    for (const match of searchDivs) {
        if (match.includes('<Search') && match.includes('<input')) {
            const valMatch = match.match(/value=\{([^}]+)\}/);
            const onChangeMatch = match.match(/onChange=\{\([^)]*\)\s*=>\s*([^ (]+)\(/);
            
            if (valMatch && onChangeMatch) {
                const stateVar = valMatch[1];
                const setterFunc = onChangeMatch[1];
                
                const innerMatch = match.replace('<div className="relative max-w-md">', '').replace(/<\/div>\s*$/, '').trim();
                
                const newBlock = `<div className="relative max-w-md flex items-center gap-2">
                <div className="relative flex-1">
                    ${innerMatch}
                </div>
                {${stateVar} && (
                    <button onClick={() => ${setterFunc}('')} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Limpar pesquisa">
                        <X size={18} />
                    </button>
                )}
            </div>`;
                
                content = content.replace(match, newBlock);
                updated = true;
                console.log(`Updated ${file}`);
            }
        }
    }

    if (updated) {
        // Ensure X icon is imported
        if (!content.includes(' X ') && !content.includes(', X') && !content.includes('X,')) {
            content = content.replace(/import {([^}]+)} from 'lucide-react';/, (m, p1) => {
                if (!p1.includes('X')) {
                    return `import {${p1}, X} from 'lucide-react';`;
                }
                return m;
            });
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Saved ${file}`);
    } else {
        console.log(`Pattern not matched in ${file}`);
    }
});
