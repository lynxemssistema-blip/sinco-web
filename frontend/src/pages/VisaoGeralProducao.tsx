import React, { useState, useEffect } from 'react';

import { Search, Filter, X, CalendarDays, CheckCircle, Loader, RotateCcw, ShieldAlert, Tag as TagIcon, LayoutGrid, ArrowRight, Edit3, DollarSign, FileDown, List, ClipboardList } from 'lucide-react';

const API_BASE = '/api';

// ─── Interfaces ───
interface Projeto { IdProjeto: number; Projeto: string; DescProjeto: string; DataPrevisao: string; DataCriacao: string; Finalizado: string; liberado: string; QtdeTags: number; QtdeTagsExecutadas: number; PercentualTags: number; QtdePecasTags: number; QtdePecasExecutadas: number; PercentualPecas: number; qtdetotalpecas: number; TotalRnc: number; qtdernc: number; qtderncPendente: number; qtderncFinalizada: number; ExecCorte: number; TotalCorte: number; ExecDobra: number; TotalDobra: number; ExecSolda: number; TotalSolda: number; ExecPintura: number; TotalPintura: number; ExecMontagem: number; TotalMontagem: number; QtdeOS: number; }
interface Tag { IdTag: number; Tag: string; DescTag: string; DataEntrada: string; DataPrevisao: string; QtdeTag: string; QtdeLiberada: string; SaldoTag: string; ValorTag: string; StatusTag: string; QtdeOS: string; qtdetotal: string; Finalizado: string; qtdernc: number; 
    PlanejadoInicioCorte: string; PlanejadoFinalCorte: string; RealizadoInicioCorte: string; RealizadoFinalCorte: string; CorteTotalExecutado: string; CorteTotalExecutar: string; CortePercentual: string; 
    PlanejadoInicioDobra: string; PlanejadoFinalDobra: string; RealizadoInicioDobra: string; RealizadoFinalDobra: string; DobraTotalExecutado: string; DobraTotalExecutar: string; DobraPercentual: string; 
    PlanejadoInicioSolda: string; PlanejadoFinalSolda: string; RealizadoInicioSolda: string; RealizadoFinalSolda: string; SoldaTotalExecutado: string; SoldaTotalExecutar: string; SoldaPercentual: string; 
    PlanejadoInicioPintura: string; PlanejadoFinalPintura: string; RealizadoInicioPintura: string; RealizadoFinalPintura: string; PinturaTotalExecutado: string; PinturaTotalExecutar: string; PinturaPercentual: string; 
    PlanejadoInicioMontagem: string; PlanejadoFinalMontagem: string; RealizadoInicioMontagem: string; RealizadoFinalMontagem: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; 
    ProjetistaPlanejado?: string; PlanejadoInicioEngenharia?: string; PlanejadoFinalEngenharia?: string;
}
interface Rnc { IdRnc: number; Estatus: string; Tag: string; SetorResponsavel: string; DescricaoPendencia: string; DescResumo: string; UsuarioResponsavel: string; TipoTarefa?: string; DataExecucao?: string; DataCriacao: string; DataFinalizacao: string; UsuarioResponsavelFinalizacao?: string; SetorResponsavelFinalizacao?: string; DescricaoFinalizacao?: string; DescEmpresa?: string; DescTag?: string; }

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

