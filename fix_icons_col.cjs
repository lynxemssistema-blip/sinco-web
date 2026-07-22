const fs = require('fs');
const glob = require('glob');

const files = glob.sync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Let's replace the typical "text-gray-400 hover:text-[#32423D]" edit buttons
  // with a colored variant (e.g., text-blue-500)
  
  // Edit button pattern
  const editRegex = /className="([^"]*?)text-gray-[345]00([^"]*?)hover:text-\[#32423D\]/g;
  if (editRegex.test(content)) {
      content = content.replace(editRegex, 'className="$1text-blue-500$2hover:text-blue-700');
      changed = true;
  }

  // Also replace standard text-gray-400 with text-blue-500 on anything that has title="Editar"
  const editTitleRegex = /className="([^"]*?)text-gray-[345]00([^"]*?)"([^>]*title="Editar")/g;
  if (editTitleRegex.test(content)) {
      content = content.replace(editTitleRegex, 'className="$1text-blue-500$2"$3');
      changed = true;
  }
  
  // Delete button pattern
  const deleteRegex = /className="([^"]*?)text-gray-[345]00([^"]*?)hover:text-red-[56]00/g;
  if (deleteRegex.test(content)) {
      content = content.replace(deleteRegex, 'className="$1text-red-500$2hover:text-red-700');
      changed = true;
  }

  // Also replace standard text-gray-400 with text-red-500 on anything that has title="Excluir"
  const deleteTitleRegex = /className="([^"]*?)text-gray-[345]00([^"]*?)"([^>]*title="Excluir")/g;
  if (deleteTitleRegex.test(content)) {
      content = content.replace(deleteTitleRegex, 'className="$1text-red-500$2"$3');
      changed = true;
  }
  
  // We should also remove the "Criado Por" column in RecursoFabricacao.tsx
  if (file.includes('RecursoFabricacao.tsx')) {
      const col1 = /<th[^>]*>Criado Por<\/th>/;
      const col2 = /<p[^>]*>\{recurso\.CriadoPor[\s\S]*?<\/p>\s*<p[^>]*>\{recurso\.DataCriacao[\s\S]*?<\/p>/;
      
      if (col1.test(content)) {
          content = content.replace(col1, '');
          changed = true;
          console.log('Removed Criado Por header');
      }
      if (col2.test(content)) {
          // Replace it with an empty string or comment out the td
          content = content.replace(/<td[^>]*>\s*<p[^>]*>\{recurso\.CriadoPor[\s\S]*?<\/p>\s*<p[^>]*>\{recurso\.DataCriacao[\s\S]*?<\/p>\s*<\/td>/, '');
          changed = true;
          console.log('Removed Criado Por cell');
      }
  }

  if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated ' + file.split('/').pop());
  }
});
