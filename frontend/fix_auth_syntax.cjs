const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// The block has `return (` in it. Let's find it.
code = code.replace(/const unauthorizedError = \(\!user \|\| \(user\.role \!\=\= 'admin' \&\& user\.mapaProducao \!\=\= 'S' \&\& \!user\.isSuperadmin \&\& user\.superadmin \!\=\= 'S'\)\) \? \(\r?\n\s*return \(/g, "const unauthorizedError = (!user || (user.role !== 'admin' && user.mapaProducao !== 'S' && !user.isSuperadmin && user.superadmin !== 'S')) ? (");

// And it has `);` before `) : null;`
code = code.replace(/\);\r?\n\s*\) \: null;/g, ") : null;");

fs.writeFileSync(filePath, code);
console.log('Fixed syntax error inside unauthorizedError');
