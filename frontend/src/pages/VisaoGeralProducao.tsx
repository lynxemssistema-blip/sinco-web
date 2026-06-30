import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Search, Filter, X, CalendarDays, CheckCircle, Loader, RotateCcw, ShieldAlert, Tag as TagIcon, LayoutGrid, ArrowRight, Edit3, DollarSign, FileDown, List, ClipboardList, Maximize2, Minimize2 } from 'lucide-react';
import VisaoGeralTagsGlobais from './VisaoGeralTagsGlobais';

const API_BASE = '/api';

// ─── Interfaces ───
interface Projeto { IdProjeto: number; Projeto: string; DescProjeto: string; DescEmpresa?: string; DataPrevisao: string; DataCriacao: string; Finalizado: string; liberado: string; QtdeTags: number; QtdeTagsExecutadas: number; PercentualTags: number; QtdePecasTags: number; QtdePecasExecutadas: number; PercentualPecas: number; qtdetotalpecas: number; TotalRnc: number; qtdernc: number; qtderncPendente: number; qtderncFinalizada: number; ExecCorte: number; TotalCorte: number; ExecDobra: number; TotalDobra: number; ExecSolda: number; TotalSolda: number; ExecPintura: number; TotalPintura: number; ExecMontagem: number; TotalMontagem: number; QtdeOS: number; }
interface Tag { IdTag: number; Tag: string; DescTag: string; DataEntrada: string; DataPrevisao: string; QtdeTag: string; QtdeLiberada: string; SaldoTag: string; ValorTag: string; StatusTag: string; QtdeOS: string; qtdetotal: string; QtdeTotalPecas?: string | number; Finalizado: string; qtdernc: number; 
 PlanejadoInicioCorte: string; PlanejadoFinalCorte: string; RealizadoInicioCorte: string; RealizadoFinalCorte: string; CorteTotalExecutado: string; CorteTotalExecutar: string; CortePercentual: string; 
 PlanejadoInicioDobra: string; PlanejadoFinalDobra: string; RealizadoInicioDobra: string; RealizadoFinalDobra: string; DobraTotalExecutado: string; DobraTotalExecutar: string; DobraPercentual: string; 
 PlanejadoInicioSolda: string; PlanejadoFinalSolda: string; RealizadoInicioSolda: string; RealizadoFinalSolda: string; SoldaTotalExecutado: string; SoldaTotalExecutar: string; SoldaPercentual: string; 
 PlanejadoInicioPintura: string; PlanejadoFinalPintura: string; RealizadoInicioPintura: string; RealizadoFinalPintura: string; PinturaTotalExecutado: string; PinturaTotalExecutar: string; PinturaPercentual: string; 
 PlanejadoInicioMontagem: string; PlanejadoFinalMontagem: string; RealizadoInicioMontagem: string; RealizadoFinalMontagem: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; 
 ProjetistaPlanejado?: string; PlanejadoInicioEngenharia?: string; PlanejadoFinalEngenharia?: string; Observacao?: string;
}
interface Rnc { IdRnc: number; Estatus: string; Tag: string; SetorResponsavel: string; DescricaoPendencia: string; DescResumo: string; UsuarioResponsavel: string; TipoTarefa?: string; DataExecucao?: string; DataCriacao: string; DataFinalizacao: string; UsuarioResponsavelFinalizacao?: string; SetorResponsavelFinalizacao?: string; DescricaoFinalizacao?: string; DescEmpresa?: string; DescTag?: string; }

const toNum = (v: Record<string, unknown>) => parseFloat(String(v ?? '0')) || 0;
const safePct = (e: Record<string, unknown>, t: Record<string, unknown>) => toNum(t) > 0 ? Math.min(Math.round((toNum(e) / toNum(t)) * 100), 100) : 0;
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

