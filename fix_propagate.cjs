const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/VisaoGeralProducao.tsx', 'utf8');

const targetStr = `   await Promise.all(promises);
   // Re-fetch tags
   if (selProj) fetchTags(selProj.IdProjeto);`;

const replaceStr = `   await Promise.all(promises);

   const payloadSetores = filteredTagSectors.map(s => ({
       sectorName: s.k,
       piField: s.fields.pi,
       pfField: s.fields.pf,
       piValue: isoToBr(tagSectorDates[s.fields.pi]),
       pfValue: isoToBr(tagSectorDates[s.fields.pf])
   }));

   await fetch(\`\${API_BASE}/visao-geral/tag/\${selTag.IdTag}/propagar-datas-os\`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ setores: payloadSetores })
   });

   // Re-fetch tags
   if (selProj) fetchTags(selProj.IdProjeto);`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('frontend/src/pages/VisaoGeralProducao.tsx', content, 'utf8');
    console.log('Successfully added propagar-datas-os call.');
} else {
    console.log('Could not find target string.');
}
