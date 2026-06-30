const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// 1. Add activeProcCode
if (!code.includes('const [activeProcCode, setActiveProcCode]')) {
    code = code.replace(
        "const [piece, setPiece] = useState<any>(null);",
        "const [piece, setPiece] = useState<any>(null);\n  const [activeProcCode, setActiveProcCode] = useState('');"
    );
}

// 2. selectPiece
code = code.replace(
    "setSearchCode(p.CodMatFabricante);",
    "setSearchCode(p.CodMatFabricante);\n    setActiveProcCode(p.CodMatFabricante);"
);

// 3. handleSave
code = code.replace(
    "if(!piece||staging.length===0) return;",
    "if(!activeProcCode||staging.length===0) return;"
);
code = code.replace(
    "codmatFabricante:piece.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };",
    "codmatFabricante:activeProcCode, idMatriz, usuarioCriacao:uCriacao, replace:true };"
);
code = code.replace(
    "if(j.success) fetchProcs(piece.CodMatFabricante);",
    "if(j.success) fetchProcs(activeProcCode);"
);

// 4. Grid 2 Header
code = code.replace(
    /<span className="text-\[10px\] font-bold text-teal-800 uppercase tracking-wide">Processos de Fabricaç.o<\/span>/,
    `<span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Processos {activeProcCode ? \`- \${activeProcCode}\` : ''}</span>`
);
code = code.replace(
    /\{piece&&<button onClick=\{\(\)=>fetchProcs\(piece\.CodMatFabricante\)\}/,
    `{activeProcCode&&<button onClick={()=>fetchProcs(activeProcCode)}`
);

// 5. compFiltrada.map rendering
const newTr = `<tr key={c.IdMontaPeca} className={\`hover:bg-red-50/30 group cursor-pointer \${activeProcCode === c.CodMatFabricante ? 'bg-indigo-50/50' : ''}\`}
                        onClick={() => {
                          if (c.PecaManufat === 'S' || c.PecaManufat === 's') {
                            setActiveProcCode(c.CodMatFabricante);
                            fetchProcs(c.CodMatFabricante);
                          } else if (piece) {
                            setActiveProcCode(piece.CodMatFabricante);
                            fetchProcs(piece.CodMatFabricante);
                          }
                        }}>
                        <td className="p-1 px-1 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={()=>removeComp(c.IdMontaPeca)} className="p-0.5 text-red-300 hover:text-red-600 rounded" title="Excluir"><Trash2 size={11}/></button>
                          <button onClick={()=>abrirPdf(c.EnderecoArquivo||'')} className="p-0.5 text-red-400 hover:text-red-600 rounded ml-0.5" title="Abrir Desenho PDF"><FileText size={11}/></button>
                        </td>
                        <td className="p-1 px-2 text-[10px] font-mono font-bold text-[#32423D] truncate max-w-[70px]" title={c.CodMatFabricante}>
                          {c.CodMatFabricante}
                        </td>
                        <td className="p-1 px-2 text-[10px] text-gray-600 truncate max-w-[90px]" title={c.DescDetal}>{c.DescDetal}</td>
                        <td className="p-1 px-2 text-[10px] font-bold text-center text-[#32423D]">{c.PecaQtde||1}</td>
                      </tr>`;

code = code.replace(
    /<tr key=\{c\.IdMontaPeca\} className="hover:bg-red-50\/30 group">[\s\S]*?<\/tr>/,
    newTr
);

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', code);
console.log('Frontend patched.');
