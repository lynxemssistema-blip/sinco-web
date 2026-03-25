const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'latin1');

// 1. Add filter parameter to GET /api/ordemservico
let searchBlock = `const search = req.query.search;`;
let replaceBlock = `const search = req.query.search;\n        const filter = req.query.filter || 'liberados';`;
content = content.replace(searchBlock, replaceBlock);

// Replace WHERE clause building
let whereBlock = `let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";\n        const params = [];`;
let newWhereBlock = `let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";\n        const params = [];\n\n        if (filter === 'liberados') {\n            whereClause += " AND Liberado_Engenharia = 'S' AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')";\n        }`;
content = content.replace(whereBlock, newWhereBlock);

// 2. Remove the blocks restricting Liberado_Engenharia
// We'll replace the regex pattern for the specific block.
const blockRegex = /if\s*\(os\.Liberado_Engenharia\s*===\s*'S'\)\s*\{\s*return\s*res\.status\(400\)\.json\(\{success:\s*false,\s*message:\s*[^}]+\}\);\s*\}/g;

content = content.replace(blockRegex, '/* Validation removed by user request to allow changes after Liberado_Engenharia */');

fs.writeFileSync('src/server.js', content, 'latin1');
console.log("server.js updated successfully.");
