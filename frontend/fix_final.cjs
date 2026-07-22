const fs = require('fs');

let fileContent = fs.readFileSync('src/pages/MontaPecaManufaturada.tsx', 'utf8');

// 1. Add useAlert import and hook
if (!fileContent.includes('useAlert')) {
  fileContent = fileContent.replace(
    "import { useAuth } from '../contexts/AuthContext';",
    "import { useAuth } from '../contexts/AuthContext';\nimport { useAlert } from '../contexts/AlertContext';"
  );
  
  fileContent = fileContent.replace(
    "const { user, token } = useAuth();",
    "const { user, token } = useAuth();\n  const { showAlert } = useAlert();"
  );
}

// 2. Replace all alert() with showAlert()
fileContent = fileContent.replace(/alert\(/g, "showAlert(");
// Fix the mangled text if any
fileContent = fileContent.replace(/Erro de comunica├º├úo/g, "Erro de comunicação");
// Update error alerts to have the 'error' parameter
fileContent = fileContent.replace(/showAlert\('Erro de comunicação ao atualizar quantidade.'\)/g, "showAlert('Erro de comunicação ao atualizar quantidade.', 'error')");
fileContent = fileContent.replace(/showAlert\('Erro ao atualizar quantidade: ' \+ \(j.message \|\| ''\)\)/g, "showAlert('Erro ao atualizar quantidade: ' + (j.message || ''), 'error')");
fileContent = fileContent.replace(/showAlert\('Tempo Padrão \(min\) obrigatório'\)/g, "showAlert('Tempo Padrão (min) obrigatório', 'warning')");
fileContent = fileContent.replace(/showAlert\(`Recurso já cadastrado nesta peça`\)/g, "showAlert(`Recurso já cadastrado nesta peça`, 'warning')");
fileContent = fileContent.replace(/showAlert\(`Sequência \$\{seqN\} já existe`\)/g, "showAlert(`Sequência ${seqN} já existe`, 'warning')");
fileContent = fileContent.replace(/showAlert\('Erro: '\+j.message\)/g, "showAlert('Erro: '+j.message, 'error')");

fileContent = fileContent.replace(/showAlert\(([^,]+)\)/g, (match, p1) => {
  if (p1.toLowerCase().includes('erro') || p1.toLowerCase().includes('obrigat')) {
    return `showAlert(${p1}, 'error')`;
  }
  return match;
});

// 3. Remove the top banner "PEÇA MANUFATURADA"
const bannerRegex = /\{\/\*\s*HEADER\s*\*\/\}.*?(?=<div className="flex-1 flex min-h-0 divide-x divide-gray-200">)/s;
fileContent = fileContent.replace(bannerRegex, "");

// 4. Fix Grid 2 Header and Form
const missingGrid2Header = `
          <div className="px-3 py-2 bg-gradient-to-r from-teal-50 to-teal-100/30 border-b border-teal-100 shrink-0 flex justify-between items-center">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} /> 2. Recursos
            </span>
            <div className="flex gap-2 items-center">
              {selMat1 && <button onClick={()=>fetchProcs(selMat1.CodMatFabricante)} className="p-0.5 text-teal-500 hover:text-teal-700 bg-white rounded shadow-sm border border-teal-200" title="Atualizar"><RefreshCw size={11}/></button>}
            </div>
          </div>
          
          {/* TOPO: FORMULÁRIO DE ADIÇÃO DE PROCESSO */}
          <div className="p-3 bg-teal-50/20 border-b border-gray-200 shrink-0">
             {!selMat1 ? (
               <div className="text-[10px] text-gray-400 text-center italic">Selecione um material no Grid 1 para gerenciar processos</div>
             ) : (
               <div className="flex flex-col gap-2">
                 <div className="flex gap-2 items-end flex-wrap">
                   <div className="flex flex-col flex-1 min-w-[120px]">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>
                     <input list="tipos-proc" value={recursoInput} onChange={handleRecursoChange} placeholder="- Digite ou selecione -" className="px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500 bg-white w-full"/>
                     <datalist id="tipos-proc">
                       {tipos.filter(t=>!staging.some(s=>s.IdProcesso===t.IdProcessoFabricacao)).map(t=>(<option key={t.IdProcessoFabricacao} value={t.ProcessoFabricacao}/>))}
                     </datalist>
                   </div>
                   <div className="flex flex-col items-center shrink-0">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Seq.</span>
                     <input type="number" min="1" step="1" value={seq} onChange={e=>setSeq(e.target.value)} placeholder={String(nextSeq())} className="w-12 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                   <div className="flex flex-col items-center shrink-0">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Setup <span className="text-[7px] text-gray-400 lowercase">(min)</span></span>
                     <input type="number" min="0" value={estMinStr} onChange={e=>setEstMinStr(e.target.value)} placeholder="0" className="w-12 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                   <div className="flex flex-col items-center shrink-0">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Padrão <span className="text-red-500">*</span></span>
                     <input type="number" min="0" value={padMinStr} onChange={e=>setPadMinStr(e.target.value)} placeholder="0" className="w-12 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                   <div className="flex flex-col flex-1 min-w-[100px]">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Observação</span>
                     <input value={ob} onChange={e=>setOb(e.target.value)} placeholder="..." className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                   <button onClick={handleAddProc} disabled={!selId} className="flex items-center gap-1 h-6 px-2.5 bg-teal-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-teal-700 disabled:opacity-40 transition-colors">
                     <Plus size={12}/> Adicionar
                   </button>
                 </div>
               </div>
             )}
          </div>
`;

if (!fileContent.includes("2. Recursos")) {
  fileContent = fileContent.replace(
    /\{\/\* BASE: TABELA DE PROCESSOS \*\/\}/g,
    missingGrid2Header + "\n          {/* BASE: TABELA DE PROCESSOS */}"
  );
}

if (!fileContent.includes("const handleRecursoChange =")) {
  fileContent = fileContent.replace(
    "const handleAddProc = async () => {",
    `const handleRecursoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRecursoInput(val);
    const proc = tipos.find(t => t.ProcessoFabricacao === val);
    if (proc) {
      setSelId(proc.IdProcessoFabricacao);
      setEstMinStr(proc.Setup != null ? String(proc.Setup) : '');
      setPadMinStr(proc.TempoPadrao != null ? String(proc.TempoPadrao) : '');
    } else {
      setSelId('');
      setEstMinStr('');
      setPadMinStr('');
    }
  };\n\n  const handleAddProc = async () => {`
  );
}

// 5. Fix Grid 3: Remove fCod3 and fDesc3 from the bottom.
const grid3BottomRegex = /<div className="flex gap-2">\s*<input value=\{fCod3\}.*?\/>\s*<input value=\{fDesc3\}.*?\/>\s*<button onClick=\{handleSaveComp3\}/s;
fileContent = fileContent.replace(grid3BottomRegex, '<div className="flex gap-2">\n                <button onClick={handleSaveComp3}');

// Make the Add button w-full instead of flex-1
fileContent = fileContent.replace(
  /className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600/g,
  'className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600'
);

// 6. Fix Grid 1: Add filter inputs for Composição
// Search for: <h4 className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1.5 shrink-0"><Package size={12}/> Composição de Materiais</h4>
const grid1CompHeader = '<h4 className="text-[10px] font-bold text-gray-600 uppercase mb-2 flex items-center gap-1.5 shrink-0"><Package size={12}/> Composição de Materiais</h4>';
const compFilterCode = `
                      <div className="flex gap-2 mb-2">
                        <input value={filtroCompCod} onChange={e=>setFiltroCompCod(e.target.value)} placeholder="Filtrar Código..." className="px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 flex-1"/>
                        <input value={filtroCompDesc} onChange={e=>setFiltroCompDesc(e.target.value)} placeholder="Filtrar Descrição..." className="px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 flex-1"/>
                      </div>
`;
if (!fileContent.includes("filtroCompCod")) {
  fileContent = fileContent.replace(grid1CompHeader, grid1CompHeader + compFilterCode);
  
  // Also we need to add the state variables!
  fileContent = fileContent.replace(
    "const [fDesc3, setFDesc3] = useState('');",
    "const [fDesc3, setFDesc3] = useState('');\n  const [filtroCompCod, setFiltroCompCod] = useState('');\n  const [filtroCompDesc, setFiltroCompDesc] = useState('');"
  );
  
  // And apply the filter to the comp2 array mapping
  fileContent = fileContent.replace(
    "comp2.map((c:any, i:number)",
    "comp2.filter((c:any) => (!filtroCompCod || c.CodMatFabricante?.toLowerCase().includes(filtroCompCod.toLowerCase())) && (!filtroCompDesc || c.DescResumo?.toLowerCase().includes(filtroCompDesc.toLowerCase()))).map((c:any, i:number)"
  );
}

fs.writeFileSync('src/pages/MontaPecaManufaturada.tsx', fileContent);
console.log("Modifications applied successfully.");
