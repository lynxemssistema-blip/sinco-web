import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Scissors, Loader2, Filter, Database,
    SplitSquareHorizontal, FileType2,
    CheckCircle2, Clock, Search, X, RefreshCw,
    PlusCircle, AlertCircle, FolderOpen, Send, CheckCircle, RotateCcw
} from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// --- Interfaces ---
interface OSItem {
    CodMatFabricante: string;
    Espessura: string;
    MaterialSW: string;
    IdEmpresa: number;
    IdProjeto: number;
    IdTag: number;
    QtdeTotal: number;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    IdPlanoDeCorte: number | null;
    Projeto: string;
    Tag: string;
    EnderecoArquivo: string;
    DescTag: string;
    DescResumo: string;
    DescDetal: string;
}

interface PlanoCorte {
    IdPlanodecorte: number;
    DescPlanodecorte: string;
    Espessura: string;
    MaterialSW: string;
    DataCad: string | null;
    DataLimite: string | null;
    CriadoPor: string | null;
    Enviadocorte: string | null;
    Concluido: string | null;
    DataInicial: string | null;
    DataFinal: string | null;
    QtdeTotalPecas: number | null;
    QtdeTotalPecasExecutadas: number | null;
    EnderecoCompletoPlanoCorte: string | null;
}

interface ItemAglutinado {
    Espessura: string;
    MaterialSW: string;
    CodMatFabricante: string;
    IdOrdemServicoItem: number;
    IdOrdemServico: number;
    EnderecoArquivo: string;
    QtdeTotal: number;
}

interface ItemIndividual {
    OrdemServicoItemFinalizado: string | null;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    Espessura: string;
    MaterialSW: string;
    CodMatFabricante: string;
    Projeto: string;
    Tag: string;
    QtdeTotal: number;
    Acabamento: string | null;
    DescResumo: string;
    DescDetal: string;
    EnderecoArquivo: string;
}

function fmt(val: string | null): string {
    if (!val) return '-';
    const s = String(val).trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[1]}/${br[2]}/${br[3]}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
}

