import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Loader2, Filter, Database, PackageCheck, CheckCircle2,
    Clock, ChevronDown, ChevronUp, Search, X, Building2, Weight, Star,
    ClipboardPen, AlertTriangle, Calendar
} from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface MontagemItem {
    CodMatFabricante: string;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    IdProjeto: number;
    Projeto: string;
    IdTag: number;
    Tag: string;
    DescTag: string;
    QtdeTotal: number;
    DescResumo: string;
    DescDetal: string;
    EnderecoArquivo: string;
    IdEmpresa: number;
    Peso: number | null;
    DescEmpresa: string;
    AreaPinturaUnitario: number | null;
    PesoUnitario: number | null;
    sttxtmontagem: string | null;
    RealizadoInicioMontagem: string | null;
    RealizadoFinalMontagem: string | null;
    ProdutoPrincipal: string | null;
    MontagemTotalExecutado: number | null;
    MontagemTotalExecutar: number | null;
    ParcialMontagem: number | null;
    OrdemServicoItemFinalizado?: string | null;
}

type Modo = 'pendentes' | 'concluidos';

interface Filtros {
    IdOrdemServico: string; IdOrdemServicoItem: string; Projeto: string;
    Tag: string; DescResumo: string; DescDetal: string;
    CodMatFabricante: string; IdPlanoDeCorte: string;
    DataInicioMontagemDe: string; DataInicioMontagemAte: string;
    DataFinalMontagemDe: string;  DataFinalMontagemAte: string;
}
const filtrosVazios: Filtros = {
    IdOrdemServico: '', IdOrdemServicoItem: '', Projeto: '',
    Tag: '', DescResumo: '', DescDetal: '', CodMatFabricante: '', IdPlanoDeCorte: '',
    DataInicioMontagemDe: '', DataInicioMontagemAte: '',
    DataFinalMontagemDe: '',  DataFinalMontagemAte: '',
};

