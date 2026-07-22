const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/VisaoGeralPendencias.tsx';
let content = fs.readFileSync(file, 'utf8');

const linesToRemove = [
  '<th className="px-2 py-0.5">ID Material</th>',
  '<th className="px-2 py-0.5">Desc Resumo</th>',
  '<th className="px-2 py-0.5">Endereço Arquivo</th>',
  "{sv('corte') && <th className=\"px-2 py-0.5\">Corte</th>}",
  "{sv('dobra') && <th className=\"px-2 py-0.5\">Dobra</th>}",
  "{sv('solda') && <th className=\"px-2 py-0.5\">Solda</th>}",
  "{sv('pintura') && <th className=\"px-2 py-0.5\">Pintura</th>}",
  "{sv('montagem') && <th className=\"px-2 py-0.5\">Montagem</th>}",
  '<th className="px-2 py-0.5">Data Acerto Proj</th>',
  '<th className="px-2 py-0.5">RNC Imagens</th>',
  '<th className="px-2 py-0.5">Controle Email</th>',
  '<th className="px-2 py-0.5">Ações</th>',
  
  '<td className="px-2 py-0.5 font-mono text-slate-600">{item.IdMaterial || \'—\'}</td>',
  '<td className="px-2 py-0.5 text-[10px] text-slate-800 truncate max-w-[150px]" title={item.DescResumo}>{item.DescResumo || \'—\'}</td>',
  '<td className="px-2 py-0.5 text-[10px] text-[#32423D] max-w-[100px] truncate" title={item.EnderecoArquivo}>{item.EnderecoArquivo ? \'Sim\' : \'—\'}</td>',
  "{sv('corte') && <td className=\"px-2 py-0.5 text-[10px] text-slate-600\">{item.txtCorte || '—'}</td>}",
  "{sv('dobra') && <td className=\"px-2 py-0.5 text-[10px] text-slate-600\">{item.txtdobra || '—'}</td>}",
  "{sv('solda') && <td className=\"px-2 py-0.5 text-[10px] text-slate-600\">{item.txtSolda || '—'}</td>}",
  "{sv('pintura') && <td className=\"px-2 py-0.5 text-[10px] text-slate-600\">{item.txtPintura || '—'}</td>}",
  "{sv('montagem') && <td className=\"px-2 py-0.5 text-[10px] text-slate-600\">{item.txtMontagem || '—'}</td>}",
  '<td className="px-2 py-0.5 text-[10px] text-slate-500 font-mono">{item.DataAcertoProjeto || \'—\'}</td>',
  '<td className="px-2 py-0.5 text-[10px] text-slate-600">{item.RNCImagens ? \'Tem img\' : \'—\'}</td>',
  '<td className="px-2 py-0.5 text-[10px] text-slate-600">{item.ControleEnvioEmail || \'—\'}</td>',
];

let lines = content.split('\\n');
lines = lines.filter(line => {
    return !linesToRemove.some(r => line.includes(r));
});

let i = 0;
while(i < lines.length) {
    if (lines[i].includes('<td className="px-2 py-0.5 text-right">') && 
        lines[i+1].includes('<button') &&
        lines[i+2].includes('<Eye') &&
        lines[i+3].includes('</button>') &&
        lines[i+4].includes('</td>')) {
        lines.splice(i, 5);
    } else {
        i++;
    }
}
content = lines.join('\\n');

fs.writeFileSync(file, content);
console.log('Removed columns from VisaoGeralPendencias');
