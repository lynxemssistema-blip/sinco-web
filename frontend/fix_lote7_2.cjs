const fs = require('fs');
const path = require('path');

// UnidadeMedida.tsx
let pUnidade = path.join(__dirname, 'src', 'pages', 'UnidadeMedida.tsx');
let cUnidade = fs.readFileSync(pUnidade, 'utf8');
cUnidade = cUnidade.replace(/createPortal, /g, '');
fs.writeFileSync(pUnidade, cUnidade);

// VisaoGeralEngenharia.tsx
let pEng = path.join(__dirname, 'src', 'pages', 'VisaoGeralEngenharia.tsx');
let cEng = fs.readFileSync(pEng, 'utf8');
cEng = cEng.replace(/usePersistentState,/g, '');
cEng = cEng.replace(/catch \(e\)/g, 'catch');
fs.writeFileSync(pEng, cEng);

// VisaoGeralPendencias.tsx
let pPend = path.join(__dirname, 'src', 'pages', 'VisaoGeralPendencias.tsx');
let cPend = fs.readFileSync(pPend, 'utf8');
cPend = cPend.replace(/ListChecks, /g, '');
cPend = cPend.replace(/ Filter,/g, '');
fs.writeFileSync(pPend, cPend);

// VisaoGeralProducao.tsx
let pProd = path.join(__dirname, 'src', 'pages', 'VisaoGeralProducao.tsx');
let cProd = fs.readFileSync(pProd, 'utf8');
cProd = cProd.replace(/actionModal === 'fin' \? finProj\(`\$\{API_BASE\}\/visao-geral\/projeto\/\$\{selProj\?\.IdProjeto\}\/finalizar`, true\) : finProj\(`\$\{API_BASE\}\/visao-geral\/projeto\/\$\{selProj\?\.IdProjeto\}\/cancelar-finalizacao`, false\);/g, "if (actionModal === 'fin') { finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/finalizar`, true); } else { finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/cancelar-finalizacao`, false); }");
fs.writeFileSync(pProd, cProd);

// VisaoGeralTagsGlobais.tsx
let pTags = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cTags = fs.readFileSync(pTags, 'utf8');
cTags = cTags.replace(/Paintbrush, HardHat, CalendarDays, /g, '');
cTags = cTags.replace(/const \[y,m,day\] = d\.split\('-'\);/g, "const [,m,day] = d.split('-');");

cTags = cTags.replace(/useEffect\(\(\) => \{\r?\n\s*setLoading\(true\);/g, "useEffect(() => {\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    setLoading(true);");

const overlapDatesRegex = /const hasOverlappingDates = \([\s\S]*?return false;\r?\n  \};\r?\n\r?\n  const hasOverlappingRealDates = \([\s\S]*?return false;\r?\n  \};/g;
const overlapFuncs = cTags.match(overlapDatesRegex);

if (overlapFuncs && overlapFuncs[0]) {
  cTags = cTags.replace(overlapDatesRegex, '');
  const insertIndex = cTags.indexOf('const filtered = useMemo(() => {');
  if (insertIndex !== -1) {
    const before = cTags.substring(0, insertIndex);
    const after = cTags.substring(insertIndex);
    cTags = before + overlapFuncs[0] + '\n\n  ' + after;
  }
}

cTags = cTags.replace(/, hasOverlappingDates, hasOverlappingRealDates\]\); \/\/ eslint-disable-line react-hooks\/exhaustive-deps/g, ']);');

fs.writeFileSync(pTags, cTags);

console.log('Fixed Lote 7 files - pass 2');
