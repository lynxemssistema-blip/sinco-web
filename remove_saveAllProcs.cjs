const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// Use regex to remove saveAllProcs function block completely
content = content.replace(
  /const saveAllProcs = async \(\) => \{[\s\S]*?\}\s*};\s*$/m,
  ''
);
// Wait, the above might be too greedy. Let's do a more precise replacement.
content = content.replace(
  /const saveAllProcs = async \(\) => \{[\s\S]*?alert\('Erro: ' \+ j\.message\);[\s\S]*?\} finally \{[\s\S]*?setSavingProc\(false\);[\s\S]*?\}[\s\S]*?\};\s*/g,
  ''
);

fs.writeFileSync(file, content, 'utf8');
console.log('Function removed');
