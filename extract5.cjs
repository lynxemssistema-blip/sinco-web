const fs = require('fs');

const file = 'frontend/src/pages/MontaPecaManufaturada.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. MatRow interface
code = code.replace(
  'DescDetal?:string; PecaManufat?:string; }',
  'DescDetal?:string; PecaManufat?:string; AreaPintura?:any; Unidade?:string; Altura?:any; Largura?:any; Qtde?:any; }'
);

// 2. removeComp payload
code = code.replace(
  "body:JSON.stringify({usuario})});",
  "body:JSON.stringify({usuario, idMatriz})});"
);

// 3. removeCompManut payload
code = code.replace(
  "body:JSON.stringify({usuario: uCriacao})});",
  "body:JSON.stringify({usuario: uCriacao, idMatriz})});"
);

// 4. Inputs onChange
const oldInputCod = `<input value={filtroManutCod} onChange={e=>setFiltroManutCod(e.target.value)}`;
const newInputCod = `<input value={filtroManutCod} onChange={e=>{ const v = e.target.value; setFiltroManutCod(v); if (!v && !filtroManutDesc) { setMaterialManutSel(null); setCompManutSel([]); setExpandedItemManut(null); } }}`;
code = code.replace(oldInputCod, newInputCod);

const oldBtnCod = `<button onClick={()=>setFiltroManutCod('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
const newBtnCod = `<button onClick={()=>{ setFiltroManutCod(''); if (!filtroManutDesc) { setMaterialManutSel(null); setCompManutSel([]); setExpandedItemManut(null); } }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
code = code.replace(oldBtnCod, newBtnCod);

const oldInputDesc = `<input value={filtroManutDesc} onChange={e=>setFiltroManutDesc(e.target.value)}`;
const newInputDesc = `<input value={filtroManutDesc} onChange={e=>{ const v = e.target.value; setFiltroManutDesc(v); if (!v && !filtroManutCod) { setMaterialManutSel(null); setCompManutSel([]); setExpandedItemManut(null); } }}`;
code = code.replace(oldInputDesc, newInputDesc);

const oldBtnDesc = `<button onClick={()=>setFiltroManutDesc('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
const newBtnDesc = `<button onClick={()=>{ setFiltroManutDesc(''); if (!filtroManutCod) { setMaterialManutSel(null); setCompManutSel([]); setExpandedItemManut(null); } }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">`;
code = code.replace(oldBtnDesc, newBtnDesc);


// 5. Details Panel
const detailsPanel = `
                    {materialManutSel && (
                      <div className="m-3 p-3 bg-gradient-to-br from-indigo-50 to-white rounded-md border border-indigo-100 shadow-sm">
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
                    )}
`;

code = code.replace(
  '                        </tbody>\n                      </table>\n                    )}',
  '                        </tbody>\n                      </table>\n                    )}\n' + detailsPanel
);


// NOW: We apply the layout transformation.
// The layout transformation removes the old main screen.
// We can just find the bounds safely.

const headerStr = '<TopHeader title="Peça Manufaturada" subtitle="Plataforma de Gerenciamento Especializado" />';
const modalStartStr = '{/* Modal Manutenção de Material */}';
const gridStartStr = '{/* Grid 1: Materiais */}';

let preReturn = code.substring(0, code.indexOf('  return ('));

let gridContent = code.substring(code.indexOf(gridStartStr));
// gridContent includes the closing brackets of the component!
// Let's strip the modal wrappers from gridContent.
// Actually, it's easier to just take the code inside the flex container.
// The grid starts at `{/* Grid 1: Materiais */}`.
// The end is exactly the end of the `showModalManutencao` block.
// The original block ends with:
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// Let's locate the last `)}` which corresponds to `showGrid3Manut && (`.
const lastBracket = gridContent.lastIndexOf(')}');
// And we want the closing div of the `flex-1 flex min-h-0 bg-gray-50 p-4 gap-4` container.
// That container is exactly closed by the `</div>` after the `showGrid3Manut` block.
// Let's just find `</div>\n          </div>\n        </div>\n      )}`

const endCut = gridContent.indexOf('          </div>\n        </div>\n      )}');
let newGridContent = gridContent.substring(0, endCut);

// newGridContent is perfectly just the 3 grids inside the flex container!

let newReturn = `  return (
    <div className="flex h-screen bg-gray-50/50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50">
        <TopHeader title="Peça Manufaturada" subtitle="Gerenciamento de Materiais e Processos" />
        
        <div className="flex-1 flex min-h-0 p-4 gap-4">
          ${newGridContent}
      </div>
    </div>
  );
}

export default MontaPecaManufaturada;
`;

fs.writeFileSync(file, preReturn + newReturn);
console.log("Re-applied fixes and transformed layout successfully.");
