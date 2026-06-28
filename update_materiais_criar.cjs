const fs = require('fs');
let c = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');

c = c.replace(
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\n                       AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')",
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\n                       AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')\n                       AND (PecaManufat IS NULL OR TRIM(UPPER(PecaManufat)) != 'S')"
);
c = c.replace(
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\r\n                       AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')",
  "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\r\n                       AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')\r\n                       AND (PecaManufat IS NULL OR TRIM(UPPER(PecaManufat)) != 'S')"
);

fs.writeFileSync('src/routes/pecaManufaturada.js', c);
console.log('Updated materiais-criar SQL!');
