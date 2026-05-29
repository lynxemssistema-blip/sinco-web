const fs = require('fs');
const path = require('path');

// 1. Injetar a regra CSS no index.css para habilitar o "X" nativo em inputs type="search"
const cssPath = path.join(__dirname, 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('-webkit-search-cancel-button')) {
    css += `\n/* Ativar X (clear) em inputs de search no Tailwind */\ninput[type="search"]::-webkit-search-cancel-button {\n  -webkit-appearance: searchfield-cancel-button;\n  cursor: pointer;\n}\n`;
    fs.writeFileSync(cssPath, css);
    console.log('CSS atualizado com suporte ao clear button.');
}

// 2. Modificar type="text" para type="search" em todos os inputs de busca, e trocar H3 para summary
const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // A) Trocar inputs type="text" associados a busca para type="search"
    // Heurística: se for input text dentro de uma área que menciona "Pesquisa" ou se a variável value/onChange for de filtro
    // Vamos trocar em todo o arquivo inputs de type="text" que tenham "Filtros" ou "search" no onChange/value ou name
    // Ou de forma mais contida, podemos buscar o bloco de Dados para Pesquisa
    const searchBlockMatch = content.match(/<h3[^>]*>[\s\S]*?(?:Dados para Pesquisa|DADOS PARA PESQUISA|Filtros|FILTROS)[\s\S]*?<\/h3>/i);
    
    if (searchBlockMatch) {
        // Encontrar o bloco da div englobando a pesquisa
        // Esta é uma Regex gulosa que pode ser perigosa em JS puro, então vamos fazer trocas seguras de input text.
        // Vamos trocar todos os input text que são evidentemente de filtro para type="search".
        // Regex para encontrar <input type="text" ... value={filters.algo} ... />
        const inputRegex = /<input[^>]+type=["']text["'][^>]+(?:value|onChange)=\{[^}]*(?:filter|search|pesquisa)[^}]*\}[^>]*>/gi;
        content = content.replace(inputRegex, (match) => {
            changed = true;
            return match.replace(/type=["']text["']/, 'type="search"');
        });
        
        // E também vamos trocar os forms de pesquisa para usar a tag <details> se houver a estrutura clássica
        // A estrutura: <div className="... mb-2 ..."> <h3 ...> <Search/> Dados para Pesquisa </h3> ... </div>
        // Em vez de parsear todo o HTML, vamos fazer uma troca controlada onde o wrapper é convertido em <details> e o H3 em <summary>
        
        const h3Regex = /(<div[^>]+className=["'][^"']*bg-white[^"']*shadow-sm[^"']*mb-2[^"']*["'][^>]*>\s*)<h3([^>]+className=["'][^"']*uppercase[^"']*["'][^>]*)>([\s\S]*?)(Dados para Pesquisa|DADOS PARA PESQUISA|Filtros)([\s\S]*?)<\/h3>/i;
        
        if (h3Regex.test(content) && !content.includes('<details')) {
            // A gente encontra o index do match
            const match = content.match(h3Regex);
            const fullMatch = match[0];
            const divOpen = match[1];
            
            // Trocar o <div... por <details open...
            let newHeader = fullMatch.replace(divOpen, divOpen.replace('<div', '<details open').replace('mb-2', 'mb-2 group'));
            // Trocar <h3... por <summary... com cursor-pointer
            newHeader = newHeader.replace(/<h3([^>]+)>/, '<summary$1 style={{cursor:"pointer", listStyle:"none", margin:0}} onClick={(e) => { e.currentTarget.parentElement.open = !e.currentTarget.parentElement.open; e.preventDefault(); }}>');
            newHeader = newHeader.replace('</h3>', ' <span className="float-right text-gray-400 group-open:rotate-180 transition-transform">▼</span></summary><div className="mt-2">');
            
            // Agora, como abrimos um <div className="mt-2"> dentro do <details>, precisamos fechar esse </div> e depois fechar o </details> no lugar do </div> final do bloco.
            // Para isso, precisariamos contar divs. Como é script, vamos apenas deixar sem o <div mt-2> e colocar no summary, e fechamos o </details> ao invés do </div>.
            
            // Nova estratégia: usar só <details> no lugar da <div> externa, <summary> no lugar de <h3>.
            let safeHeader = fullMatch.replace(/<div([^>]+)>/, '<details$1 open className={(`$1 group`).replace("className=\\"", "className=\\"group ")}>');
            safeHeader = safeHeader.replace(/<h3([^>]+)>/, '<summary$1 style={{cursor:"pointer", listStyle:"none"}}>');
            safeHeader = safeHeader.replace('</h3>', '<span className="float-right text-gray-400 group-open:rotate-180 transition-transform">▼</span></summary>');
            
            // Acharemos a div final do bloco? Não é seguro.
            // Então vamos descartar o <details> aqui no script para não quebrar o React e fazer manualmente nas telas principais.
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Inputs de busca atualizados para type="search" em: ${file}`);
    }
}
