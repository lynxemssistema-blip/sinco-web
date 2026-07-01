const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'pages');

// Find the previously generated button pattern. Using [\s\S]*? to lazily match attributes.
const regex = /<button([\s\S]*?)className="([^"]*)bg-white border border-slate-300([^"]*)"([\s\S]*?)>\s*<X size=\{14\}\s*\/>\s*Fechar\s*<\/button>/g;

const novoBotao = (match, beforeClass, midClass, afterClass, afterButton) => {
    // Check if it already has absolute
    if (midClass.includes('absolute') || afterClass.includes('absolute')) {
        return match;
    }
    
    // Inject absolute top-4 right-4 z-50
    return `<button${beforeClass}className="${midClass}bg-white border border-slate-300 absolute top-4 right-4 z-50${afterClass}"${afterButton}>
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
                console.log(`Posicionando botão em ${file}...`);
                const newContent = content.replace(regex, novoBotao);
                fs.writeFileSync(filePath, newContent, 'utf8');
            }
        }
    });
    console.log("Fim!");
});
