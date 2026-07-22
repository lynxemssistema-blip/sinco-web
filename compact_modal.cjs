const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/pages/Material.tsx');
let content = fs.readFileSync(file, 'utf8');

// Compact the modal spacing
// 1. the main modal wrapper space-y-3 -> space-y-2
content = content.replace(/className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar"/g, 'className="p-4 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar"');

// 2. "mb-4" -> "mb-2" (image area)
content = content.replace(/className="flex flex-row items-center gap-4 mb-4"/g, 'className="flex flex-row items-center gap-4 mb-2"');

// 3. "mb-3" -> "mb-1.5" (section headers)
content = content.replace(/mb-3/g, 'mb-1.5');

// 4. "gap-4" -> "gap-3" inside the modal grids
// Because "grid-cols-1 md:grid-cols-3 gap-4" appears multiple times
content = content.replace(/gap-4/g, 'gap-3');

// 5. Reduce padding/borders
content = content.replace(/pb-4/g, 'pb-2');
content = content.replace(/mt-4/g, 'mt-2');

fs.writeFileSync(file, content);
console.log('Compacted Material.tsx modal spacing.');