// ============================================================
// Painel Itens do Plano Selecionado
// ============================================================
function PainelItensPlano({ plano, onFechar, aglutinado, setAglutinado }: { plano: PlanoCorte; onFechar: () => void; aglutinado: boolean; setAglutinado: (val: boolean) => void }) {
    const { token } = useAuth();
    const [itens, setItens] = useState<(ItemAglutinado | ItemIndividual)[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fItem, setFItem] = useState('');

    const fetchItens = async (agl: boolean = aglutinado, item: string = fItem) => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ aglutinado: String(agl) });
            if (item.trim()) params.set('IdOrdemServicoItem', item.trim());
            const res = await fetch(`/api/plano-corte/itens/${plano.IdPlanodecorte}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else setError(result.message || 'Erro ao buscar itens');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchItens(); }, [plano.IdPlanodecorte]);

    const handleToggle = () => { const novo = !aglutinado; setAglutinado(novo); fetchItens(novo, fItem); };

    return (
        <div className="flex flex-col bg-white rounded-xl shadow border border-indigo-200 overflow-hidden" style={{ minHeight: 220, maxHeight: 360 }}>
            <div className="shrink-0 bg-indigo-50 border-b border-indigo-200 px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-indigo-600 text-white rounded flex items-center justify-center shrink-0"><Database size={12} /></div>
                    <span className="text-xs font-black text-indigo-800">Itens do Plano #{plano.IdPlanodecorte}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-white border border-indigo-200 rounded px-1.5 focus-within:border-indigo-400 w-28">
                        <Search size={9} className="text-indigo-300 mr-1 shrink-0" />
                        <input type="text" placeholder="Filtrar item OS..." value={fItem}
                            onChange={e => setFItem(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchItens(aglutinado, fItem)}
                            className="w-full text-[10px] py-0.5 outline-none bg-transparent text-slate-700 placeholder:text-indigo-300" />
                    </div>
                    <button onClick={() => fetchItens(aglutinado, fItem)} className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"><Search size={10} /></button>
                    <button onClick={handleToggle} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${aglutinado ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}>
                        {aglutinado ? 'Aglutinado' : 'Individual'}
                    </button>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{loading ? '...' : `${itens.length} itens`}</span>
                    <button onClick={onFechar} className="p-1 rounded hover:bg-indigo-100 text-indigo-400" title="Fechar"><X size={13} /></button>
                </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5"><AlertCircle size={12} />{error}</div>}
            <div className="flex-1 overflow-auto relative">
                {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
                {aglutinado ? (
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Material SW</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde Total</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Endereco Arquivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.length > 0 ? (itens as ItemAglutinado[]).map((it, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">{it.IdOrdemServico} / {it.IdOrdemServicoItem}</td>
                                    <td className="px-2 py-1 text-[10px] font-semibold">{it.Espessura || '-'}</td>
                                    <td className="px-2 py-1 text-[10px]">{it.MaterialSW || '-'}</td>
                                    <td className="px-2 py-1 text-[9px] font-mono text-slate-500">{it.CodMatFabricante || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{it.QtdeTotal}</td>
                                    <td className="px-2 py-1 text-[9px] text-slate-400 max-w-[200px] truncate" title={it.EnderecoArquivo}>{it.EnderecoArquivo || '-'}</td>
                                </tr>
                            )) : <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum item'}</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Projeto</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Tag</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Material</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Acabamento</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Desc. Resumo</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Finalizado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.length > 0 ? (itens as ItemIndividual[]).map((it, i) => {
                                const fin = it.OrdemServicoItemFinalizado === 'C';
                                return (
                                    <tr key={i} className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${fin ? 'opacity-50' : ''}`}>
                                        <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">{it.IdOrdemServico} / {it.IdOrdemServicoItem}</td>
                                        <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[60px] truncate">{it.Projeto}</td>
                                        <td className="px-2 py-1 text-[10px] font-bold text-indigo-700 whitespace-nowrap">{it.Tag}</td>
                                        <td className="px-2 py-1 text-[10px] font-semibold">{it.Espessura || '-'}</td>
                                        <td className="px-2 py-1 text-[10px]">{it.MaterialSW || '-'}</td>
                                        <td className="px-2 py-1 text-[9px] font-mono text-slate-500">{it.CodMatFabricante || '-'}</td>
                                        <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{it.QtdeTotal}</td>
                                        <td className="px-2 py-1 text-[10px] text-slate-500">{it.Acabamento || '-'}</td>
                                        <td className="px-2 py-1 text-[10px] max-w-[100px] truncate" title={it.DescResumo}>{it.DescResumo}</td>
                                        <td className="px-2 py-1 text-center">
                                            {fin
                                                ? <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 text-[9px] font-bold"><CheckCircle2 size={8} />Sim</span>
                                                : <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 rounded px-1 py-0.5 text-[9px] font-bold"><Clock size={8} />Nao</span>}
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={10} className="px-4 py-6 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum item'}</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Painel Esquerdo: Itens de Ordem de Servico (com selecao)
// ============================================================
function PainelItensOS({ tipoFiltro, onPlanosChange }: { tipoFiltro: string; onPlanosChange: () => void }) {
    const { token } = useAuth();
    const [itens, setItens] = useState<OSItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [fOS, setFOS] = useState('');
    const [fEsp, setFEsp] = useState('');
    const [fProjeto, setFProjeto] = useState('');
    const [fTag, setFTag] = useState('');
    const [fCod, setFCod] = useState('');
    const [fMat, setFMat] = useState('');

    const fetchItens = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/itens-disponiveis?tipoFiltro=${tipoFiltro}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erro ao buscar itens');
            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else setError(result.message || 'Falha');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [tipoFiltro]);

    useEffect(() => { fetchItens(); }, [fetchItens]);

    const filtered = useMemo(() => itens.filter(item => {
        if (fOS      && !String(item.IdOrdemServico || '').toLowerCase().includes(fOS.toLowerCase())) return false;
        if (fEsp     && !String(item.Espessura || '').toLowerCase().includes(fEsp.toLowerCase())) return false;
        if (fProjeto && !String(item.Projeto || '').toLowerCase().includes(fProjeto.toLowerCase())) return false;
        if (fTag     && !String(item.Tag || '').toLowerCase().includes(fTag.toLowerCase())) return false;
        if (fCod     && !String(item.CodMatFabricante || '').toLowerCase().includes(fCod.toLowerCase())) return false;
        if (fMat     && !String(item.MaterialSW || '').toLowerCase().includes(fMat.toLowerCase())) return false;
        return true;
    }), [itens, fOS, fEsp, fProjeto, fTag, fCod, fMat]);

    const handleLimpar = () => { setFOS(''); setFEsp(''); setFProjeto(''); setFTag(''); setFCod(''); setFMat(''); };

    const handleToggleRow = (id: number) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const handleToggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(i => i.IdOrdemServicoItem)));
        }
    };

    const handleIncluirNoPlano = async () => {
        if (selected.size === 0) return;
        setSalvando(true); setError(''); setSuccessMsg('');
        try {
            const res = await fetch('/api/plano-corte/incluir-itens', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itens: Array.from(selected) })
            });
            const result = await res.json();
            if (result.success) {
                let msg = result.message;
                if (result.enderecos && result.enderecos.length > 0) {
                    msg += `. Caminho(s): ${result.enderecos.join(', ')}`;
                }
                setSuccessMsg(msg);
                setSelected(new Set());
                await fetchItens();     // atualiza lista de OS
                onPlanosChange();       // atualiza painel de planos
                setTimeout(() => setSuccessMsg(''), 10000); // 10s para dar tempo de ler o caminho
            } else {
                setError(result.message || 'Erro ao incluir itens');
            }
        } catch (e: any) { setError(e.message); }
        finally { setSalvando(false); }
    };

    const todosSelec = filtered.length > 0 && selected.size === filtered.length;
    const parcialSelec = selected.size > 0 && selected.size < filtered.length;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm"><Database size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Itens de Ordem de Serviço</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Selecione e inclua no plano de corte</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Contador de selecionados */}
                    {selected.size > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {selected.size} selecionado(s)
                        </span>
                    )}
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {loading ? '...' : `${filtered.length} itens`}
                    </span>
                    {/* Ações */}
                    <div className="flex items-center gap-2">
                        <button onClick={handleIncluirNoPlano} disabled={selected.size === 0 || salvando} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-600 rounded-lg transition-all shadow-sm font-bold text-xs disabled:opacity-50">
                            {salvando ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                            Incluir no Plano
                        </button>
                        <button onClick={fetchItens} className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensagens */}
            {successMsg && (
                <div className="shrink-0 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-[10px] font-bold border-b border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 size={12} />{successMsg}
                </div>
            )}
            {error && (
                <div className="shrink-0 bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5">
                    <AlertCircle size={12} />{error}
                </div>
            )}

            {/* Filtros */}
            <div className="shrink-0 border-b border-slate-100 px-2 py-1.5 bg-white">
                <div className="flex flex-wrap gap-1 items-center">
                    <Filter size={11} className="text-slate-400 shrink-0" />
                    {[
                        { ph: 'OS',        val: fOS,      set: setFOS,      w: 'w-16' },
                        { ph: 'Espessura', val: fEsp,     set: setFEsp,     w: 'w-20' },
                        { ph: 'Projeto',   val: fProjeto, set: setFProjeto, w: 'w-24' },
                        { ph: 'Tag',       val: fTag,     set: setFTag,     w: 'w-20' },
                        { ph: 'Cod. Fab.', val: fCod,     set: setFCod,     w: 'w-24' },
                        { ph: 'Material',  val: fMat,     set: setFMat,     w: 'w-24' },
                    ].map(({ ph, val, set, w }) => (
                        <div key={ph} className={`flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 focus-within:border-indigo-400 ${w}`}>
                            <input type="text" placeholder={ph} value={val}
                                onChange={e => set(e.target.value)}
                                className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                        </div>
                    ))}
                    <button onClick={handleLimpar} className="flex items-center gap-0.5 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded">
                        <X size={10} />Limpar
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto relative">
                {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>}
                <table className="w-full text-left">
                    <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                            <th className="px-2 py-1.5 w-6">
                                <input type="checkbox"
                                    checked={todosSelec}
                                    ref={el => { if (el) el.indeterminate = parcialSelec; }}
                                    onChange={handleToggleAll}
                                    className="cursor-pointer accent-indigo-600" />
                            </th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Projeto</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Tag</th>
                            <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Material SW</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Desc. Resumo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((item, idx) => {
                            const isSelected = selected.has(item.IdOrdemServicoItem);
                            return (
                                <tr key={`${item.IdOrdemServicoItem}-${idx}`}
                                    onClick={() => handleToggleRow(item.IdOrdemServicoItem)}
                                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-indigo-50/40'
                                    }`}>
                                    <td className="px-2 py-1" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRow(item.IdOrdemServicoItem)}
                                            className="cursor-pointer accent-indigo-600" />
                                    </td>
                                    <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                        {item.IdOrdemServico}<span className="text-slate-400 font-normal"> / {item.IdOrdemServicoItem}</span>
                                    </td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[70px] truncate" title={item.Projeto}>{item.Projeto}</td>
                                    <td className="px-2 py-1 text-[10px] font-bold text-indigo-700 whitespace-nowrap max-w-[60px] truncate" title={item.Tag}>{item.Tag}</td>
                                    <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{item.QtdeTotal}</td>
                                    <td className="px-2 py-1 text-[10px] font-semibold text-slate-700 whitespace-nowrap">{item.Espessura || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 whitespace-nowrap">{item.MaterialSW || '-'}</td>
                                    <td className="px-2 py-1 text-[9px] font-mono text-slate-500 whitespace-nowrap">{item.CodMatFabricante || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[100px] truncate" title={item.DescResumo}>{item.DescResumo}</td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">
                                {loading ? 'Carregando...' : 'Nenhum item disponivel'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================
// Painel Direito: Planos de Corte + Itens do Plano Selecionado
// ============================================================
function PainelPlanosCorte({ refreshTrigger }: { refreshTrigger: number }) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [planos, setPlanos] = useState<PlanoCorte[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [error, setError] = useState('');
    const [exibirConcluidos, setExibirConcluidos] = useState(false);
    const [fEsp, setFEsp] = useState('');
    const [fMat, setFMat] = useState('');
    const [fLocal, setFLocal] = useState('');
    const [planoSelecionado, setPlanoSelecionado] = useState<PlanoCorte | null>(null);
    const [aglutinadoGlobal, setAglutinadoGlobal] = useState(true);

    const fetchPlanos = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ exibirConcluidos: String(exibirConcluidos) });
            if (fEsp.trim()) params.set('Espessura', fEsp.trim());
            if (fMat.trim()) params.set('MaterialSW', fMat.trim());
            const res = await fetch(`/api/plano-corte/lista?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setPlanos(result.data || []);
            else setError(result.message || 'Erro ao buscar planos');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [exibirConcluidos]);

    useEffect(() => { fetchPlanos(); }, [exibirConcluidos, refreshTrigger]);

    const planosFiltrados = useMemo(() => {
        if (!fLocal.trim()) return planos;
        const q = fLocal.toLowerCase();
        return planos.filter(p =>
            String(p.IdPlanodecorte).includes(q) ||
            (p.DescPlanodecorte || '').toLowerCase().includes(q) ||
            (p.Espessura || '').toLowerCase().includes(q) ||
            (p.MaterialSW || '').toLowerCase().includes(q)
        );
    }, [planos, fLocal]);

    const handleAbrirPasta = async () => {
        if (!planoSelecionado) return;
        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/abrir-pasta`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'info', title: 'Explorer', message: 'Pasta aberta no servidor local.' });
            } else throw new Error(result.message || 'Erro ao abrir pasta');
        } catch (e: any) { setError(e.message); }
        finally { setLoadingAcao(false); }
    };

    const handleLiberarPlano = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte na tabela antes de liberar.' });
            return;
        }
        const isEnviado = planoSelecionado.Enviadocorte === 'S' || planoSelecionado.Enviadocorte === 'SIM';
        if (isEnviado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Plano selecionado já liberado para fábrica, verifique!' });
            return;
        }

        if (!confirm(`Você está liberando o plano de corte para execução: ${planoSelecionado.IdPlanodecorte} ?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/liberar`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                // Atualiza o plano local na lista
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte ? { ...p, Enviadocorte: 'S' } : p));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: 'S' } : null);
            } else throw new Error(result.message || 'Erro ao liberar plano');
        } catch (e: any) { setError(e.message); }
        finally { setLoadingAcao(false); }
    };

    const handleCancelarLiberacao = async () => {
        if (!planoSelecionado) return;
        if (!confirm(`Você está cancelando a liberação do plano de corte - ${planoSelecionado.IdPlanodecorte} para execução?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/cancelar-liberacao`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Cancelado', message: result.message });
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte
                    ? { ...p, Enviadocorte: null }
                    : p
                ));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: null } : null);
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao cancelar liberação.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleLimpar = () => { setFEsp(''); setFMat(''); setFLocal(''); setTimeout(fetchPlanos, 50); };

    return (
        <div className="flex flex-col h-full overflow-hidden gap-2">
            {/* Card de planos */}
            <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ flex: planoSelecionado ? '0 0 auto' : '1 1 auto', maxHeight: planoSelecionado ? '50%' : '100%' }}>
                {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5"><AlertCircle size={12} />{error}</div>}
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                        <Scissors size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Planos de Corte</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Gerenciamento e Arquivos de Saída</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAbrirPasta}
                        disabled={!planoSelecionado || loadingAcao}
                        className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
                        title={!planoSelecionado ? 'Selecione um plano para abrir a pasta' : 'Abrir pasta do plano no Windows Explorer'}
                    >
                        <FolderOpen size={18} />
                    </button>

                    {(() => {
                        const jaLiberado = planoSelecionado?.Enviadocorte === 'S' || planoSelecionado?.Enviadocorte === 'SIM';
                        if (jaLiberado) {
                            return (
                                <>
                                    <button
                                        className="p-2.5 bg-gray-50 text-emerald-400 border border-gray-200 rounded-lg cursor-not-allowed opacity-60"
                                        title="Plano já liberado para a fábrica"
                                        onClick={() => addToast({ type: 'info', title: 'Atenção', message: 'Este plano já foi liberado para a fábrica!' })}
                                    >
                                        <Send size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancelarLiberacao}
                                        disabled={loadingAcao}
                                        className="p-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-50"
                                        title="Cancelar Liberação do Plano de Corte"
                                    >
                                        {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                    </button>
                                </>
                            );
                        }
                        return (
                            <button
                                onClick={handleLiberarPlano}
                                disabled={loadingAcao}
                                className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
                                title={!planoSelecionado ? 'Selecione um plano na tabela para liberar' : 'Liberar arquivos para execução na fábrica'}
                            >
                                {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            </button>
                        );
                    })()}

                    <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <span className="text-[10px] font-black text-indigo-400">{planos.length}</span>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">planos</span>
                    </div>

                    <button
                        onClick={() => setExibirConcluidos(!exibirConcluidos)}
                        className={`p-2.5 rounded-lg transition-colors border shadow-sm ${exibirConcluidos ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        title={exibirConcluidos ? 'Exibindo todos os planos — clique para só pendentes' : 'Exibindo apenas pendentes — clique para ver todos'}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

                {/* Filtros */}
                <div className="shrink-0 border-b border-slate-100 px-2 py-1.5 bg-white">
                    <div className="flex flex-wrap gap-1">
                        {[{ ph: 'Espessura', val: fEsp, set: setFEsp, w: 'w-20' }, { ph: 'Material SW', val: fMat, set: setFMat, w: 'w-28' }].map(({ ph, val, set, w }) => (
                            <div key={ph} className={`flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 focus-within:border-blue-400 ${w}`}>
                                <input type="text" placeholder={ph} value={val}
                                    onChange={e => set(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchPlanos()}
                                    className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                            </div>
                        ))}
                        <button onClick={fetchPlanos} className="flex items-center gap-0.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded">
                            <Search size={10} />Buscar
                        </button>
                        <button onClick={handleLimpar} className="flex items-center gap-0.5 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded">
                            <X size={10} />Limpar
                        </button>
                        <div className="ml-auto flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 w-32">
                            <Search size={9} className="text-slate-400 mr-1 shrink-0" />
                            <input type="text" placeholder="Busca rapida..." value={fLocal}
                                onChange={e => setFLocal(e.target.value)}
                                className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200">{error}</div>}

                {/* Tabela */}
                <div className="flex-1 overflow-auto relative">
                    {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">ID Plano</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Descricao</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Material SW</th>
                                <th className="px-2 py-2.5 font-black text-center whitespace-nowrap">Progresso</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Dt. Cadastro</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Dt. Limite</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Criador</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Pasta</th>
                                <th className="px-2 py-2.5 font-black text-center whitespace-nowrap">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planosFiltrados.length > 0 ? planosFiltrados.map((p, idx) => {
                                const concluido = p.Concluido === 'S' || p.Concluido === 'SIM' || p.Concluido === 'C';
                                const enviado   = p.Enviadocorte === 'S';
                                const pct = p.QtdeTotalPecas && p.QtdeTotalPecas > 0
                                    ? Math.round(((p.QtdeTotalPecasExecutadas ?? 0) / p.QtdeTotalPecas) * 100) : null;
                                const sel = planoSelecionado?.IdPlanodecorte === p.IdPlanodecorte;
                                return (
                                    <tr key={`${p.IdPlanodecorte}-${idx}`}
                                        onClick={() => setPlanoSelecionado(sel ? null : p)}
                                        className={`border-b border-slate-100 transition-colors cursor-pointer ${sel ? 'bg-indigo-50/80 shadow-inner' : (p.Concluido === 'S' || p.Concluido === 'SIM' || p.Concluido === 'C') ? 'opacity-70 bg-slate-50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-2 py-2.5 text-[10px] font-bold text-slate-800 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${concluido ? 'bg-emerald-500' : enviado ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                                #{p.IdPlanodecorte}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-[10px] max-w-[120px] truncate text-slate-700 font-medium" title={p.DescPlanodecorte ?? ''}>{p.DescPlanodecorte || '-'}</td>
                                        <td className="px-2 py-2 text-[10px] whitespace-nowrap">
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold text-[9px]">{p.Espessura || '-'}</span>
                                        </td>
                                        <td className="px-2 py-2 text-[10px] text-slate-600 whitespace-nowrap font-medium">{p.MaterialSW || '-'}</td>
                                        <td className="px-2 py-2 text-[10px] text-center">
                                            {pct !== null
                                                ? <div className="flex flex-col items-center gap-1">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">{p.QtdeTotalPecasExecutadas ?? 0}/{p.QtdeTotalPecas}</span>
                                                  </div>
                                                : <span className="text-[10px] text-slate-400 font-bold">{p.QtdeTotalPecas ?? '-'}</span>}
                                        </td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">{fmt(p.DataCad)}</td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">{fmt(p.DataLimite)}</td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1 opacity-70">
                                                <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{p.CriadoPor?.charAt(0) || '?'}</div>
                                                {p.CriadoPor || '-'}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-[9px] text-slate-400 max-w-[100px] truncate italic" title={p.EnderecoCompletoPlanoCorte ?? ''}>{p.EnderecoCompletoPlanoCorte || '-'}</td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            {concluido ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-emerald-200">
                                                    <CheckCircle size={10} /> CONCLUÍDO
                                                </span>
                                            ) : enviado ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-blue-200">
                                                    <Scissors size={10} /> ENVIADO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-amber-200">
                                                    <Clock size={10} /> PENDENTE
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum plano encontrado'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {planoSelecionado && (
                <div className="flex-1 min-h-[300px] mt-2 animate-in slide-in-from-bottom duration-300">
                    <PainelItensPlano 
                        plano={planoSelecionado} 
                        onFechar={() => setPlanoSelecionado(null)} 
                        aglutinado={aglutinadoGlobal}
                        setAglutinado={setAglutinadoGlobal}
                    />
                </div>
            )}
        </div>
    );
}

// ============================================================
// Pagina principal
// ============================================================
export default function MontagemPlanoCortePage() {
    const appConfig = useAppConfig();
    const filtroAtivo = appConfig.planoCorteFiltroDC || 'corte';
    const [refreshPlanos, setRefreshPlanos] = useState(0);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#f1f5f9] text-slate-800">
            <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0"><Scissors size={22} /></div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-none tracking-tight">Montagem Plano de Corte</h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">Selecione itens de OS e inclua no plano de corte</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${filtroAtivo === 'chaparia' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-blue-50 border-blue-300 text-blue-700'}`}>
                        {filtroAtivo === 'chaparia' ? <FileType2 size={14} /> : <SplitSquareHorizontal size={14} />}
                        {filtroAtivo === 'chaparia' ? 'Desenho Chaparia' : 'Setor Corte'}
                        <span className="text-[9px] opacity-60 ml-1">(via Configuracao)</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-3 p-3">
                <PainelItensOS tipoFiltro={filtroAtivo} onPlanosChange={() => setRefreshPlanos(v => v + 1)} />
                <PainelPlanosCorte refreshTrigger={refreshPlanos} />
            </div>
        </div>
    );
}
