const fs = require('fs');
let content = fs.readFileSync('src/server.js', 'utf8');

content = content.replace(
    /p\.DataTermino\s+FROM tags t\s+LEFT JOIN projetos p ON t\.IdProjeto = p\.IdProjeto\s+WHERE \(t\.Finalizado IS NULL OR t\.Finalizado = ''\)\s+AND \(t\.D_E_L_E_T_E IS NULL OR t\.D_E_L_E_T_E != '\*'\)/,
    "p.DataTermino, p.Finalizado AS ProjFinalizado, p.liberado AS ProjLiberado\n            FROM tags t\n            LEFT JOIN projetos p ON t.IdProjeto = p.IdProjeto\n            WHERE (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E != '*')"
);

fs.writeFileSync('src/server.js', content, 'utf8');
console.log('Fixed visao-geral-engenharia endpoint');
