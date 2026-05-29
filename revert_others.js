const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
const filesToUpdate = ['Tarefas.tsx', 'Romaneio.tsx', 'ApontamentoProducao.tsx', 'OrdemServico.tsx', 'RomaneioRetorno.tsx', 'VisaoGeralPendencias.tsx', 'TesteFinalMontagem.tsx', 'PesquisarDesenho.tsx', 'Material.tsx', 'ListaReposicao.tsx', 'AcompanhamentoGeral.tsx'];

for (const file of filesToUpdate) {
    const filePath = path.join(pagesDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Se já tiver showFilters, ignora
    if (content.includes('const [showFilters, setShowFilters] = useState(')) {
        continue;
    }

    // Injetar showFilters state no componente
    content = content.replace(/const \[([^\]]+)\] = useState(?:<[^>]+>)?\([^)]*\);/, match => match + '\n    const [showFilters, setShowFilters] = useState(true);');

    // Importar Filter de lucide-react
    if (!content.includes('Filter') && content.includes('lucide-react')) {
        content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, group) => {
            if (!group.includes('Filter')) {
                return `import {${group}, Filter} from 'lucide-react';`;
            }
            return match;
        });
    }

    // Identificar blocos "Dados para Pesquisa" padrão (com ou sem h3)
    const regex = /(<div[^>]+className=["'][^"']*bg-white[^"']*shadow-sm[^"']*mb-2[^"']*["'][^>]*>)\s*(<h3[^>]*>[\s\S]*?(?:Dados para Pesquisa|Filtros)[\s\S]*?<\/h3>)([\s\S]*?)(<div className="flex justify-end gap-2(?:[^"]*)">[\s\S]*?<\/div>\s*)(<\/div>)/i;
    
    if (regex.test(content)) {
        content = content.replace(regex, (match, divOpen, h3, innerContent, footer, divClose) => {
            return `${divOpen}
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 px-4 pt-3">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2 m-0">
                        <Search size={12} /> Dados para Pesquisa
                    </h3>
                    <button 
                        type="button" 
                        onClick={() => setShowFilters(!showFilters)} 
                        className="text-[10px] flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-2 py-1 rounded transition-colors border border-gray-200 uppercase font-bold"
                    >
                        <Filter size={11} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </button>
                </div>
                {showFilters && (
                    <div className="px-4 pb-3">
                        ${innerContent}
                        ${footer}
                    </div>
                )}
            ${divClose}`;
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Atualizado: ${file}`);
    } else {
        // Se a tela tem uma barra de pesquisa estilo "PessoaJuridica.tsx"
        // (Buscar por...)
        const searchRegex = /(<div className="relative max-w-md flex items-center gap-2">[\s\S]*?<Search className="absolute left-3 top-1\/2 -translate-y-1\/2 text-gray-400" size=\{18\} \/>[\s\S]*?<\/div>\s*\{searchTerm && \([\s\S]*?<\/button>\s*\)\}\s*<\/div>)/i;
        
        if (searchRegex.test(content)) {
            content = content.replace(searchRegex, (match) => {
                return `<div className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded-xl shadow-sm mb-4">
                {showFilters ? (
                    ${match.replace('relative max-w-md', 'relative max-w-md flex-1').replace('mb-4', '')}
                ) : (
                   <span className="text-[10px] uppercase font-bold text-gray-400 ml-2">Filtros Ocultos</span>
                )}
                
                <button 
                    onClick={() => {
                        setShowFilters(!showFilters);
                    }} 
                    className="text-[10px] ml-auto flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-3 py-2 rounded transition-colors border border-gray-200 uppercase font-bold"
                >
                    <Filter size={14} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </button>
            </div>`;
            });
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Atualizado Search Bar: ${file}`);
        } else {
            console.log(`Ignorado: ${file} - Padrao não reconhecido.`);
        }
    }
}
