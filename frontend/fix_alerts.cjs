const fs = require('fs');

let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

if (!c.includes("import { useAlert }")) {
  c = c.replace(
    "import { useAuth } from '../contexts/AuthContext';", 
    "import { useAuth } from '../contexts/AuthContext';\nimport { useAlert } from '../contexts/AlertContext';"
  );
}

if (!c.includes("const { showAlert } = useAlert();")) {
  c = c.replace(
    "const { user, token } = useAuth();",
    "const { user, token } = useAuth();\n  const { showAlert } = useAlert();"
  );
}

c = c.replace(/alert\((.*?)\)/g, (match, msg) => {
  const m = msg.toLowerCase();
  let type = '"info"';
  if (m.includes('erro') || m.includes('obrigatório') || m.includes('inválida') || m.includes('já existe')) type = '"error"';
  if (m.includes('sucesso') || m.includes('atualizada')) type = '"success"';
  return `showAlert(${msg}, ${type})`;
});

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
console.log('Substituídos os alerts por showAlert');
