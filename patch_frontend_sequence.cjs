const fs = require('fs');

const filesToPatch = [
    'c:\\\\SincoWeb\\\\SINCO-WEB\\\\SINCO-WEB\\\\frontend\\\\src\\\\pages\\\\ApontamentoProducaoRecurso.tsx',
    'c:\\\\SincoWeb\\\\SINCO-WEB\\\\SINCO-WEB\\\\frontend\\\\src\\\\pages\\\\ApontamentoProducao.tsx'
];

const newFunc = `  const checkPredecessorStatus = (item: any, currentSetor: any) => {
    if (currentSetor === 'mapa' || currentSetor === 'mapaproducao') return { allowed: true };
    
    const sequence = ['engenharia', 'isometrico', 'medicao', 'corte', 'cortealaser', 'pulsionadeira', 'puncionadeira', 'usinagem', 'dobra', 'caldeiraria', 'serralheria', 'solda', 'galvanizar', 'pintura', 'acabamento', 'montagem', 'aprovacao'];
    const currentIndex = sequence.indexOf(String(currentSetor).toLowerCase());
    
    if (currentIndex <= 0) return { allowed: true };

    const itemAny = item as any;

    for (let i = currentIndex - 1; i >= 0; i--) {
      const pred = sequence[i];
      let base = pred.toUpperCase();
      if (pred === 'cortealaser') base = 'CorteaLaser';
      else if (pred === 'corte') base = 'Corte';
      else if (pred === 'dobra') base = 'Dobra';
      else if (pred === 'solda') base = 'Solda';
      else if (pred === 'pintura') base = 'Pintura';
      else if (pred === 'montagem') base = 'Montagem';
      else if (pred === 'acabamento') base = 'ACABAMENTO';
      else if (pred === 'usinagem') base = 'Usinagem';
      else if (pred === 'caldeiraria') base = 'CALDEIRARIA';
      else if (pred === 'serralheria') base = 'SERRALHERIA';

      const txtField = \`txt\${base}\`;
      const txtFieldLower = \`txt\${pred.toLowerCase()}\`;
      const txtFieldAlt = pred === 'montagem' ? 'TxtMontagem' : txtField;

      const val1 = String(itemAny[txtField] || '').trim();
      const val2 = String(itemAny[txtFieldLower] || '').trim();
      const val3 = String(itemAny[txtFieldAlt] || '').trim();
      
      const isActive = val1 === '1' || val2 === '1' || val3 === '1' || val1.toUpperCase() === 'S' || val2.toUpperCase() === 'S';

      if (isActive) {
        const totalField = \`\${base}TotalExecutado\`;
        const totalFieldLower = \`\${pred}totalexecutado\`;
        const totalExec = Number(itemAny[totalField] || itemAny[totalFieldLower] || 0);

        return { 
          allowed: totalExec >= Number(itemAny.QtdeTotal || itemAny.qtdetotal || 0), 
          predecessor: pred.charAt(0).toUpperCase() + pred.slice(1) 
        };
      }
    }

    return { allowed: true };
  };`;

for (const file of filesToPatch) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    const regex = /const checkPredecessorStatus = \([\s\S]*?return \{ allowed: true \};\s*\};/m;
    
    if (regex.test(content)) {
        content = content.replace(regex, newFunc);
        fs.writeFileSync(file, content);
        console.log("Patched", file);
    } else {
        console.log("Regex not matched in", file);
    }
}
