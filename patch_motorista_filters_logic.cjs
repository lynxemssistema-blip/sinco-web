const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/Motorista.tsx', 'utf8');

// 1. Add state variables for Vencimento filter
if (!code.includes('filterVencimentoStart')) {
  code = code.replace(
    "const [searchNome, setSearchNome] = useState('');",
    "const [searchNome, setSearchNome] = useState('');\n  const [filterVencimentoStart, setFilterVencimentoStart] = useState('');\n  const [filterVencimentoEnd, setFilterVencimentoEnd] = useState('');"
  );
}

// 2. Update filteredMotoristas logic
const filterLogicNew = `const filteredMotoristas = motoristas.filter(motorista => {
    let match = true;
    
    if (searchNome && !motorista.Motorista.toLowerCase().includes(searchNome.toLowerCase())) {
      match = false;
    }
    
    if (filterVencimentoStart || filterVencimentoEnd) {
      if (!motorista.DataVencimentoCNH) {
        match = false;
      } else {
        const motoristaDate = new Date(motorista.DataVencimentoCNH + 'T12:00:00');
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

if (code.includes('const filteredMotoristas = motoristas.filter(motorista => {') && !code.includes('filterVencimentoStart || filterVencimentoEnd')) {
  code = code.replace(
    /const filteredMotoristas = motoristas\.filter\(motorista => \{[\s\S]*?\}\);/g,
    filterLogicNew
  );
}

fs.writeFileSync('frontend/src/pages/Motorista.tsx', code);
console.log('Filters state logic added successfully');
