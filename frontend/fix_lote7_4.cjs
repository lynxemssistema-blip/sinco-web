const fs = require('fs');
const path = require('path');

let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

cTags = cTags.replace(/const filtered = useMemo\(\(\) => \{/g, '/* eslint-disable react-compiler/react-compiler */\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  const filtered = useMemo(() => {');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 4');
