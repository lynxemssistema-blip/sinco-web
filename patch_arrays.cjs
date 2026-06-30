const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

// Fix UPDATE
code = code.replace(
  /\[Motorista,\s*CNH\s*\|\|\s*'',\s*Categoria\s*\|\|\s*'',\s*Telefone\s*\|\|\s*'',\s*id\]/,
  "[Motorista, CNH || '', Categoria || '', Telefone || '', DataVencimentoCNH || null, id]"
);

// Fix INSERT
code = code.replace(
  /\[Motorista,\s*CNH\s*\|\|\s*'',\s*Categoria\s*\|\|\s*'',\s*Telefone\s*\|\|\s*'',\s*nowFormat\]/,
  "[Motorista, CNH || '', Categoria || '', Telefone || '', DataVencimentoCNH || null, nowFormat]"
);

fs.writeFileSync('src/server.js', code);
console.log('Regex patch applied');
