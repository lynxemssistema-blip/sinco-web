const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
const files = [
  'Familia.tsx',
  'Acabamento.tsx',
  'Setor.tsx',
  'TipoProduto.tsx',
  'UnidadeMedida.tsx',
  'Motorista.tsx'
];

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Regex to match the icon div inside the table rows
    // E.g. <div className="w-10 h-10 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center">...</div>
    const regex = /<div className="w-10 h-10 rounded-lg bg-\[#32423D\]\/10 text-\[#32423D\] flex items-center justify-center">[\s\S]*?<\/div>/g;
    
    content = content.replace(regex, "");
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