const MODO_CONFIG = {
    pendentes:  { label: 'Pendentes',  icon: Clock,          badge: 'bg-amber-100 text-amber-700 border border-amber-300'   },
    concluidos: { label: 'Concluídos', icon: CheckCircle2,   badge: 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatarData(val: string | null): string {
    if (!val) return '—';
    const s = String(val).trim();
    const br  = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br)  return `${br[1]}/${br[2]}/${br[3]}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return '—';
}

/** Converte string de data (DD/MM/YYYY ou YYYY-MM-DD) em Date ou null */
function parseDateBR(val: string | null): Date | null {
    if (!val) return null;
    const s = String(val).trim();
    const br  = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br)  return new Date(+br[3], +br[2] - 1, +br[1]);
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return null;
}

function calcPct(executado: number | null, qtdeTotal: number | null): number | null {
    const ex    = Number(executado)  || 0;
    const total = Number(qtdeTotal)  || 0;
    return total > 0 ? (ex / total) * 100 : null;
}

// ─── Modal de Lançamento ──────────────────────────────────────────────────────
interface LancarModalProps {
    item: MontagemItem;
    onClose: () => void;
    onSuccess: (idItem: number, novoExecutado: number, novoExecutar: number, concluido: boolean) => void;
}

function LancarModal({ item, onClose, onSuccess }: LancarModalProps) {
    const execar  = Number(item.MontagemTotalExecutar) || 0;
    const exec    = Number(item.MontagemTotalExecutado) || 0;
    const [qtde, setQtde] = useState<string>(String(execar || item.QtdeTotal));
    const [confirmando, setConfirmando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    const qtdeNum    = parseInt(qtde) || 0;
    const novoExec   = exec + qtdeNum;
    const novoExar   = Math.max(0, execar - qtdeNum);
    // Finalização ocorre SOMENTE quando o total executado atingir a quantidade total do item
    const seraFinal  = novoExec >= item.QtdeTotal;

    const podeConfirmar = qtdeNum > 0 && qtdeNum <= item.QtdeTotal;

    const handleClick = () => {
        setErro('');
        if (!podeConfirmar) { setErro('Valor inválido. Deve ser > 0 e ≤ ' + item.QtdeTotal); return; }
        if (seraFinal) { setConfirmando(true); return; }
        enviar();
    };

    const enviar = async () => {
        setSalvando(true);
        try {
            const res = await fetch('/api/teste-final-montagem/lancar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    IdOrdemServicoItem: item.IdOrdemServicoItem,
                    IdOrdemServico:     item.IdOrdemServico,
                    IdTag:              item.IdTag,
                    entrada:            qtdeNum,
                }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.osFinalizada) alert('✅ ' + data.message + '\n\n🎉 Ordem de Serviço encerrada!');
                else if (data.itemFinalizado || data.concluido) alert('✅ ' + data.message);
                onSuccess(item.IdOrdemServicoItem, data.novoExecutado, data.novoExecutar, data.concluido);
                onClose();
            } else {
                setErro(data.message || 'Erro desconhecido');
                setConfirmando(false);
            }
        } catch (e: any) {
            setErro(e.message);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <ClipboardPen size={20} />
                        <span className="font-black text-base">Lançar Montagem</span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Info do item */}
                    <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs space-y-1 border border-slate-200">
                        <div className="flex gap-6">
                            <span><span className="text-slate-400 font-medium">OS:</span> <strong>{item.IdOrdemServico}</strong></span>
                            <span><span className="text-slate-400 font-medium">Item:</span> <strong>{item.IdOrdemServicoItem}</strong></span>
                        </div>
                        <div><span className="text-slate-400">Tag:</span> <strong className="text-indigo-700">{item.Tag}</strong></div>
                        <div><span className="text-slate-400">Projeto:</span> {item.Projeto}</div>
                        <div className="flex gap-6 pt-1 border-t border-slate-200 mt-2">
                            <span><span className="text-slate-400">Executado:</span> <strong className="text-emerald-700">{exec}</strong></span>
                            <span><span className="text-slate-400">A Executar:</span> <strong className="text-amber-700">{execar}</strong></span>
                            <span><span className="text-slate-400">Total:</span> <strong>{item.QtdeTotal}</strong></span>
                        </div>
                    </div>

                    {/* Input */}
                    {!confirmando ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                Quantidade testada:
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={item.QtdeTotal}
                                value={qtde}
                                onChange={e => { setQtde(e.target.value); setErro(''); }}
                                className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-xl font-black text-center text-indigo-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleClick()}
                            />
                            {seraFinal && podeConfirmar && (
                                <p className="text-[11px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    Este lançamento irá concluir o setor de Montagem.
                                </p>
                            )}
                            {erro && <p className="text-[11px] text-red-600 font-bold mt-1.5">⚠️ {erro}</p>}
                        </div>
                    ) : (
                        /* Tela de confirmação final */
                        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 text-sm">
                            <p className="font-black text-amber-800 text-center mb-2">⚠️ Confirmar Finalização</p>
                            <p className="text-amber-700 text-center text-xs">
                                Esta opção irá <strong>concluir o setor Montagem</strong> para o item {item.IdOrdemServicoItem}.
                                {item.ProdutoPrincipal === 'SIM' && ' Por ser Produto Principal, todos os itens da OS serão finalizados.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Botões */}
                <div className="px-6 pb-5 flex gap-3">
                    <button
                        onClick={() => { setConfirmando(false); onClose(); }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    {confirmando ? (
                        <>
                            <button
                                onClick={() => setConfirmando(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={enviar}
                                disabled={salvando}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {salvando ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : '✅ Confirmar'}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleClick}
                            disabled={salvando}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {salvando ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><ClipboardPen size={14} />Lançar</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TesteFinalMontagemPage() {
    const { maxRegistros } = useAppConfig();
    const [itens, setItens] = useState<MontagemItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modo, setModo] = useState<Modo>('pendentes');
    const [filtros, setFiltros] = useState<Filtros>(filtrosVazios);
    const [filtroAberto, setFiltroAberto] = useState(true);
    const [modalItem, setModalItem] = useState<MontagemItem | null>(null);
    const fetchAbortRef = useRef<AbortController | null>(null);

    // Hoje (sem horas) para comparação de datas
    const hoje = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

    const fetchItens = useCallback(async (modoAtual: Modo = modo) => {
        if (fetchAbortRef.current) fetchAbortRef.current.abort();
        const ctrl = new AbortController();
        fetchAbortRef.current = ctrl;
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ modo: modoAtual, limit: String(maxRegistros || 500) });
            // Filtros texto enviados ao servidor (datas filtradas client-side)
            const textKeys: (keyof Filtros)[] = ['IdOrdemServico','IdOrdemServicoItem','Projeto','Tag','DescResumo','DescDetal','CodMatFabricante','IdPlanoDeCorte'];
            textKeys.forEach(k => { const v = filtros[k]; if (v && v.trim()) params.set(k, v.trim()); });
            const res = await fetch(`/api/teste-final-montagem/itens?${params}`, { signal: ctrl.signal });
            if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else setError(result.message || 'Erro ao buscar dados');
        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally { setLoading(false); }
    }, [filtros, maxRegistros, modo]);

    useEffect(() => { fetchItens(modo); }, [modo]);

    const handleSearch = () => fetchItens(modo);
    const handleLimpar = () => { setFiltros(filtrosVazios); setTimeout(() => fetchItens(modo), 50); };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

    // Após lançamento: re-busca completa para garantir estado correto
    const handleLancamentoSucesso = (_id: number, _exec: number, _exar: number, _conc: boolean) => {
        fetchItens(modo);
    };

    // Filtragem client-side por intervalo de datas
    const itensFiltrados = useMemo(() => {
        let result = itens;
        const { DataInicioMontagemDe, DataInicioMontagemAte, DataFinalMontagemDe, DataFinalMontagemAte } = filtros;
        if (DataInicioMontagemDe) { const de = new Date(DataInicioMontagemDe + 'T00:00:00'); result = result.filter(it => { const d = parseDateBR(it.RealizadoInicioMontagem); return d !== null && d >= de; }); }
        if (DataInicioMontagemAte) { const ate = new Date(DataInicioMontagemAte + 'T00:00:00'); result = result.filter(it => { const d = parseDateBR(it.RealizadoInicioMontagem); return d !== null && d <= ate; }); }
        if (DataFinalMontagemDe) { const de = new Date(DataFinalMontagemDe + 'T00:00:00'); result = result.filter(it => { const d = parseDateBR(it.RealizadoFinalMontagem); return d !== null && d >= de; }); }
        if (DataFinalMontagemAte) { const ate = new Date(DataFinalMontagemAte + 'T00:00:00'); result = result.filter(it => { const d = parseDateBR(it.RealizadoFinalMontagem); return d !== null && d <= ate; }); }
        return result;
    }, [itens, filtros]);
    const mc = MODO_CONFIG[modo];
    const ModoIcon = mc.icon;

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#f1f5f9] text-slate-800">

            {/* Modal */}
            {modalItem && (
                <LancarModal
                    item={modalItem}
                    onClose={() => setModalItem(null)}
                    onSuccess={handleLancamentoSucesso}
                />
            )}

            {/* ── Header ── */}
            <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-5 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            <PackageCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-none tracking-tight">Teste Final — Montagem</h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">Itens aptos para montagem e envio</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${mc.badge}`}>
                            <Database size={13} />
                            {loading ? '...' : `${itensFiltrados.length} itens`}
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            {(['pendentes', 'concluidos'] as Modo[]).map(m => {
                                const cfg = MODO_CONFIG[m]; const Icon = cfg.icon; const ativo = modo === m;
                                return (
                                    <button key={m} onClick={() => setModo(m)}
                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all ${ativo ? m === 'pendentes' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                        <Icon size={13} />{cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Filtros ── */}
            <div className="shrink-0 bg-white border-b border-slate-200 mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    onClick={() => setFiltroAberto(v => !v)}>
                    <span className="flex items-center gap-2"><Filter size={13} />Filtros de Pesquisa</span>
                    {filtroAberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {filtroAberto && (
                    <div className="px-4 pb-3 border-t border-slate-100">
                        {/* Linha 1 – filtros texto */}
                        <div className="flex flex-wrap gap-2 mt-2.5">
                            {([
                                { key: 'IdOrdemServico', label: 'OS', w: 'w-24' },
                                { key: 'IdOrdemServicoItem', label: 'Item', w: 'w-20' },
                                { key: 'Projeto', label: 'Projeto', w: 'w-36' },
                                { key: 'Tag', label: 'Tag', w: 'w-32' },
                                { key: 'DescResumo', label: 'Desc. Resumo', w: 'w-40' },
                                { key: 'DescDetal', label: 'Desc. Detal', w: 'w-40' },
                                { key: 'CodMatFabricante', label: 'Cód. Fabri.', w: 'w-32' },
                                { key: 'IdPlanoDeCorte', label: 'Plano Corte', w: 'w-28' },
                            ] as { key: keyof Filtros; label: string; w: string }[]).map(({ key, label, w }) => (
                                <div key={key} className={`flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 shadow-sm focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-200 ${w}`}>
                                    <input type="text" placeholder={label} value={filtros[key]}
                                        onChange={e => setFiltros(p => ({ ...p, [key]: e.target.value }))}
                                        onKeyDown={handleKeyDown}
                                        className="w-full text-xs py-1.5 outline-none bg-transparent font-medium text-slate-700 placeholder:text-slate-400" />
                                </div>
                            ))}
                            <button onClick={handleSearch} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                                <Search size={13} />Pesquisar
                            </button>
                            <button onClick={handleLimpar} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                                <X size={13} />Limpar
                            </button>
                        </div>
                        {/* Linha 2 – intervalo de datas (filtro client-side) */}
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                <Calendar size={11} />Datas
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">Início Mont.:</span>
                            <input type="date" value={filtros.DataInicioMontagemDe}
                                onChange={e => setFiltros(p => ({ ...p, DataInicioMontagemDe: e.target.value }))}
                                className="text-xs py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 focus:border-indigo-400 w-34" />
                            <span className="text-[10px] text-slate-400">até</span>
                            <input type="date" value={filtros.DataInicioMontagemAte}
                                onChange={e => setFiltros(p => ({ ...p, DataInicioMontagemAte: e.target.value }))}
                                className="text-xs py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 focus:border-indigo-400 w-34" />
                            <span className="text-[10px] text-slate-500 font-semibold ml-2">Final Mont.:</span>
                            <input type="date" value={filtros.DataFinalMontagemDe}
                                onChange={e => setFiltros(p => ({ ...p, DataFinalMontagemDe: e.target.value }))}
                                className="text-xs py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 focus:border-indigo-400 w-34" />
                            <span className="text-[10px] text-slate-400">até</span>
                            <input type="date" value={filtros.DataFinalMontagemAte}
                                onChange={e => setFiltros(p => ({ ...p, DataFinalMontagemAte: e.target.value }))}
                                className="text-xs py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700 focus:border-indigo-400 w-34" />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Tabela ── */}
            <div className="flex-1 overflow-hidden mx-4 my-3 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-white shadow-lg px-5 py-3 rounded-xl border border-indigo-100">
                            <Loader2 className="animate-spin" size={20} />Carregando itens...
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
                                    <th className="px-3 py-2 font-black whitespace-nowrap">OS / Item</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Projeto</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Tag</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Empresa</th>
                                    <th className="px-3 py-2 font-black text-center whitespace-nowrap">Qtde</th>
                                    <th className="px-3 py-2 font-black text-right whitespace-nowrap">Executado</th>
                                    <th className="px-3 py-2 font-black text-right whitespace-nowrap">A Executar</th>
                                    <th className="px-3 py-2 font-black text-center whitespace-nowrap">Parcial</th>
                                    <th className="px-3 py-2 font-black text-right whitespace-nowrap">Peso Un.</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Cód. Fabri.</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Desc. Resumo</th>
                                    <th className="px-3 py-2 font-black text-center whitespace-nowrap">Principal</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Início Mont.</th>
                                    <th className="px-3 py-2 font-black whitespace-nowrap">Final Mont.</th>
                                    <th className="px-3 py-2 font-black text-center whitespace-nowrap">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itensFiltrados.length > 0 ? (
                                    itensFiltrados.map((item, idx) => {
                                        const isPrincipal = item.ProdutoPrincipal === 'S' || item.ProdutoPrincipal === 'SIM';
                                        const pct = calcPct(item.MontagemTotalExecutado, item.QtdeTotal);
                                        const concluido = item.sttxtmontagem === 'C' || item.OrdemServicoItemFinalizado === 'C';
                                        // Cores de data: vermelho se > hoje, verde se ≤ hoje
                                        const dInicio = parseDateBR(item.RealizadoInicioMontagem);
                                        const corInicio = dInicio ? (dInicio > hoje ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold') : 'text-slate-400';
                                        const dFinal = parseDateBR(item.RealizadoFinalMontagem);
                                        const corFinal = dFinal ? (dFinal > hoje ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold') : 'text-slate-400';

                                        return (
                                            <tr key={`${item.IdOrdemServicoItem}-${idx}`}
                                                className={`border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${isPrincipal ? 'bg-amber-50/30' : ''} ${concluido ? 'opacity-60' : ''}`}>
                                                <td className="px-3 py-1.5 font-bold text-slate-700 whitespace-nowrap">
                                                    {item.IdOrdemServico}<span className="text-slate-400 font-normal"> / {item.IdOrdemServicoItem}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-slate-600 max-w-[120px] truncate" title={item.Projeto}>{item.Projeto}</td>
                                                <td className="px-3 py-1.5 font-bold text-indigo-700 whitespace-nowrap max-w-[100px] truncate" title={item.Tag}>{item.Tag}</td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Building2 size={11} className="shrink-0" />
                                                        <span className="truncate max-w-[100px]" title={item.DescEmpresa}>{item.DescEmpresa}</span>
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center font-bold text-indigo-600 bg-indigo-50/60">{item.QtdeTotal}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold text-emerald-700">{item.MontagemTotalExecutado ?? '—'}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold text-amber-700">{item.MontagemTotalExecutar ?? '—'}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <span className="inline-flex items-center gap-1.5 font-bold text-[11px]">
                                                        {/* executado / total */}
                                                        <span className="text-emerald-700">{Number(item.MontagemTotalExecutado ?? 0)}</span>
                                                        <span className="text-slate-400 font-normal">/</span>
                                                        <span className="text-slate-600">{item.QtdeTotal}</span>
                                                        {/* badge percentual */}
                                                        {pct !== null && (
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                pct >= 100 ? 'bg-emerald-100 text-emerald-700'
                                                                : pct >= 50  ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-red-100 text-red-700'
                                                            }`}>
                                                                {pct.toFixed(0)}%
                                                            </span>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-slate-500">
                                                    {item.PesoUnitario !== null ? (
                                                        <span className="flex items-center justify-end gap-0.5"><Weight size={10} />{Number(item.PesoUnitario).toFixed(2)}</span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-3 py-1.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">{item.CodMatFabricante}</td>
                                                <td className="px-3 py-1.5 max-w-[180px] truncate text-slate-600" title={item.DescResumo}>{item.DescResumo}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {isPrincipal && (
                                                        <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                                            <Star size={9} fill="currentColor" />PP
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-3 py-1.5 whitespace-nowrap text-[10px] ${corInicio}`}>{formatarData(item.RealizadoInicioMontagem)}</td>
                                                <td className={`px-3 py-1.5 whitespace-nowrap text-[10px] ${corFinal}`}>{formatarData(item.RealizadoFinalMontagem)}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    {concluido ? (
                                                        <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 text-[9px] font-bold">
                                                            <CheckCircle2 size={9} />OK
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => setModalItem(item)}
                                                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2 py-1 text-[10px] font-bold transition-colors shadow-sm"
                                                        >
                                                            <ClipboardPen size={10} />Lançar
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={15} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <PackageCheck size={36} className="opacity-30" />
                                                <span className="font-medium text-sm">{loading ? 'Carregando...' : `Nenhum item ${modo === 'concluidos' ? 'concluído' : 'pendente'} encontrado`}</span>
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