const DateBadge = ({ date, label, onClick, editable = false }: { date: string, label?: string, onClick?: () => void, editable?: boolean }) => {
    if (!date && !editable) return <span className="text-slate-300 text-[10px]">—</span>;
    if (!date && editable) return (
        <div onClick={onClick} className="flex flex-col cursor-pointer group">
            {label && <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 leading-none group-hover:text-blue-500 transition-colors">{label}</span>}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200 border-dashed group-hover:border-blue-400 leading-none">
                <CalendarDays size={10} /> Definir
            </span>
        </div>
    );
    const days = businessDaysUntil(date);
    const color = days === -1 ? 'bg-red-50 text-red-700 border-red-200' : (days !== null && days <= 5) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return (
        <div onClick={editable ? onClick : undefined} className={`flex flex-col ${editable ? 'cursor-pointer group' : ''}`}>
            {label && <span className={`text-[9px] text-slate-400 font-bold uppercase mb-0.5 leading-none ${editable ? 'group-hover:text-blue-500 transition-colors' : ''}`}>{label}</span>}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${editable ? 'group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors' : color} font-bold leading-none whitespace-nowrap`}>
                <CalendarDays size={10} /> {date} {days === -1 ? '· Atrasado' : (days !== null && days >= 0 ? `· ${days}d` : '')}
            </span>
        </div>
    );
};

const SECTORS = [
    { k: 'Corte', ex: 'ExecCorte', t: 'TotalCorte', c: 'bg-blue-600' }, { k: 'Dobra', ex: 'ExecDobra', t: 'TotalDobra', c: 'bg-indigo-600' },
    { k: 'Solda', ex: 'ExecSolda', t: 'TotalSolda', c: 'bg-red-600' }, { k: 'Pintura', ex: 'ExecPintura', t: 'TotalPintura', c: 'bg-amber-500' },
    { k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },
];

const TAG_SECTORS = [
    { k: 'Corte', ex: 'CorteTotalExecutado', t: 'CorteTotalExecutar', p: 'CortePercentual', c: 'bg-blue-500', 
      fields: { pi: 'PlanejadoInicioCorte', pf: 'PlanejadoFinalCorte', ri: 'RealizadoInicioCorte', rf: 'RealizadoFinalCorte' } },
    { k: 'Dobra', ex: 'DobraTotalExecutado', t: 'DobraTotalExecutar', p: 'DobraPercentual', c: 'bg-indigo-500',
      fields: { pi: 'PlanejadoInicioDobra', pf: 'PlanejadoFinalDobra', ri: 'RealizadoInicioDobra', rf: 'RealizadoFinalDobra' } },
    { k: 'Solda', ex: 'SoldaTotalExecutado', t: 'SoldaTotalExecutar', p: 'SoldaPercentual', c: 'bg-red-500',
      fields: { pi: 'PlanejadoInicioSolda', pf: 'PlanejadoFinalSolda', ri: 'RealizadoInicioSolda', rf: 'RealizadoFinalSolda' } },
    { k: 'Pintura', ex: 'PinturaTotalExecutado', t: 'PinturaTotalExecutar', p: 'PinturaPercentual', c: 'bg-amber-500',
      fields: { pi: 'PlanejadoInicioPintura', pf: 'PlanejadoFinalPintura', ri: 'RealizadoInicioPintura', rf: 'RealizadoFinalPintura' } },
    { k: 'Montagem', ex: 'MontagemTotalExecutado', t: 'MontagemTotalExecutar', p: 'MontagemPercentual', c: 'bg-emerald-500',
      fields: { pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem', ri: 'RealizadoInicioMontagem', rf: 'RealizadoFinalMontagem' } },
];

export default function VisaoGeralProducaoPage() {
    const [projetos, setProjetos] = useState<Projeto[]>([]); const [tags, setTags] = useState<Tag[]>([]); const [rncs, setRncs] = useState<Rnc[]>([]);
    const [load, setLoad] = useState(true); const [loadTags, setLoadTags] = useState(false); const [loadRncs, setLoadRncs] = useState(false);
    const [selProj, setSelProj] = useState<Projeto | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [rncPanel, setRncPanel] = useState(false); const [fTag, setFTag] = useState('');
    const [fDataEntradaIni, setFDataEntradaIni] = useState(''); const [fDataEntradaFim, setFDataEntradaFim] = useState('');
    const [fDataPrevIni, setFDataPrevIni] = useState(''); const [fDataPrevFim, setFDataPrevFim] = useState('');
    const [fProjCriacaoIni, setFProjCriacaoIni] = useState(''); const [fProjCriacaoFim, setFProjCriacaoFim] = useState('');
    const [fProjPrevIni, setFProjPrevIni] = useState(''); const [fProjPrevFim, setFProjPrevFim] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [fromGlobal, setFromGlobal] = useState(false);

    // State Persistence
    const [viewMode, setViewMode] = useState<'card' | 'list'>(() => (localStorage.getItem('vgp_viewMode') as 'card' | 'list') || 'card');
    const [fProj, setFProj] = useState(() => localStorage.getItem('vgp_fProj') || '');
    const [statusFilter, setStatusFilter] = useState<'finalizados'|'liberados'|'todos'|null>(
        () => (localStorage.getItem('vgp_statusFilter') as 'finalizados'|'liberados'|'todos'|null) || null
    );

    useEffect(() => {
        localStorage.setItem('vgp_viewMode', viewMode);
        localStorage.setItem('vgp_fProj', fProj);
        localStorage.setItem('vgp_statusFilter', statusFilter || '');
    }, [viewMode, fProj, statusFilter]);

    // Ler Query Params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openFrom = params.get('from');
        
        if (openFrom === 'visao-geral-pendencias') {
            setFromGlobal(true);
        }
    }, []);

    // Se estivermos em fromGlobal e os projetos carregarem, procurar o projeto e carregar as rncs
    useEffect(() => {
        if (!fromGlobal || projetos.length === 0 || selProj) return;
        const params = new URLSearchParams(window.location.search);
        const projId = params.get('projetoId');
        const origem = params.get('origem') || 'VISAOGERALPROJ';
        if (projId) {
            const p = projetos.find(x => x.IdProjeto.toString() === projId);
            if (p) {
                setSelProj(p);
                fetchRncs(p.IdProjeto, origem);
            }
        }
    }, [fromGlobal, projetos, selProj]);



    // Modais e Ações
    const [actionModal, setActionModal] = useState<'dateProj' | 'dateTagGlobal' | 'dateTagSetores' | 'fin' | 'cancelFin' | 'addRnc' | 'addTask' | 'planejarProjetista' | 'alterarQtdeLiberada' | 'finTag' | 'bulkDateTags' | null>(null);
    const [rncForm, setRncForm] = useState<{idRnc?: number, idTag?: number, tag?: string, estatus?: string, descricao: string, setor: string, usuario: string, tipoTarefa: string, dataExec: string, usuarioFin?: string, dataFin?: string, setorFin?: string, descFin?: string, wantsToFinalize?: boolean}>({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
    const [planejarProjetistaForm, setPlanejarProjetistaForm] = useState<{ projetistaPlanejado: string, planejadoInicioEngenharia: string, planejadoFinalEngenharia: string }>({ projetistaPlanejado: '', planejadoInicioEngenharia: '', planejadoFinalEngenharia: '' });
    const [qtdeLiberadaForm, setQtdeLiberadaForm] = useState<{ qtdeLiberada: string }>({ qtdeLiberada: '' });
    const [showFinalizedRncs, setShowFinalizedRncs] = useState(false);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [tipostarefa, setTipostarefa] = useState<any[]>([]);
    const [dateInput, setDateInput] = useState(''); const [updateTagsCheck, setUpdateTagsCheck] = useState(false);
    const [selTag, setSelTag] = useState<Tag | null>(null); 
    const [isSaving, setIsSaving] = useState(false); const [msg, setMsg] = useState<{ ok: boolean, t: string } | null>(null);
    
    // Estado para editar datas de setor da Tag
    const [tagSectorDates, setTagSectorDates] = useState<{ [key: string]: string }>({});

    // Estado para Planejamento em Lote (Muitos Setores)
    const [bulkSectorDates, setBulkSectorDates] = useState<{ [key: string]: string }>({});

    // Configuração de Setores Visíveis
    const [visibleProcesses, setVisibleProcesses] = useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem']);

    // Filtrar setores dinamicamente
    const filteredSectors = SECTORS.filter(s => visibleProcesses.includes(s.k.toLowerCase()));
    const filteredTagSectors = TAG_SECTORS.filter(s => visibleProcesses.includes(s.k.toLowerCase()));

    // Qdo as rncs carregarem e tiver openRnc na url, abrir diretamente
    useEffect(() => {
        if (!fromGlobal || rncs.length === 0 || actionModal) return;
        const params = new URLSearchParams(window.location.search);
        const openRnc = params.get('openRnc');
        const origem = params.get('origem') || 'VISAOGERALPROJ';
        
        if (openRnc) {
            const r = rncs.find(x => x.IdRnc.toString() === openRnc);
            if (r) {
                const rawSetor = (r.SetorResponsavel || '').trim();
                const mappedSetor = SECTORS.find(s => s.k.toLowerCase() === rawSetor.toLowerCase())?.k || (['Medição', 'Medicao'].includes(rawSetor) ? 'Medição' : (['Isométrico', 'Isometrico'].includes(rawSetor) ? 'Isométrico' : rawSetor)) || 'Corte';
                
                const rawTipoTarefa = (r.TipoTarefa || '').trim();
                const mappedTipoTarefa = tipostarefa.find(t => t.TipoTarefa.toLowerCase() === rawTipoTarefa.toLowerCase())?.TipoTarefa || rawTipoTarefa;
                
                const mappedUsuario = usuarios.find(u => u.NomeCompleto.toLowerCase() === (r.UsuarioResponsavel || '').toLowerCase())?.NomeCompleto || r.UsuarioResponsavel || '';

                setRncForm({ 
                    idRnc: r.IdRnc, tag: r.Tag || undefined, estatus: r.Estatus, descricao: r.DescricaoPendencia || '', setor: mappedSetor, 
                    usuario: mappedUsuario, tipoTarefa: mappedTipoTarefa, dataExec: r.DataCriacao ? brToIso(r.DataCriacao.split(' ')[0]) : '',
                    usuarioFin: r.UsuarioResponsavelFinalizacao || '', dataFin: r.DataFinalizacao ? brToIso(r.DataFinalizacao) : '', setorFin: r.SetorResponsavelFinalizacao || 'Corte', descFin: r.DescricaoFinalizacao || '',
                    wantsToFinalize: false 
                });
                
                setActionModal(origem.includes('ACAOPCP') ? 'addTask' : 'addRnc');
            }
        }
    }, [fromGlobal, rncs, actionModal, tipostarefa, usuarios]);

    const [isExporting, setIsExporting] = useState(false);

    // === EXPORT REPORT ===
    const exportarTarefasPCP = async () => {
        if (filteredRncs.length === 0) return;
        setIsExporting(true);
        try {
            const payload = {
                tarefas: filteredRncs.map(r => ({
                    idRnc: r.IdRnc,
                    projeto: selProj?.Projeto || '',
                    cliente: r.DescEmpresa || '',
                    tag: r.Tag || '',
                    descTag: r.DescTag || '',
                    tipoTarefa: r.TipoTarefa || '',
                    descricao: r.DescricaoPendencia || '',
                    dataExecucao: r.DataExecucao || '',
                    usuarioResponsavel: r.UsuarioResponsavel || '',
                    status: r.Estatus || ''
                })),
                usuario: getUser()
            };

            const response = await fetch(`${API_BASE}/tarefas/exportar-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Erro ao gerar relatório');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Relatorio_Agendar_TarefaPCP.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err: any) {
            setMsg({ ok: false, t: err.message || 'Erro ao exportar tarefas.' });
            setTimeout(() => setMsg(null), 5000);
        } finally {
            setIsExporting(false);
        }
    };

    const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.username || u.name || 'Sistema'; } catch { return 'Sistema'; } };

    // Refs para os filtros de data — evita closure stale nos botões
    const dateFiltersRef = React.useRef({ fProjPrevIni, fProjPrevFim, fProjCriacaoIni, fProjCriacaoFim });
    React.useEffect(() => {
        dateFiltersRef.current = { fProjPrevIni, fProjPrevFim, fProjCriacaoIni, fProjCriacaoFim };
    }, [fProjPrevIni, fProjPrevFim, fProjCriacaoIni, fProjCriacaoFim]);

    const fetchProj = async (sf: 'finalizados' | 'liberados' | 'todos' | null = null) => {
        setLoad(true); setError(null);
        try {
            const qs = new URLSearchParams();
            if (sf) qs.set('status', sf);

            const { fProjPrevIni: pi, fProjPrevFim: pf, fProjCriacaoIni: ci, fProjCriacaoFim: cf } = dateFiltersRef.current;
            if (pi) qs.set('previsaoInicio', isoToBr(pi));
            if (pf) qs.set('previsaoFim', isoToBr(pf));
            if (ci) qs.set('criacaoInicio', isoToBr(ci));
            if (cf) qs.set('criacaoFim', isoToBr(cf));

            const res = await (await fetch(`${API_BASE}/acompanhamento/projetos${qs.toString() ? '?' + qs : ''}`)).json();
            if (res.success) setProjetos(res.data);
            else setError(res.message || 'Erro ao carregar projetos do servidor');
        } catch (e: any) { console.error(e); setError(e.message || 'Erro de rede'); }
        finally { setLoad(false); }
    };


    const fetchTags = async (id: number) => { setLoadTags(true); try { const r = await (await fetch(`${API_BASE}/acompanhamento/projeto/${id}/tags`)).json(); if (r.success) setTags(r.data); } catch (e) { } finally { setLoadTags(false); } };
    const fetchRncs = async (id: number, origem = 'VISAOGERALPROJ') => { setLoadRncs(true); try { const r = await (await fetch(`${API_BASE}/visao-geral/pendencias/${id}?origem=${origem}`)).json(); if (r.success) setRncs(r.data); } catch (e) { } finally { setLoadRncs(false); } };

    // Busca inicial ao montar a página (usa o statusFilter salvo no localStorage)
    useEffect(() => { fetchProj(statusFilter); }, []); // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const resUsr = await (await fetch(`${API_BASE}/config/usuarios`)).json();
                if (resUsr.success) setUsuarios(resUsr.usuarios);
                const resTipos = await (await fetch(`${API_BASE}/config/tipostarefa`)).json();
                if (resTipos.success) setTipostarefa(resTipos.tipostarefa);
                
                // Carregar processos visíveis
                const resCfg = await (await fetch(`${API_BASE}/config`)).json();
                if (resCfg.success && resCfg.config?.ProcessosVisiveis) {
                    try {
                        const processes = JSON.parse(resCfg.config.ProcessosVisiveis);
                        if (Array.isArray(processes)) setVisibleProcesses(processes);
                    } catch (e) { console.error('Erro ao processar ProcessosVisiveis:', e); }
                }
            } catch (e) { console.error(e); }
        };
        fetchConfig();
    }, []);

    const openDetailsModal = (p: Projeto) => {
        setSelProj(p);
        fetchTags(p.IdProjeto);
        setShowDetailsModal(true);
    };

    // Funções de salvamento
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

    const salvarDataTagPrevisao = async () => {
        if (!selTag) return; setIsSaving(true); setMsg(null);
        try {
            const dataBr = isoToBr(dateInput);
            const r = await (await fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/data-previsao`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataPrevisao: dataBr }) })).json();
            if (r.success) {
                setTags(ts => ts.map(x => x.IdTag === selTag.IdTag ? { ...x, DataPrevisao: dataBr } : x));
                setMsg({ ok: true, t: 'Data atualizada!' }); setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarDatasTagSetores = async () => {
        if (!selTag) return; setIsSaving(true); setMsg(null);
        try {
            // we will fire a promise.all for all changed fields via the existing endpoint
            const promises = [];
            for (const [field, isoVal] of Object.entries(tagSectorDates)) {
                const dataBr = isoToBr(isoVal);
                promises.push(
                    fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/setor-data`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ field, value: dataBr })
                    }).then(r => r.json())
                );
            }
            if (promises.length === 0) {
                setMsg({ ok: true, t: 'Nenhuma alteração feita.' });
                setTimeout(() => setActionModal(null), 1000);
                return;
            }
            await Promise.all(promises);
            // Re-fetch tags
            if (selProj) fetchTags(selProj.IdProjeto);
            setMsg({ ok: true, t: 'Datas atualizadas!' }); setTimeout(() => setActionModal(null), 1500);
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarDatasBulkTags = async () => {
        if (!selProj) return;
        setIsSaving(true); setMsg(null);
        try {
            // Collect updates from bulkSectorDates
            const updates: any[] = [];
            
            // Loop through TAG_SECTORS to check for filled fields
            TAG_SECTORS.forEach(s => {
                const piVal = bulkSectorDates[s.fields.pi];
                const pfVal = bulkSectorDates[s.fields.pf];
                
                if (piVal || pfVal) {
                    updates.push({
                        sectorKey: s.k,
                        dataInicio: isoToBr(piVal || ''),
                        dataFim: isoToBr(pfVal || '')
                    });
                }
            });

            if (updates.length === 0) {
                setMsg({ ok: false, t: 'Preencha ao menos uma data de planejamento.' });
                return;
            }

            const resp = await fetch(`${API_BASE}/visao-geral/projeto/${selProj.IdProjeto}/bulk-update-planning`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.message);
            
            setMsg({ ok: true, t: data.message });
            fetchTags(selProj.IdProjeto);
            setTimeout(() => setActionModal(null), 2000);
        } catch (error: any) {
            setMsg({ ok: false, t: error.message || 'Erro ao processar lote.' });
        } finally { setIsSaving(false); }
    };

    const salvarPlanejamentoProjetista = async () => {
        if (!selTag) return;
        if (!planejarProjetistaForm.projetistaPlanejado || !planejarProjetistaForm.planejadoInicioEngenharia || !planejarProjetistaForm.planejadoFinalEngenharia) {
            setMsg({ ok: false, t: 'Preencha todos os campos obrigatórios.' });
            return;
        }
        setIsSaving(true); setMsg(null);
        try {
            const payload = {
                projetistaPlanejado: planejarProjetistaForm.projetistaPlanejado,
                planejadoInicioEngenharia: isoToBr(planejarProjetistaForm.planejadoInicioEngenharia),
                planejadoFinalEngenharia: isoToBr(planejarProjetistaForm.planejadoFinalEngenharia),
                usuario: getUser()
            };
            const r = await (await fetch(`${API_BASE}/acompanhamento/tags/${selTag.IdTag}/planejar-projetista`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                setTags(ts => ts.map(x => x.IdTag === selTag.IdTag ? { ...x, ProjetistaPlanejado: payload.projetistaPlanejado, PlanejadoInicioEngenharia: payload.planejadoInicioEngenharia, PlanejadoFinalEngenharia: payload.planejadoFinalEngenharia } : x));
                setMsg({ ok: true, t: 'Projetista avaliado/salvo!' }); setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarQtdeLiberada = async () => {
        if (!selTag) return;
        const liberadaNum = parseFloat(qtdeLiberadaForm.qtdeLiberada);
        if (isNaN(liberadaNum)) {
            setMsg({ ok: false, t: 'Informe um valor numérico válido.' });
            return;
        }
        setIsSaving(true); setMsg(null);
        try {
            const r = await (await fetch(`${API_BASE}/acompanhamento/tags/${selTag.IdTag}/qtde`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qtdeLiberada: liberadaNum, usuario: getUser() })
            })).json();
            
            if (r.success) {
                setTags(ts => ts.map(x => x.IdTag === selTag.IdTag ? { ...x, QtdeLiberada: String(r.data.qtdeLiberada), SaldoTag: String(r.data.saldoTag) } : x));
                setMsg({ ok: true, t: 'Quantidade liberada atualizada com sucesso!' });
                setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarFinalizarTag = async (finalizarTodas: boolean) => {
        if (!selTag || !selProj) return;
        setIsSaving(true); setMsg(null);
        try {
            const r = await (await fetch(`${API_BASE}/acompanhamento/tags/finalizar`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idProjeto: selProj.IdProjeto, idTag: selTag.IdTag, finalizarTodas, usuario: getUser() })
            })).json();
            
            if (r.success) {
                if (finalizarTodas) {
                    setTags(ts => ts.map(x => (x.Finalizado !== 'C' ? { ...x, Finalizado: 'C' } : x)));
                    setMsg({ ok: true, t: 'Todas as tags foram finalizadas!' });
                } else {
                    setTags(ts => ts.map(x => x.IdTag === selTag.IdTag ? { ...x, Finalizado: 'C' } : x));
                    setMsg({ ok: true, t: 'Tag finalizada com sucesso!' });
                }
                setTimeout(() => setActionModal(null), 1500);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarNovaRnc = async () => {
        if (!selProj || !rncForm.descricao.trim()) return;
        setIsSaving(true); setMsg(null);
        try {
            const sysTime = new Date().toLocaleTimeString('pt-BR');
            const dataBr = rncForm.dataExec ? `${isoToBr(rncForm.dataExec.split('T')[0])} ${sysTime}` : '';
            const payload = {
                idRnc: rncForm.idRnc, idProjeto: selProj.IdProjeto, projeto: selProj.Projeto,
                idTag: rncForm.idTag, tag: rncForm.tag,
                descricao: rncForm.descricao, setor: rncForm.setor, usuario: rncForm.usuario,
                tipoTarefa: rncForm.tipoTarefa, dataExec: dataBr
            };
            const r = await (await fetch(`${API_BASE}/visao-geral/pendencias`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                if (!rncForm.idRnc) {
                    setProjetos(ps => ps.map(x => x.IdProjeto === selProj.IdProjeto ? { ...x, qtdernc: (x.qtdernc||0) + 1, qtderncPendente: (x.qtderncPendente||0) + 1 } : x));
                }
                setMsg({ ok: true, t: rncForm.idRnc ? 'Pendência atualizada!' : 'Pendência criada com sucesso!' });
                fetchRncs(selProj.IdProjeto, rncForm.idTag ? 'VISAOGERALTAG' : 'VISAOGERALPROJ');
                setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
                setTimeout(() => setMsg(null), 3000);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const salvarNovaTarefa = async () => {
        if (!selProj || !rncForm.descricao.trim()) return;
        setIsSaving(true); setMsg(null);
        try {
            const sysTime = new Date().toLocaleTimeString('pt-BR');
            const dataBr = rncForm.dataExec ? `${isoToBr(rncForm.dataExec.split('T')[0])} ${sysTime}` : '';
            const payload = {
                idRnc: rncForm.idRnc, idProjeto: selProj.IdProjeto, projeto: selProj.Projeto,
                idTag: rncForm.idTag, tag: rncForm.tag,
                descricao: rncForm.descricao, setor: rncForm.setor, usuario: rncForm.usuario,
                tipoTarefa: rncForm.tipoTarefa, dataExec: dataBr,
                tipoRegistro: 'TAREFA', estatus: 'TarefaAberta', origemPendencia: 'ACAOPCP'
            };
            const r = await (await fetch(`${API_BASE}/visao-geral/pendencias`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                setMsg({ ok: true, t: rncForm.idRnc ? 'Tarefa atualizada!' : 'Tarefa criada com sucesso!' });
                fetchRncs(selProj.IdProjeto, 'ACAOPCP');
                setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
                setTimeout(() => setMsg(null), 3000);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };


    const finalizarRnc = async () => {
        if (!selProj || !rncForm.idRnc) return;
        
        if (!rncForm.usuarioFin || !rncForm.dataFin || !rncForm.setorFin || !rncForm.descFin) {
            setMsg({ ok: false, t: 'Todos os campos de finalização são obrigatórios!' });
            return;
        }

        setIsSaving(true); setMsg(null);
        try {
            const dataBrFin = rncForm.dataFin ? isoToBr(rncForm.dataFin) : '';
            const payload = {
                usuarioFin: rncForm.usuarioFin, dataFin: dataBrFin, setorFin: rncForm.setorFin, descFin: rncForm.descFin, idProjeto: selProj.IdProjeto
            };
            const r = await (await fetch(`${API_BASE}/visao-geral/pendencias/${rncForm.idRnc}/finalizar`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                if (actionModal === 'addRnc') {
                    setProjetos(ps => ps.map(x => x.IdProjeto === selProj.IdProjeto ? { 
                        ...x, 
                        qtderncPendente: Math.max((x.qtderncPendente||0) - 1, 0), 
                        qtderncFinalizada: (x.qtderncFinalizada||0) + 1 
                    } : x));
                }
                setMsg({ ok: true, t: actionModal === 'addTask' ? 'Tarefa finalizada com sucesso!' : 'Pendência finalizada com sucesso!' });
                const fetchSource = actionModal === 'addTask' ? 'ACAOPCP' : (rncForm.idTag ? 'VISAOGERALTAG' : 'VISAOGERALPROJ');
                fetchRncs(selProj.IdProjeto, fetchSource);
                setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
                setTimeout(() => setMsg(null), 3000);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const filteredProj = projetos.filter(p => !fProj || String(p.IdProjeto).includes(fProj) || p.Projeto?.toLowerCase().includes(fProj.toLowerCase()) || p.DescProjeto?.toLowerCase().includes(fProj.toLowerCase()));
    const filteredTags = tags.filter(t => {
        if (fTag && !t.Tag?.toLowerCase().includes(fTag.toLowerCase()) && !t.DescTag?.toLowerCase().includes(fTag.toLowerCase())) return false;
        const tEntrada = t.DataEntrada ? brToIso(t.DataEntrada) : '';
        const tPrev = t.DataPrevisao ? brToIso(t.DataPrevisao) : '';
        if (fDataEntradaIni && tEntrada && tEntrada < fDataEntradaIni) return false;
        if (fDataEntradaFim && tEntrada && tEntrada > fDataEntradaFim) return false;
        if (fDataPrevIni && tPrev && tPrev < fDataPrevIni) return false;
        if (fDataPrevFim && tPrev && tPrev > fDataPrevFim) return false;
        return true;
    });
    const filteredRncs = rncs.filter(r => showFinalizedRncs || r.Estatus !== 'FINALIZADO');

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#f4f7f9] overflow-hidden font-sans">
            {!fromGlobal ? (
                <>
                    {/* Top Bar */}
                    {/* Top Bar */}
                    <div className="bg-white border-b px-6 py-3 flex flex-col gap-3 shrink-0 shadow-sm z-10 w-full">
                        {/* Linha 1: Pesquisa Texto e Checkboxes */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                            <div className="flex items-center gap-2 flex-1 w-full md:w-auto bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
                                <Search className="text-slate-400" size={14} />
                                <input type="text" placeholder="Buscar projeto..." value={fProj} onChange={e => setFProj(e.target.value)} className="bg-transparent border-none outline-none flex-1 font-medium text-xs text-slate-700" />
                            </div>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
                                {/* === FILTRO RADIO: 3 opções mutuamente exclusivas === */}
                                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-inner">
                                    {/* 1 - Finalizados */}
                                    <button
                                        onClick={() => {
                                            const next = statusFilter === 'finalizados' ? null : 'finalizados';
                                            setStatusFilter(next);
                                            fetchProj(next);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                                            statusFilter === 'finalizados'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        <CheckCircle size={11} /> Finalizados
                                    </button>
                                    {/* 2 - Liberados */}
                                    <button
                                        onClick={() => {
                                            const next = statusFilter === 'liberados' ? null : 'liberados';
                                            setStatusFilter(next);
                                            fetchProj(next);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                                            statusFilter === 'liberados'
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-blue-700 hover:bg-blue-50'
                                        }`}
                                    >
                                        <Filter size={11} /> Liberados
                                    </button>
                                    {/* 3 - Todos */}
                                    <button
                                        onClick={() => {
                                            const next = statusFilter === 'todos' ? null : 'todos';
                                            setStatusFilter(next);
                                            fetchProj(next);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${
                                            statusFilter === 'todos'
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <List size={11} /> Todos
                                    </button>
                                </div>

                                {/* Limpar */}
                                <button onClick={() => {
                                    setStatusFilter(null);
                                    setFProj('');
                                    setFProjCriacaoIni(''); setFProjCriacaoFim('');
                                    setFProjPrevIni(''); setFProjPrevFim('');
                                    fetchProj(null);
                                }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[10px] transition border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
                                    <X size={11} /> Limpar
                                </button>

                                {/* View Mode */}
                                <div className="hidden md:flex bg-slate-100 p-0.5 rounded-lg items-center shadow-inner">
                                    <button onClick={() => setViewMode('card')} className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={12} /> Cards</button>
                                    <button onClick={() => setViewMode('list')} className={`px-2.5 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List size={12} /> Lista</button>
                                </div>
                                <button onClick={() => fetchProj(statusFilter)} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 transition shadow-sm"><Search size={12} /> Pesquisar</button>
                            </div>
                        </div>

                        {/* Linha 2: Filtros de Data do Projeto */}
                        <div className="flex flex-col lg:flex-row items-center gap-4 w-full p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                            {/* Data Criação */}
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap"><CalendarDays size={12} className="inline mr-1"/> Dt. Criação:</span>
                                <div className="flex items-center gap-1 flex-1 lg:flex-none">
                                    <input type="date" value={fProjCriacaoIni} onChange={e => setFProjCriacaoIni(e.target.value)} className="text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-full md:w-28" />
                                    <span className="text-slate-400 text-[10px]">até</span>
                                    <input type="date" value={fProjCriacaoFim} onChange={e => setFProjCriacaoFim(e.target.value)} className="text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-full md:w-28" />
                                </div>
                            </div>
                            
                            <div className="hidden lg:block w-px h-4 bg-slate-200"></div>

                            {/* Data Previsão */}
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap"><CalendarDays size={12} className="inline mr-1"/> Dt. Previsão:</span>
                                <div className="flex items-center gap-1 flex-1 lg:flex-none">
                                    <input type="date" value={fProjPrevIni} onChange={e => setFProjPrevIni(e.target.value)} className="text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-full md:w-28" />
                                    <span className="text-slate-400 text-[10px]">até</span>
                                    <input type="date" value={fProjPrevFim} onChange={e => setFProjPrevFim(e.target.value)} className="text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-full md:w-28" />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Grid Area */}
                    <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 scrollbar-thumb-slate-300 scrollbar-track-transparent">
                        {error && <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-lg mb-6 shadow-sm"><strong className="font-bold">Erro: </strong>{error}</div>}
                        
                        {load ? (
                            <div className="flex justify-center mt-20 text-slate-500 flex-col items-center gap-3">
                                <Loader className="animate-spin" size={32} />
                                <span className="font-bold tracking-wide">Buscando Projetos...</span>
                            </div>
                        ) : filteredProj.length === 0 ? (
                            <div className="text-center mt-20 text-slate-400 font-medium">Nenhum projeto encontrado.</div>
                        ) : viewMode === 'list' ? (
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-auto min-w-full">
                                <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[800px]">
                                    <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 border-r border-slate-100">Projeto</th>
                                            <th className="px-3 py-3 border-r border-slate-100 text-center">Progresso (Peças)</th>
                                            <th className="px-3 py-3 border-r border-slate-100 text-center">TAGS / Qtde</th>
                                            <th className="px-3 py-3 border-r border-slate-100 text-center">OS / Itens</th>
                                            <th className="px-3 py-3 border-r border-slate-100 text-center">RNCs</th>
                                            <th className="px-4 py-3 border-r border-slate-100 w-32">Datas</th>
                                            <th className="px-3 py-3 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredProj.map((p, idx) => {
                                            const isFin = p.Finalizado?.trim() === 'C'; 
                                            const isLib = p.liberado?.trim() === 'S';
                                            return (
                                                <tr key={p.IdProjeto} className={`group hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}>
                                                    <td className="px-4 py-3 align-top max-w-[280px] border-r border-slate-100 whitespace-normal">
                                                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">#{p.IdProjeto}</span>
                                                            <div className="font-black text-slate-800 text-[13px] leading-tight" title={p.Projeto}>{p.Projeto}</div>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed" title={p.DescProjeto}>{p.DescProjeto}</div>
                                                        <div className="flex items-center gap-2 flex-wrap mt-2">
                                                            {isFin && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-200">Finalizado</span>}
                                                            {isLib && !isFin && <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase leading-none border border-blue-200">Liberado</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
                                                        <div className="flex flex-col items-center justify-center w-32 mx-auto">
                                                            <div className="flex justify-between items-center w-full mb-1">
                                                                <span className="text-xs font-black text-slate-800">{p.QtdePecasExecutadas}<span className="text-[10px] text-slate-400 font-medium">/{p.qtdetotalpecas > 0 ? p.qtdetotalpecas : p.QtdePecasTags}</span></span>
                                                                <span className="text-[10px] font-bold text-emerald-600">{p.PercentualPecas}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${p.PercentualPecas}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
                                                         <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                                             <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><TagIcon size={10}/> Tags</div>
                                                             <div className="text-sm font-black text-slate-800">{p.QtdeTags || 0}</div>
                                                             <div className="flex gap-1 mt-0.5 font-bold text-[8px] uppercase flex-col w-full">
                                                                 <span className="text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded w-full text-center">Mult: {Number(p.SumQtdeTag || 0).toFixed(0)}</span>
                                                                 <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded w-full text-center">Lib: {Number(p.SumQtdeLiberada || 0).toFixed(0)}</span>
                                                                 <span className="text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded w-full text-center">Saldo: {Number(p.SumSaldoTag || 0).toFixed(0)}</span>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
                                                         <div className="flex flex-col items-center justify-center text-center gap-0.5">
                                                             <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><ClipboardList size={10}/> OS</div>
                                                             <div className="text-sm font-black text-slate-800">{p.QtdeOS || 0}</div>
                                                             <span className="text-[8px] font-medium text-slate-400 uppercase">Total OS</span>
                                                         </div>
                                                     </td>
                                                    <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
                                                        <div onClick={(e) => { e.stopPropagation(); setSelProj(p); fetchRncs(p.IdProjeto); setRncPanel(true); }} className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg group/rnc transition-colors mx-auto w-24 border border-transparent hover:border-slate-200">
                                                            <div className="text-sm font-black text-slate-800 group-hover/rnc:text-red-600 transition-colors flex items-center gap-1"><ShieldAlert size={12}/> {p.qtdernc} Tot</div>
                                                            <div className="flex flex-col gap-1 mt-1 font-bold text-[8px] uppercase w-full">
                                                                <span className="text-red-500 bg-red-50 border border-red-100 px-1 py-0.5 rounded w-full text-center">{p.qtderncPendente} Pend</span>
                                                                <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded w-full text-center">{p.qtderncFinalizada} Fin</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle border-r border-slate-100 w-40">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-slate-400"/> Criação</span>
                                                                <span className="text-xs font-bold text-slate-700">{p.DataCriacao || '—'}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 group/edit">
                                                                <div className="flex justify-between items-center w-full">
                                                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-blue-500"/> Prev.</span>
                                                                    <button onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-blue-600 hover:text-blue-800 font-bold uppercase underline decoration-blue-300 flex items-center gap-0.5" title="Editar Data"><Edit3 size={10}/> Edit</button>
                                                                </div>
                                                                <span className={`text-[11px] font-bold ${businessDaysUntil(p.DataPrevisao) === -1 ? 'text-red-600' : 'text-slate-800'}`}>
                                                                    {p.DataPrevisao || 'Não definida'} {businessDaysUntil(p.DataPrevisao) === -1 && '(Atrasado)'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 align-middle text-center min-w-[140px]">
                                                        <div className="flex flex-col gap-1.5 justify-center">
                                                            <button onClick={() => openDetailsModal(p)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition-colors border border-blue-100 shadow-sm text-[10px] font-black uppercase flex items-center justify-center gap-1.5 w-full">
                                                                <LayoutGrid size={12} /> Exibir Detalhes Tag
                                                            </button>
                                                            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold uppercase">
                                                                <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'VISAOGERALPROJ'); setActionModal('addRnc'); }} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-1 py-1.5 rounded-lg transition-colors border border-red-100 shadow-sm flex items-center justify-center gap-1" title="Gerar Pendência">
                                                                    <ShieldAlert size={12} /> RNC
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'ACAOPCP'); setActionModal('addTask'); }} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-1 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm flex items-center justify-center gap-1" title="Agendar Tarefa">
                                                                    <CalendarDays size={12} /> Tarf
                                                                </button>
                                                            </div>
                                                            {!isFin ? (
                                                                <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[9px] text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 font-bold uppercase flex items-center justify-center gap-1 transition-colors rounded-lg border border-transparent hover:border-emerald-200 mt-0.5"><CheckCircle size={10}/> Finalizar Proj.</button>
                                                            ) : (
                                                                <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setMsg(null); setActionModal('cancelFin'); }} className="text-[9px] text-orange-600 hover:bg-orange-50 px-2 py-1.5 font-bold uppercase flex items-center justify-center gap-1 transition-colors rounded-lg border border-transparent hover:border-orange-200 mt-0.5"><RotateCcw size={10}/> Cancelar Fin.</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                                {filteredProj.map(p => {
                                    const isFin = p.Finalizado?.trim() === 'C'; 
                                    const isLib = p.liberado?.trim() === 'S';

                                    return (
                                        <div key={p.IdProjeto} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
                                            
                                            {/* Header do Card */}
                                            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openDetailsModal(p)}>
                                                <div className="flex-1 mr-4">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">#{p.IdProjeto}</span>
                                                        {isFin && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-200">Finalizado</span>}
                                                        {isLib && !isFin && <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase leading-none border border-blue-200">Liberado</span>}
                                                    </div>
                                                    <h3 className="font-black text-slate-800 text-lg leading-tight mb-1 group-hover:text-blue-700 transition-colors" title={p.Projeto}>{p.Projeto}</h3>
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={p.DescProjeto}>{p.DescProjeto}</p>
                                                </div>
                                                <button className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors border border-blue-100 shadow-sm shrink-0" title="Ver Tags Detalhadas">
                                                    <ArrowRight size={18} />
                                                </button>
                                            </div>

                                            {/* Body do Card (KPIs e Progresso) */}
                                            <div className="p-5 flex-1 flex flex-col gap-5">
                                                
                                                {/* Quadro de KPIs */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Tags + Qtde */}
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-center text-center hover:border-blue-200 transition-colors">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center"><TagIcon size={10}/> Tags</span>
                                                        <div className="text-sm font-black text-slate-800">{p.QtdeTags}</div>
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            <span className="text-[8px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded">Mult: {Number(p.SumQtdeTag || 0).toFixed(0)}</span>
                                                            <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">Lib: {Number(p.SumQtdeLiberada || 0).toFixed(0)}</span>
                                                            <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1 py-0.5 rounded">Saldo: {Number(p.SumSaldoTag || 0).toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                    {/* OS total (fonte: campo QtdeOS da tag) */}
                                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-center text-center hover:border-indigo-200 transition-colors">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center"><ClipboardList size={10}/> OS</span>
                                                        <div className="text-sm font-black text-slate-800">{p.QtdeOS || 0}</div>
                                                        <span className="text-[8px] text-slate-400 font-medium mt-0.5">Total OS</span>
                                                    </div>
                                                    {/* RNCs - full width */}
                                                    <div onClick={(e) => { e.stopPropagation(); setSelProj(p); fetchRncs(p.IdProjeto); setRncPanel(true); }} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-center items-center text-center hover:border-red-200 transition-colors cursor-pointer group/rnc col-span-2">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldAlert size={10}/> RNCs</span>
                                                        <div className="text-base font-black text-slate-800 group-hover/rnc:text-red-600 transition-colors">{p.qtdernc} Total</div>
                                                        <div className="flex gap-1 mt-1 font-bold text-[8px] uppercase">
                                                            <span className="text-red-500 bg-red-50 border border-red-100 px-1 rounded">{p.qtderncPendente} Pend</span>
                                                            <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-1 rounded">{p.qtderncFinalizada} Fin</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 mt-[-12px]">
                                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl py-2 px-3 flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1"><ClipboardList size={10} className="text-blue-500"/> Ordens de Serviço:</span>
                                                        <span className="text-xs font-black text-blue-700">{p.QtdeOS || 0}</span>
                                                    </div>
                                                </div>

                                                {/* Barras de Setor */}
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-2 w-full pt-1" style={{ gridTemplateColumns: `repeat(${Math.min(filteredSectors.length, 5)}, minmax(0, 1fr))` }}>
                                                    {filteredSectors.map((s) => {
                                                        const e = toNum(p[s.ex as keyof Projeto]), t = toNum(p[s.t as keyof Projeto]);
                                                        const pct = safePct(e, t);
                                                        return (
                                                            <div key={s.k} className="flex flex-col gap-1 w-full">
                                                                <div className="flex justify-between items-end border-b border-slate-100 pb-0.5 whitespace-nowrap">
                                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{s.k}</span>
                                                                    <span className={`text-[10px] font-black ${pct >= 100 && t > 0 ? "text-emerald-600" : "text-slate-700"}`}>{pct}%</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 w-full">
                                                                    <div className="h-1 bg-slate-200 rounded-full w-full overflow-hidden shrink"><div className={`h-full ${s.c} transition-all duration-500`} style={{ width: `${pct}%` }} /></div>
                                                                    <div className="text-[8px] text-slate-400 font-bold shrink-0 w-8 text-right">({e}/{t})</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Footer do Card com Datas (Editaveis via botao) */}
                                            <div className="bg-slate-50/80 border-t border-slate-100 px-5 py-3 flex gap-4 justify-between items-center sm:flex-row flex-col sm:items-center">
                                                <div className="flex gap-6 w-full sm:w-auto">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-slate-400"/> Criação</span>
                                                        <span className="text-xs font-bold text-slate-700">{p.DataCriacao || '—'}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 w-full sm:w-auto border-l border-slate-200 pl-6">
                                                        <div className="flex justify-between w-full">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-blue-500"/> Entrega Prev.</span>
                                                            <button onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-blue-600 hover:text-blue-800 font-bold uppercase underline decoration-blue-300 ml-4 flex items-center gap-0.5"><Edit3 size={10}/> Editar</button>
                                                        </div>
                                                        <span className={`text-xs font-bold ${businessDaysUntil(p.DataPrevisao) === -1 ? 'text-red-600' : 'text-slate-800'}`}>
                                                            {p.DataPrevisao || 'Não definida'} {businessDaysUntil(p.DataPrevisao) === -1 && '(Atrasado)'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 w-full sm:w-auto border-l border-slate-200 pl-6 shrink-0 items-start">
                                                    <div className="flex gap-4 w-full">
                                                        {!isFin ? (
                                                            <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold uppercase underline decoration-emerald-300 flex items-center gap-1 transition-colors"><CheckCircle size={12}/> Finalizar Projeto</button>
                                                        ) : (
                                                            <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setMsg(null); setActionModal('cancelFin'); }} className="text-[10px] text-orange-600 hover:text-orange-800 font-bold uppercase underline decoration-orange-300 flex items-center gap-1 transition-colors"><RotateCcw size={12}/> Cancelar Finalização</button>
                                                        )}
                                                        <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'VISAOGERALPROJ'); setActionModal('addRnc'); }} className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase underline decoration-red-300 flex items-center gap-1 transition-colors"><ShieldAlert size={12}/> Gerar Pendência</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'ACAOPCP'); setActionModal('addTask'); }} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase underline decoration-blue-300 flex items-center gap-1 transition-colors ml-2"><CalendarDays size={12}/> Agendar Tarefa</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 h-full gap-5 mx-6 bg-white shadow-sm border border-slate-200 rounded-3xl mt-6">
                    <div className="bg-blue-50 text-blue-600 w-20 h-20 rounded-full flex items-center justify-center border border-blue-100 shadow-sm animate-pulse">
                        <ShieldAlert size={36} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Log de Pendência (Visão Geral Produção)</h2>
                        <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
                            A janela de histórico e edição da pendência está aberta automaticamente. Quando finalizar sua consulta, feche o modal da pendência e clique no botão abaixo para retornar.
                        </p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/visao-geral-pendencias'}
                        className="mt-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 text-sm px-6 py-3 rounded-xl transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                    >
                        &larr; Voltar para Todas as Pendências
                    </button>
                </div>
            )}

            {/* ══ MODAL DE COMPLETO DE TAGS DA SEGUNDA TELA ══ */}
            {showDetailsModal && selProj && (
                <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center sm:p-4">
                    <div className="bg-white w-full max-w-[100vw] sm:max-w-[95vw] h-full sm:h-[95vh] sm:rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                        
                        {/* Header Modal */}
                        <div className="bg-[#f0f4f8] border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 shrink-0 flex flex-wrap items-center gap-3 justify-between">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="bg-blue-600 text-white w-10 h-10 rounded-xl items-center justify-center font-bold text-sm shadow-sm hidden md:flex">
                                    <TagIcon size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded leading-none">#{selProj.IdProjeto}</span>
                                        <h2 className="text-lg font-black text-slate-800 leading-tight">Lista de Tags: {selProj.Projeto}</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate max-w-xl">{selProj.DescProjeto}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Entrada:</span>
                                    <input type="date" value={fDataEntradaIni} onChange={e => setFDataEntradaIni(e.target.value)} className="bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
                                    <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
                                    <input type="date" value={fDataEntradaFim} onChange={e => setFDataEntradaFim(e.target.value)} className="bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev:</span>
                                    <input type="date" value={fDataPrevIni} onChange={e => setFDataPrevIni(e.target.value)} className="bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
                                    <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
                                    <input type="date" value={fDataPrevFim} onChange={e => setFDataPrevFim(e.target.value)} className="bg-white border border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
                                </div>
                                <div className="bg-white rounded-lg border border-slate-200 flex items-center px-2 py-1.5 shadow-sm w-40">
                                    <Search size={14} className="text-slate-400 mr-2 shrink-0" />
                                    <input type="text" placeholder="Buscar Tag..." value={fTag} onChange={e => setFTag(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 w-full font-medium" />
                                </div>
                                {(fTag || fDataEntradaIni || fDataEntradaFim || fDataPrevIni || fDataPrevFim) && (
                                    <button onClick={() => { setFTag(''); setFDataEntradaIni(''); setFDataEntradaFim(''); setFDataPrevIni(''); setFDataPrevFim(''); }} className="bg-slate-100 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0" title="Limpar filtros">
                                        <X size={14} /> <span>Limpar</span>
                                    </button>
                                )}
                                <div className="h-6 w-px bg-slate-300 hidden sm:block shrink-0"></div>
                                <button 
                                    onClick={() => { setBulkSectorDates({}); setMsg(null); setActionModal('bulkDateTags'); }} 
                                    className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0"
                                    title="Planejar datas para TODAS as tags deste projeto"
                                >
                                    <CalendarDays size={16} /> <span>Plan. em Lote</span>
                                </button>
                                <button onClick={() => setShowDetailsModal(false)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0">
                                    <X size={16} /> Fechar
                                </button>
                            </div>
                        </div>


                        {/* Listagem de Tags Expandida (Tabela Gigante) */}
                        <div className="flex-1 overflow-auto bg-white p-0 relative w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
                            {loadTags ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3"><Loader className="animate-spin" size={28} /> <span className="text-sm font-bold">Carregando dados das tags...</span></div>
                            ) : tags.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhuma tag localizada.</div>
                            ) : (
                                <div className="min-w-max pb-32">
                                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                    <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-slate-200">
                                        <tr>
                                            {/* Columns Fixed visually by background */}
                                            <th className="px-4 py-3 border-r border-slate-200 bg-[#f8fafc] sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]">Tag / Descrição</th>
                                            <th className="px-3 py-3 border-r border-slate-200 text-center bg-slate-50/50">Cronograma</th>
                                            <th className="px-3 py-3 border-r border-slate-200 text-center bg-slate-50/50">Detalhes</th>
                                            {filteredTagSectors.map(s => <th key={s.k} className="px-3 py-3 border-r border-slate-200 text-center min-w-[280px]">Setor: {s.k}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTags.map((t, idx) => {
                                            const tFin = t.Finalizado?.trim() !== '';
                                            return (
                                                <tr key={t.IdTag} className={`group hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}>
                                                    {/* TAG INFO */}
                                                    <td className="px-4 py-3 align-top min-w-[220px] max-w-[280px] border-r border-slate-100 bg-inherit sticky left-0 z-10 shadow-[1px_0_0_#f1f5f9] group-hover:shadow-[1px_0_0_#dbeafe]">
                                                        <div className="flex items-center gap-1.5 mb-1"><div className={`w-2 h-2 rounded-full shadow-sm ${tFin ? 'bg-emerald-500' : 'bg-amber-400'}`} /> <span className="font-black text-slate-800 text-[13px] break-all whitespace-normal leading-tight">{t.Tag}</span></div>
                                                        <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed whitespace-normal pr-2" title={t.DescTag}>{t.DescTag}</div>
                                                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                                                            <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-bold">Cod: {t.IdTag}</span>
                                                            {t.StatusTag && <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{t.StatusTag}</span>}
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); if (selProj) fetchRncs(selProj.IdProjeto, 'VISAOGERALTAG'); setRncForm({ idTag: t.IdTag, tag: t.Tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false }); setActionModal('addRnc'); }}
                                                                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                                title="Gerar Pendência para esta Tag"
                                                            >
                                                                <ShieldAlert size={10} /> Pendência
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); if (selProj) fetchRncs(selProj.IdProjeto, 'ACAOPCP'); setRncForm({ idTag: t.IdTag, tag: t.Tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false }); setActionModal('addTask'); }}
                                                                className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                                title="Agendar Tarefa"
                                                            >
                                                                <CalendarDays size={10} /> Tarefa
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelTag(t); setPlanejarProjetistaForm({ projetistaPlanejado: t.ProjetistaPlanejado || '', planejadoInicioEngenharia: brToIso(t.PlanejadoInicioEngenharia || ''), planejadoFinalEngenharia: brToIso(t.PlanejadoFinalEngenharia || '') }); setMsg(null); setActionModal('planejarProjetista'); }}
                                                                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                                title="Planejar Projetista e Engenharia"
                                                            >
                                                                <Edit3 size={10} /> Plan. Eng/Proj.
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setSelTag(t); setQtdeLiberadaForm({ qtdeLiberada: t.QtdeLiberada || '0' }); setMsg(null); setActionModal('alterarQtdeLiberada'); }}
                                                                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                                title="Alterar Qtde Liberada"
                                                            >
                                                                <Edit3 size={10} /> Qtde Lib.
                                                            </button>
                                                            {!t.Finalizado && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setSelTag(t); setMsg(null); setActionModal('finTag'); }}
                                                                    className="bg-slate-50 hover:bg-green-100 border border-slate-200 hover:border-green-300 text-slate-500 hover:text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                                                                    title="Finalizar Tag(s)"
                                                                >
                                                                    <CheckCircle size={10} /> Finalizar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* DATAS DA TAG */}
                                                    <td className="px-3 py-3 align-top border-r border-slate-100 bg-slate-50/30">
                                                        <div className="flex flex-col gap-2 w-32">
                                                            <DateBadge editable={false} date={t.DataEntrada} label="Entrada" />
                                                            <DateBadge editable={true} onClick={() => { setSelTag(t); setDateInput(brToIso(t.DataPrevisao)); setMsg(null); setActionModal('dateTagGlobal'); }} date={t.DataPrevisao} label="Previsão" />
                                                        </div>
                                                    </td>

                                                    {/* DETALHES TAG */}
                                                    <td className="px-3 py-4 align-top border-r border-slate-100 bg-slate-50/30">
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-48 text-[10px]">
                                                            <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Qtd. OS</span><span className="font-black text-slate-700">{t.QtdeOS || '0'}</span></div>
                                                            <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Qtd. Peças</span><span className="font-black text-slate-700">{t.qtdetotal || '0'}</span></div>
                                                            <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Liberada</span><span className="font-bold text-emerald-600">{t.QtdeLiberada || '0'}</span></div>
                                                            <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Saldo</span><span className="font-bold text-orange-600">{t.SaldoTag || '0'}</span></div>
                                                            <div className="flex flex-col col-span-2 mt-0.5 pt-1.5 border-t border-slate-100">
                                                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Multiplicador Tag</span>
                                                                <span className="font-bold text-blue-700">{t.QtdeTag || '1'} <span className="text-[8px] font-normal text-slate-400 lowercase">(x a produzir)</span></span>
                                                            </div>
                                                            {t.ValorTag && <div className="flex flex-col col-span-2 mt-1"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px] flex items-center gap-0.5"><DollarSign size={8}/> Valor</span><span className="font-bold text-slate-700">R$ {parseFloat(t.ValorTag).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>}
                                                        </div>
                                                    </td>

                                                    {/* SETORES */}
                                                    {filteredTagSectors.map(s => {
                                                        const e = toNum(t[s.ex as keyof Tag]), tot = toNum(t[s.t as keyof Tag]), raw = toNum(t[s.p as keyof Tag]), pct = raw || safePct(e, tot);
                                                        const pIni = t[s.fields.pi as keyof Tag] as string, pFim = t[s.fields.pf as keyof Tag] as string;
                                                        const rIni = t[s.fields.ri as keyof Tag] as string, rFim = t[s.fields.rf as keyof Tag] as string;
                                                        return (
                                                            <td key={s.k} className="px-4 py-3 align-top border-r border-slate-100 hover:bg-slate-50/80 transition-colors">
                                                                <div className="flex flex-col w-full h-full justify-between">
                                                                    {/* Progresso Cima */}
                                                                    <div className="flex justify-between items-end mb-1">
                                                                        <span className="text-[10px] font-black text-slate-700">{pct}%</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">Ex: {e} / {tot}</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner mb-3">
                                                                        <div className={`h-full ${s.c} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    
                                                                    {/* Datas Embaixo (Planejado em coluna, Realizado em coluna) */}
                                                                    <div className="grid grid-cols-2 gap-1.5 flex-1 items-end mt-auto pt-1.5 border-t border-slate-100/30 min-w-0">
                                                                        <div 
                                                                            className="flex flex-col gap-1 border border-slate-200/70 rounded p-1 bg-white relative hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group/edit"
                                                                            title={`Criado em: ${selProj?.DataCriacao || '—'} (Clique para editar planejamento)`}
                                                                            onClick={() => { 
                                                                                setSelTag(t); 
                                                                                setTagSectorDates({
                                                                                    PlanejadoInicioCorte: brToIso(t.PlanejadoInicioCorte), PlanejadoFinalCorte: brToIso(t.PlanejadoFinalCorte),
                                                                                    PlanejadoInicioDobra: brToIso(t.PlanejadoInicioDobra), PlanejadoFinalDobra: brToIso(t.PlanejadoFinalDobra),
                                                                                    PlanejadoInicioSolda: brToIso(t.PlanejadoInicioSolda), PlanejadoFinalSolda: brToIso(t.PlanejadoFinalSolda),
                                                                                    PlanejadoInicioPintura: brToIso(t.PlanejadoInicioPintura), PlanejadoFinalPintura: brToIso(t.PlanejadoFinalPintura),
                                                                                    PlanejadoInicioMontagem: brToIso(t.PlanejadoInicioMontagem), PlanejadoFinalMontagem: brToIso(t.PlanejadoFinalMontagem),
                                                                                });
                                                                                setMsg(null); setActionModal('dateTagSetores'); 
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-0.5">
                                                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase leading-none w-10 shrink-0">Plan. In.</span>
                                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap group-hover/edit:text-blue-700 transition-colors ${!pIni ? 'text-slate-300 border-dashed border-slate-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{pIni || 'Definir'}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-0.5">
                                                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase leading-none w-10 shrink-0">Plan. Fim</span>
                                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap group-hover/edit:text-blue-700 transition-colors ${!pFim ? 'text-slate-300 border-dashed border-slate-200' : (businessDaysUntil(pFim) === -1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200')}`}>{pFim || 'Definir'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1 border border-emerald-100/40 rounded p-1 bg-emerald-50/20 relative">
                                                                            <div className="flex items-center justify-between gap-0.5">
                                                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase leading-none w-10 shrink-0">Real. In.</span>
                                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap ${!rIni ? 'text-slate-300 border-transparent' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{rIni || '—'}</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-0.5">
                                                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase leading-none w-10 shrink-0">Real. Fim</span>
                                                                                <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap ${!rFim ? 'text-slate-300 border-transparent' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{rFim || '—'}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table></div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ MODAIS AÇÃO ══ */}
            {/* Modal Datas Simples (Projeto ou Tag Previsao) */}
            {(actionModal === 'dateProj' || actionModal === 'dateTagGlobal') && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <div><h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><CalendarDays size={18} className="text-blue-600" /> Editar Data Previsão</h3><p className="text-[11px] font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 mt-1.5 rounded-md text-slate-600 inline-block">{actionModal === 'dateTagGlobal' ? `Tag: ${selTag?.Tag}` : `${selProj?.Projeto}`}</p></div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md"><X size={18} /></button>
                        </div>
                        <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full border-2 border-slate-200 hover:border-blue-300 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-blue-500 transition mb-4 font-bold" />
                        
                        {actionModal === 'dateProj' && (
                            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl text-sm mb-5 cursor-pointer hover:bg-slate-100 border border-slate-200 transition-colors">
                                <input type="checkbox" checked={updateTagsCheck} onChange={e => setUpdateTagsCheck(e.target.checked)} className="rounded border-slate-300 text-blue-600 mt-1 w-4 h-4" />
                                <div className="leading-tight"><span className="font-bold text-slate-800 text-sm">Atualizar tags em cascata</span><br/><span className="text-[10px] text-slate-500 font-medium">Aplica a data para todas as filhas deste projeto</span></div>
                            </label>
                        )}

                        {msg && <div className={`px-3 py-2.5 rounded-lg text-xs uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.t}</div>}
                        <button onClick={actionModal === 'dateProj' ? salvarDataProj : salvarDataTagPrevisao} disabled={!dateInput || isSaving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-blue-500/20 flex justify-center items-center gap-2">
                            {isSaving ? <Loader className="animate-spin" size={16} /> : 'Salvar Data Previsão'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Editar Multiplas Datas Planejadas (Tags) */}
            {actionModal === 'dateTagSetores' && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                            <div><h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={18} className="text-blue-600" /> Planejamento de Setores</h3><p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag?.Tag}</p></div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={18} /></button>
                        </div>
                        
                        <div className="p-6 overflow-auto bg-white flex-1 relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(filteredTagSectors.length, 3)}, minmax(0, 1fr))` }}>
                                {filteredTagSectors.map(s => (
                                    <div key={s.k} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                        <div className="font-black text-slate-700 uppercase tracking-widest text-xs mb-4 pb-2 border-b border-slate-200 border-dashed flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${s.c}`}></div> Setor: {s.k}</div>
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Inicial</label>
                                                <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none" 
                                                    value={tagSectorDates[s.fields.pi] || ''} onChange={(e) => setTagSectorDates(prev => ({...prev, [s.fields.pi]: e.target.value}))}/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Final</label>
                                                <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none" 
                                                    value={tagSectorDates[s.fields.pf] || ''} onChange={(e) => setTagSectorDates(prev => ({...prev, [s.fields.pf]: e.target.value}))}/>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Deixe em branco para limpar a data.</span>
                            <div className="flex gap-3">
                                {msg && <div className={`px-4 py-2.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
                                <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={salvarDatasTagSetores} disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
                                    {isSaving ? <Loader className="animate-spin" size={16} /> : 'Salvar Todos os Setores'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Planejamento em Lote */}
            {actionModal === 'bulkDateTags' && selProj && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><CalendarDays size={20} className="text-indigo-600" /> Planejamento em Lote (Projeto)</h3>
                                <p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Projeto: {selProj.Projeto}</p>
                            </div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={18} /></button>
                        </div>

                        <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0">
                            <p className="text-xs text-amber-800 font-medium leading-relaxed flex items-center gap-2">
                                <ShieldAlert size={16} /> Esta ação aplicará as datas nos setores preenchidos para <strong>TODAS as TAGS</strong> deste projeto que ainda não possuem planejamento.
                            </p>
                        </div>

                        <div className="p-6 overflow-auto bg-white flex-1 relative">
                            {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center"><Loader className="animate-spin text-indigo-600" size={42} /></div>}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredTagSectors.map(s => (
                                    <div key={`bulk_${s.k}`} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                                        <div className="font-black text-slate-700 uppercase tracking-widest text-xs mb-4 pb-2 border-b border-slate-200 border-dashed flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${s.c}`}></div> Setor: {s.k}</div>
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Inicial</label>
                                                <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors" 
                                                    value={bulkSectorDates[s.fields.pi] || ''} onChange={(e) => setBulkSectorDates(prev => ({...prev, [s.fields.pi]: e.target.value}))}/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Final</label>
                                                <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors" 
                                                    value={bulkSectorDates[s.fields.pf] || ''} onChange={(e) => setBulkSectorDates(prev => ({...prev, [s.fields.pf]: e.target.value}))}/>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Apenas os setores com data preenchida serão afetados.</span>
                            <div className="flex gap-3 items-center">
                                {msg && <div className={`px-4 py-2.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
                                <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={salvarDatasBulkTags} disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
                                    <CheckCircle size={18}/> Aplicar Planejamento em Lote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal Planejar Projetista / Engenharia */}
            {actionModal === 'planejarProjetista' && selTag && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={18} className="text-indigo-600" /> Planejar Projetista / Engenharia</h3>
                                <p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag.Tag}</p>
                            </div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={18} /></button>
                        </div>
                        
                        <div className="p-6 overflow-auto bg-white flex-1 relative">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="md:col-span-3">
                                    <label className="text-xs font-bold text-slate-600 uppercase">Projetista Planejado <span className="text-red-500">*</span></label>
                                    <select value={planejarProjetistaForm.projetistaPlanejado} onChange={e => setPlanejarProjetistaForm(prev => ({...prev, projetistaPlanejado: e.target.value}))} className="mt-1.5 w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer bg-white">
                                        <option value="">Selecione um Projetista...</option>
                                        {planejarProjetistaForm.projetistaPlanejado && !usuarios.find(u => u.NomeCompleto === planejarProjetistaForm.projetistaPlanejado) && <option value={planejarProjetistaForm.projetistaPlanejado}>{planejarProjetistaForm.projetistaPlanejado}</option>}
                                        {usuarios.map(u => <option key={`eng_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-5 pt-4 md:pt-0">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Início Engenharia (Plan) <span className="text-red-500">*</span></label>
                                    <input type="date" className="mt-1 md:mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none" 
                                        value={planejarProjetistaForm.planejadoInicioEngenharia} onChange={(e) => setPlanejarProjetistaForm(prev => ({...prev, planejadoInicioEngenharia: e.target.value}))}/>
                                </div>
                                <div className="md:col-span-1 pt-4 md:pt-0">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fim Engenharia (Plan) <span className="text-red-500">*</span></label>
                                    <input type="date" className="mt-1 md:mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none" 
                                        value={planejarProjetistaForm.planejadoFinalEngenharia} onChange={(e) => setPlanejarProjetistaForm(prev => ({...prev, planejadoFinalEngenharia: e.target.value}))}/>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-[#f8fafc] shrink-0 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Todos os campos desta tela são obrigatórios.</span>
                            <div className="flex gap-3 items-center">
                                {msg && <div className={`px-4 py-2.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
                                <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={salvarPlanejamentoProjetista} disabled={isSaving} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
                                    {isSaving ? <Loader className="animate-spin" size={16} /> : 'Salvar Planejamento'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Alterar Qtde Liberada */}
            {actionModal === 'alterarQtdeLiberada' && selTag && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-base"><Edit3 size={16} className="text-emerald-600" /> Alterar Qtde Liberada</h3>
                                <p className="text-[10px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag.Tag}</p>
                            </div>
                            <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={16} /></button>
                        </div>
                        
                        <div className="p-6 overflow-auto bg-white flex-1 relative">
                            <div className="flex justify-between items-center mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Qtd. Tag (Total)</span><span className="text-lg font-black text-slate-700">{selTag.QtdeTag || '0'}</span></div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Atual</span><span className="text-lg font-black text-orange-600">{selTag.SaldoTag || '0'}</span></div>
                            </div>

                            <label className="text-xs font-bold text-slate-600 uppercase">Nova Qtde. Liberada <span className="text-red-500">*</span></label>
                            <input 
                                type="number" 
                                min="0" 
                                step="any"
                                className="mt-1.5 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-emerald-700 focus:border-emerald-500 outline-none transition-colors" 
                                value={qtdeLiberadaForm.qtdeLiberada} 
                                onChange={(e) => setQtdeLiberadaForm({ qtdeLiberada: e.target.value })}
                            />
                            {parseFloat(qtdeLiberadaForm.qtdeLiberada) > parseFloat(selTag.QtdeTag || '0') && (
                                <p className="text-[10px] font-bold text-red-500 mt-2">A quantidade liberada não pode ser maior que a total ({selTag.QtdeTag}).</p>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-[#f8fafc] shrink-0">
                            {msg && <div className={`px-4 py-2.5 rounded-lg text-xs uppercase font-bold text-center mb-3 ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
                            <div className="flex gap-2 w-full">
                                <button onClick={() => setActionModal(null)} className="flex-1 py-3 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                                <button onClick={salvarQtdeLiberada} disabled={isSaving || parseFloat(qtdeLiberadaForm.qtdeLiberada) > parseFloat(selTag.QtdeTag || '0')} className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all disabled:opacity-50">
                                    {isSaving ? <Loader className="animate-spin" size={16} /> : 'Salvar Qtde'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal Finalizar Tag */}
            {actionModal === 'finTag' && selTag && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-4">
                            <CheckCircle size={36} className="text-emerald-500 mb-2" />
                            <h3 className="font-bold text-lg text-emerald-700">Finalizar Tag(s)</h3>
                            <p className="text-xs font-bold text-slate-600 mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 max-w-full truncate">{selTag.Tag}</p>
                        </div>
                        <div className="text-[11px] text-slate-600 text-center mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                            Deseja finalizar <strong>apenas a tag atual</strong> ou finalizar <strong>todas as tags pendentes</strong> deste projeto ({selProj?.Projeto})?
                        </div>
                        {msg && <div className={`px-3 py-2 rounded-lg text-[10px] uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.t}</div>}
                        <div className="flex flex-col gap-2">
                            <button onClick={e => { e.preventDefault(); salvarFinalizarTag(false); }} disabled={isSaving} className="w-full text-white font-bold text-sm py-2.5 rounded-lg transition-all shadow-md flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 border border-emerald-700">
                                {isSaving ? <Loader className="animate-spin" size={16} /> : 'Finalizar Apenas Esta Tag'}
                            </button>
                            <button onClick={e => { e.preventDefault(); salvarFinalizarTag(true); }} disabled={isSaving} className="w-full text-indigo-700 font-bold text-sm py-2.5 rounded-lg transition-all flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200">
                                {isSaving ? <Loader className="animate-spin" size={16} /> : 'Finalizar Todas as Tags!'}
                            </button>
                            <div className="w-full h-px bg-slate-200 my-1"></div>
                            <button onClick={() => setActionModal(null)} className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-bold text-sm py-2.5 rounded-lg transition-colors">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Finalizar Projeto */}
            {(actionModal === 'fin' || actionModal === 'cancelFin') && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-4">
                            {actionModal === 'fin' ? <CheckCircle size={36} className="text-emerald-500 mb-2" /> : <RotateCcw size={36} className="text-orange-500 mb-2" />}
                            <h3 className={`font-bold text-lg ${actionModal === 'fin' ? 'text-emerald-700' : 'text-orange-700'}`}>{actionModal === 'fin' ? 'Finalizar Projeto' : 'Desfazer Finalização'}</h3>
                            <p className="text-xs font-bold text-slate-600 mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 max-w-full truncate">{selProj?.Projeto}</p>
                        </div>
                        <div className="text-[11px] text-slate-600 text-center mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {actionModal === 'fin' ? 'Este projeto, tags e OS vinculadas serão marcados como finalizados.' : 'O projeto voltará para a esteira de liberação/produção ativa.'}
                        </div>
                        {msg && <div className={`px-3 py-2 rounded-lg text-[10px] uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.t}</div>}
                        <div className="flex gap-2">
                            <button onClick={() => setActionModal(null)} className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-bold text-sm py-2 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={e => { e.preventDefault(); actionModal === 'fin' ? finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/finalizar`, true) : finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/cancelar-finalizacao`, false); }} disabled={isSaving} className={`flex-1 text-white font-bold text-sm py-2 rounded-lg transition-all shadow-md flex justify-center items-center gap-2 ${actionModal === 'fin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}>{isSaving ? <Loader className="animate-spin" size={16} /> : 'Confirmar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nova Pendência (RNC) - FULL MANAGER */}
            {actionModal === 'addRnc' && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        
                        {/* HEADER DA MODAL */}
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl"><ShieldAlert size={22} className="text-red-500" /> Gerenciar Pendências (RNC)</h3>
                                <p className="text-xs font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 mt-1.5 rounded-md text-slate-600 inline-block">
                                    {selProj?.Projeto} {rncForm.tag ? ` > Tag: ${rncForm.tag}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {fromGlobal && (
                                    <button onClick={() => window.location.href = '/visao-geral-pendencias'} className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
                                        &larr; Voltar
                                    </button>
                                )}
                                <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* ÁREA DE FORMULÁRIO (TOP) */}
                        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 mb-4 shrink-0 shadow-sm relative">
                            {/* Overlay de Loading do Salvar */}
                            {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center"><Loader className="animate-spin text-red-600" size={28} /></div>}
                            
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5"><Edit3 size={14}/> {rncForm.idRnc ? `Editando Pendência #${rncForm.idRnc}` : 'Nova Pendência'}</h4>
                                <div className="flex gap-2 items-center">
                                    {rncForm.idRnc && rncForm.estatus !== 'FINALIZADO' && !rncForm.wantsToFinalize && (
                                        <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: true, dataFin: new Date().toISOString().split('T')[0]}))} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                            <CheckCircle size={14}/> Habilitar Finalização
                                        </button>
                                    )}
                                    {rncForm.wantsToFinalize && (
                                        <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: false}))} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                            Cancelar Finalização
                                        </button>
                                    )}
                                    <button onClick={() => setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false })} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Novo</button>
                                    <button onClick={salvarNovaRnc} disabled={!rncForm.descricao.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><ShieldAlert size={12}/> Salvar Dados</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Responsável</label>
                                    <select value={rncForm.usuario} onChange={e => setRncForm(prev => ({...prev, usuario: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
                                        <option value="">Selecione...</option>
                                        {rncForm.usuario && !usuarios.find(u => u.NomeCompleto === rncForm.usuario) && <option value={rncForm.usuario}>{rncForm.usuario}</option>}
                                        {usuarios.map(u => <option key={u.IdUsuario} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo de Tarefa</label>
                                    <select value={rncForm.tipoTarefa} onChange={e => setRncForm(prev => ({...prev, tipoTarefa: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
                                        <option value="">Selecione...</option>
                                        {rncForm.tipoTarefa && !tipostarefa.find(t => t.TipoTarefa === rncForm.tipoTarefa) && <option value={rncForm.tipoTarefa}>{rncForm.tipoTarefa}</option>}
                                        {tipostarefa.map(t => <option key={t.IdTipoTarefa} value={t.TipoTarefa}>{t.TipoTarefa}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Setor</label>
                                    <select value={rncForm.setor} onChange={e => setRncForm(prev => ({...prev, setor: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
                                        {filteredSectors.map(s => <option key={s.k} value={s.k}>{s.k}</option>)}
                                        <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                        {rncForm.setor && !filteredSectors.find(s=>s.k===rncForm.setor) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setor) && <option value={rncForm.setor}>{rncForm.setor}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Data Execução (Prevista)</label>
                                    <input type="date" value={rncForm.dataExec} onChange={e => setRncForm(prev => ({...prev, dataExec: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Descrição Detalhada</label>
                                <textarea value={rncForm.descricao} onChange={e => setRncForm(prev => ({...prev, descricao: e.target.value.toUpperCase()}))} rows={2} placeholder="Descreva a pendência..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-red-400 resize-none font-medium" />
                            </div>

                            {/* BLOCO DE FINALIZAÇÃO */}
                            {rncForm.idRnc && (rncForm.estatus === 'FINALIZADO' || rncForm.wantsToFinalize) && (
                            <div className={`mt-4 pt-3 border-t border-slate-200 ${rncForm.estatus === 'FINALIZADO' ? 'opacity-80' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-xs text-emerald-700 flex items-center gap-1.5 uppercase"><CheckCircle size={14}/> Responsável pela Finalização {rncForm.estatus === 'FINALIZADO' && '(Já Finalizada)'}</h4>
                                    {rncForm.estatus !== 'FINALIZADO' && (
                                        <button onClick={finalizarRnc} disabled={!rncForm.usuarioFin || !rncForm.dataFin || isSaving} className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 uppercase"><CheckCircle size={12}/> Confirmar Finalização</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Responsável</label>
                                        <select disabled={rncForm.estatus === 'FINALIZADO'} value={rncForm.usuarioFin} onChange={e => setRncForm(prev => ({...prev, usuarioFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75">
                                            <option value="">Selecione...</option>
                                            {rncForm.usuarioFin && !usuarios.find(u => u.NomeCompleto === rncForm.usuarioFin) && <option value={rncForm.usuarioFin}>{rncForm.usuarioFin}</option>}
                                            {usuarios.map(u => <option key={`fin_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Data de Finalização</label>
                                        <input disabled={rncForm.estatus === 'FINALIZADO'} type="date" value={rncForm.dataFin} onChange={e => setRncForm(prev => ({...prev, dataFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Setor</label>
                                        <select disabled={rncForm.estatus === 'FINALIZADO'} value={rncForm.setorFin} onChange={e => setRncForm(prev => ({...prev, setorFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75">
                                            {filteredSectors.map(s => <option key={`fin_${s.k}`} value={s.k}>{s.k}</option>)}
                                            <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                            {rncForm.setorFin && !filteredSectors.find(s=>s.k===rncForm.setorFin) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setorFin) && <option value={rncForm.setorFin}>{rncForm.setorFin}</option>}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Descrição do Retorno / Resolução</label>
                                    <textarea disabled={rncForm.estatus === 'FINALIZADO'} value={rncForm.descFin} onChange={e => setRncForm(prev => ({...prev, descFin: e.target.value.toUpperCase()}))} rows={1} placeholder="Detalhes de como foi resolvido..." className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 text-xs text-emerald-800 outline-none focus:border-emerald-400 resize-none font-medium disabled:opacity-75" />
                                </div>
                            </div>
                            )}

                            {msg && <div className={`mt-3 px-3 py-2 rounded-lg text-[10px] uppercase font-bold text-center ${msg.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{msg.t}</div>}
                        </div>

                        {/* ÁREA DE GRID (BOTTOM) */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl relative">
                            {/* Toggle Filtro */}
                            <div className="bg-[#f8fafc] border-b border-slate-200 px-4 py-2 flex justify-between items-center shrink-0">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase">Histórico de Pendências</h5>
                                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 cursor-pointer hover:text-slate-800 transition-colors">
                                    <input type="checkbox" checked={showFinalizedRncs} onChange={e => setShowFinalizedRncs(e.target.checked)} className="accent-blue-500" /> Mostrar Finalizadas
                                </label>
                            </div>

                            {loadRncs ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50 z-10"><Loader className="animate-spin" size={28} /> <span className="text-sm font-bold">Carregando pendências...</span></div>
                            ) : rncs.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50">Nenhuma pendência encontrada.</div>
                            ) : (
                                <div className="flex-1 py-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 [&::-webkit-scrollbar]:h-2 relative bg-white min-h-0">
                                    <div className="w-max min-w-full pb-2">
                                        <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2.5">ID</th>
                                                <th className="px-3 py-2.5">Status</th>
                                                <th className="px-3 py-2.5">Descrição</th>
                                                <th className="px-3 py-2.5">Responsável</th>
                                                <th className="px-3 py-2.5">Tipo Tarefa</th>
                                                <th className="px-3 py-2.5">Setor</th>
                                                <th className="px-3 py-2.5 text-right flex-1">Data Cri.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredRncs.map((r, idx) => {
                                                // Adjust string cases since grid data might come slightly different
                                                const rawSetor = (r.SetorResponsavel || '').trim();
                                                const mappedSetor = filteredSectors.find(s => s.k.toLowerCase() === rawSetor.toLowerCase())?.k || (['Medição', 'Medicao'].includes(rawSetor) ? 'Medição' : (['Isométrico', 'Isometrico'].includes(rawSetor) ? 'Isométrico' : rawSetor)) || 'Corte';
                                                
                                                const rawTipoTarefa = (r.TipoTarefa || '').trim();
                                                const mappedTipoTarefa = tipostarefa.find(t => t.TipoTarefa.toLowerCase() === rawTipoTarefa.toLowerCase())?.TipoTarefa || rawTipoTarefa;
                                                
                                                const mappedUsuario = usuarios.find(u => u.NomeCompleto.toLowerCase() === (r.UsuarioResponsavel || '').toLowerCase())?.NomeCompleto || r.UsuarioResponsavel || '';
                                                
                                                return (
                                                <tr key={r.IdRnc} onClick={() => setRncForm({ 
                                                    idRnc: r.IdRnc, tag: r.Tag || undefined, estatus: r.Estatus, descricao: r.DescricaoPendencia || '', setor: mappedSetor, 
                                                    usuario: mappedUsuario, tipoTarefa: mappedTipoTarefa, dataExec: r.DataCriacao ? brToIso(r.DataCriacao.split(' ')[0]) : '',
                                                    usuarioFin: r.UsuarioResponsavelFinalizacao || '', dataFin: r.DataFinalizacao ? brToIso(r.DataFinalizacao) : '', setorFin: r.SetorResponsavelFinalizacao || 'Corte', descFin: r.DescricaoFinalizacao || '',
                                                    wantsToFinalize: false 
                                                })} className={`cursor-pointer group hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'} ${r.Estatus === 'FINALIZADO' ? 'opacity-60' : ''}`}>
                                                    <td className="px-3 py-2 font-mono font-bold text-slate-600 text-[10px]">#{r.IdRnc}</td>
                                                    <td className="px-3 py-2"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.Estatus || 'Aberta'}</span></td>
                                                    <td className="px-3 py-2 max-w-[200px] truncate font-medium text-slate-700" title={r.DescricaoPendencia}>{r.DescricaoPendencia}</td>
                                                    <td className="px-3 py-2 truncate max-w-[120px] text-slate-600">{r.UsuarioResponsavel || '—'}</td>
                                                    <td className="px-3 py-2 truncate max-w-[120px] text-slate-600 font-medium">{r.TipoTarefa || '—'}</td>
                                                    <td className="px-3 py-2 font-bold text-slate-600 text-[9px] uppercase"><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>{r.SetorResponsavel}</span></td>
                                                    <td className="px-3 py-2 text-right font-mono text-[9px] text-slate-400">{r.DataCriacao}</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Agendar Tarefa */}
            {actionModal === 'addTask' && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
                        
                        {/* HEADER DA MODAL */}
                        <div className="flex justify-between items-start mb-4 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl"><CalendarDays size={22} className="text-blue-500" /> Agendar Tarefa (PCP)</h3>
                                <p className="text-xs font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 mt-1.5 rounded-md text-slate-600 inline-block">
                                    {selProj?.Projeto} {rncForm.tag ? ` > Tag: ${rncForm.tag}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {fromGlobal && (
                                    <button onClick={() => window.location.href = '/visao-geral-pendencias'} className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
                                        &larr; Voltar
                                    </button>
                                )}
                                <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        {/* ÁREA DE FORMULÁRIO (TOP) */}
                        <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-4 mb-4 shrink-0 shadow-sm relative">
                            {/* Overlay de Loading do Salvar */}
                            {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center"><Loader className="animate-spin text-blue-600" size={28} /></div>}
                            
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-slate-700 flex items-center gap-1.5"><Edit3 size={14}/> {rncForm.idRnc ? `Editando Tarefa #${rncForm.idRnc}` : 'Nova Tarefa'}</h4>
                                <div className="flex gap-2 items-center">
                                    {rncForm.idRnc && rncForm.estatus !== 'TarefaFinalizada' && !rncForm.wantsToFinalize && (
                                        <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: true, dataFin: new Date().toISOString().split('T')[0]}))} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                            <CheckCircle size={14}/> Habilitar Finalização
                                        </button>
                                    )}
                                    {rncForm.wantsToFinalize && (
                                        <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: false}))} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                            Cancelar Finalização
                                        </button>
                                    )}
                                    <button onClick={() => setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false })} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Novo</button>
                                    <button onClick={salvarNovaTarefa} disabled={!rncForm.descricao.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><CalendarDays size={12}/> Agendar Tarefa</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Responsável</label>
                                    <select value={rncForm.usuario} onChange={e => setRncForm(prev => ({...prev, usuario: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        <option value="">Selecione...</option>
                                        {rncForm.usuario && !usuarios.find(u => u.NomeCompleto === rncForm.usuario) && <option value={rncForm.usuario}>{rncForm.usuario}</option>}
                                        {usuarios.map(u => <option key={`task_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo de Tarefa</label>
                                    <select value={rncForm.tipoTarefa} onChange={e => setRncForm(prev => ({...prev, tipoTarefa: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        <option value="">Selecione...</option>
                                        {rncForm.tipoTarefa && !tipostarefa.find(t => t.TipoTarefa === rncForm.tipoTarefa) && <option value={rncForm.tipoTarefa}>{rncForm.tipoTarefa}</option>}
                                        {tipostarefa.map(t => <option key={`task_${t.IdTipoTarefa}`} value={t.TipoTarefa}>{t.TipoTarefa}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Setor</label>
                                    <select value={rncForm.setor} onChange={e => setRncForm(prev => ({...prev, setor: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400">
                                        {filteredSectors.map(s => <option key={`task_${s.k}`} value={s.k}>{s.k}</option>)}
                                        <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                        {rncForm.setor && !filteredSectors.find(s=>s.k===rncForm.setor) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setor) && <option value={rncForm.setor}>{rncForm.setor}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Data Execução (Prevista)</label>
                                    <input type="date" value={rncForm.dataExec} onChange={e => setRncForm(prev => ({...prev, dataExec: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Descrição / Notas da Tarefa</label>
                                <textarea value={rncForm.descricao} onChange={e => setRncForm(prev => ({...prev, descricao: e.target.value.toUpperCase()}))} rows={2} placeholder="Descreva a tarefa..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 resize-none font-medium" />
                            </div>

                            {/* BLOCO DE FINALIZAÇÃO DA TAREFA */}
                            {rncForm.idRnc && (rncForm.estatus === 'TarefaFinalizada' || rncForm.wantsToFinalize) && (
                            <div className={`mt-4 pt-3 border-t border-slate-200 ${rncForm.estatus === 'TarefaFinalizada' ? 'opacity-80' : ''}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-xs text-emerald-700 flex items-center gap-1.5 uppercase"><CheckCircle size={14}/> Responsável pela Finalização {rncForm.estatus === 'TarefaFinalizada' && '(Já Finalizada)'}</h4>
                                    {rncForm.estatus !== 'TarefaFinalizada' && (
                                        <button onClick={finalizarRnc} disabled={!rncForm.usuarioFin || !rncForm.dataFin || isSaving} className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 uppercase"><CheckCircle size={12}/> Confirmar Finalização</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Responsável</label>
                                        <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.usuarioFin} onChange={e => setRncForm(prev => ({...prev, usuarioFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75">
                                            <option value="">Selecione...</option>
                                            {rncForm.usuarioFin && !usuarios.find(u => u.NomeCompleto === rncForm.usuarioFin) && <option value={rncForm.usuarioFin}>{rncForm.usuarioFin}</option>}
                                            {usuarios.map(u => <option key={`fin_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Data de Finalização</label>
                                        <input disabled={rncForm.estatus === 'TarefaFinalizada'} type="date" value={rncForm.dataFin} onChange={e => setRncForm(prev => ({...prev, dataFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Setor</label>
                                        <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.setorFin} onChange={e => setRncForm(prev => ({...prev, setorFin: e.target.value}))} className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-800 outline-none focus:border-emerald-400 disabled:opacity-75">
                                            {filteredSectors.map(s => <option key={`fin_${s.k}`} value={s.k}>{s.k}</option>)}
                                            <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                            {rncForm.setorFin && !filteredSectors.find(s=>s.k===rncForm.setorFin) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setorFin) && <option value={rncForm.setorFin}>{rncForm.setorFin}</option>}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Descrição do Retorno / Resolução</label>
                                    <textarea disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.descFin} onChange={e => setRncForm(prev => ({...prev, descFin: e.target.value.toUpperCase()}))} rows={1} placeholder="Detalhes de como foi resolvido..." className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 text-xs text-emerald-800 outline-none focus:border-emerald-400 resize-none font-medium disabled:opacity-75" />
                                </div>
                            </div>
                            )}

                            {msg && <div className={`mt-3 px-3 py-2 rounded-lg text-[10px] uppercase font-bold text-center ${msg.ok ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{msg.t}</div>}
                        </div>

                        {/* ÁREA DE GRID (BOTTOM) */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl relative">
                            <div className="bg-[#f8fafc] border-b border-slate-200 px-4 py-2 flex justify-between items-center shrink-0">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase">Histórico de Tarefas (PCP)</h5>
                                <button
                                    onClick={exportarTarefasPCP}
                                    disabled={filteredRncs.length === 0 || isExporting}
                                    className="px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isExporting ? <Loader className="animate-spin" size={12} /> : <FileDown size={14} />}
                                    Emitir Relatório
                                </button>
                            </div>

                            {loadRncs ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50 z-10"><Loader className="animate-spin" size={28} /> <span className="text-sm font-bold">Carregando tarefas...</span></div>
                            ) : rncs.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50">Nenhuma tarefa encontrada.</div>
                            ) : (
                                <div className="flex-1 py-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 [&::-webkit-scrollbar]:h-2 relative bg-white min-h-0">
                                    <div className="w-max min-w-full pb-2">
                                        <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                                            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2.5">ID</th>
                                                <th className="px-3 py-2.5">Status</th>
                                                <th className="px-3 py-2.5">Descrição</th>
                                                <th className="px-3 py-2.5">Responsável</th>
                                                <th className="px-3 py-2.5">Tipo Tarefa</th>
                                                <th className="px-3 py-2.5">Setor</th>
                                                <th className="px-3 py-2.5 text-right flex-1">Data Cri.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredRncs.map((r, idx) => {
                                                const rawSetor = (r.SetorResponsavel || '').trim();
                                                const mappedSetor = filteredSectors.find(s => s.k.toLowerCase() === rawSetor.toLowerCase())?.k || (['Medição', 'Medicao'].includes(rawSetor) ? 'Medição' : (['Isométrico', 'Isometrico'].includes(rawSetor) ? 'Isométrico' : rawSetor)) || 'Corte';
                                                
                                                const rawTipoTarefa = (r.TipoTarefa || '').trim();
                                                const mappedTipoTarefa = tipostarefa.find(t => t.TipoTarefa.toLowerCase() === rawTipoTarefa.toLowerCase())?.TipoTarefa || rawTipoTarefa;
                                                
                                                const mappedUsuario = usuarios.find(u => u.NomeCompleto.toLowerCase() === (r.UsuarioResponsavel || '').toLowerCase())?.NomeCompleto || r.UsuarioResponsavel || '';
                                                
                                                return (
                                                <tr key={r.IdRnc} onClick={() => setRncForm({ 
                                                    idRnc: r.IdRnc, tag: r.Tag || undefined, estatus: r.Estatus, descricao: r.DescricaoPendencia || '', setor: mappedSetor, 
                                                    usuario: mappedUsuario, tipoTarefa: mappedTipoTarefa, dataExec: r.DataCriacao ? brToIso(r.DataCriacao.split(' ')[0]) : '',
                                                    wantsToFinalize: false 
                                                })} className={`cursor-pointer group hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'} ${r.Estatus === 'TarefaFinalizada' ? 'opacity-60' : ''}`}>
                                                    <td className="px-3 py-2 font-mono font-bold text-slate-600 text-[10px]">#{r.IdRnc}</td>
                                                    <td className="px-3 py-2"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{r.Estatus || 'Aberta'}</span></td>
                                                    <td className="px-3 py-2 max-w-[200px] truncate font-medium text-slate-700" title={r.DescricaoPendencia}>{r.DescricaoPendencia}</td>
                                                    <td className="px-3 py-2 truncate max-w-[120px] text-slate-600">{r.UsuarioResponsavel || '—'}</td>
                                                    <td className="px-3 py-2 truncate max-w-[120px] text-slate-600 font-medium">{r.TipoTarefa || '—'}</td>
                                                    <td className="px-3 py-2 font-bold text-slate-600 text-[9px] uppercase"><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>{r.SetorResponsavel}</span></td>
                                                    <td className="px-3 py-2 text-right font-mono text-[9px] text-slate-400">{r.DataCriacao}</td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Painel RNC */}
            {rncPanel && selProj && (
                <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => { setRncPanel(false); if (showDetailsModal) setShowDetailsModal(true); }} />
                    <div className="w-[450px] max-w-full bg-slate-50 relative flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 shadow-sm"><div className="flex flex-col"><div className="flex items-center gap-2 font-black text-red-600 text-base"><ShieldAlert size={18} /> Ocorrências (RNC)</div><div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[300px]">{selProj.Projeto}</div></div><button className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md text-slate-600 transition-colors" onClick={() => { setRncPanel(false); }}><X size={16} /></button></div>
                        <div className="flex-1 overflow-auto p-4 md:p-5">
                            {loadRncs ? <div className="flex items-center justify-center flex-col gap-2 text-slate-400 mt-20"><Loader className="animate-spin" size={24} /><span className="text-xs font-bold">Buscando pendências...</span></div> : rncs.length === 0 ? <div className="text-center text-slate-400 mt-20 text-sm font-medium">Nenhuma RNC identificada para este projeto.</div> : (
                                <div className="space-y-3">
                                    {rncs.map(r => (
                                        <div key={r.IdRnc} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm ${r.Estatus?.toLowerCase().includes('fin') ? 'border-emerald-500' : 'border-red-500'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">#{r.IdRnc} <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-mono border border-slate-200">{r.Tag}</span></div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.Estatus || 'Aberta'}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 mb-2 leading-relaxed">{r.DescricaoPendencia || r.DescResumo}</div>
                                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-100 mt-1">
                                                <span className="flex items-center gap-1 text-slate-500"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>{r.SetorResponsavel}</span><span>Cr: {r.DataCriacao}</span>
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

