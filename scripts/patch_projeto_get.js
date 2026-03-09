const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Modificar SELECT do GET /api/projeto para incluir liberado e DataLiberacao
code = code.replace(
    'DataCriacao, CriadoPor, Finalizado, DescEmpresa',
    'DataCriacao, CriadoPor, Finalizado, DescEmpresa, liberado, DataLiberacao'
);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Select de Projetos modificado.');
