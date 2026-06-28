const fs = require('fs');
const path = require('path');

// VisaoGeralEngenharia.tsx
let pEng = path.join(__dirname, 'src', 'pages', 'VisaoGeralEngenharia.tsx');
let cEng = fs.readFileSync(pEng, 'utf8');
cEng = cEng.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(pEng, cEng);

// VisaoGeralTagsGlobais.tsx
let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

cTags = cTags.replace(/import \{\s*Search, Filter, X, Loader, TagIcon, Scissors, Wrench,\s*Flame, Paintbrush, HardHat, AlertTriangle, CalendarDays, ArrowRight\s*\} from 'lucide-react';/g, "import { Search, X, Loader, AlertTriangle, ArrowRight } from 'lucide-react';");

// Remove eslint disables I mistakenly put
cTags = cTags.replace(/\/\/ eslint-disable-next-line\r?\n\s*const filtered = useMemo\(\(\) => \{/g, 'const filtered = useMemo(() => {');
cTags = cTags.replace(/\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\r?\n\s*setLoading\(true\);/g, 'setLoading(true);');

// Actually move functions inside useMemo
const overlapRegex = /const hasOverlappingDates = \([\s\S]*?return false;\r?\n  \};\r?\n\r?\n  const hasOverlappingRealDates = \([\s\S]*?return false;\r?\n  \};\r?\n\r?\n/g;
const match = overlapRegex.exec(cTags);
if (match) {
  cTags = cTags.replace(match[0], ''); // remove from outside
  const insertTarget = 'const filtered = useMemo(() => {\n';
  cTags = cTags.replace(insertTarget, insertTarget + '  ' + match[0].trim() + '\n\n');
}

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 6');
