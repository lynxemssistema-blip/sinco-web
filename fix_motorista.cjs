const fs = require('fs');
let path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  '<div className="mt-1 flex justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors bg-gray-50/50">',
  '<div className="mt-1 flex justify-center w-full">'
);
fs.writeFileSync(path, content);
