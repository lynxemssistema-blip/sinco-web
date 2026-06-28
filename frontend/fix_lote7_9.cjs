const fs = require('fs');
const path = require('path');

// VisaoGeralEngenharia.tsx
let pEng = path.join(__dirname, 'src', 'pages', 'VisaoGeralEngenharia.tsx');
let cEng = fs.readFileSync(pEng, 'utf8');

cEng = cEng.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
cEng = cEng.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
cEng = cEng.replace(/catch \(e: any\)/g, 'catch');

cEng = cEng.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
cEng = cEng.replace(/useState<any \| null>/g, 'useState<Record<string, unknown> | null>');
cEng = cEng.replace(/as any\)/g, 'as Record<string, unknown>)');
cEng = cEng.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
cEng = cEng.replace(/\(i as any\)/g, '(i as Record<string, unknown>)');
cEng = cEng.replace(/item: any/g, 'item: Record<string, unknown>');
cEng = cEng.replace(/: any/g, ': Record<string, unknown>');
cEng = cEng.replace(/<any>/g, '<unknown>');
cEng = cEng.replace(/as any/g, 'as Record<string, unknown>');

fs.writeFileSync(pEng, cEng);

// VisaoGeralTagsGlobais.tsx
let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');

cTags = cTags.replace(/\/\* eslint-disable react-compiler\/react-compiler \*\/\r?\n    /g, '');
cTags = cTags.replace(/\/\/ eslint-disable-next-line react-hooks\/exhaustive-deps\r?\n        /g, '');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 9');
