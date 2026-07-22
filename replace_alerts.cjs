const fs = require('fs');
const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace alerts in handleAddProc
content = content.replace(/alert\('Tempo Padrão \(min\) obrigatório'\);/g, "showAlert('Tempo Padrão (min) obrigatório', 'error');");
content = content.replace(/alert\(`Recurso já cadastrado nesta peça`\);/g, "showAlert('Recurso já cadastrado nesta peça', 'error');");
content = content.replace(/alert\(`Sequência \$\{seqN\} já existe`\);/g, "showAlert(`Sequência ${seqN} já existe`, 'error');");

// Also replace in removeComp just in case
content = content.replace(/alert\(j\.message \|\| 'Erro ao remover item'\);/g, "showAlert(j.message || 'Erro ao remover item', 'error');");
content = content.replace(/alert\('Erro de comunicação ao excluir item\.'\);/g, "showAlert('Erro de comunicação ao excluir item.', 'error');");


fs.writeFileSync(file, content, 'utf8');
console.log('Replaced alerts with showAlert');
