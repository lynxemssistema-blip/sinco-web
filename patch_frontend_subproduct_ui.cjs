const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// 1. Remove onClick from tr and add Settings button to td
const oldTrMatch = code.match(/<tr key=\{c\.IdMontaPeca\} className=\{\`hover:bg-red-50\/30 group cursor-pointer \$\{activeProcCode === c\.CodMatFabricante \? 'bg-indigo-50\/50' : ''\}\`\}[\s\S]*?<td className="p-1 px-1 text-center" onClick=\{e => e\.stopPropagation\(\)\}>[\s\S]*?<\/td>/);

if (oldTrMatch) {
    const newTr = `<tr key={c.IdMontaPeca} className={\`hover:bg-red-50/30 group \${activeProcCode === c.CodMatFabricante ? 'bg-indigo-50/50' : ''}\`}>
                        <td className="p-1 px-1 text-center flex flex-nowrap items-center">
                          <button onClick={()=>removeComp(c.IdMontaPeca)} className="p-0.5 text-red-300 hover:text-red-600 rounded" title="Excluir"><Trash2 size={11}/></button>
                          <button onClick={()=>abrirPdf(c.EnderecoArquivo||'')} className="p-0.5 text-red-400 hover:text-red-600 rounded ml-0.5" title="Abrir Desenho PDF"><FileText size={11}/></button>
                          {(c.PecaManufat === 'S' || c.PecaManufat === 's') && (
                            <button onClick={(e) => { e.stopPropagation(); setActiveProcCode(c.CodMatFabricante); fetchProcs(c.CodMatFabricante); }} className="p-0.5 text-indigo-400 hover:text-indigo-600 rounded ml-0.5" title="Ver Processos do Subproduto"><Settings size={11}/></button>
                          )}
                        </td>`;
    code = code.replace(oldTrMatch[0], newTr);
} else {
    console.log("Could not find TR match");
}

// 2. Add 'Voltar ao Produto Raiz' button in Grid 2 header
const grid2HeaderRegex = /<div className="px-3 py-2 bg-teal-50\/70 border-b border-teal-100 shrink-0 flex items-center gap-2">[\s\S]*?<\/div>/;
const match2 = code.match(grid2HeaderRegex);

if (match2) {
    const oldHeader = match2[0];
    const newHeader = `<div className="px-3 py-2 bg-teal-50/70 border-b border-teal-100 shrink-0 flex items-center gap-2">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Processos {activeProcCode ? \`- \${activeProcCode}\` : ''}</span>
                <span className="text-[9px] text-teal-600">{staging.length} processo(s)</span>
                {activeProcCode&&<button onClick={()=>fetchProcs(activeProcCode)} className="p-0.5 text-teal-500 hover:text-teal-700" title="Atualizar"><RefreshCw size={11}/></button>}
                {(activeProcCode && piece && activeProcCode !== piece.CodMatFabricante) && (
                  <button onClick={() => { setActiveProcCode(piece.CodMatFabricante); fetchProcs(piece.CodMatFabricante); }} className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded hover:bg-blue-200 border border-blue-200">
                    Voltar ao Produto Raiz
                  </button>
                )}
              </div>`;
    code = code.replace(oldHeader, newHeader);
} else {
    console.log("Could not find Grid 2 Header");
}

// Also import Settings icon from lucide-react if not present
if (!code.includes('Settings')) {
    code = code.replace('import { Search, Loader2, Save, Trash2, Plus, RefreshCw, FileText, X', 'import { Search, Loader2, Save, Trash2, Plus, RefreshCw, FileText, X, Settings');
}

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', code);
console.log('UI patch for subproduct edit logic applied.');
