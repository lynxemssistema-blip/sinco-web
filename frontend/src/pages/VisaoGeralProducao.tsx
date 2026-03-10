import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, CalendarDays, Check, CheckCircle, Loader, RotateCcw, ShieldAlert, Tag as TagIcon, ChevronRight, Settings, Edit2 } from 'lucide-react';

const API_BASE = '/api';

// ─── Interfaces ───
interface Projeto { IdProjeto: number; Projeto: string; DescProjeto: string; DataPrevisao: string; Finalizado: string; liberado: string; QtdeTags: number; QtdeTagsExecutadas: number; PercentualTags: number; QtdePecasTags: number; QtdePecasExecutadas: number; PercentualPecas: number; TotalRnc: number; ExecCorte: number; TotalCorte: number; ExecDobra: number; TotalDobra: number; ExecSolda: number; TotalSolda: number; ExecPintura: number; TotalPintura: number; ExecMontagem: number; TotalMontagem: number; }
interface Tag { IdTag: number; Tag: string; DescTag: string; DataPrevisao: string; QtdeTag: string; QtdeOS: string; qtdetotal: string; Finalizado: string; qtdernc: number; CorteTotalExecutado: string; CorteTotalExecutar: string; CortePercentual: string; DobraTotalExecutado: string; DobraTotalExecutar: string; DobraPercentual: string; SoldaTotalExecutado: string; SoldaTotalExecutar: string; SoldaPercentual: string; PinturaTotalExecutado: string; PinturaTotalExecutar: string; PinturaPercentual: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; }
interface Rnc { IdRnc: number; Estatus: string; Tag: string; SetorResponsavel: string; DescricaoPendencia: string; DescResumo: string; UsuarioResponsavel: string; DataCriacao: string; DataFinalizacao: string; }

