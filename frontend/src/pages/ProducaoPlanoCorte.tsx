import { useState, useEffect, useCallback } from 'react';
import {
    Scissors, Loader2, Filter, Database, RefreshCw,
    CheckCircle2, Clock, Search, X, AlertCircle, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface PlanoCorte {
    IdPlanodecorte: number;
    DescPlanodecorte: string;
    Espessura: string;
    MaterialSW: string;
    DataLiberacao: string | null;
    UsuarioLiberacao: string | null;
    DataInicial: string | null;
    DataFinal: string | null;
    QtdeTotalPecas: number | null;
    QtdeTotalPecasExecutadas: number | null;
}

interface ItemPlano {
    CodMatFabricante: string;
    IdPlanodeCorte: number;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    Espessura: string;
    MaterialSW: string;
    IdProjeto: number;
    Projeto: string;
    IdTag: number;
    Tag: string;
    Acabamento: string;
    txtSoldagem: string;
    ProdutoPrincipal: string;
    QtdeTotal: number;
    txtCorte: string;
    CorteTotalExecutado: number;
    CorteTotalExecutar: number;
    Parcial: number;
    OrdemServicoItemFinalizado: string;
    DescResumo: string;
    DescDetal: string;
    EnderecoArquivo: string;
    EnderecoArquivoItemOrdemServico: string;
    qtde: number;
    txtDobra: string;
    txtSolda: string;
    txtPintura: string;
    txtMontagem: string;
    sttxtCorte: string;
    RealizadoInicioCorte: string;
    RealizadoFinalCorte: string;
    Liberado_Engenharia: string;
}

function fmt(val: string | null): string {
    if (!val) return '—';
    const s = String(val).trim();
    if (s.includes('T')) return new Date(s).toLocaleDateString('pt-BR');
    return s;
}

export default function ProducaoPlanoCorte() {
    const { token } = useAuth();
    const { addToast } = useToast();

    // Estado Planos
    const [planos, setPlanos] = useState<PlanoCorte[]>([]);
    const [loadingPlanos, setLoadingPlanos] = useState(false);
    const [exibirTodosPlanos, setExibirTodosPlanos] = useState(false);
    const [planoSel, setPlanoSel] = useState<PlanoCorte | null>(null);

    // Filtros Planos
    const [fPDesc, setFPDesc] = useState('');
    const [fPEsp, setFPEsp] = useState('');
    const [fPMat, setFPMat] = useState('');
    const [fPId, setFPId] = useState('');

    // Estado Itens
    const [itens, setItens] = useState<ItemPlano[]>([]);
    const [loadingItens, setLoadingItens] = useState(false);
    const [exibirTodosItens, setExibirTodosItens] = useState(false);

    // Filtros Itens
    const [fIProj, setFIProj] = useState('');
    const [fITag, setFITag] = useState('');
    const [fIRes, setFIRes] = useState('');
    const [fICod, setFICod] = useState('');

    const fetchPlanos = useCallback(async () => {
        setLoadingPlanos(true);
        try {
            const params = new URLSearchParams({ exibirTodos: String(exibirTodosPlanos) });
            if (fPDesc.trim()) params.set('descplanodecorte', fPDesc.trim());
            if (fPEsp.trim())  params.set('Espessura', fPEsp.trim());
            if (fPMat.trim())  params.set('MaterialSW', fPMat.trim());
            if (fPId.trim())   params.set('IdPlanodeCorte', fPId.trim());

            const res = await fetch(`/api/producao-plano-corte/lista?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = res.headers.get('content-type');
            if (!res.ok) {
                const errData = (contentType && contentType.includes('application/json')) ? await res.json() : null;
                const msg = errData?.message || `Erro HTTP ${res.status}`;
                throw new Error(msg);
            }

            if (contentType && !contentType.includes('application/json')) {
                throw new Error('O servidor retornou um formato inesperado (HTML).');
            }

            const result = await res.json();
            if (result.success) {
                setPlanos(result.data || []);
                // Se o backend enviar uma mensagem informativa (ex: "Nenhum plano localizado"), exibimos como 'info' em vez de 'error'
                if (result.data.length === 0 && result.message) {
                    addToast({ type: 'info', title: 'Busca Concluída', message: result.message });
                }
            } else {
                addToast({ type: 'warning', title: 'Aviso', message: result.message || 'Houve um problema ao carregar os dados.' });
            }
        } catch (e: any) {
            console.error('Erro fetchPlanos:', e);
            addToast({ 
                type: 'error', 
                title: 'Erro ao Carregar', 
                message: `Não foi possível listar os planos. Detalhe: ${e.message}` 
            });
        } finally { setLoadingPlanos(false); }
    }, [exibirTodosPlanos, fPDesc, fPEsp, fPMat, fPId, token]);

    const fetchItens = useCallback(async () => {
        if (!planoSel) { setItens([]); return; }
        setLoadingItens(true);
        try {
            const params = new URLSearchParams({ exibirTodos: String(exibirTodosItens) });
            if (fIProj.trim()) params.set('Projeto', fIProj.trim());
            if (fITag.trim())  params.set('Tag', fITag.trim());
            if (fIRes.trim())  params.set('DescResumo', fIRes.trim());
            if (fICod.trim())  params.set('CodMatFabricante', fICod.trim());

            const res = await fetch(`/api/producao-plano-corte/itens/${planoSel.IdPlanodecorte}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = res.headers.get('content-type');
            if (!res.ok || (contentType && !contentType.includes('application/json'))) {
                throw new Error('O servidor não retornou dados válidos.');
            }

            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else addToast({ type: 'error', title: 'Aviso', message: result.message || 'Nenhum item encontrado para este plano.' });
        } catch (e: any) {
            console.error('Erro fetchItens:', e);
            addToast({ 
                type: 'error', 
                title: 'Erro de Leitura', 
                message: 'Não conseguimos ler os detalhes dos itens. Tente atualizar a visão ou contate o suporte.' 
            });
        } finally { setLoadingItens(false); }
    }, [planoSel, exibirTodosItens, fIProj, fITag, fIRes, fICod, token]);

    useEffect(() => { fetchPlanos(); }, [exibirTodosPlanos]);
    useEffect(() => { fetchItens(); }, [planoSel, exibirTodosItens]);

    const limparFiltrosPlanos = () => {
        setFPDesc(''); setFPEsp(''); setFPMat(''); setFPId(''); 
        setExibirTodosPlanos(false);
        setTimeout(fetchPlanos, 50);
    };

    const limparFiltrosItens = () => {
        setFIProj(''); setFITag(''); setFIRes(''); setFICod('');
        setExibirTodosItens(false);
        setTimeout(fetchItens, 50);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 p-3 gap-3 overflow-hidden">
            
            {/* PAINEL SUPERIOR: PLANOS DE CORTE */}
            <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${planoSel ? 'h-1/3' : 'h-full'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                            <Scissors size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">Produção — Planos de Corte</h2>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Visão Execução Fábrica</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Filtros Planos */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-inner focus-within:border-blue-400">
                            <Search size={12} className="text-slate-400" />
                            <input type="text" placeholder="ID" value={fPId} onChange={e=>setFPId(e.target.value)} className="w-12 text-[10px] outline-none font-bold text-blue-700" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            <input type="text" placeholder="Descrição..." value={fPDesc} onChange={e=>setFPDesc(e.target.value)} className="w-32 text-[10px] outline-none border-l border-slate-100 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            <input type="text" placeholder="Esp..." value={fPEsp} onChange={e=>setFPEsp(e.target.value)} className="w-16 text-[10px] outline-none border-l border-slate-100 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            {(fPId || fPDesc || fPEsp || fPMat) && (
                                <button onClick={limparFiltrosPlanos} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                            )}
                        </div>
                        
                        <button onClick={fetchPlanos} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={14} className={loadingPlanos ? 'animate-spin':''}/></button>

                        <button 
                            onClick={()=>setExibirTodosPlanos(!exibirTodosPlanos)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${exibirTodosPlanos ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {exibirTodosPlanos ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                            {exibirTodosPlanos ? 'TODOS' : 'PENDENTES'}
                        </button>
                    </div>
                </div>

                {/* Tabela Planos */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    {loadingPlanos && (
                        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    )}
                    <table className="w-full text-[11px] text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">ID</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Descrição</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Espessura</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Material SW</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Liberado em</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Por</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Início</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Fim</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Peças</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Exec.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planos.map(p => (
                                <tr 
                                    key={p.IdPlanodecorte} 
                                    onClick={()=>setPlanoSel(p)}
                                    className={`group cursor-pointer transition-colors border-b border-slate-50 ${planoSel?.IdPlanodecorte === p.IdPlanodecorte ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-100' : 'hover:bg-slate-50'}`}
                                >
                                    <td className="px-3 py-1.5 font-black text-blue-600">{p.IdPlanodecorte}</td>
                                    <td className="px-3 py-1.5 font-bold text-slate-700">{p.DescPlanodecorte || '—'}</td>
                                    <td className="px-3 py-1.5 font-black text-slate-600 uppercase italic">{p.Espessura || '—'}</td>
                                    <td className="px-3 py-1.5 font-medium text-slate-500">{p.MaterialSW || '—'}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{fmt(p.DataLiberacao)}</td>
                                    <td className="px-3 py-1.5 text-slate-400 font-bold">{p.UsuarioLiberacao || '—'}</td>
                                    <td className="px-3 py-1.5 text-center text-slate-500 font-mono">{fmt(p.DataInicial)}</td>
                                    <td className="px-3 py-1.5 text-center text-slate-500 font-mono">{fmt(p.DataFinal)}</td>
                                    <td className="px-3 py-1.5 text-center font-black text-indigo-600 bg-indigo-50/30">{p.QtdeTotalPecas ?? 0}</td>
                                    <td className="px-3 py-1.5 text-center font-black text-emerald-600 bg-emerald-50/30">{p.QtdeTotalPecasExecutadas ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAINEL INFERIOR: ITENS DO PLANO */}
            {planoSel ? (
                <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/50 border-b border-indigo-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                                <Database size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-indigo-900 tracking-tight leading-none">Itens do Plano #{planoSel.IdPlanodecorte}</h2>
                                <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest mt-0.5">{planoSel.DescPlanodecorte}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Filtros Itens */}
                            <div className="flex items-center gap-1.5 bg-white border border-indigo-100 rounded-lg px-2 py-1 shadow-sm focus-within:border-indigo-400">
                                <Search size={12} className="text-indigo-300" />
                                <input type="text" placeholder="Projeto" value={fIProj} onChange={e=>setFIProj(e.target.value)} className="w-24 text-[10px] outline-none font-bold" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                <input type="text" placeholder="Tag" value={fITag} onChange={e=>setFITag(e.target.value)} className="w-20 text-[10px] outline-none border-l border-indigo-50 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                <input type="text" placeholder="Fabricante..." value={fICod} onChange={e=>setFICod(e.target.value)} className="w-28 text-[10px] outline-none border-l border-indigo-50 pl-1.5 uppercase" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                {(fIProj || fITag || fIRes || fICod) && (
                                    <button onClick={limparFiltrosItens} className="p-0.5 text-indigo-200 hover:text-red-500 transition-colors"><X size={12}/></button>
                                )}
                            </div>

                            <button onClick={fetchItens} className="p-1.5 text-indigo-400 hover:bg-white rounded-lg transition-colors"><RefreshCw size={14} className={loadingItens ? 'animate-spin':''}/></button>

                            <button 
                                onClick={()=>setExibirTodosItens(!exibirTodosItens)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${exibirTodosItens ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'bg-white text-indigo-500 border-indigo-200 hover:bg-indigo-50'}`}
                            >
                                {exibirTodosItens ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                                {exibirTodosItens ? 'TODOS' : 'EM PRODUÇÃO'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        {loadingItens && (
                            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        )}
                        <table className="w-full text-[10px] text-left border-separate border-spacing-0">
                            <thead className="bg-indigo-50/30 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Fabricante</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Projeto</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Tag</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Resumo</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Qtde</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Cortado</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Restante</th>
                                    <th className="px-2 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Parcial</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Processos</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens.length > 0 ? itens.map((it, idx) => {
                                    const pct = Math.round(it.Parcial * 100);
                                    return (
                                        <tr key={`${it.IdOrdemServicoItem}-${idx}`} className="group hover:bg-slate-50 transition-colors border-b border-slate-50">
                                            <td className="px-3 py-2 font-black text-slate-800 uppercase tabular-nums">{it.CodMatFabricante}</td>
                                            <td className="px-3 py-2 font-bold text-slate-700">{it.Projeto}</td>
                                            <td className="px-3 py-2 font-black text-blue-600">{it.Tag}</td>
                                            <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={it.DescResumo}>{it.DescResumo}</td>
                                            <td className="px-3 py-2 text-center font-black text-indigo-600">{it.QtdeTotal}</td>
                                            <td className="px-3 py-2 text-center font-black text-emerald-600">{it.CorteTotalExecutado}</td>
                                            <td className="px-3 py-2 text-center font-black text-red-600">{it.CorteTotalExecutar}</td>
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col gap-1 w-16 mx-auto">
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-500': pct > 0 ? 'bg-amber-400': 'bg-slate-200'}`} style={{width:`${pct}%`}}></div>
                                                    </div>
                                                    <span className="text-[8px] font-black text-center text-slate-400">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    {it.txtCorte === '1' && <span className="bg-slate-200 text-slate-700 rounded px-1 font-black text-[8px]" title="Corte">C</span>}
                                                    {it.txtDobra === '1' && <span className="bg-slate-200 text-slate-700 rounded px-1 font-black text-[8px]" title="Dobra">D</span>}
                                                    {it.txtSolda === '1' && <span className="bg-slate-200 text-slate-700 rounded px-1 font-black text-[8px]" title="Solda">S</span>}
                                                    {it.txtPintura === '1' && <span className="bg-slate-200 text-slate-700 rounded px-1 font-black text-[8px]" title="Pintura">P</span>}
                                                    {it.txtMontagem === '1' && <span className="bg-slate-200 text-slate-700 rounded px-1 font-black text-[8px]" title="Montagem">M</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {it.OrdemServicoItemFinalizado === 'S' || it.OrdemServicoItemFinalizado === 'SIM' ? (
                                                    <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-black text-[8px]"><CheckCircle2 size={8}/>FINALIZADO</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-black text-[8px]"><Clock size={8}/>PENDENTE</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={10} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-40">Nenhum item em produção neste plano</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-xl opacity-60">
                    <div className="p-4 bg-slate-50 rounded-full mb-3 text-slate-300">
                        <ArrowRight size={48} className="-rotate-45" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecione um plano de corte acima para ver seus itens</p>
                </div>
            )}
        </div>
    );
}
