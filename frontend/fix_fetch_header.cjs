const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  "fetch('/api/recursos', { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') } })",
  "fetch('/api/recursos')"
);

fs.writeFileSync(file, txt);
console.log('Fixed fetch headers');
