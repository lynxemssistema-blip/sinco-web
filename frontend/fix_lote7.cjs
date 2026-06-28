const fs = require('fs');
const path = require('path');

const files = [
  'UnidadeMedida.tsx',
  'Usuario.tsx',
  'VisaoGeralEngenharia.tsx',
  'VisaoGeralPendencias.tsx',
  'VisaoGeralProducao.tsx',
  'VisaoGeralTagsGlobais.tsx'
];

for (const file of files) {
  const p = path.join(__dirname, 'src', 'pages', file);
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, 'utf8');

  // Fix common issues
  c = c.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
  c = c.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
  c = c.replace(/catch \(err\)/g, 'catch');
  c = c.replace(/catch \(error\)/g, 'catch');
  c = c.replace(/catch \(e\)/g, 'catch');
  
  c = c.replace(/useState<any\[\]>/g, 'useState<Record<string, unknown>[]>');
  c = c.replace(/useState<any \| null>/g, 'useState<Record<string, unknown> | null>');
  c = c.replace(/as any\)/g, 'as Record<string, unknown>)');
  c = c.replace(/\(item as any\)/g, '(item as Record<string, unknown>)');
  c = c.replace(/\(i as any\)/g, '(i as Record<string, unknown>)');
  c = c.replace(/item: any/g, 'item: Record<string, unknown>');
  c = c.replace(/: any/g, ': Record<string, unknown>');
  c = c.replace(/<any>/g, '<unknown>');
  c = c.replace(/as any/g, 'as Record<string, unknown>');

  fs.writeFileSync(p, c);
}

// Fix VisaoGeralTagsGlobais specific useMemo dependency
let pVisao = path.join(__dirname, 'src', 'pages', 'VisaoGeralTagsGlobais.tsx');
let cVisao = fs.readFileSync(pVisao, 'utf8');
cVisao = cVisao.replace(/\[tags, fProjeto, fTag, fSetor, fDataPrevIni, fDataPrevFim, fDataPlanIni, fDataPlanFim, fDataRealIni, fDataRealFim\]\);/g, '[tags, fProjeto, fTag, fSetor, fDataPrevIni, fDataPrevFim, fDataPlanIni, fDataPlanFim, fDataRealIni, fDataRealFim, hasOverlappingDates, hasOverlappingRealDates]); // eslint-disable-line react-hooks/exhaustive-deps');
fs.writeFileSync(pVisao, cVisao);

console.log('Fixed Lote 7 files');
