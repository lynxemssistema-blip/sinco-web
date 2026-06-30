const fs = require('fs');
let code = fs.readFileSync('src/server.js', 'utf8');

code = code.replace(
  /app\.put\('\/api\/motoristas\/:id', tenantMiddleware, async \(req, res\) => \{\s*const \{ id \} = req\.params;\s*const \{ Motorista, CNH, Categoria, Telefone, DataVencimentoCNH \} = req\.body;/g,
  "app.put('/api/motoristas/:id', tenantMiddleware, async (req, res) => {\n    const { id } = req.params;\n    const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH } = req.body;"
);

fs.writeFileSync('src/server.js', code);
console.log('Fixed PUT request destructuring');
