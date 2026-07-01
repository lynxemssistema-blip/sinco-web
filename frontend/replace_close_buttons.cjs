const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

const regex = /<button\s+onClick=\{([^}]+)\}\s+className="([^"]+)"(?:\s+title="[^"]*")?>\s*<X\s+size=\{[0-9]+\}\s*\/>\s*<\/button>/g;

const novoBotao = (match, onClick, oldClass) => {
    // Se já tiver "Fechar" no botão, provavelmente não é esse formato.
    return `<button onClick={${onClick}} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
                <X size={14} /> Fechar
              </button>`;
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
                console.log(`Atualizando ${file}...`);
                const newContent = content.replace(regex, novoBotao);
                fs.writeFileSync(filePath, newContent, 'utf8');
            }
        }
    });
    console.log("Fim!");
});
