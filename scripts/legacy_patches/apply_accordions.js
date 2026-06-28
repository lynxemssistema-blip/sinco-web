const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');

const filesToUpdate = ['Tarefas.tsx', 'Romaneio.tsx', 'ApontamentoProducao.tsx', 'OrdemServico.tsx'];

for (const file of filesToUpdate) {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // A regex procura a caixa de pesquisa padrão
    const regex = /(<div[^>]+className=["'][^"']*bg-white[^"']*shadow-sm[^"']*mb-2[^"']*["'][^>]*>)\s*(<h3[^>]*>[\s\S]*?(?:Dados para Pesquisa|Filtros)[\s\S]*?<\/h3>)([\s\S]*?)(<div className="flex justify-end gap-2(?:[^"]*)">[\s\S]*?<\/div>\s*)(<\/div>)/i;
    
    if (regex.test(content)) {
        content = content.replace(regex, (match, divOpen, h3, innerContent, footer, divClose) => {
            // Mudar divOpen para details e adicionar open e group
            const newDetailsOpen = divOpen.replace('<div', '<details open').replace('mb-2', 'mb-2 group shrink-0');
            
            // Mudar h3 para summary
            let newSummary = h3.replace(/<h3([^>]*)>/, '<summary$1 className="cursor-pointer list-none flex justify-between items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">');
            newSummary = newSummary.replace('</h3>', ' <div className="text-gray-400 group-open:rotate-180 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div></summary>');
            // Retira a margem bottom do summary se existir (como mb-3) e o border bottom já que pusemos
            newSummary = newSummary.replace('mb-3 pb-2 border-b border-gray-100', 'm-0').replace('mb-3', '');

            // Envolvemos o conteudo num div para dar padding
            const wrappedInner = `<div className="px-4 pb-3 pt-2">\n${innerContent}\n${footer}\n</div>`;
            
            return `${newDetailsOpen}\n${newSummary}\n${wrappedInner}\n</details>`;
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Atualizado accordion em: ${file}`);
    } else {
        console.log(`Padrão não encontrado em: ${file}`);
    }
}
