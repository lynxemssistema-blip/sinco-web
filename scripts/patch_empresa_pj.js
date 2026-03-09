const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Replace both occurrences of the lookup SQL block in POST and PUT:
// FROM: 
// const [empRows] = await pool.execute('SELECT IdEmpresa, Descricao FROM empresa WHERE Descricao = ? LIMIT 1', [data.ClienteProjeto]);
// if (empRows && empRows.length > 0) {
//     idEmpresa = empRows[0].IdEmpresa;
//     descEmpresa = empRows[0].Descricao;
// }
//
// TO:
// const [empRows] = await pool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE NomeFantasia = ? LIMIT 1', [data.ClienteProjeto]);
// if (empRows && empRows.length > 0) {
//     idEmpresa = empRows[0].IdPessoa;
//     descEmpresa = empRows[0].NomeFantasia;
// }

const searchStr = \`const [empRows] = await pool.execute('SELECT IdEmpresa, Descricao FROM empresa WHERE Descricao = ? LIMIT 1', [data.ClienteProjeto]);
             if (empRows && empRows.length > 0) {
                 idEmpresa = empRows[0].IdEmpresa;
                 descEmpresa = empRows[0].Descricao;
             }\`;

const replaceStr = \`const [empRows] = await pool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE NomeFantasia = ? LIMIT 1', [data.ClienteProjeto]);
             if (empRows && empRows.length > 0) {
                 idEmpresa = empRows[0].IdPessoa;
                 descEmpresa = empRows[0].NomeFantasia;
             }\`;

// Split by search string to ensure we replace all occurrences
const parts = code.split(searchStr);
if (parts.length > 1) {
    code = parts.join(replaceStr);
    fs.writeFileSync(serverFile, code, 'utf8');
    console.log(\`Substituídas \${parts.length - 1} ocorrências do lookup de empresa por pessoajuridica.\`);
} else {
    console.log("Trecho de busca de empresa não encontrado no arquivo.");
}
