import React, { useEffect, useState } from 'react';
import { 
 FileSpreadsheet, Search, Filter, Calendar, 
 ChevronRight, ArrowRight, RefreshCw, Loader2,
 Database, Tag as TagIcon, LayoutGrid, CheckSquare, 
 Square, Trash2, Save, AlertCircle, FileText, Info, XCircle, CheckCircle,
 BookOpen, ChevronDown, ChevronUp, FolderOpen, Hash
} from 'lucide-react';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

interface Projeto {
 IdProjeto: number;
 Projeto: string;
}

interface Tag {
 IdTag: number;
 NomeTag: string;
}

interface ProcessableItem {
 IdDado: number;
 TabelaOrigem: string;
 PD_qty: number;
 Part_Reference: string;
 Part_total_qty: number;
 Revisao: number;
 IdProjeto: number;
 IdTag: number;
 NomeProjeto: string;
 NomeTag: string;
 NomePlanilha: string;
 IdOrdemServico: number;
 DescricaoOS: string;
 selected?: boolean;
}

interface OSDestino {
 IdOrdemServico: number;
 DescricaoOS: string;
}

interface PowerBuildListProps {
 onNavigate: (pageId: string) => void;
}

const PowerBuildList: React.FC<PowerBuildListProps> = ({ onNavigate }) => {
 const { showAlert } = useAlert();
 const { user } = useAuth();
 
 // Filter states
 const [projetos, setProjetos] = useState<Projeto[]>([]);
 const [tags, setTags] = useState<Tag[]>([]);
 const [planilhas, setPlanilhas] = useState<string[]>([]);
 const [revisoes, setRevisoes] = useState<number[]>([]);
 const [osDestinoList, setOsDestinoList] = useState<OSDestino[]>([]);

 const [selectedProjeto, setSelectedProjeto] = useState('');
 const [selectedTag, setSelectedTag] = useState('');
 const [selectedPlanilha, setSelectedPlanilha] = useState('');
 const [selectedRevisao, setSelectedRevisao] = useState<number | string>(-1);
 const [selectedOS, setSelectedOS] = useState('');
 const [codMatFilter, setCodMatFilter] = useState('');

 // Data states
 const [items, setItems] = useState<ProcessableItem[]>([]);
 const [loading, setLoading] = useState(false);
 const [processing, setProcessing] = useState(false);

 // Initial Load: Projects
 useEffect(() => {
 const fetchProjetos = async () => {
 try {
 const res = await fetch('/api/blockset/projetos');
 const data = await res.json();
 if (data.success) setProjetos(data.data);
 } catch (error) {
 console.error('Erro ao buscar projetos:', error);
 }
 };
 fetchProjetos();
 }, []);

 // Persist selected Projeto+Tag to localStorage so other pages (e.g. Clonar OS) can read it
 useEffect(() => {
 if (selectedProjeto) {
 const nome = projetos.find(p => p.IdProjeto.toString() === selectedProjeto)?.Projeto || '';
 localStorage.setItem('powerbuild_selected_idprojeto', selectedProjeto);
 localStorage.setItem('powerbuild_selected_nomprojeto', nome);
 } else {
 localStorage.removeItem('powerbuild_selected_idprojeto');
 localStorage.removeItem('powerbuild_selected_nomprojeto');
 }
 }, [selectedProjeto, projetos]);

 useEffect(() => {
 if (selectedTag) {
 const nome = tags.find(t => t.IdTag.toString() === selectedTag)?.NomeTag || '';
 localStorage.setItem('powerbuild_selected_idtag', selectedTag);
 localStorage.setItem('powerbuild_selected_nomtag', nome);
 } else {
 localStorage.removeItem('powerbuild_selected_idtag');
 localStorage.removeItem('powerbuild_selected_nomtag');
 }
 }, [selectedTag, tags]);

 // Load Tags when Project changes
 useEffect(() => {
 if (!selectedProjeto) {
 setTags([]);
 return;
 }
 const fetchTags = async () => {
 try {
 const res = await fetch(`/api/blockset/tags/${selectedProjeto}`);
 const data = await res.json();
 if (data.success) setTags(data.data);
 } catch (error) {
 console.error('Erro ao buscar tags:', error);
 }
 };
 fetchTags();
 }, [selectedProjeto]);

 // Load Planilhas when Tag changes
 useEffect(() => {
 if (!selectedProjeto || !selectedTag) {
 setPlanilhas([]);
 return;
 }
 const fetchPlanilhas = async () => {
 try {
 const res = await fetch(`/api/blockset/planilhas/${selectedProjeto}/${selectedTag}`);
 const data = await res.json();
 if (data.success) setPlanilhas(data.data.map((p: any) => p.NomePlanilha));
 } catch (error) {
 console.error('Erro ao buscar planilhas:', error);
 }
 };
 const fetchOS = async () => {
 try {
 // OS not liberated, not finished, for the selected tag
 const res = await fetch(`/api/blockset/ordens-servico/tag/${selectedTag}`);
 const data = await res.json();
 // Filter further if needed (backend might already do it)
 if (data.success) {
 setOsDestinoList(data.data.map((os: any) => ({
 IdOrdemServico: os.IdOrdemServico,
 DescricaoOS: `${os.IdOrdemServico} - ${os.Descricao || ''}`
 })));
 }
 } catch (error) {
 console.error('Erro ao buscar OS:', error);
 }
 };
 fetchPlanilhas();
 fetchOS();
 }, [selectedProjeto, selectedTag]);

 // Load Revisions when Planilha changes
 useEffect(() => {
 if (!selectedProjeto || !selectedTag || !selectedPlanilha) {
 setRevisoes([]);
 return;
 }
 const fetchRevisions = async () => {
 try {
 const res = await fetch('/api/blockset/revisions', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ idProjeto: selectedProjeto, idTag: selectedTag, nomePlanilha: selectedPlanilha })
 });
 const data = await res.json();
 if (data.success) setRevisoes(data.data.map((r: any) => r.Revisao));
 } catch (error) {
 console.error('Erro ao buscar revisões:', error);
 }
 };
 fetchRevisions();
 }, [selectedProjeto, selectedTag, selectedPlanilha]);

 const handleSearch = async () => {
 if (!selectedProjeto || !selectedTag || !selectedPlanilha) {
 showAlert('Selecione Projeto, Tag e Planilha.', 'warning');
 return;
 }
 if (!selectedOS) {
 showAlert('Selecione a Ordem de Serviço de destino antes de pesquisar os itens.', 'warning');
 return;
 }

 setLoading(true);
 try {
 const res = await fetch('/api/blockset/processable-items', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 idProjeto: selectedProjeto,
 idTag: selectedTag,
 nomePlanilha: selectedPlanilha,
 revisao: selectedRevisao === 'Todas' ? -1 : selectedRevisao,
 codMatFilter: codMatFilter
 })
 });
 const data = await res.json();
 if (data.success) {
 setItems(data.data.map((item: any) => ({ ...item, selected: false })));
 if (data.data.length === 0) {
 showAlert('Nenhum item encontrado para os filtros selecionados.', 'info');
 }
 } else {
 showAlert(data.message, 'error');
 }
 } catch (error) {
 showAlert('Erro ao buscar itens.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleToggleSelectAll = (select: boolean) => {
 setItems(prev => prev.map(item => ({ ...item, selected: select })));
 };

 const handleToggleItem = (id: number) => {
 setItems(prev => prev.map(item => item.IdDado === id ? { ...item, selected: !item.selected } : item));
 };

 const handleSave = async () => {
 const selectedItems = items.filter(i => i.selected);
 if (selectedItems.length === 0) {
 showAlert('Nenhum item selecionado.', 'warning');
 return;
 }
 if (!selectedOS) {
 showAlert('Selecione uma Ordem de Serviço de destino.', 'warning');
 return;
 }

 // Confirmation (Aglutinado Mode)
 const confirmMsg = "Atenção: Todos os itens existentes nesta OS serão EXCLUÍDOS e substituídos pelos itens selecionados. Deseja continuar?";
 if (!window.confirm(confirmMsg)) return;

 setProcessing(true);
 try {
 const res = await fetch('/api/blockset/process-items', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 idOSDestino: selectedOS,
 items: selectedItems,
 usuario: user?.nome || 'Sistema'
 })
 });
 const data = await res.json();
 if (data.success) {
 showAlert(data.message, 'success');
 if (data.missingMaterials?.length > 0) {
 showAlert(`${data.missingMaterials.length} materiais não cadastrados foram enviados para a lista de pendentes.`, 'warning');
 }
 // Refresh list
 handleSearch();
 } else {
 showAlert(data.message, 'error');
 }
 } catch (error) {
 showAlert('Erro no processamento.', 'error');
 } finally {
 setProcessing(false);
 }
 };

 const handleClear = () => {
 setSelectedProjeto('');
 setSelectedTag('');
 setSelectedPlanilha('');
 setSelectedRevisao(-1);
 setSelectedOS('');
 setCodMatFilter('');
 setOsDestinoList([]);
 setItems([]);
 };

 return (
 <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6 font-sans">
 
 {/* Header */}
 <div className="flex flex-wrap items-center justify-between gap-6 mb-6 shrink-0 bg-white p-4 rounded-md shadow-sm border border-gray-200">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-[#32423D]">
 <FileSpreadsheet size={24} />
 </div>
 <div>
 <h1 className="text-2xl font-black text-[#567469] tracking-tight">Lista Itens da Planilha</h1>
 <p className="text-sm text-gray-500 font-medium">Visualize, aglutine e inclua itens importados em Ordens de Serviço.</p>
 </div>
 </div>
 <div className="flex gap-3">
 <button 
 onClick={() => onNavigate('powerbuild-import')}
 className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold border border-gray-300 transition-all flex items-center gap-2 shadow-sm"
 >
 <RefreshCw className="w-4 h-4" />
 Nova Importação
 </button>
 </div>
 </div>

 <div className="flex-1 overflow-auto custom-scrollbar">
 <div className="max-w-7xl mx-auto space-y-6 pb-8">

 {/* ── Painel de Critérios de Exibição ─────────────────────────── */}
 <div className="bg-white rounded-md border border-indigo-200 shadow-sm overflow-hidden">
 <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border-b border-indigo-200">
 <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
 <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
 Lembrete — Critérios para exibição de Projeto, Tag e OS de Destino
 </span>
 <span className="ml-auto text-[10px] text-indigo-500 italic">Todos os critérios devem ser atendidos</span>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
 {/* Critério: Projeto */}
 <div className="p-4 space-y-2">
 <div className="flex items-center gap-2 mb-1">
 <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
 <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
 </div>
 <span className="text-xs font-black text-gray-800 uppercase tracking-wide">Projeto</span>
 </div>
 <ul className="space-y-1.5">
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não excluído <span className="font-mono bg-gray-100 px-1 rounded">D_E_L_E_T_E = null</span></span>
 </li>
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não liberado <span className="font-mono bg-gray-100 px-1 rounded">LIBERADO ≠ 'S'</span></span>
 </li>
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não finalizado <span className="font-mono bg-gray-100 px-1 rounded">Finalizado = null</span></span>
 </li>
 </ul>
 </div>
 {/* Critério: Tag */}
 <div className="p-4 space-y-2">
 <div className="flex items-center gap-2 mb-1">
 <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
 <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
 </div>
 <span className="text-xs font-black text-gray-800 uppercase tracking-wide">Tag</span>
 </div>
 <ul className="space-y-1.5">
 <li className="flex items-start gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Vinculada ao projeto selecionado <span className="font-mono bg-gray-100 px-1 rounded">IdProjeto</span></span>
 </li>
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não excluída <span className="font-mono bg-gray-100 px-1 rounded">D_E_L_E_T_E = null</span></span>
 </li>
 <li className="flex items-start gap-2">
 <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Buscada na tabela <span className="font-mono bg-gray-100 px-1 rounded">tags</span> + planilhas importadas</span>
 </li>
 </ul>
 </div>
 {/* Critério: OS */}
 <div className="p-4 space-y-2">
 <div className="flex items-center gap-2 mb-1">
 <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
 <Hash className="w-3.5 h-3.5 text-orange-600" />
 </div>
 <span className="text-xs font-black text-gray-800 uppercase tracking-wide">OS de Destino</span>
 </div>
 <ul className="space-y-1.5">
 <li className="flex items-start gap-2">
 <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Vinculada à Tag selecionada <span className="font-mono bg-gray-100 px-1 rounded">IdTag</span></span>
 </li>
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não liberada à engenharia <span className="font-mono bg-gray-100 px-1 rounded">Liberado_Engenharia ≠ 'S'</span></span>
 </li>
 <li className="flex items-start gap-2">
 <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
 <span className="text-[11px] text-gray-600">Não finalizada e não excluída <span className="font-mono bg-gray-100 px-1 rounded">D_E_L_E_T_E ≠ '*'</span></span>
 </li>
 </ul>
 </div>
 </div>
 </div>

 {/* Filters Section */}
 <div className="bg-white rounded-md border border-gray-200 p-6 shadow-sm space-y-6">

 {/* Row 1: Projeto, Tag, Planilha, Revisão */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Projeto</label>
 <select 
 value={selectedProjeto}
 onChange={e => { setSelectedProjeto(e.target.value); setSelectedTag(''); setSelectedOS(''); setOsDestinoList([]); }}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800"
 >
 <option value="">Selecione o Projeto</option>
 {projetos.map(p => <option key={p.IdProjeto} value={p.IdProjeto}>{p.Projeto}</option>)}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tag</label>
 <select 
 value={selectedTag}
 onChange={e => { setSelectedTag(e.target.value); setSelectedOS(''); }}
 disabled={!selectedProjeto}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800 disabled:opacity-50"
 >
 <option value="">Selecione a Tag</option>
 {tags.map(t => <option key={t.IdTag} value={t.IdTag}>{t.NomeTag}</option>)}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Planilha</label>
 <select 
 value={selectedPlanilha}
 onChange={e => setSelectedPlanilha(e.target.value)}
 disabled={!selectedTag}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800 disabled:opacity-50"
 >
 <option value="">Selecione a Planilha</option>
 {planilhas.map(p => <option key={p} value={p}>{p}</option>)}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Revisão</label>
 <select 
 value={selectedRevisao}
 onChange={e => setSelectedRevisao(e.target.value)}
 disabled={!selectedPlanilha}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800 disabled:opacity-50"
 >
 <option value="-1">Todas</option>
 {revisoes.map(r => <option key={r} value={r}>Revisão {r}</option>)}
 </select>
 </div>
 </div>

 {/* Row 2: OS Destino (required) + Código filter + Buttons */}
 <div className="flex flex-col md:flex-row gap-4 items-end">

 {/* OS de Destino — OBRIGATÓRIO */}
 <div className="w-full md:w-auto md:min-w-[360px] space-y-1">
 <div className="flex items-center gap-2">
 <label className={`text-[10px] font-bold uppercase tracking-wider ${
 !selectedOS && selectedTag ? 'text-red-600' : 'text-gray-500'
 }`}>
 OS de Destino
 </label>
 {!selectedOS && selectedTag && (
 <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
 ⚠ Obrigatório antes de pesquisar
 </span>
 )}
 </div>
 <select 
 value={selectedOS}
 onChange={e => setSelectedOS(e.target.value)}
 disabled={!selectedTag}
 title="Exibe apenas OS não liberadas e não finalizadas da tag selecionada"
 className={`w-full border rounded-md px-4 py-2.5 outline-none transition-all text-sm shadow-sm disabled:opacity-50 ${
 !selectedOS && selectedTag
 ? 'bg-red-50 border-red-300 text-red-800 focus:border-red-500'
 : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-[#32423D]'
 }`}
 >
 <option value="">— Selecione a OS de Destino —</option>
 {osDestinoList.length === 0 && selectedTag && (
 <option disabled>Nenhuma OS disponível para esta Tag</option>
 )}
 {osDestinoList.map(os => (
 <option
 key={os.IdOrdemServico}
 value={os.IdOrdemServico}
 title={os.DescricaoOS}
 >
 {os.DescricaoOS}
 </option>
 ))}
 </select>
 {/* Painel de critérios de seleção da OS */}
 {selectedTag && (
 <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3">
 <div className="flex items-center gap-1.5 mb-2">
 <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
 <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
 Critérios de exibição das OS disponíveis
 </span>
 </div>
 <div className="flex flex-wrap gap-2">
 <span className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 text-[10px] font-semibold px-2 py-1 rounded-lg">
 <TagIcon className="w-3 h-3 text-blue-500" />
 Vinculada à Tag selecionada
 </span>
 <span className="inline-flex items-center gap-1 bg-white border border-orange-200 text-orange-700 text-[10px] font-semibold px-2 py-1 rounded-lg">
 <XCircle className="w-3 h-3 text-orange-500" />
 Não liberada à Engenharia
 </span>
 <span className="inline-flex items-center gap-1 bg-white border border-green-200 text-green-700 text-[10px] font-semibold px-2 py-1 rounded-lg">
 <CheckCircle className="w-3 h-3 text-green-500" />
 Não finalizada
 </span>
 </div>
 {osDestinoList.length === 0 && (
 <p className="mt-2 text-[10px] text-red-500 font-medium flex items-center gap-1">
 <AlertCircle className="w-3 h-3" />
 Nenhuma OS encontrada para esta Tag com estes critérios.
 </p>
 )}
 {osDestinoList.length > 0 && (
 <p className="mt-2 text-[10px] text-green-600 font-medium flex items-center gap-1">
 <CheckCircle className="w-3 h-3" />
 {osDestinoList.length} OS disponível(is) para esta Tag.
 </p>
 )}
 </div>
 )}
 </div>

 {/* Filtrar por Código */}
 <div className="flex-1 space-y-2 w-full">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Filtrar por Código</label>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
 <input 
 type="text"
 placeholder="Ex: 1SVR405622R0000"
 value={codMatFilter}
 onChange={e => setCodMatFilter(e.target.value)}
 className="w-full bg-gray-50 border border-gray-300 rounded-md py-2.5 pl-10 pr-4 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800"
 />
 </div>
 </div>

 {/* Action buttons */}
 <div className="flex gap-2 w-full md:w-auto">
 <button 
 onClick={handleSearch}
 disabled={loading || !selectedPlanilha || !selectedOS}
 className="flex-1 md:flex-none bg-emerald-100 border border-emerald-200 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 px-6 py-2.5 rounded-md font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
 title={!selectedOS ? 'Selecione a OS de destino antes de pesquisar' : ''}
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
 Pesquisar
 </button>
 <button 
 onClick={handleClear}
 className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-md font-medium border border-gray-300 transition-all flex items-center justify-center gap-2 shadow-sm"
 >
 <Trash2 className="w-4 h-4" />
 Limpar
 </button>
 </div>
 </div>
 </div>

 {/* Processing Controls (Visible after search) */}
 {items.length > 0 && (
 <div className="bg-[#E0E800]/20 border border-yellow-300 rounded-md p-4 flex flex-col md:flex-row items-center justify-between gap-4">
 {/* OS selecionada — somente leitura como confirmação */}
 <div className="flex items-center gap-3 flex-1">
 <div className="flex items-center gap-2 bg-white border border-green-300 rounded-md px-4 py-2.5 shadow-sm">
 <CheckSquare className="w-4 h-4 text-green-600 shrink-0" />
 <span className="text-xs font-bold text-gray-500 uppercase mr-1">OS:</span>
 <span className="text-sm font-bold text-green-700">
 {osDestinoList.find(o => o.IdOrdemServico.toString() === selectedOS.toString())?.DescricaoOS || `OS #${selectedOS}`}
 </span>
 </div>
 <div className="flex flex-wrap gap-3">
 <button 
 onClick={() => handleToggleSelectAll(true)}
 className="text-xs font-bold text-gray-600 hover:text-[#32423D] transition-colors flex items-center gap-1"
 >
 <CheckSquare className="w-4 h-4" /> Marcar Todos
 </button>
 <button 
 onClick={() => handleToggleSelectAll(false)}
 className="text-xs font-bold text-gray-600 hover:text-[#32423D] transition-colors flex items-center gap-1"
 >
 <Square className="w-4 h-4" /> Desmarcar Todos
 </button>
 <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
 <button
 onClick={() => {
 localStorage.setItem('agglutination_filter_projeto', selectedProjeto);
 localStorage.setItem('agglutination_filter_tag', selectedTag);
 localStorage.setItem('agglutination_filter_planilha', selectedPlanilha);
 onNavigate('powerbuild-agglutination');
 }}
 className="text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
 >
 <FileText className="w-3.5 h-3.5 text-gray-500" />
 Resumo Fabricação
 </button>
 </div>
 </div>
 <button 
 onClick={handleSave}
 disabled={processing}
 className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-md font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
 >
 {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
 Processar e Salvar na OS
 </button>
 </div>
 )}

 {/* Grid */}
 <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
 <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
 <table className="w-full text-left border-collapse">
 <thead className="sticky top-0 z-10">
 <tr className="bg-gray-100 border-b border-gray-300">
 <th className="py-4 px-6 w-12">
 <div className="flex items-center justify-center">
 <Filter className="w-4 h-4 text-gray-500" />
 </div>
 </th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700">Cod. Mat. Fabricante</th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700 text-center">Única</th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700 text-center">Total</th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700 text-center">Rev</th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700">OS Associada</th>
 <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-700">Descrição OS</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {items.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-20 text-center bg-gray-50">
 <div className="flex flex-col items-center gap-4 text-gray-400">
 <LayoutGrid className="w-12 h-12 opacity-20" />
 <p className="font-medium text-gray-500">Realize uma busca para visualizar os itens.</p>
 </div>
 </td>
 </tr>
 ) : (
 items.map((item) => (
 <tr 
 key={item.IdDado} 
 className={`group transition-colors ${item.selected ? 'bg-[#E0E800]/10' : 'hover:bg-gray-50'}`}
 onClick={() => handleToggleItem(item.IdDado)}
 >
 <td className="py-3 px-6 text-center cursor-pointer">
 <div className="flex items-center justify-center">
 {item.selected ? (
 <CheckSquare className="w-5 h-5 text-[#32423D]" />
 ) : (
 <Square className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
 )}
 </div>
 </td>
 <td className="py-3 px-6">
 <div className="flex flex-col">
 <span className="text-sm font-mono font-bold text-gray-800 tracking-wider">{item.Part_Reference}</span>
 <span className="text-[10px] text-gray-500 font-medium">{item.TabelaOrigem}</span>
 </div>
 </td>
 <td className="py-3 px-6 text-center font-medium text-sm text-gray-700">{item.PD_qty}</td>
 <td className="py-3 px-6 text-center font-bold text-sm text-[#32423D]">{item.Part_total_qty}</td>
 <td className="py-3 px-6 text-center">
 <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-300">
 R{item.Revisao}
 </span>
 </td>
 <td className="py-3 px-6">
 {item.IdOrdemServico > 0 ? (
 <span className="text-sm font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded">
 {item.IdOrdemServico}
 </span>
 ) : (
 <span className="text-xs text-gray-400 italic">Nenhuma</span>
 )}
 </td>
 <td className="py-3 px-6">
 <span className="text-xs text-gray-600 truncate max-w-[200px] inline-block" title={item.DescricaoOS}>
 {item.DescricaoOS || '-'}
 </span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Footer Info */}
 {items.length > 0 && (
 <div className="flex items-center justify-between text-sm text-gray-500 px-2">
 <div className="flex gap-4">
 <span>Total de Itens: <strong className="text-gray-800">{items.length}</strong></span>
 <span>Selecionados: <strong className="text-[#32423D]">{items.filter(i => i.selected).length}</strong></span>
 </div>
 <div className="flex items-center gap-2 italic">
 <AlertCircle className="w-4 h-4 text-[#32423D]" />
 <span>Itens rosa indicam material não cadastrado no sistema.</span>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default PowerBuildList;
