const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/components/ModalIncluirMaterialOS.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add min-w-0 to left panel
content = content.replace(
    '<div className="flex-1 flex flex-col border-r border-gray-200">',
    '<div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">'
);

// Reduce padding on left panel cards
content = content.replace(
    /className=\{\`p-2 bg-white border rounded shadow-sm cursor-pointer transition-all hover:border-\[\#32423D\]/g,
    'className={`px-2 py-1 bg-white border rounded shadow-sm cursor-pointer transition-all hover:border-[#32423D]'
);

// Fix right panel width and add shrink-0
content = content.replace(
    '<div className="w-full md:w-[400px] flex flex-col bg-white">',
    '<div className="w-full md:w-[320px] shrink-0 flex flex-col bg-white">'
);

fs.writeFileSync(file, content);
console.log('Successfully patched UI sizes');
