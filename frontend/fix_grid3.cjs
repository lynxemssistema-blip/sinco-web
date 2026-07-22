const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');
c = c.replace(/<button onClick=\{\(\) => setShowGrid3\(!showGrid3\)\}.*?<\/button>/gs, '');
c = c.replace(/\{showGrid3 && \(/g, '');
c = c.replace(/<button onClick=\{\(\) => setShowGrid3\(false\)\}.*?<\/button>/g, '');
c = c.replace(/<div className="flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-\[34%\] border-l border-indigo-100/g, '<div className="flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-[33%] border-l border-indigo-100');
fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
