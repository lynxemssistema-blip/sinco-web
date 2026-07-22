const fs = require('fs');

// 1. AppLayout.tsx Fix
let layoutPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/layout/AppLayout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

layoutContent = layoutContent.replace(
    /<button onClick=\{\(\) => setIsAppMaximized\(!isAppMaximized\)\}.*?>[\s\S]*?<\/button>/,
    ''
);

fs.writeFileSync(layoutPath, layoutContent);

// 2. Material.tsx Fixes
let matPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Material.tsx';
let matContent = fs.readFileSync(matPath, 'utf8');

// Remove Câmera label
matContent = matContent.replace(
    /<label className="p-1\.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-\[#32423D\]" title="Câmera">[\s\S]*?<\/label>/,
    ''
);

// Remove Galeria label
matContent = matContent.replace(
    /<label className="p-1\.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-\[#32423D\]" title="Galeria">[\s\S]*?<\/label>/,
    ''
);

// Compact the form padding
matContent = matContent.replace('className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar"', 'className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar"');
matContent = matContent.replace('className="space-y-3"', 'className="grid grid-cols-1 md:grid-cols-2 gap-3"');
matContent = matContent.replace('rows={3}', 'rows={1}');

// Remove Package icon from Código column
matContent = matContent.replace(
    /<td className="px-2 py-1\.5">\s*<div className="flex items-center gap-2">\s*<div className="w-8 h-8 rounded-lg bg-\[#32423D\]\/10 text-\[#32423D\] flex items-center justify-center">\s*<Package size=\{14\} \/>\s*<\/div>\s*<span className="text-\[11px\] font-medium text-gray-900 truncate max-w-\[150px\]">\s*\{material\.CodMatFabricante \|\| '-'\}\s*<\/span>\s*<\/div>\s*<\/td>/,
    '<td className="px-2 py-1.5">\n <span className="text-[11px] font-medium text-gray-900 truncate max-w-[150px]">\n {material.CodMatFabricante || \'-\'}\n </span>\n </td>'
);

// Colorize Action Icons
matContent = matContent.replace(
    /className="p-2 rounded-lg text-gray-400 hover:text-\[#32423D\] hover:bg-\[#E0E800\]\/20 transition-colors"/,
    'className="p-2 rounded-lg text-[#32423D] bg-[#E0E800]/20 hover:bg-[#E0E800]/40 transition-colors"'
);
matContent = matContent.replace(
    /className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"/,
    'className="p-2 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"'
);
matContent = matContent.replace(
    /className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"/,
    'className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"'
);

fs.writeFileSync(matPath, matContent);
console.log('Done!');
