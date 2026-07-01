const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

const regex = /<button\s+onClick=\{([^\}]+)\}\s+className="([^"]+)"(?:\s+title="[^"]*")?>\s*<X\s+size=\{([0-9]+)\}\s*\/>\s*<\/button>/g;

const novoBotao = (match, onClick, oldClass, size) => {
    // Only target buttons that are likely closing a modal or window
    if (onClick.includes('Modal') || onClick.includes('null') || onClick.includes('false')) {
        return `<button onClick={${onClick}} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
            <X size={14} /> Fechar
        </button>`;
    }
    
    // For input clears, keep them exactly as they were (do not add Fechar)
    return match; 
};

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    
    files.forEach((file) => {
        if(file.endsWith('.tsx')) {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            
            if (regex.test(content)) {
                let initialContent = content;
                const newContent = content.replace(regex, novoBotao);
                if(newContent !== initialContent) {
                    console.log(`Atualizando modais em ${file}...`);
                    fs.writeFileSync(filePath, newContent, 'utf8');
                }
            }
        }
    });
    console.log("Fim!");
});
