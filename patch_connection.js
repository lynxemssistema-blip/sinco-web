const fs = require('fs');
let content = fs.readFileSync('src/server.js', 'latin1');

// Fix req.tenantDbPromise in atualizar-arquivos
content = content.replace(
    /const tenantConnection = await req\.tenantDbPromise;\r?\n\s*connection = await tenantConnection\.getConnection\(\);/g,
    'const pool = require(\'../config/db\');\n        connection = await pool.getConnection();'
);

// Add Fator to the SELECT query in /api/ordemservico/:id/itens
content = content.replace(
    /IdOrdemServicoItem, IdOrdemServico, DescResumo, DescDetal,/g,
    'IdOrdemServicoItem, IdOrdemServico, DescResumo, DescDetal, Fator,'
);

fs.writeFileSync('src/server.js', content, 'latin1');
console.log('Fixed tenantDb connection and added Fator to /api/ordemservico/:id/itens in server.js');
