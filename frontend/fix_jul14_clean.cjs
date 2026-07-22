const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

// 1. Add new state variables
c = c.replace(
  "const [selId, setSelId] = useState<number|''>('');\r\n  const [seq, setSeq] = useState('');",
  "const [selId, setSelId] = useState<number|''>('');\r\n  const [procSearch, setProcSearch] = useState('');\r\n  const [procTableFiltro, setProcTableFiltro] = useState('');\r\n  const [seq, setSeq] = useState('');"
);
c = c.replace(
  "const [selId, setSelId] = useState<number|''>('');\n  const [seq, setSeq] = useState('');",
  "const [selId, setSelId] = useState<number|''>('');\n  const [procSearch, setProcSearch] = useState('');\n  const [procTableFiltro, setProcTableFiltro] = useState('');\n  const [seq, setSeq] = useState('');"
);

// 2. Add saveProcs and modify handleAddProc / delProc
const autoSaveStr = `  const saveProcs = async (newStaging) => {
    if(!piece) return;
    setSaving(true);
    try{
      const body={ processos:newStaging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:piece.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };
      const r=await fetch(\`\${API}/material-processo\`,{method:'POST',headers:{...authHdr(), 'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) {
        setStaging(newStaging);
        fetchProcs(piece.CodMatFabricante);
      }
      else showAlert('Erro: '+j.message, "error");
    }finally{ setSaving(false); }
  };`;

if (!c.includes("saveProcs = async")) {
  c = c.replace(
    "const handleAddProc = () => {",
    `${autoSaveStr}\n\n  const handleAddProc = async () => {`
  );
} else {
  c = c.replace("const handleAddProc = () => {", "const handleAddProc = async () => {");
}

c = c.replace(
  "setStaging(prev => [...prev, { seq: seqN, IdProcesso: Number(selId), nome: tipo?.ProcessoFabricacao || '', estMin: estMinV, padMin: padMinV, obs: ob }].sort((a, b) => a.seq - b.seq));",
  "const updated = [...staging, { seq: seqN, IdProcesso: Number(selId), nome: tipo?.ProcessoFabricacao || '', estMin: estMinV, padMin: padMinV, obs: ob }].sort((a, b) => a.seq - b.seq);\n    await saveProcs(updated);"
);

c = c.replace(
  "const delProc = (sq: number) => { \r\n    if (!confirm(`Excluir processo da sequência ${sq}?`)) return; \r\n    setStaging(prev => prev.filter(s => s.seq !== sq)); \r\n  };",
  "const delProc = async (sq: number) => { \r\n    if (!await window.sysConfirm(`Excluir processo da sequência ${sq}?`)) return; \r\n    const updated = staging.filter(s => s.seq !== sq);\r\n    await saveProcs(updated); \r\n  };"
);
c = c.replace(
  "const delProc = (sq: number) => { \n    if (!confirm(`Excluir processo da sequência ${sq}?`)) return; \n    setStaging(prev => prev.filter(s => s.seq !== sq)); \n  };",
  "const delProc = async (sq: number) => { \n    if (!await window.sysConfirm(`Excluir processo da sequência ${sq}?`)) return; \n    const updated = staging.filter(s => s.seq !== sq);\n    await saveProcs(updated); \n  };"
);

c = c.replace(
  "const saveInlineEdit = () => {",
  "const saveInlineEdit = async () => {"
);

c = c.replace(
  "setStaging(prev => {\r\n      if (newSeq !== editSq && prev.some(p => p.seq === newSeq)) {\r\n        isValid = false;\r\n        return prev;\r\n      }\r\n      const updated = prev.map(s => s.seq === editSq ? { ...s, seq: newSeq, estMin: estMinV, padMin: padMinV, obs: inlineOb } : s);\r\n      return updated.sort((a, b) => a.seq - b.seq);\r\n    });",
  "if (newSeq !== editSq && staging.some(p => p.seq === newSeq)) {\r\n      isValid = false;\r\n    } else {\r\n      const updated = staging.map(s => s.seq === editSq ? { ...s, seq: newSeq, estMin: estMinV, padMin: padMinV, obs: inlineOb } : s).sort((a, b) => a.seq - b.seq);\r\n      await saveProcs(updated);\r\n    }"
);
c = c.replace(
  "setStaging(prev => {\n      if (newSeq !== editSq && prev.some(p => p.seq === newSeq)) {\n        isValid = false;\n        return prev;\n      }\n      const updated = prev.map(s => s.seq === editSq ? { ...s, seq: newSeq, estMin: estMinV, padMin: padMinV, obs: inlineOb } : s);\n      return updated.sort((a, b) => a.seq - b.seq);\n    });",
  "if (newSeq !== editSq && staging.some(p => p.seq === newSeq)) {\n      isValid = false;\n    } else {\n      const updated = staging.map(s => s.seq === editSq ? { ...s, seq: newSeq, estMin: estMinV, padMin: padMinV, obs: inlineOb } : s).sort((a, b) => a.seq - b.seq);\n      await saveProcs(updated);\n    }"
);

