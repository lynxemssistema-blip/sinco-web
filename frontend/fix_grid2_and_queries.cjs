const fs = require('fs');

// 1. Update Backend
const pBackend = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/routes/pecaManufaturada.js';
let cB = fs.readFileSync(pBackend, 'utf8');

// Fix /desenhos-criar
cB = cB.replace(
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\n                       AND EnderecoArquivo IS NOT NULL AND EnderecoArquivo <> ''`;",
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\n                       AND (PecaManufat IS NULL OR PecaManufat <> 'S')`;"
);

// Fix /materiais-criar to exclude the selected drawing itself
// Find where params are populated in /materiais-criar
if(cB.includes("let sql = `SELECT IdMaterial")) {
    const splitStr = "router.get('/materiais-criar', async (req, res) => {";
    const parts = cB.split(splitStr);
    if(parts.length > 1) {
        let routeCode = parts[1];
        routeCode = routeCode.replace(
            "const params = [idDesenho];",
            "sql += ` AND IdMaterial <> ?`;\n          const params = [idDesenho, idDesenho];"
        );
        cB = parts[0] + splitStr + routeCode;
    }
}
fs.writeFileSync(pBackend, cB);

// 2. Update Frontend
const pFront = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/MontaPecaManufaturada.tsx';
let cF = fs.readFileSync(pFront, 'utf8');

// Remove Qtde from Grid 1
cF = cF.replace(
  '<th className={colsCls}>Tipo</th>\n                      <th className={colsCls}>Qtde</th>',
  '<th className={colsCls}>Tipo</th>'
);

// Add Qtde to Grid 2
cF = cF.replace(
  '<th className={colsCls}>Mat.SW</th>\n                      <th className={colsCls}>Tipo</th>',
  '<th className={colsCls}>Mat.SW</th>\n                      <th className={colsCls}>Tipo</th>\n                      <th className={colsCls}>Qtd.</th>'
);

fs.writeFileSync(pFront, cF);
console.log('Fixes applied successfully');
