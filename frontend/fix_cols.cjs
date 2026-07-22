const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
let txt = fs.readFileSync(file, 'utf8');

const lines = txt.split('\n');
lines[2734] = ` <td className="px-2 py-1 font-medium bg-gray-50">{p.IdOrdemServico || selectedItem?.IdOrdemServico || '-'}</td>`;
lines[2735] = ` <td className="px-2 py-1 font-medium bg-gray-50">{p.IdOrdemServicoItem || selectedItem?.IdOrdemServicoItem || '-'}</td>`;

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed ApontamentoProducao.tsx columns');
