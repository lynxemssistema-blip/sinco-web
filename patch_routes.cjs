const fs = require('fs');

let code = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');

// 1. GET /desenhos-criar
// Removendo: AND (PecaManufat IS NULL OR TRIM(UPPER(PecaManufat)) != 'S')
code = code.replace(
    /WHERE \(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''\)\s*AND \(PecaManufat IS NULL OR TRIM\(UPPER\(PecaManufat\)\) != 'S'\)/g,
    "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')"
);

// 2. GET /materiais-criar
// Removendo: AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')
code = code.replace(
    /WHERE \(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''\)\s*AND \(EnderecoArquivo IS NULL OR EnderecoArquivo = ''\)/g,
    "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')"
);

// 3. GET /composicao/:idMaterialPeca
// Adicionando m.PecaManufat
code = code.replace(
    /mp\.PecaQtde,\s*m\.EnderecoArquivo\s*FROM/g,
    "mp.PecaQtde,\n                        m.EnderecoArquivo,\n                        m.PecaManufat\n                     FROM"
);

fs.writeFileSync('src/routes/pecaManufaturada.js', code);
console.log('Rotas backend atualizadas com sucesso.');
