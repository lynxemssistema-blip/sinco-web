const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// The new INSERT should include IdEmpresa.
code = code.replace(
    'Descricao, DataCriacao, CriadoPor, EnderecoProjeto,',
    'Descricao, DataCriacao, CriadoPor, EnderecoProjeto, IdEmpresa,'
);

code = code.replace(
    'DataEntradaPedido, DataPlanejadoFinanceiro\\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    'DataEntradaPedido, DataPlanejadoFinanceiro\\n            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

code = code.replace(
    'formatBR(data.EntradaPedido), // Campo novo\\n                formatBR(data.PlanejadoFinanceiro) // Campo novo\\n            ]',
    'formatBR(data.EntradaPedido), // Campo novo\\n                formatBR(data.PlanejadoFinanceiro), // Campo novo\\n                data.IdEmpresa || 7\\n            ]'
);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('IdEmpresa adicionado no backend.');