const DateBadge = ({ date, label, onClick, editable = false, showStatus = true }: { date: string, label?: string, onClick?: () => void, editable?: boolean, showStatus?: boolean }) => {
 if (!date && !editable) return <span className="text-slate-300 text-[10px]">—</span>;
 if (!date && editable) return (
 <div onClick={onClick} className="flex flex-col cursor-pointer group">
 {label && <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 leading-none group-hover:text-[#32423D] transition-colors">{label}</span>}
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200 border-dashed group-hover:border-[#32423D]/40 leading-none">
 <CalendarDays size={10} /> Definir
 </span>
 </div>
 );
 const days = businessDaysUntil(date);
 const color = !showStatus ? 'bg-slate-50 text-slate-700 border-slate-200' : (days === -1 ? 'bg-red-50 text-red-700 border-red-200' : (days !== null && days <= 5) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200');
 return (
 <div onClick={editable ? onClick : undefined} className={`flex flex-col ${editable ? 'cursor-pointer group' : ''}`}>
 {label && <span className={`text-[9px] text-slate-400 font-bold uppercase mb-0.5 leading-none ${editable ? 'group-hover:text-[#32423D] transition-colors' : ''}`}>{label}</span>}
 <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${editable ? 'group-hover:border-[#32423D]/40 group-hover:bg-[#E0E800]/10 group-hover:text-[#32423D]/70 transition-colors' : color} font-bold leading-none whitespace-nowrap`}>
 <CalendarDays size={10} /> {date} {(showStatus && days === -1) ? '· Atrasado' : ((showStatus && days !== null && days >= 0) ? `· ${days}d` : '')}
 </span>
 </div>
 );
};

const SECTORS = [
 { k: 'Corte', ex: 'ExecCorte', t: 'TotalCorte', c: 'bg-[#32423D]' }, { k: 'Dobra', ex: 'ExecDobra', t: 'TotalDobra', c: 'bg-indigo-600' },
 { k: 'Solda', ex: 'ExecSolda', t: 'TotalSolda', c: 'bg-red-600' }, { k: 'Pintura', ex: 'ExecPintura', t: 'TotalPintura', c: 'bg-amber-500' },
 { k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },
];

const TAG_SECTORS = [
 { k: 'Corte', ex: 'CorteTotalExecutado', t: 'CorteTotalExecutar', p: 'CortePercentual', c: 'bg-[#32423D]', 
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
 const [fDataPlanIni, setFDataPlanIni] = useState(''); const [fDataPlanFim, setFDataPlanFim] = useState('');
 const [fProjCriacaoIni, setFProjCriacaoIni] = useState(''); const [fProjCriacaoFim, setFProjCriacaoFim] = useState('');
 const [fProjPrevIni, setFProjPrevIni] = useState(''); const [fProjPrevFim, setFProjPrevFim] = useState('');
 const [error, setError] = useState<string | null>(null);
 const [fromGlobal, setFromGlobal] = useState(false);

 // State Persistence — apenas viewMode (preferência de UI)
 const [viewMode, setViewMode] = useState<'card' | 'list' | 'tags'>(() => (localStorage.getItem('vgp_viewMode') as 'card' | 'list' | 'tags') || 'list');
 // Filtros sempre iniciam vazios (sem restaurar sessão anterior)
 const [fProj, setFProj] = useState('');
 const [statusFilter, setStatusFilter] = useState<'finalizados'|'liberados'|'todos'|null>(null);

 useEffect(() => {
 localStorage.setItem('vgp_viewMode', viewMode);
 // Não persistimos fProj nem statusFilter para garantir início limpo
 }, [viewMode]);

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
 const [viewModeTags, setViewModeTags] = useState<'detailed' | 'list'>('list');
 const [rncForm, setRncForm] = useState<{idRnc?: number, idTag?: number, tag?: string, estatus?: string, descricao: string, setor: string, usuario: string, tipoTarefa: string, dataExec: string, usuarioFin?: string, dataFin?: string, setorFin?: string, descFin?: string, wantsToFinalize?: boolean}>({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
 const [planejarProjetistaForm, setPlanejarProjetistaForm] = useState<{ projetistaPlanejado: string, planejadoInicioEngenharia: string, planejadoFinalEngenharia: string }>({ projetistaPlanejado: '', planejadoInicioEngenharia: '', planejadoFinalEngenharia: '' });
 const [qtdeLiberadaForm, setQtdeLiberadaForm] = useState<{ qtdeLiberada: string }>({ qtdeLiberada: '' });
 const [showFinalizedRncs, setShowFinalizedRncs] = useState(false);
 const [usuarios, setUsuarios] = useState<Record<string, unknown>[]>([]);
 const [tipostarefa, setTipostarefa] = useState<Record<string, unknown>[]>([]);
 const [dateInput, setDateInput] = useState(''); const [updateTagsCheck, setUpdateTagsCheck] = useState(false);
 const [selTag, setSelTag] = useState<Tag | null>(null); 
 const [isSaving, setIsSaving] = useState(false); const [msg, setMsg] = useState<{ ok: boolean, t: string } | null>(null);
 
 // Estado para editar datas de setor da Tag
 const [tagSectorDates, setTagSectorDates] = useState<{ [key: string]: string }>({});

 // Estado de Expansão (Maximizado)
 const [isExpanded, setIsExpanded] = useState(false);

 // Estado para Planejamento em Lote (Muitos Setores)
 const [bulkSectorDates, setBulkSectorDates] = useState<{ [key: string]: string }>({});

 const [osDetailsModal, setOsDetailsModal] = useState<{ type: 'tag' | 'projeto', id: number, osList: Record<string, unknown>[] } | null>(null);
 const [loadOsDetails, setLoadOsDetails] = useState(false);

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
 } catch (err: unknown) {
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
 if (sf === 'finalizados') {
 qs.set('modo', 'finalizados');
 } else if (sf === 'liberados') {
 qs.set('modo', 'liberados');
 } else if (sf === 'todos') {
 qs.set('modo', 'todos');
 }

 const { fProjPrevIni: pi, fProjPrevFim: pf, fProjCriacaoIni: ci, fProjCriacaoFim: cf } = dateFiltersRef.current;
 if (pi) qs.set('previsaoInicio', isoToBr(pi));
 if (pf) qs.set('previsaoFim', isoToBr(pf));
 if (ci) qs.set('criacaoInicio', isoToBr(ci));
 if (cf) qs.set('criacaoFim', isoToBr(cf));

 const res = await (await fetch(`${API_BASE}/acompanhamento/projetos${qs.toString() ? '?' + qs : ''}`)).json();
 if (res.success) setProjetos(res.data);
 else setError(res.message || 'Erro ao carregar projetos do servidor');
 } catch (e: Record<string, unknown>) { console.error(e); setError(e.message || 'Erro de rede'); }
 finally { setLoad(false); }
 };


 const fetchOsForTag = async (idTag: number) => {
 setLoadOsDetails(true);
 try {
 const r = await (await fetch(`${API_BASE}/visao-geral/tag/${idTag}/ordens-servico`)).json();
 if (r.success) {
 setOsDetailsModal({ type: 'tag', id: idTag, osList: r.data });
 } else {
 setOsDetailsModal({ type: 'tag', id: idTag, osList: [] });
 }
 } catch {
 console.error(e);
 setOsDetailsModal({ type: 'tag', id: idTag, osList: [] });
 } finally {
 setLoadOsDetails(false);
 }
 };

 const fetchOsForProject = async (idProj: number) => {
 setLoadOsDetails(true);
 try {
 const r = await (await fetch(`${API_BASE}/visao-geral/projeto/${idProj}/ordens-servico?t=${Date.now()}`, { cache: 'no-store' })).json();
 if (r.success) {
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: r.data });
 } else {
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: [] });
 }
 } catch {
 console.error(e);
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: [] });
 } finally {
 setLoadOsDetails(false);
 }
 };

 const fetchTags = async (projId: number) => {
 setLoadTags(true);
 try {
 const r = await (await fetch(`${API_BASE}/acompanhamento/projeto/${projId}/tags?t=${Date.now()}`)).json();
 if (r.success) setTags(r.data);
 else { setTags([]); setMsg({ ok: false, t: r.message }); }
 } catch {
 setTags([]); setMsg({ ok: false, t: 'Erro de conexão.' });
 } finally {
 setLoadTags(false);
 }
 };

 const fetchRncs = async (projId: number, origem: string = 'VISAOGERALPROJ') => {
 setLoadRncs(true);
 try {
 const r = await (await fetch(`${API_BASE}/visao-geral/pendencias/${projId}?origem=${origem}&t=${Date.now()}`)).json();
 if (r.success) setRncs(r.data);
 else { setRncs([]); setMsg({ ok: false, t: r.message }); }
 } catch {
 setRncs([]); setMsg({ ok: false, t: 'Erro de conexão.' });
 } finally {
 setLoadRncs(false);
 }
 };

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
 } catch { console.error('Erro ao processar ProcessosVisiveis:', e); }
 }
 } catch { console.error(e); }
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
 const updates: Record<string, unknown>[] = [];
 
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
 } catch (error: unknown) {
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

 const salvarObservacaoTag = async (tId: number, obs: string) => {
 setIsSaving(true); setMsg(null);
 try {
 const r = await (await fetch(`${API_BASE}/acompanhamento/tags/${tId}/observacao`, {
 method: 'PUT', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ observacao: obs, usuario: getUser() })
 })).json();
 
 if (r.success) {
 setTags(ts => ts.map(x => x.IdTag === tId ? { ...x, Observacao: obs } : x));
 setMsg({ ok: true, t: 'Observação da tag salva!' });
 setTimeout(() => setMsg(null), 1500);
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
 
 const groupedProjs = filteredProj.reduce((acc, p) => {
 const client = p.DescEmpresa?.trim() || 'SEM CLIENTE DEFINIDO';
 if (!acc[client]) acc[client] = [];
 acc[client].push(p);
 return acc;
 }, {} as Record<string, Projeto[]>);
 const filteredTags = tags.filter(t => {
 if (fTag && !t.Tag?.toLowerCase().includes(fTag.toLowerCase()) && !t.DescTag?.toLowerCase().includes(fTag.toLowerCase())) return false;
 const tEntrada = t.DataEntrada ? brToIso(t.DataEntrada) : '';
 const tPrev = t.DataPrevisao ? brToIso(t.DataPrevisao) : '';
 if (fDataEntradaIni && tEntrada && tEntrada < fDataEntradaIni) return false;
 if (fDataEntradaFim && tEntrada && tEntrada > fDataEntradaFim) return false;
 if (fDataPrevIni && tPrev && tPrev < fDataPrevIni) return false;
 if (fDataPrevFim && tPrev && tPrev > fDataPrevFim) return false;

 if (fDataPlanIni || fDataPlanFim) {
 const sectors = [
 { i: t.PlanejadoInicioCorte, f: t.PlanejadoFinalCorte },
 { i: t.PlanejadoInicioDobra, f: t.PlanejadoFinalDobra },
 { i: t.PlanejadoInicioSolda, f: t.PlanejadoFinalSolda },
 { i: t.PlanejadoInicioPintura, f: t.PlanejadoFinalPintura },
 { i: t.PlanejadoInicioMontagem, f: t.PlanejadoFinalMontagem }
 ];
 
 const hasOverlappingPlanning = sectors.some(s => {
 const sIni = s.i ? brToIso(s.i) : '';
 const sFim = s.f ? brToIso(s.f) : '';
 
 if (!sIni && !sFim) return false;

 const sectorStart = sIni || sFim;
 const sectorEnd = sFim || sIni;
 
 const filterStart = fDataPlanIni || '0000-01-01';
 const filterEnd = fDataPlanFim || '9999-12-31';

 return (sectorStart <= filterEnd) && (sectorEnd >= filterStart);
 });

 if (!hasOverlappingPlanning) return false;
 }

 return true;
 });
 const filteredRncs = rncs.filter(r => showFinalizedRncs || r.Estatus !== 'FINALIZADO');

 return (
 <div className="h-full flex flex-col font-sans bg-[#f4f7f9] overflow-hidden">
 {!fromGlobal ? (
 <>
 {/* Header / Filters Block */}
 {!isExpanded && (
 <div className="bg-white border-b px-4 py-1.5 flex flex-col gap-3 shrink-0 shadow-sm z-10 w-full relative">
 
 {/* Linha 1: Pesquisa Texto e Checkboxes */}
 <div className="flex flex-col md:flex-row items-center gap-3 w-full pr-10">
 <div className="flex items-center gap-2 flex-1 w-full md:w-auto bg-[#f8fafc] border border-slate-200 rounded-md px-4 py-1.5 focus-within:ring-2 focus-within:ring-[#32423D]/30 transition-shadow">
 <Search className="text-slate-400" size={14} />
 <div className="relative flex items-center w-full">
 <input type="text" placeholder="Buscar projeto..." value={fProj} onChange={e => setFProj(e.target.value)} className="pr-6 bg-transparent border-none outline-none flex-1 font-medium text-xs text-slate-700" />
 {fProj && (
 <button onClick={() => setFProj('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
 {/* === FILTRO RADIO: 3 opções mutuamente exclusivas === */}
 <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shadow-inner">
 {/* 1 - Finalizados */}
 <button
 onClick={() => {
 const next = statusFilter === 'finalizados' ? null : 'finalizados';
 setStatusFilter(next);
 fetchProj(next);
 }}
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all ${
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
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all ${
 statusFilter === 'liberados'
 ? 'bg-[#32423D] text-white shadow-sm'
 : 'text-slate-500 hover:text-[#32423D]/70 hover:bg-[#E0E800]/10'
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
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all ${
 statusFilter === 'todos'
 ? 'bg-slate-700 text-white shadow-sm'
 : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
 }`}
 >
 <List size={11} /> Todos
 </button>
 </div>

 {/* View Mode */}
 <div className="hidden md:flex bg-slate-100 p-0.5 rounded-lg items-center shadow-inner">
 <button onClick={() => setViewMode('card')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'card' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <LayoutGrid size={14} /> Cards
 </button>
 <button onClick={() => setViewMode('list')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <List size={14} /> Lista
 </button>
 <button onClick={() => setViewMode('tags')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'tags' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <TagIcon size={14} /> Tags Globais
 </button>
 </div>
 <button onClick={() => fetchProj(statusFilter)} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#32423D] text-white font-bold text-[10px] hover:bg-[#32423D]/80 transition shadow-sm"><Search size={12} /> Pesquisar</button>
 
 {/* Limpar */}
 <button onClick={() => {
 setStatusFilter(null);
 setFProj('');
 setFProjCriacaoIni(''); setFProjCriacaoFim('');
 setFProjPrevIni(''); setFProjPrevFim('');
 fetchProj(null);
 }} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-bold text-[10px] transition border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
 <X size={11} /> Limpar
 </button>
 </div>
 </div>

 {/* Linha 2: Filtros de Data do Projeto */}
 <div className="flex flex-col lg:flex-row items-center gap-4 w-full p-2 bg-slate-50/50 rounded-md border border-slate-100">
 {/* Data Criação */}
 <div className="flex items-center gap-2 w-full lg:w-auto">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap"><CalendarDays size={12} className="inline mr-1"/> Dt. Criação:</span>
 <div className="flex items-center gap-1 flex-1 lg:flex-none">
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjCriacaoIni} onChange={e => setFProjCriacaoIni(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjCriacaoIni && (
 <button onClick={() => setFProjCriacaoIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-slate-400 text-[10px]">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjCriacaoFim} onChange={e => setFProjCriacaoFim(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjCriacaoFim && (
 <button onClick={() => setFProjCriacaoFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 </div>
 
 <div className="hidden lg:block w-px h-4 bg-slate-200"></div>

 {/* Data Previsão */}
 <div className="flex items-center gap-2 w-full lg:w-auto">
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap"><CalendarDays size={12} className="inline mr-1"/> Dt. Previsão:</span>
 <div className="flex items-center gap-1 flex-1 lg:flex-none">
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjPrevIni} onChange={e => setFProjPrevIni(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjPrevIni && (
 <button onClick={() => setFProjPrevIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-slate-400 text-[10px]">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjPrevFim} onChange={e => setFProjPrevFim(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjPrevFim && (
 <button onClick={() => setFProjPrevFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Main Grid Toolbar */}
 <div className="px-6 py-2 border-b border-gray-300 flex items-center justify-between bg-white shrink-0 shadow-sm z-10">
 <div className="font-bold text-gray-800 text-xs flex items-center gap-2">
 Visão Geral Produção
 </div>
 <div className="flex items-center gap-2">
 <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors" title={isExpanded ? "Restaurar tamanho" : "Expandir grid"}>
 {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
 </button>
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
 ) : viewMode === 'tags' ? (
 <div className="px-6 pb-6 h-full flex flex-col">
 <VisaoGeralTagsGlobais onVoltar={() => setViewMode('card')} />
 </div>
 ) : viewMode === 'list' ? (
 <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-auto min-w-full">
 <table className="w-full text-left text-xs whitespace-nowrap border-collapse min-w-[800px]">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[10px] border-b border-white/20 sticky top-0 z-10 shadow-sm">
 <tr>
 <th className="px-2 py-0.5 border-r border-slate-100">Projeto</th>
 <th className="px-3 py-3 border-r border-slate-100 text-center">Peças</th>
 <th className="px-3 py-3 border-r border-slate-100 text-center">TAGS / Qtde</th>
 <th className="px-3 py-3 border-r border-slate-100 text-center">OS / Itens</th>
 <th className="px-3 py-3 border-r border-slate-100 text-center">RNCs</th>
 <th className="px-2 py-0.5 border-r border-slate-100 w-32">Datas</th>
 <th className="px-3 py-3 text-center">Ações</th>
 </tr>
 </thead>
 {Object.entries(groupedProjs).sort(([a], [b]) => a.localeCompare(b)).map(([client, projs]) => (
 <tbody key={client} className="divide-y divide-slate-100">
 <tr>
 <td colSpan={7} className="bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 uppercase tracking-widest border-t border-b border-slate-200">
 {client} <span className="text-[10px] ml-2 text-slate-500 font-normal normal-case">({projs.length} projetos)</span>
 </td>
 </tr>
 {projs.map((p, idx) => {
 const isFin = p.Finalizado?.trim() === 'C'; 
 const isLib = p.liberado?.trim() === 'S';
 return (
 <tr key={p.IdProjeto} className={`group hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}>
 <td className="px-2 py-0.5 align-top max-w-[280px] border-r border-slate-100 whitespace-normal">
 <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
 <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">#{p.IdProjeto}</span>
 <div className="font-black text-slate-800 text-[13px] leading-tight" title={p.Projeto}>{p.Projeto}</div>
 </div>
 <div className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed" title={p.DescProjeto}>{p.DescProjeto}</div>
 <div className="flex items-center gap-2 flex-wrap mt-2">
 {isFin && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-200">Finalizado</span>}
 {isLib && !isFin && <span className="text-[9px] font-bold text-[#32423D] bg-blue-100 px-1.5 py-0.5 rounded uppercase leading-none border border-blue-200">Liberado</span>}
 </div>
 </td>
 <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
 <div className="flex flex-col items-center justify-center text-center gap-0.5">
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><TagIcon size={10}/> Peças</div>
 <div className="text-xs font-black text-slate-800">{p.qtdetotalpecas > 0 ? p.qtdetotalpecas : p.QtdePecasTags}</div>
 </div>
 </td>
 <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
 <div className="flex flex-col items-center justify-center text-center gap-0.5">
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><TagIcon size={10}/> Tags</div>
 <div className="text-xs font-black text-slate-800">{p.QtdeTags || 0}</div>
 <div className="flex gap-1 mt-0.5 font-bold text-[8px] uppercase flex-col w-full">
 <span className="text-[#32423D] bg-[#E0E800]/20 border border-blue-100 px-1.5 py-0.5 rounded w-full text-center">Mult: {Number(p.SumQtdeTag || 0).toFixed(0)}</span>
 <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded w-full text-center">Lib: {Number(p.SumQtdeLiberada || 0).toFixed(0)}</span>
 <span className="text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded w-full text-center">Saldo: {Number(p.SumSaldoTag || 0).toFixed(0)}</span>
 </div>
 </div>
 </td>
 <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
 <div 
 className={`flex flex-col items-center justify-center text-center gap-0.5 rounded p-1.5 transition-colors ${p.QtdeOS > 0 ? 'hover:bg-[#E0E800]/10 cursor-pointer group' : ''}`}
 onClick={() => { if (p.QtdeOS > 0) fetchOsForProject(p.IdProjeto); }}
 title={p.QtdeOS > 0 ? "Clique para exibir Ordens de Serviço" : ""}
 >
 <div className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${p.QtdeOS > 0 ? 'text-[#32423D] group-hover:text-[#32423D]' : 'text-slate-400'}`}>
 <ClipboardList size={10}/> OS
 </div>
 <div className={`text-xs font-black flex items-center gap-1.5 transition-colors ${p.QtdeOS > 0 ? 'text-[#32423D] group-hover:text-[#32423D]/70' : 'text-slate-800'}`}>
 {p.QtdeOS || 0}
 {p.QtdeOS > 0 && (
 <span className="text-[8px] bg-blue-100 text-[#32423D] px-1 py-0.5 rounded leading-none group-hover:bg-[#32423D] group-hover:text-white transition-colors uppercase">
 Exibir
 </span>
 )}
 </div>
 <span className={`text-[8px] font-medium uppercase transition-colors ${p.QtdeOS > 0 ? 'text-blue-400 group-hover:text-[#32423D]' : 'text-slate-400'}`}>Total OS</span>
 </div>
 </td>
 <td className="px-3 py-3 align-middle text-center border-r border-slate-100">
 <div onClick={(e) => { e.stopPropagation(); setSelProj(p); fetchRncs(p.IdProjeto); setRncPanel(true); }} className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg group/rnc transition-colors mx-auto w-24 border border-transparent hover:border-slate-200">
 <div className="text-xs font-black text-slate-800 group-hover/rnc:text-red-600 transition-colors flex items-center gap-1"><ShieldAlert size={12}/> {p.qtdernc} Tot</div>
 <div className="flex flex-col gap-1 mt-1 font-bold text-[8px] uppercase w-full">
 <span className="text-red-500 bg-red-50 border border-red-100 px-1 py-0.5 rounded w-full text-center">{p.qtderncPendente} Pend</span>
 <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded w-full text-center">{p.qtderncFinalizada} Fin</span>
 </div>
 </div>
 </td>
 <td className="px-2 py-0.5 align-middle border-r border-slate-100 w-40">
 <div className="flex flex-col gap-3">
 <div className="flex flex-col gap-0.5">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-slate-400"/> Criação</span>
 <span className="text-xs font-bold text-slate-700">{p.DataCriacao || '—'}</span>
 </div>
 <div className="flex flex-col gap-0.5 group/edit">
 <div className="flex justify-between items-center w-full">
 <span className="text-[9px] font-bold text-[#32423D] uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-[#32423D]"/> Prev.</span>
 <button onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-[#32423D] hover:text-[#32423D]/70 font-bold uppercase underline decoration-blue-300 flex items-center gap-0.5" title="Editar Data"><Edit3 size={10}/> Edit</button>
 </div>
 <span className={`text-[11px] font-bold ${businessDaysUntil(p.DataPrevisao) === -1 ? 'text-red-600' : 'text-slate-800'}`}>
 {p.DataPrevisao || 'Não definida'} {businessDaysUntil(p.DataPrevisao) === -1 && '(Atrasado)'}
 </span>
 </div>
 </div>
 </td>
 <td className="px-3 py-3 align-middle text-center min-w-[140px]">
 <div className="flex flex-col gap-1.5 justify-center">
 <button type="button" onClick={() => { if (p.QtdeTags && p.QtdeTags > 0) openDetailsModal(p); }} className={`px-2 py-1 rounded-lg transition-colors border shadow-sm text-[10px] font-black uppercase flex items-center justify-center gap-1.5 w-full ${(!p.QtdeTags || p.QtdeTags === 0) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-[#E0E800]/30 text-[#32423D] hover:bg-[#32423D] hover:text-white border-blue-100'}`}>
 <LayoutGrid size={12} className="pointer-events-none" /> Exibir Detalhes Tag
 </button>
 <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold uppercase">
 <button type="button" onClick={() => { setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'VISAOGERALPROJ'); setActionModal('addRnc'); }} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-1 py-1.5 rounded-lg transition-colors border border-red-100 shadow-sm flex items-center justify-center gap-1" title="Gerar Pendência">
 <ShieldAlert size={12} className="pointer-events-none" /> RNC
 </button>
 <button type="button" onClick={() => { setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'ACAOPCP'); setActionModal('addTask'); }} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-1 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm flex items-center justify-center gap-1" title="Agendar Tarefa">
 <CalendarDays size={12} className="pointer-events-none" /> Tarf
 </button>
 </div>
 {!isFin ? (
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[9px] text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 font-bold uppercase flex items-center justify-center gap-1 transition-colors rounded-lg border border-transparent hover:border-emerald-200 mt-0.5"><CheckCircle size={10} className="pointer-events-none"/> Finalizar Proj.</button>
 ) : (
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('cancelFin'); }} className="text-[9px] text-orange-600 hover:bg-orange-50 px-2 py-1.5 font-bold uppercase flex items-center justify-center gap-1 transition-colors rounded-lg border border-transparent hover:border-orange-200 mt-0.5"><RotateCcw size={10} className="pointer-events-none"/> Cancelar Fin.</button>
 )}
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 ))}
 </table>
 </div>
 ) : (
 <div className="flex flex-col gap-6">
 {Object.entries(groupedProjs).sort(([a], [b]) => a.localeCompare(b)).map(([client, projs]) => (
 <div key={client} className="flex flex-col gap-4">
 <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2">
 {client} <span className="text-xs ml-2 text-slate-500 font-normal normal-case">({projs.length} projetos)</span>
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
 {projs.map(p => {
 const isFin = p.Finalizado?.trim() === 'C'; 
 const isLib = p.liberado?.trim() === 'S';

 return (
 <div key={p.IdProjeto} className="bg-white border border-slate-200 rounded-md shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
 
 {/* Header do Card */}
 <div className={`p-3 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r transition-colors ${(!p.QtdeTags || p.QtdeTags === 0) ? 'opacity-80' : 'hover:bg-slate-50/50 cursor-pointer'}`} onClick={() => { if (p.QtdeTags > 0) openDetailsModal(p); }}>
 <div className="flex-1 mr-4">
 <div className="flex items-center gap-2 flex-wrap mb-1.5">
 <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none border border-slate-200">#{p.IdProjeto}</span>
 {isFin && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase leading-none border border-emerald-200">Finalizado</span>}
 {isLib && !isFin && <span className="text-[9px] font-bold text-[#32423D] bg-blue-100 px-1.5 py-0.5 rounded uppercase leading-none border border-blue-200">Liberado</span>}
 </div>
 <h3 className={`font-black text-slate-800 text-base leading-tight mb-1 transition-colors ${(!p.QtdeTags || p.QtdeTags === 0) ? '' : 'group-hover:text-[#32423D]/70'}`} title={p.Projeto}>{p.Projeto}</h3>
 <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed" title={p.DescProjeto}>{p.DescProjeto}</p>
 </div>
 <button type="button" onClick={() => { if (p.QtdeTags && p.QtdeTags > 0) openDetailsModal(p); }} className={`p-2 rounded-lg transition-colors border shadow-sm shrink-0 ${(!p.QtdeTags || p.QtdeTags === 0) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-[#E0E800]/30 text-[#32423D] hover:bg-[#32423D] hover:text-white border-blue-100'}`} title="Ver Tags Detalhadas">
 <ArrowRight size={15} className="pointer-events-none" />
 </button>
 </div>

 {/* Body do Card (KPIs e Progresso) */}
 <div className="p-3 flex-1 flex flex-col gap-3">
 
 {/* Quadro de KPIs */}
 <div className="grid grid-cols-2 gap-2">
 {/* Tags + Qtde */}
 <div className="bg-slate-50 border border-slate-100 rounded-md p-2.5 flex flex-col justify-center text-center hover:border-blue-200 transition-colors">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center"><TagIcon size={10}/> Tags</span>
 <div className="text-xs font-black text-slate-800">{p.QtdeTags}</div>
 <div className="flex flex-col gap-0.5 mt-1">
 <span className="text-[8px] font-bold text-[#32423D] bg-[#E0E800]/20 border border-blue-100 px-1 py-0.5 rounded">Mult: {Number(p.SumQtdeTag || 0).toFixed(0)}</span>
 <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">Lib: {Number(p.SumQtdeLiberada || 0).toFixed(0)}</span>
 <span className="text-[8px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1 py-0.5 rounded">Saldo: {Number(p.SumSaldoTag || 0).toFixed(0)}</span>
 </div>
 </div>
 {/* OS total (fonte: campo QtdeOS da tag) */}
 <div className="bg-slate-50 border border-slate-100 rounded-md p-2.5 flex flex-col justify-center text-center hover:border-indigo-200 transition-colors">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center"><ClipboardList size={10}/> OS</span>
 <div className="text-xs font-black text-slate-800">{p.QtdeOS || 0}</div>
 <span className="text-[8px] text-slate-400 font-medium mt-0.5">Total OS</span>
 </div>
 {/* RNCs - full width */}
 <div onClick={(e) => { e.stopPropagation(); setSelProj(p); fetchRncs(p.IdProjeto); setRncPanel(true); }} className="bg-slate-50 border border-slate-100 rounded-md p-2.5 flex flex-col justify-center items-center text-center hover:border-red-200 transition-colors cursor-pointer group/rnc col-span-2">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><ShieldAlert size={10}/> RNCs</span>
 <div className="text-base font-black text-slate-800 group-hover/rnc:text-red-600 transition-colors">{p.qtdernc} Total</div>
 <div className="flex gap-1 mt-1 font-bold text-[8px] uppercase">
 <span className="text-red-500 bg-red-50 border border-red-100 px-1 rounded">{p.qtderncPendente} Pend</span>
 <span className="text-emerald-500 bg-emerald-50 border border-emerald-100 px-1 rounded">{p.qtderncFinalizada} Fin</span>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 mt-[-12px]">
 <div className="bg-[#E0E800]/10 border border-blue-100 rounded-md py-2 px-3 flex items-center justify-between">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1"><ClipboardList size={10} className="text-[#32423D]"/> Ordens de Serviço:</span>
 <span className="text-xs font-black text-[#32423D]">{p.QtdeOS || 0}</span>
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
 <div className="bg-slate-50/80 border-t border-slate-100 px-2 py-1 flex gap-3 justify-between items-center sm:flex-row flex-col sm:items-center">
 <div className="flex gap-6 w-full sm:w-auto">
 <div className="flex flex-col gap-1">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-slate-400"/> Criação</span>
 <span className="text-xs font-bold text-slate-700">{p.DataCriacao || '—'}</span>
 </div>
 <div className="flex flex-col gap-1 w-full sm:w-auto border-l border-slate-200 pl-6">
 <div className="flex justify-between w-full">
 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays size={10} className="text-[#32423D]"/> Entrega Prev.</span>
 <button onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-[#32423D] hover:text-[#32423D]/70 font-bold uppercase underline decoration-blue-300 ml-4 flex items-center gap-0.5"><Edit3 size={10}/> Editar</button>
 </div>
 <span className={`text-xs font-bold ${businessDaysUntil(p.DataPrevisao) === -1 ? 'text-red-600' : 'text-slate-800'}`}>
 {p.DataPrevisao || 'Não definida'} {businessDaysUntil(p.DataPrevisao) === -1 && '(Atrasado)'}
 </span>
 </div>
 </div>
 <div className="flex flex-col gap-1 w-full sm:w-auto border-l border-slate-200 pl-3 shrink-0 items-start">
 <div className="flex gap-2 w-full flex-wrap">
 {!isFin ? (
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold uppercase underline decoration-emerald-300 flex items-center gap-1 transition-colors"><CheckCircle size={12} className="pointer-events-none"/> Finalizar Projeto</button>
 ) : (
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('cancelFin'); }} className="text-[10px] text-orange-600 hover:text-orange-800 font-bold uppercase underline decoration-orange-300 flex items-center gap-1 transition-colors"><RotateCcw size={12} className="pointer-events-none"/> Cancelar Finalização</button>
 )}
 <button type="button" onClick={() => { setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'VISAOGERALPROJ'); setActionModal('addRnc'); }} className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase underline decoration-red-300 flex items-center gap-1 transition-colors"><ShieldAlert size={12} className="pointer-events-none"/> Gerar Pendência</button>
 <button type="button" onClick={() => { setSelProj(p); setRncForm({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '' }); setMsg(null); fetchRncs(p.IdProjeto, 'ACAOPCP'); setActionModal('addTask'); }} className="text-[10px] text-[#32423D] hover:text-[#32423D]/70 font-bold uppercase underline decoration-blue-300 flex items-center gap-1 transition-colors ml-2"><CalendarDays size={12} className="pointer-events-none"/> Agendar Tarefa</button>
 </div>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center p-12 h-full gap-5 mx-6 bg-white shadow-sm border border-slate-200 rounded-md mt-6">
 <div className="bg-[#E0E800]/30 text-[#32423D] w-20 h-20 rounded-full flex items-center justify-center border border-blue-100 shadow-sm animate-pulse">
 <ShieldAlert size={36} />
 </div>
 <div className="text-center">
 <h2 className="text-2xl font-black text-slate-800 mb-2">Log de Pendência (Visão Geral Produção)</h2>
 <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
 A janela de histórico e edição da pendência está aberta automaticamente. Quando finalizar sua consulta, feche o modal da pendência e clique no botão abaixo para retornar.
 </p>
 </div>
 <button 
 onClick={() => window.location.href = '/visao-geral-pendencias'}
 className="mt-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 text-xs px-4 py-1.5 rounded-md transition-colors shadow-sm cursor-pointer flex items-center gap-2"
 >
 &larr; Voltar para Todas as Pendências
 </button>
 </div>
 )}

 {/* ══ MODAL DE COMPLETO DE TAGS DA SEGUNDA TELA ══ */}
 {createPortal(
 <>
 {showDetailsModal && selProj && (
 <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center sm:p-4">
 <div className="bg-white w-full max-w-[100vw] sm:max-w-[95vw] h-full sm:h-[95vh] sm:rounded-md shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
 
 {/* Header Modal */}
 <div className="bg-[#f0f4f8] border-b border-slate-200 px-2 py-0.5 sm:px-6 sm:py-4 shrink-0 flex flex-wrap items-center gap-3 justify-between">
 <div className="flex items-center gap-3 shrink-0">
 <div className="bg-[#32423D] text-white w-10 h-10 rounded-md items-center justify-center font-bold text-xs shadow-sm hidden md:flex">
 <TagIcon size={20} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-2 mb-0.5">
 <span className="text-[11px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded leading-none">#{selProj.IdProjeto}</span>
 <h2 className="text-lg font-black text-slate-800 leading-tight">Projeto: {selProj.Projeto}</h2>
 </div>
 <p className="text-xs font-bold text-slate-600 truncate max-w-xl uppercase">Descrição: {selProj.DescProjeto}</p>
 </div>
 </div>
 
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Entrada:</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataEntradaIni} onChange={e => setFDataEntradaIni(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataEntradaIni && (
 <button onClick={() => setFDataEntradaIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataEntradaFim} onChange={e => setFDataEntradaFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataEntradaFim && (
 <button onClick={() => setFDataEntradaFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev:</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataPrevIni} onChange={e => setFDataPrevIni(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataPrevIni && (
 <button onClick={() => setFDataPrevIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataPrevFim} onChange={e => setFDataPrevFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataPrevFim && (
 <button onClick={() => setFDataPrevFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div className="bg-white rounded-lg border border-slate-200 flex items-center px-2 py-1.5 shadow-sm w-40">
 <Search size={14} className="text-slate-400 mr-2 shrink-0" />
 <div className="relative flex items-center w-full">
 <input type="text" placeholder="Buscar Tag..." value={fTag} onChange={e => setFTag(e.target.value)} className="pr-6 bg-transparent border-none outline-none text-xs text-slate-700 w-full font-medium" />
 {fTag && (
 <button onClick={() => setFTag('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Plan:</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataPlanIni} onChange={e => setFDataPlanIni(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataPlanIni && (
 <button onClick={() => setFDataPlanIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fDataPlanFim} onChange={e => setFDataPlanFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
 {fDataPlanFim && (
 <button onClick={() => setFDataPlanFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 {(fTag || fDataEntradaIni || fDataEntradaFim || fDataPrevIni || fDataPrevFim || fDataPlanIni || fDataPlanFim) && (
 <button onClick={() => { setFTag(''); setFDataEntradaIni(''); setFDataEntradaFim(''); setFDataPrevIni(''); setFDataPrevFim(''); setFDataPlanIni(''); setFDataPlanFim(''); }} className="bg-slate-100 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0" title="Limpar filtros">
 <X size={14} /> <span>Limpar</span>
 </button>
 )}
 <div className="h-6 w-px bg-slate-300 hidden sm:block shrink-0"></div>
 <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
 <button onClick={() => setViewModeTags('detailed')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${viewModeTags === 'detailed' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <LayoutGrid size={12} /> Detalhado
 </button>
 <button onClick={() => setViewModeTags('list')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${viewModeTags === 'list' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <List size={12} /> Lista Limpa
 </button>
 </div>
 <button 
 onClick={() => { setBulkSectorDates({}); setMsg(null); setActionModal('bulkDateTags'); }} 
 className="bg-indigo-600 hover:bg-indigo-700 p-2 rounded-lg text-white transition-colors shadow-sm flex items-center gap-2 font-bold text-xs shrink-0"
 title="Planejar datas para TODAS as tags deste projeto"
 >
 <CalendarDays size={14} /> <span>Plan. em Lote</span>
 </button>
 <button onClick={() => setShowDetailsModal(false)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0">
 <X size={14} /> Fechar
 </button>
 </div>
 </div>


 {/* Listagem de Tags Expandida (Tabela Gigante) */}
 <div className="flex-1 overflow-auto bg-white p-0 relative w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
 {loadTags ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3"><Loader className="animate-spin" size={28} /> <span className="text-xs font-bold">Carregando dados das tags...</span></div>
 ) : tags.length === 0 ? (
 <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium">Nenhuma tag localizada.</div>
 ) : (
 <div className="min-w-max pb-32">
 <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-white/20">
 <tr>
 {/* Columns Fixed visually by background */}
 <th className="px-2 py-0.5 border-r border-white/20 bg-[#f8fafc] sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0]">Tag / Descrição</th>
 <th className="px-3 py-3 border-r border-white/20 text-center /50">Cronograma</th>
 <th className="px-3 py-3 border-r border-white/20 text-center /50">Detalhes</th>
 {viewModeTags === 'detailed' ? (
 filteredTagSectors.map(s => <th key={s.k} className="px-3 py-3 border-r border-white/20 text-center min-w-[280px]">Setor: {s.k}</th>)
 ) : (
 <th className="px-3 py-3 border-r border-white/20 text-center min-w-[180px]">Progresso de Setores</th>
 )}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredTags.map((t, idx) => {
 const tFin = t.Finalizado?.trim() !== '';
 return (
 <tr key={t.IdTag} className={`group hover:bg-[#E0E800]/10/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}>
 {/* TAG INFO */}
 <td className="px-2 py-0.5 align-top min-w-[220px] max-w-[280px] border-r border-slate-100 bg-inherit sticky left-0 z-10 shadow-[1px_0_0_#f1f5f9] group-hover:shadow-[1px_0_0_#dbeafe]">
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
 className="bg-[#E0E800]/20 hover:bg-[#E0E800]/20 border border-blue-200 text-[#32423D] px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
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
 <DateBadge editable={false} showStatus={false} date={t.DataEntrada} label="Entrada" />
 <DateBadge editable={true} onClick={() => { setSelTag(t); setDateInput(brToIso(t.DataPrevisao)); setMsg(null); setActionModal('dateTagGlobal'); }} date={t.DataPrevisao} label="Previsão" />
 </div>
 </td>

 {/* DETALHES TAG */}
 <td className="px-3 py-4 align-top border-r border-slate-100 bg-slate-50/30">
 <div className="grid grid-cols-2 gap-x-4 gap-y-3 w-48 text-[10px]">
 <div 
 className={`flex flex-col rounded p-1.5 -ml-1.5 transition-colors ${parseInt(t.QtdeOS || '0') > 0 ? 'hover:bg-[#E0E800]/10 cursor-pointer group' : ''}`}
 onClick={() => { if (parseInt(t.QtdeOS || '0') > 0) fetchOsForTag(t.IdTag); }}
 title={parseInt(t.QtdeOS || '0') > 0 ? "Clique para exibir Ordens de Serviço" : ""}
 >
 <span className={`font-bold uppercase tracking-widest text-[8px] transition-colors ${parseInt(t.QtdeOS || '0') > 0 ? 'text-[#32423D] group-hover:text-[#32423D]' : 'text-slate-400'}`}>Qtd. OS</span>
 <span className={`font-black flex items-center gap-2 transition-colors ${parseInt(t.QtdeOS || '0') > 0 ? 'text-[#32423D] group-hover:text-[#32423D]/70' : 'text-slate-700'}`}>
 {t.QtdeOS || '0'}
 {parseInt(t.QtdeOS || '0') > 0 && (
 <span className="text-[9px] bg-blue-100 text-[#32423D] px-1.5 py-0.5 rounded leading-none group-hover:bg-[#32423D] group-hover:text-white transition-colors uppercase">
 Exibir
 </span>
 )}
 </span>
 </div>
 <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Qtd. Peças</span><span className="font-black text-slate-700">{t.QtdeTotalPecas || '0'}</span></div>
 <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Liberada</span><span className="font-bold text-emerald-600">{t.QtdeLiberada || '0'}</span></div>
 <div className="flex flex-col"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Saldo</span><span className="font-bold text-orange-600">{t.SaldoTag || '0'}</span></div>
 <div className="flex flex-col col-span-2 mt-0.5 pt-1.5 border-t border-slate-100">
 <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Multiplicador Tag</span>
 <span className="font-bold text-[#32423D]">{t.QtdeTag || '1'} <span className="text-[8px] font-normal text-slate-400 lowercase">(x a produzir)</span></span>
 </div>
 {t.ValorTag && <div className="flex flex-col col-span-2 mt-1"><span className="font-bold text-slate-400 uppercase tracking-widest text-[8px] flex items-center gap-0.5"><DollarSign size={8}/> Valor</span><span className="font-bold text-slate-700">R$ {parseFloat(t.ValorTag).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>}
 <div className="flex flex-col col-span-2 mt-1">
 <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px] mb-0.5">Observação</span>
 <div className="flex items-start gap-1">
 <textarea
 id={`obs_tag_${t.IdTag}`}
 className="flex-1 bg-white/50 border border-slate-200 rounded p-1 text-[10px] text-slate-700 outline-none focus:border-[#32423D] focus:bg-white transition-colors resize-none overflow-hidden"
 defaultValue={t.Observacao || ''}
 placeholder="Inserir observação..."
 onMouseEnter={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
 onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
 onBlur={(e) => { if (e.target.value !== (t.Observacao || '')) salvarObservacaoTag(t.IdTag, e.target.value); }}
 rows={(t.Observacao || '').split('\n').length || 1}
 />
 <button
 onClick={(e) => {
 e.stopPropagation();
 const el = document.getElementById(`obs_tag_${t.IdTag}`) as HTMLTextAreaElement;
 if (el && el.value !== (t.Observacao || '')) salvarObservacaoTag(t.IdTag, el.value);
 }}
 className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded border border-emerald-200 transition-colors"
 title="Salvar Observação"
 >
 <CheckCircle size={12} />
 </button>
 </div>
 </div>
 </div>
 </td>

 {/* SETORES */}
 {viewModeTags === 'detailed' ? (
 filteredTagSectors.map(s => {
 const e = toNum(t[s.ex as keyof Tag]), tot = toNum(t[s.t as keyof Tag]), raw = toNum(t[s.p as keyof Tag]), pct = raw || safePct(e, tot);
 const pIni = t[s.fields.pi as keyof Tag] as string, pFim = t[s.fields.pf as keyof Tag] as string;
 const rIni = t[s.fields.ri as keyof Tag] as string, rFim = t[s.fields.rf as keyof Tag] as string;
 return (
 <td key={s.k} className="px-2 py-0.5 align-top border-r border-slate-100 hover:bg-slate-50/80 transition-colors">
 <div className="flex flex-col w-full h-full justify-between">
 {/* Progresso Cima */}
 <div className="flex items-center justify-between w-full">
 <span className="text-[10px] font-black text-slate-700">{pct}%</span>
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
 <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap group-hover/edit:text-[#32423D] transition-colors ${!pIni ? 'text-slate-300 border-dashed border-slate-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{pIni || 'Definir'}</span>
 </div>
 <div className="flex items-center justify-between gap-0.5">
 <span className="text-[7.5px] font-bold text-slate-400 uppercase leading-none w-10 shrink-0">Plan. Fim</span>
 <span className={`inline-flex items-center px-1 py-0.5 rounded text-[8px] border font-bold whitespace-nowrap group-hover/edit:text-[#32423D] transition-colors ${!pFim ? 'text-slate-300 border-dashed border-slate-200' : (businessDaysUntil(pFim) === -1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200')}`}>{pFim || 'Definir'}</span>
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
 })
 ) : (
 <td className="px-2 py-0.5 align-top border-r border-slate-100">
 <div className="flex flex-col gap-2 h-full justify-start">
 <button 
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
 className="w-full text-[9px] bg-slate-100 hover:bg-[#32423D] hover:text-white border border-slate-200 text-slate-500 font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-colors mb-1"
 >
 <CalendarDays size={10} /> Planejar Setores
 </button>
 {filteredTagSectors.map(s => {
 const e = toNum(t[s.ex as keyof Tag]), tot = toNum(t[s.t as keyof Tag]), raw = toNum(t[s.p as keyof Tag]), pct = raw || safePct(e, tot);
 return (
 <div key={s.k} className="flex flex-col gap-1 w-full bg-slate-50/50 p-1.5 rounded border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
 <div className="flex justify-between items-center w-full">
 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${s.c}`} />{s.k}</span>
 <span className={`text-[10px] font-black ${pct >= 100 && tot > 0 ? "text-emerald-600" : "text-slate-700"}`}>{pct}% <span className="text-[8px] text-slate-400 font-normal ml-0.5">({e}/{tot})</span></span>
 </div>
 </div>
 )
 })}
 </div>
 </td>
 )}
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
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
 <div className="flex justify-between items-start mb-4">
 <div><h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg"><CalendarDays size={15} className="text-[#32423D]" /> Editar Data Previsão</h3><p className="text-[11px] font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 mt-1.5 rounded-md text-slate-600 inline-block">{actionModal === 'dateTagGlobal' ? `Tag: ${selTag?.Tag}` : `${selProj?.Projeto}`}</p></div>
 <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-md"><X size={15} /></button>
 </div>
 <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full border-2 border-slate-200 hover:border-blue-300 rounded-md px-2 py-0.5 text-slate-700 outline-none focus:border-[#32423D] transition mb-4 font-bold" />
 
 {actionModal === 'dateProj' && (
 <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-md text-xs mb-5 cursor-pointer hover:bg-slate-100 border border-slate-200 transition-colors">
 <input type="checkbox" checked={updateTagsCheck} onChange={e => setUpdateTagsCheck(e.target.checked)} className="rounded border-slate-300 text-[#32423D] mt-1 w-4 h-4" />
 <div className="leading-tight"><span className="font-bold text-slate-800 text-xs">Atualizar tags em cascata</span><br/><span className="text-[10px] text-slate-500 font-medium">Aplica a data para todas as filhas deste projeto</span></div>
 </label>
 )}

 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.t}</div>}
 <button onClick={actionModal === 'dateProj' ? salvarDataProj : salvarDataTagPrevisao} disabled={!dateInput || isSaving} className="w-full bg-[#32423D] hover:bg-[#32423D]/80 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-md transition-all shadow-md shadow-blue-500/20 flex justify-center items-center gap-2">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Data Previsão'}
 </button>
 </div>
 </div>
 )}

 {/* Modal Editar Multiplas Datas Planejadas (Tags) */}
 {actionModal === 'dateTagSetores' && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
 <div className="bg-white rounded-md w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
 <div><h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={15} className="text-[#32423D]" /> Planejamento de Setores</h3><p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag?.Tag}</p></div>
 <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={15} /></button>
 </div>
 
 <div className="p-6 overflow-auto bg-white flex-1 relative">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" style={{ gridTemplateColumns: `repeat(${Math.min(filteredTagSectors.length, 3)}, minmax(0, 1fr))` }}>
 {filteredTagSectors.map(s => (
 <div key={s.k} className="bg-slate-50 border border-slate-200 rounded-md p-4">
 <div className="font-black text-slate-700 uppercase tracking-widest text-xs mb-4 pb-2 border-b border-slate-200 border-dashed flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${s.c}`}></div> Setor: {s.k}</div>
 <div className="flex flex-col gap-3">
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Inicial</label>
 <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-[#32423D] outline-none" 
 value={tagSectorDates[s.fields.pi] || ''} onChange={(e) => setTagSectorDates(prev => ({...prev, [s.fields.pi]: e.target.value}))}/>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Final</label>
 <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-[#32423D] outline-none" 
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
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
 <button onClick={salvarDatasTagSetores} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-[#32423D] hover:bg-[#32423D]/80 text-white shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Todos os Setores'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Modal Planejamento em Lote */}
 {actionModal === 'bulkDateTags' && selProj && (
 <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md w-full max-w-4xl max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
 <div>
 <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><CalendarDays size={20} className="text-indigo-600" /> Planejamento em Lote (Projeto)</h3>
 <p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Projeto: {selProj.Projeto} - Descrição: {selProj.DescProjeto}</p>
 </div>
 <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={15} /></button>
 </div>

 <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0">
 <p className="text-xs text-amber-800 font-medium leading-relaxed flex items-center gap-2">
 <ShieldAlert size={14} /> Esta ação aplicará as datas nos setores preenchidos para <strong>TODAS as TAGS</strong> deste projeto. Todas as tags serão atualizadas com as novas datas.
 </p>
 </div>

 <div className="p-6 overflow-auto bg-white flex-1 relative">
 {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center"><Loader className="animate-spin text-indigo-600" size={42} /></div>}
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredTagSectors.map(s => (
 <div key={`bulk_${s.k}`} className="bg-slate-50 border border-slate-200 rounded-md p-4 shadow-sm">
 <div className="font-black text-slate-700 uppercase tracking-widest text-xs mb-4 pb-2 border-b border-slate-200 border-dashed flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${s.c}`}></div> Setor: {s.k}</div>
 <div className="flex flex-col gap-3">
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Inicial</label>
 <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors" 
 value={bulkSectorDates[s.fields.pi] || ''} onChange={(e) => setBulkSectorDates(prev => ({...prev, [s.fields.pi]: e.target.value}))}/>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Plan. Final</label>
 <input type="date" className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors" 
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
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
 <button onClick={salvarDatasBulkTags} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
 <CheckCircle size={15}/> Aplicar Planejamento em Lote
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 
 {/* Modal Planejar Projetista / Engenharia */}
 {actionModal === 'planejarProjetista' && selTag && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
 <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
 <div>
 <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Edit3 size={15} className="text-indigo-600" /> Planejar Projetista / Engenharia</h3>
 <p className="text-[11px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag.Tag}</p>
 </div>
 <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={15} /></button>
 </div>
 
 <div className="p-6 overflow-auto bg-white flex-1 relative">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <div className="md:col-span-3">
 <label className="text-xs font-bold text-slate-600 uppercase">Projetista Planejado <span className="text-red-500">*</span></label>
 <select value={planejarProjetistaForm.projetistaPlanejado} onChange={e => setPlanejarProjetistaForm(prev => ({...prev, projetistaPlanejado: e.target.value}))} className="mt-1.5 w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer bg-white">
 <option value="">Selecione um Projetista...</option>
 {planejarProjetistaForm.projetistaPlanejado && !usuarios.find(u => u.NomeCompleto === planejarProjetistaForm.projetistaPlanejado) && <option value={planejarProjetistaForm.projetistaPlanejado}>{planejarProjetistaForm.projetistaPlanejado}</option>}
 {usuarios.map(u => <option key={`eng_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
 </select>
 </div>
 <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-5 pt-4 md:pt-0">
 <label className="text-[10px] font-bold text-slate-500 uppercase">Início Engenharia (Plan) <span className="text-red-500">*</span></label>
 <input type="date" className="mt-1 md:mt-2 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none" 
 value={planejarProjetistaForm.planejadoInicioEngenharia} onChange={(e) => setPlanejarProjetistaForm(prev => ({...prev, planejadoInicioEngenharia: e.target.value}))}/>
 </div>
 <div className="md:col-span-1 pt-4 md:pt-0">
 <label className="text-[10px] font-bold text-slate-500 uppercase">Fim Engenharia (Plan) <span className="text-red-500">*</span></label>
 <input type="date" className="mt-1 md:mt-2 w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none" 
 value={planejarProjetistaForm.planejadoFinalEngenharia} onChange={(e) => setPlanejarProjetistaForm(prev => ({...prev, planejadoFinalEngenharia: e.target.value}))}/>
 </div>
 </div>
 </div>

 <div className="p-5 border-t border-slate-200 bg-[#f8fafc] shrink-0 flex items-center justify-between">
 <span className="text-xs font-medium text-slate-500">Todos os campos desta tela são obrigatórios.</span>
 <div className="flex gap-3 items-center">
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold flex items-center ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <button onClick={() => setActionModal(null)} className="px-5 py-2.5 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
 <button onClick={salvarPlanejamentoProjetista} disabled={isSaving} className="px-6 py-2.5 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 flex items-center gap-2 transition-all disabled:opacity-50">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Planejamento'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Modal Alterar Qtde Liberada */}
 {actionModal === 'alterarQtdeLiberada' && selTag && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
 <div className="bg-white rounded-md w-full max-w-sm max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
 <div>
 <h3 className="font-black text-slate-800 flex items-center gap-2 text-base"><Edit3 size={14} className="text-emerald-600" /> Alterar Qtde Liberada</h3>
 <p className="text-[10px] font-bold bg-white shadow-sm border border-slate-200 px-2 py-0.5 mt-1 rounded-md text-slate-600 inline-block uppercase">Tag: {selTag.Tag}</p>
 </div>
 <button onClick={() => setActionModal(null)} className="text-slate-400 bg-white shadow-sm hover:bg-slate-100 p-2 rounded-lg border border-slate-200 transition-colors"><X size={14} /></button>
 </div>
 
 <div className="p-6 overflow-auto bg-white flex-1 relative">
 <div className="flex justify-between items-center mb-5 p-4 bg-slate-50 border border-slate-200 rounded-md">
 <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Qtd. Tag (Total)</span><span className="text-lg font-black text-slate-700">{selTag.QtdeTag || '0'}</span></div>
 <div className="w-px h-8 bg-slate-200"></div>
 <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-400 uppercase">Saldo Atual</span><span className="text-lg font-black text-orange-600">{selTag.SaldoTag || '0'}</span></div>
 </div>

 <label className="text-xs font-bold text-slate-600 uppercase">Nova Qtde. Liberada <span className="text-red-500">*</span></label>
 <input 
 type="number" 
 min="0" 
 step="any"
 className="mt-1.5 w-full border-2 border-slate-200 rounded-md px-2 py-0.5 text-lg font-black text-emerald-700 focus:border-emerald-500 outline-none transition-colors" 
 value={qtdeLiberadaForm.qtdeLiberada} 
 onChange={(e) => setQtdeLiberadaForm({ qtdeLiberada: e.target.value })}
 />
 {parseFloat(qtdeLiberadaForm.qtdeLiberada) > parseFloat(selTag.QtdeTag || '0') && (
 <p className="text-[10px] font-bold text-red-500 mt-2">A quantidade liberada não pode ser maior que a total ({selTag.QtdeTag}).</p>
 )}
 </div>

 <div className="p-5 border-t border-slate-200 bg-[#f8fafc] shrink-0">
 {msg && <div className={`px-2 py-1.5 rounded-lg text-xs uppercase font-bold text-center mb-3 ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{msg.t}</div>}
 <div className="flex gap-2 w-full">
 <button onClick={() => setActionModal(null)} className="flex-1 py-3 rounded-md text-xs font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
 <button onClick={salvarQtdeLiberada} disabled={isSaving || parseFloat(qtdeLiberadaForm.qtdeLiberada) > parseFloat(selTag.QtdeTag || '0')} className="flex-1 py-3 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/30 flex justify-center items-center gap-2 transition-all disabled:opacity-50">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Salvar Qtde'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 
 {/* Modal Finalizar Tag */}
 {actionModal === 'finTag' && selTag && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
 <div className="flex flex-col items-center text-center mb-4">
 <CheckCircle size={36} className="text-emerald-500 mb-2" />
 <h3 className="font-bold text-lg text-emerald-700">Finalizar Tag(s)</h3>
 <p className="text-xs font-bold text-slate-600 mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 max-w-full truncate">{selTag.Tag}</p>
 </div>
 <div className="text-[11px] text-slate-600 text-center mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
 Deseja finalizar <strong>apenas a tag atual</strong> ou finalizar <strong>todas as tags pendentes</strong> deste projeto ({selProj?.Projeto})?
 </div>
 {msg && <div className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.t}</div>}
 <div className="flex flex-col gap-2">
 <button onClick={e => { e.preventDefault(); salvarFinalizarTag(false); }} disabled={isSaving} className="w-full text-white font-bold text-xs py-2.5 rounded-lg transition-all shadow-md flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 border border-emerald-700">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Finalizar Apenas Esta Tag'}
 </button>
 <button onClick={e => { e.preventDefault(); salvarFinalizarTag(true); }} disabled={isSaving} className="w-full text-indigo-700 font-bold text-xs py-2.5 rounded-lg transition-all flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200">
 {isSaving ? <Loader className="animate-spin" size={14} /> : 'Finalizar Todas as Tags!'}
 </button>
 <div className="w-full h-px bg-slate-200 my-1"></div>
 <button onClick={() => setActionModal(null)} className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-bold text-xs py-2.5 rounded-lg transition-colors">Cancelar</button>
 </div>
 </div>
 </div>
 )}

 {/* Modal Finalizar Projeto */}
 {(actionModal === 'fin' || actionModal === 'cancelFin') && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
 <div className="flex flex-col items-center text-center mb-4">
 {actionModal === 'fin' ? <CheckCircle size={36} className="text-emerald-500 mb-2" /> : <RotateCcw size={36} className="text-orange-500 mb-2" />}
 <h3 className={`font-bold text-lg ${actionModal === 'fin' ? 'text-emerald-700' : 'text-orange-700'}`}>{actionModal === 'fin' ? 'Finalizar Projeto' : 'Desfazer Finalização'}</h3>
 <p className="text-xs font-bold text-slate-600 mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 max-w-full truncate">{selProj?.Projeto}</p>
 </div>
 <div className="text-[11px] text-slate-600 text-center mb-5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
 {actionModal === 'fin' ? 'Este projeto, tags e OS vinculadas serão marcados como finalizados.' : 'O projeto voltará para a esteira de liberação/produção ativa.'}
 </div>
 {msg && <div className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-center mb-4 ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.t}</div>}
 <div className="flex gap-2">
 <button onClick={() => setActionModal(null)} className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-bold text-xs py-2 rounded-lg transition-colors">Cancelar</button>
 <button onClick={e => { e.preventDefault(); if (actionModal === 'fin') { finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/finalizar`, true); } else { finProj(`${API_BASE}/visao-geral/projeto/${selProj?.IdProjeto}/cancelar-finalizacao`, false); } }} disabled={isSaving} className={`flex-1 text-white font-bold text-xs py-2 rounded-lg transition-all shadow-md flex justify-center items-center gap-2 ${actionModal === 'fin' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-50`}>{isSaving ? <Loader className="animate-spin" size={14} /> : 'Confirmar'}</button>
 </div>
 </div>
 </div>
 )}

 {/* Modal Nova Pendência (RNC) - FULL MANAGER */}
 {actionModal === 'addRnc' && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md p-5 w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
 
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
 <button onClick={() => window.location.href = '/visao-geral-pendencias'} className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
 &larr; Voltar
 </button>
 )}
 <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
 </div>
 </div>

 {/* ÁREA DE FORMULÁRIO (TOP) */}
 <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-4 mb-4 shrink-0 shadow-sm relative">
 {/* Overlay de Loading do Salvar */}
 {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-md z-10 flex items-center justify-center"><Loader className="animate-spin text-red-600" size={28} /></div>}
 
 <div className="flex justify-between items-center mb-3">
 <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5"><Edit3 size={14}/> {rncForm.idRnc ? `Editando Pendência #${rncForm.idRnc}` : 'Nova Pendência'}</h4>
 <div className="flex gap-2 items-center">
 {rncForm.idRnc && rncForm.estatus !== 'FINALIZADO' && !rncForm.wantsToFinalize && (
 <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: true, dataFin: new Date().toISOString().split('T')[0]}))} className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
 <CheckCircle size={14}/> Habilitar Finalização
 </button>
 )}
 {rncForm.wantsToFinalize && (
 <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: false}))} className="px-2 py-0.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
 Cancelar Finalização
 </button>
 )}
 <button onClick={() => setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false })} className="px-2 py-0.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Novo</button>
 <button onClick={salvarNovaRnc} disabled={!rncForm.descricao.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-[#32423D] hover:bg-[#32423D]/80 border border-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><ShieldAlert size={12}/> Salvar Dados</button>
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
 <textarea value={rncForm.descricao} onChange={e => setRncForm(prev => ({...prev, descricao: e.target.value.toUpperCase()}))} rows={2} placeholder="Descreva a pendência..." className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-red-400 resize-none font-medium" />
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
 <textarea disabled={rncForm.estatus === 'FINALIZADO'} value={rncForm.descFin} onChange={e => setRncForm(prev => ({...prev, descFin: e.target.value.toUpperCase()}))} rows={1} placeholder="Detalhes de como foi resolvido..." className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2 py-0.5 text-xs text-emerald-800 outline-none focus:border-emerald-400 resize-none font-medium disabled:opacity-75" />
 </div>
 </div>
 )}

 {msg && <div className={`mt-3 px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-center ${msg.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{msg.t}</div>}
 </div>

 {/* ÁREA DE GRID (BOTTOM) */}
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-slate-200 rounded-md relative">
 {/* Toggle Filtro */}
 <div className="bg-[#f8fafc] border-b border-slate-200 px-2 py-1 flex justify-between items-center shrink-0">
 <h5 className="text-[10px] font-bold text-slate-500 uppercase">Histórico de Pendências</h5>
 <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 cursor-pointer hover:text-slate-800 transition-colors">
 <input type="checkbox" checked={showFinalizedRncs} onChange={e => setShowFinalizedRncs(e.target.checked)} className="accent-blue-500" /> Mostrar Finalizadas
 </label>
 </div>

 {loadRncs ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50 z-10"><Loader className="animate-spin" size={28} /> <span className="text-xs font-bold">Carregando pendências...</span></div>
 ) : rncs.length === 0 ? (
 <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium bg-slate-50">Nenhuma pendência encontrada.</div>
 ) : (
 <div className="flex-1 py-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 [&::-webkit-scrollbar]:h-2 relative bg-white min-h-0">
 <div className="w-max min-w-full pb-2">
 <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-white/20">
 <tr>
 
 <th className="px-2 py-1.5">Status</th>
 <th className="px-2 py-1.5">Descrição</th>
 <th className="px-2 py-1.5">Responsável</th>
 <th className="px-2 py-1.5">Tipo Tarefa</th>
 <th className="px-2 py-1.5">Setor</th>
 <th className="px-2 py-1.5 text-right flex-1">Data Cri.</th>
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
 })} className={`cursor-pointer group hover:bg-[#E0E800]/10 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'} ${r.Estatus === 'FINALIZADO' ? 'opacity-60' : ''}`}>
 <td className="px-2 py-1 font-mono font-bold text-slate-600 text-[10px]">#{r.IdRnc}</td>
 <td className="px-2 py-1"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.Estatus || 'Aberta'}</span></td>
 <td className="px-2 py-1 max-w-[200px] truncate font-medium text-slate-700" title={r.DescricaoPendencia}>{r.DescricaoPendencia}</td>
 <td className="px-2 py-1 truncate max-w-[120px] text-slate-600">{r.UsuarioResponsavel || '—'}</td>
 <td className="px-2 py-1 truncate max-w-[120px] text-slate-600 font-medium">{r.TipoTarefa || '—'}</td>
 <td className="px-2 py-1 font-bold text-slate-600 text-[9px] uppercase"><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>{r.SetorResponsavel}</span></td>
 <td className="px-2 py-1 text-right font-mono text-[9px] text-slate-400">{r.DataCriacao}</td>
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
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
 <div className="bg-white rounded-md p-5 w-full max-w-4xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
 
 {/* HEADER DA MODAL */}
 <div className="flex justify-between items-start mb-4 shrink-0">
 <div>
 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xl"><CalendarDays size={22} className="text-[#32423D]" /> Agendar Tarefa (PCP)</h3>
 <p className="text-xs font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 mt-1.5 rounded-md text-slate-600 inline-block">
 {selProj?.Projeto} {rncForm.tag ? ` > Tag: ${rncForm.tag}` : ''}
 </p>
 </div>
 <div className="flex items-center gap-2">
 {fromGlobal && (
 <button onClick={() => window.location.href = '/visao-geral-pendencias'} className="px-2 py-0.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1">
 &larr; Voltar
 </button>
 )}
 <button onClick={() => setActionModal(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
 </div>
 </div>

 {/* ÁREA DE FORMULÁRIO (TOP) */}
 <div className="bg-[#f8fafc] border border-slate-200 rounded-md p-4 mb-4 shrink-0 shadow-sm relative">
 {/* Overlay de Loading do Salvar */}
 {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-md z-10 flex items-center justify-center"><Loader className="animate-spin text-[#32423D]" size={28} /></div>}
 
 <div className="flex justify-between items-center mb-3">
 <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5"><Edit3 size={14}/> {rncForm.idRnc ? `Editando Tarefa #${rncForm.idRnc}` : 'Nova Tarefa'}</h4>
 <div className="flex gap-2 items-center">
 {rncForm.idRnc && rncForm.estatus !== 'TarefaFinalizada' && !rncForm.wantsToFinalize && (
 <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: true, dataFin: new Date().toISOString().split('T')[0]}))} className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
 <CheckCircle size={14}/> Habilitar Finalização
 </button>
 )}
 {rncForm.wantsToFinalize && (
 <button onClick={() => setRncForm(p => ({...p, wantsToFinalize: false}))} className="px-2 py-0.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
 Cancelar Finalização
 </button>
 )}
 <button onClick={() => setRncForm({ idTag: rncForm.idTag, tag: rncForm.tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false })} className="px-2 py-0.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Novo</button>
 <button onClick={salvarNovaTarefa} disabled={!rncForm.descricao.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-[#32423D] hover:bg-[#32423D]/80 border border-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"><CalendarDays size={12}/> Agendar Tarefa</button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Responsável</label>
 <select value={rncForm.usuario} onChange={e => setRncForm(prev => ({...prev, usuario: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#32423D]">
 <option value="">Selecione...</option>
 {rncForm.usuario && !usuarios.find(u => u.NomeCompleto === rncForm.usuario) && <option value={rncForm.usuario}>{rncForm.usuario}</option>}
 {usuarios.map(u => <option key={`task_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo de Tarefa</label>
 <select value={rncForm.tipoTarefa} onChange={e => setRncForm(prev => ({...prev, tipoTarefa: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#32423D]">
 <option value="">Selecione...</option>
 {rncForm.tipoTarefa && !tipostarefa.find(t => t.TipoTarefa === rncForm.tipoTarefa) && <option value={rncForm.tipoTarefa}>{rncForm.tipoTarefa}</option>}
 {tipostarefa.map(t => <option key={`task_${t.IdTipoTarefa}`} value={t.TipoTarefa}>{t.TipoTarefa}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Setor</label>
 <select value={rncForm.setor} onChange={e => setRncForm(prev => ({...prev, setor: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#32423D]">
 {filteredSectors.map(s => <option key={`task_${s.k}`} value={s.k}>{s.k}</option>)}
 <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
 {rncForm.setor && !filteredSectors.find(s=>s.k===rncForm.setor) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setor) && <option value={rncForm.setor}>{rncForm.setor}</option>}
 </select>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Data Execução (Prevista)</label>
 <input type="date" value={rncForm.dataExec} onChange={e => setRncForm(prev => ({...prev, dataExec: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#32423D]" />
 </div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Descrição / Notas da Tarefa</label>
 <textarea value={rncForm.descricao} onChange={e => setRncForm(prev => ({...prev, descricao: e.target.value.toUpperCase()}))} rows={2} placeholder="Descreva a tarefa..." className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#32423D] resize-none font-medium" />
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
 <textarea disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.descFin} onChange={e => setRncForm(prev => ({...prev, descFin: e.target.value.toUpperCase()}))} rows={1} placeholder="Detalhes de como foi resolvido..." className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-2 py-0.5 text-xs text-emerald-800 outline-none focus:border-emerald-400 resize-none font-medium disabled:opacity-75" />
 </div>
 </div>
 )}

 {msg && <div className={`mt-3 px-2 py-1 rounded-lg text-[10px] uppercase font-bold text-center ${msg.ok ? 'bg-[#E0E800]/40 text-[#32423D]' : 'bg-red-100 text-red-800'}`}>{msg.t}</div>}
 </div>

 {/* ÁREA DE GRID (BOTTOM) */}
 <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white border border-slate-200 rounded-md relative">
 <div className="bg-[#f8fafc] border-b border-slate-200 px-2 py-1 flex justify-between items-center shrink-0">
 <h5 className="text-[10px] font-bold text-slate-500 uppercase">Histórico de Tarefas (PCP)</h5>
 <button
 onClick={exportarTarefasPCP}
 disabled={filteredRncs.length === 0 || isExporting}
 className="px-2 py-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
 >
 {isExporting ? <Loader className="animate-spin" size={12} /> : <FileDown size={14} />}
 Emitir Relatório
 </button>
 </div>

 {loadRncs ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 bg-slate-50/50 z-10"><Loader className="animate-spin" size={28} /> <span className="text-xs font-bold">Carregando tarefas...</span></div>
 ) : rncs.length === 0 ? (
 <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium bg-slate-50">Nenhuma tarefa encontrada.</div>
 ) : (
 <div className="flex-1 py-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 [&::-webkit-scrollbar]:h-2 relative bg-white min-h-0">
 <div className="w-max min-w-full pb-2">
 <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-white/20">
 <tr>
 
 <th className="px-2 py-1.5">Status</th>
 <th className="px-2 py-1.5">Descrição</th>
 <th className="px-2 py-1.5">Responsável</th>
 <th className="px-2 py-1.5">Tipo Tarefa</th>
 <th className="px-2 py-1.5">Setor</th>
 <th className="px-2 py-1.5 text-right flex-1">Data Cri.</th>
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
 })} className={`cursor-pointer group hover:bg-[#E0E800]/10 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'} ${r.Estatus === 'TarefaFinalizada' ? 'opacity-60' : ''}`}>
 <td className="px-2 py-1 font-mono font-bold text-slate-600 text-[10px]">#{r.IdRnc}</td>
 <td className="px-2 py-1"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-[#E0E800]/30 text-[#32423D] border-blue-100'}`}>{r.Estatus || 'Aberta'}</span></td>
 <td className="px-2 py-1 max-w-[200px] truncate font-medium text-slate-700" title={r.DescricaoPendencia}>{r.DescricaoPendencia}</td>
 <td className="px-2 py-1 truncate max-w-[120px] text-slate-600">{r.UsuarioResponsavel || '—'}</td>
 <td className="px-2 py-1 truncate max-w-[120px] text-slate-600 font-medium">{r.TipoTarefa || '—'}</td>
 <td className="px-2 py-1 font-bold text-slate-600 text-[9px] uppercase"><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>{r.SetorResponsavel}</span></td>
 <td className="px-2 py-1 text-right font-mono text-[9px] text-slate-400">{r.DataCriacao}</td>
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
 <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 ">
 <div className="absolute inset-0" onClick={() => { setRncPanel(false); if (showDetailsModal) setShowDetailsModal(true); }} />
 <div className="w-[450px] max-w-full bg-slate-50 relative flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
 <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 shadow-sm"><div className="flex flex-col"><div className="flex items-center gap-2 font-black text-red-600 text-base"><ShieldAlert size={15} /> Ocorrências (RNC)</div><div className="text-[10px] font-bold text-slate-500 mt-0.5 truncate max-w-[300px]">{selProj.Projeto}</div></div><button className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-md text-slate-600 transition-colors" onClick={() => { setRncPanel(false); }}><X size={14} /></button></div>
 <div className="flex-1 overflow-auto p-4 md:p-5">
 {loadRncs ? <div className="flex items-center justify-center flex-col gap-2 text-slate-400 mt-20"><Loader className="animate-spin" size={24} /><span className="text-xs font-bold">Buscando pendências...</span></div> : rncs.length === 0 ? <div className="text-center text-slate-400 mt-20 text-xs font-medium">Nenhuma RNC identificada para este projeto.</div> : (
 <div className="space-y-3">
 {rncs.map(r => (
 <div key={r.IdRnc} className={`bg-white p-4 rounded-md border-l-4 shadow-sm ${r.Estatus?.toLowerCase().includes('fin') ? 'border-emerald-500' : 'border-red-500'}`}>
 <div className="flex justify-between items-start mb-2">
 <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">#{r.IdRnc} <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-mono border border-slate-200">{r.Tag}</span></div>
 <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${r.Estatus?.toLowerCase().includes('fin') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{r.Estatus || 'Aberta'}</span>
 </div>
 <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 mb-2 leading-relaxed">{r.DescricaoPendencia || r.DescResumo}</div>
 <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-slate-100 mt-1">
 <span className="flex items-center gap-1 text-slate-500"><div className="w-1.5 h-1.5 rounded-full bg-[#E0E800]/200"></div>{r.SetorResponsavel}</span><span>Cr: {r.DataCriacao}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {osDetailsModal && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
 <div className="bg-white rounded-md shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
 <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
 <div>
 <h3 className="font-black text-slate-800 text-lg">Ordens de Serviço</h3>
 <p className="text-xs text-slate-500 mt-0.5">Lista de O.S {osDetailsModal.type === 'tag' ? 'da Tag selecionada' : 'do Projeto selecionado'}</p>
 </div>
 <button onClick={() => setOsDetailsModal(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="p-4 overflow-y-auto min-h-[150px] relative">
 {loadOsDetails ? (
 <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><Loader className="animate-spin text-[#32423D]" /></div>
 ) : osDetailsModal.osList.length === 0 ? (
 <div className="py-8 text-center text-slate-500 text-xs font-medium bg-slate-50 rounded-md border border-slate-100">Nenhuma ordem de serviço vinculada.</div>
 ) : (
 <div className="border border-slate-200 rounded-md overflow-hidden">
 <table className="w-full text-left text-xs">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] border-b border-white/20 text-white text-[10px] font-bold uppercase">
 <tr>
 <th className="px-2 py-1 border-r border-white/20">ID da O.S</th>
 <th className="px-2 py-1">Descrição</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {osDetailsModal.osList.map((os, i) => (
 <tr key={i} className="hover:bg-slate-50/50 transition-colors">
 <td className="px-2 py-1 font-mono text-xs font-bold text-slate-700 border-r border-slate-100 w-24">#{String(os.IdOrdemServico).padStart(5, '0')}</td>
 <td className="px-2 py-1 text-xs text-slate-600 font-medium">{os.Descricao || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
 <button onClick={() => setOsDetailsModal(null)} className="px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors">
 Voltar
 </button>
 </div>
 </div>
 </div>
 )}
 </>,
 document.body
 )}
 </div>
 );
}

