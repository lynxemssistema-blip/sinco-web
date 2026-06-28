const fs = require('fs');
const file = 'src/pages/OrdemServico.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/} catch \(error: any\) {/g, '} catch {');
code = code.replace(/onChange={\(e\) => setFiltroFinalizado\(e.target.value as any\)}/g, 'onChange={(e) => setFiltroFinalizado(e.target.value as "TODAS" | "FINALIZADAS" | "NAO_FINALIZADAS")}');
code = code.replace(/onChange={\(e\) => setFiltroLiberado\(e.target.value as any\)}/g, 'onChange={(e) => setFiltroLiberado(e.target.value as "TODAS" | "LIBERADAS" | "NAO_LIBERADAS")}');

fs.writeFileSync(file, code);
console.log('OrdemServico minor lint fixes applied part 3');
