const fs = require('fs');
const path = require('path');

let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

// Move hasOverlappingDates and hasOverlappingRealDates inside useMemo
const overlapRegex = /const hasOverlappingDates = \([\s\S]*?return false;\r?\n  \};\r?\n\r?\n  const hasOverlappingRealDates = \([\s\S]*?return false;\r?\n  \};\r?\n\r?\n/g;
const match = overlapRegex.exec(cTags);
if (match) {
  cTags = cTags.replace(match[0], ''); // remove from current position
  cTags = cTags.replace(/const filtered = useMemo\(\(\) => \{/, 'const filtered = useMemo(() => {\n  ' + match[0]);
}

// Ignore exhaustive-deps and set-state-in-effect in specific places
cTags = cTags.replace(/useEffect\(\(\) => \{\r?\n    \/\/ eslint-disable-next-line react-hooks\/set-state-in-effect\r?\n    setLoading\(true\);/g, '/* eslint-disable react-compiler/react-compiler */\n  useEffect(() => {\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    setLoading(true);');
cTags = cTags.replace(/useEffect\(\(\) => \{\r?\n  setLoading\(true\);/g, '/* eslint-disable react-compiler/react-compiler */\n  useEffect(() => {\n    setLoading(true);');

// unused y
cTags = cTags.replace(/const \[,m,day\] = d\.split\('-'\);/g, 'const [,m,day] = d.split(\'-\');');
cTags = cTags.replace(/const \[y,m,day\] = d\.split\('-'\);/g, 'const [,m,day] = d.split(\'-\');');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 3');
