const fs = require('fs');
let code = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', 'utf8');

// Uppercase fix
code = code.replace(
  /const value = name\.toLowerCase\(\)\.includes\('desc'\) \? e\.target\.value\.toUpperCase\(\) : e\.target\.value;/,
  "const value = (name === 'processofabricacao' || name === 'CodigoProcessoFabricacao') ? e.target.value.toUpperCase() : e.target.value;"
);

// Duplication check in handleSubmit
const handleSubmitFixed = `const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Duplication check
  const isDuplicate = recursos.some(r => 
    r.processofabricacao.toUpperCase().trim() === formData.processofabricacao.toUpperCase().trim() && 
    r.IdProcessoFabricacao !== formData.IdProcessoFabricacao
  );

  if (isDuplicate) {
    setError('Já existe um processo cadastrado com este nome.');
    return;
  }

  setSaving(true);
  setError(null);`;

code = code.replace(
  /const handleSubmit = async \(e: React\.FormEvent\) => \{\s+e\.preventDefault\(\);\s+setSaving\(true\);\s+setError\(null\);/m,
  handleSubmitFixed
);

fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', code);
console.log('Fixed uppercase and duplication');
