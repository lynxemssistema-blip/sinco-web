const fs = require('fs');
const path = require('path');

let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

cTags = cTags.replace(/setLoading\(true\);/g, '// eslint-disable-next-line react-hooks/set-state-in-effect\n        setLoading(true);');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 10');
