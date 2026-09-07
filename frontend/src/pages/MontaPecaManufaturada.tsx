import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Trash2, Save, Package, PlusCircle, ChevronLeft, Wrench, ChevronRight, ChevronDown, X, Edit2, Clock, Check, Plus, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = '/api/peca-manufaturada';

interface Proc { seq:number; IdProcesso:number; nome:string; estMin:number|null; padMin:number|null; obs:string; }
interface MatRow { 
  IdMaterial:number; 
  CodMatFabricante:string; 
  DescResumo:string; 
  Espessura:string|null; 
  MaterialSW:string|null; 
  EnderecoArquivo:string|null; 
  TxtTipoDesenho:string|null; 
  FamiliaMat:any; 
  IdEmpresa:any; 
  Peso:any; 
  Valor:any; 
  DescDetal?:string; 
  PecaManufat?:string; 
  AreaPintura?:any;
  Unidade?:string;
  Altura?:any;
  Largura?:any;
  Qtde?:any;
  PecaQtde?:number;
}

const authHdr = () => ({ 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` });

export default function MontaPecaManufaturadaPage({ usuario='Sistema', initialCodMatFabricante, osId, osContext, qtdSelecionada }:{usuario?:string, initialCodMatFabricante?:string, osId?:any, osContext?:any, qtdSelecionada?:number}) {
  const { user, token } = useAuth();
  const idMatriz = (user as any)?.idMatriz||null;
  const uCriacao = (user as any)?.nome||usuario;

  // Grid 1: Pesquisa de Materiais
  const [materiais1, setMateriais1] = useState<MatRow[]>([]);
  const [loading1, setLoading1] = useState(false);
  const [fCod1, setFCod1] = useState(initialCodMatFabricante || '');
  const [fDesc1, setFDesc1] = useState('');
  const [selMat1, setSelMat1] = useState<MatRow|null>(null);

  // Grid 1 (Base): Composição da Peça Selecionada
  const [comp2, setComp2] = useState<any[]>([]);
  const [loading2, setLoading2] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [subComps, setSubComps] = useState<Record<number, any[]>>({});
  const [loadingSub, setLoadingSub] = useState<Record<number, boolean>>({});

  // Grid 2: Processos e Recursos
  const [tipos, setTipos] = useState<any[]>([]);
  const [staging, setStaging] = useState<Proc[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [selId, setSelId] = useState<number|''>('');
  const [procSearch, setProcSearch] = useState('');
  const [procTableFiltro, setProcTableFiltro] = useState('');
  const [seq, setSeq] = useState('');
  const [ob,setOb]=useState('');
  const [estMin, setEstMin] = useState('');
  const [padMin, setPadMin] = useState('');
  const [savingProc,setSavingProc]=useState(false);
  const [lastAutoSeq,setLastAutoSeq]=useState<number>(0);
  
  // Grid 2 Inline Edição
  const [editSq,setEditSq]=useState<number|null>(null);
  const [draggedProc, setDraggedProc] = useState<number | null>(null);
  const [dragOverProc, setDragOverProc] = useState<{ seq: number, position: 'top' | 'bottom' } | null>(null);
  const [inlineOb, setInlineOb] = useState('');
  const [inlineSeq, setInlineSeq] = useState('');
  const [inlineEst, setInlineEst] = useState('');
  const [inlinePad, setInlinePad] = useState('');

  // Grid 3: Inclusão de Novos Itens
    const [materiais3, setMateriais3] = useState<MatRow[]>([]);
  const [loading3, setLoading3] = useState(false);
  const [fCod3, setFCod3] = useState('');
  const [fDesc3, setFDesc3] = useState('');
  const [filtroCod3, setFiltroCod3] = useState('');
  const [filtroDesc3, setFiltroDesc3] = useState('');
  const [selecionados3, setSelecionados3] = useState<Set<number>>(new Set());
  const [quantidades3, setQuantidades3] = useState<Record<number, number>>({});
  const [saving3, setSaving3] = useState(false);

  const fmt = (v:any) => v != null ? String(v) : '-';
  const fmtMin=(v:number|null)=>v==null?'-':v;

  const abrirPdf = async (caminho: string) => {
    if (!caminho || caminho.trim() === '') { alert('Endereço do arquivo não encontrado para este item.'); return; }
    try {
      const url = new URL(`${window.location.origin}/api/controle-expedicao/abrir-arquivo`);
      url.searchParams.append('caminho', caminho);
      url.searchParams.append('tipo', 'pdf');
      const res = await fetch(url.toString(), { headers: authHdr() });
      const data = await res.json();
      if (!data.success) alert(data.message || 'Erro ao abrir PDF.');
    } catch { alert('Erro de comunicação ao abrir PDF.'); }
  };

  useEffect(() => {
    if (!token) return;
    fetch('/api/recursos', { headers: authHdr() })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const mapped = j.data.map((d: any) => ({ ...d, ProcessoFabricacao: d.processofabricacao }));
          setTipos(mapped);
        }
      });
  }, [token]);

  const fetchMateriais1 = useCallback(async (cod: string, desc: string) => {
    if (!token) return;
    setLoading1(true);
    try {
      let url = `${API}/materiais-criar?`;
      if (cod) url += `cod=${encodeURIComponent(cod)}&`;
      if (desc) url += `desc=${encodeURIComponent(desc)}&`;
      
      const r = await fetch(url, { headers: authHdr() });
      const j = await r.json();
      if (j.success) {
        setMateriais1(j.data);
        if (j.data.length === 0) {
          setSelMat1(null);
          setComp2([]);
          setStaging([]);
        }
      }
    } finally {
      setLoading1(false);
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => fetchMateriais1(fCod1, fDesc1), 400);
    return () => clearTimeout(t);
  }, [fCod1, fDesc1, fetchMateriais1]);

  const clearTotal1 = () => {
    setFCod1('');
    setFDesc1('');
    setSelMat1(null);
    setComp2([]);
    setStaging([]);

  };

  const fetchComp2 = useCallback(async (idMat: number) => {
    setLoading2(true);
    try {
      const r = await fetch(`${API}/composicao/${idMat}`, { headers: authHdr() });
      const j = await r.json();
      if (j.success) {
        setComp2(j.data);
      }
    } finally {
      setLoading2(false);
    }
  }, []);

  const fetchProcs = useCallback(async (cod: string) => {
    setLoadingP(true);
    try { 
      let url = `${API}/processos-existentes/${encodeURIComponent(cod)}`;
      if (osId) {
        url = `/api/ordemservico/${osId}/materiais-em-processo`;
        const qsParams = [];
        if (osContext?.IdProjeto) qsParams.push(`idProjeto=${osContext.IdProjeto}`);
        if (osContext?.IdTag) qsParams.push(`idTag=${osContext.IdTag}`);
        if (qsParams.length > 0) url += `?${qsParams.join('&')}`;
      }

      const r = await fetch(url, { headers: authHdr() }); 
      const j = await r.json();
      if (j.success) {
        let mapped = [];
        if (osId) {
           const matData = j.data.find((m: any) => m.codmatfabricante === cod);
           if (matData && matData.recursoTempos) {
              mapped = Object.values(matData.recursoTempos)
                .map((rt: any) => ({
                   seq: rt.SequenciaExecucao || 99,
                   IdProcesso: rt.IdProcesso,
                   nome: rt.label,
                   estMin: rt.tempoSetup != null ? Number(rt.tempoSetup) : null,
                   padMin: rt.tempoPadrao != null ? Number(rt.tempoPadrao) : null,
                   obs: rt.Observacao || ''
                }))
                .filter((rt: any) => rt.IdProcesso)
                .sort((a: any, b: any) => a.seq - b.seq);
           }
        } else {
           mapped = j.data.map((p:any) => ({
             seq: p.SequenciaExecucao, IdProcesso: p.IdProcesso, nome: p.NomeProcesso,
             estMin: p.TempoEstimadoMin != null ? Number(p.TempoEstimadoMin) : null,
             padMin: p.TempoPadraoMin != null ? Number(p.TempoPadraoMin) : null,
             obs: p.Observacao || ''
           }));
        }
        
        setStaging(mapped);
        const maxSeq = mapped.length ? Math.max(...mapped.map((s:any) => s.seq)) : 0;
        setLastAutoSeq(maxSeq);
      }
    } finally { 
      setLoadingP(false); 
    }
  }, [osId, osContext]);

  const selectMat1 = async (m: MatRow) => {
    if (selMat1 && selMat1.IdMaterial === m.IdMaterial) return;
    setSelMat1(null);
    try {
      const r = await fetch(`/api/material/${m.IdMaterial}`, { headers: authHdr() });
      const j = await r.json();
      if (j.success) setSelMat1(j.data);
      else setSelMat1(m);
    } catch { 
      setSelMat1(m); 
    }
    
    setExpandedItems(new Set());
    setSubComps({});
    setSelecionados3(new Set());
    setQuantidades3({});
    setEditSq(null);

    clearForm();

    fetchComp2(m.IdMaterial);
    fetchProcs(m.CodMatFabricante);
  };

  const fetchSubComp = async (idMontaPeca: number, idMaterial: number) => {
    if (expandedItems.has(idMontaPeca)) {
      setExpandedItems(prev => { const n = new Set(prev); n.delete(idMontaPeca); return n; });
      return;
    }
    setExpandedItems(prev => { const n = new Set(prev); n.add(idMontaPeca); return n; });
    
    if (subComps[idMontaPeca]) return; 

    setLoadingSub(prev => ({ ...prev, [idMontaPeca]: true }));
    try {
      const r = await fetch(`${API}/composicao/${idMaterial}`, { headers: authHdr() });
      const j = await r.json();
      if (j.success) {
        setSubComps(prev => ({ ...prev, [idMontaPeca]: j.data }));
      }
    } finally {
      setLoadingSub(prev => ({ ...prev, [idMontaPeca]: false }));
    }
  };

  const removeComp = async (idMontaPeca: number) => {
    if (!confirm('Excluir item da composição?')) return;
    try {
      const r = await fetch(`${API}/composicao/${idMontaPeca}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHdr() },
        body: JSON.stringify({ usuario: uCriacao, idMatriz })
      });
      const j = await r.json();
      if (j.success) {
        if (selMat1) fetchComp2(selMat1.IdMaterial);
      } else {
        showAlert(j.message || 'Erro ao remover item', 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert('Erro de comunicação ao excluir item.', 'error');
    }
  };

  const clearForm = () => { setSelId(''); setProcSearch(''); setSeq(''); setOb(''); setEstMin(''); setPadMin(''); };
  const nextSeq = () => lastAutoSeq + 10;

  const saveProcs = async (newStaging: Proc[]) => {
    if(!selMat1) return;
    setSavingProc(true);
    try{
      const body={ processos:newStaging.map(s=>({IdProcesso:s.IdProcesso,SequenciaExecucao:s.seq,TempoEstimadoMin:s.estMin,TempoPadraoMin:s.padMin,Observacao:s.obs})),
        codmatFabricante:selMat1.CodMatFabricante, idMatriz, usuarioCriacao:uCriacao, replace:true, osId, idProjeto: osContext?.IdProjeto, idTag: osContext?.IdTag, qtdSelecionada };
      const r=await fetch(`${API}/material-processo`,{method:'POST',headers:{...authHdr(), 'Content-Type':'application/json'},body:JSON.stringify(body)});
      const j=await r.json();
      if(j.success) {
        setStaging(newStaging);
        fetchProcs(selMat1.CodMatFabricante);
      }
      else alert('Erro: '+j.message);
    }finally{ setSavingProc(false); }
  };

  const handleAddProc = async () => {
    if (!selId) return;
    const tipo = tipos.find(t => t.IdProcessoFabricacao == selId);
    
    const userTyped = seq.trim() !== '';
    const seqN = userTyped ? (parseInt(seq) || nextSeq()) : nextSeq();
    
    const isFabricaNao = tipo && ['NÃO', 'NAO', 'N', 'NÂO'].includes(String(tipo.Fabrica || tipo.fabrica || '').toUpperCase().trim());
    if (!isFabricaNao) {
       if (!estMin || !padMin) { alert('Informe o Tempo Setup e Tempo Padrão'); return; }
    }

    if (staging.some(s => s.seq === seqN)) { alert(`Sequência ${seqN} já existe`); return; }
    
    if (!userTyped) setLastAutoSeq(seqN);
    const updated = [...staging, { seq: seqN, IdProcesso: Number(selId), nome: tipo?.ProcessoFabricacao || '', estMin: estMin ? Number(estMin) : null, padMin: padMin ? Number(padMin) : null, obs: ob }].sort((a, b) => a.seq - b.seq);
    await saveProcs(updated);
    
    clearForm();
  };

  const delProc = async (sq: number) => { 
    if (!window.confirm(`Excluir processo da sequência ${sq}?`)) return; 
    const updated = staging.filter(s => s.seq !== sq);
    await saveProcs(updated); 
  };

  const startInlineEdit = (s: Proc) => {
    setEditSq(s.seq);
    setInlineOb(s.obs || '');
    setInlineSeq(String(s.seq));
    setInlineEst(s.estMin !== null ? String(s.estMin) : '');
    setInlinePad(s.padMin !== null ? String(s.padMin) : '');
  };

  const saveInlineEdit = async () => {
    if (editSq === null) return;

    const newSeq = parseInt(inlineSeq);
    if (isNaN(newSeq) || newSeq <= 0) { alert('Sequência inválida'); return; }
    
    const sToEdit = staging.find(p => p.seq === editSq);
    const tipo = tipos.find(t => t.IdProcessoFabricacao == sToEdit?.IdProcesso);
    const isFabricaNao = tipo && ['NÃO', 'NAO', 'N', 'NÂO'].includes(String(tipo.Fabrica || tipo.fabrica || '').toUpperCase().trim());

    if (!isFabricaNao) {
      if (!inlineEst || !inlinePad) { alert('Informe o Tempo Setup e Tempo Padrão'); return; }
    }

    let isValid = true;
    if (newSeq !== editSq && staging.some(p => p.seq === newSeq)) {
      isValid = false;
    } else {
      const updated = staging.map(s => s.seq === editSq ? { ...s, seq: newSeq, estMin: inlineEst ? Number(inlineEst) : null, padMin: inlinePad ? Number(inlinePad) : null, obs: inlineOb } : s).sort((a, b) => a.seq - b.seq);
      await saveProcs(updated);
    }

    if (isValid) {
      setEditSq(null);
    } else {
      alert('Já existe um processo com esta sequência. Por favor, escolha outra.');
    }
  };

  const handleDropProc = async (e: React.DragEvent, targetSeq: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedProc === null || draggedProc === targetSeq || !dragOverProc) {
      setDraggedProc(null);
      setDragOverProc(null);
      return;
    }

    const currentProcs = [...staging].sort((a, b) => a.seq - b.seq);
    const draggedIdx = currentProcs.findIndex(p => p.seq === draggedProc);
    const targetIdx = currentProcs.findIndex(p => p.seq === targetSeq);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const itemToMove = currentProcs.splice(draggedIdx, 1)[0];
    
    let insertIdx = currentProcs.findIndex(p => p.seq === targetSeq);
    if (dragOverProc.position === 'bottom') {
      insertIdx++;
    }

    currentProcs.splice(insertIdx, 0, itemToMove);
    
    const updated = currentProcs.map((p, idx) => ({ ...p, seq: (idx + 1) * 10 }));
    
    setDraggedProc(null);
    setDragOverProc(null);
    
    await saveProcs(updated);
  };
  
  // GRID 3 Logic
  const fetchMateriais3 = useCallback(async (cod: string, desc: string) => {
    setLoading3(true);
    try {
      let url = `${API}/materiais-criar?`;
      if (cod) url += `cod=${encodeURIComponent(cod)}&`;
      if (desc) url += `desc=${encodeURIComponent(desc)}&`;
      
      const r = await fetch(url, { headers: authHdr() });
      const j = await r.json();
      if (j.success) {
         setMateriais3(j.data);
      }
    } finally {
      setLoading3(false);
    }
  }, []);

  useEffect(() => {
    if (!selMat1) return;
    const t = setTimeout(() => fetchMateriais3(fCod3, fDesc3), 400);
    return () => clearTimeout(t);
  }, [fCod3, fDesc3, selMat1, fetchMateriais3]);

  // Filtrar do grid 3 os materiais que JÁ ESTÃO na composição (como filhos diretos ou como si mesmo)
  const materiais3Filtrados = materiais3.filter(m => {
    if (selMat1 && m.IdMaterial === selMat1.IdMaterial) return false;
    if (comp2.some(c => c.IdMaterial === m.IdMaterial)) return false;
    return true;
  });

  const toggleSel3 = (id: number) => {
    setSelecionados3(prev => { 
      const n = new Set(prev); 
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n; 
    });
  };

  const handleSaveComp3 = async () => {
    if (!selMat1 || selecionados3.size === 0) return;
    setSaving3(true);
    try {
      const matsSel = materiais3Filtrados.filter(m => selecionados3.has(m.IdMaterial)).map(m => ({
        ...m, 
        PecaQtde: quantidades3[m.IdMaterial] !== undefined ? quantidades3[m.IdMaterial] : 1
      }));
      
      const r = await fetch(`${API}/composicao-lote`, {
        method: 'POST', 
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dezenho: { IdMaterial: selMat1.IdMaterial, CodMatFabricante: selMat1.CodMatFabricante }, 
          materiais: matsSel, 
          usuario: uCriacao, 
          idMatriz 
        })
      });
      
      const j = await r.json();
      if (j.success) {
        alert(`Composição atualizada!`);
        fetchComp2(selMat1.IdMaterial);
        setSelecionados3(new Set());
        setQuantidades3({});
      } else { 
        alert('Erro: ' + j.message); 
      }
    } catch (e) {
      alert('Erro ao salvar');
    } finally {
      setSaving3(false);
    }
  };

  const handleUpdateQtdeComp = async (idMaterialPai: number, idFilho: number, newQtde: number) => {
    try {
      const r = await fetch(`${API}/composicao-qtde`, {
        method: 'PUT',
        headers: { ...authHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ idMaterialPai, idMaterialFilho: idFilho, qtde: newQtde })
      });
      const j = await r.json();
      if (j.success) {
        if (selMat1 && idMaterialPai === selMat1.IdMaterial) {
           setComp2(prev => prev.map(m => m.IdMaterial === idFilho ? { ...m, PecaQtde: newQtde } : m));
        } else {
           setSubComps(prev => {
              const updated = { ...prev };
              for (const key in updated) {
                 updated[key] = updated[key].map(m => (m.IdMaterial === idFilho && m.IdMaterialPeca === idMaterialPai) ? { ...m, PecaQtde: newQtde } : m);
              }
              return updated;
           });
        }
      } else {
        alert('Erro ao atualizar quantidade: ' + j.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao atualizar quantidade');
    }
  };

  const renderRecursiveRows = (items: any[], level: number = 0) => {
    return items.map(c => {
      const isPeca = c.PecaManufat === 'S';
      const isExpanded = expandedItems.has(c.IdMontaPeca);
      const subs = subComps[c.IdMontaPeca] || [];
      const isLoadingSub = loadingSub[c.IdMontaPeca];
      
      return (
        <React.Fragment key={c.IdMontaPeca}>
          <tr className={`hover:bg-blue-50/40 group transition-colors ${isExpanded ? 'bg-blue-50/80' : ''}`}>
            <td className="p-1 px-1 text-center whitespace-nowrap">
              <div className="flex items-center" style={{ marginLeft: `${level * 12}px` }}>
                {isPeca ? (
                  <button onClick={() => fetchSubComp(c.IdMontaPeca, c.IdMaterial)} className="p-0.5 text-blue-500 hover:text-blue-700 bg-white rounded shadow-sm border border-blue-200 mr-0.5" title={isExpanded ? "Recolher composição" : "Expandir composição"}>
                    {isExpanded ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  </button>
                ) : <div className="w-[18px] mr-0.5 inline-block"></div>}
                
                {/* LIXEIRA APENAS PARA NÍVEL 1 (Level === 0 na recursão) */}
                {level === 0 && (
                  <button onClick={() => removeComp(c.IdMontaPeca)} className="p-0.5 text-red-400 hover:text-red-600 rounded bg-white border border-red-100 shadow-sm mr-0.5" title="Excluir item da estrutura">
                    <Trash2 size={11}/>
                  </button>
                )}
                {c.EnderecoArquivo && <button onClick={()=>abrirPdf(c.EnderecoArquivo)} className="p-0.5 text-red-400 hover:text-red-600 rounded" title="Abrir Desenho PDF"><FileText size={11}/></button>}
              </div>
            </td>
            <td className="p-1 px-1.5 text-center">
               <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${level === 0 ? 'bg-gray-100 text-gray-600' : level === 1 ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                 {level + 1}
               </span>
               {isPeca && <span className="ml-1 text-[8px] text-emerald-600 font-bold uppercase bg-emerald-100 px-1 py-0.5 rounded">Peça</span>}
            </td>
            <td className="p-1 px-1.5 text-[10px] font-mono font-bold text-[#32423D] truncate max-w-[90px]" title={c.CodMatFabricante}>
              {level > 0 && <span className="text-blue-400 font-bold mr-0.5">↳</span>}
              <span className={level > 0 ? 'text-blue-700' : ''}>{c.CodMatFabricante}</span>
            </td>
            <td className={`p-1 px-1.5 text-[9.5px] truncate max-w-[100px] ${level > 0 ? 'text-blue-600' : 'text-gray-600'}`} title={c.DescDetal}>
              {c.DescDetal}
            </td>
            <td className="p-1 px-1.5 text-center" onClick={e => e.stopPropagation()}>
              <input 
                type="number" 
                min="0.01" 
                step="0.01"
                className="w-16 px-1 py-0.5 text-[10px] font-bold text-center border border-gray-200 rounded bg-white hover:border-indigo-400 focus:outline-none focus:border-indigo-500"
                defaultValue={c.PecaQtde || 1}
                onFocus={(e) => e.target.select()}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0 && val !== (c.PecaQtde || 1)) {
                    handleUpdateQtdeComp(c.IdMaterialPeca, c.IdMaterial, val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                     e.currentTarget.blur();
                  }
                }}
              />
            </td>
          </tr>
          
          {isExpanded && isLoadingSub && (
            <tr><td colSpan={5} className="text-center p-2 text-[9.5px] text-gray-400"><Loader2 size={12} className="animate-spin inline mr-1 text-blue-400"/> Carregando sub-nível...</td></tr>
          )}
          
          {isExpanded && !isLoadingSub && subs.length > 0 && renderRecursiveRows(subs, level + 1)}
          
          {isExpanded && !isLoadingSub && subs.length === 0 && (
            <tr><td colSpan={5} className="text-center p-2 text-[9px] text-orange-500 bg-orange-50/50">Esta peça não possui itens na sua composição.</td></tr>
          )}
        </React.Fragment>
      );
    });
  };

  const colsCls = "p-1.5 px-2 text-[9px] font-bold text-gray-500 uppercase tracking-wide";
  const cellCls = "p-1.5 px-2 text-[10px] truncate";

  return (
    <div className="h-screen flex flex-col min-h-0 bg-gray-100 font-sans">
      <div className="flex-1 flex min-h-0 divide-x divide-gray-200">
        
        {/* =========================================
            GRID 1: PESQUISA, DETALHES E COMPOSIÇÃO 
            ========================================= */}
        <div className="flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-[40%]">
          
          {/* TOPO: PESQUISA */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 border-b border-emerald-100 shrink-0">
            <div className="px-3 py-2 border-b border-emerald-100/50 flex justify-between items-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search size={13} /> 1. Pesquisa de Material
              </span>
              <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{materiais1.length} registros</span>
            </div>
            <div className="p-2 flex gap-1.5 relative items-center">
              <div className="relative flex-1">
                <input value={fCod1} onChange={e=>setFCod1(e.target.value)} placeholder="Código..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"/>
                {fCod1 && <button onClick={()=>setFCod1('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar Código"><X size={12}/></button>}
              </div>
              <div className="relative flex-1">
                <input value={fDesc1} onChange={e=>setFDesc1(e.target.value)} placeholder="Descrição..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"/>
                {fDesc1 && <button onClick={()=>setFDesc1('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar Descrição"><X size={12}/></button>}
              </div>
              <button onClick={clearTotal1} className="shrink-0 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 shadow-sm text-[10px] font-bold" title="Limpar Tudo (Filtro e Seleção)">Limpar</button>
            </div>
          </div>
          <div className={`overflow-auto bg-gray-50/50 border-b border-gray-200 shadow-inner ${selMat1 ? 'h-40 shrink-0' : 'flex-1'}`}>
            {loading1 ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-emerald-500" size={18}/></div>
            ) : materiais1.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-gray-400">Digite um filtro para buscar materiais</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className={`${colsCls} w-[160px]`}>Código</th>
                    <th className={colsCls}>Descrição</th>
                    <th className={`${colsCls} text-center`}>Peça Manuf.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(selMat1 ? [selMat1] : materiais1).map(m => (
                    <tr key={m.IdMaterial} onClick={() => selectMat1(m)}
                      className={`cursor-pointer transition-all ${selMat1?.IdMaterial === m.IdMaterial ? 'bg-emerald-100/70 border-l-[3px] border-emerald-500 shadow-sm' : 'hover:bg-gray-100 border-l-[3px] border-transparent'}`}>
                      <td className={`${cellCls} font-bold text-[#32423D] max-w-[80px] flex items-center gap-1`} title={m.CodMatFabricante}>
                        {m.EnderecoArquivo && (
                          <button onClick={(e) => { e.stopPropagation(); abrirPdf(m.EnderecoArquivo!); }} className="p-0.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-100 shadow-sm transition-colors" title="Abrir PDF">
                            <FileText size={10}/>
                          </button>
                        )}
                        <span className="truncate">{m.CodMatFabricante}</span>
                      </td>
                      <td className={`${cellCls} text-gray-600 max-w-[130px]`} title={m.DescResumo || m.DescDetal}>{m.DescResumo || m.DescDetal || '-'}</td>
                      <td className={`${cellCls} text-center font-bold text-gray-700`}>
                        {m.PecaManufat === 'S' ? 'S' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* CENTRO E BASE: SÓ EXIBE SE HOUVER ITEM SELECIONADO */}
          {selMat1 && (
            <>
              {/* DETALHES DO ITEM SELECIONADO */}
              <div className="bg-[#32423D]/[0.02] border-b border-gray-200 p-3 shrink-0 relative shadow-sm">
                 <div className="text-[9.5px] font-bold text-[#32423D] uppercase tracking-wider mb-2 flex items-center justify-between border-b border-gray-200 pb-1">
                   <span className="flex items-center gap-1.5"><Package size={12} className="text-emerald-600"/> {selMat1.CodMatFabricante}</span>
                 </div>
                 <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Espessura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Espessura)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Área Pint.</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.AreaPintura)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Peso</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Peso)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Unidade</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Unidade)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Altura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Altura)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Largura</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Largura)}</div></div>
                   <div><div className="text-[8px] text-gray-400 uppercase font-bold tracking-wide">Qtde</div><div className="text-[10px] font-bold text-gray-800">{fmt(selMat1.Qtde)}</div></div>
                   {selMat1.EnderecoArquivo && (
                      <div className="col-span-1 flex items-end">
                        <button onClick={()=>abrirPdf(selMat1.EnderecoArquivo!)} className="w-full flex items-center justify-center gap-1 px-1 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-[9px] font-bold shadow-sm transition-colors" title="Abrir PDF">
                          <FileText size={10}/> PDF
                        </button>
                      </div>
                   )}
                 </div>
              </div>

              {/* BASE: COMPOSIÇÃO */}
              <div className="flex-1 flex flex-col min-h-0 bg-white relative">
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0 flex justify-between items-center z-10 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench size={12} /> Composição do Material
                  </span>
                  <span className="text-[8.5px] font-bold text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">{comp2.length} itens raízes</span>
                </div>
                <div className="flex-1 overflow-auto">
                  {loading2 ? (
                    <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-500" size={18}/></div>
                  ) : comp2.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-orange-500 bg-orange-50/60 m-3 rounded-lg border border-orange-100/80">
                      Material sem componentes cadastrados.
                    </div>
                  ) : (
                    <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <tr>
                      <th className="p-1 px-1.5 w-12"></th>
                      <th className={`${colsCls} text-center`}>NV</th>
                      <th className={`${colsCls} w-[130px]`}>Código</th>
                      <th className={colsCls}>Descrição</th>
                      <th className={`${colsCls} text-center`}>QTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {renderRecursiveRows(comp2, 0)}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {/* =========================================
            GRID 2: PROCESSOS E RECURSOS
            ========================================= */}
        <div className={`flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-[30%]`}>
          <div className="px-3 py-2 bg-gradient-to-r from-teal-50 to-teal-100/30 border-b border-teal-100 shrink-0 flex justify-between items-center">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} /> 2. Processos de Fabricação
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
                   <div className="flex flex-col flex-1 min-w-[130px]">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Recurso <span className="text-red-500">*</span></span>
                     <select value={selId} onChange={e => {
                         const val = e.target.value ? Number(e.target.value) : '';
                         setSelId(val);
                       }}
                       className="px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500 bg-white">
                       <option value="">- Selecione -</option>
                       {tipos.map(t=>(<option key={t.IdProcessoFabricacao} value={t.IdProcessoFabricacao}>{t.ProcessoFabricacao}</option>))}
                      </select>
                   </div>
                                      <div className="flex flex-col items-center shrink-0">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Seq.</span>
                     <input type="number" min="1" step="1" value={seq} onChange={e=>setSeq(e.target.value)} placeholder={String(nextSeq())} className="w-14 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Setup {!['NÃO', 'NAO', 'N', 'NÂO'].includes(String(tipos.find(t => t.IdProcessoFabricacao == selId)?.Fabrica || tipos.find(t => t.IdProcessoFabricacao == selId)?.fabrica || '').toUpperCase().trim()) && <span className="text-red-500">*</span>}</span>
                     <input type="number" min="0" step="0.01" value={estMin} onChange={e=>setEstMin(e.target.value)} className="w-14 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Padrão {!['NÃO', 'NAO', 'N', 'NÂO'].includes(String(tipos.find(t => t.IdProcessoFabricacao == selId)?.Fabrica || tipos.find(t => t.IdProcessoFabricacao == selId)?.fabrica || '').toUpperCase().trim()) && <span className="text-red-500">*</span>}</span>
                     <input type="number" min="0" step="0.01" value={padMin} onChange={e=>setPadMin(e.target.value)} className="w-14 px-1 py-1 text-center text-[10px] font-mono border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>

                   <div className="flex flex-col flex-1 min-w-[120px]">
                     <span className="text-[8.5px] text-gray-500 uppercase font-bold tracking-wide mb-0.5">Observação</span>
                     <input value={ob} onChange={e=>setOb(e.target.value.toUpperCase())} placeholder="..." className="w-full px-2 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-teal-500"/>
                   </div>
                   <button onClick={handleAddProc} disabled={!selId} className="flex items-center gap-1 h-6 px-3 bg-teal-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-teal-700 disabled:opacity-40 transition-colors">
                     <Plus size={12}/> Adicionar
                   </button>
                 </div>
               </div>
             )}
          </div>
          
          {/* BASE: TABELA DE PROCESSOS */}
          <div className="flex-1 overflow-auto bg-gray-50/30">
            {loadingP ? (
              <div className="flex justify-center p-6"><Loader2 className="animate-spin text-teal-500" size={18}/></div>
            ) : !selMat1 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 p-4 text-center">
                 <span className="text-[10px] font-medium">Aguardando seleção...</span>
              </div>
            ) : staging.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-gray-400">Nenhum processo cadastrado para este material</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-white sticky top-0 shadow-sm z-10 border-b border-gray-200">
                  <tr>
                    <th className="p-1.5 px-2 text-[9px] font-bold text-gray-500 uppercase tracking-wide w-10 text-center">Seq</th>
                    <th className={colsCls}>
                      <div className="flex flex-col gap-1">
                        <span>Recurso</span>
                        <div className="relative"><input type="text" placeholder="Filtro..." value={procTableFiltro} onChange={e => setProcTableFiltro(e.target.value)} className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-teal-500 bg-white" />{procTableFiltro && <button onClick={()=>setProcTableFiltro('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th>
                    <th className={`${colsCls} text-center`}>Setup</th>
                    <th className={`${colsCls} text-center`}>Padrão</th>
                    <th className={colsCls}>Obs.</th>
                    <th className="p-1.5 px-2 w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staging.filter(s => !procTableFiltro || s.nome.toLowerCase().includes(procTableFiltro.toLowerCase())).map(s => {
                    const isDragged = draggedProc === s.seq;
                    const isDragOver = dragOverProc?.seq === s.seq;
                    const dragPos = dragOverProc?.position;
                    
                    return (
                    <tr 
                      key={s.seq} 
                      draggable={!editSq}
                      onDragStart={() => setDraggedProc(s.seq)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedProc === null || draggedProc === s.seq) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const position = (e.clientY - rect.top) < (rect.height / 2) ? 'top' : 'bottom';
                        setDragOverProc({ seq: s.seq, position });
                      }}
                      onDragLeave={() => setDragOverProc(null)}
                      onDrop={(e) => handleDropProc(e, s.seq)}
                      className={`transition-colors ${editSq === s.seq ? 'bg-amber-50' : 'hover:bg-teal-50/40'} ${isDragged ? 'opacity-50' : ''} ${isDragOver && dragPos === 'top' ? 'border-t-2 border-t-indigo-500' : ''} ${isDragOver && dragPos === 'bottom' ? 'border-b-2 border-b-indigo-500' : ''}`}
                    >
                      <td className={`p-1.5 px-2 text-center ${!editSq ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                        {editSq === s.seq ? (
                          <input type="number" min="1" value={inlineSeq} onChange={e=>setInlineSeq(e.target.value)} className="w-10 px-1 py-0.5 text-[10px] font-mono border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-white text-center shadow-inner" />
                        ) : (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[8.5px] font-bold border border-teal-200 shadow-sm">{s.seq}</span>
                        )}
                      </td>
                      <td className={`${cellCls} font-semibold text-[#32423D]`}>{s.nome}</td>
                      <td className="p-1.5 px-2 text-center">
                        {editSq === s.seq ? (
                          <input type="number" min="0" step="0.01" value={inlineEst} onChange={e=>setInlineEst(e.target.value)} className="w-12 px-1 py-0.5 text-[10px] font-mono border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-white text-center shadow-inner" />
                        ) : (
                          <span className="text-[10px] text-gray-600 font-bold">{fmtMin(s.estMin)}</span>
                        )}
                      </td>
                      <td className="p-1.5 px-2 text-center">
                        {editSq === s.seq ? (
                          <input type="number" min="0" step="0.01" value={inlinePad} onChange={e=>setInlinePad(e.target.value)} className="w-12 px-1 py-0.5 text-[10px] font-mono border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-white text-center shadow-inner" />
                        ) : (
                          <span className="text-[10px] text-gray-600 font-bold">{fmtMin(s.padMin)}</span>
                        )}
                      </td>
                      <td className="p-1.5 px-2">
                        {editSq === s.seq ? (
                          <input value={inlineOb} onChange={e=>setInlineOb(e.target.value.toUpperCase())} className="w-full px-1.5 py-0.5 text-[10px] border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-white shadow-inner" />
                        ) : (
                          <span className="text-[10px] text-gray-500 truncate max-w-[140px] block" title={s.obs||''}>{s.obs||'-'}</span>
                        )}
                      </td>
                      <td className="p-1.5 px-1 text-right whitespace-nowrap">
                        {editSq === s.seq ? (
                           <button onClick={saveInlineEdit} className="p-0.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded border border-emerald-200 mr-1 shadow-sm" title="Confirmar alteração"><Check size={11}/></button>
                        ) : (
                           <button onClick={()=>startInlineEdit(s)} className="p-0.5 text-blue-500 hover:text-blue-700 bg-blue-50 rounded border border-blue-200 mr-1 shadow-sm" title="Editar diretamente na linha"><Edit2 size={11}/></button>
                        )}
                        <button onClick={()=>delProc(s.seq)} disabled={editSq === s.seq} className="p-0.5 text-red-400 hover:text-red-600 bg-red-50 rounded border border-red-200 shadow-sm disabled:opacity-30" title="Excluir"><Trash2 size={11}/></button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* =========================================
            GRID 3: INCLUSÃO DE NOVOS MATERIAIS
            ========================================= */}
        
          <div className="flex flex-col min-h-0 bg-white shadow-sm flex-1 max-w-[30%] border-l border-indigo-100 animate-in slide-in-from-right-10 duration-200">
            <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-indigo-100/40 border-b border-indigo-100 shrink-0 flex justify-between items-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle size={13} /> 3. Incluir Materiais
              </span>
              
            </div>

            <div className="p-2 border-b border-gray-100 shrink-0 flex flex-col gap-2 bg-gray-50/30">
              <div className="flex gap-2">
                <div className="relative w-[30%]">
                  <input value={fCod3} onChange={e=>setFCod3(e.target.value)} disabled={!selMat1} placeholder="Cód..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                  {fCod3 && <button onClick={()=>setFCod3('')} disabled={!selMat1} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar"><X size={12}/></button>}
                </div>
                <div className="relative w-[40%]">
                  <input value={fDesc3} onChange={e=>setFDesc3(e.target.value)} disabled={!selMat1} placeholder="Descrição..." className="w-full px-2 pr-6 py-1 text-[10px] border border-gray-300 rounded shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"/>
                  {fDesc3 && <button onClick={()=>setFDesc3('')} disabled={!selMat1} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 bg-white rounded p-0.5 shadow-sm" title="Limpar"><X size={12}/></button>}
                </div>
                <button onClick={handleSaveComp3} disabled={!selMat1 || selecionados3.size === 0 || saving3}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {saving3 ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Adicionar ({selecionados3.size})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/20">
              {loading3 ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-500" size={18}/></div>
              ) : materiais3Filtrados.length === 0 ? (
                <div className="p-6 text-center text-[10px] text-gray-400">Nenhum material novo disponível para adição</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
                    <tr>
                      <th className="p-1 px-2 w-8 text-center">
                        <div className="w-3 h-3 border border-gray-300 rounded-sm mx-auto bg-gray-50" title="Selecione individualmente"></div>
                      </th>
                      <th className={colsCls}>
                        <div className="flex flex-col gap-1">
                          <span>Código</span>
                          <div className="relative"><input type="text" placeholder="Filtro Cód..." value={filtroCod3} onChange={e=>setFiltroCod3(e.target.value)} className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />{filtroCod3 && <button onClick={()=>setFiltroCod3('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th><th className={colsCls}>
                        <div className="flex flex-col gap-1">
                          <span>Descrição</span>
                          <div className="relative"><input type="text" placeholder="Filtro Desc..." value={filtroDesc3} onChange={e=>setFiltroDesc3(e.target.value)} className="w-full px-1 pr-4 py-0.5 text-[9px] font-normal border border-gray-200 rounded focus:outline-none focus:border-indigo-500 bg-white" />{filtroDesc3 && <button onClick={()=>setFiltroDesc3('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500" title="Limpar"><X size={10} /></button>}</div></div></th><th className={`${colsCls} text-center w-16`}>Qtde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materiais3Filtrados.map(m => (
                      <tr key={m.IdMaterial} onClick={() => toggleSel3(m.IdMaterial)}
                        className={`cursor-pointer transition-colors ${selecionados3.has(m.IdMaterial) ? 'bg-indigo-50/80 border-l-[3px] border-indigo-500' : 'hover:bg-gray-50 border-l-[3px] border-transparent'}`}>
                        <td className="p-1.5 px-2 text-center" onClick={e=>e.stopPropagation()}>
                          <input type="checkbox" checked={selecionados3.has(m.IdMaterial)} onChange={() => toggleSel3(m.IdMaterial)} className="accent-indigo-600 w-3.5 h-3.5 cursor-pointer"/>
                        </td>
                        <td className={`${cellCls} font-bold text-[#32423D] max-w-[80px]`} title={m.CodMatFabricante}>{m.CodMatFabricante}</td>
                        <td className={`${cellCls} text-gray-600 max-w-[120px]`} title={m.DescResumo || m.DescDetal}>{m.DescResumo || m.DescDetal || '-'}</td>
                        <td className="p-1.5 px-2 text-center" onClick={e=>e.stopPropagation()}>
                          {selecionados3.has(m.IdMaterial) ? (
                            <input type="number" min="0.01" step="0.01" 
                              value={quantidades3[m.IdMaterial] !== undefined ? quantidades3[m.IdMaterial] : 1}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setQuantidades3(q => ({...q, [m.IdMaterial]: val}));
                              }}
                              className="w-12 px-1 py-0.5 text-[10px] font-bold text-center border-2 border-indigo-200 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white shadow-inner"
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
          </div>

      </div>
    </div>
  );
}
