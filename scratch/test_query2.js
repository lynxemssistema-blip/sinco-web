const mysql = require('mysql2/promise');
mysql.createConnection({
    host: 'lynxlocal.mysql.uhserver.com',
    user: 'lynxlocal',
    password: 'jHAzhFG848@yN@U',
    database: 'lynxlocal'
}).then(c => {
    console.time('query');
    c.execute(`
        SELECT osi.IdOrdemServicoItem, osi.IdOrdemServico, 
        COALESCE(history.QtdeProduzidaHistory, 0) as QtdeProduzidaHistory 
        FROM ordemservicoitem osi 
        INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico 
        LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto 
        LEFT JOIN (
            SELECT IdOrdemServicoItem, COALESCE(SUM(CAST(QtdeProduzida AS UNSIGNED)), 0) as QtdeProduzidaHistory
            FROM ordemservicoitemcontrole
            WHERE Processo = 'corte'
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
            GROUP BY IdOrdemServicoItem
        ) history ON history.IdOrdemServicoItem = osi.IdOrdemServicoItem
        WHERE osi.txtcorte = '1' 
          AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*') 
          AND osi.Liberado_engenharia = 'S' 
          AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*') 
        ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem 
        LIMIT 300
    `).then(([r]) => console.log('Returned rows:', r.length))
      .catch(console.error)
      .finally(() => { console.timeEnd('query'); c.end(); });
});
