const fs = require('fs');
const { execSync } = require('child_process');

console.log("Checking out file...");
execSync('git checkout frontend/src/pages/MontaPecaManufaturada.tsx');

let file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. MatRow interface
code = code.replace(
  'DescDetal?:string; PecaManufat?:string; }',
  'DescDetal?:string; PecaManufat?:string; AreaPintura?:any; Unidade?:string; Altura?:any; Largura?:any; Qtde?:any; }'
);

// 2. removeComp payload (for both removeComp and removeCompManut just in case)
code = code.replace(
  "body:JSON.stringify({usuario})});",
  "body:JSON.stringify({usuario, idMatriz})});"
);

code = code.replace(
  "body:JSON.stringify({usuario: uCriacao})});",
  "body:JSON.stringify({usuario: uCriacao, idMatriz})});"
);

// 3. Inputs onChange (only in the Modal block, we will just find the exact strings)
const oldInputCod = `<input value={filtroManutCod} onChange={e=>setFiltroManutCod(e.target.value)}`;
const newInputCod = `<input value={filtroManutCod} onChange={e=>{
                      const v = e.target.value;
                      setFiltroManutCod(v);
                      if (!v && !filtroManutDesc) {
                        setMaterialManutSel(null);
                        setCompManutSel([]);
                        setExpandedItemManut(null);
                      }
                    }}`;
code = code.replace(oldInputCod, newInputCod);

const oldBtnCod = `<button onClick={()=>setFiltroManutCod('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
const newBtnCod = `<button onClick={()=>{
                      setFiltroManutCod('');
                      if (!filtroManutDesc) {
                        setMaterialManutSel(null);
                        setCompManutSel([]);
                        setExpandedItemManut(null);
                      }
                    }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
code = code.replace(oldBtnCod, newBtnCod);

const oldInputDesc = `<input value={filtroManutDesc} onChange={e=>setFiltroManutDesc(e.target.value)}`;
const newInputDesc = `<input value={filtroManutDesc} onChange={e=>{
                      const v = e.target.value;
                      setFiltroManutDesc(v);
                      if (!v && !filtroManutCod) {
                        setMaterialManutSel(null);
                        setCompManutSel([]);
                        setExpandedItemManut(null);
                      }
                    }}`;
code = code.replace(oldInputDesc, newInputDesc);

const oldBtnDesc = `<button onClick={()=>setFiltroManutDesc('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
const newBtnDesc = `<button onClick={()=>{
                      setFiltroManutDesc('');
                      if (!filtroManutCod) {
                        setMaterialManutSel(null);
                        setCompManutSel([]);
                        setExpandedItemManut(null);
                      }
                    }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
code = code.replace(oldBtnDesc, newBtnDesc);

// 4. Details Panel
const targetHtml = `                        </tbody>\n                      </table>\n                    )}`;
const detailsPanel = `
                    {materialManutSel && (
                      <div className="m-3 p-3 bg-gradient-to-br from-indigo-50 to-white rounded-md border border-indigo-100 shadow-sm shrink-0">
                        <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-100 pb-1 mb-2">Detalhes do Material</div>
                        <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Espessura</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Espessura||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Área Pint.</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.AreaPintura||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Peso</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Peso||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Unidade</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Unidade||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Altura</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Altura||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Largura</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Largura||'-'}</div></div>
                          <div><div className="text-[9px] text-gray-400 uppercase font-bold">Qtde</div><div className="text-[11px] font-medium text-gray-800">{materialManutSel.Qtde||'-'}</div></div>
                        </div>
                      </div>
                    )}`;
// Find the second occurrence of this (the one in the Manutencao modal)
let firstIdx = code.indexOf(targetHtml);
let secondIdx = code.indexOf(targetHtml, firstIdx + 10);
if (secondIdx !== -1) {
  code = code.substring(0, secondIdx) + targetHtml + detailsPanel + code.substring(secondIdx + targetHtml.length);
} else {
  console.log("Could not find second table to append details panel to!");
}

// 5. Layout transformation

const gridStartStr = '{/* Grid 1: Materiais */}';
let preReturn = code.substring(0, code.indexOf('  return ('));

let gridContent = code.substring(code.indexOf(gridStartStr));

const endCut = gridContent.indexOf('          </div>\n        </div>\n      )}');
let newGridContent = gridContent.substring(0, endCut);

let newReturn = `  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50">
        <TopHeader title="Peça Manufaturada" subtitle="Gerenciamento Especializado" />
        
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          ${newGridContent}
        </div>
      </div>
    </div>
  );
}

export default MontaPecaManufaturada;
`;

fs.writeFileSync(file, preReturn + newReturn);
console.log("Script executed successfully.");
