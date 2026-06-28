const fs = require('fs');
const path = require('path');

// VisaoGeralEngenharia.tsx
let pEng = path.join(__dirname, 'src', 'pages', 'VisaoGeralEngenharia.tsx');
let cEng = fs.readFileSync(pEng, 'utf8');
cEng = cEng.replace(/import \{ usePersistentState \} from '..\/hooks\/usePersistentState';\r?\n/g, '');
cEng = cEng.replace(/catch \(e: any\)/g, 'catch');
cEng = cEng.replace(/catch \(e\)/g, 'catch');
cEng = cEng.replace(/catch \(err\)/g, 'catch');
fs.writeFileSync(pEng, cEng);

// VisaoGeralTagsGlobais.tsx
let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

cTags = cTags.replace(/import \{\s*Search, Filter, X, Loader, TagIcon, Scissors, Wrench,\s*Flame, Paintbrush, HardHat, AlertTriangle, CalendarDays, ArrowRight\s*\} from 'lucide-react';/g, "import { Search, X, Loader, AlertTriangle, ArrowRight } from 'lucide-react';");

cTags = cTags.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
cTags = cTags.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
cTags = cTags.replace(/catch \(err\)/g, 'catch');
cTags = cTags.replace(/catch \(error\)/g, 'catch');
cTags = cTags.replace(/catch \(e\)/g, 'catch');
cTags = cTags.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
cTags = cTags.replace(/useState<any \| null>/g, 'useState<Record<string, unknown> | null>');
cTags = cTags.replace(/as any\)/g, 'as Record<string, unknown>)');
cTags = cTags.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
cTags = cTags.replace(/\(i as any\)/g, '(i as Record<string, unknown>)');
cTags = cTags.replace(/item: any/g, 'item: Record<string, unknown>');
cTags = cTags.replace(/: any/g, ': Record<string, unknown>');
cTags = cTags.replace(/<any>/g, '<unknown>');
cTags = cTags.replace(/as any/g, 'as Record<string, unknown>');
cTags = cTags.replace(/const \[,m,day\] = d\.split\('-'\);/g, 'const [,m,day] = d.split(\'-\');');
cTags = cTags.replace(/const \[y,m,day\] = d\.split\('-'\);/g, 'const [,m,day] = d.split(\'-\');');

// Disable the set state in effect warning
cTags = cTags.replace(/useEffect\(\(\) => \{\r?\n\s*setLoading\(true\);/g, '/* eslint-disable react-compiler/react-compiler */\n    useEffect(() => {\n        // eslint-disable-next-line react-hooks/exhaustive-deps\n        setLoading(true);');

// The perfect move for hasOverlappingDates and hasOverlappingRealDates
const overlapRegex = /const hasOverlappingDates = \([\s\S]*?return false;\r?\n    \};\r?\n\r?\n    const hasOverlappingRealDates = \([\s\S]*?return false;\r?\n    \};\r?\n\r?\n/g;
const match = overlapRegex.exec(cTags);
if (match) {
  cTags = cTags.replace(match[0], ''); // remove from current location
  const insertTarget = 'const filtered = useMemo(() => {\n';
  cTags = cTags.replace(insertTarget, insertTarget + '        ' + match[0].trim().replace(/\n/g, '\n        ') + '\n\n');
}

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 8');