// 3. Grid 2: Inputs for filtering
c = c.replace(
  "const clearForm = () => { setSelId(''); setSeq(''); setEstMinStr(''); setPadMinStr(''); setOb(''); };",
  "const clearForm = () => { setSelId(''); setProcSearch(''); setSeq(''); setEstMinStr(''); setPadMinStr(''); setOb(''); };"
);

c = c.replace(
  "{tipos.filter(t => editSq !== null || !staging.some(s => s.IdProcesso === t.IdProcessoFabricacao)).map(t => (",
  "{tipos.filter(t => (editSq !== null || !staging.some(s => s.IdProcesso === t.IdProcessoFabricacao)) && (!procSearch || t.ProcessoFabricacao.toLowerCase().includes(procSearch.toLowerCase()))).map(t => ("
);

// Replace Grid 2 header and proc filter
c = c.replace(
  '<div className="px-2 py-1 bg-indigo-50 border-b border-indigo-100 shrink-0 flex items-center justify-between">\r\n              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Processos de Fabricação</span>\r\n              <span className="text-[9px] text-indigo-600">{staging.length} processo(s)</span>\r\n            </div>',
  `<div className="px-2 py-1 bg-indigo-50 border-b border-indigo-100 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Processos de Fabricação</span>
              <div className="flex gap-2 items-center">
                <span className="text-[9px] text-indigo-600">{staging.length} processo(s)</span>
                <input 
                  value={procTableFiltro} 
                  onChange={e=>setProcTableFiltro(e.target.value)} 
                  placeholder="Pesquisa de recursos..." 
                  className="w-48 px-1.5 py-0.5 text-[9px] border border-gray-200 rounded-md bg-white"
                />
              </div>
            </div>`
);
c = c.replace(
  '<div className="px-2 py-1 bg-indigo-50 border-b border-indigo-100 shrink-0 flex items-center justify-between">\n              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Processos de Fabricação</span>\n              <span className="text-[9px] text-indigo-600">{staging.length} processo(s)</span>\n            </div>',
  `<div className="px-2 py-1 bg-indigo-50 border-b border-indigo-100 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Processos de Fabricação</span>
              <div className="flex gap-2 items-center">
                <span className="text-[9px] text-indigo-600">{staging.length} processo(s)</span>
                <input 
                  value={procTableFiltro} 
                  onChange={e=>setProcTableFiltro(e.target.value)} 
                  placeholder="Pesquisa de recursos..." 
                  className="w-48 px-1.5 py-0.5 text-[9px] border border-gray-200 rounded-md bg-white"
                />
              </div>
            </div>`
);

c = c.replace(
  "{staging.map(s => (",
  "{staging.filter(s => !procTableFiltro || s.nome.toLowerCase().includes(procTableFiltro.toLowerCase())).map(s => ("
);

// Add search input in Grid 2 Add Form
c = c.replace(
  '<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>\r\n                      <select value={selId}',
  `<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>
                      <input 
                        value={procSearch} 
                        onChange={e=>setProcSearch(e.target.value)} 
                        placeholder="Pesquisar..." 
                        className="mb-1 w-full px-1.5 py-0.5 text-[9px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                      />
                      <select value={selId}`
);
c = c.replace(
  '<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>\n                      <select value={selId}',
  `<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>
                      <input 
                        value={procSearch} 
                        onChange={e=>setProcSearch(e.target.value)} 
                        placeholder="Pesquisar..." 
                        className="mb-1 w-full px-1.5 py-0.5 text-[9px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                      />
                      <select value={selId}`
);

// Remove the global Salvar button for processes
c = c.replace(
  /<button onClick=\{handleSave\}.*?Salvar\s+<\/button>/g,
  ""
);

// Replace confirm with window.sysConfirm for removeComp
c = c.replace(
  "const removeComp = (idMaterial: number) => {\r\n    if (!confirm('Remover este material da composição?')) return;\r\n    setLoadingC(true);",
  "const removeComp = async (idMaterial: number) => {\r\n    if (!await window.sysConfirm('Remover este material da composição?')) return;\r\n    setLoadingC(true);"
);
c = c.replace(
  "const removeComp = (idMaterial: number) => {\n    if (!confirm('Remover este material da composição?')) return;\n    setLoadingC(true);",
  "const removeComp = async (idMaterial: number) => {\n    if (!await window.sysConfirm('Remover este material da composição?')) return;\n    setLoadingC(true);"
);
c = c.replace(
  "onClick={() => removeComp(m.IdMaterial)}",
  "onClick={async () => await removeComp(m.IdMaterial)}"
);

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
console.log('Script ran successfully');
