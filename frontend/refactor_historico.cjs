const fs = require('fs');

const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/RomaneioRetorno.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change HistoricoControleView container & header
content = content.replace(
    /<div className="flex-1 flex flex-col min-h-0 bg-gray-50">([\s\S]*?)<header className="bg-white border-b border-gray-200 px-2 py-0.5 shadow-sm flex items-center gap-3">\s*<button\s*onClick=\{onBack\}\s*className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-\[#32423D\] text-white text-xs font-medium hover:bg-\[#26312D\] transition-colors"\s*>\s*<ArrowLeft size=\{14\} \/>\s*Voltar\s*<\/button>/g,
    `<div className="flex flex-col bg-white border border-indigo-200 rounded-lg shadow-inner overflow-hidden mb-2 relative">
 {/* Cabeçalho da sub-view */}
 <header className="bg-indigo-50 border-b border-indigo-100 px-3 py-2 flex items-center gap-3">
 <button
 onClick={onBack}
 className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
 >
 <X size={12} />
 Fechar
 </button>`
);

// Remove the early return
content = content.replace(
    / \/\/ Se estiver na sub-view de histórico, renderiza ela\s*if \(historicoItem\) \{\s*return <HistoricoControleView item=\{historicoItem\} onBack=\{\(\) => setHistoricoItem\(null\)\} \/>;\s*\}/g,
    ` // Removido o early return do histórico para renderização inline`
);

// In the map function, change it to return a React.Fragment
content = content.replace(
    /(\s*)(\}\) :\s*items\.map\(\(item\) => \(\s*)(<tr\s*key=\{item\.IdRomaneioItem\})/g,
    `$1$2<React.Fragment key={item.IdRomaneioItem}>
$1  $3`
);

content = content.replace(
    /(\s*)<\/tr>\s*\)\)}\s*<\/tbody>/g,
    `$1</tr>
$1{historicoItem?.IdRomaneioItem === item.IdRomaneioItem && (
$1  <tr>
$1    <td colSpan={10} className="p-0 bg-gray-100/50 border-b-2 border-indigo-200">
$1      <div className="p-2 animate-in slide-in-from-top-2 duration-200">
$1        <HistoricoControleView item={historicoItem} onBack={() => setHistoricoItem(null)} />
$1      </div>
$1    </td>
$1  </tr>
$1)}
$1</React.Fragment>
$1)))}
$1</tbody>`
);

// One more small fix to HistoricoControleView height since it's inline now
// change `<main className="flex-1 overflow-auto p-4">` to have a max height
content = content.replace(
    /<main className="flex-1 overflow-auto p-4">/g,
    `<main className="max-h-[350px] overflow-auto p-3">`
);


fs.writeFileSync(path, content);
console.log('Done replacing inline historico logic.');
