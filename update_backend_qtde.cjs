const fs = require('fs');
const p = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/routes/pecaManufaturada.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'VALUES (?, ?, 1, ?, ?, \'\', ?, ?, \'\', \'\', ?, ?, ?, ?, NOW())`,',
  'VALUES (?, ?, ?, ?, ?, \'\', ?, ?, \'\', \'\', ?, ?, ?, ?, NOW())`,'
);
c = c.replace(
  '[mat.FamiliaMat || 0, mat.IdMaterial, dezenho.IdMaterial,',
  '[mat.FamiliaMat || 0, mat.IdMaterial, (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, dezenho.IdMaterial,'
);
fs.writeFileSync(p, c);
console.log('Fixed backend insert');
