const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', 'utf8');

c = c.replace(
  "const [selId, setSelId] = useState<number|''>('');",
  "const [selId, setSelId] = useState<number|''>('');\n  const [procSearch, setProcSearch] = useState('');\n  const [procTableFiltro, setProcTableFiltro] = useState('');"
);

c = c.replace(
  "const clearForm=()=>{ setSelId(''); setSeq(''); setEstMinStr(''); setPadMinStr(''); setOb(''); setEditSq(null); };",
  "const clearForm=()=>{ setSelId(''); setProcSearch(''); setSeq(''); setEstMinStr(''); setPadMinStr(''); setOb(''); setEditSq(null); };"
);

const handleSaveStr = `  const handleSave=async()=>{
    if(!piece||staging.length===0) return;
    setSaving(true);
    try{
      const body={ processos:staging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:piece.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };
      const r=await fetch(\`\${API}/material-processo\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) fetchProcs(piece.CodMatFabricante);
      else showAlert('Erro: '+j.message, "error");
    }finally{ setSaving(false); }
  };`;

const autoSaveStr = `  const saveProcs = async (newStaging: Proc[]) => {
    if(!piece) return;
    setSaving(true);
    try{
      const body={ processos:newStaging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:piece.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };
      const r=await fetch(\`\${API}/material-processo\`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) {
        setStaging(newStaging);
        fetchProcs(piece.CodMatFabricante);
      }
      else showAlert('Erro: '+j.message, "error");
    }finally{ setSaving(false); }
  };

  const handleSave = async() => {
    await saveProcs(staging);
  };`;

c = c.replace(handleSaveStr, autoSaveStr);

c = c.replace(
  "setStaging(prev=>[...prev,{seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}].sort((a,b)=>a.seq-b.seq));",
  "const updated = [...staging,{seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}].sort((a,b)=>a.seq-b.seq); await saveProcs(updated);"
);

c = c.replace(
  "setStaging(prev=>{\r\n        const updated = [...prev.map(s=>s.seq===editSq?{...s,seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s)].sort((a,b)=>a.seq-b.seq);\r\n        return updated;\r\n      });",
  "const updated = [...staging.map(s=>s.seq===editSq?{...s,seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s)].sort((a,b)=>a.seq-b.seq); await saveProcs(updated);"
);

c = c.replace(
  "setStaging(prev=>{\n        const updated = [...prev.map(s=>s.seq===editSq?{...s,seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s)].sort((a,b)=>a.seq-b.seq);\n        return updated;\n      });",
  "const updated = [...staging.map(s=>s.seq===editSq?{...s,seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s)].sort((a,b)=>a.seq-b.seq); await saveProcs(updated);"
);

c = c.replace(
  "const handleAdd=()=>{",
  "const handleAdd=async()=>{"
);

c = c.replace(
  "const delProc=async(sq:number)=>{ if(!await window.sysConfirm(`Excluir processo da sequência ${sq}?`)) return; setStaging(prev=>prev.filter(s=>s.seq!==sq)); };",
  "const delProc=async(sq:number)=>{ if(!await window.sysConfirm(`Excluir processo da sequência ${sq}?`)) return; const updated = staging.filter(s=>s.seq!==sq); await saveProcs(updated); };"
);

c = c.replace(
  "setOb(s.obs);",
  "setOb(s.obs); setProcSearch(s.nome);"
);

// Form
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
c = c.replace(
  '<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>\r\n                      <select value={selId}',
  `<span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>\r\n                      <input \r\n                        value={procSearch} \r\n                        onChange={e=>setProcSearch(e.target.value)} \r\n                        placeholder="Pesquisar..." \r\n                        className="mb-1 w-full px-1.5 py-0.5 text-[9px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"\r\n                      />\r\n                      <select value={selId}`
);

// Filter
c = c.replace(
  "{tipos.filter(t=>editSq!==null||!staging.some(s=>s.IdProcesso===t.IdProcessoFabricacao))",
  "{tipos.filter(t=>(editSq!==null||!staging.some(s=>s.IdProcesso===t.IdProcessoFabricacao)) && (!procSearch || t.ProcessoFabricacao.toLowerCase().includes(procSearch.toLowerCase())))"
);

// Grid 2 Filter
c = c.replace(
  '<div className="text-[10px] font-bold text-[#32423D]">PROCESSOS DE FABRICAÇÃO',
  `<div className="w-full flex items-center justify-between pb-2 border-b border-gray-100">\r\n                  <div className="text-[10px] font-bold text-[#32423D]">PROCESSOS DE FABRICAÇÃO</div>\r\n                  <div className="flex gap-2 items-center">\r\n                    <span className="text-[8.5px] text-gray-400">{staging.length} processo(s)</span>\r\n                    <input \r\n                      value={procTableFiltro} \r\n                      onChange={e=>setProcTableFiltro(e.target.value)} \r\n                      placeholder="Pesquisa de recursos..." \r\n                      className="w-48 px-1.5 py-0.5 text-[9px] border border-gray-200 rounded-md bg-gray-50"\r\n                    />\r\n                  </div>\r\n                </div>\r\n                <div className="hidden">PROCESSOS DE FABRICAÇÃO`
);

c = c.replace(
  "{staging.map(s=>(",
  "{staging.filter(s => !procTableFiltro || s.nome.toLowerCase().includes(procTableFiltro.toLowerCase())).map(s=>("
);

fs.writeFileSync('frontend/src/pages/MontaPecaManufaturada.tsx', c);
