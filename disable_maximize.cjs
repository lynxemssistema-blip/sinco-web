const fs = require('fs');
const files = [
  'frontend/src/pages/AcompanhamentoEtapas.tsx',
  'frontend/src/pages/ApontamentoProducao.tsx',
  'frontend/src/pages/VisaoGeralEngenharia.tsx',
  'frontend/src/pages/VisaoGeralProducao.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/const \[isExpanded, setIsExpanded\] = useState\(true\);/g, 'const [isExpanded, setIsExpanded] = useState(false);');
  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
}

let cadastro = fs.readFileSync('frontend/src/pages/CadastroUsuario.tsx', 'utf8');
cadastro = cadastro.replace(/const \[isFormMaximized, setIsFormMaximized\] = useState\(true\);/g, 'const [isFormMaximized, setIsFormMaximized] = useState(false);');
cadastro = cadastro.replace(/setIsFormMaximized\(true\);/g, 'setIsFormMaximized(false);');
fs.writeFileSync('frontend/src/pages/CadastroUsuario.tsx', cadastro);
console.log('Updated CadastroUsuario.tsx');
