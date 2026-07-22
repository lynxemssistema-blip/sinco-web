const fs = require('fs');
const file = 'src/routes/pecaManufaturada.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /`INSERT INTO montapeca\s*\([^)]*\)\s*VALUES\s*\([^)]*\)`,\s*\[([^\]]*)\]/g;

content = content.replace(regex, (match, args) => {
    return `\`INSERT INTO montapeca
                 (TipoPeca, IdMaterial, PecaQtde, QtdeUnitaria, IdMaterialPeca, IdEmpresa, D_E_L_E_T_E,
                  Peso, Valor, UsuarioD_E_L_E_T_E, DataD_E_L_E_T_E, CodMatFabricante,
                  CodMatFabricantePeca, IdMatriz, UsuarioCriacao, DataCriacao)
                 VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '', '', ?, ?, ?, ?, NOW())\`,
                [mat.FamiliaMat || 0, mat.IdMaterial, 
                 (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, 
                 (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, 
                 dezenho.IdMaterial,
                 mat.IdEmpresa || 0, mat.Peso || 0, mat.Valor || 0,
                 cod, codMatFabricantePeca, idMatriz, usuario || 'Sistema']`;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
