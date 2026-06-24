import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Trash2, Plus, Clock, X, Save, Edit2, RefreshCw, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/peca-manufaturada';

interface Proc { seq:number; IdProcesso:number; nome:string; estMin:number|null; padMin:number|null; obs:string; }




export default function MontaPecaManufaturadaPage({ usuario='Sistema' }:{usuario?:string}) {
  const { user } = useAuth();
  const idMatriz = (user as any)?.idMatriz||null;
  const uCriacao = (user as any)?.nome||usuario;
  const dropRef = useRef<HTMLDivElement>(null);

  const [searchCode, setSearchCode] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [loadingS, setLoadingS] = useState(false);
  const [piece, setPiece] = useState<any>(null);

  const [comp, setComp] = useState<any[]>([]);
  const [loadingC, setLoadingC] = useState(false);
  const [fComp, setFComp] = useState('');

  const [procs, setProcs] = useState<any[]>([]);
  const [loadingP, setLoadingP] = useState(false);

  const [tipos, setTipos] = useState<any[]>([]);
  const [staging, setStaging] = useState<Proc[]>([]);
  const [selId, setSelId] = useState<number|''>('');
  const [seq, setSeq] = useState('');
  const [estMinStr,setEstMinStr]=useState('');
  const [padMinStr,setPadMinStr]=useState('');
  const [ob,setOb]=useState('');
  const [editSq,setEditSq]=useState<number|null>(null);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ fetch(`${API}/processos`).then(r=>r.json()).then(j=>{ if(j.success) setTipos(j.data); }); },[]);

  useEffect(()=>{
    const h = (e:MouseEvent)=>{ if(dropRef.current&&!dropRef.current.contains(e.target as Node)) setShowDrop(false); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[]);

  const doSearch = useCallback(async(cod:string)=>{
    if(!cod.trim()){ setResults([]); setShowDrop(false); return; }
    setLoadingS(true);
    try{
      const r = await fetch(`${API}/pecas?codigo=${encodeURIComponent(cod)}`);
      const j = await r.json();
      if(j.success){ setResults(j.data); setShowDrop(true); }
    }finally{ setLoadingS(false); }
  },[]);

  useEffect(()=>{ const t=setTimeout(()=>doSearch(searchCode),300); return()=>clearTimeout(t); },[searchCode,doSearch]);

  const fetchComp = async(id:number)=>{
    setLoadingC(true);
    try{ const r=await fetch(`${API}/composicao/${id}`); const j=await r.json(); if(j.success) setComp(j.data); }
    finally{ setLoadingC(false); }
  };

  const fetchProcs = async(cod:string)=>{
    setLoadingP(true);
    try{ const r=await fetch(`${API}/processos-existentes/${encodeURIComponent(cod)}`); const j=await r.json();
      if(j.success){
        setProcs(j.data);
        setStaging(j.data.map((p:any)=>({
          seq:p.SequenciaExecucao, IdProcesso:p.IdProcesso, nome:p.NomeProcesso,
          estMin: p.TempoEstimadoMin!=null?Number(p.TempoEstimadoMin):null,
          padMin: p.TempoPadraoMin!=null?Number(p.TempoPadraoMin):null,
          obs:p.Observacao||''
        })));
      }
    }finally{ setLoadingP(false); }
  };

  const selectPiece = async(p:any)=>{
    setShowDrop(false);
    setSearchCode(p.CodMatFabricante);
    // load full material details
    try{
      const r=await fetch(`/api/material/${p.IdMaterial}`);
      const j=await r.json();
      if(j.success) setPiece(j.data); else setPiece(p);
    }catch{ setPiece(p); }
    fetchComp(p.IdMaterial);
    fetchProcs(p.CodMatFabricante);
    setFComp(''); setSelId(''); clearForm();
  };

  const clearForm=()=>{ setSelId(''); setSeq(''); setEstMinStr(''); setPadMinStr(''); setOb(''); setEditSq(null); };

  const nextSeq=()=>{ if(!staging.length) return 10; return Math.max(...staging.map(s=>s.seq))+10; };

  const handleAdd=()=>{
    if(!selId) return;
    const tipo = tipos.find(t=>t.IdProcessoFabricacao===selId);
    const estMinV = estMinStr ? (parseInt(estMinStr)||null) : null;
    const padMinV = padMinStr ? parseInt(padMinStr) : null;
    if(padMinV==null){ alert('Tempo Padrão (min) obrigatório'); return; }
    const seqN = seq.trim() ? (parseInt(seq)||nextSeq()) : nextSeq();
    if(editSq===null){
      if(staging.some(s=>s.seq===seqN)){ alert(`Sequência ${seqN} já existe`); return; }
      setStaging(prev=>[...prev,{seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}].sort((a,b)=>a.seq-b.seq));
    } else {
      setStaging(prev=>prev.map(s=>s.seq===editSq?{...s,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s));
    }
    clearForm();
  };

  const editProc=(s:Proc)=>{
    setEditSq(s.seq); setSelId(s.IdProcesso); setSeq(String(s.seq));
    setEstMinStr(s.estMin!=null?String(s.estMin):'');
    setPadMinStr(s.padMin!=null?String(s.padMin):'');
    setOb(s.obs);
  };

  const delProc=(sq:number)=>setStaging(prev=>prev.filter(s=>s.seq!==sq));

  const handleSave=async()=>{
    if(!piece||staging.length===0) return;
    setSaving(true);
    try{
      const body={ processos:staging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:piece.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true };
      const r=await fetch(`${API}/material-processo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) fetchProcs(piece.CodMatFabricante);
      else alert('Erro: '+j.message);
    }finally{ setSaving(false); }
  };

  const removeComp=async(id:number)=>{
    if(!confirm('Excluir item?')) return;
    try{ const r=await fetch(`${API}/composicao/${id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({usuario})}); const j=await r.json(); if(j.success&&piece) fetchComp(piece.IdMaterial); }catch(e){console.error(e);}
  };

  const compFiltrada = comp.filter(c=>!fComp||c.CodMatFabricante?.toLowerCase().includes(fComp.toLowerCase())||c.DescDetal?.toLowerCase().includes(fComp.toLowerCase()));

  const fmtMin=(v:number|null)=>v==null?'—':v;
  const fieldCls="text-[10px] text-gray-700";
  const labelCls="text-[9px] text-gray-400 uppercase font-semibold";

  return (
    <div className="h-full flex flex-col min-h-0 bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Package size={16} className="text-[#32423D]"/>
            <span className="text-sm font-bold text-[#32423D] uppercase tracking-wide">Peça Manufaturada</span>
          </div>
          {/* Search */}
          <div ref={dropRef} className="relative">
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1 bg-white focus-within:border-[#32423D] w-64">
              {loadingS ? <Loader2 size={13} className="animate-spin text-gray-400 shrink-0"/> : <Search size={13} className="text-gray-400 shrink-0"/>}
              <input value={searchCode} onChange={e=>setSearchCode(e.target.value)} onFocus={()=>results.length&&setShowDrop(true)}
                placeholder="Pesquisar CodMatFabricante..." className="flex-1 text-[11px] outline-none bg-transparent"/>
              {searchCode&&<button onClick={()=>{setSearchCode('');setResults([]);setShowDrop(false);setPiece(null);setComp([]);setProcs([]);setStaging([]);}} className="text-gray-400 hover:text-gray-600"><X size={12}/></button>}
            </div>
            {showDrop&&results.length>0&&(
              <div className="absolute top-full left-0 z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {results.map(r=>(
                  <div key={r.IdMaterial} onClick={()=>selectPiece(r)} className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 flex flex-col border-b border-gray-50 last:border-0">
                    <span className="text-[11px] font-bold text-[#32423D]">{r.CodMatFabricante}</span>
                    <span className="text-[10px] text-gray-500 truncate">{r.DescResumo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Piece details */}
          {piece&&(
            <div className="flex items-center gap-3 flex-wrap border-l border-gray-200 pl-3">
              <div><div className={labelCls}>Descrição</div><div className={`${fieldCls} font-semibold max-w-[180px] truncate`} title={piece.DescResumo}>{piece.DescResumo||'—'}</div></div>
              <div><div className={labelCls}>Espessura</div><div className={fieldCls}>{piece.Espessura!=null?piece.Espessura:'—'}</div></div>
              <div><div className={labelCls}>Área Pint.</div><div className={fieldCls}>{piece.AreaPintura!=null?piece.AreaPintura:'—'}</div></div>
              <div><div className={labelCls}>Peso</div><div className={fieldCls}>{piece.Peso!=null?piece.Peso:'—'}</div></div>
              <div><div className={labelCls}>Unid.</div><div className={fieldCls}>{piece.Unidade||'—'}</div></div>
              <div><div className={labelCls}>Alt.</div><div className={fieldCls}>{piece.Altura!=null?piece.Altura:'—'}</div></div>
              <div><div className={labelCls}>Larg.</div><div className={fieldCls}>{piece.Largura!=null?piece.Largura:'—'}</div></div>
              <div><div className={labelCls}>Prof.</div><div className={fieldCls}>{piece.Profundidade!=null?piece.Profundidade:'—'}</div></div>
            </div>
          )}
        </div>
      </div>

      {/* 3 GRIDS */}
      <div className="flex-1 flex min-h-0 gap-0">

        {/* GRID 1: Composição */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col min-h-0 bg-white">
          <div className="px-3 py-2 bg-blue-50/70 border-b border-blue-100 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Composição Atual</span>
            <span className="text-[9px] text-blue-600">{comp.length} item(ns)</span>
          </div>
          <div className="px-2 py-1.5 border-b border-gray-100 shrink-0">
            <input value={fComp} onChange={e=>setFComp(e.target.value)} placeholder="Filtrar..." className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-[#32423D]"/>
          </div>
          <div className="flex-1 overflow-auto">
            {loadingC?(<div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={18}/></div>)
            :!piece?(<div className="p-4 text-center text-[10px] text-gray-400">Selecione uma peça</div>)
            :compFiltrada.length===0?(<div className="p-4 text-center text-[10px] text-gray-400">Nenhum insumo</div>):(
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr><th className="p-1 px-1 w-7"></th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Código</th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Descrição</th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Qtde</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compFiltrada.map(c=>(
                    <tr key={c.IdMontaPeca} className="hover:bg-red-50/30 group">
                      <td className="p-1 px-1 text-center"><button onClick={()=>removeComp(c.IdMontaPeca)} className="p-0.5 text-red-300 hover:text-red-600 rounded"><Trash2 size={11}/></button></td>
                      <td className="p-1 px-2 text-[10px] font-mono font-bold text-[#32423D] truncate max-w-[70px]" title={c.CodMatFabricante}>{c.CodMatFabricante}</td>
                      <td className="p-1 px-2 text-[10px] text-gray-600 truncate max-w-[90px]" title={c.DescDetal}>{c.DescDetal}</td>
                      <td className="p-1 px-2 text-[10px] font-bold text-center text-[#32423D]">{c.PecaQtde||1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* GRID 2: Processos */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col min-h-0 bg-white">
          <div className="px-3 py-2 bg-teal-50/70 border-b border-teal-100 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Processos de Fabricação</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-teal-600">{procs.length} processo(s)</span>
              {piece&&<button onClick={()=>fetchProcs(piece.CodMatFabricante)} className="p-0.5 text-teal-500 hover:text-teal-700" title="Atualizar"><RefreshCw size={11}/></button>}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loadingP?(<div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={18}/></div>)
            :!piece?(<div className="p-4 text-center text-[10px] text-gray-400">Selecione uma peça</div>)
            :procs.length===0?(<div className="p-4 text-center text-[10px] text-gray-400">Nenhum processo cadastrado</div>):(
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase w-8">Seq</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Processo</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Est.</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Padrão</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {procs.map(p=>(
                    <tr key={p.SequenciaExecucao} className="hover:bg-teal-50/30">
                      <td className="p-1 px-2"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] font-bold">{p.SequenciaExecucao}</span></td>
                      <td className="p-1 px-2 text-[10px] font-semibold text-gray-800">{p.NomeProcesso}</td>
                      <td className="p-1 px-2 text-[10px] text-center text-gray-600">{fmtMin(p.TempoEstimadoMin)}</td>
                      <td className="p-1 px-2 text-[10px] text-center text-gray-600">{fmtMin(p.TempoPadraoMin)}</td>
                      <td className="p-1 px-2 text-[10px] text-gray-500 truncate max-w-[80px]" title={p.Observacao||''}>{p.Observacao||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* GRID 3: Manutenção */}
        <div className="w-1/3 flex flex-col min-h-0 bg-white">
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Manutenção de Processos</span>
            <button onClick={handleSave} disabled={saving||!piece||staging.length===0}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#32423D] text-white text-[9px] font-bold rounded hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed">
              {saving?<Loader2 size={10} className="animate-spin"/>:<Save size={10}/>}
              Salvar
            </button>
          </div>

          {/* Form */}
          <div className="p-2 border-b border-gray-100 shrink-0 flex flex-col gap-1.5">
            {/* Processo + Seq */}
            <div className="flex gap-1.5 items-start">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[8.5px] text-gray-400 uppercase font-semibold mb-0.5">Recurso</span>
                <select value={selId} onChange={e=>setSelId(e.target.value?Number(e.target.value):'')}
                  disabled={editSq!==null}
                  className={`w-full px-1.5 py-0.5 text-[10px] border rounded focus:outline-none bg-white ${editSq!==null?'border-gray-100 text-gray-400':'border-gray-300 focus:border-[#32423D]'}`}>
                  <option value="">— Selecione —</option>
                  {tipos.map(t=>(<option key={t.IdProcessoFabricacao} value={t.IdProcessoFabricacao}>{t.ProcessoFabricacao}</option>))}
                </select>
              </div>
              <div className="flex flex-col items-center shrink-0">
                <span className="text-[8.5px] text-gray-400 uppercase font-semibold mb-0.5">Seq.</span>
                <input type="number" min="1" step="1" value={seq} onChange={e=>setSeq(e.target.value)}
                  placeholder={String(nextSeq())}
                  className="w-14 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-300 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
              </div>
            </div>
            {/* Times */}
            <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
              <div className="flex items-center gap-2 flex-nowrap">
                <Clock size={10} className="text-[#32423D] shrink-0"/>
                <span className="text-[9px] font-bold text-gray-600 shrink-0">Setup</span>
                <input type="number" min="0" value={estMinStr} onChange={e=>setEstMinStr(e.target.value)}
                  placeholder="0" className="w-14 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-300 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
                <span className="text-[8px] text-gray-400 shrink-0">min</span>
                <div className="w-px h-3 bg-gray-300 shrink-0"/>
                <span className="text-[9px] font-bold text-gray-600 shrink-0">Padrão<span className="text-red-500">*</span></span>
                <input type="number" min="0" value={padMinStr} onChange={e=>setPadMinStr(e.target.value)}
                  placeholder="0" className="w-14 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-300 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
                <span className="text-[8px] text-gray-400 shrink-0">min</span>
              </div>
            </div>
            {/* Obs */}
            <input value={ob} onChange={e=>setOb(e.target.value)} placeholder="Observação (opcional)..."
              className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-[#32423D]"/>
            {/* Buttons */}
            <div className="flex gap-1">
              <button onClick={handleAdd} disabled={!selId}
                className="flex-1 flex items-center justify-center gap-1 py-0.5 bg-[#32423D] text-white text-[10px] font-bold rounded hover:bg-[#25322e] disabled:opacity-40">
                <Plus size={11}/>{editSq!==null?'Atualizar':'Adicionar'}
              </button>
              {editSq!==null&&<button onClick={clearForm} className="px-2 py-0.5 text-[10px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50">Cancelar</button>}
            </div>
          </div>

          {/* Staging list */}
          <div className="flex-1 overflow-auto">
            {staging.length===0?(
              <div className="p-3 text-center text-[10px] text-gray-400">Nenhum processo na lista</div>
            ):(
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-1 px-1 w-6"></th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase w-8">#</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Processo</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Est.</th>
                    <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Pad.</th>
                    <th className="p-1 px-1 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staging.map(s=>(
                    <tr key={s.seq} className={`hover:bg-amber-50/40 ${editSq===s.seq?'bg-blue-50':''}`}>
                      <td className="p-1 px-1"><button onClick={()=>editProc(s)} className="p-0.5 text-blue-400 hover:text-blue-600"><Edit2 size={10}/></button></td>
                      <td className="p-1 px-2"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold">{s.seq}</span></td>
                      <td className="p-1 px-2 text-[10px] font-semibold text-gray-700 truncate max-w-[80px]" title={s.nome}>{s.nome}</td>
                      <td className="p-1 px-2 text-[10px] text-center text-gray-500">{fmtMin(s.estMin)}</td>
                      <td className="p-1 px-2 text-[10px] text-center text-gray-500">{fmtMin(s.padMin)}</td>
                      <td className="p-1 px-1"><button onClick={()=>delProc(s.seq)} className="p-0.5 text-red-300 hover:text-red-600"><Trash2 size={10}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
