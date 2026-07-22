const fs = require('fs');
let fileContent = fs.readFileSync('src/pages/MontaPecaManufaturada.tsx', 'utf8');

const regex = /\{m\.EnderecoArquivo && \(\s*<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); abrirPdf\(m\.EnderecoArquivo!\); \}\} className="p-0\.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-100 shadow-sm transition-colors" title="Abrir PDF">\s*<FileText size=\{10\}\/>\s*<\/button>\s*\)\}/s;

fileContent = fileContent.replace(regex, "");
fs.writeFileSync('src/pages/MontaPecaManufaturada.tsx', fileContent);
console.log("Modifications applied successfully.");
