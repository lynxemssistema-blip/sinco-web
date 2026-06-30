const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');

// Fix INSERT
code = code.replace(
  '"INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataCadastro) VALUES (?, ?, ?, ?, ?)",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', nowFormat]',
  '"INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, DataCadastro) VALUES (?, ?, ?, ?, ?, ?)",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, nowFormat]'
);

// Fix UPDATE array
code = code.replace(
  '"UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ? WHERE IdMotorista = ?",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', id]',
  '"UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ? WHERE IdMotorista = ?",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, id]'
);

fs.writeFileSync('src/server.js', code);
console.log('Fixed motorista backend query arrays');
