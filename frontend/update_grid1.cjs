const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// The Grid 1 header
// Find: <th className={colsCls}>Tipo</th> (only the first one!)
let firstTipoHeaderIdx = c.indexOf('<th className={colsCls}>Tipo</th>');
if (firstTipoHeaderIdx > -1) {
    c = c.substring(0, firstTipoHeaderIdx) + '<th className={colsCls}>Tipo</th>\n                        <th className={colsCls}>Manufat.</th>' + c.substring(firstTipoHeaderIdx + 33);
}

// The Grid 1 Row
// Find: title={d.TxtTipoDesenho||''}>{d.TxtTipoDesenho||'-'}</td>
let rowHtml = '<td className={`${cellCls} max-w-[70px]`} title={d.TxtTipoDesenho||\'\'}>{d.TxtTipoDesenho||\'-\'}</td>';
let replaceRowHtml = '<td className={`${cellCls} max-w-[70px]`} title={d.TxtTipoDesenho||\'\'}>{d.TxtTipoDesenho||\'-\'}</td>\n                          <td className={`${cellCls} text-center font-bold`} title={d.PecaManufat||\'\'}>{d.PecaManufat||\'-\'}</td>';

c = c.replace(rowHtml, replaceRowHtml);

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
console.log('Updated Grid 1 UI!');
