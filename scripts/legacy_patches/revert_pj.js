const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'PessoaJuridica.tsx');
if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Injetar state se não houver
    if (!content.includes('const [showFilters, setShowFilters] = useState(')) {
        content = content.replace(/const \[empresas, setEmpresas\] = useState<PessoaJuridica\[\]>\(\[\]\);/, match => match + '\n    const [showFilters, setShowFilters] = useState(true);');
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

    // 3. Atualizar a search bar
    const searchBarRegex = /\{\/\* Search Bar \*\/\}\s*<div className="relative max-w-md flex items-center gap-2">\s*<div className="relative flex-1">\s*<Search className="absolute left-3 top-1\/2 -translate-y-1\/2 text-gray-400" size=\{18\} \/>\s*<input\s*type="text"\s*placeholder="Buscar por nome, fantasia ou CNPJ..."\s*value=\{searchTerm\}\s*onChange=\{\(e\) => setSearchTerm\(e\.target\.value\)\}\s*className="w-full pl-10 pr-4 py-2\.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-\[#E0E800\]\/50 focus:border-\[#E0E800\] transition-all"\s*\/>\s*<\/div>\s*\{searchTerm && \(\s*<button onClick=\{\(\) => setSearchTerm\(''\)\} className="p-2\.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Limpar pesquisa">\s*<X size=\{18\} \/>\s*<\/button>\s*\)\}\s*<\/div>/;

    const newSearchBar = `{/* Search Bar */}
            <div className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded-xl shadow-sm mb-4">
                {showFilters ? (
                    <div className="relative max-w-md flex items-center gap-2 flex-1">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="search"
                                placeholder="Buscar por nome, fantasia ou CNPJ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all"
                            />
                        </div>
                    </div>
                ) : (
                   <span className="text-[10px] uppercase font-bold text-gray-400 ml-2">Filtros Ocultos</span>
                )}
                
                <button 
                    onClick={() => {
                        setShowFilters(!showFilters);
                        if(showFilters) setSearchTerm('');
                    }} 
                    className="text-[10px] ml-auto flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-3 py-2 rounded transition-colors border border-gray-200 uppercase font-bold"
                >
                    <Filter size={14} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                </button>
            </div>`;

    if (content.match(searchBarRegex)) {
        content = content.replace(searchBarRegex, newSearchBar);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processado PessoaJuridica.tsx`);
}
