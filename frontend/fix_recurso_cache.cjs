const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Fix emptyForm
txt = txt.replace(/Fabrica: 'NAO',/g, "Fabrica: 'NÂO',");
txt = txt.replace(/DataLiberada: 'NAO',/g, "DataLiberada: 'NÂO',");

// Fix options in the form modal and inline edit
txt = txt.replace(/<option value="NAO">NÃO<\/option>/g, '<option value="NÂO">NÃO</option>');

// Fix cache in fetchRecursos
txt = txt.replace(/fetch\(\`\$\{API_BASE\}\/recursos\`,/g, "fetch(`\${API_BASE}/recursos?t=\${new Date().getTime()}`,");

fs.writeFileSync(file, txt);
console.log('Fixed RecursoFabricacao cache and encoding issues.');
