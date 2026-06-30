import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Calendar, LayoutGrid, CheckCircle2, Circle, Target, Hash, ArrowLeft, X, XCircle } from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';

interface PlanejamentoItem {
 IdOrdemServicoItem: number;
 IdOrdemServico: number;
 OSDescricao?: string;
 Projeto: string;
 Tag: string;
 CodMatFabricante: string;
 DescResumo: string;
 Setor: string;
 PlanejadoInicio: string;
 PlanejadoFim: string;
 QtdeTotal: number;
 QtdeExecutada: number;
}

export default function PlanejamentoProducao({ fromGlobal, onBack }: { fromGlobal?: boolean, onBack?: () => void }) {
 const { processosVisiveis, maxRegistros } = useAppConfig();
 const today = new Date().toISOString().split('T')[0];
 
 const [planInicioDe, setPlanInicioDe] = useState(today);
 const [planInicioAte, setPlanInicioAte] = useState(today);
 const [planFimDe, setPlanFimDe] = useState('');
 const [planFimAte, setPlanFimAte] = useState('');
 const [setor, setSetor] = useState('todos');
 const [osPesquisa, setOsPesquisa] = useState('');
 
 const [itens, setItens] = useState<PlanejamentoItem[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Efeito para esconder o cabeçalho global quando este componente montar
 useEffect(() => {
 if (!fromGlobal) {
 const title = document.getElementById('main-page-title');
 const subtitle = title?.nextElementSibling;
 if (title) title.style.display = 'none';
 if (subtitle) (subtitle as HTMLElement).style.display = 'none';

 return () => {
 if (title) title.style.display = '';
 if (subtitle) (subtitle as HTMLElement).style.display = '';
 };
 }
 }, [fromGlobal]);

 const formatData = (d: string) => {
 if (!d) return '-';
 if (d.includes('-')) {
 const p = d.split('-');
 return `${p[2]}/${p[1]}/${p[0]}`;
 }
 return d;
 };

 const fetchPlanejamento = async (useFallbackToday = false) => {
 setLoading(true);
 setError(null);
 
 const qPlanIniDe = useFallbackToday ? today : planInicioDe;
 const qPlanIniAte = useFallbackToday ? today : planInicioAte;
 const qPlanFimDe = useFallbackToday ? '' : planFimDe;
 const qPlanFimAte = useFallbackToday ? '' : planFimAte;
 const qSetor = useFallbackToday ? 'todos' : setor;
 const qOs = useFallbackToday ? '' : osPesquisa;

 try {
 const res = await fetch(`/api/apontamento/planejamento/diario?planInicioDe=${qPlanIniDe}&planInicioAte=${qPlanIniAte}&planFimDe=${qPlanFimDe}&planFimAte=${qPlanFimAte}&setor=${qSetor}&os=${encodeURIComponent(qOs)}&limit=${maxRegistros}`);
 const json = await res.json();
 if (json.success) {
 if (json.data.length === 0 && !useFallbackToday && (osPesquisa || planInicioDe !== today || planInicioAte !== today || planFimDe || planFimAte)) {
 // Fallback to today if search yields nothing
 addTemporaryMessage("Nenhum resultado para a pesquisa. Exibindo totais de hoje.");
 fetchPlanejamento(true);
 } else {
 setItens(json.data);
 }
 } else {
 setError(json.message || 'Erro ao carregar dados');
 }
 } catch {
 setError('Erro de conexão com o servidor');
 } finally {
 setLoading(false);
 }
 };

 const [fallbackMsg, setFallbackMsg] = useState('');
 const addTemporaryMessage = (msg: string) => {
 setFallbackMsg(msg);
 setTimeout(() => setFallbackMsg(''), 5000);
 };

 useEffect(() => {
 fetchPlanejamento(true);
 }, []);

 // Calcula os totais do resultado atual
 const { totalExecutar, totalExecutado } = useMemo(() => {
 let executar = 0;
 let executado = 0;
 itens.forEach(item => {
 executar += Number(item.QtdeTotal) || 0;
 executado += Number(item.QtdeExecutada) || 0;
 });
 return { totalExecutar: executar, totalExecutado: executado };
 }, [itens]);

 const percentual = totalExecutar > 0 ? Math.round((totalExecutado / totalExecutar) * 100) : 0;

 // Agrupa por OS
 const groupedByOS = useMemo(() => {
 const groups: Record<number, PlanejamentoItem[]> = {};
 itens.forEach(item => {
 if (!groups[item.IdOrdemServico]) groups[item.IdOrdemServico] = [];
 groups[item.IdOrdemServico].push(item);
 });
 return groups;
 }, [itens]);

 return (
 <div className={`h-full flex flex-col ${fromGlobal ? 'p-2 md:p-3 lg:p-4' : ''}`}>
 {/* Header and Filters (Compact Layout) */}
 <div className="bg-white dark:bg-card border-b border-gray-100 p-2 shadow-sm shrink-0 z-10 flex flex-col gap-2">
 <div className="flex items-center gap-3">
 {!fromGlobal && onBack && (
 <button
 onClick={onBack}
 className="flex items-center justify-center p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#32423D] transition-colors"
 title="Voltar para Mapa"
 >
 <ArrowLeft size={15} />
 </button>
 )}
 <div>
 <h1 className="text-lg font-black text-[#32423D] flex items-center gap-2 m-0 leading-none">
 <Calendar className="w-5 h-5 text-[#E0E800]" />
 Dashboard de Planejamento
 <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-2">Limite: {maxRegistros}</span>
 </h1>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-gray-50/50 p-2 rounded-md border border-gray-100">
 {/* OS ou Descrição */}
 <div className="md:col-span-2">
 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">OS ou Descrição</label>
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input 
 type="text" 
 placeholder="Nº da OS ou Texto"
 value={osPesquisa} 
 onChange={e => setOsPesquisa(e.target.value)} 
 className="w-full pl-9 pr-8 py-2.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E0E800]/50 outline-none transition-all shadow-sm" 
 />
 {osPesquisa && (
 <button onClick={() => setOsPesquisa('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors" title="Limpar">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 {/* PLAN. INÍCIO (DE) — DESTACADO */}
 <div>
 <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <Calendar size={11} className="text-amber-500" />
 Plan. Início (De)
 </label>
 <div className="relative">
 <input
 type="date"
 value={planInicioDe}
 onChange={e => setPlanInicioDe(e.target.value)}
 className="w-full px-2 py-1.5 text-[13px] border-2 border-amber-400 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-400/50 outline-none transition-all bg-amber-50 font-semibold text-amber-800"
 />
 {planInicioDe && (
 <button onClick={() => setPlanInicioDe('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 hover:text-red-500 transition-colors" title="Limpar">
 <X size={13} />
 </button>
 )}
 </div>
 </div>

 {/* PLAN. INÍCIO (ATÉ) — DESTACADO */}
 <div>
 <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <Calendar size={11} className="text-amber-500" />
 Plan. Início (Até)
 </label>
 <div className="relative">
 <input
 type="date"
 value={planInicioAte}
 onChange={e => setPlanInicioAte(e.target.value)}
 className="w-full px-2 py-1.5 text-[13px] border-2 border-amber-400 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-400/50 outline-none transition-all bg-amber-50 font-semibold text-amber-800"
 />
 {planInicioAte && (
 <button onClick={() => setPlanInicioAte('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 hover:text-red-500 transition-colors" title="Limpar">
 <X size={13} />
 </button>
 )}
 </div>
 </div>

 {/* Plan. Fim (De) */}
 <div>
 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan. Fim (De)</label>
 <div className="relative">
 <input
 type="date"
 value={planFimDe}
 onChange={e => setPlanFimDe(e.target.value)}
 className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#E0E800]/50 outline-none transition-all"
 />
 {planFimDe && (
 <button onClick={() => setPlanFimDe('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors" title="Limpar">
 <X size={13} />
 </button>
 )}
 </div>
 </div>

 {/* Plan. Fim (Até) */}
 <div>
 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Plan. Fim (Até)</label>
 <div className="relative">
 <input
 type="date"
 value={planFimAte}
 onChange={e => setPlanFimAte(e.target.value)}
 className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#E0E800]/50 outline-none transition-all"
 />
 {planFimAte && (
 <button onClick={() => setPlanFimAte('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors" title="Limpar">
 <X size={13} />
 </button>
 )}
 </div>
 </div>

 {/* Setor */}
 <div className="md:col-span-3">
 <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Setor</label>
 <select value={setor} onChange={e => setSetor(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-[#E0E800]/50 outline-none transition-all appearance-none bg-white">
 <option value="todos">Todos os Setores</option>
 {processosVisiveis.map(p => (
 <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
 ))}
 </select>
 </div>

 {/* Botões: Limpar Todos + Buscar */}
 <div className="md:col-span-3 flex gap-2">
 {(osPesquisa || planInicioDe || planInicioAte || planFimDe || planFimAte || setor !== 'todos') && (
 <button
 onClick={() => {
 setOsPesquisa('');
 setPlanInicioDe(today);
 setPlanInicioAte(today);
 setPlanFimDe('');
 setPlanFimAte('');
 setSetor('todos');
 }}
 className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium shrink-0"
 title="Limpar todos os filtros"
 >
 <XCircle size={15} /> Limpar
 </button>
 )}
 <button onClick={() => fetchPlanejamento(false)} className="flex-1 bg-[#32423D] text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#1f2926] transition-colors shadow-md font-medium text-xs">
 <Search className="w-4 h-4" /> Buscar Planos
 </button>
 </div>
 </div>

 {fallbackMsg && (
 <div className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-medium animate-in fade-in slide-in-from-top-4 mt-4">
 {fallbackMsg}
 </div>
 )}
 {error && <div className="p-2 bg-red-50 text-red-600 rounded-md text-xs font-medium border border-red-100 mt-2">{error}</div>}

 {/* Totais KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
 <div className="bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2 relative overflow-hidden">
 <div className="w-1 h-full bg-gray-200 absolute left-0 top-0" />
 <div className="p-1.5 bg-gray-50 rounded">
 <Target className="w-4 h-4 text-gray-400" />
 </div>
 <div>
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">A Executar</p>
 <p className="text-lg font-black text-[#32423D] leading-none mt-0.5">{totalExecutar}</p>
 </div>
 </div>
 
 <div className="bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2 relative overflow-hidden">
 <div className="w-1 h-full bg-[#E0E800] absolute left-0 top-0" />
 <div className="p-1.5 bg-[#E0E800]/10 rounded">
 <CheckCircle2 className="w-4 h-4 text-[#8a8f00]" />
 </div>
 <div>
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Executadas</p>
 <p className="text-lg font-black text-[#32423D] leading-none mt-0.5">{totalExecutado}</p>
 </div>
 </div>

 <div className="bg-white rounded-md p-2 shadow-sm border border-gray-100 flex items-center gap-2 relative overflow-hidden">
 <div className="w-1 h-full bg-[#32423D] absolute left-0 top-0" />
 <div className="p-1.5 bg-gray-50 rounded">
 <LayoutGrid className="w-4 h-4 text-[#32423D]" />
 </div>
 <div className="flex-1">
 <div className="flex justify-between items-end mb-1">
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Progresso</p>
 <p className="text-base font-black text-[#32423D]">{percentual}%</p>
 </div>
 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
 <div className="h-full bg-[#E0E800] transition-all duration-1000" style={{ width: `${percentual}%` }} />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Results grouped by OS (Card Grid Layout instead of Table) */}
 <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-gray-50/30">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
 <Loader2 className="w-8 h-8 animate-spin text-[#E0E800] mb-3" />
 <p className="text-xs font-medium">Sincronizando planejamento...</p>
 </div>
 ) : itens.length === 0 ? (
 <div className="text-center py-10 bg-white rounded-md border border-dashed border-gray-200">
 <p className="text-xs text-gray-500 font-medium">Nenhuma ordem de serviço planejada encontrada.</p>
 </div>
 ) : (
 Object.keys(groupedByOS).map((osId) => {
 const items = groupedByOS[Number(osId)];
 const osDesc = items[0]?.OSDescricao || 'Sem Descrição';
 
 // Group items by Item Id (IdOrdemServicoItem) to show sectors horizontally
 const groupedByItem = {};
 items.forEach(it => {
 if (!groupedByItem[it.IdOrdemServicoItem]) {
 groupedByItem[it.IdOrdemServicoItem] = [];
 }
 groupedByItem[it.IdOrdemServicoItem].push(it);
 });
 
 return (
 <div key={osId} className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden mb-4">
 {/* OS Header */}
 <div className="bg-gray-50 px-2 py-0.5 border-b border-gray-200 flex justify-between items-center sticky top-0 z-0">
 <div className="flex items-center gap-3">
 <div className="bg-white shadow-sm border border-gray-200 text-[#32423D] text-xs font-black px-2 py-1 rounded flex items-center gap-1.5">
 <Hash className="w-3.5 h-3.5 text-gray-400" />
 {osId}
 </div>
 <div>
 <h3 className="font-bold text-gray-800 text-xs">{osDesc}</h3>
 <p className="text-[11px] text-gray-500">{Object.keys(groupedByItem).length} itens / {items.length} setores planejados</p>
 </div>
 </div>
 </div>
 
 {/* Items List */}
 <div className="divide-y divide-gray-100">
 {Object.values(groupedByItem).map((sectorsArray, idx) => {
 const firstItem = sectorsArray[0];
 
 return (
 <div key={idx} className="p-3 sm:p-4 hover:bg-gray-50/50 transition-colors flex flex-col lg:flex-row gap-4 lg:items-center">
 
 {/* Left column: Item and Tag */}
 <div className="w-full lg:w-1/3 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
 <div>
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Item / Material</p>
 <p className="font-bold text-gray-800 text-xs truncate" title={firstItem.CodMatFabricante}>{firstItem.CodMatFabricante}</p>
 <p className="text-xs text-gray-500 truncate mt-0.5" title={firstItem.DescResumo}>{firstItem.DescResumo}</p>
 </div>
 <div>
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tag / Projeto</p>
 <div className="flex flex-col gap-1">
 {firstItem.Tag && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 w-fit truncate" title={firstItem.Tag}>{firstItem.Tag}</span>}
 {firstItem.Projeto && <span className="text-xs text-gray-600 truncate">{firstItem.Projeto}</span>}
 </div>
 </div>
 </div>

 {/* Right column: Sectors */}
 <div className="flex-1 flex flex-wrap gap-2 items-center lg:border-l lg:border-gray-200 lg:pl-6 min-w-0">
 {sectorsArray.map(sectorItem => {
 const itemPercent = sectorItem.QtdeTotal > 0 ? Math.round((sectorItem.QtdeExecutada / sectorItem.QtdeTotal) * 100) : 0;
 return (
 <div key={sectorItem.Setor} className="bg-white border border-gray-100 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center gap-3 min-w-[260px] flex-1 shadow-sm">
 <div className="flex-1">
 <div className="flex items-center gap-1.5 mb-1">
 <Circle className="w-2 h-2 fill-[#32423D] text-[#32423D]" />
 <span className="text-[11px] font-bold text-gray-800 uppercase">{sectorItem.Setor}</span>
 </div>
 <div className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
 {formatData(sectorItem.PlanejadoInicio)} 
 <span className="text-gray-300">-</span> 
 {formatData(sectorItem.PlanejadoFim)}
 </div>
 </div>
 
 <div className="flex items-center gap-3 sm:border-l sm:border-gray-100 sm:pl-3">
 <div className="text-center w-8">
 <span className="block text-[8px] font-bold text-gray-400 uppercase">Meta</span>
 <span className="block text-xs font-black text-gray-300 leading-tight">{sectorItem.QtdeTotal}</span>
 </div>
 <div className="w-12 flex flex-col justify-center gap-0.5">
 <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
 <div className={`h-full transition-all ${itemPercent >= 100 ? 'bg-[#E0E800]' : 'bg-[#32423D]'}`} style={{ width: `${Math.min(itemPercent, 100)}%` }} />
 </div>
 <span className="text-[8px] font-bold text-center text-gray-400">{itemPercent}%</span>
 </div>
 <div className="text-center w-8">
 <span className="block text-[8px] font-bold text-gray-400 uppercase">Feito</span>
 <span className={`block text-xs font-black leading-tight ${sectorItem.QtdeExecutada >= sectorItem.QtdeTotal ? 'text-[#8a8f00]' : 'text-[#32423D]'}`}>{sectorItem.QtdeExecutada}</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 );
}
