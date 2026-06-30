const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Material.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace table headers
content = content.replace(/<th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-16">Img<\/th>/g, '<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-16">Img</th>');
content = content.replace(/<th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Código<\/th>/g, '<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Código</th>');
content = content.replace(/<th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Descrição<\/th>/g, '<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Descrição</th>');
content = content.replace(/<th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Família<\/th>/g, '<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Família</th>');
content = content.replace(/<th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Fornecedor<\/th>/g, '<th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Fornecedor</th>');
content = content.replace(/<th className="px-3 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider w-24">Ações<\/th>/g, '<th className="px-2 py-1.5 text-right text-[10px] font-semibold text-white uppercase tracking-wider w-24">Ações</th>');

// Replace table cells
content = content.replace(/<td className="px-3 py-3">/g, '<td className="px-2 py-1.5">');
content = content.replace(/<td className="px-3 py-3 text-xs/g, '<td className="px-2 py-1.5 text-[11px]');
content = content.replace(/<span className="text-xs font-medium text-gray-900/g, '<span className="text-[11px] font-medium text-gray-900');

fs.writeFileSync(filePath, content);
console.log('Material.tsx refactored');
