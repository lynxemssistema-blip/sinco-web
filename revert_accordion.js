const fs = require('fs');
const path = require('path');

function updatePage(filename) {
    const filePath = path.join(__dirname, 'frontend', 'src', 'pages', filename);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Injetar state se não houver
    if (!content.includes('const [showFilters, setShowFilters] = useState(')) {
        content = content.replace(/const \[(?:activeTab|loading)[^\]]*\] = useState[^;]+;/, match => match + '\n    const [showFilters, setShowFilters] = useState(true);');
    }

    // 2. Injetar import de Filter se não houver
    if (!content.includes('Filter') && content.includes('lucide-react')) {
        content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, group) => {
            if (!group.includes('Filter')) {
                return `import {${group}, Filter} from 'lucide-react';`;
            }
            return match;
        });
    }

    // 3. Reverter details para div normal com toggle no React (como AcompanhamentoEtapas)
    if (content.includes('<details className="bg-white')) {
        content = content.replace(/<details className="bg-white([^>]*) group shrink-0" open>/g, '<div className="bg-white$1 shrink-0">');
        content = content.replace(/<summary className="([^"]*) flex justify-between items-center([^"]*)">([\s\S]*?)<\/summary>/g, (m, c1, c2, inner) => {
            // Inner tem um <h3> e uma div chevron. Vamos refazer
            return `<div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
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
                <div className="px-1">`;
        });
        
        // Agora fechar
        content = content.replace(/<\/details>/g, '</div></div>');
    }

    // VisaoGeralEngenharia tem estrutura levemente diferente:
    if (content.includes('<details className="border-b')) {
        content = content.replace(/<details className="border-b([^>]*) group" open>/g, '<div className="border-b$1">');
        content = content.replace(/<summary className="flex items-center justify-between([^"]*)">([\s\S]*?)<\/summary>/g, (m, c1, inner) => {
            // Mantém os botões, só remove as props do summary e adiciona o button do toggle filters
            return `<div className="flex items-center justify-between px-3 py-2 bg-white">
                    <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        Visão Engenharia
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowFilters(!showFilters)} className="text-xs flex items-center gap-1 text-gray-600 hover:text-[#03624C] transition-colors border px-2 py-1 rounded bg-gray-50 uppercase font-bold">
                            <Filter size={14} /> {showFilters ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button type="button" onClick={() => { setFProjeto(''); setFEmpresa(''); setFTag(''); setFDescTag(''); setFProjetista(''); setFTipo(''); setFPrevIni(''); setFPrevFim(''); }} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition-colors font-bold"><X size={11} /> Limpar Filtros</button>
                    </div>
                </div>
                {showFilters && (
                <div>`;
        });
        content = content.replace(/<\/details>/g, '</div></div>');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processado ${filename}`);
}

updatePage('Projeto.tsx');
updatePage('VisaoGeralEngenharia.tsx');
updatePage('VisaoGeralProducao.tsx');
