const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');
code = code.replace(
  'const { Motorista, CNH, Categoria, Telefone } = req.body;',
  'const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH } = req.body;'
);
code = code.replace(
  'INSERT INTO motorista (Motorista, DataCadastro, CNH, Categoria, Telefone, IdMatriz) VALUES (?, ?, ?, ?, ?, ?)',
  'INSERT INTO motorista (Motorista, DataCadastro, CNH, Categoria, Telefone, DataVencimentoCNH, IdMatriz) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
code = code.replace(
  '[Motorista, nowFormat, CNH || null, Categoria || null, Telefone || null, idMatriz]',
  '[Motorista, nowFormat, CNH || null, Categoria || null, Telefone || null, DataVencimentoCNH || null, idMatriz]'
);

// PUT route
code = code.replace(
  'const { Motorista, CNH, Categoria, Telefone } = req.body;',
  'const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH } = req.body;'
);
code = code.replace(
  'UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ? WHERE IdMotorista = ?',
  'UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ? WHERE IdMotorista = ?'
);
code = code.replace(
  '[Motorista, CNH || null, Categoria || null, Telefone || null, req.params.id]',
  '[Motorista, CNH || null, Categoria || null, Telefone || null, DataVencimentoCNH || null, req.params.id]'
);

fs.writeFileSync('src/server.js', code);
console.log('Backend properly patched for DataVencimentoCNH');
