import ProdSetoresModal from '../components/ProdSetoresModal';
import SectorProductionModal from '../components/SectorProductionModal';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';

import { Clock, Activity, Search, Filter, X, CalendarDays, Calendar, ArrowUp, ArrowDown, CheckCircle, Loader, RotateCcw, ShieldAlert, Tag as TagIcon, LayoutGrid, ArrowRight, Edit3, DollarSign, FileDown, List, ClipboardList, Maximize2, Minimize2 , Share2, GanttChartSquare } from 'lucide-react';
import VisaoGeralTagsGlobais from './VisaoGeralTagsGlobais';


const SECTOR_RESOURCE_FIELDS = [
  { field: 'txtCorte', key: 'Corte', label: 'Corte', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', order: 1 },
  { field: 'txtCorteaLaser', key: 'Laser', label: 'Corte a Laser', color: 'bg-rose-100 text-rose-800 border-rose-300', order: 2 },
  { field: 'txtPUNSIONADEIRA', key: 'Punsionadeira', label: 'Punsionadeira', color: 'bg-pink-100 text-pink-800 border-pink-300', order: 3 },
  { field: 'txtDobra', key: 'Dobra', label: 'Dobra', color: 'bg-blue-100 text-blue-800 border-blue-300', order: 4 },
  { field: 'txtSolda', key: 'Solda', label: 'Solda', color: 'bg-amber-100 text-amber-800 border-amber-300', order: 5 },
  { field: 'txtPintura', key: 'Pintura', label: 'Pintura', color: 'bg-purple-100 text-purple-800 border-purple-300', order: 6 },
  { field: 'txtGALVANIZAR', key: 'Galvanizar', label: 'Galvanizar', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', order: 7 },
  { field: 'TxtMontagem', key: 'Montagem', label: 'Montagem', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', order: 8 }
];

const ALL_TAG_SECTORS = [
  { key: 'Corte', label: 'Corte', flagField: 'txtCorte', piField: 'PlanejadoInicioCorte', pfField: 'PlanejadoFinalCorte' },
  { key: 'Laser', label: 'Corte a Laser', flagField: 'txtCorteaLaser', piField: 'PlanejadoInicioCorteaLaser', pfField: 'PlanejadoFinalCorteaLaser' },
  { key: 'Punsionadeira', label: 'Punsionadeira', flagField: 'txtPUNSIONADEIRA', piField: 'PlanejadoInicioPUNSIONADEIRA', pfField: 'PlanejadoFinalPUNSIONADEIRA' },
  { key: 'Dobra', label: 'Dobra', flagField: 'txtDobra', piField: 'PlanejadoInicioDobra', pfField: 'PlanejadoFinalDobra' },
  { key: 'Solda', label: 'Solda', flagField: 'txtSolda', piField: 'PlanejadoInicioSolda', pfField: 'PlanejadoFinalSolda' },
  { key: 'Pintura', label: 'Pintura', flagField: 'txtPintura', piField: 'PlanejadoInicioPintura', pfField: 'PlanejadoFinalPintura' },
  { key: 'Galvanizar', label: 'Galvanizar', flagField: 'txtGALVANIZAR', piField: 'PlanejadoInicioGALVANIZAR', pfField: 'PlanejadoFinalGALVANIZAR' },
  { key: 'Montagem', label: 'Montagem', flagField: 'TxtMontagem', piField: 'PlanejadoInicioMontagem', pfField: 'PlanejadoFinalMontagem' },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const getAuthHeaders = () => {
  let token = localStorage.getItem('sinco_token') || localStorage.getItem('superadmin_token');
  if (token === 'null' || token === 'undefined') token = null;
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// authFetch: wrapper seguro que SEMPRE envia o token de autenticação
// Resolve falhas silenciosas em produção onde fetch() sem auth retorna 401
const authFetch = (url: string, options: RequestInit = {}) => {
  const headers = { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) };
  return fetch(url, { ...options, headers });
};


const getSavedEntitySectorDates = (entity: any, sectorKey: string) => {
  if (!entity) return { pi: '', pf: '' };
  const keyMap: Record<string, string> = {
    'Corte': 'Corte',
    'Punsionadeira': 'PUNSIONADEIRA',
    'Galvanizar': 'GALVANIZAR',
    'Laser': 'CorteaLaser',
    'Dobra': 'Dobra',
    'Solda': 'Solda',
    'Pintura': 'Pintura',
    'Montagem': 'Montagem'
  };

  const dbKey = keyMap[sectorKey] || sectorKey;
  let pi = entity[`PlanejadoInicio${dbKey}`] || entity[`PlanejadoInicio${sectorKey}`] || '';
  let pf = entity[`PlanejadoFinal${dbKey}`] || entity[`PlanejadoFinal${sectorKey}`] || '';

  if (pi && pi.includes('-')) pi = isoToBr(pi);
  if (pf && pf.includes('-')) pf = isoToBr(pf);

  return { pi, pf };
};


// ─── Interfaces ───
interface Projeto { IdProjeto: number; Projeto: string; DescProjeto: string; DescEmpresa?: string; DataPrevisao: string; DataCriacao: string; Finalizado: string; liberado: string; QtdeTags: number; QtdeTagsExecutadas: number; PercentualTags: number; QtdePecasTags: number; QtdePecasExecutadas: number; PercentualPecas: number; qtdetotalpecas: number; TotalRnc: number; qtdernc: number; qtderncPendente: number; qtderncFinalizada: number; ExecCorte: number; TotalCorte: number; ExecDobra: number; TotalDobra: number; ExecSolda: number; TotalSolda: number; ExecPintura: number; TotalPintura: number; ExecMontagem: number; TotalMontagem: number; QtdeOS: number; }
interface Tag { IdTag: number; Tag: string; DescTag: string; DataEntrada: string; DataPrevisao: string; QtdeTag: string; QtdeLiberada: string; SaldoTag: string; ValorTag: string; StatusTag: string; QtdeOS: string; qtdetotal: string; QtdeTotalPecas?: string | number; Finalizado: string; qtdernc: number; 
 PlanejadoInicioCorte: string; PlanejadoFinalCorte: string; RealizadoInicioCorte: string; RealizadoFinalCorte: string; CorteTotalExecutado: string; CorteTotalExecutar: string; CortePercentual: string; flagCorte: number; 
 PlanejadoInicioDobra: string; PlanejadoFinalDobra: string; RealizadoInicioDobra: string; RealizadoFinalDobra: string; DobraTotalExecutado: string; DobraTotalExecutar: string; DobraPercentual: string; flagDobra: number; 
 PlanejadoInicioSolda: string; PlanejadoFinalSolda: string; RealizadoInicioSolda: string; RealizadoFinalSolda: string; SoldaTotalExecutado: string; SoldaTotalExecutar: string; SoldaPercentual: string; flagSolda: number; 
 PlanejadoInicioPintura: string; PlanejadoFinalPintura: string; RealizadoInicioPintura: string; RealizadoFinalPintura: string; PinturaTotalExecutado: string; PinturaTotalExecutar: string; PinturaPercentual: string; flagPintura: number; 
 PlanejadoInicioMontagem: string; PlanejadoFinalMontagem: string; RealizadoInicioMontagem: string; RealizadoFinalMontagem: string; MontagemTotalExecutado: string; MontagemTotalExecutar: string; MontagemPercentual: string; flagMontagem: number; 
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
 <CalendarDays size={10} /> {date && date.includes('-') ? isoToBr(date) : date} {(showStatus && days === -1) ? '· Atrasado' : ((showStatus && days !== null && days >= 0) ? `· ${days}d` : '')}
 </span>
 </div>
 );
};

const SECTORS = [
 { k: 'Corte', ex: 'ExecCorte', t: 'TotalCorte', c: 'bg-[#32423D]' }, { k: 'Dobra', ex: 'ExecDobra', t: 'TotalDobra', c: 'bg-indigo-600' },
 { k: 'Solda', ex: 'ExecSolda', t: 'TotalSolda', c: 'bg-red-600' }, { k: 'Pintura', ex: 'ExecPintura', t: 'TotalPintura', c: 'bg-amber-500' },
 { k: 'Montagem', ex: 'ExecMontagem', t: 'TotalMontagem', c: 'bg-emerald-600' },
 { k: 'CorteaLaser', ex: 'ExecCorteaLaser', t: 'TotalCorteaLaser', c: 'bg-purple-600' },
 { k: 'Punsionadeira', ex: 'ExecPUNSIONADEIRA', t: 'TotalPUNSIONADEIRA', c: 'bg-pink-600' },
 { k: 'Galvanizar', ex: 'ExecGALVANIZAR', t: 'TotalGALVANIZAR', c: 'bg-cyan-600' },
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
 { k: 'CorteaLaser', ex: 'CorteaLaserTotalExecutado', t: 'CorteaLaserTotalExecutar', p: 'CorteaLaserPercentual', c: 'bg-purple-500',
 fields: { pi: 'PlanejadoInicioCorteaLaser', pf: 'PlanejadoFinalCorteaLaser', ri: 'RealizadoInicioCorteaLaser', rf: 'RealizadoFinalCorteaLaser' } },
 { k: 'Punsionadeira', ex: 'PUNSIONADEIRATotalExecutado', t: 'PUNSIONADEIRATotalExecutar', p: 'PUNSIONADEIRAPercentual', c: 'bg-pink-500',
 fields: { pi: 'PlanejadoInicioPUNSIONADEIRA', pf: 'PlanejadoFinalPUNSIONADEIRA', ri: 'RealizadoInicioPUNSIONADEIRA', rf: 'RealizadoFinalPUNSIONADEIRA' } },
 { k: 'Galvanizar', ex: 'GALVANIZARTotalExecutado', t: 'GALVANIZARTotalExecutar', p: 'GALVANIZARPercentual', c: 'bg-cyan-500',
 fields: { pi: 'PlanejadoInicioGALVANIZAR', pf: 'PlanejadoFinalGALVANIZAR', ri: 'RealizadoInicioGALVANIZAR', rf: 'RealizadoFinalGALVANIZAR' } },
];

export default function VisaoGeralProducao() {
 const [projetos, setProjetos] = useState<Projeto[]>([]); const [tags, setTags] = useState<Tag[]>([]); const [rncs, setRncs] = useState<Rnc[]>([]);
 const [load, setLoad] = useState(true); const [loadTags, setLoadTags] = useState(false); const [loadRncs, setLoadRncs] = useState(false);
 const [selProj, setSelProj] = useState<Projeto | null>(null);
 const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sectorDays, setSectorDays] = useState<Record<string, string>>({});
  const [baseStartDate, setBaseStartDate] = useState<string>('');
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
 const [statusFilter, setStatusFilter] = useState<'finalizados'|'liberados'|'nao_liberados'|'todos'|null>(null);

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
 const [actionModal, setActionModal] = useState<'dateProj' | 'dateTagGlobal' | 'dateTagSetores' | 'fin' | 'cancelFin' | 'addRnc' | 'addTask' | 'planejarProjetista' | 'alterarQtdeLiberada' | 'finTag' | 'bulkDateTags' | 'temposProducaoOs' | 'temposProducaoProj' | null>(null);
  const [temposProducaoRecursos, setTemposProducaoRecursos] = useState<any[]>([]);
  const [temposProducaoSelId, setTemposProducaoSelId] = useState('');
  const [temposProducaoValores, setTemposProducaoValores] = useState({ setup: 0, padrao: 0, total: 0 });

  useEffect(() => {
    if (actionModal === 'temposProducao' || actionModal === 'temposProducaoOs' || actionModal === 'temposProducaoProj') {
      fetch(`${API_BASE}/recursos`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const list = data.data.filter((r:any) => r.Fabrica === 'SIM' || r.Fabrica === 'S' || r.Fabrica === true);
            setTemposProducaoRecursos(list);
            setTemposProducaoSelId('');
            setTemposProducaoValores({ setup: 0, padrao: 0, total: 0 });
          }
        })
        .catch(console.error);
    }
  }, [actionModal]);

  
  
  const handleSelectRecursoTemposProj = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const recId = e.target.value;
    setTemposProducaoSelId(recId);
    const rec = temposProducaoRecursos.find(r => String(r.IdProcessoFabricacao) === String(recId));
    if (rec && selProj) {
      try {
        const res = await fetch(`${API_BASE}/ordemservico/projetos/${selProj.IdProjeto}/tempos-producao?recurso=${encodeURIComponent(rec.processofabricacao)}`, { headers: getAuthHeaders() });
        const json = await res.json();
        if (json.success) {
          setTemposProducaoValores({
            setup: json.data.Setup || 0,
            padrao: json.data.Padrao || 0,
            total: json.data.Total || 0
          });
        }
      } catch(err) {
        console.error(err);
      }
    } else {
        setTemposProducaoValores({ setup: 0, padrao: 0, total: 0 });
    }
  };

  const handleSelectRecursoTemposOs = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const recId = e.target.value;
    setTemposProducaoSelId(recId);
    const rec = temposProducaoRecursos.find(r => String(r.IdProcessoFabricacao) === String(recId));
    if (rec && selOs) {
      try {
        const res = await fetch(`${API_BASE}/ordemservico/os/${selOs.IdOrdemServico}/tempos-producao?recurso=${encodeURIComponent(rec.processofabricacao)}`, { headers: getAuthHeaders() });
        const json = await res.json();
        if (json.success) {
          setTemposProducaoValores({
            setup: json.data.Setup || 0,
            padrao: json.data.Padrao || 0,
            total: json.data.Total || 0
          });
        }
      } catch(err) {
        console.error(err);
      }
    } else {
        setTemposProducaoValores({ setup: 0, padrao: 0, total: 0 });
    }
  };

  const handleSelectRecursoTempos = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const recId = e.target.value;
    setTemposProducaoSelId(recId);
    const rec = temposProducaoRecursos.find(r => String(r.IdProcessoFabricacao) === String(recId));
    if (rec && selTag) {
      try {
        const res = await fetch(`${API_BASE}/ordemservico/${selTag.IdTag}/tempos-producao?recurso=${encodeURIComponent(rec.processofabricacao)}`, { headers: getAuthHeaders() });
        const json = await res.json();
        if (json.success) {
          setTemposProducaoValores({
            setup: json.data.Setup || 0,
            padrao: json.data.Padrao || 0,
            total: json.data.Total || 0
          });
        }
      } catch(err) {
        console.error(err);
      }
    } else {
        setTemposProducaoValores({ setup: 0, padrao: 0, total: 0 });
    }
  };

 const [viewModeTags, setViewModeTags] = useState<'detailed' | 'list'>('list');
 const [rncForm, setRncForm] = useState<{idRnc?: number, idTag?: number, tag?: string, estatus?: string, descricao: string, setor: string, usuario: string, tipoTarefa: string, dataExec: string, usuarioFin?: string, dataFin?: string, setorFin?: string, descFin?: string, wantsToFinalize?: boolean}>({ descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false });
 const [planejarProjetistaForm, setPlanejarProjetistaForm] = useState<{ projetistaPlanejado: string, planejadoInicioEngenharia: string, planejadoFinalEngenharia: string }>({ projetistaPlanejado: '', planejadoInicioEngenharia: '', planejadoFinalEngenharia: '' });
 const [qtdeLiberadaForm, setQtdeLiberadaForm] = useState<{ qtdeLiberada: string }>({ qtdeLiberada: '' });
 const [showFinalizedRncs, setShowFinalizedRncs] = useState(false);
 const [usuarios, setUsuarios] = useState<Record<string, unknown>[]>([]);
 const [tipostarefa, setTipostarefa] = useState<Record<string, unknown>[]>([]);
 const [dateInput, setDateInput] = useState(''); const [updateTagsCheck, setUpdateTagsCheck] = useState(false);
 const [selTag, setSelTag] = useState<Tag | null>(null);
  const [selOs, setSelOs] = useState<any>(null); 
 const [isSaving, setIsSaving] = useState(false); const [msg, setMsg] = useState<{ ok: boolean, t: string } | null>(null);
 
 // Estado para editar datas de setor da Tag
 const [tagSectorDates, setTagSectorDates] = useState<{ [key: string]: string }>({});
 const [propagateSectorDates, setPropagateSectorDates] = useState<{ [key: string]: string }>({});
  const [initialTagSectorDates, setInitialTagSectorDates] = useState<{ [key: string]: string }>({});

 // Estado de Expansão (Maximizado)
 const [isExpanded, setIsExpanded] = useState(false);

 // Estado para Planejamento em Lote (Muitos Setores)
 const [bulkSectorDates, setBulkSectorDates] = useState<{ [key: string]: string }>({});

 const [osDetailsModal, setOsDetailsModal] = useState<{ type: 'tag' | 'projeto', id: number, osList: Record<string, unknown>[] } | null>(null);
  const osModalItemsCache = useRef<Record<string | number, any[]>>({});
  const [sectorModal, setSectorModal] = useState<{ title: string; sectors: { key: string; label: string; exec: number; aExec: number }[] } | null>(null);
  const [expandedTagsOs, setExpandedTagsOs] = useState<{ [key: number]: Record<string, unknown>[] | null }>({});
  const [selectedTagsForSectors, setSelectedTagsForSectors] = useState<number[]>([]);
  const [showProdSetoresModal, setShowProdSetoresModal] = useState(false);
  const [selProjForSectors, setSelProjForSectors] = useState<any>(null);
  const [selOsForSectors, setSelOsForSectors] = useState<any>(null);
  const [showSearchFilters, setShowSearchFilters] = useState<boolean>(true);
  const [expandedOsItems, setExpandedOsItems] = useState<{ [key: string]: Record<string, unknown>[] | null }>({});
  const [expandedTagSectors, setExpandedTagSectors] = useState<{ [key: number]: boolean }>({});
  const [expandedOsSectors, setExpandedOsSectors] = useState<{ [key: string]: boolean }>({});
  const [expandedItemSectors, setExpandedItemSectors] = useState<{ [key: string]: boolean }>({});
  const [tagItemsCache, setTagItemsCache] = useState<{ [key: number]: any[] }>({});
  
    const [showPlanningDatesTag, setShowPlanningDatesTag] = useState<{ [key: number]: boolean }>({});
  const [tagPlanningModes, setTagPlanningModes] = useState<{ [key: number]: 'progressivo' | 'regressivo' }>({});
  const [tagBaseDateInputs, setTagBaseDateInputs] = useState<{ [key: number]: string }>({});
  const [tagSectorDaysMap, setTagSectorDaysMap] = useState<Record<string, string>>({});
  const [customSectorOrdersTag, setCustomSectorOrdersTag] = useState<{ [key: number]: string[] }>({});
  const [tagItemsSilentCache, setTagItemsSilentCache] = useState<{ [key: number]: Record<string, unknown>[] }>({});
  const [tagResourceDays, setTagResourceDays] = useState<{ [key: string]: string }>({});
  const [planningModes, setPlanningModes] = useState<{ [key: string]: 'progressivo' | 'regressivo' }>({});
  const [planningTargetDates, setPlanningTargetDates] = useState<{ [key: string]: string }>({});
  const [planningSectorOrders, setPlanningSectorOrders] = useState<{ [key: string]: string[] }>({});
  const [planningMode, setPlanningMode] = useState<'progressivo' | 'regressivo'>('progressivo');
  const [baseDateInput, setBaseDateInput] = useState<string>('');
  const [customSectorOrder, setCustomSectorOrder] = useState<string[]>([]);

  
  const handleSaveTagPlanning = async (idTag: number, calculatedList: any[]) => {
    try {
      const userObj = loggedUser || JSON.parse(localStorage.getItem('sinco_user') || '{}');
      const userName = userObj.NomeCompleto || userObj.nomeCompleto || userObj.Nome || 'SuperAdmin';

      const setores = calculatedList.map(item => {
        let piValue = '';
        let pfValue = '';

        if (item.plannedDateStr && item.plannedDateStr.includes('→')) {
          const parts = item.plannedDateStr.split('→').map((s: string) => s.trim());
          piValue = parts[0]; // Manter formato brasileiro dd/mm/aaaa
          pfValue = parts[1]; // Manter formato brasileiro dd/mm/aaaa
        } else if (item.plannedDateStr) {
          pfValue = item.plannedDateStr; // Manter formato brasileiro dd/mm/aaaa
        }

        return {
          sectorName: item.sectorKey,
          piValue,
          pfValue
        };
      });

      const res = await fetch(`${API_BASE}/visao-geral/tag/${idTag}/propagar-datas-os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setores, usuario: userName })
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: json.message });
      } else {
        setMsg({ type: 'error', text: json.message || 'Erro ao gravar datas.' });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: 'error', text: 'Erro de conexão ao gravar datas de planejamento.' });
    }
  };

  const handleSaveOsPlanning = async (idOs: string | number, calculatedList: any[]) => {
    try {
      const userObj = loggedUser || JSON.parse(localStorage.getItem('sinco_user') || '{}');
      const userName = userObj.NomeCompleto || userObj.nomeCompleto || userObj.Nome || 'SuperAdmin';

      const setores = calculatedList.map(item => {
        let piValue = '';
        let pfValue = '';

        if (item.plannedDateStr && item.plannedDateStr.includes('→')) {
          const parts = item.plannedDateStr.split('→').map((s: string) => s.trim());
          piValue = parts[0]; // Manter formato brasileiro dd/mm/aaaa
          pfValue = parts[1]; // Manter formato brasileiro dd/mm/aaaa
        } else if (item.plannedDateStr) {
          pfValue = item.plannedDateStr; // Manter formato brasileiro dd/mm/aaaa
        }

        return {
          sectorName: item.sectorKey,
          piValue,
          pfValue
        };
      });

      const res = await fetch(`${API_BASE}/visao-geral/os/${idOs}/propagar-datas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setores, usuario: userName })
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: json.message });
      } else {
        setMsg({ type: 'error', text: json.message || 'Erro ao gravar datas.' });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: 'error', text: 'Erro de conexão ao gravar datas de planejamento da OS.' });
    }
  };

  const moveSectorInOrder = (key: string, fromIndex: number, toIndex: number, defaultSectors: any[]) => {
    const currentOrder = planningSectorOrders[key] || defaultSectors.map(s => s.sectorKey);
    if (fromIndex < 0 || fromIndex >= currentOrder.length || toIndex < 0 || toIndex >= currentOrder.length) return;
    
    const newOrder = [...currentOrder];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    setPlanningSectorOrders(prev => ({ ...prev, [key]: newOrder }));
  };

  const togglePlanningDatesTag = async (idTag: number) => {
    const nextState = !showPlanningDatesTag[idTag];
    setShowPlanningDatesTag(prev => ({ ...prev, [idTag]: nextState }));

    if (nextState && !tagItemsSilentCache[idTag]) {
      try {
        const resOs = await (await authFetch(`${API_BASE}/visao-geral/tag/${idTag}/ordens-servico`)).json();
        if (resOs.success && resOs.data && resOs.data.length > 0) {
          const itemPromises = resOs.data.map(async (os: any) => {
            try {
              const resItens = await (await authFetch(`${API_BASE}/ordemservico/${os.IdOrdemServico}/itens`)).json();
              return resItens.success ? resItens.data : [];
            } catch {
              return [];
            }
          });

          const itemsArrayOfArrays = await Promise.all(itemPromises);
          const allItems = itemsArrayOfArrays.flat();
          setTagItemsSilentCache(prev => ({ ...prev, [idTag]: allItems }));
        } else {
          setTagItemsSilentCache(prev => ({ ...prev, [idTag]: [] }));
        }
      } catch (e) {
        console.error(e);
        setTagItemsSilentCache(prev => ({ ...prev, [idTag]: [] }));
      }
    }
  };

  const [showPlanningDatesOs, setShowPlanningDatesOs] = useState<{ [key: string]: boolean }>({});
  const [osResourceDays, setOsResourceDays] = useState<{ [key: string]: string }>({});
  const [osItemsSilentCache, setOsItemsSilentCache] = useState<{ [key: string]: Record<string, unknown>[] }>({});

    const getUniqueOsResources = (items: any[] | null) => {
    if (!items || items.length === 0) return [];

    const map = new Map<string, { sectorKey: string; sectorLabel: string; sectorColor: string; order: number }>();
    items.forEach((item: any) => {
      SECTOR_RESOURCE_FIELDS.forEach(sf => {
        const val = item[sf.field];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val).trim() !== '0') {
          if (!map.has(sf.key)) {
            map.set(sf.key, {
              sectorKey: sf.key,
              sectorLabel: sf.label,
              sectorColor: sf.color,
              order: sf.order
            });
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  };

 const [loadOsDetails, setLoadOsDetails] = useState(false);

 // Configuração de Setores Visíveis
 const [visibleProcesses, setVisibleProcesses] = useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem']);

 // Filtrar setores dinamicamente
 const filteredSectors = SECTORS;
 const filteredTagSectors = TAG_SECTORS;

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

 const fetchProj = async (sf: 'finalizados' | 'liberados' | 'nao_liberados' | 'todos' | null = null) => {
 setLoad(true); setError(null);
 try {
 const qs = new URLSearchParams();
 if (sf === 'finalizados') {
      qs.set('modo', 'finalizados');
    } else if (sf === 'liberados') {
      qs.set('modo', 'liberados');
    } else if (sf === 'nao_liberados') {
      qs.set('modo', 'nao_liberados');
    } else if (sf === 'todos') {
 qs.set('modo', 'todos');
 }

 const { fProjPrevIni: pi, fProjPrevFim: pf, fProjCriacaoIni: ci, fProjCriacaoFim: cf } = dateFiltersRef.current;
 if (pi) qs.set('previsaoInicio', isoToBr(pi));
 if (pf) qs.set('previsaoFim', isoToBr(pf));
 if (ci) qs.set('criacaoInicio', isoToBr(ci));
 if (cf) qs.set('criacaoFim', isoToBr(cf));

  const r = await (await authFetch(`${API_BASE}/acompanhamento/projetos${qs.toString() ? '?' + qs : ''}`)).json();
 if (r.success) setProjetos(r.data);
 else setError(r.message || 'Erro ao carregar projetos do servidor');
 } catch (e: Record<string, unknown>) { console.error(e); setError(e.message || 'Erro de rede'); }
 finally { setLoad(false); }
 };


 const fetchOsForTag = async (idTag: number) => {
 setLoadOsDetails(true);
 try {
  const r = await (await authFetch(`${API_BASE}/visao-geral/tag/${idTag}/ordens-servico`)).json();
 if (r.success) {
 setOsDetailsModal({ type: 'tag', id: idTag, osList: r.data });
 } else {
 setOsDetailsModal({ type: 'tag', id: idTag, osList: [] });
 }
 } catch (e) {
 console.error(e);
 setOsDetailsModal({ type: 'tag', id: idTag, osList: [] });
 } finally {
 setLoadOsDetails(false);
 }
 };

 
  
  const toggleOsItemExpansion = async (idOs: string | number) => {
    if (expandedOsItems[idOs] !== undefined && expandedOsItems[idOs] !== null) {
      setExpandedOsItems({});
      return;
    }
    try {
      const r = await (await authFetch(`${API_BASE}/ordemservico/${idOs}/itens`)).json();
      if (r.success) {
        // Limpa a OS selecionada anteriormente e exibe apenas a nova OS selecionada
        setExpandedOsItems({ [idOs]: r.data });
      }
    } catch (e) {
      console.error(e);
    }
  };

    
  
  
  
  const getOsComputedTotals = (os: any, items?: any[]) => {
    if (items && items.length > 0) {
      const totalItens = items.length;
      const itensExecutados = items.filter(i => {
        const st = String(i.OrdemServicoItemFinalizado || i.Finalizado || '').trim().toUpperCase();
        return st === 'C' || st === 'S';
      }).length;
      
      let totalPecas = 0;
      let pecasExecutadas = 0;
      let pesoTotal = 0;
      let areaPinturaTotal = 0;
      
      items.forEach(i => {
        const q = parseFloat(i.QtdeTotal || i.qtde || 1) || 1;
        const st = String(i.OrdemServicoItemFinalizado || i.Finalizado || '').trim().toUpperCase();
        const isFin = st === 'C' || st === 'S';
        
        totalPecas += q;
        if (isFin) pecasExecutadas += q;
        
        const pUnit = parseFloat(i.PesoUnitario || 0);
        const p = parseFloat(i.Peso || 0) || (pUnit * q);
        pesoTotal += p;
        
        const aUnit = parseFloat(i.AreaPinturaUnitario || 0);
        const a = parseFloat(i.AreaPintura || 0) || (aUnit * q);
        areaPinturaTotal += a;
      });
      
      return {
        totalItens,
        itensExecutados,
        totalPecas,
        pecasExecutadas,
        pesoTotal,
        areaPinturaTotal,
        percentualItens: totalItens > 0 ? Math.round((itensExecutados / totalItens) * 100) : 0,
        percentualPecas: totalPecas > 0 ? Math.round((pecasExecutadas / totalPecas) * 100) : 0
      };
    }

    const totalItens = parseInt(os.QtdeTotalItens) || (os.ItensCount ? parseInt(os.ItensCount) : 0);
    const itensExecutados = parseInt(os.QtdeItensExecutados) || 0;
    const totalPecas = parseInt(os.QtdeTotalPecas || os.qtadetotal) || 0;
    const pecasExecutadas = parseInt(os.QtdePecasExecutadas) || 0;
    const pesoTotal = parseFloat(os.PesoTotal) || 0;
    const areaPinturaTotal = parseFloat(os.AreaPinturaTotal) || 0;

    return {
      totalItens,
      itensExecutados,
      totalPecas,
      pecasExecutadas,
      pesoTotal,
      areaPinturaTotal,
      percentualItens: totalItens > 0 ? Math.round((itensExecutados / totalItens) * 100) : 0,
      percentualPecas: totalPecas > 0 ? Math.round((pecasExecutadas / totalPecas) * 100) : 0
    };
  };

  const getSectorDiasProducao = (obj: any, sectorKey: string): number => {
  if (!obj || typeof obj !== 'object') return 0;
  const target = String(sectorKey || '').trim().toLowerCase();

  for (const k of Object.keys(obj)) {
    const kLower = k.toLowerCase();
    if (kLower.endsWith('diasproducao')) {
      const prefix = kLower.replace('diasproducao', '');
      if (prefix === target || (target === 'punsionadeira' && prefix === 'punsionadeira') || (target === 'galvanizar' && prefix === 'galvanizar') || (target === 'cortealaser' && (prefix === 'cortealaser' || prefix === 'laser'))) {
        const val = parseFloat(String(obj[k]));
        if (!isNaN(val) && val > 0) return val;
      }
    }
  }

  const directVal = parseFloat(
    obj[`${sectorKey}DiasProducao`] || 
    obj[`dias${sectorKey}`] || 
    obj[`Dias${sectorKey}`] || 
    0
  );
  return isNaN(directVal) ? 0 : directVal;
};

const getSectorPlanningDates = (obj: any, sectorKey: string) => {
    if (!obj || typeof obj !== 'object') return { pi: '', pf: '', minProd: 0 };
    const target = String(sectorKey || '').trim().toLowerCase();
    let pi = '';
    let pf = '';
    let minProd = 0;

    for (const k of Object.keys(obj)) {
      const kLower = k.toLowerCase();
      
      if (!pi && kLower.startsWith('planejadoinicio')) {
        const rest = kLower.replace('planejadoinicio', '');
        if (rest === target || (target === 'punsionadeira' && rest === 'punsionadeira') || (target === 'galvanizar' && rest === 'galvanizar') || (target === 'cortealaser' && (rest === 'cortealaser' || rest === 'laser'))) {
          if (obj[k]) pi = String(obj[k]);
        }
      }

      if (!pf && kLower.startsWith('planejadofinal')) {
        const rest = kLower.replace('planejadofinal', '');
        if (rest === target || (target === 'punsionadeira' && rest === 'punsionadeira') || (target === 'galvanizar' && rest === 'galvanizar') || (target === 'cortealaser' && (rest === 'cortealaser' || rest === 'laser'))) {
          if (obj[k]) pf = String(obj[k]);
        }
      }

      if (kLower.endsWith('minprod')) {
        const prefix = kLower.replace('minprod', '');
        if (prefix === target || (target === 'punsionadeira' && prefix === 'punsionadeira') || (target === 'galvanizar' && prefix === 'galvanizar') || (target === 'cortealaser' && (prefix === 'cortealaser' || prefix === 'laser'))) {
          const val = parseInt(String(obj[k]), 10) || 0;
          if (val > 0) minProd = val;
        }
      }
    }

    return { pi, pf, minProd };
  };

  const checkSectorActive = (obj: any, sectorKey: string): boolean => {
    if (!obj) return false;
    
    const isTrue = (v: any) => {
      if (v === true || v === 1 || v === '1') return true;
      const s = String(v ?? '').trim().toUpperCase();
      if (!s || s === '0' || s === 'N' || s === 'NAO' || s === 'NÃO' || s === 'FALSE' || s === '0.00' || s === 'NULL' || s === 'UNDEFINED') return false;
      return true;
    };

    const isItem = !!obj.IdOrdemServicoItem;

    // Checar se há datas de planejamento ativas para este setor (Apenas para OS/TAG/PROJ, ignorar para itens pois a fonte da verdade agora é material_processo via txt*)
    if (!isItem) {
        const { pi, pf } = getSectorPlanningDates(obj, sectorKey);
        if (pi || pf) return true;
    }

    switch (sectorKey) {
      case 'Corte':
        return isTrue(obj.txtCorte) || isTrue(obj.txtCORTE) || isTrue(obj.flagCorte) || (!isItem && (toNum({val: obj.CorteTotalExecutado}) > 0 || toNum({val: obj.CorteTotalExecutar}) > 0));
      case 'Dobra':
        return isTrue(obj.txtDobra) || isTrue(obj.txtDOBRA) || isTrue(obj.flagDobra) || (!isItem && (toNum({val: obj.DobraTotalExecutado}) > 0 || toNum({val: obj.DobraTotalExecutar}) > 0));
      case 'Solda':
        return isTrue(obj.txtSolda) || isTrue(obj.txtSOLDA) || isTrue(obj.flagSolda) || (!isItem && (toNum({val: obj.SoldaTotalExecutado}) > 0 || toNum({val: obj.SoldaTotalExecutar}) > 0));
      case 'Pintura':
        return isTrue(obj.txtPintura) || isTrue(obj.txtPINTURA) || isTrue(obj.flagPintura) || (!isItem && (toNum({val: obj.PinturaTotalExecutado}) > 0 || toNum({val: obj.PinturaTotalExecutar}) > 0));
      case 'Montagem':
        return isTrue(obj.TxtMontagem) || isTrue(obj.txtMontagem) || isTrue(obj.txtMONTAGEM) || isTrue(obj.flagMontagem) || (!isItem && (toNum({val: obj.MontagemTotalExecutado}) > 0 || toNum({val: obj.MontagemTotalExecutar}) > 0));
      case 'CorteaLaser':
        return isTrue(obj.txtCorteaLaser) || isTrue(obj.txtCORTEALASER) || isTrue(obj.flagCorteaLaser) || (!isItem && (toNum({val: obj.CorteaLaserTotalExecutado}) > 0 || toNum({val: obj.CorteaLaserTotalExecutar}) > 0));
      case 'Punsionadeira':
        return isTrue(obj.txtPUNSIONADEIRA) || isTrue(obj.txtPunsionadeira) || isTrue(obj.flagPunsionadeira) || (!isItem && (toNum({val: obj.PUNSIONADEIRATotalExecutado}) > 0 || toNum({val: obj.PunsionadeiraTotalExecutado}) > 0 || toNum({val: obj.PUNSIONADEIRATotalExecutar}) > 0 || toNum({val: obj.PunsionadeiraTotalExecutar}) > 0));
      case 'Galvanizar':
        return isTrue(obj.txtGALVANIZAR) || isTrue(obj.txtGalvanizar) || isTrue(obj.flagGalvanizar) || (!isItem && (toNum({val: obj.GALVANIZARTotalExecutado}) > 0 || toNum({val: obj.GalvanizarTotalExecutado}) > 0 || toNum({val: obj.GALVANIZARTotalExecutar}) > 0 || toNum({val: obj.GalvanizarTotalExecutar}) > 0));
      default:
        return false;
    }
  };

  const getItemActiveSectors = (item: any) => {
    const itemQty = parseFloat(item.qtde ?? item.QtdeTotal) || 1;
    const isFin = item.OrdemServicoItemFinalizado === 'C' || item.OrdemServicoItemFinalizado === 'S';

    const SECTOR_DEFS = [
      { key: 'Corte', label: 'Corte', rawExec: item.CorteTotalExecutado, rawAExec: item.CorteTotalExecutar },
      { key: 'Dobra', label: 'Dobra', rawExec: item.DobraTotalExecutado, rawAExec: item.DobraTotalExecutar },
      { key: 'Solda', label: 'Solda', rawExec: item.SoldaTotalExecutado, rawAExec: item.SoldaTotalExecutar },
      { key: 'Pintura', label: 'Pintura', rawExec: item.PinturaTotalExecutado, rawAExec: item.PinturaTotalExecutar },
      { key: 'Montagem', label: 'Montagem', rawExec: item.MontagemTotalExecutado, rawAExec: item.MontagemTotalExecutar },
      { key: 'CorteaLaser', label: 'Corte a Laser', rawExec: item.CorteaLaserTotalExecutado, rawAExec: item.CorteaLaserTotalExecutar },
      { key: 'Punsionadeira', label: 'Punsionadeira', rawExec: item.PUNSIONADEIRATotalExecutado ?? item.PunsionadeiraTotalExecutado, rawAExec: item.PUNSIONADEIRATotalExecutar ?? item.PunsionadeiraTotalExecutar },
      { key: 'Galvanizar', label: 'Galvanizar', rawExec: item.GALVANIZARTotalExecutado ?? item.GalvanizarTotalExecutado, rawAExec: item.GALVANIZARTotalExecutar ?? item.GalvanizarTotalExecutar },
    ];

    const activeDefs = SECTOR_DEFS.filter(s => checkSectorActive(item, s.key));

    return activeDefs.map((s, idx) => {
      const dbExec = toNum({ val: s.rawExec });
      const dbAExec = toNum({ val: s.rawAExec });
      let exec = 0;
      let aExec = 0;
      if (isFin) {
        exec = dbExec > 0 ? dbExec : itemQty;
        aExec = 0;
      } else {
        exec = dbExec;
        if (dbAExec > 0) {
          aExec = dbAExec;
        } else if (idx === 0) {
          aExec = itemQty;
        } else {
          aExec = 0;
        }
      }
      const { pi, pf, minProd } = getSectorPlanningDates(item, s.key);
      const dias = getSectorDiasProducao(item, s.key);
      return { key: s.key, label: s.label, exec, aExec, dias, pi, pf, minProd, qtdeTotal: itemQty, totalExecutado: exec, totalExecutar: aExec };
    });
  };

  const aggregateItemsSectors = (items: any[]) => {
    const SECTOR_ORDER = [
      { key: 'Corte', label: 'Corte' },
      { key: 'Dobra', label: 'Dobra' },
      { key: 'Solda', label: 'Solda' },
      { key: 'Pintura', label: 'Pintura' },
      { key: 'Montagem', label: 'Montagem' },
      { key: 'CorteaLaser', label: 'Corte a Laser' },
      { key: 'Punsionadeira', label: 'Punsionadeira' },
      { key: 'Galvanizar', label: 'Galvanizar' },
    ];

    const mapSector = new Map<string, { key: string, label: string, exec: number, aExec: number, active: boolean, dias: number, pi: string, pf: string, minProd: number }>();
    SECTOR_ORDER.forEach(s => mapSector.set(s.key, { key: s.key, label: s.label, exec: 0, aExec: 0, active: false, dias: 0, pi: '', pf: '', minProd: 0 }));

    items.forEach(item => {
      const itemSectors = getItemActiveSectors(item);
      itemSectors.forEach(s => {
        const target = mapSector.get(s.key);
        if (target) {
          target.active = true;
          target.exec += s.exec;
          target.aExec += s.aExec;
          target.minProd = (target.minProd || 0) + (s.minProd || 0);
          if (s.dias && !target.dias) target.dias = s.dias;
          if (s.pi && !target.pi) target.pi = s.pi;
          if (s.pf && !target.pf) target.pf = s.pf;
        }
      });
    });

    return Array.from(mapSector.values()).filter(s => s.active);
  };

  const getTagSectors = (t: any) => {
    const tagItems = tagItemsCache[t.IdTag] || [];
    if (tagItems.length > 0) {
      return aggregateItemsSectors(tagItems);
    }

    const SECTOR_ORDER = [
      { key: 'Corte', label: 'Corte', rawExec: t.CorteTotalExecutado, rawAExec: t.CorteTotalExecutar },
      { key: 'Dobra', label: 'Dobra', rawExec: t.DobraTotalExecutado, rawAExec: t.DobraTotalExecutar },
      { key: 'Solda', label: 'Solda', rawExec: t.SoldaTotalExecutado, rawAExec: t.SoldaTotalExecutar },
      { key: 'Pintura', label: 'Pintura', rawExec: t.PinturaTotalExecutado, rawAExec: t.PinturaTotalExecutar },
      { key: 'Montagem', label: 'Montagem', rawExec: t.MontagemTotalExecutado, rawAExec: t.MontagemTotalExecutar },
      { key: 'CorteaLaser', label: 'Corte a Laser', rawExec: t.CorteaLaserTotalExecutado, rawAExec: t.CorteaLaserTotalExecutar },
      { key: 'Punsionadeira', label: 'Punsionadeira', rawExec: t.PUNSIONADEIRATotalExecutado ?? t.PunsionadeiraTotalExecutado, rawAExec: t.PUNSIONADEIRATotalExecutar ?? t.PunsionadeiraTotalExecutar },
      { key: 'Galvanizar', label: 'Galvanizar', rawExec: t.GALVANIZARTotalExecutado ?? t.GalvanizarTotalExecutado, rawAExec: t.GALVANIZARTotalExecutar ?? t.GalvanizarTotalExecutar },
    ];

    const tagQty = parseFloat(t.QtdeTotalPecas ?? t.QtdeTag ?? t.QtdeLiberada) || 1;
    const isFin = t.Finalizado?.trim() === 'C' || t.Finalizado?.trim() === 'S';

    const activeSectors = SECTOR_ORDER.filter(s => checkSectorActive(t, s.key));

    return activeSectors.map((s, idx) => {
      const dbExec = toNum({ val: s.rawExec });
      const dbAExec = toNum({ val: s.rawAExec });
      let exec = 0;
      let aExec = 0;
      if (isFin) {
        exec = dbExec > 0 ? dbExec : tagQty;
        aExec = 0;
      } else {
        exec = dbExec;
        if (dbAExec > 0) {
          aExec = dbAExec;
        } else if (idx === 0) {
          aExec = tagQty;
        } else {
          aExec = 0;
        }
      }
      const { pi, pf, minProd } = getSectorPlanningDates(t, s.key);
      const dias = getSectorDiasProducao(t, s.key);
      return { key: s.key, label: s.label, exec, aExec, dias, pi, pf, minProd };
    });
  };

  const getOsSectors = (os: any) => {
    const osItems = expandedOsItems[os.IdOrdemServico] || [];
    if (osItems.length > 0) {
      return aggregateItemsSectors(osItems);
    }

    const SECTOR_ORDER = [
      { key: 'Corte', label: 'Corte', rawExec: os.CorteTotalExecutado, rawAExec: os.CorteTotalExecutar },
      { key: 'Dobra', label: 'Dobra', rawExec: os.DobraTotalExecutado, rawAExec: os.DobraTotalExecutar },
      { key: 'Solda', label: 'Solda', rawExec: os.SoldaTotalExecutado, rawAExec: os.SoldaTotalExecutar },
      { key: 'Pintura', label: 'Pintura', rawExec: os.PinturaTotalExecutado, rawAExec: os.PinturaTotalExecutar },
      { key: 'Montagem', label: 'Montagem', rawExec: os.MontagemTotalExecutado, rawAExec: os.MontagemTotalExecutar },
      { key: 'CorteaLaser', label: 'Corte a Laser', rawExec: os.CorteaLaserTotalExecutado, rawAExec: os.CorteaLaserTotalExecutar },
      { key: 'Punsionadeira', label: 'Punsionadeira', rawExec: os.PUNSIONADEIRATotalExecutado ?? os.PunsionadeiraTotalExecutado, rawAExec: os.PUNSIONADEIRATotalExecutar ?? os.PunsionadeiraTotalExecutar },
      { key: 'Galvanizar', label: 'Galvanizar', rawExec: os.GALVANIZARTotalExecutado ?? os.GalvanizarTotalExecutado, rawAExec: os.GALVANIZARTotalExecutar ?? os.GalvanizarTotalExecutar },
    ];

    const osQty = parseFloat(os.QtdeTotalItens) || 1;
    const isFin = os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S';

    const activeSectors = SECTOR_ORDER.filter(s => checkSectorActive(os, s.key));

    return activeSectors.map((s, idx) => {
      const dbExec = toNum({ val: s.rawExec });
      const dbAExec = toNum({ val: s.rawAExec });
      let exec = 0;
      let aExec = 0;
      if (isFin) {
        exec = dbExec > 0 ? dbExec : osQty;
        aExec = 0;
      } else {
        exec = dbExec;
        if (dbAExec > 0) {
          aExec = dbAExec;
        } else if (idx === 0) {
          aExec = osQty;
        } else {
          aExec = 0;
        }
      }
      const { pi, pf, minProd } = getSectorPlanningDates(os, s.key);
      const dias = getSectorDiasProducao(os, s.key);
      return { key: s.key, label: s.label, exec, aExec, dias, pi, pf, minProd };
    });
  };

  const getProjectSectors = (p: any) => {
    const SECTOR_ORDER = [
      { key: 'Corte', label: 'Corte', rawExec: p.CorteTotalExecutado, rawAExec: p.CorteTotalExecutar },
      { key: 'Dobra', label: 'Dobra', rawExec: p.DobraTotalExecutado, rawAExec: p.DobraTotalExecutar },
      { key: 'Solda', label: 'Solda', rawExec: p.SoldaTotalExecutado, rawAExec: p.SoldaTotalExecutar },
      { key: 'Pintura', label: 'Pintura', rawExec: p.PinturaTotalExecutado, rawAExec: p.PinturaTotalExecutar },
      { key: 'Montagem', label: 'Montagem', rawExec: p.MontagemTotalExecutado, rawAExec: p.MontagemTotalExecutar },
      { key: 'CorteaLaser', label: 'Corte a Laser', rawExec: p.CorteaLaserTotalExecutado, rawAExec: p.CorteaLaserTotalExecutar },
      { key: 'Punsionadeira', label: 'Punsionadeira', rawExec: p.PUNSIONADEIRATotalExecutado ?? p.PunsionadeiraTotalExecutado, rawAExec: p.PUNSIONADEIRATotalExecutar ?? p.PunsionadeiraTotalExecutar },
      { key: 'Galvanizar', label: 'Galvanizar', rawExec: p.GALVANIZARTotalExecutado ?? p.GalvanizarTotalExecutado, rawAExec: p.GALVANIZARTotalExecutar ?? p.GalvanizarTotalExecutar },
    ];

    const projQty = parseFloat(p.qtdetotalpecas ?? p.QtdePecasTags) || 1;
    const isFin = p.Finalizado?.trim() === 'C' || p.Finalizado?.trim() === 'S';

    const activeSectors = SECTOR_ORDER.filter(s => checkSectorActive(p, s.key));

    return activeSectors.map((s, idx) => {
      const dbExec = toNum({ val: s.rawExec });
      const dbAExec = toNum({ val: s.rawAExec });
      let exec = 0;
      let aExec = 0;
      if (isFin) {
        exec = dbExec > 0 ? dbExec : projQty;
        aExec = 0;
      } else {
        if (dbExec > 0 || dbAExec > 0) {
          exec = dbExec;
          aExec = dbAExec;
        } else {
          aExec = 0;
        }
      }
      const { pi, pf, minProd } = getSectorPlanningDates(p, s.key);
      const dias = getSectorDiasProducao(p, s.key);
      return { key: s.key, label: s.label, exec, aExec, dias, pi, pf, minProd };
    });
  };

  const openProjectSectorsModal = async (p: any) => {
    const projectSectors = getProjectSectors(p);
    
    setSectorModal({
      title: `PRODUÇÃO POR SETOR/RECURSO (PROJETO #${p.IdProjeto} - ${p.Projeto})`,
      targetType: 'projeto',
      targetId: p.IdProjeto,
      sectors: projectSectors,
      isLiberado: p.Finalizado === 'C' || p.Finalizado === 'S'
    });
  };

      const openTagSectorsModal = async (t: any, parentFinalizado: boolean = false) => {
    let items: any[] = [];
    try {
      const r = await (await fetch(`${API_BASE}/visao-geral/tag/${t.IdTag}/itens?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
      if (r.success && r.data && r.data.length > 0) {
        items = r.data;
        setTagItemsCache(prev => ({ ...prev, [t.IdTag]: r.data }));
      }
    } catch (e) {
      console.error('Error fetching Tag items for sector modal:', e);
    }

    const tagHeaderSectors = getTagSectors(t);
    const itemSectors = (items && items.length > 0) ? aggregateItemsSectors(items) : [];

    const map = new Map<string, any>();
    tagHeaderSectors.forEach(s => map.set(s.key, { ...s }));

    itemSectors.forEach(s => {
      const existing = map.get(s.key);
      if (!existing) {
        map.set(s.key, { ...s });
      } else {
        if (s.dias) existing.dias = s.dias;
        if (s.pi && s.pi !== '—') existing.pi = s.pi;
        if (s.pf && s.pf !== '—') existing.pf = s.pf;
        if (s.exec > 0) existing.exec = Math.max(existing.exec || 0, s.exec);
        if (s.aExec > 0) existing.aExec = Math.max(existing.aExec || 0, s.aExec);
        if (s.minProd > 0) existing.minProd = (existing.minProd || 0) + s.minProd;
      }
    });

    const mergedSectors = Array.from(map.values());
    setSectorModal({
      title: `PRODUÇÃO POR SETOR/RECURSO (TAG #${t.IdTag} — ${t.Tag})`,
      targetType: 'tag',
      targetId: t.IdTag,
      sectors: mergedSectors,
      allTags: tags,
      isLiberado: t.Finalizado === 'C' || t.Finalizado === 'S' || parentFinalizado
    });
  };

  const openOsSectorsModal = async (os: any, parentFinalizado: boolean = false) => {
    let items: any[] = [];
    try {
      const r = await (await fetch(`${API_BASE}/ordemservico/${os.IdOrdemServico}/itens?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
      if (r.success && r.data) {
        items = r.data;
        osModalItemsCache.current[os.IdOrdemServico] = r.data;
      }
    } catch (e) {
      console.error('Error fetching OS items for sector modal:', e);
    }

    const osHeaderSectors = getOsSectors(os);
    const itemSectors = (items && items.length > 0) ? aggregateItemsSectors(items) : [];

    const map = new Map<string, any>();
    osHeaderSectors.forEach(s => map.set(s.key, { ...s }));

    itemSectors.forEach(s => {
      const existing = map.get(s.key);
      if (!existing) {
        map.set(s.key, { ...s });
      } else {
        if (s.dias) existing.dias = s.dias;
        if (s.pi && s.pi !== '—') existing.pi = s.pi;
        if (s.pf && s.pf !== '—') existing.pf = s.pf;
        if (s.exec > 0) existing.exec = Math.max(existing.exec || 0, s.exec);
        if (s.aExec > 0) existing.aExec = Math.max(existing.aExec || 0, s.aExec);
        if (s.minProd > 0) existing.minProd = (existing.minProd || 0) + s.minProd;
      }
    });

    const mergedSectors = Array.from(map.values());
    setSectorModal({
      title: `PRODUÇÃO POR SETOR/RECURSO (ORDEM DE SERVIÇO #${os.IdOrdemServico})`,
      targetType: 'os',
      targetId: os.IdOrdemServico,
      sectors: mergedSectors,
      isLiberado: os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S' || parentFinalizado
    });
  };

  const openBulkOsSectorsModal = async (t: any, parentFinalizado: boolean = false) => {
    const osList = expandedTagsOs[t.IdTag] || [];
    if (osList.length === 0) {
      alert("Nenhuma Ordem de Serviço encontrada para esta Tag.");
      return;
    }

    let items: any[] = [];
    try {
      const r = await (await fetch(`${API_BASE}/visao-geral/tag/${t.IdTag}/itens?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
      if (r.success && r.data && r.data.length > 0) {
        items = r.data;
        setTagItemsCache(prev => ({ ...prev, [t.IdTag]: r.data }));
      }
    } catch (e) {
      console.error('Error fetching Tag items for bulk OS sector modal:', e);
    }

    const tagHeaderSectors = getTagSectors(t);
    const itemSectors = (items && items.length > 0) ? aggregateItemsSectors(items) : [];

    const map = new Map<string, any>();
    tagHeaderSectors.forEach(s => map.set(s.key, { ...s }));

    itemSectors.forEach(s => {
      const existing = map.get(s.key);
      if (!existing) {
        map.set(s.key, { ...s });
      } else {
        if (s.dias) existing.dias = s.dias;
        if (s.pi && s.pi !== '—') existing.pi = s.pi;
        if (s.pf && s.pf !== '—') existing.pf = s.pf;
        if (s.exec > 0) existing.exec = Math.max(existing.exec || 0, s.exec);
        if (s.aExec > 0) existing.aExec = Math.max(existing.aExec || 0, s.aExec);
        if (s.minProd > 0) existing.minProd = (existing.minProd || 0) + s.minProd;
      }
    });

    const mergedSectors = Array.from(map.values());
    setSectorModal({
      title: `PRODUÇÃO POR SETOR/RECURSO (OS DA TAG #${t.IdTag} — ${t.Tag})`,
      targetType: 'tag_os_bulk',
      targetId: t.IdTag,
      allOs: osList,
      sectors: mergedSectors,
      isLiberado: t.Finalizado === 'C' || t.Finalizado === 'S' || parentFinalizado
    });
  };

  const openItemSectorsModal = async (item: any, parentFinalizado: boolean = false) => {
    let freshItem = item;
    let mpData: any[] = [];
    try {
      const r = await (await fetch(`${API_BASE}/ordemservico/${item.IdOrdemServico}/itens?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
      if (r.success && r.data) {
        const found = r.data.find((i: any) => String(i.IdOrdemServicoItem) === String(item.IdOrdemServicoItem));
        if (found) freshItem = found;
      }
      const r2 = await (await fetch(`${API_BASE}/material-processo/item/${item.IdOrdemServicoItem}?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
      if (r2.success && r2.data) {
        mpData = r2.data;
      }
    } catch (e) {
      console.error('Error fetching fresh item for sector modal:', e);
    }

    const itemQty = parseFloat(freshItem.qtde ?? freshItem.QtdeTotal) || 1;
    let activeSectors = [];
    
    if (mpData && mpData.length > 0) {
      activeSectors = mpData.map(mp => ({
        key: mp.DescricaoProcesso || 'Processo',
        label: mp.DescricaoProcesso || 'Processo',
        exec: mp.TotalExecutado || 0,
        aExec: mp.TotalExecutar || 0,
        itemQty: itemQty,
        dias: mp.DiasProducao || 1,
        pi: mp.PlanejadoInicio || null,
        pf: mp.PlanejadoFinal || null,
        minProd: mp.MinutosProducao || mp.TempoEstimadoMin || 0,
        idMaterialProcesso: mp.IdMaterialProcesso
      }));
    } else {
      activeSectors = getItemActiveSectors(freshItem);
    }

    setSectorModal({
      title: `Produção por Setor/Recurso (Item #${item.IdOrdemServicoItem} — ${freshItem.DescResumo || item.DescResumo || 'Sem descrição'})`,
      targetType: 'item',
      targetId: item.IdOrdemServicoItem,
      sectors: activeSectors,
      isLiberado: item.OrdemServicoItemFinalizado === 'C' || item.OrdemServicoItemFinalizado === 'S' || parentFinalizado
    });
  };





    
  
  
  
  const toggleTagSectorsExpansion = async (idTag: number) => {
    setExpandedTagSectors(prev => ({ ...prev, [idTag]: !prev[idTag] }));
    if (!tagItemsCache[idTag] || tagItemsCache[idTag].length === 0) {
      try {
        const r = await (await authFetch(`${API_BASE}/visao-geral/tag/${idTag}/itens`)).json();
        if (r.success && r.data && r.data.length > 0) {
          setTagItemsCache(prev => ({ ...prev, [idTag]: r.data }));
        } else {
          // Fallback: Fetch OSs and items for each OS to ensure no items are missed
          const osRes = await (await authFetch(`${API_BASE}/visao-geral/tag/${idTag}/ordens-servico`)).json();
          if (osRes.success && osRes.data) {
            setExpandedTagsOs(prev => ({ ...prev, [idTag]: osRes.data }));
            const allItems: any[] = [];
            for (const os of osRes.data) {
              const itemRes = await (await authFetch(`${API_BASE}/ordemservico/${os.IdOrdemServico}/itens`)).json();
              if (itemRes.success && itemRes.data) {
                allItems.push(...itemRes.data);
              }
            }
            setTagItemsCache(prev => ({ ...prev, [idTag]: allItems }));
          }
        }
      } catch (e) {
        console.error('Erro ao buscar setores da tag:', e);
      }
    }
  };

  const toggleOsSectorsExpansion = async (idOs: string | number) => {
    setExpandedOsSectors(prev => ({ ...prev, [idOs]: !prev[idOs] }));
  };

  const toggleItemSectorsExpansion = (idItem: string | number) => {
    setExpandedItemSectors(prev => ({ ...prev, [idItem]: !prev[idItem] }));
  };


  const toggleOsExpansion = async (idTag: number) => {
    if (expandedTagsOs[idTag] !== undefined && expandedTagsOs[idTag] !== null) {
      setExpandedTagsOs(prev => {
        const next = { ...prev };
        delete next[idTag];
        return next;
      });
      return;
    }
    try {
      const r = await (await fetch(`${API_BASE}/visao-geral/tag/${idTag}/ordens-servico`, { headers: getAuthHeaders() })).json();
      if (r.success) {
        setExpandedTagsOs(prev => ({ ...prev, [idTag]: r.data }));
        setExpandedOsItems({});
        setShowSearchFilters(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOsForProject = async (idProj: number) => {
 setLoadOsDetails(true);
 try {
 const r = await (await fetch(`${API_BASE}/visao-geral/projeto/${idProj}/ordens-servico?t=${Date.now()}`, { headers: getAuthHeaders(), cache: 'no-store' })).json();
 if (r.success) {
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: r.data });
 } else {
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: [] });
 }
 } catch (e) {
 console.error(e);
 setOsDetailsModal({ type: 'projeto', id: idProj, osList: [] });
 } finally {
 setLoadOsDetails(false);
 }
 };

 const fetchTags = async (projId: number) => {
 setLoadTags(true);
 try {
 const r = await (await fetch(`${API_BASE}/acompanhamento/projeto/${projId}/tags?t=${Date.now()}`, { headers: getAuthHeaders() })).json();
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
 const resUsr = await (await authFetch(`${API_BASE}/config/usuarios`)).json();
 if (resUsr.success) setUsuarios(resUsr.usuarios);
 const resTipos = await (await authFetch(`${API_BASE}/config/tipostarefa`)).json();
 if (resTipos.success) setTipostarefa(resTipos.tipostarefa);
 
 // Carregar processos visíveis
 const resCfg = await (await authFetch(`${API_BASE}/config`)).json();
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

 
 const propagarDatasOS = async () => {
 if (!selTag) return; setIsSaving(true); setMsg(null);
 try {
 const updates: Record<string, unknown>[] = [];
 TAG_SECTORS.forEach(s => {
 const piVal = propagateSectorDates[s.fields.pi];
 if (piVal !== undefined) updates.push({ field: s.fields.pi, value: isoToBr(piVal) });
 const pfVal = propagateSectorDates[s.fields.pf];
 if (pfVal !== undefined) updates.push({ field: s.fields.pf, value: isoToBr(pfVal) });
 });
 const r = await (await fetch(`${API_BASE}/visao-geral/tag/${selTag.IdTag}/propagar-datas-os`, {
 method: 'PUT', headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ updates })
 })).json();
 if (r.success) {
 setMsg({ ok: true, t: 'Ordens de Serviço Atualizadas!' });
 setTimeout(() => setActionModal(null), 1500);
 } else {
 setMsg({ ok: false, t: r.message });
 }
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

   const handleSaveCalculatedSchedule = async (tag: Tag, schedule: any[], propagate: boolean) => {
    setIsSaving(true); 
    setMsg(null);
    try {
      const promises: Promise<any>[] = [];
      const updatesForOs: { field: string; value: string }[] = [];

      const keyToFields: Record<string, { pi: string; pf: string }> = {
        'Corte': { pi: 'PlanejadoInicioCorte', pf: 'PlanejadoFinalCorte' },
        'Laser': { pi: 'PlanejadoInicioCorteaLaser', pf: 'PlanejadoFinalCorteaLaser' },
        'Punsionadeira': { pi: 'PlanejadoInicioPunsionadeira', pf: 'PlanejadoFinalPunsionadeira' },
        'Dobra': { pi: 'PlanejadoInicioDobra', pf: 'PlanejadoFinalDobra' },
        'Solda': { pi: 'PlanejadoInicioSolda', pf: 'PlanejadoFinalSolda' },
        'Pintura': { pi: 'PlanejadoInicioPintura', pf: 'PlanejadoFinalPintura' },
        'Galvanizar': { pi: 'PlanejadoInicioGalvanizar', pf: 'PlanejadoFinalGalvanizar' },
        'Montagem': { pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem' },
      };

      for (const item of schedule) {
        const mapping = keyToFields[item.key];
        if (mapping) {
          promises.push(
            fetch(`${API_BASE}/visao-geral/tag/${tag.IdTag}/setor-data`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: mapping.pi, value: item.startDateBr })
            })
          );
          updatesForOs.push({ field: mapping.pi, value: item.startDateBr });

          promises.push(
            fetch(`${API_BASE}/visao-geral/tag/${tag.IdTag}/setor-data`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field: mapping.pf, value: item.endDateBr })
            })
          );
          updatesForOs.push({ field: mapping.pf, value: item.endDateBr });
        }
      }

      if (schedule.length > 0) {
        const lastEndDateBr = schedule[schedule.length - 1].endDateBr;
        promises.push(
          fetch(`${API_BASE}/acompanhamento/tags/${tag.IdTag}/previsao`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataPrevisao: lastEndDateBr, usuario: getUser() })
          })
        );
      }

      await Promise.all(promises);

      if (propagate) {
        const r = await (await fetch(`${API_BASE}/visao-geral/tag/${tag.IdTag}/propagar-datas-os`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: updatesForOs })
        })).json();
        if (r.success) {
          setMsg({ ok: true, t: 'Datas calculadas salvas e propagadas para todas as OSs!' });
        } else {
          setMsg({ ok: true, t: 'Datas calculadas salvas na Tag!' });
        }
      } else {
        setMsg({ ok: true, t: 'Datas calculadas salvas na Tag!' });
      }

      if (selProj) fetchTags(selProj.IdProjeto);
      setTimeout(() => setActionModal(null), 1500);
    } catch (err) {
      console.error('Erro ao salvar datas calculadas:', err);
      setMsg({ ok: false, t: 'Erro ao salvar datas de planejamento.' });
    } finally {
      setIsSaving(false);
    }
  };

        const handleSaveAllPlanning = async (selTagObj: Tag, scheduleItems: any[]) => {
    if (!selTagObj || !scheduleItems || scheduleItems.length === 0) return;
    setIsSaving(true);
    setMsg(null);

    try {
      const updates: { field: string; value: string }[] = [];

      scheduleItems.forEach(item => {
        if (item.piField && item.startDateBr) {
          updates.push({ field: item.piField, value: item.startDateBr });
          (selTagObj as any)[item.piField] = item.startDateBr;
          // Add camelCase alias if uppercase
          if (item.piField === 'PlanejadoInicioPUNSIONADEIRA') {
            updates.push({ field: 'PlanejadoInicioPunsionadeira', value: item.startDateBr });
            (selTagObj as any)['PlanejadoInicioPunsionadeira'] = item.startDateBr;
          }
          if (item.piField === 'PlanejadoInicioGALVANIZAR') {
            updates.push({ field: 'PlanejadoInicioGalvanizar', value: item.startDateBr });
            (selTagObj as any)['PlanejadoInicioGalvanizar'] = item.startDateBr;
          }
        }
        if (item.pfField && item.endDateBr) {
          updates.push({ field: item.pfField, value: item.endDateBr });
          (selTagObj as any)[item.pfField] = item.endDateBr;
          if (item.pfField === 'PlanejadoFinalPUNSIONADEIRA') {
            updates.push({ field: 'PlanejadoFinalPunsionadeira', value: item.endDateBr });
            (selTagObj as any)['PlanejadoFinalPunsionadeira'] = item.endDateBr;
          }
          if (item.pfField === 'PlanejadoFinalGALVANIZAR') {
            updates.push({ field: 'PlanejadoFinalGalvanizar', value: item.endDateBr });
            (selTagObj as any)['PlanejadoFinalGalvanizar'] = item.endDateBr;
          }
        }
      });

      if (scheduleItems.length > 0) {
        const lastEndDateBr = scheduleItems[scheduleItems.length - 1].endDateBr;
        updates.push({ field: 'DataPrevisao', value: lastEndDateBr });
        selTagObj.DataPrevisao = lastEndDateBr;
      }

      // Update state immediately for instant UI feedback
      setTags(prev => prev.map(tItem => {
        if (tItem.IdTag === selTagObj.IdTag) {
          const updated = { ...tItem };
          updates.forEach(u => { (updated as any)[u.field] = u.value; });
          return updated;
        }
        return tItem;
      }));

      // 1. Bulk update Tag table in MySQL
      const respTag = await fetch(`${API_BASE}/visao-geral/tag/${selTagObj.IdTag}/setor-data-bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const resTag = await respTag.json();

      // 2. Propagate to OSs and Items of OSs in MySQL
      const respOS = await fetch(`${API_BASE}/visao-geral/tag/${selTagObj.IdTag}/propagar-datas-os`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      const resOS = await respOS.json();

      if (resTag.success && resOS.success) {
        setMsg({ ok: true, t: 'Datas salvas com SUCESSO na Tag, Ordens de Serviço e Itens das OSs!' });
      } else {
        setMsg({ ok: true, t: 'Datas de planejamento salvas na Tag!' });
      }

      if (selProj) fetchTags(selProj.IdProjeto);

      setTimeout(() => {
        setShowPlanningDatesTag(prev => ({ ...prev, [selTagObj.IdTag]: false }));
        setMsg(null);
      }, 1500);
    } catch (err) {
      console.error('Erro ao salvar planejamento:', err);
      setMsg({ ok: false, t: 'Erro ao salvar datas de planejamento.' });
    } finally {
      setIsSaving(false);
    }
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
 <button type="button" onClick={() => setFProj('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
 {/* === FILTRO RADIO: 3 opções mutuamente exclusivas === */}
 <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 shadow-inner">
 {/* 1 - Finalizados */}
 <button type="button"
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
 <button type="button"
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
        {/* Nao Liberados */}
        <button type="button"
          onClick={() => {
            const next = statusFilter === 'nao_liberados' ? null : 'nao_liberados';
            setStatusFilter(next);
            fetchProj(next);
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all ${
            statusFilter === 'nao_liberados'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
          }`}
        >
          <Filter size={11} /> Não Liberados
        </button>

 {/* 3 - Todos */}
 <button type="button"
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
 <button type="button" onClick={() => setViewMode('card')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'card' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <LayoutGrid size={14} /> Cards
 </button>
 <button type="button" onClick={() => setViewMode('list')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <List size={14} /> Lista
 </button>
 <button type="button" onClick={() => window.location.href = '/acompanhamento-geral'} className="px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 text-slate-500 hover:text-slate-700" title="Abrir Acompanhamento Geral">
 <GanttChartSquare size={14} /> Gantt
 </button>
 <button type="button" onClick={() => setViewMode('tags')} className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'tags' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <TagIcon size={14} /> Tags Globais
 </button>
 </div>
 <button type="button" onClick={() => fetchProj(statusFilter)} className="flex-1 md:flex-none flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#32423D] text-white font-bold text-[10px] hover:bg-[#32423D]/80 transition shadow-sm"><Search size={12} /> Pesquisar</button>
 
 {/* Limpar */}
 <button type="button" onClick={() => {
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
 <button type="button" onClick={() => setFProjCriacaoIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-slate-400 text-[10px]">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjCriacaoFim} onChange={e => setFProjCriacaoFim(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjCriacaoFim && (
 <button type="button" onClick={() => setFProjCriacaoFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
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
 <button type="button" onClick={() => setFProjPrevIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 <span className="text-slate-400 text-[10px]">até</span>
 <div className="relative flex items-center w-full">
 <input type="date" value={fProjPrevFim} onChange={e => setFProjPrevFim(e.target.value)} className="pr-6 text-[10px] border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#32423D] w-full md:w-28" />
 {fProjPrevFim && (
 <button type="button" onClick={() => setFProjPrevFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
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
 <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors" title={isExpanded ? "Restaurar tamanho" : "Expandir grid"}>
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
 <thead className="bg-[#32423D] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-sm border-b border-white/20">
 <tr>
 <th colSpan={2} className="px-4 py-2.5 text-left">Tag / Descrição & Observação / Opções</th>
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
 <button type="button" onClick={(e) => { e.stopPropagation(); setSelProj(p); setMsg(null); setActionModal('temposProducaoProj'); setTemposProducaoSelId(''); setTemposProducaoValores({setup:0,padrao:0,total:0}); }} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded transition-colors border border-blue-200 shadow-sm flex items-center justify-center gap-1 text-[9px] font-bold uppercase" title="Exibir Produção em Minutos">
 <Clock size={10} className="pointer-events-none" /> T.Prod
 </button>
 <button type="button" onClick={(e) => { e.stopPropagation(); openProjectSectorsModal(p); }} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-1.5 py-0.5 rounded transition-colors border border-emerald-200 shadow-sm flex items-center justify-center gap-1 text-[9px] font-bold uppercase" title="Produção por Setores">
                    <Activity size={10} /> Prod. Recursos
                  </button>
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
 <button type="button" onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-[#32423D] hover:text-[#32423D]/70 font-bold uppercase underline decoration-blue-300 flex items-center gap-0.5" title="Editar Data"><Edit3 size={10}/> Edit</button>
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
 {!isFin ? (<>
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[9px] text-emerald-600 hover:bg-emerald-50 px-2 py-1.5 font-bold uppercase flex items-center justify-center gap-1 transition-colors rounded-lg border border-transparent hover:border-emerald-200 mt-0.5"><CheckCircle size={10} className="pointer-events-none"/> Finalizar Proj.</button>
 </>) : (
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
 <button type="button" onClick={() => { setSelProj(p); setDateInput(brToIso(p.DataPrevisao)); setMsg(null); setActionModal('dateProj'); }} className="text-[9px] text-[#32423D] hover:text-[#32423D]/70 font-bold uppercase underline decoration-blue-300 ml-4 flex items-center gap-0.5"><Edit3 size={10}/> Editar</button>
 </div>
 <span className={`text-xs font-bold ${businessDaysUntil(p.DataPrevisao) === -1 ? 'text-red-600' : 'text-slate-800'}`}>
 {p.DataPrevisao || 'Não definida'} {businessDaysUntil(p.DataPrevisao) === -1 && '(Atrasado)'}
 </span>
 </div>
 </div>
 <div className="flex flex-col gap-1 w-full sm:w-auto border-l border-slate-200 pl-3 shrink-0 items-start">
 <div className="flex gap-2 w-full flex-wrap">
 {!isFin ? (<>
 <button type="button" onClick={() => { setSelProj(p); setMsg(null); setActionModal('fin'); }} className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold uppercase underline decoration-emerald-300 flex items-center gap-1 transition-colors"><CheckCircle size={12} className="pointer-events-none"/> Finalizar Projeto</button>
 </>) : (
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
 <button type="button" 
 onClick={() => window.location.href = '/visao-geral-pendencias'}
 className="mt-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 text-xs px-4 py-1.5 rounded-md transition-colors shadow-sm cursor-pointer flex items-center gap-2"
 >
&larr; Voltar para Todas as Pendências
 </button>
 </div>
 )}

 {/* ══ MODAL DE COMPLETO DE TAGS DA SEGUNDA TELA ══ */}
 
{/* ══ MODAL DE MONTAR DATAS DE PLANEJAMENTO DA TAG ══ */}


  {showDetailsModal && selProj && (
 <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center sm:p-4">
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
  {showSearchFilters && (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Entrada:</span>
        <div className="relative flex items-center w-full">
          <input type="date" value={fDataEntradaIni} onChange={e => setFDataEntradaIni(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
          {fDataEntradaIni && (
            <button type="button" onClick={() => setFDataEntradaIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
        <div className="relative flex items-center w-full">
          <input type="date" value={fDataEntradaFim} onChange={e => setFDataEntradaFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
          {fDataEntradaFim && (
            <button type="button" onClick={() => setFDataEntradaFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
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
            <button type="button" onClick={() => setFDataPrevIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
        <div className="relative flex items-center w-full">
          <input type="date" value={fDataPrevFim} onChange={e => setFDataPrevFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
          {fDataPrevFim && (
            <button type="button" onClick={() => setFDataPrevFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
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
            <button type="button" onClick={() => setFTag('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
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
            <button type="button" onClick={() => setFDataPlanIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-black uppercase">até</span>
        <div className="relative flex items-center w-full">
          <input type="date" value={fDataPlanFim} onChange={e => setFDataPlanFim(e.target.value)} className="pr-6 bg-white border border-slate-200 hover:border-blue-300 focus:border-[#32423D] rounded-lg outline-none text-[10px] text-slate-700 px-2 py-1.5 shadow-sm leading-none transition-colors" />
          {fDataPlanFim && (
            <button type="button" onClick={() => setFDataPlanFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {(fTag || fDataEntradaIni || fDataEntradaFim || fDataPrevIni || fDataPrevFim || fDataPlanIni || fDataPlanFim) && (
        <button type="button" onClick={() => { setFTag(''); setFDataEntradaIni(''); setFDataEntradaFim(''); setFDataPrevIni(''); setFDataPrevFim(''); setFDataPlanIni(''); setFDataPlanFim(''); }} className="bg-slate-100 border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0" title="Limpar filtros">
          <X size={14} /> <span>Limpar</span>
        </button>
      )}
      <div className="h-6 w-px bg-slate-300 hidden sm:block shrink-0"></div>
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
        <button type="button" onClick={() => setViewModeTags('detailed')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${viewModeTags === 'detailed' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <LayoutGrid size={12} /> Detalhado
        </button>
        <button type="button" onClick={() => setViewModeTags('list')} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${viewModeTags === 'list' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <List size={12} /> Lista Limpa
        </button>
      </div>
    </>
  )}

  <button type="button" 
    onClick={() => setShowSearchFilters(prev => !prev)} 
    className="bg-white border border-slate-300 hover:bg-slate-100 p-2 rounded-lg text-slate-700 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0"
    title={showSearchFilters ? "Ocultar dados de pesquisa" : "Exibir dados de pesquisa"}
  >
    <Search size={14} className="text-[#32423D]" />
    <span>{showSearchFilters ? 'Ocultar Pesquisa' : 'Exibir Pesquisa'}</span>
  </button>

  <button type="button" onClick={() => setShowDetailsModal(false)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-2 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1 font-bold text-xs shrink-0">
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
 <thead className="bg-[#32423D] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-sm border-b border-white/20">
 <tr>
 <th colSpan={2} className="px-4 py-2.5 text-left">Tag / Descrição & Observação / Opções</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
  {filteredTags.map((t, idx) => {
    const tFin = t.Finalizado?.trim() === 'C' || t.Finalizado?.trim() === 'S';
    const isProjFin = selProj?.Finalizado?.trim() === 'C' || selProj?.Finalizado?.trim() === 'S';
    return (
      <React.Fragment key={t.IdTag}>
        <tr className={`group hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafcfd]'}`}>
          <td colSpan={2} className="px-3 py-1 border-b border-slate-200">
            <div className="flex flex-col gap-1">
              {/* LINHA 1: Tag Name, Status, Badges (Previsão & Qtd. OS) Próximos */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input type="checkbox" className="w-3 h-3 cursor-pointer mr-1" checked={selectedTagsForSectors.includes(t.IdTag)} onChange={(e) => { e.stopPropagation(); if (e.target.checked) setSelectedTagsForSectors(prev => [...prev, t.IdTag]); else setSelectedTagsForSectors(prev => prev.filter(id => id !== t.IdTag)); }} title="Selecionar para Prod. Recursos" />
                  <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${tFin ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="font-black text-slate-800 text-xs truncate max-w-[400px]" title={t.Tag}>{t.Tag}</span>
                  <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[8.5px] px-1 py-0 rounded font-bold leading-tight">Cod: {t.IdTag}</span>
                  {t.StatusTag && <span className="bg-slate-100 border border-slate-200 text-slate-500 text-[8.5px] px-1 py-0 rounded font-bold uppercase leading-tight">{t.StatusTag}</span>}
                  
                  {/* BADGES DE PREVISÃO E QTD. OS BEM PRÓXIMOS DOS DADOS DA TAG */}
                  <div className="flex items-center gap-2 ml-2 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 shadow-xs">
                    <DateBadge editable={true} onClick={() => { setSelTag(t); setDateInput(brToIso(t.DataPrevisao)); setMsg(null); setActionModal('dateTagGlobal'); }} date={t.DataPrevisao} label="Previsão" />
                    <div 
                      className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${parseInt(t.QtdeOS || '0') > 0 ? 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 cursor-pointer group' : 'bg-slate-50 text-slate-400'}`}
                      onClick={() => { if (parseInt(t.QtdeOS || '0') > 0) toggleOsExpansion(t.IdTag); }}
                      title={parseInt(t.QtdeOS || '0') > 0 ? "Clique para exibir Ordens de Serviço inline" : ""}
                    >
                      <span className="font-bold uppercase tracking-widest text-[8px] text-slate-500">Qtd. OS:</span>
                      <span className="font-black text-slate-800 text-xs">{t.QtdeOS || '0'}</span>
                      {parseInt(t.QtdeOS || '0') > 0 && (
                        <span className="text-[8.5px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded uppercase ml-1">
                          {expandedTagsOs[t.IdTag] ? 'Ocultar' : 'Exibir'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÕES DA TAG */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); if (selProj) fetchRncs(selProj.IdProjeto, 'VISAOGERALTAG'); setRncForm({ idTag: t.IdTag, tag: t.Tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false }); setActionModal('addRnc'); }}
                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Gerar Pendência para esta Tag"
                  >
                    <ShieldAlert size={11} /> Pendência
                  </button>
                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); if (selProj) fetchRncs(selProj.IdProjeto, 'ACAOPCP'); setRncForm({ idTag: t.IdTag, tag: t.Tag, descricao: '', setor: 'Corte', usuario: '', tipoTarefa: '', dataExec: '', usuarioFin: '', dataFin: '', setorFin: 'Corte', descFin: '', wantsToFinalize: false }); setActionModal('addTask'); }}
                    className="bg-[#E0E800]/20 hover:bg-[#E0E800]/30 border border-amber-300 text-[#32423D] px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Agendar Tarefa"
                  >
                    <CalendarDays size={11} /> Tarefa
                  </button>
                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); if (isProjFin || tFin) return; setSelTag(t); setPlanejarProjetistaForm({ projetistaPlanejado: t.ProjetistaPlanejado || '', planejadoInicioEngenharia: brToIso(t.PlanejadoInicioEngenharia || ''), planejadoFinalEngenharia: brToIso(t.PlanejadoFinalEngenharia || '') }); setMsg(null); setActionModal('planejarProjetista'); }}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Planejar Projetista e Engenharia"
                  >
                    <Edit3 size={11} /> Plan. Eng/Proj.
                  </button>

                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); openTagSectorsModal(t, isProjFin); }}
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Produção por Setores (Tag)"
                  >
                    <Activity size={11} /> Prod. Recursos
                  </button>

                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); if (isProjFin || tFin) return; setSelTag(t); setQtdeLiberadaForm({ qtdeLiberada: t.QtdeLiberada || '0' }); setMsg(null); setActionModal('alterarQtdeLiberada'); }}
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Alterar Qtde Liberada"
                  >
                    <Edit3 size={11} /> Qtde Lib.
                  </button>
                  <button type="button" 
                    onClick={(e) => { e.stopPropagation(); setSelTag(t); setMsg(null); setActionModal('temposProducao'); }}
                    className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                    title="Exibir Produção em Minutos"
                  >
                    <Clock size={11} /> Tempo Prod.
                  </button>
                  {!t.Finalizado && (
                    <button type="button" 
                      onClick={(e) => { e.stopPropagation(); setSelTag(t); setMsg(null); setActionModal('finTag'); }}
                      className="bg-slate-50 hover:bg-green-100 border border-slate-200 hover:border-green-300 text-slate-500 hover:text-green-700 px-2 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                      title="Finalizar Tag(s)"
                    >
                      <CheckCircle size={11} /> Finalizar
                    </button>
                  )}

                </div>
              </div>

              {/* LINHA 2 e 3: Descrição da Tag & OBS Juntas para economizar espaço vertical */}
              <div className="flex flex-col gap-0.5 mt-0.5">
                {t.DescTag && <div className="text-[10px] text-slate-500 line-clamp-1 leading-tight" title={t.DescTag}>{t.DescTag}</div>}
                
                {/* CAMPO DE DIGITAÇÃO DE OBSERVAÇÃO AUTOMÁTICO */}
                <div className="flex items-center gap-1.5 max-w-3xl mt-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">Obs:</span>
                  <input 
                    type="text"
                    placeholder="Digite a observação para esta Tag..."
                    defaultValue={t.Observacao || ''}
                    onBlur={async (e) => {
                    const val = e.target.value;
                    if (val !== (t.Observacao || '')) {
                      try {
                        await fetch(`${API_BASE}/acompanhamento/tags/${t.IdTag}/observacao`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ observacao: val })
                        });
                        t.Observacao = val;
                      } catch (err) {
                        console.error('Erro ao atualizar observação:', err);
                      }
                    }
                  }}
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-indigo-400 rounded px-2.5 py-0.5 text-[11px] text-slate-700 outline-none transition-all placeholder:text-slate-300 shadow-xs"
                />
              </div>
              </div>
            </div>
          </td>
        </tr>

{/* ══ ROW EXPANSIVEL DE SETORES DA TAG ══ */}
        {expandedTagSectors[t.IdTag] && (() => {
          const activeSectors = getTagSectors(t);

          return (
            <tr>
              <td colSpan={2} className="p-0 border-b border-slate-200">
                <div className="p-3 bg-[#eaf4f0] border-y border-[#32423D]/20 shadow-inner animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#32423D]/20">
                    <h6 className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                      <Activity size={13} className="text-[#32423D]" />
                      Produção por Setor/Recurso (Tag #{t.IdTag} — {t.Tag})
                    </h6>
                    <button type="button" onClick={() => toggleTagSectorsExpansion(t.IdTag)} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors" title="Fechar"><X size={14} /></button>
                  </div>
                  {activeSectors.length === 0 ? (
                    <div className="py-2 text-center text-slate-500 text-xs font-medium">Nenhum recurso/setor ativo localizado para esta Tag.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm max-w-3xl">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider text-[9px] border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-1.5 border-r border-slate-200">Setor / Recurso</th>
                            <th className="px-3 py-1.5 text-center border-r border-slate-200 w-24">Executado</th>
                            <th className="px-3 py-1.5 text-center border-r border-slate-200 w-24">A Executar</th>
                            <th className="px-3 py-1.5 text-center w-44">Conclusão (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeSectors.map(s => {
                            const tot = s.exec + s.aExec;
                            const calcPct = tot > 0 ? Math.min(100, Math.round((s.exec / tot) * 100)) : 0;
                            return (
                              <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-100 uppercase flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#32423D] shrink-0" />
                                  <span>{s.label}</span>
                                </td>
                                <td className="px-3 py-1.5 text-center font-bold text-emerald-700 border-r border-slate-100 bg-emerald-50/20">{s.exec}</td>
                                <td className="px-3 py-1.5 text-center font-bold text-amber-700 border-r border-slate-100 bg-amber-50/20">{s.aExec}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <div className="flex items-center gap-2 px-1">
                                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-300 ${calcPct === 100 ? 'bg-emerald-500' : 'bg-[#32423D]'}`} style={{ width: `${calcPct}%` }} />
                                    </div>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${calcPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{calcPct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          );
        })()}

        {/* ══ EXPANSÃO DAS OSs DA TAG ══ */}
        {expandedTagsOs[t.IdTag] && (
          <tr>
            <td colSpan={2} className="p-0 border-b border-slate-200">
              <div className="p-4 bg-slate-50 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <List size={14} className="text-[#32423D]" /> Ordens de Serviço para a Tag {t.Tag}
                  </h4>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openBulkOsSectorsModal(t, isProjFin); }} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                      <Activity size={12} /> Prod. Recursos
                    </button>
                </div>
                <div className="overflow-x-auto rounded border border-slate-200">
                  <table className="w-full text-[10px] text-left whitespace-nowrap">
                    <thead className="bg-slate-200 text-slate-700 uppercase font-bold tracking-wider text-[9px]">
                      <tr>
                        <th className="px-2 py-1.5 border-b border-slate-300">OS / Descrição</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Lib. Eng.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Prev.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Qtd. Tot.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Peso Tot.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Fator</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Qtd. Itens</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Itens Exec.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Peças Exec.</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center">Tot. Peças</th>
                        <th className="px-2 py-1.5 border-b border-slate-300 text-center w-24">Status</th>
             <th className="px-2 py-1.5 border-b border-slate-300 text-center w-28">Opções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {expandedTagsOs[t.IdTag].map((os: any) => (
                        <React.Fragment key={os.IdOrdemServico}>
                          <tr 
                            className={`hover:bg-slate-100 transition-colors cursor-pointer ${expandedOsItems[os.IdOrdemServico] ? 'bg-slate-50' : ''}`}
                            onClick={() => toggleOsItemExpansion(os.IdOrdemServico)}
                            title="Clique para ver os Itens da Ordem de Serviço"
                          >
                            <td className="px-3 py-2 border-r border-slate-100 flex items-center gap-2">
                              <span className="text-slate-400 font-bold">{expandedOsItems[os.IdOrdemServico] ? '▼' : '▶'}</span>
                              <div>
                                <div className="font-bold text-slate-800">OS: {os.IdOrdemServico}</div>
                                <div className="text-[9px] text-slate-500 max-w-[200px] truncate" title={os.Descricao}>{os.Descricao}</div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center border-r border-slate-100">
                              <div className={`font-bold ${os.Liberado_Engenharia === 'S' ? 'text-emerald-600' : 'text-slate-400'}`}>{os.Liberado_Engenharia === 'S' ? 'Sim' : 'Não'}</div>
                              {os.Data_Liberacao_Engenharia && <div className="text-[9px] text-slate-500">{isoToBr(os.Data_Liberacao_Engenharia.split('T')[0])}</div>}
                            </td>
                            {(() => {
                              const osItems = expandedOsItems[os.IdOrdemServico] || (tagItemsCache[t.IdTag] ? tagItemsCache[t.IdTag].filter((i: any) => String(i.IdOrdemServico) === String(os.IdOrdemServico)) : undefined);
                              const comp = getOsComputedTotals(os, osItems);
                              return (
                                <>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 font-bold text-slate-600">{os.DataPrevisao ? isoToBr(os.DataPrevisao.split('T')[0]) : '—'}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-700 font-bold">{comp.totalPecas}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-700">{comp.pesoTotal > 0 ? comp.pesoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' kg' : '—'}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-700">{os.Fator || '1'}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-700 font-bold">{comp.totalItens}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-emerald-600 font-bold">{comp.itensExecutados}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-emerald-600 font-bold">{comp.pecasExecutadas}</td>
                                  <td className="px-3 py-2 text-center border-r border-slate-100 text-slate-700 font-bold">{comp.totalPecas}</td>
                                </>
                              );
                            })()}
                            <td className="px-2 py-2 text-center border-r border-slate-100 w-24">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-block ${os.OrdemServicoFinalizado === 'C' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {os.OrdemServicoFinalizado === 'C' ? 'Finalizada' : 'Aberta'}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-center border-r border-slate-100">
                               <div className="flex flex-col gap-1">
                                 <button type="button" 
                                   onClick={(e) => { e.stopPropagation(); setSelOs(os); setMsg(null); setActionModal('temposProducaoOs'); setTemposProducaoSelId(''); setTemposProducaoValores({setup:0,padrao:0,total:0}); }}
                                   className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-2 py-0.5 rounded text-[8.5px] font-bold flex items-center justify-center gap-1 transition-colors w-full"
                                   title="Exibir Produção em Minutos"
                                 >
                                   <Clock size={10} /> Tempo Prod.
                                 </button>
                               </div>
                            </td>
                          </tr>
                          {/* ROW EXPANSIVEL DE SETORES DA OS */}
                          {expandedOsSectors[os.IdOrdemServico] && (() => {
                            const activeSectors = getOsSectors(os);

                            return (
                              <tr>
                                <td colSpan={12} className="p-0 border-b border-slate-200">
                                  <div className="p-3 bg-[#eaf4f0] border-y border-[#32423D]/20 shadow-inner animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#32423D]/20">
                                      <h6 className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                                        <Activity size={13} className="text-[#32423D]" />
                                        Produção por Setor/Recurso (Ordem de Serviço #{os.IdOrdemServico})
                                      </h6>
                                      <button type="button" onClick={() => toggleOsSectorsExpansion(os.IdOrdemServico)} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors" title="Fechar"><X size={14} /></button>
                                    </div>
                                    {activeSectors.length === 0 ? (
                                      <div className="py-2 text-center text-slate-500 text-xs font-medium">Nenhum recurso/setor ativo localizado para esta OS.</div>
                                    ) : (
                                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm max-w-3xl">
                                        <table className="w-full text-xs text-left border-collapse">
                                          <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider text-[9px] border-b border-slate-200">
                                            <tr>
                                              <th className="px-3 py-1.5 border-r border-slate-200">Setor / Recurso</th>
                                              <th className="px-3 py-1.5 text-center border-r border-slate-200 w-24">Executado</th>
                                              <th className="px-3 py-1.5 text-center border-r border-slate-200 w-24">A Executar</th>
                                              <th className="px-3 py-1.5 text-center w-44">Conclusão (%)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {activeSectors.map(s => {
                                              const tot = s.exec + s.aExec;
                                              const calcPct = tot > 0 ? Math.min(100, Math.round((s.exec / tot) * 100)) : 0;
                                              return (
                                                <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                                                  <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-100 uppercase flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#32423D] shrink-0" /><span>{s.label}</span></td>
                                                  <td className="px-3 py-1.5 text-center font-bold text-emerald-700 border-r border-slate-100 bg-emerald-50/20">{s.exec}</td>
                                                  <td className="px-3 py-1.5 text-center font-bold text-amber-700 border-r border-slate-100 bg-amber-50/20">{s.aExec}</td>
                                                  <td className="px-3 py-1.5 text-center">
                                                    <div className="flex items-center gap-2 px-1">
                                                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-300 ${calcPct === 100 ? 'bg-emerald-500' : 'bg-[#32423D]'}`} style={{ width: `${calcPct}%` }} /></div>
                                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${calcPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{calcPct}%</span>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          {/* ROW EXPANSIVEL DE ITENS DA OS */}
                          {expandedOsItems[os.IdOrdemServico] && (
                            <tr>
                              <td colSpan={12} className="p-0 border-b border-slate-200">
                                <div className="px-0 py-3 bg-[#f0f4f8] shadow-inner border-y border-[#dbeafe]">
                                  
                                  <div className="overflow-x-auto rounded border border-slate-300">
                                    <table className="w-full text-[9px] text-left whitespace-nowrap">
                                      <thead className="bg-sky-100/90 text-sky-950 uppercase font-extrabold tracking-wider text-[8.5px] border-b border-sky-200">
                                         <tr>
                                           <th className="px-2 py-1 border-b border-slate-300">Resumo / Detalhado</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Cód. Mat.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Prod. Princ.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Medidas (E x A x L)</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Acab.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Fator</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Lib. Eng.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Prev.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center">Qtd./Tot.</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center w-24">Status</th>
                                           <th className="px-1.5 py-1 border-b border-slate-300 text-center w-32">Opções</th>
                                         </tr>
                                       </thead>
                                      <tbody className="divide-y divide-slate-200 bg-white">
                                        {expandedOsItems[os.IdOrdemServico].map((item: any) => (
                                          <React.Fragment key={item.IdOrdemServicoItem}>
                                            <tr className="bg-[#f7fbff] hover:bg-sky-100/70 transition-colors border-b border-sky-100/60">
                                              <td className="px-2 py-1.5 border-r border-slate-100">
                                                <div className="font-bold text-slate-800" title={item.DescResumo}>{item.DescResumo || '—'}</div>
                                                <div className="text-[8px] text-slate-500 line-clamp-1" title={item.DescDetal}>{item.DescDetal || '—'}</div>
                                              </td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 font-mono text-slate-600">{item.CodMatFabricante || '—'}</td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100">
                                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${item.ProdutoPrincipal === 'S' || item.ProdutoPrincipal === 'Sim' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}>{item.ProdutoPrincipal === 'S' || item.ProdutoPrincipal === 'Sim' ? 'Sim' : 'Não'}</span>
                                              </td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 text-slate-600">
                                                {item.Espessura || '-'} x {item.Altura || '-'} x {item.Largura || '-'}
                                              </td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 text-slate-600">{item.Acabamento || '—'}</td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 text-slate-600">{item.Fator || '—'}</td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100">
                                                <div className={`font-bold ${item.Liberado_Engenharia === 'S' ? 'text-emerald-600' : 'text-slate-400'}`}>{item.Liberado_Engenharia === 'S' ? 'Sim' : 'Não'}</div>
                                                {item.Data_Liberacao_Engenharia && <div className="text-[8px] text-slate-500">{isoToBr(item.Data_Liberacao_Engenharia.split('T')[0])}</div>}
                                              </td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 font-bold text-slate-600">{item.DataPrevisao ? isoToBr(item.DataPrevisao.split('T')[0]) : '—'}</td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100">
                                                <div className="font-bold text-slate-800">{item.qtde || '0'}</div>
                                                <div className="text-[8px] text-slate-500">{item.QtdeTotal || '0'}</div>
                                              </td>
                                              <td className="px-2 py-1.5 text-center border-r border-slate-100 w-24">
                                                  <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase inline-block ${item.OrdemServicoItemFinalizado === 'C' || item.OrdemServicoItemFinalizado === 'S' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.OrdemServicoItemFinalizado === 'C' || item.OrdemServicoItemFinalizado === 'S' ? 'Finalizado' : 'Aberto'}
                                                  </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center w-32">
                                                  <div className="flex justify-center gap-1 flex-wrap">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        openItemSectorsModal(item, isProjFin || tFin || (os.OrdemServicoFinalizado?.trim() === 'C' || os.OrdemServicoFinalizado?.trim() === 'S'));
                                                      }}
                                                      className="text-[8.5px] font-bold px-2 py-0.5 rounded shadow-sm transition-colors inline-flex items-center gap-1 whitespace-nowrap bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800"
                                                      title="Exibir Produção dos Setores / Recursos deste Item"
                                                    >
                                                      <Activity size={9} /> Prod. Recursos
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!item.IdMaterial) {
                                                          alert('Não existe arquivo para o código selecionado');
                                                          return;
                                                        }
                                                        try {
                                                          const res = await authFetch(`${API_BASE}/materiais/${item.IdMaterial}/arquivos`);
                                                          const json = await res.json();
                                                          if (json.success && json.data && json.data.length > 0) {
                                                            const file = json.data[0];
                                                            let token = localStorage.getItem('sinco_token') || localStorage.getItem('superadmin_token');
                                                            window.open(`${API_BASE}/materiais/arquivos/${file.idArquivo}/download?token=${token}`, '_blank');
                                                          } else {
                                                            alert('Não existe arquivo para o código selecionado');
                                                          }
                                                        } catch (error) {
                                                          console.error('Error opening PDF:', error);
                                                          alert('Erro ao buscar o arquivo.');
                                                        }
                                                      }}
                                                      className="text-[8.5px] font-bold px-2 py-0.5 rounded shadow-sm transition-colors inline-flex items-center gap-1 whitespace-nowrap bg-red-50 hover:bg-red-100 border border-red-200 text-red-800"
                                                      title="Abrir PDF do Material"
                                                    >
                                                      <FileDown size={9} /> PDF
                                                    </button>
                                                  </div>
                                                </td>
                                            </tr>
                                            {/* ══ ROW INDEPENDENTE: PRODUÇÃO DOS SETORES DO ITEM DA OS ══ */}
                                            {expandedItemSectors[item.IdOrdemServicoItem] && (() => {
                                              const activeSectors = getItemActiveSectors(item);

                                              return (
                                                <tr>
                                                  <td colSpan={15} className="p-0 border-b border-slate-200">
                                                    <div className="p-2.5 bg-[#f0f7f4] border-y border-[#32423D]/20 shadow-inner animate-in fade-in duration-150">
                                                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#32423D]/20">
                                                        <h6 className="text-[10px] font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                                                          <Activity size={12} className="text-[#32423D]" />
                                                          Produção por Setor/Recurso (Item #{item.IdOrdemServicoItem} — {item.DescResumo || 'Sem descrição'})
                                                        </h6>
                                                        <button type="button" 
                                                          onClick={() => toggleItemSectorsExpansion(item.IdOrdemServicoItem)}
                                                          className="text-slate-400 hover:text-red-500 p-0.5 transition-colors"
                                                          title="Fechar"
                                                        >
                                                          <X size={13} />
                                                        </button>
                                                      </div>

                                                      {activeSectors.length === 0 ? (
                                                        <div className="py-2 text-center text-slate-500 text-[10px] font-medium">
                                                          Nenhum recurso/setor ativo localizado para este Item.
                                                        </div>
                                                      ) : (
                                                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm max-w-3xl">
                                                          <table className="w-full text-[9px] text-left border-collapse">
                                                            <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider text-[8.5px] border-b border-slate-200">
                                                              <tr>
                                                                <th className="px-2.5 py-1 border-r border-slate-200">Setor / Recurso</th>
                                                                <th className="px-2.5 py-1 text-center border-r border-slate-200 w-24">Executado</th>
                                                                <th className="px-2.5 py-1 text-center border-r border-slate-200 w-24">A Executar</th>
                                                                <th className="px-2.5 py-1 text-center w-44">Conclusão (%)</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                              {activeSectors.map(s => {
                                                                const totalBase = s.exec + s.aExec;
                                                                const calcPct = totalBase > 0 ? Math.min(100, Math.round((s.exec / totalBase) * 100)) : 0;

                                                                return (
                                                                  <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-2.5 py-1 font-bold text-slate-800 border-r border-slate-100 uppercase flex items-center gap-1.5">
                                                                      <span className="w-1.5 h-1.5 rounded-full bg-[#32423D] shrink-0" />
                                                                      <span>{s.label}</span>
                                                                    </td>
                                                                    <td className="px-2.5 py-1 text-center font-bold text-emerald-700 border-r border-slate-100 bg-emerald-50/20">
                                                                      {s.exec}
                                                                    </td>
                                                                    <td className="px-2.5 py-1 text-center font-bold text-amber-700 border-r border-slate-100 bg-amber-50/20">
                                                                      {s.aExec}
                                                                    </td>
                                                                    <td className="px-2.5 py-1 text-center">
                                                                      <div className="flex items-center gap-1.5 px-1">
                                                                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                          <div 
                                                                            className={`h-full transition-all duration-300 ${calcPct === 100 ? 'bg-emerald-500' : 'bg-[#32423D]'}`}
                                                                            style={{ width: `${calcPct}%` }}
                                                                          />
                                                                        </div>
                                                                        <span className={`text-[8.5px] font-black px-1 py-0.5 rounded shrink-0 ${calcPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                                                                          {calcPct}%
                                                                        </span>
                                                                      </div>
                                                                    </td>
                                                                  </tr>
                                                                );
                                                              })}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })()}
                                          </React.Fragment>
                                        ))}
                                        {expandedOsItems[os.IdOrdemServico].length === 0 && (
                                          <tr><td colSpan={13} className="px-2 py-3 text-center text-slate-400 font-medium">Nenhum Item localizado para esta OS.</td></tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {expandedTagsOs[t.IdTag].length === 0 && (
                        <tr>
                          <td colSpan={12} className="px-3 py-4 text-center text-slate-400 font-medium">Nenhuma Ordem de Serviço encontrada para esta Tag.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  })}
</tbody>
 </table>
 </div>
 )}
 </div>
 <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
 <button type="button" onClick={() => setOsDetailsModal(null)} className="px-2 py-1 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-bold transition-colors">
 Voltar
 </button>
 </div>
  </div>
  </div>
  )}

  {/* MODAL DE PRODUÇÃO POR SETORES DA TAG / OS / ITEM */}
  {sectorModal && (
    <SectorProductionModal
      modalData={sectorModal}
      onClose={() => setSectorModal(null)}
      onSaved={() => {
        osModalItemsCache.current = {};
        setTagItemsCache({});
        setExpandedOsItems({});
        fetchVisaoGeralData();
      }}
    />
  )}

  {actionModal === 'temposProducaoProj' && selProj && (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Produção em Minutos</h3>
              <p className="text-[11px] text-slate-500">Visualizar tempos do Projeto {selProj.Projeto}</p>
            </div>
          </div>
          <button type="button" onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Processo de Fabricação</label>
              <select
                value={temposProducaoSelId}
                onChange={handleSelectRecursoTemposProj}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione um recurso...</option>
                {temposProducaoRecursos.map(r => (
                  <option key={r.IdProcessoFabricacao} value={r.IdProcessoFabricacao}>
                    {r.processofabricacao}
                  </option>
                ))}
              </select>
            </div>
            
            {temposProducaoSelId && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Setup</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.setup}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Padrão</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.padrao}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total</div>
                  <div className="text-lg font-bold text-blue-800">{temposProducaoValores.total}</div>
                  <div className="text-[10px] text-blue-400">min</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setActionModal(null)}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}

  {actionModal === 'temposProducaoOs' && selOs && (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Produção em Minutos</h3>
              <p className="text-[11px] text-slate-500">Visualizar tempos da OS {selOs.IdOrdemServico}</p>
            </div>
          </div>
          <button type="button" onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Processo de Fabricação</label>
              <select
                value={temposProducaoSelId}
                onChange={handleSelectRecursoTemposOs}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione um recurso...</option>
                {temposProducaoRecursos.map(r => (
                  <option key={r.IdProcessoFabricacao} value={r.IdProcessoFabricacao}>
                    {r.processofabricacao}
                  </option>
                ))}
              </select>
            </div>
            
            {temposProducaoSelId && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Setup</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.setup}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Padrão</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.padrao}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total</div>
                  <div className="text-lg font-bold text-blue-800">{temposProducaoValores.total}</div>
                  <div className="text-[10px] text-blue-400">min</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setActionModal(null)}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}

  {actionModal === 'temposProducao' && selTag && (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Produção em Minutos</h3>
              <p className="text-[11px] text-slate-500">Visualizar tempos da OS {selTag.Tag}</p>
            </div>
          </div>
          <button type="button" onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Processo de Fabricação</label>
              <select
                value={temposProducaoSelId}
                onChange={handleSelectRecursoTempos}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione um recurso...</option>
                {temposProducaoRecursos.map(r => (
                  <option key={r.IdProcessoFabricacao} value={r.IdProcessoFabricacao}>
                    {r.processofabricacao}
                  </option>
                ))}
              </select>
            </div>
            
            {temposProducaoSelId && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Setup</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.setup}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Padrão</div>
                  <div className="text-lg font-bold text-slate-800">{temposProducaoValores.padrao}</div>
                  <div className="text-[10px] text-slate-400">min</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total</div>
                  <div className="text-lg font-bold text-blue-800">{temposProducaoValores.total}</div>
                  <div className="text-[10px] text-blue-400">min</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setActionModal(null)}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )}

{showProdSetoresModal && (<ProdSetoresModal onClose={() => { setShowProdSetoresModal(false); setSelProjForSectors(null); setSelOsForSectors(null); }} projeto={selProjForSectors} selectedTagsIds={selectedTagsForSectors} osAlvo={selOsForSectors} />)}
  </div>
  );
}