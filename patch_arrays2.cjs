const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');

// Fix PUT query
code = code.replace(
  /"UPDATE motorista SET Motorista = \?, CNH = \?, Categoria = \?, Telefone = \?, DataVencimentoCNH = \? WHERE IdMotorista = \?",\s*\[Motorista, CNH \|\| '', Categoria \|\| '', Telefone \|\| '', DataVencimentoCNH \|\| null, id\]/g,
  '"UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ?, ImagemCNH = ? WHERE IdMotorista = ?",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, ImagemCNH || null, id]'
);

// Fix INSERT query just in case it also failed!
code = code.replace(
  /"INSERT INTO motorista \(Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, DataCadastro\) VALUES \(\?, \?, \?, \?, \?, \?\)",\s*\[Motorista, CNH \|\| '', Categoria \|\| '', Telefone \|\| '', DataVencimentoCNH \|\| null, nowFormat\]/g,
  '"INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH, DataCadastro) VALUES (?, ?, ?, ?, ?, ?, ?)",\n              [Motorista, CNH || \'\', Categoria || \'\', Telefone || \'\', DataVencimentoCNH || null, ImagemCNH || null, nowFormat]'
);

fs.writeFileSync('src/server.js', code);
console.log('Regex applied to fix ImagemCNH updates');
