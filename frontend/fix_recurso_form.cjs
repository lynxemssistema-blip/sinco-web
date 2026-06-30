const fs = require('fs');
let code = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', 'utf8');

// 1. Add useAuth import
code = code.replace(/import \{ Plus, Search/, "import { useAuth } from '../contexts/AuthContext';\nimport { Plus, Search");

// 2. Add const { token } = useAuth(); inside the component
code = code.replace(/export default function RecursoFabricacaoPage\(\) \{/, 'export default function RecursoFabricacaoPage() {\n  const { token } = useAuth();');

// 3. Replace 'recursoes' with 'recursos' everywhere
code = code.replace(/\$\{API_BASE\}\/recursoes/g, '${API_BASE}/recursos');
code = code.replace(/recursoes\.length/g, 'recursos.length');
code = code.replace(/setRecursoes/g, 'setRecursos');
code = code.replace(/recursoes/g, 'recursos');
code = code.replace(/filteredRecursoes/g, 'filteredRecursos');
code = code.replace(/fetchRecursoes/g, 'fetchRecursos');

// 4. Update fetch logic to include headers
const fetchPattern = /const res = await fetch\(`\$\{API_BASE\}\/recursos`\);/;
const fetchReplacement = `const res = await fetch(\`\${API_BASE}/recursos\`, { headers: { 'Authorization': \`Bearer \${token}\` } });`;
code = code.replace(fetchPattern, fetchReplacement);

// Update save fetch logic
const saveFetchPattern = /const res = await fetch\(url, \{\n\s+method,\n\s+headers: \{\s+'Content-Type': 'application\/json'\n\s+\},\n\s+body: JSON\.stringify\(formData\),\n\s+\}\);/;
const saveFetchReplacement = `const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify(formData),
      });`;
code = code.replace(saveFetchPattern, saveFetchReplacement);

// Update delete fetch logic
const deleteFetchPattern = /const res = await fetch\(`\$\{API_BASE\}\/recursos\/\$\{id\}`\, \{\n\s+method: 'DELETE'\n\s+\}\);/;
const deleteFetchReplacement = `const res = await fetch(\`\${API_BASE}/recursos/\${id}\`, {
        method: 'DELETE',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });`;
code = code.replace(deleteFetchPattern, deleteFetchReplacement);

// 5. Keep form open on inclusion
const saveSuccessPattern = /if \(json\.success\) \{\n\s+await fetchRecursos\(\);\n\s+resetForm\(\);\n\s+\}/;
const saveSuccessReplacement = `if (json.success) {
        await fetchRecursos();
        if (!isEditing) {
          // Keep form open for next inclusion
          setFormData(emptyForm);
        } else {
          resetForm();
        }
      }`;
code = code.replace(saveSuccessPattern, saveSuccessReplacement);

fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', code);
console.log('RecursoFabricacao patched');
