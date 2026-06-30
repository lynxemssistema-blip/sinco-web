import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Trash2, Plus, Clock, X, Save, Edit2, RefreshCw, Package, FileText, PlusCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/peca-manufaturada';

interface Proc { seq:number; IdProcesso:number; nome:string; estMin:number|null; padMin:number|null; obs:string; }
interface MatRow { IdMaterial:number; CodMatFabricante:string; DescResumo:string; Espessura:string|null; MaterialSW:string|null; EnderecoArquivo:string|null; TxtTipoDesenho:string|null; FamiliaMat:any; IdEmpresa:any; Peso:any; Valor:any; DescDetal?:string; PecaManufat?:string; }

const authHdr = () => ({ 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` });





export default function MontaPecaManufaturadaPage({ usuario='Sistema' }:{usuario?:string}) {
  const { user } = useAuth();
  const idMatriz = (user as any)?.idMatriz||null;
  const uCriacao = (user as any)?.nome||usuario;
  const dropRef = useRef<HTMLDivElement>(null);

  // --- Modo normal ---
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
  const [lastAutoSeq,setLastAutoSeq]=useState<number>(0);

  // --- Modo Criar Peça Manufaturada ---
  const [modocriar, setModocriar] = useState(false);
  const [desenhos, setDesenhos] = useState<MatRow[]>([]);
  const [loadingD, setLoadingD] = useState(false);
  const [filtroD, setFiltroD] = useState('');
  const [dezenhoSel, setDezenhoSel] = useState<MatRow|null>(null);

  // Grid 2 modo criar
  const [materiais2, setMateriais2] = useState<MatRow[]>([]);
  const [loadingM2, setLoadingM2] = useState(false);
  const [filtroM2, setFiltroM2] = useState('');
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});
  const [savingLote, setSavingLote] = useState(false);


  const abrirPdf = async (caminho: string) => {
    if (!caminho || caminho.trim() === '') { alert('Endereço do arquivo não encontrado para este item.'); return; }
    try {
      const url = new URL(`${window.location.origin}/api/controle-expedicao/abrir-arquivo`);
      url.searchParams.append('caminho', caminho);
      url.searchParams.append('tipo', 'pdf');
      const res = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` } });
      const data = await res.json();
      if (!data.success) alert(data.message || 'Erro ao abrir PDF.');
    } catch { alert('Erro de comunicação ao abrir PDF.'); }
  };

  useEffect(()=>{ fetch(`${API}/processos`).then(r=>r.json()).then(j=>{ if(j.success) setTipos(j.data); }); },[]);

  // Carrega desenhos ao entrar no modo criar
  const fetchDesenhos = useCallback(async(q='')=>{
    setLoadingD(true);
    try{
      const url = q ? `${API}/desenhos-criar?q=${encodeURIComponent(q)}` : `${API}/desenhos-criar`;
      const r = await fetch(url, { headers: authHdr() });
      const j = await r.json();
      if(j.success) setDesenhos(j.data);
    }finally{ setLoadingD(false); }
  },[]);

  const entrarModocriar = ()=>{ setModocriar(true); setDezenhoSel(null); setFiltroD(''); setMateriais2([]); setSelecionados(new Set()); setQuantidades({}); fetchDesenhos(); };
  const sairModocriar  = ()=>{ setModocriar(false); setDezenhoSel(null); setDesenhos([]); setFiltroD(''); setMateriais2([]); setSelecionados(new Set()); setQuantidades({}); };

  useEffect(()=>{ if(!modocriar) return; const t=setTimeout(()=>fetchDesenhos(filtroD),300); return()=>clearTimeout(t); },[filtroD,modocriar,fetchDesenhos]);

  // Carrega materiais Grid 2 ao selecionar desenho
  const fetchMateriais2 = useCallback(async(idDesenho:number, q='')=>{
    setLoadingM2(true); setSelecionados(new Set()); setQuantidades({});
    try{
      let url = `${API}/materiais-criar?idDesenho=${idDesenho}`;
      if(q) url += `&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: authHdr() });
      const j = await r.json();
      if(j.success) setMateriais2(j.data);
    }finally{ setLoadingM2(false); }
  },[]);

  useEffect(()=>{
    if(!dezenhoSel) return;
    const t = setTimeout(()=>fetchMateriais2(dezenhoSel.IdMaterial, filtroM2),300);
    return()=>clearTimeout(t);
  },[dezenhoSel, filtroM2, fetchMateriais2]);

  const toggleSel = (id:number)=>{ 
    const m = materiais2.find(x => x.IdMaterial === id);
    if (m && dezenhoSel && m.CodMatFabricante === dezenhoSel.CodMatFabricante) {
      alert("O material selecionado é o mesmo da peça principal. Uma peça não pode ser composta por si mesma.");
      return;
    }
    setSelecionados(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); 
  };
  const toggleTodos = ()=>{ 
    const validos = materiais2.filter(m => !(dezenhoSel && m.CodMatFabricante === dezenhoSel.CodMatFabricante));
    setSelecionados(prev=>prev.size===validos.length ? new Set() : new Set(validos.map(m=>m.IdMaterial))); 
  };

  const handleSaveLote = async()=>{
    if(!dezenhoSel || selecionados.size===0) return;
    setSavingLote(true);
    try{
      const matsSel = materiais2.filter(m=>selecionados.has(m.IdMaterial)).map(m=>({...m, PecaQtde: quantidades[m.IdMaterial] !== undefined ? quantidades[m.IdMaterial] : 1}));
      const r = await fetch(`${API}/composicao-lote`, {
        method:'POST', headers:{...authHdr(),'Content-Type':'application/json'},
        body: JSON.stringify({ dezenho:{ IdMaterial:dezenhoSel.IdMaterial, CodMatFabricante:dezenhoSel.CodMatFabricante }, materiais:matsSel, usuario:uCriacao, idMatriz })
      });
      const j = await r.json();
      if(j.success){
        alert(`✅ ${j.message}`);
        fetchMateriais2(dezenhoSel.IdMaterial, filtroM2);
      } else { alert('Erro: '+j.message); }
    }finally{ setSavingLote(false); }
  };




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
        const mapped = j.data.map((p:any)=>({
          seq:p.SequenciaExecucao, IdProcesso:p.IdProcesso, nome:p.NomeProcesso,
          estMin: p.TempoEstimadoMin!=null?Number(p.TempoEstimadoMin):null,
          padMin: p.TempoPadraoMin!=null?Number(p.TempoPadraoMin):null,
          obs:p.Observacao||''
        }));
        setStaging(mapped);
        // Inicializa lastAutoSeq com o maior seq existente ao carregar
        const maxSeq = mapped.length ? Math.max(...mapped.map((s:any)=>s.seq)) : 0;
        setLastAutoSeq(maxSeq);
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

  // Próxima sequência automática baseia-se APENAS nas seqs geradas automaticamente (lastAutoSeq)
  const nextSeq=()=>lastAutoSeq+10;

  const handleAdd=()=>{
    if(!selId) return;
    const tipo = tipos.find(t=>t.IdProcessoFabricacao===selId);
    const estMinV = estMinStr ? (parseInt(estMinStr)||null) : null;
    const padMinV = padMinStr ? parseInt(padMinStr) : null;
    if(padMinV==null){ alert('Tempo Padrão (min) obrigatório'); return; }
    const userTyped = seq.trim() !== '';
    const seqN = userTyped ? (parseInt(seq)||nextSeq()) : nextSeq();
    if(editSq===null){
      // Impede processo duplicado na peça
      if(staging.some(s=>s.IdProcesso===Number(selId))){ alert(`Recurso já cadastrado nesta peça`); return; }
      if(staging.some(s=>s.seq===seqN)){ alert(`Sequência ${seqN} já existe`); return; }
      // Somente atualiza lastAutoSeq quando a sequência foi gerada automaticamente
      if(!userTyped) setLastAutoSeq(seqN);
      setStaging(prev=>[...prev,{seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}].sort((a,b)=>a.seq-b.seq));
    } else {
      // Na edição: se a seq mudou e era a base automática, recalcula lastAutoSeq do estado atual
      setStaging(prev=>{
        const updated = [...prev.map(s=>s.seq===editSq?{...s,seq:seqN,IdProcesso:Number(selId),nome:tipo?.ProcessoFabricacao||'',estMin:estMinV,padMin:padMinV,obs:ob}:s)].sort((a,b)=>a.seq-b.seq);
        return updated;
      });
    }
    clearForm();
  };

  const editProc=(s:Proc)=>{
    setEditSq(s.seq); setSelId(s.IdProcesso); setSeq(String(s.seq));
    setEstMinStr(s.estMin!=null?String(s.estMin):'');
    setPadMinStr(s.padMin!=null?String(s.padMin):'');
    setOb(s.obs);
  };

  const delProc=(sq:number)=>{ if(!confirm(`Excluir processo da sequência ${sq}?`)) return; setStaging(prev=>prev.filter(s=>s.seq!==sq)); };

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

  const fmtMin=(v:number|null)=>v==null?'-':v;
  const fieldCls="text-[10px] text-gray-700";
  const labelCls="text-[9px] text-gray-400 uppercase font-semibold";

  const desenhosFiltrados = filtroD ? desenhos.filter(d=>(d.CodMatFabricante||'').toLowerCase().includes(filtroD.toLowerCase())||(d.DescResumo||'').toLowerCase().includes(filtroD.toLowerCase())) : desenhos;

  const colsCls = "p-1 px-2 text-[9px] font-bold text-gray-500 uppercase";
  const cellCls = "p-1 px-2 text-[10px] truncate";

  return (
    <div className="h-full flex flex-col min-h-0 bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-2 py-1 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-[#32423D]"/>
            <span className="text-xs font-bold text-[#32423D] uppercase tracking-wide">Produto</span>
          </div>

          {!modocriar && (
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
                  <div key={r.IdMaterial} onClick={()=>selectPiece(r)} className="px-2 py-0.5 cursor-pointer hover:bg-blue-50 flex flex-col border-b border-gray-50 last:border-0">
                    <span className="text-[11px] font-bold text-[#32423D]">{r.CodMatFabricante}</span>
                    <span className="text-[10px] text-gray-500 truncate">{r.DescResumo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Botão Criar */}
          {!modocriar && (
            <button onClick={entrarModocriar}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 shadow-sm">
              <PlusCircle size={13}/> Criar Peça Manufaturada
            </button>
          )}

          {/* Botão Voltar (modo criar) */}
          {modocriar && (
            <button onClick={sairModocriar}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <ChevronLeft size={13}/> Voltar
            </button>
          )}

          {/* Piece details (modo normal) */}
          {!modocriar && piece&&(
            <div className="flex flex-col gap-1 border-l border-gray-200 pl-3">
              {/* Linha 1: Descrição + Espessura + Material SW + PDF */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1"><span className={labelCls}>Desc.:</span><span className={`${fieldCls} font-semibold max-w-[220px] truncate`} title={piece.DescResumo}>{piece.DescResumo||'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Esp.:</span><span className={fieldCls}>{piece.Espessura!=null?piece.Espessura:'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Mat. SW:</span><span className={`${fieldCls} max-w-[120px] truncate`} title={piece.MaterialSW||''}>{piece.MaterialSW||'-'}</span></div>
                {piece.EnderecoArquivo&&(
                  <button onClick={()=>abrirPdf(piece.EnderecoArquivo)} className="flex items-center gap-1 px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded border border-red-200 text-[9px] font-bold" title="Abrir Desenho PDF">
                    <FileText size={11}/> PDF
                  </button>
                )}
              </div>
              {/* Linha 2: Dimensões + Peso */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1"><span className={labelCls}>Ãrea Pint.:</span><span className={fieldCls}>{piece.AreaPintura!=null?piece.AreaPintura:'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Peso:</span><span className={fieldCls}>{piece.Peso!=null?piece.Peso:'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Unid.:</span><span className={fieldCls}>{piece.Unidade||'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Alt.:</span><span className={fieldCls}>{piece.Altura!=null?piece.Altura:'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Larg.:</span><span className={fieldCls}>{piece.Largura!=null?piece.Largura:'-'}</span></div>
                <div className="flex items-center gap-1"><span className={labelCls}>Prof.:</span><span className={fieldCls}>{piece.Profundidade!=null?piece.Profundidade:'-'}</span></div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2 GRIDS */}
      <div className="flex-1 flex min-h-0 gap-0">

        {/* GRID 1 */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col min-h-0 bg-white">

          {/* Header Grid 1 */}
          {modocriar ? (
            <div className="px-2 py-1 bg-emerald-50 border-b border-emerald-200 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Desenhos Disponíveis</span>
              <span className="text-[9px] text-emerald-600">{desenhos.length} item(ns)</span>
            </div>
          ) : (
            <div className="px-2 py-1 bg-blue-50/70 border-b border-blue-100 shrink-0 flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Composição Atual</span>
              <span className="text-[9px] text-blue-600">{comp.length} item(ns)</span>
            </div>
          )}

          {/* Filtro Grid 1 */}
          <div className="px-2 py-1.5 border-b border-gray-100 shrink-0">
            {modocriar ? (
              <input value={filtroD} onChange={e=>setFiltroD(e.target.value)}
                placeholder="Filtrar desenhos..." className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-emerald-600"/>
            ) : (
              <input value={fComp} onChange={e=>setFComp(e.target.value)}
                placeholder="Filtrar..." className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-[#32423D]"/>
            )}
          </div>

          {/* Conteúdo Grid 1 */}
          <div className="flex-1 overflow-auto">
            {modocriar ? (
              loadingD ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={15}/></div>
              ) : desenhosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-[10px] text-gray-400">Nenhum desenho encontrado</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className={colsCls}>ID</th>
                      <th className={colsCls}>Código</th>
                      <th className={colsCls}>Descrição</th>
                      <th className={colsCls}>Esp.</th>
                      <th className={colsCls}>Mat.SW</th>
                      <th className={colsCls}>Tipo</th>
                        <th className={colsCls}>Manufat.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {desenhosFiltrados.map(d=>(
                      <tr key={d.IdMaterial}
                        onClick={()=>setDezenhoSel(d)}
                        className={`cursor-pointer hover:bg-emerald-50/60 ${dezenhoSel?.IdMaterial===d.IdMaterial?'bg-emerald-100 ring-1 ring-inset ring-emerald-400':''}`}>
                        <td className={`${cellCls} text-gray-400 font-mono`}>{d.IdMaterial}</td>
                        <td className={`${cellCls} font-bold text-[#32423D] max-w-[80px]`} title={d.CodMatFabricante}>{d.CodMatFabricante}</td>
                        <td className={`${cellCls} text-gray-600 max-w-[100px]`} title={d.DescResumo}>{d.DescResumo||'-'}</td>
                        <td className={cellCls}>{d.Espessura||'-'}</td>
                        <td className={`${cellCls} max-w-[80px]`} title={d.MaterialSW||''}>{d.MaterialSW||'-'}</td>
                        <td className={`${cellCls} max-w-[70px]`} title={d.TxtTipoDesenho||''}>{d.TxtTipoDesenho||'-'}</td>
                          <td className={`${cellCls} text-center font-bold`} title={d.PecaManufat||''}>{d.PecaManufat||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0">
                  <tr><th className="p-1 px-1 w-14"></th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Código</th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Descrição</th><th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center">Qtde</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compFiltrada.map(c=>(
                    <tr key={c.IdMontaPeca} className="hover:bg-red-50/30 group">
                      <td className="p-1 px-1 text-center">
                        <button onClick={()=>removeComp(c.IdMontaPeca)} className="p-0.5 text-red-300 hover:text-red-600 rounded" title="Excluir"><Trash2 size={11}/></button>
                        <button onClick={()=>abrirPdf(c.EnderecoArquivo||'')} className="p-0.5 text-red-400 hover:text-red-600 rounded ml-0.5" title="Abrir Desenho PDF"><FileText size={11}/></button>
                      </td>
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

        {/* GRID 2 */}
        <div className="w-2/3 flex flex-col min-h-0 bg-white">

          {modocriar ? (<>
            {/* Header Grid 2 - Materiais para ComposiÃ§Ã£o */}
            <div className="px-2 py-1 bg-indigo-50 border-b border-indigo-200 shrink-0 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Materiais para Composição</span>
              {dezenhoSel && <span className="text-[9px] text-indigo-500 font-mono">Desenho: {dezenhoSel.CodMatFabricante}</span>}
              <span className="text-[9px] text-indigo-400 ml-auto">{selecionados.size} selecionado(s) / {materiais2.length} item(ns)</span>
            </div>

            {/* Barra de filtro + ações */}
            <div className="px-2 py-1.5 border-b border-gray-100 shrink-0 flex items-center gap-2">
              <input value={filtroM2} onChange={e=>setFiltroM2(e.target.value)}
                placeholder="Filtrar materiais..." disabled={!dezenhoSel}
                className="flex-1 px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-indigo-500 disabled:opacity-40"/>
              <button onClick={handleSaveLote} disabled={savingLote||selecionados.size===0||!dezenhoSel}
                className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                {savingLote?<Loader2 size={11} className="animate-spin"/>:<Save size={11}/>} Gravar ({selecionados.size})
              </button>
            </div>

            {/* Tabela materiais */}
            <div className="flex-1 overflow-auto">
              {!dezenhoSel ? (
                <div className="p-6 text-center text-[11px] text-gray-400">â† Selecione um desenho no Grid 1</div>
              ) : loadingM2 ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={15}/></div>
              ) : materiais2.length===0 ? (
                <div className="p-4 text-center text-[10px] text-gray-400">Nenhum material disponível</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-1 px-2 w-8">
                        <input type="checkbox"
                          checked={selecionados.size===materiais2.length && materiais2.length>0}
                          onChange={toggleTodos}
                          className="accent-emerald-600 cursor-pointer" title="Selecionar todos"/>
                      </th>
                      <th className={colsCls}>ID</th>
                       <th className={colsCls}>Codigo</th>
                       <th className={colsCls}>Descricao</th>
                      <th className={colsCls}>Esp.</th>
                      <th className={colsCls}>Mat.SW</th>
                      <th className={colsCls}>Tipo</th>
                      <th className={`\${colsCls} text-center w-16`}>QTD.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {materiais2.map(m=>(
                      <tr key={m.IdMaterial} onClick={()=>toggleSel(m.IdMaterial)}
                        className={`cursor-pointer hover:bg-indigo-50/50 ${selecionados.has(m.IdMaterial)?'bg-indigo-50 ring-1 ring-inset ring-indigo-300':''}`}>
                        <td className="p-1 px-2" onClick={e=>e.stopPropagation()}>
                          <input type="checkbox" checked={selecionados.has(m.IdMaterial)} onChange={()=>toggleSel(m.IdMaterial)} className="accent-emerald-600 cursor-pointer"/>
                        </td>
                        <td className={`${cellCls} text-gray-400 font-mono`}>{m.IdMaterial}</td>
                        <td className={`${cellCls} font-bold text-[#32423D] max-w-[90px]`} title={m.CodMatFabricante}>{m.CodMatFabricante}</td>
                        <td className={`${cellCls} text-gray-600 max-w-[120px]`} title={m.DescResumo||m.DescDetal||''}>{m.DescResumo||m.DescDetal||'-'}</td>
                        <td className={cellCls}>{m.Espessura||'-'}</td>
                        <td className={`${cellCls} max-w-[80px]`} title={m.MaterialSW||''}>{m.MaterialSW||'-'}</td>
                        <td className={`${cellCls} max-w-[70px]`} title={m.TxtTipoDesenho||''}>{m.TxtTipoDesenho||'-'}</td>
                        <td className="p-1 px-2" onClick={e=>e.stopPropagation()}>
                          {selecionados.has(m.IdMaterial) ? (
                            <input type="number" min="0" step="0.01" 
                              value={quantidades[m.IdMaterial] !== undefined ? quantidades[m.IdMaterial] : 1}
                              onChange={(e) => setQuantidades(q => ({...q, [m.IdMaterial]: e.target.value === '' ? 0 : Number(e.target.value)}))}
                              className="w-16 px-1 py-0.5 text-[10px] border border-emerald-300 rounded focus:outline-none focus:border-emerald-600 bg-white"
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>) : (<>

            {/* Header do Grid 2 - modo normal */}
            <div className="px-2 py-1 bg-teal-50/70 border-b border-teal-100 shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide">Processos de Fabricação</span>
              <span className="text-[9px] text-teal-600">{staging.length} processo(s)</span>
              {piece&&<button onClick={()=>fetchProcs(piece.CodMatFabricante)} className="p-0.5 text-teal-500 hover:text-teal-700" title="Atualizar"><RefreshCw size={11}/></button>}
            </div>

            {/* TOP: Lista de processos */}
            <div className="flex-1 overflow-auto border-b border-gray-200">
              {loadingP?(<div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={15}/></div>)
              :!piece?(<div className="p-4 text-center text-[10px] text-gray-400">Selecione uma peça</div>)
              :staging.length===0?(<div className="p-4 text-center text-[10px] text-gray-400">Nenhum processo cadastrado</div>):(
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase w-10">Seq</th>
                      <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Recurso</th>
                      <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center w-16">Setup</th>
                      <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase text-center w-16">Padrão</th>
                      <th className="p-1 px-2 text-[9px] font-bold text-gray-500 uppercase">Obs.</th>
                      <th className="p-1 px-1 w-14"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {staging.map(s=>(
                      <tr key={s.seq} className={`hover:bg-teal-50/30 ${editSq===s.seq?'bg-blue-50':''}`}>
                        <td className="p-1 px-2"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] font-bold">{s.seq}</span></td>
                        <td className="p-1 px-2 text-[10px] font-semibold text-gray-800">{s.nome}</td>
                        <td className="p-1 px-2 text-[10px] text-center text-gray-600">{fmtMin(s.estMin)}</td>
                        <td className="p-1 px-2 text-[10px] text-center text-gray-600">{fmtMin(s.padMin)}</td>
                        <td className="p-1 px-2 text-[10px] text-gray-500 truncate max-w-[120px]" title={s.obs||''}>{s.obs||'-'}</td>
                        <td className="p-1 px-1 text-right whitespace-nowrap">
                          <button onClick={()=>editProc(s)} className="p-0.5 text-blue-400 hover:text-blue-600 mr-1" title="Editar"><Edit2 size={10}/></button>
                          <button onClick={()=>delProc(s.seq)} className="p-0.5 text-red-300 hover:text-red-600" title="Excluir"><Trash2 size={10}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* BOTTOM: Form de manutenção */}
            <div className="px-2 py-1 bg-amber-50/60 border-t border-amber-100 shrink-0">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex flex-col flex-1 min-w-[140px]">
                  <span className="text-[8.5px] text-gray-400 uppercase font-semibold mb-0.5">Recurso</span>
                  <select value={selId} onChange={e=>setSelId(e.target.value?Number(e.target.value):'')}
                    disabled={editSq!==null}
                    className={`px-1.5 py-0.5 text-[10px] border rounded focus:outline-none bg-white ${editSq!==null?'border-gray-100 text-gray-400':'border-gray-300 focus:border-[#32423D]'}`}>
                    <option value="">- Selecione -</option>
                    {tipos.filter(t=>editSq!==null||!staging.some(s=>s.IdProcesso===t.IdProcessoFabricacao))
                      .map(t=>(<option key={t.IdProcessoFabricacao} value={t.IdProcessoFabricacao}>{t.ProcessoFabricacao}</option>))}
                  </select>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[8.5px] text-gray-400 uppercase font-semibold mb-0.5">Seq.</span>
                  <input type="number" min="1" step="1" value={seq} onChange={e=>setSeq(e.target.value)}
                    placeholder={String(nextSeq())}
                    className="w-14 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-300 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 bg-white border border-gray-200 rounded px-2 py-0.5">
                  <Clock size={10} className="text-[#32423D]"/>
                  <span className="text-[9px] font-bold text-gray-600">Setup</span>
                  <input type="number" min="0" value={estMinStr} onChange={e=>setEstMinStr(e.target.value)}
                    placeholder="0" className="w-12 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
                  <span className="text-[8px] text-gray-400">min</span>
                  <div className="w-px h-3 bg-gray-200"/>
                  <span className="text-[9px] font-bold text-gray-600">Padrão<span className="text-red-500">*</span></span>
                  <input type="number" min="0" value={padMinStr} onChange={e=>setPadMinStr(e.target.value)}
                    placeholder="0" className="w-12 px-1 py-0.5 text-center text-[10px] font-mono border border-gray-200 rounded focus:outline-none focus:border-[#32423D] placeholder:text-gray-300"/>
                  <span className="text-[8px] text-gray-400">min</span>
                </div>
                <div className="flex-1 min-w-[100px]">
                  <input value={ob} onChange={e=>setOb(e.target.value)} placeholder="Observação..."
                    className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-[#32423D]"/>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={handleAdd} disabled={!selId}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#32423D] text-white text-[10px] font-bold rounded hover:bg-[#25322e] disabled:opacity-40">
                    <Plus size={11}/>{editSq!==null?'Atualizar':'Adicionar'}
                  </button>
                  <button onClick={handleSave} disabled={saving||!piece||staging.length===0}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#32423D] text-white text-[10px] font-bold rounded hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed">
                    {saving?<Loader2 size={10} className="animate-spin"/>:<Save size={10}/>} Salvar
                  </button>
                  {editSq!==null&&<button onClick={clearForm} className="px-2 py-0.5 text-[10px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 bg-white">Cancelar</button>}
                </div>
              </div>
            </div>
          </>)}

        </div>

      </div>
    </div>
  );
}

