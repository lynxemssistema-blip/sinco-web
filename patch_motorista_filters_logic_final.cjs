const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

const regex = /const filteredMotoristas = motoristas\.filter\(m => \{\s*return !searchNome \|\| m\.Motorista\?\.toLowerCase\(\)\.includes\(searchNome\.toLowerCase\(\)\);\s*\}\);/g;

const newLogic = `const filteredMotoristas = motoristas.filter(m => {
    let match = true;
    
    if (searchNome && !m.Motorista?.toLowerCase().includes(searchNome.toLowerCase())) {
      match = false;
    }
    
    if (filterVencimentoStart || filterVencimentoEnd) {
      if (!m.DataVencimentoCNH) {
        match = false;
      } else {
        const motoristaDate = new Date(m.DataVencimentoCNH + 'T12:00:00');
        if (filterVencimentoStart) {
          const startDate = new Date(filterVencimentoStart + 'T12:00:00');
          if (motoristaDate < startDate) match = false;
        }
        if (filterVencimentoEnd) {
          const endDate = new Date(filterVencimentoEnd + 'T12:00:00');
          if (motoristaDate > endDate) match = false;
        }
      }
    }
    
    return match;
  });`;

if (code.match(regex)) {
  code = code.replace(regex, newLogic);
  fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
  console.log('Filtered logic replaced successfully');
} else {
  console.log('Regex match failed');
}
