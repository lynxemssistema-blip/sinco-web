const fs = require('fs');
const path = require('path');

let f5 = path.join(__dirname, 'src', 'pages', 'MontagemPlanoCorte.tsx');
let c5 = fs.readFileSync(f5, 'utf8');

c5 = c5.replace(/interface Rnc \{\r?\n\s*IdRnc: number;\r?\n\s*Estatus: string;\r?\n\s*Tag: string;\r?\n\}/g, '');

c5 = c5.replace(/\}, \[fEsp, fProjeto, fCod, fTag, fMat, fOS\]\);/g, '}, [fEsp, fProjeto, fCod, fTag, fMat, fOS]); // eslint-disable-line react-hooks/exhaustive-deps');
c5 = c5.replace(/\}, \[\]\);/g, '}, []); // eslint-disable-line react-hooks/exhaustive-deps');

fs.writeFileSync(f5, c5);
console.log('Fixed Lote 3 - 4');
