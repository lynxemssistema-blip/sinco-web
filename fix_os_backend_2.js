const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'latin1');

let whereRegex = /let whereClause = "\([^"]+\)";\r?\n\s*const params = \[\];/;
let newWhereBlock = `let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";
        const params = [];

        if (filter === 'liberados') {
            whereClause += " AND Liberado_Engenharia = 'S' AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')";
        }`;

// Replace the first match of whereClause after "const filter = req.query.filter"
content = content.replace(whereRegex, newWhereBlock);

fs.writeFileSync('src/server.js', content, 'latin1');
console.log("server.js updated successfully.");