const toNum = (v: any) => parseFloat(String(v ?? '0')) || 0;
const safePct = (e: any, t: any) => toNum(t) > 0 ? Math.min(Math.round((toNum(e) / toNum(t)) * 100), 100) : 0;
const brToIso = (br: string) => { const m = br?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const isoToBr = (iso: string) => { const [y, m, d] = (iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };

const businessDaysUntil = (dateStr: string) => {
    if (!dateStr) return null;
    const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return null;
    const target = new Date(+m[3], +m[2] - 1, +m[1]); const today = new Date(); today.setHours(0, 0, 0, 0);
    if (target <= today) return -1;
    let count = 0; const cur = new Date(today);
    while (cur < target) { cur.setDate(cur.getDate() + 1); const d = cur.getDay(); if (d !== 0 && d !== 6) count++; }
    return count;
};

const DateBadge = ({ date }: { date: string }) => {
    if (!date) return <span className="text-gray-400 text-xs">—</span>;
    const days = businessDaysUntil(date);
    const color = days === -1 ? 'bg-red-100 text-red-700 font-bold' : (days !== null && days <= 5) ? 'bg-yellow-100 text-yellow-700 font-bold' : 'bg-green-50 text-green-700';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${color}`}>
            <CalendarDays size={10} /> {date} {days === -1 ? '· Vencido' : (days !== null && days >= 0 ? `· ${days}d úteis` : '')}
        </span>
    );
};

const SECTORS = [
    { k: 'Corte', ex: 'ExecCorte', t: 'TotalCorte', c: 'bg-blue-600' }, { k: 'Dobra', ex: 'ExecDobra', t: 'TotalDobra', c: 'bg-purple-600' },
    { k: 'Solda', ex: 'ExecSolda', t: 'TotalSolda', c: 'bg-red-600' }, { k: 'Pintura', ex: 'ExecPintura', t: 'TotalPintura', c: 'bg-amber-500' },
    { k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },
];

const TAG_SECTORS = [
    { k: 'Corte', ex: 'CorteTotalExecutado', t: 'CorteTotalExecutar', p: 'CortePercentual', c: 'bg-blue-600' },
    { k: 'Dobra', ex: 'DobraTotalExecutado', t: 'DobraTotalExecutar', p: 'DobraPercentual', c: 'bg-purple-600' },
    { k: 'Solda', ex: 'SoldaTotalExecutado', t: 'SoldaTotalExecutar', p: 'SoldaPercentual', c: 'bg-red-600' },
    { k: 'Pintura', ex: 'PinturaTotalExecutado', t: 'PinturaTotalExecutar', p: 'PinturaPercentual', c: 'bg-amber-500' },
    { k: 'Montagem', ex: 'MontagemTotalExecutado', t: 'MontagemTotalExecutar', p: 'MontagemPercentual', c: 'bg-emerald-600' },
];

export default function VisaoGeralProducaoPage() {
    const [projetos, setProjetos] = useState<Projeto[]>([]); const [tags, setTags] = useState<Tag[]>([]); const [rncs, setRncs] = useState<Rnc[]>([]);
    const [load, setLoad] = useState(true); const [loadTags, setLoadTags] = useState(false); const [loadRncs, setLoadRncs] = useState(false);
    const [selProj, setSelProj] = useState<Projeto | null>(null);
    const [showProjDrawer, setShowProjDrawer] = useState(false); const [showTagsModal, setShowTagsModal] = useState(false);
    const [rncPanel, setRncPanel] = useState(false); const [fProj, setFProj] = useState(''); const [fTag, setFTag] = useState('');
    const [filFin, setFilFin] = useState(false); const [filLib, setFilLib] = useState(false);

    // Modais e Ações
    const [actionModal, setActionModal] = useState<'dateProj' | 'dateTag' | 'fin' | 'cancelFin' | null>(null);
    const [dateInput, setDateInput] = useState(''); const [updateTagsCheck, setUpdateTagsCheck] = useState(false);
    const [selTag, setSelTag] = useState<Tag | null>(null); const [isSaving, setIsSaving] = useState(false); const [msg, setMsg] = useState<{ ok: boolean, t: string } | null>(null);

    const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.username || u.name || 'Sistema'; } catch { return 'Sistema'; } };

    const fetchProj = useCallback(async (fin = filFin, lib = filLib) => {
        setLoad(true); try {
            const qs = new URLSearchParams(); if (fin) qs.set('finalizados', '1'); if (lib) qs.set('liberados', '1');
            const res = await (await fetch(`${API_BASE}/visao-geral/projetos${qs.toString() ? '?' + qs : ''}`)).json();
            if (res.success) setProjetos(res.data);
        } catch (e) { console.error(e); } finally { setLoad(false); }
    }, [filFin, filLib]);

    const fetchTags = async (id: number) => { setLoadTags(true); try { const r = await (await fetch(`${API_BASE}/visao-geral/tags/${id}`)).json(); if (r.success) setTags(r.data); } catch (e) { } finally { setLoadTags(false); } };
    const fetchRncs = async (id: number) => { setLoadRncs(true); try { const r = await (await fetch(`${API_BASE}/visao-geral/rncs/${id}`)).json(); if (r.success) setRncs(r.data); } catch (e) { } finally { setLoadRncs(false); } };

    useEffect(() => { fetchProj(filFin, filLib); }, [filFin, filLib]);

    const openProj = (p: Projeto) => { setSelProj(p); setShowProjDrawer(true); };
    const openTagsM = () => { if (selProj) { fetchTags(selProj.IdProjeto); setShowTagsModal(true); setShowProjDrawer(false); } };

    // Funções de salvamento (Projetos)
    const salvarDataProj = async () => {
        setIsSaving(true); setMsg(null);
        try {
            const dataBr = isoToBr(dateInput);
            const r = await (await fetch(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/data-previsao`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataPrevisao: dataBr, atualizarTags: updateTagsCheck, usuario: getUser() }) })).json();
            if (r.success) {
                setProjetos(ps => ps.map(x => x.IdProjeto === selProj?.IdProjeto ? { ...x, DataPrevisao: dataBr } : x)); setSelProj(p => p ? { ...p, DataPrevisao: dataBr } : p);
                setMsg({ ok: true, t: 'Data atualizada!' }); setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };
    const finProj = async (url: string, isFin: boolean) => {
        setIsSaving(true); setMsg(null);
        try {
            const r = await (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: getUser() }) })).json();
            if (r.success) {
                setProjetos(ps => ps.map(x => x.IdProjeto === selProj?.IdProjeto ? { ...x, Finalizado: isFin ? 'C' : '' } : x)); setSelProj(p => p ? { ...p, Finalizado: isFin ? 'C' : '' } : p);
                setMsg({ ok: true, t: r.message }); setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    // Funções de salvamento (Tags)
    const salvarDataTag = async () => {
        if (!selTag) return; setIsSaving(true); setMsg(null);
        try {
            const dataBr = isoToBr(dateInput);
            const r = await (await fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/data-previsao`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataPrevisao: dataBr }) })).json();
            if (r.success) {
                setTags(ts => ts.map(x => x.IdTag === selTag.IdTag ? { ...x, DataPrevisao: dataBr } : x));
                setMsg({ ok: true, t: 'Data da Tag atualizada!' }); setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const isFin = selProj?.Finalizado && selProj.Finalizado.trim() !== '';
    const filteredProj = projetos.filter(p => !fProj || String(p.IdProjeto).includes(fProj) || p.Projeto?.toLowerCase().includes(fProj.toLowerCase()) || p.DescProjeto?.toLowerCase().includes(fProj.toLowerCase()));
    const filteredTags = tags.filter(t => !fTag || t.Tag?.toLowerCase().includes(fTag.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
            {/* Top Bar */}
            <div className="bg-white border-b px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 flex-1 bg-gray-50 border rounded-lg px-3 py-1.5 focus-within:ring-2 ring-[#32423D]/20">
                    <Search className="text-gray-400" size={16} />
                    <input type="text" placeholder="Buscar projeto..." value={fProj} onChange={e => setFProj(e.target.value)} className="bg-transparent border-none outline-none flex-1 text-sm text-gray-700" />
                </div>
                <button onClick={() => setFilFin(!filFin)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold text-xs transition ${filFin ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}><CheckCircle size={14} /> Finalizados</button>
                <button onClick={() => setFilLib(!filLib)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold text-xs transition ${filLib ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}><Filter size={14} /> Liberados</button>
                <span className="text-xs text-gray-400 font-medium ml-2">{filteredProj.length} projet.</span>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-6">
                {load ? <div className="flex justify-center mt-10 text-gray-400"><Loader className="animate-spin" /></div> :
                    filteredProj.length === 0 ? <div className="text-center mt-10 text-gray-400">Nenhum projeto encontrado.</div> : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
                            {filteredProj.map(p => {
                                const pFin = p.Finalizado?.trim() !== ''; const pLib = p.liberado === 'S';
                                return (
                                    <div key={p.IdProjeto} onClick={() => openProj(p)} className="bg-white border-2 border-transparent shadow-sm hover:shadow-md hover:border-[#32423D]/30 rounded-xl p-5 cursor-pointer transition relative group">
                                        <div className="absolute top-4 right-4 flex gap-1">
                                            {pFin && <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">FIN</span>}
                                            {pLib && !pFin && <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">LIB</span>}
                                        </div>
                                        <div className="text-[10px] font-mono text-gray-400 mb-1">#{p.IdProjeto}</div>
                                        <div className="font-bold text-gray-800 pr-12 truncate">{p.Projeto}</div>
                                        <div className="text-xs text-gray-500 mb-3 truncate">{p.DescProjeto}</div>
                                        <DateBadge date={p.DataPrevisao} />

                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                                <span>PROG. {p.PercentualTags}%</span> <span>{p.QtdeTagsExecutadas}/{p.QtdeTags} Tags</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#32423D]" style={{ width: `${p.PercentualTags}%` }} /></div>

                                            <div className="flex gap-1 mt-3">
                                                {SECTORS.map(s => <div key={s.k} className="flex-1 h-1 bg-gray-100 rounded-full" title={s.k}><div className={`h-full ${s.c} rounded-full`} style={{ width: `${safePct(p[s.ex as keyof Projeto], p[s.t as keyof Projeto])}%` }} /></div>)}
                                            </div>
                                            {toNum(p.TotalRnc) > 0 && <div className="mt-3 text-[10px] font-bold text-red-600 flex items-center gap-1"><ShieldAlert size={12} /> {toNum(p.TotalRnc)} RNCs</div>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
            </div>

            {/* ══ DRAWER: Detalhes Projeto ══ */}
            {showProjDrawer && selProj && (
                <>
                    <div className="absolute inset-0 bg-black/20 z-10" onClick={() => setShowProjDrawer(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[500px] max-w-full bg-white z-20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        <div className="bg-[#32423D] text-white p-6 pb-8 rounded-bl-3xl">
                            <div className="flex justify-between items-start">
                                <div><span className="text-xs font-mono opacity-60">#{selProj.IdProjeto}</span><h2 className="text-xl font-bold mt-1 leading-tight">{selProj.Projeto}</h2><p className="text-sm opacity-80 mt-1">{selProj.DescProjeto}</p></div>
                                <button onClick={() => setShowProjDrawer(false)} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={18} /></button>
                            </div>
                            <div className="mt-5 flex items-center justify-between">
                                <DateBadge date={selProj.DataPrevisao} />
                                {isFin && <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">FINALIZADO</span>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-6 bg-slate-50">
                            {/* Ações Rápidas (PCP Context) */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setDateInput(brToIso(selProj.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-[#32423D]/30 transition text-[#32423D] group">
                                    <CalendarDays className="mb-1 opacity-70 group-hover:opacity-100" size={18} /><span className="text-[11px] font-bold">Editar Data</span>
                                </button>
                                {toNum(selProj.TotalRnc) > 0 && (
                                    <button onClick={() => { fetchRncs(selProj.IdProjeto); setRncPanel(true); }} className="flex flex-col items-center justify-center p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition text-red-700 group">
                                        <ShieldAlert className="mb-1" size={18} /><span className="text-[11px] font-bold">{toNum(selProj.TotalRnc)} RNCs Abertas</span>
                                    </button>
                                )}
                                <button onClick={() => { setMsg(null); setActionModal('fin'); }} disabled={isFin} className={`flex flex-col items-center justify-center p-3 border rounded-xl transition ${isFin ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-gray-200 hover:border-red-500 hover:text-red-600 text-gray-600'}`}>
                                    <CheckCircle className="mb-1" size={18} /><span className="text-[11px] font-bold">{isFin ? 'Já Finalizado' : 'Finalizar Projeto'}</span>
                                </button>
                                <button onClick={() => { setMsg(null); setActionModal('cancelFin'); }} disabled={!isFin} className={`flex flex-col items-center justify-center p-3 border rounded-xl transition ${!isFin ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-white border-orange-200 hover:border-orange-500 text-orange-600'}`}>
                                    <RotateCcw className="mb-1" size={18} /><span className="text-[11px] font-bold">Desfazer Fin.</span>
                                </button>
                            </div>

                            {/* Gerenciar Tags (Destaque Principal) */}
                            <button onClick={openTagsM} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#32423D] to-slate-800 text-white rounded-xl shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5">
                                <div className="flex items-center gap-3"><Settings size={20} /><div><div className="font-bold text-sm">Gerenciar Tags do Projeto</div><div className="text-[11px] opacity-80">{selProj.QtdeTags} tags associadas no processo</div></div></div>
                                <ChevronRight size={20} className="opacity-70" />
                            </button>

                            {/* Info de Produção */}
                            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Avanço por Setor</h3>
                                <div className="space-y-4">
                                    {SECTORS.map(s => {
                                        const e = toNum(selProj[s.ex as keyof Projeto]), t = toNum(selProj[s.t as keyof Projeto]);
                                        if (!t && !e) return null; const pct = safePct(e, t);
                                        return (
                                            <div key={s.k}>
                                                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span>{s.k}</span><span>{pct}% ({e}/{t})</span></div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${s.c}`} style={{ width: `${pct}%` }} /></div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══ MODAL FULL: Gestão de Tags ══ */}
            {showTagsModal && selProj && (
                <div className="fixed inset-0 bg-white z-40 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Header Minimalista PCP */}
                    <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-4 shrink-0 shadow-md">
                        <button onClick={() => setShowTagsModal(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition"><X size={20} /></button>
                        <div>
                            <div className="text-xs text-slate-400 font-mono tracking-widest uppercase flex items-center gap-2">Gestão de Tags <ChevronRight size={10} /> Projeto #{selProj.IdProjeto}</div>
                            <h1 className="text-lg font-bold">{selProj.Projeto}</h1>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            <div className="bg-slate-800 rounded-lg flex items-center px-3 py-1.5 border border-slate-700 focus-within:border-emerald-500 transition-colors">
                                <Search size={14} className="text-slate-400 mr-2" /><input type="text" placeholder="Filtrar tag..." value={fTag} onChange={e => setFTag(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-48" />
                            </div>
                        </div>
                    </div>

                    {/* DataGrid Técnico */}
                    <div className="flex-1 overflow-auto bg-slate-50 p-6">
                        {loadTags ? (
                            <div className="h-full flex items-center justify-center text-slate-400"><Loader className="animate-spin mr-2" /> Carregando tags...</div>
                        ) : filteredTags.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400">Nenhuma tag encontrada para este projeto.</div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="bg-slate-100 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-5 py-3">Tag</th>
                                            <th className="px-5 py-3 text-center">Data Prev.</th>
                                            <th className="px-5 py-3 text-center">Peças</th>
                                            <th className="px-5 py-3 text-center w-20">Ações</th>
                                            {TAG_SECTORS.map(s => <th key={s.k} className="px-4 py-3 text-center">{s.k}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTags.map(t => {
                                            const qtdeTot = toNum(t.qtdetotal); const tFin = t.Finalizado?.trim() !== '';
                                            return (
                                                <tr key={t.IdTag} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${tFin ? 'bg-emerald-500' : 'bg-amber-400'}`} /> <span className="font-bold text-slate-800 text-sm">{t.Tag}</span></div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{t.DescTag}</div>
                                                    </td>
                                                    <td className="px-5 py-3 text-center"><DateBadge date={t.DataPrevisao} /></td>
                                                    <td className="px-5 py-3 text-center font-bold text-slate-600">{t.qtdetotal || '—'}</td>
                                                    <td className="px-5 py-3 text-center">
                                                        <button onClick={() => { setSelTag(t); setDateInput(brToIso(t.DataPrevisao)); setMsg(null); setActionModal('dateTag'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                                                    </td>
                                                    {TAG_SECTORS.map(s => {
                                                        const e = toNum(t[s.ex as keyof Tag]), tot = toNum(t[s.t as keyof Tag]) || qtdeTot, raw = toNum(t[s.p as keyof Tag]), pct = raw || safePct(e, tot);
                                                        return (
                                                            <td key={s.k} className="px-4 py-3">
                                                                {(tot > 0 || e > 0) ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="text-[10px] text-slate-500 font-bold mb-1">{pct}%</div>
                                                                        <div className="w-16 h-1 bg-slate-100 rounded-full"><div className={`h-full ${s.c} rounded-full`} style={{ width: `${pct}%` }} /></div>
                                                                    </div>
                                                                ) : <span className="text-slate-300 block text-center">—</span>}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ MODAIS DE AÇÃO REATIVA ══ */}
            {/* Modal de Datas (Projeto ou Tag) */}
            {(actionModal === 'dateProj' || actionModal === 'dateTag') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-5">
                            <div><h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><CalendarDays className="text-blue-600" /> Editar Data</h3><p className="text-xs text-slate-500">{actionModal === 'dateTag' ? `Tag: ${selTag?.Tag}` : `Projeto: ${selProj?.Projeto}`}</p></div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-lg"><X size={18} /></button>
                        </div>
                        <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500 transition mb-4" />
                        {actionModal === 'dateProj' && (
                            <label className="flex items-center gap-2 text-sm text-slate-600 mb-4 cursor-pointer">
                                <input type="checkbox" checked={updateTagsCheck} onChange={e => setUpdateTagsCheck(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                Atualizar também a data de todas as tags
                            </label>
                        )}
                        {msg && <div className={`px-3 py-2 rounded-lg text-xs font-bold mb-4 ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg.t}</div>}
                        <button onClick={actionModal === 'dateProj' ? salvarDataProj : salvarDataTag} disabled={!dateInput || isSaving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition flex justify-center">{isSaving ? <Loader className="animate-spin" size={18} /> : 'Salvar Data'}</button>
                    </div>
                </div>
            )}

            {/* Modal Finalizar/Cancelar Fin. */}
            {(actionModal === 'fin' || actionModal === 'cancelFin') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-4">
                            <div><h3 className={`font-bold text-lg flex items-center gap-2 ${actionModal === 'fin' ? 'text-red-600' : 'text-orange-600'}`}>{actionModal === 'fin' ? <><CheckCircle />Finalizar</> : <><RotateCcw />Desfazer</>}</h3><p className="text-xs text-slate-500 mt-1">Projeto: {selProj?.Projeto}</p></div>
                        </div>
                        <div className={`text-xs p-3 rounded-lg mb-4 leading-relaxed font-medium ${actionModal === 'fin' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-orange-50 text-orange-800 border border-orange-100'}`}>
                            {actionModal === 'fin' ? 'Este processo marcará o Projeto, Tags, OS e Itens como finalizados. Reversível se necessário.' : 'Garantir a reabertura do projeto limpando os status de finalização em cascata.'}
                        </div>
                        {msg && <div className={`px-3 py-2 rounded-lg text-xs font-bold mb-4 ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg.t}</div>}
                        <div className="flex gap-2">
                            <button onClick={() => setActionModal(null)} className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-50">Cancelar</button>
                            <button onClick={e => { e.preventDefault(); actionModal === 'fin' ? finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/finalizar`, true) : finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/cancelar-finalizacao`, false); }} disabled={isSaving} className={`flex-1 text-white font-bold py-2 rounded-lg transition flex justify-center ${actionModal === 'fin' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}>{isSaving ? <Loader className="animate-spin" size={18} /> : 'Confirmar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Painel RNC */}
            {rncPanel && selProj && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setRncPanel(false)} />
                    <div className="w-[600px] max-w-full bg-white relative flex flex-col shadow-2xl animate-in slide-in-from-right">
                        <div className="bg-red-900 text-white p-4 flex items-center justify-between"><div className="flex items-center gap-2 font-bold"><ShieldAlert /> RNCs - {selProj.Projeto}</div><button onClick={() => setRncPanel(false)}><X /></button></div>
                        <div className="flex-1 overflow-auto p-4 bg-slate-50">
                            {loadRncs ? <div className="text-center text-slate-400 mt-10">Carregando...</div> : rncs.length === 0 ? <div className="text-center text-slate-400 mt-10">Nenhuma RNC</div> : (
                                <div className="space-y-3">
                                    {rncs.map(r => (
                                        <div key={r.IdRnc} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-slate-800 text-sm">#{r.IdRnc} <span className="text-slate-400 font-normal">| {r.Tag}</span></div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.Estatus || 'Aberta'}</span>
                                            </div>
                                            <div className="text-xs text-slate-600 mb-2">{r.DescricaoPendencia || r.DescResumo}</div>
                                            <div className="flex justify-between text-[10px] text-slate-400 border-t pt-2 mt-2">
                                                <span>Setor: {r.SetorResponsavel}</span><span>Criado: {r.DataCriacao}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
