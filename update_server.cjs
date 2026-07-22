const fs = require('fs');
let content = fs.readFileSync('src/server.js', 'utf-8');

const fields = ['Corte', 'Dobra', 'Solda', 'Pintura', 'Montagem', 'CorteaLaser', 'PULSIONADEIRA', 'GALVANIZAR'];

let newSelects = fields.map(f => `                  (SELECT MAX(CASE WHEN osi.txt${f} = '1' OR osi.txt${f} = 'S' THEN 1 ELSE 0 END) FROM ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico WHERE os.IdTag = tags.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')) as flag${f}`).join(',\n');

content = content.replace(/qtdetotal, Finalizado, qtdernc, PesoTotal, ProjetistaPlanejado, PlanejadoInicioEngenharia, PlanejadoFinalEngenharia,/, `qtdetotal, Finalizado, qtdernc, PesoTotal, ProjetistaPlanejado, PlanejadoInicioEngenharia, PlanejadoFinalEngenharia,\n${newSelects},`);

fs.writeFileSync('src/server.js', content);
