import { useState, useEffect, useMemo } from 'react';
import {
    Scissors, Loader2, Filter, Database, RefreshCw,
    CheckCircle2, Clock, Search, X
} from 'lucide-react';

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
    EnderecoCompletoPlanoCorte: string | null;
    DataLiberacao: string | null;
    UsuarioLiberacao: string | null;
    DataInicial: string | null;
    DataFinal: string | null;
    QtdeTotalPecas: number | null;
    QtdeTotalPecasExecutadas: number | null;
}

function fmt(val: string | null): string {
    if (!val) return '—';
    const s = String(val).trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[1]}/${br[2]}/${br[3]}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
}

export default function ProducaoPlanoCorte() {
    const [planos, setPlanos] = useState<PlanoCorte[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exibirConcluidos, setExibirConcluidos] = useState(false);

    // Filtros servidor
    const [fEspessura, setFEspessura] = useState('');
    const [fMaterial, setFMaterial] = useState('');

    // Filtro local rápido
    const [fLocal, setFLocal] = useState('');

    const fetchPlanos = async () => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ exibirConcluidos: String(exibirConcluidos) });
            if (fEspessura.trim()) params.set('Espessura', fEspessura.trim());
            if (fMaterial.trim())  params.set('MaterialSW', fMaterial.trim());
            const res = await fetch(`/api/plano-corte/lista?${params}`);
            if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setPlanos(result.data || []);
            else setError(result.message || 'Erro ao buscar dados');
        } catch (e: any) {
            setError(e.message);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchPlanos(); }, [exibirConcluidos]);

    const handleSearch = () => fetchPlanos();
    const handleLimpar = () => { setFEspessura(''); setFMaterial(''); setFLocal(''); setTimeout(fetchPlanos, 50); };

    const planosFiltrados = useMemo(() => {
        if (!fLocal.trim()) return planos;
        const q = fLocal.toLowerCase();
        return planos.filter(p =>
            String(p.IdPlanodecorte).includes(q) ||
            (p.DescPlanodecorte || '').toLowerCase().includes(q) ||
            (p.Espessura || '').toLowerCase().includes(q) ||
            (p.MaterialSW || '').toLowerCase().includes(q) ||
            (p.CriadoPor || '').toLowerCase().includes(q)
        );
    }, [planos, fLocal]);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#f8fafc] text-slate-800">

            {/* Header */}
            <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            <Scissors size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-none tracking-tight">Planos de Corte</h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">Visualização e controle dos planos de corte</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Contador */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                            <Database size={13} />
                            {loading ? '...' : `${planosFiltrados.length} planos`}
                        </div>
                        {/* Toggle Todos / Pendentes */}
                        <button
                            onClick={() => setExibirConcluidos(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                exibirConcluidos
                                    ? 'bg-emerald-500 text-white border-emerald-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {exibirConcluidos ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            {exibirConcluidos ? 'Exibindo Todos' : 'Apenas Pendentes'}
                        </button>
                        <button onClick={fetchPlanos} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="shrink-0 bg-white border-b border-slate-200 mx-4 mt-3 rounded-xl shadow-sm px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={13} className="text-slate-400 shrink-0" />
                    {/* Filtros servidor */}
                    {[
                        { label: 'Espessura', val: fEspessura, set: setFEspessura, w: 'w-28' },
                        { label: 'Material SW', val: fMaterial, set: setFMaterial, w: 'w-36' },
                    ].map(({ label, val, set, w }) => (
                        <div key={label} className={`flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 ${w}`}>
                            <input
                                type="text" placeholder={label} value={val}
                                onChange={e => set(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="w-full text-xs py-1.5 outline-none bg-transparent font-medium text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                    ))}
                    <button onClick={handleSearch} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                        <Search size={13} />Pesquisar
                    </button>
                    <button onClick={handleLimpar} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                        <X size={13} />Limpar
                    </button>
                    {/* Busca local rápida */}
                    <div className="ml-auto flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 w-48">
                        <Search size={11} className="text-slate-400 mr-1.5 shrink-0" />
                        <input type="text" placeholder="Busca rápida..." value={fLocal}
                            onChange={e => setFLocal(e.target.value)}
                            className="w-full text-xs py-1.5 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-hidden mx-4 my-3 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-sm bg-white shadow-lg px-5 py-3 rounded-xl border border-blue-100">
                            <Loader2 className="animate-spin" size={20} />Carregando planos...
                        </div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold border border-red-200 mb-3">⚠️ {error}</div>
                )}

                <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead className="text-[10px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                                <tr>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">ID Plano</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Descrição</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Espessura</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Material SW</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap text-center">Qtde Peças</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap text-center">Executadas</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Data Cad.</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Data Limite</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Data Inicial</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Data Final</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Criado Por</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap text-center">Enviado</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap text-center">Concluído</th>
                                </tr>
                            </thead>
                            <tbody>
                                {planosFiltrados.length > 0 ? (
                                    planosFiltrados.map((p, idx) => {
                                        const concluido = p.Concluido === 'S' || p.Concluido === 'SIM';
                                        const enviado   = p.Enviadocorte === 'S';
                                        const pct = p.QtdeTotalPecas && p.QtdeTotalPecas > 0
                                            ? Math.round(((p.QtdeTotalPecasExecutadas ?? 0) / p.QtdeTotalPecas) * 100)
                                            : null;
                                        return (
                                            <tr key={`${p.IdPlanodecorte}-${idx}`}
                                                className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${concluido ? 'opacity-60' : ''}`}>
                                                <td className="px-3 py-1.5 font-bold text-blue-700 whitespace-nowrap">{p.IdPlanodecorte}</td>
                                                <td className="px-3 py-1.5 max-w-[200px] truncate text-slate-700" title={p.DescPlanodecorte ?? ''}>{p.DescPlanodecorte || '—'}</td>
                                                <td className="px-3 py-1.5 font-semibold text-slate-700 whitespace-nowrap">{p.Espessura || '—'}</td>
                                                <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{p.MaterialSW || '—'}</td>
                                                <td className="px-3 py-1.5 text-center font-bold text-indigo-600 bg-indigo-50/60">{p.QtdeTotalPecas ?? '—'}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {pct !== null ? (
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            pct >= 100 ? 'bg-emerald-100 text-emerald-700'
                                                            : pct >= 50 ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {p.QtdeTotalPecasExecutadas ?? 0} / {p.QtdeTotalPecas} ({pct}%)
                                                        </span>
                                                    ) : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap text-[10px]">{fmt(p.DataCad)}</td>
                                                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap text-[10px]">{fmt(p.DataLimite)}</td>
                                                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap text-[10px]">{fmt(p.DataInicial)}</td>
                                                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap text-[10px]">{fmt(p.DataFinal)}</td>
                                                <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap text-[10px]">{p.CriadoPor || '—'}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {enviado
                                                        ? <span className="inline-flex items-center gap-0.5 bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[9px] font-bold"><CheckCircle2 size={9} />SIM</span>
                                                        : <span className="text-slate-300 text-[10px]">—</span>}
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {concluido
                                                        ? <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 text-[9px] font-bold"><CheckCircle2 size={9} />SIM</span>
                                                        : <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 text-[9px] font-bold"><Clock size={9} />Pend.</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={13} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Scissors size={36} className="opacity-30" />
                                                <span className="font-medium text-sm">{loading ? 'Carregando...' : 'Nenhum plano de corte encontrado'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
