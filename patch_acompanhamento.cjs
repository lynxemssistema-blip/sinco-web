const fs = require('fs');

let path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/AcompanhamentoGeral.tsx';
let content = fs.readFileSync(path, 'utf8');

// Insert table header
let headerRegex = /<th className="px-2 py-2 text-center font-black tracking-wider uppercase border-r border-\[\#155A47\] w-24">Data Previsao<\/th>/;
let newHeader = `<th className="px-2 py-2 text-center font-black tracking-wider uppercase border-r border-[#155A47] w-24">Data Previsao</th>
  <th className="px-2 py-2 text-center font-black tracking-wider uppercase border-r border-[#155A47] w-20">Qtde Tags</th>`;
content = content.replace(headerRegex, newHeader);

// Insert table cell
let cellRegex = /<\/div>\s*<\/td>\s*\{setoresAtivos\.map\(s => \(/;
let newCell = `</div>
  </td>
  <td className="px-2 py-2 text-center border-r border-slate-100 font-black text-slate-700">
    {p.QtdeTags || 0}
  </td>
  {setoresAtivos.map(s => (`
content = content.replace(cellRegex, newCell);

fs.writeFileSync(path, content);
console.log('AcompanhamentoGeral patched.');
