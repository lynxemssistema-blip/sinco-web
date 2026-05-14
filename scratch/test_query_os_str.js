const mysql = require('mysql2/promise');
mysql.createConnection({
    host: 'lynxlocal.mysql.uhserver.com',
    user: 'lynxlocal',
    password: 'jHAzhFG848@yN@U',
    database: 'lynxlocal'
}).then(c => {
    c.query(`
        SELECT os.IdOrdemServico, os.Descricao 
        FROM ordemservico os
        LEFT JOIN projetos p ON p.IdProjeto = ?
        WHERE (os.IdProjeto = ? OR (os.Projeto = p.Projeto AND p.Projeto IS NOT NULL AND p.Projeto != ''))
          AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
        ORDER BY os.IdOrdemServico
    `, ['15', '15'])
    .then(([r]) => console.log('Rows:', r))
    .catch(console.error)
    .finally(() => c.end());
});
