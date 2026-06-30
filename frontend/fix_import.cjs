const fs = require('fs');
let code = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', 'utf8');

code = "import { useAuth } from '../contexts/AuthContext';\n" + code;

fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RecursoFabricacao.tsx', code);
console.log('RecursoFabricacao import patched');
