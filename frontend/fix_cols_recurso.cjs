const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducaoRecurso.tsx';
let txt = fs.readFileSync(file, 'utf8');

const target = ` <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>\r\n \r\n \r\n <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>`;
const target2 = ` <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>\n \n \n <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>`;
const replacement = ` <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>
 <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServico || selectedItem?.IdOrdemServico || '-'}</td>
 <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServicoItem || selectedItem?.IdOrdemServicoItem || '-'}</td>
 <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>`;

if (txt.includes(target)) {
  txt = txt.replace(target, replacement);
} else if (txt.includes(target2)) {
  txt = txt.replace(target2, replacement);
} else {
  console.log('Target not found, trying line array index');
  const lines = txt.split('\n');
  lines[2739] = ` <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServico || selectedItem?.IdOrdemServico || '-'}</td>`;
  lines[2740] = ` <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServicoItem || selectedItem?.IdOrdemServicoItem || '-'}</td>`;
  txt = lines.join('\n');
}

fs.writeFileSync(file, txt);
console.log('Fixed ApontamentoProducaoRecurso.tsx columns');
