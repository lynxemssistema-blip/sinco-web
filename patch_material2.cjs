const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Remove camera and gallery icons entirely
content = content.replace(
    /<label className="p-1\.5 rounded border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400\s*opacity-50" title="Câmera \(Desativado\)">[\s\S]*?<ImageIcon size=\{16\} \/>\s*<\/label>/,
    ""
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Removed camera/gallery icons from Material.tsx successfully');
