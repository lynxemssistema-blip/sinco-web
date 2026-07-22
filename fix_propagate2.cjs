const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const regex = /await Promise\.all\(promises\);\s*\/\/\s*Re-fetch tags\s*if\s*\(selProj\)\s*fetchTags\(selProj\.IdProjeto\);/g;

const replaceStr = `await Promise.all(promises);

  const payloadSetores = filteredTagSectors.map(s => ({
      sectorName: s.k,
      piField: s.fields.pi,
      pfField: s.fields.pf,
      piValue: isoToBr(tagSectorDates[s.fields.pi] || ''),
      pfValue: isoToBr(tagSectorDates[s.fields.pf] || '')
  }));

  await fetch(\`\${API_BASE}/visao-geral/tag/\${selTag.IdTag}/propagar-datas-os\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setores: payloadSetores })
  });

  // Re-fetch tags
  if (selProj) fetchTags(selProj.IdProjeto);`;

if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
    console.log('Successfully added propagar-datas-os call via regex.');
} else {
    console.log('Regex did not match.');
}
