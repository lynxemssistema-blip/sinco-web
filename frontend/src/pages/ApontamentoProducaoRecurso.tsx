import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search, RefreshCw, Loader2, FileText, CheckCircle, Clock, X, ArrowLeft,
 Scissors, Wrench, Flame, Paintbrush, Settings2, Plus, History, AlertCircle, Filter, XCircle, Map,
 PenTool, Box, AlertTriangle, Calendar, Maximize2, Minimize2, Zap
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';
import PlanejamentoProducaoPage from './PlanejamentoProducao';

const API_BASE = '/api';

interface ApontamentoItem {
 IdOrdemServicoItem: number;
 IdOrdemServico: number;
 CodMatFabricante: string;
 DescResumo: string;
 DescDetal?: string;
 QtdeTotal: number;
 Peso?: number;
 EnderecoArquivo?: string;
 EnderecoArquivoItemOrdemServico?: string;
 PlanoCorte?: string;
 Espessura?: string;
 PercentualSetor: number;
 QtdeProduzidaSetor: number;
 Projeto: string;
 IdProjeto?: string;
 DescProjeto?: string;
 MaterialSW?: string;
 Tag: string;
 IdTag?: string;
 DescTag?: string;
 Cliente?: string;
 IsProdutoPrincipal?: string; // 'sim' or null/other
 NomeProdutoPrincipal?: string;
 // Mapa fields
 txtCorte?: string;
 txtDobra?: string;
 txtSolda?: string;
 txtPintura?: string;
 TxtMontagem?: string;
 MontagemPercentual?: number;
 CorteTotalExecutado?: number;
 DobraTotalExecutado?: number;
 SoldaTotalExecutado?: number;
 PinturaTotalExecutado?: number;
 MontagemTotalExecutado?: number;
 TotalExecutar?: number;
}

interface HistoricoItem {
 IdOrdemServicoItemControle: number;
 QtdeProduzida: string;
 CriadoPor: string;
 DataCriacao: string;
 Processo?: string;
 Situacao: string;
}

interface ItemDetails {
 item: ApontamentoItem;
 historico: HistoricoItem[];
 totalProduzido: number;
 qtdeFaltante: number;
}

interface PendenciaItem {
 IDRNC: number;
 ST: string;
 CodMatFabricante: string;
 IdOrdemServico: number;
 IdOrdemServicoItem: number;
 Projeto: string;
 Tag: string;
 DescResumo: string;
 DescDetal: string;
 Espessura: string;
 MaterialSW: string;
 DescricaoPendencia: string;
 Colaborador: string;
 SetorResponsavel?: string;
 DataCriacao: string;
 DataExecucao: string;
 SetorResponsavelFinalizacao?: string;
 FinalizadoPorUsuarioSetor?: string;
 DataFinalizacao?: string;
 DescricaoFinalizacao?: string;
}

/* interface SelectOption { value: string; label: string; } */

type Setor = 'mapa' | 'corte' | 'dobra' | 'solda' | 'pintura' | 'montagem' | 'mapaproducao' | 'planejamento';

const setores: { id: Setor; label: string; icon: typeof Scissors; color: string }[] = [
 { id: 'mapa', label: 'Mapa', icon: Settings2, color: 'bg-gray-700' },

 { id: 'corte', label: 'Corte', icon: Scissors, color: 'bg-yellow-500' },
 { id: 'dobra', label: 'Dobra', icon: Wrench, color: 'bg-purple-500' },
 { id: 'solda', label: 'Solda', icon: Flame, color: 'bg-orange-500' },
 { id: 'pintura', label: 'Pintura', icon: Paintbrush, color: 'bg-green-500' },
 { id: 'montagem', label: 'Montagem', icon: Settings2, color: 'bg-red-500' },
 { id: 'mapaproducao', label: 'Mapa Produção', icon: Map, color: 'bg-indigo-600' },
];

export default function ApontamentoProducaoRecursoPage() {
 const { addToast } = useToast();
 const { user } = useAuth();


 const { processosVisiveis } = useAppConfig();
 // visibleSetores is derived from the global config (replaces per-component state)
 const visibleSetores: string[] = processosVisiveis;
 // filteredSetores: the tabs to show (always include 'mapa' + 'mapaproducao', filter sectors by config)
 const filteredSetores = setores.filter(s => s.id === 'mapa' || s.id === 'mapaproducao' || s.id === 'planejamento' || processosVisiveis.includes(s.id));
 const [recursosList, setRecursosList] = useState<any[]>([]);
const [setorAtivo, setSetorAtivo] = useState<any>('usinagem');

useEffect(() => {
    fetch('/api/recursos')
      .then(res => res.json())
      .then(data => {
         if(data.success) {
            const list = data.data.filter((r: any) => r.Fabrica === 'SIM' || r.Fabrica === '1');
            setRecursosList(list);
            if(list.length > 0) setSetorAtivo(list[0].processofabricacao.toLowerCase().replace(/\s+/g, ''));
         }
      })
      .catch(console.error);
}, []);
 const [itens, setItens] = useState<ApontamentoItem[]>([]);
 const abortControllerRef = useRef<AbortController | null>(null);
 const [loading, setLoading] = useState(false);
 const [hasSearched, setHasSearched] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [fromGlobal, setFromGlobal] = useState(false);
 const [showTabs, setShowTabs] = useState(true);

 // Paginação
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);
 const limit = 50; // Itens por página

 // Expandir Tela (Fullscreen/Maximizado)
 const [isExpanded, setIsExpanded] = useState(false);

 // Filters
 const [planoCorteFilter, setPlanoCorteFilter] = useState('');
 const [projetoFilter, setProjetoFilter] = useState('');
 const [tagFilter, setTagFilter] = useState('');
 const [osFilter, setOsFilter] = useState('');
 const [clienteFilter, setClienteFilter] = useState('');
 const [itemFilter, setItemFilter] = useState('');
 const [codMatFabricanteFilter, setCodMatFabricanteFilter] = useState('');
 const [dataPlanejamentoFilter, setDataPlanejamentoFilter] = useState('');
 const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'concluido'>('pendente');
 const [groupBy, setGroupBy] = useState<'os' | 'projeto' | 'tag' | 'cliente' | 'produto_principal'>('os');
   const checkPredecessorStatus = (item: any, currentSetor: any) => {
    if (currentSetor === 'mapa' || currentSetor === 'mapaproducao') return { allowed: true };
    
    const sequence = ['engenharia', 'isometrico', 'medicao', 'corte', 'cortealaser', 'pulsionadeira', 'puncionadeira', 'usinagem', 'dobra', 'caldeiraria', 'serralheria', 'solda', 'galvanizar', 'pintura', 'acabamento', 'montagem', 'aprovacao'];
    const currentIndex = sequence.indexOf(String(currentSetor).toLowerCase());
    
    if (currentIndex <= 0) return { allowed: true };

    const itemAny = item as any;

    for (let i = currentIndex - 1; i >= 0; i--) {
      const pred = sequence[i];
      let base = pred.toUpperCase();
      if (pred === 'cortealaser') base = 'CorteaLaser';
      else if (pred === 'corte') base = 'Corte';
      else if (pred === 'dobra') base = 'Dobra';
      else if (pred === 'solda') base = 'Solda';
      else if (pred === 'pintura') base = 'Pintura';
      else if (pred === 'montagem') base = 'Montagem';
      else if (pred === 'acabamento') base = 'ACABAMENTO';
      else if (pred === 'usinagem') base = 'Usinagem';
      else if (pred === 'caldeiraria') base = 'CALDEIRARIA';
      else if (pred === 'serralheria') base = 'SERRALHERIA';

      const txtField = `txt${base}`;
      const txtFieldLower = `txt${pred.toLowerCase()}`;
      const txtFieldAlt = pred === 'montagem' ? 'TxtMontagem' : txtField;

      const val1 = String(itemAny[txtField] || '').trim();
      const val2 = String(itemAny[txtFieldLower] || '').trim();
      const val3 = String(itemAny[txtFieldAlt] || '').trim();
      
      const isActive = val1 === '1' || val2 === '1' || val3 === '1' || val1.toUpperCase() === 'S' || val2.toUpperCase() === 'S';

      if (isActive) {
        const totalField = `${base}TotalExecutado`;
        const totalFieldLower = `${pred}totalexecutado`;
        const totalExec = Number(itemAny[totalField] || itemAny[totalFieldLower] || 0);

        return { 
          allowed: totalExec >= Number(itemAny.QtdeTotal || itemAny.qtdetotal || 0), 
          predecessor: pred.charAt(0).toUpperCase() + pred.slice(1) 
        };
      }
    }

    return { allowed: true };
  };

  // Retorna o primeiro setor ativo na cascata de produção do item
  const getFirstRecurso = (item: any): string => {
    const cascade = ['corte', 'cortealaser', 'pulsionadeira', 'puncionadeira', 'usinagem', 'dobra', 'caldeiraria', 'serralheria', 'solda', 'galvanizar', 'pintura', 'acabamento', 'montagem'];
    for (const s of cascade) {
      let base = s;
      if (s === 'cortealaser') base = 'CorteaLaser';
      else if (s === 'corte') base = 'Corte';
      else if (s === 'dobra') base = 'Dobra';
      else if (s === 'solda') base = 'Solda';
      else if (s === 'pintura') base = 'Pintura';
      else if (s === 'montagem') base = 'Montagem';
      const txtField = s === 'montagem' ? 'TxtMontagem' : `txt${base}`;
      const txtFieldAlt = `txt${s.toLowerCase()}`;
      const v1 = String(item[txtField] || '').trim();
      const v2 = String(item[txtFieldAlt] || '').trim();
      if (v1 === '1' || v2 === '1' || v1.toUpperCase() === 'S' || v2.toUpperCase() === 'S') {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }
    }
    return '-';
  };


 const [showFilters, setShowFilters] = useState(true);

 // Modal
 const [modalOpen, setModalOpen] = useState(false);
 const [selectedItem, setSelectedItem] = useState<ApontamentoItem | null>(null);
 const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
 const [loadingDetails, setLoadingDetails] = useState(false);
 const [qtdeApontar, setQtdeApontar] = useState('');
 // const [tipoApontamento, setTipoApontamento] = useState<'Total' | 'Parcial'>('Total');
 const [submitting, setSubmitting] = useState(false);
 const [confirmingMapa, setConfirmingMapa] = useState(false);
 const [modalSetor, setModalSetor] = useState<any>('mapa');
 const [historyModalOpen, setHistoryModalOpen] = useState(false);

 // Reposicao Modal
 const [reposicaoModalOpen, setReposicaoModalOpen] = useState(false);
 const [qtdeReposicao, setQtdeReposicao] = useState('');
 const [motivoReposicao, setMotivoReposicao] = useState('');
 const [submittingReposicao, setSubmittingReposicao] = useState(false);
 const [parcialModalOpen, setParcialModalOpen] = useState(false);
 const [parcialItem, setParcialItem] = useState<any>(null);
 const [qtdeParcial, setQtdeParcial] = useState('');
 const [submittingParcial, setSubmittingParcial] = useState(false);
 const [parcialRecurso, setParcialRecurso] = useState('');

 // Pendencia Modal (Novo modelo RNC completo)
 const [pendenciaModalOpen, setPendenciaModalOpen] = useState(false);
 const [idRncEdicao, setIdRncEdicao] = useState<number | null>(null);
 const [descricaoPendencia, setDescricaoPendencia] = useState('');
 const [setorResponsavel, setSetorResponsavel] = useState('');
 const [usuarioResponsavel, setUsuarioResponsavel] = useState('');
 const [tituloRnc, setTituloRnc] = useState('');
 const [subTituloRnc, setSubTituloRnc] = useState('');
 const [dataExecucaoRnc, setDataExecucaoRnc] = useState('');
 const [finalizandoRnc, setFinalizandoRnc] = useState(false);
 const [setorFinalizacao, setSetorFinalizacao] = useState('');
 const [colaboradorFinalizacao, setColaboradorFinalizacao] = useState('');
 const [dataFinalizacao, setDataFinalizacao] = useState('');
 const [descricaoFinalizacao, setDescricaoFinalizacao] = useState('');
 const [tipoRnc, setTipoRnc] = useState('');
 const [espessuraRnc, setEspessuraRnc] = useState('');
 const [materialSWRnc, setMaterialSWRnc] = useState('');
 const [chkCorteRnc, setChkCorteRnc] = useState(false);
 const [chkDobraRnc, setChkDobraRnc] = useState(false);
 const [chkSoldaRnc, setChkSoldaRnc] = useState(false);
 const [chkPinturaRnc, setChkPinturaRnc] = useState(false);
 const [chkMontagemRnc, setChkMontagemRnc] = useState(false);
 const [submittingPendencia, setSubmittingPendencia] = useState(false);

 // Grid Pendencias History
 const [pendenciasHistorico, setPendenciasHistorico] = useState<PendenciaItem[]>([]);
 const [loadingPendencias, setLoadingPendencias] = useState(false);
 const [exibirFinalizadas, setExibirFinalizadas] = useState(false);
 const [searchQuery1, setSearchQuery1] = useState('');
 const [searchQuery2, setSearchQuery2] = useState('');

 const [openRncId, setOpenRncId] = useState<string | null>(null);
 const [openRncItemOS, setOpenRncItemOS] = useState<string | null>(null);

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 if (params.get('from') === 'visao-geral-pendencias') setFromGlobal(true);
 const rnc = params.get('openRnc');
 const itemOs = params.get('item');
 if (rnc && itemOs) {
 setOpenRncId(rnc);
 setOpenRncItemOS(itemOs);
 }
 }, []);

 // Config options for Pendencia
 const [setoresConfig, setSetoresConfig] = useState<string[]>([]);
 const [usuariosConfig, setUsuariosConfig] = useState<{ IdUsuario: number, NomeCompleto: string }[]>([]);
 const [espessurasConfig, setEspessurasConfig] = useState<{ idEspessura: number, Espessura: string }[]>([]);
 const [materiaisSWConfig, setMateriaisSWConfig] = useState<{ idMaterialSw: number, MaterialSw: string }[]>([]);

 useEffect(() => {
 fetch(`${API_BASE}/config/setores`)
 .then(res => res.json())
 .then(json => { if (json.success) setSetoresConfig(json.setores || json.data); })
 .catch(console.error);

 fetch(`${API_BASE}/config/usuarios`)
 .then(res => res.json())
 .then(json => { if (json.success) setUsuariosConfig(json.usuarios); })
 .catch(console.error);

 fetch(`${API_BASE}/config/espessuras`)
 .then(res => res.json())
 .then(json => { if (json.success) setEspessurasConfig(json.data); })
 .catch(console.error);

 fetch(`${API_BASE}/config/materiais`)
 .then(res => res.json())
 .then(json => { if (json.success) setMateriaisSWConfig(json.data); })
 .catch(console.error);
 }, []);


 // Fetch setores config para pendencias
 useEffect(() => {
 fetch(`${API_BASE}/config/setores`)
 .then(res => res.json())
 .then(json => { if (json.success) setSetoresConfig(json.setores || json.data); })
 .catch(console.error);
 }, []);

 useEffect(() => {
 if (openRncId && openRncItemOS && itens.length > 0 && !pendenciaModalOpen) {
 const item = itens.find(i => i.IdOrdemServicoItem.toString() === openRncItemOS);
 if (item) {
 setSelectedItem(item);
 setLoadingPendencias(true);
 
 fetch(`${API_BASE}/producao/pendencias/historico?codMatFabricante=${encodeURIComponent(item.CodMatFabricante || '')}`)
 .then(res => res.json())
 .then(json => {
 if (json.success) setPendenciasHistorico(json.data);
 setLoadingPendencias(false);
 })
 .catch(() => setLoadingPendencias(false));

 setPendenciaModalOpen(true);
 }
 }
 }, [itens, openRncId, openRncItemOS, pendenciaModalOpen]);

 // Quando o histórico carregar e tivermos um openRncId pendente, carregamos os dados para edição
 useEffect(() => {
 if (openRncId && pendenciasHistorico.length > 0 && pendenciaModalOpen) {
 const p = pendenciasHistorico.find(x => x.IDRNC.toString() === openRncId);
 if (p) {
 setIdRncEdicao(p.IDRNC);
 setTipoRnc('RNC');
 setDescricaoPendencia(p.DescricaoPendencia || '');
 setSetorResponsavel(p.SetorResponsavel || '');
 setUsuarioResponsavel(p.Colaborador || '');
 setTituloRnc(p.DescResumo || '');
 setSubTituloRnc(p.DescDetal || '');
 setDataExecucaoRnc(p.DataExecucao ? p.DataExecucao.split('T')[0] : '');
 setFinalizandoRnc(p.ST === 'FINALIZADO');
 setSetorFinalizacao(p.SetorResponsavelFinalizacao || '');
 setColaboradorFinalizacao(p.FinalizadoPorUsuarioSetor || '');
 setDataFinalizacao(p.DataFinalizacao ? p.DataFinalizacao.split('T')[0] : '');
 setDescricaoFinalizacao(p.DescricaoFinalizacao || '');
 setEspessuraRnc(p.Espessura || '');
 setMaterialSWRnc(p.MaterialSW || '');
 
 // Clear the trigger
 setOpenRncId(null);
 setOpenRncItemOS(null);
 }
 }
 }, [pendenciasHistorico, openRncId, pendenciaModalOpen]);

 // Fetch usuarios config para pendencias
 useEffect(() => {
 fetch(`${API_BASE}/config/usuarios`)
 .then(res => res.json())
 .then(json => { if (json.success) setUsuariosConfig(json.usuarios); })
 .catch(console.error);
 }, []);

 // Config for visible sectors (fetched via context)
 useEffect(() => {
 // Permite setores meta-built-in
 if (['mapa', 'planejamento', 'mapaproducao'].includes(setorAtivo)) return;

 // Verifica se o setorAtivo atual é um recurso válido carregado do banco
 const isDynamicResource = recursosList.some(r => r.processofabricacao.toLowerCase().replace(/\s+/g, '') === setorAtivo);

 // Se não for meta, não for recurso dinâmico, e não estiver nos visíveis (legado), volta pro mapa
 if (visibleSetores.length > 0 && !visibleSetores.includes(setorAtivo as string) && !isDynamicResource && recursosList.length > 0) {
 setSetorAtivo('mapa');
 }
 }, [visibleSetores, setorAtivo, recursosList]);

 // Ler Query Params caso venha de links globais
 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const openOs = params.get('os');
 const openItem = params.get('item');
 const openFrom = params.get('from');
 
 if (openFrom === 'visao-geral-pendencias') {
 setFromGlobal(true);
 setSetorAtivo('mapa');
 }

 if (openOs) {
 setOsFilter(openOs);
 }
 if (openItem) {
 setItemFilter(openItem);
 }
 }, []);



 // Fetch itens for setor
 const fetchItens = useCallback(async () => {
 // Abort previous request if any
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 }

 // Create new controller for this request
 const controller = new AbortController();
 abortControllerRef.current = controller;

 setLoading(true);
 setError(null);
 setSelectedItem(null);
 try {
 const params = new URLSearchParams();
 if (projetoFilter) params.set('projeto', projetoFilter);
 if (tagFilter) params.set('tag', tagFilter);
 if (osFilter) params.set('os', osFilter);
 if (clienteFilter) params.set('cliente', clienteFilter);
 if (planoCorteFilter) params.set('planoCorte', planoCorteFilter);
 if (itemFilter) params.set('item', itemFilter);
 if (codMatFabricanteFilter) params.set('codMatFabricante', codMatFabricanteFilter);
 if (statusFilter !== 'todos') params.set('status', statusFilter);
 if (dataPlanejamentoFilter) params.set('dataPlanejamento', dataPlanejamentoFilter);
 
 // Paginação
 params.set('page', String(page));
 params.set('limit', String(limit));

 // Use different route for mapa and mapaproducao
 const url = (setorAtivo === 'mapa' || setorAtivo === 'mapaproducao')
 ? `${API_BASE}/apontamento/mapa/producao?${params}`
 : `${API_BASE}/apontamento/${setorAtivo}?${params}`;

 const res = await fetch(url, { signal: controller.signal });
 const json = await res.json();

 if (json.success) {
 setItens(json.data);
 if (json.pagination) {
 setTotalPages(json.pagination.totalPages);
 setTotalItems(json.pagination.total);
 } else {
 setTotalPages(1);
 setTotalItems(json.data.length);
 }
 } else {
 setError(json.message || 'Erro ao carregar itens');
 }
 } catch {
 if (err.name === 'AbortError') {
 console.log('Fetch aborted');
 return;
 }
 setError('Erro de conexão com o servidor');
 } finally {
 if (abortControllerRef.current === controller) {
 setLoading(false);
 }
 }
 }, [setorAtivo, projetoFilter, tagFilter, osFilter, planoCorteFilter, statusFilter, itemFilter, clienteFilter, codMatFabricanteFilter, dataPlanejamentoFilter, page]);

 const handleCancelLoad = () => {
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 abortControllerRef.current = null;
 }
 setLoading(false);
 setError('O carregamento foi cancelado pelo usuário.');
 };

 // Auto-load removido intencionalmente para performance
 // Só carrega se houver page load de outra tela (com params) ou se o usuário clicar em pesquisar
 useEffect(() => {
 const fields = [planoCorteFilter, projetoFilter, tagFilter, osFilter, itemFilter, clienteFilter, codMatFabricanteFilter, dataPlanejamentoFilter];
 const filledFieldsCount = fields.filter(f => f.trim().length > 0).length;

 // Se a página mudou via paginação, busca automaticamente se houver filtros válidos ou se uma busca já foi iniciada
 if (filledFieldsCount >= 1 || hasSearched) {
 setHasSearched(true);
 fetchItens();
 } else {
 setItens([]);
 setHasSearched(false);
 }
 return () => {
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 }
 };
 }, [page, setorAtivo]);

 const handleSearch = () => {
 setHasSearched(true);
 setPage(1);
 fetchItens();
 };

 // Clear all filters
 const clearFilters = useCallback(() => {
 setPlanoCorteFilter('');
 setProjetoFilter('');
 setTagFilter('');
 setOsFilter('');
 setItemFilter('');
 setCodMatFabricanteFilter('');
 setStatusFilter('pendente');
 setClienteFilter('');
 setDataPlanejamentoFilter('');
 
 setItens([]);
 setHasSearched(false);
 }, []);

 // Check if any filter is active
 const hasActiveFilters = planoCorteFilter || projetoFilter || tagFilter || osFilter || itemFilter || codMatFabricanteFilter || clienteFilter || dataPlanejamentoFilter || statusFilter !== 'pendente';

 // Fetch item details when opening modal
 const selectItem = async (item: ApontamentoItem) => {
 setSelectedItem(item);
 setItemDetails(null); // Clear previous details immediately
 setLoadingDetails(true);
 try {
 // Load full history for the item across ALL sectors
 const res = await fetch(`${API_BASE}/apontamento/item/${item.IdOrdemServicoItem}/all`);
 const json = await res.json();
 if (json.success) {
 setItemDetails(json.data);
 }
 } catch {
 console.error('Error loading item details:', err);
 } finally {
 setLoadingDetails(false);
 }
 };


 const openModal = useCallback(async (item: ApontamentoItem, targetSetor?: string) => {
 const activeSetor = targetSetor || setorAtivo;
 setSelectedItem(item);
 setModalSetor(activeSetor as Setor);
 setModalOpen(true);
 setLoadingDetails(true);
 setQtdeApontar('');
 setConfirmingMapa(false);

 try {
 const res = await fetch(`${API_BASE}/apontamento/item/${item.IdOrdemServicoItem}/${activeSetor}`);
 const json = await res.json();
 if (json.success) {
 setItemDetails(json.data);
 // For Mapa, default to QtdeTotal as requested
 if (activeSetor === 'mapa') {
 setQtdeApontar(String(item.QtdeTotal));
 } else {
 setQtdeApontar(String(json.data.qtdeFaltante));
 }
 }
 } catch {
 console.error('Error loading details:', err);
 } finally {
 setLoadingDetails(false);
 }
 }, [setorAtivo]);

 // Submit apontamento
 const handleSubmit = async () => {
 if (!selectedItem || !itemDetails) return;

 const qProduzir = parseInt(qtdeApontar);

 if (!qtdeApontar || qProduzir <= 0) {
 addToast({ type: 'error', title: 'Atenção', message: 'Informe uma quantidade válida!' });
 return;
 }

 if (qProduzir > itemDetails.qtdeFaltante) {
 addToast({
 type: 'error',
 title: 'Atenção',
 message: `A quantidade informada (${qProduzir}) não poderá ser maior que o saldo a produzir (${itemDetails.qtdeFaltante})!`,
 duration: 5000
 });
 return;
 }

 // Mapa Confirmation Step
 if (modalSetor === 'mapa' && !confirmingMapa) {
 setConfirmingMapa(true);
 return;
 }

 setSubmitting(true);
 try {
 const isTotal = modalSetor === 'mapa' || (qProduzir === itemDetails.qtdeFaltante && itemDetails.totalProduzido === 0);
 const finalQtde = isTotal ? itemDetails.qtdeFaltante : qProduzir;
 const finalTipoApontamento = isTotal ? 'Total' : 'Parcial';

 const res = await fetch(`${API_BASE}/apontamento`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 IdOrdemServicoItem: selectedItem.IdOrdemServicoItem,
 IdOrdemServico: selectedItem.IdOrdemServico,
 Processo: modalSetor,
 QtdeProduzida: finalQtde,
 TipoApontamento: finalTipoApontamento,
 CriadoPor: 'Edson' // Temporário, aguardando refatoração de AuthContext nesta página
 })
 });

 const json = await res.json();
 if (json.success) {
 setModalOpen(false);
 setTimeout(() => {
 fetchItens();
 }, 300); // Small delay to ensure DB propagation and UI smoothness
  addToast({ type: 'success', title: 'Sucesso', message: 'Apontamento registrado com sucesso!' });
 } else {
 addToast({
 type: 'error',
 title: 'Atenção',
 message: json.message || 'Erro ao registrar apontamento',
 duration: 6000
 });
 }
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão com o servidor' });
 } finally {
 setSubmitting(false);
 }
 };

 // Submit Reposição
 const handleGerarReposicao = async () => {
 if (!selectedItem) return;

 const qtde = parseInt(qtdeReposicao);
 if (!qtde || qtde <= 0) {
 addToast({ type: 'error', title: 'Atenção', message: 'Informe a quantidade válida para reposição!' });
 return;
 }

 setSubmittingReposicao(true);
 try {
 const res = await fetch(`${API_BASE}/producao/reposicao`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 idOrdemServicoItem: selectedItem.IdOrdemServicoItem,
 qtdeReposicao: qtde,
 motivo: motivoReposicao,
 usuario: 'Sistema' // Em produção pegar do contexto de auth
 })
 });

 const json = await res.json();
 if (json.success) {
 setReposicaoModalOpen(false);
 setQtdeReposicao('');
 setMotivoReposicao('');
 fetchItens();
 // addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Reposição gerada com sucesso!' });
 } else {
 addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar reposição' });
 }
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão com o servidor' });
 } finally {
 setSubmittingReposicao(false);
 }
 };

 const handleSubmitPendencia = async () => {
 if (!selectedItem) return;

 if (!setorResponsavel || !usuarioResponsavel || !descricaoPendencia) {
 addToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Setor, Colaborador e Descrição são preenchimentos obrigatórios.' });
 return;
 }

 if (finalizandoRnc) {
 if (!setorFinalizacao || !colaboradorFinalizacao || !dataFinalizacao || !descricaoFinalizacao) {
 addToast({ type: 'error', title: 'Campos de Finalização', message: 'Para concluir a RNC, preencha todos os campos de finalização habilitados.' });
 return;
 }
 if (!window.confirm('Deseja realmente confirmar a finalização desta RNC? Esta ação registrará o item como resolvido.')) {
 return;
 }
 }

 setSubmittingPendencia(true);
 try {
 const payload = {
 idOrdemServicoItem: selectedItem.IdOrdemServicoItem,
 idOrdemServico: selectedItem.IdOrdemServico,
 idProjeto: selectedItem.IdProjeto || '',
 projeto: selectedItem.Projeto || '',
 idTag: selectedItem.IdTag || '',
 tag: selectedItem.Tag || '',
 descTag: selectedItem.DescTag || '',
 descEmpresa: selectedItem.Cliente || '',
 codMatFabricante: selectedItem.CodMatFabricante || '',
 espessura: espessuraRnc,
 materialSW: materialSWRnc,
 txtCorte: chkCorteRnc ? '1' : '',
 txtDobra: chkDobraRnc ? '1' : '',
 txtSolda: chkSoldaRnc ? '1' : '',
 txtPintura: chkPinturaRnc ? '1' : '',
 txtMontagem: chkMontagemRnc ? '1' : '',
 descricaoPendencia,
 setorResponsavel,
 usuarioResponsavel,
 titulo: tituloRnc,
 subTitulo: subTituloRnc,
 tipoRnc,
 dataExecucao: dataExecucaoRnc,
 usuarioCriacao: 'Sistema', // TODO: Context/Auth
 descProjeto: selectedItem.DescProjeto || selectedItem.Projeto || '',
 origemPendencia: 'MapaProducaoPendencia',
 idOrdemServicoItemPendencia: idRncEdicao,
 acao: finalizandoRnc ? 'FINALIZAR' : 'SALVAR',
 setorResponsavelFinalizacao: finalizandoRnc ? setorFinalizacao : null,
 finalizadoPorUsuarioSetor: finalizandoRnc ? colaboradorFinalizacao : null,
 dataFinalizacao: finalizandoRnc ? dataFinalizacao : null,
 descricaoFinalizacao: finalizandoRnc && descricaoFinalizacao ? descricaoFinalizacao.toUpperCase() : null
 };

 const res = await fetch(`${API_BASE}/producao/pendencia`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload)
 });

 const json = await res.json();
 if (json.success) {
 // Refresh item pendencies inline to show the newly added one
 setLoadingPendencias(true);
 try {
 const histRes = await fetch(`${API_BASE}/producao/pendencias/historico?codMatFabricante=${encodeURIComponent(selectedItem.CodMatFabricante || '')}`);
 const histJson = await histRes.json();
 if (histJson.success) setPendenciasHistorico(histJson.data);
 } catch { /* ignore */ } finally { setLoadingPendencias(false); }

 // Removed handleNovaPendencia to keep user on the same screen (Rule 4)
 if (!idRncEdicao) {
 // Se for insert, apenas atualize para o ID novo (simulação ou apenas permita novo insert mantendo tela)
 // Na verdade, ao invés de limpar tudo, ele continua na tela. 
 }
 fetchItens();
 // addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Operação realizada com sucesso.' });
 } else {
 addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar pendência.' });
 }
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão.' });
 } finally {
 setSubmittingPendencia(false);
 }
 };

 const fetchHistoricoRNC = async (codMat: string) => {
 if (!codMat) return;
 setLoadingPendencias(true);
 let url = `${API_BASE}/producao/pendencias/historico?codMatFabricante=` + encodeURIComponent(codMat);
 if (searchQuery1) url += '&q1=' + encodeURIComponent(searchQuery1);
 if (searchQuery2) url += '&q2=' + encodeURIComponent(searchQuery2);

 try {
 const res = await fetch(url);
 const json = await res.json();
 if (json.success) setPendenciasHistorico(json.data);
 else setPendenciasHistorico([]);
 } catch {
 setPendenciasHistorico([]);
 } finally {
 setLoadingPendencias(false);
 }
 };

 useEffect(() => {
 if (selectedItem?.CodMatFabricante && pendenciaModalOpen) {
 const timeoutId = setTimeout(() => {
 fetchHistoricoRNC(selectedItem.CodMatFabricante || '');
 }, 500);
 return () => clearTimeout(timeoutId);
 }
 }, [searchQuery1, searchQuery2, pendenciaModalOpen, clienteFilter, codMatFabricanteFilter, dataPlanejamentoFilter, fetchItens, hasSearched, itemFilter, osFilter, planoCorteFilter, projetoFilter, tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

 const handleNovaPendencia = () => {
 setIdRncEdicao(null);
 setDescricaoPendencia('');
 setSetorResponsavel('');
 setUsuarioResponsavel('');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setFinalizandoRnc(false);
 setSetorFinalizacao('');
 setColaboradorFinalizacao('');
 setDataFinalizacao('');
 setDescricaoFinalizacao('');
 setTipoRnc('RNC');
 setEspessuraRnc(selectedItem?.Espessura || '');
 setMaterialSWRnc(selectedItem?.MaterialSW || '');
 setChkCorteRnc(selectedItem?.txtCorte === '1');
 setChkDobraRnc(selectedItem?.txtDobra === '1');
 setChkSoldaRnc(selectedItem?.txtSolda === '1');
 setChkPinturaRnc(selectedItem?.txtPintura === '1');
 setChkMontagemRnc(selectedItem?.TxtMontagem === '1');
 };

 const loadPendenciaForEdit = (p: PendenciaItem) => {
 setIdRncEdicao(p.IDRNC);
 setDescricaoPendencia(p.DescricaoPendencia || '');
 setTituloRnc(p.DescResumo || '');
 setSubTituloRnc(p.DescDetal || '');
 setEspessuraRnc(p.Espessura || '');
 setMaterialSWRnc(p.MaterialSW || '');

 // Atempt to map DataExecucao to standard YYYY-MM-DD for input type date
 if (p.DataExecucao) {
 const parts = p.DataExecucao.split(' ')[0].split('/');
 if (parts.length === 3) setDataExecucaoRnc(`${parts[2]}-${parts[1]}-${parts[0]}`);
 else setDataExecucaoRnc(p.DataExecucao);
 }

 if (p.Colaborador) setUsuarioResponsavel(p.Colaborador);
 if (p.SetorResponsavel) setSetorResponsavel(p.SetorResponsavel);

 if (p.ST === 'FINALIZADO') {
 setFinalizandoRnc(true);
 setSetorFinalizacao(p.SetorResponsavelFinalizacao || '');
 setColaboradorFinalizacao(p.FinalizadoPorUsuarioSetor || '');
 setDescricaoFinalizacao(p.DescricaoFinalizacao || '');

 if (p.DataFinalizacao) {
 const parts = p.DataFinalizacao.split(' ')[0].split('/');
 if (parts.length === 3) setDataFinalizacao(`${parts[2]}-${parts[1]}-${parts[0]}`);
 else setDataFinalizacao(p.DataFinalizacao);
 } else {
 setDataFinalizacao('');
 }
 } else {
 setFinalizandoRnc(false);
 setSetorFinalizacao('');
 setColaboradorFinalizacao('');
 setDataFinalizacao('');
 setDescricaoFinalizacao('');
 }

 addToast({ type: 'info', title: 'Edição Ativada', message: `Carregando Pendência #${p.IDRNC}` });
 };

 // Group itens logic
 const groupedItens = useMemo(() => {
 const groups: Record<string, ApontamentoItem[]> = {};
 itens.forEach(item => {
 let key = '';

 if (groupBy === 'projeto') {
 key = item.Projeto ? `PROJETO: ${item.Projeto}` : 'SEM PROJETO';
 } else if (groupBy === 'tag') {
 key = item.Tag ? `TAG: ${item.Tag} ${item.DescTag ? `- ${item.DescTag}` : ''}` : 'SEM TAG';
 } else if (groupBy === 'cliente') {
 key = item.Cliente ? `CLIENTE: ${item.Cliente}` : 'SEM CLIENTE';
 } else if (groupBy === 'produto_principal') {
 if (item.NomeProdutoPrincipal) {
 key = `PRODUTO PRINCIPAL: ${item.NomeProdutoPrincipal} (OS ${item.IdOrdemServico})`;
 } else {
 key = `OS ${item.IdOrdemServico} - ${item.Tag} (Sem produto principal definido)`;
 }
 } else {
 // Default: OS
 key = `OS ${item.IdOrdemServico} - ${item.Tag}`;
 }

 if (!groups[key]) groups[key] = [];
 groups[key].push(item);
 });
 return groups;
 }, [itens, groupBy]);

 const formatDate = (val: string | null): string => {
 if (!val) return '—';
 const s = String(val).trim();
 if (s === '0' || s === '0/0/0' || s === '00/00/0000') return '—';
 
 // Se já estiver no formato DD/MM/YYYY, retorna como está (pode ter hora)
 if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
 
 // Se for ISO ou formato MySQL (YYYY-MM-DD), converte
 if (s.includes('-')) {
 try {
 const d = new Date(s.replace(/-/g, '/')); // replace para Safari/Chrome stability
 if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
 } catch { /* ignore */ }
 }
 
 if (s.includes('T')) return new Date(s).toLocaleDateString('pt-BR');
 
 return s;
 };

 const getProgressColor = (percent: number) => {
 if (percent >= 100) return 'bg-green-500';
 if (percent >= 50) return 'bg-yellow-500';
 if (percent > 0) return 'bg-orange-500';
 return 'bg-gray-300';
 };

 const setorInfo = setores.find(s => s.id === setorAtivo) || setores[0];
  const unauthorizedError = (!user || (user.role !== 'admin' && user.mapaProducao !== 'S' && !user.isSuperadmin && user.superadmin !== 'S')) ? (
 <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 min-h-0 bg-slate-50">
 <div className="p-4 bg-red-100 rounded-full text-red-600"><Lock size={40} /></div>
 <h2 className="text-xl font-black text-red-700">Acesso Negado</h2>
 <p className="text-xs text-slate-500 text-center max-w-xs">
 Somente usuários com permissão de Mapa de Produção ou Administradores podem acessar esta tela.
 </p>
 {user && (
 <div className="mt-4 text-xs text-slate-400 bg-white p-2 rounded border border-slate-200">
 <p><strong>Debug Info:</strong></p>
 <p>Role: {user.role || 'N/A'}</p>
 <p>MapaProducao: {user.mapaProducao || 'N/A'}</p>
 <p>DB: {user.dbName || 'N/A'}</p>
 <p className="mt-2 text-red-500 font-bold">Por favor, clique em SAIR no menu e faça login novamente.</p>
 </div>
 )}
 </div>
 ) : null;

  if (unauthorizedError) return unauthorizedError;

 return (
 <div className={`space-y-4 flex flex-col transition-all duration-300 bg-gray-50 ${isExpanded ? 'fixed inset-0 z-50 overflow-hidden p-4' : (fromGlobal ? 'h-full' : 'h-[calc(100vh-80px)] w-full')}`}>
 {!fromGlobal ? (
 <>
 {setorAtivo !== 'planejamento' && (
 <>
 {/* Header */}
 {fromGlobal && (
 <div className="mb-2">
 <button
 onClick={() => window.location.href = '/visao-geral-pendencias'}
 className="flex items-center gap-2 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors w-fit text-xs font-medium"
 title="Voltar para Todas as Pendências"
 >
 <ArrowLeft size={14} /> Voltar
 </button>
 </div>
 )}

 {/* Setor Tabs */}
 <AnimatePresence>
{showTabs && (
      <div className="bg-white rounded-md shadow-sm border border-gray-100 p-2 overflow-hidden mb-2">
        <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
          <label className="text-xs font-semibold text-gray-700 uppercase">Recurso de Fabricação:</label>
          <select
              value={setorAtivo}
              onChange={(e) => {
                  setSetorAtivo(e.target.value);
                  setPage(1);
                  setHasSearched(false);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#567469] focus:ring-1 focus:ring-[#567469]"
          >
              {recursosList.map((r, idx) => {
                  const val = r.processofabricacao.toLowerCase().replace(/\s+/g, '');
                  return <option key={idx} value={val}>{r.processofabricacao}</option>;
              })}
          </select>
        </div>
      </div>
    )}
 </AnimatePresence>
 </>
 )}

 {setorAtivo === 'planejamento' ? (
 <div className="flex-1 min-h-0 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/30">
 <PlanejamentoProducaoPage onBack={() => setSetorAtivo('mapa')} />
 </div>
 ) : (
 <>
 {/* Toolbar sempre visível: toggle filtro + botões de ação */}
 <div className="flex items-center gap-2 shrink-0">
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-lg shadow-sm transition-all border ${
 showFilters
 ? 'text-gray-600 bg-white hover:bg-gray-50 border-gray-200'
 : 'text-[#32423D] bg-[#E0E800]/40 hover:bg-[#E0E800]/60 border-[#c8cf00]'
 }`}
 title={showFilters ? 'Ocultar filtros de pesquisa' : 'Mostrar filtros de pesquisa'}
 >
 <Filter size={13} />
 {!showFilters && hasActiveFilters && (
 <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
 )}
 <span>{showFilters ? 'Ocultar Filtro' : 'Mostrar Filtro'}</span>
 </button>
 </div>

 {/* Filters Panel */}
 <AnimatePresence>
 {showFilters && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 className="bg-white rounded-md shadow-sm border border-gray-100 p-4 overflow-hidden shrink-0"
 >
 <div className="flex flex-wrap items-end gap-3">
 {/* Plano de Corte Filter */}
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Plano de Corte</label>
 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
 <div className="relative flex items-center w-full">
 <input
 type="search"
 placeholder="Digite a descrição..."
 value={planoCorteFilter}
 onChange={(e) => setPlanoCorteFilter(e.target.value)}
 className="w-full pl-8 pr-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50 pr-6"
 />
 {planoCorteFilter && (
 <button onClick={() => {
 const e = { target: { value: '' } };
 ((e) => setPlanoCorteFilter(e.target.value))(e);
 }} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
 </div>
 </div>
 {planoCorteFilter && (
 <button onClick={() => setPlanoCorteFilter('')} className="p-1.5 rounded border border-gray-200 text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 bg-white shadow-sm transition-colors" title="Limpar pesquisa">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Projeto Filter */}
 <div className="min-w-[150px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Projeto</label>
 <input
 type="search"
 placeholder="Digite o projeto..."
 value={projetoFilter}
 onChange={(e) => { setProjetoFilter(e.target.value); setTagFilter(''); setOsFilter(''); }}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
 />
 </div>

 {/* Tag Filter */}
 <div className="min-w-[150px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Tag</label>
 <input
 type="search"
 placeholder="Digite a tag..."
 value={tagFilter}
 onChange={(e) => { setTagFilter(e.target.value); setOsFilter(''); }}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
 />
 </div>

 {/* OS Filter */}
 <div className="min-w-[120px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Ordem de Serviço</label>
 <div className="relative flex items-center w-full">
 <input
 type="search"
 placeholder="Digite a OS..."
 value={osFilter}
 onChange={(e) => setOsFilter(e.target.value)}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50 pr-6"
 />
 {osFilter && (
 <button onClick={() => {
 const e = { target: { value: '' } };
 ((e) => setOsFilter(e.target.value))(e);
 }} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Cliente Filter */}
 <div className="min-w-[120px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Cliente</label>
 <div className="relative flex items-center w-full">
 <input
 type="search"
 placeholder="Digite o cliente..."
 value={clienteFilter}
 onChange={(e) => setClienteFilter(e.target.value)}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50 pr-6"
 />
 {clienteFilter && (
 <button onClick={() => {
 const e = { target: { value: '' } };
 ((e) => setClienteFilter(e.target.value))(e);
 }} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Cod. Produto Filter */}
 <div className="min-w-[120px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Cód. Produto</label>
 <div className="relative flex items-center w-full">
 <input
 type="search"
 placeholder="Digite o código..."
 value={codMatFabricanteFilter}
 onChange={(e) => setCodMatFabricanteFilter(e.target.value)}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50 pr-6"
 />
 {codMatFabricanteFilter && (
 <button onClick={() => {
 const e = { target: { value: '' } };
 ((e) => setCodMatFabricanteFilter(e.target.value))(e);
 }} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Data Planejamento Filter */}
 {setorAtivo !== 'mapa' && setorAtivo !== 'mapaproducao' && (
 <div className="min-w-[130px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
 Data Planej. {setorInfo.label}
 </label>
 <input
 type="date"
 value={dataPlanejamentoFilter}
 onChange={(e) => setDataPlanejamentoFilter(e.target.value)}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
 />
 </div>
 )}

 {/* Group By */}
 <div className="min-w-[120px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Agrupar Por</label>
 <select
 value={groupBy}
 onChange={(e) => setGroupBy(e.target.value as Record<string, unknown>)}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs font-bold text-[#32423D] bg-[#E0E800]/20 border-blue-200"
 >
 <option value="os">Ordem Serviço</option>
 <option value="projeto">Projeto</option>
 <option value="tag">Tag</option>
 <option value="cliente">Cliente</option>
 <option value="produto_principal">Produto Principal</option>
 </select>
 </div>

 {/* Status Filter */}
 <div className="min-w-[100px]">
 <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as 'todos' | 'pendente' | 'concluido')}
 className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-xs"
 >
 <option value="todos">Todos</option>
 <option value="pendente">Pendentes</option>
 <option value="concluido">Concluídos</option>
 </select>
 </div>

 {/* Clear Filters */}
 {hasActiveFilters && (
 <button
 onClick={clearFilters}
 className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
 >
 <XCircle size={14} />
 Limpar
 </button>
 )}

 {/* Action Buttons (Right) */}
 <div className="flex items-center gap-2 ml-auto">
 {/* Planejamento Button */}
 <button
 onClick={() => setSetorAtivo('planejamento')}
 className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded shadow-sm transition-colors"
 >
 <Calendar size={14} />
 Planejamento
 </button>
 
 {/* Search Button */}
 <button
 onClick={handleSearch}
 disabled={loading}
 className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold bg-emerald-100 border border-emerald-200 text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 rounded shadow-sm transition-colors"
 >
 {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
 Pesquisar
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Error */}
 {error && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2"
 >
 <AlertCircle size={15} />
 {error}
 </motion.div>
 )}

 {/* Content Container */}
 <div className="bg-white rounded-md shadow-sm border border-gray-100 flex flex-col min-h-[150px] flex-1 overflow-auto relative">
 
 {/* Empty State Inicial */}
 {!loading && !hasSearched && itens.length === 0 && (
 <div className="flex flex-col items-center justify-center py-20 text-gray-400">
 <Search size={48} className="mb-4 text-gray-300" />
 <h3 className="text-lg font-bold text-gray-500">Pronto para buscar</h3>
 <p className="text-xs mt-2">Preencha pelo menos 1 filtro acima e clique em "Pesquisar" para exibir os apontamentos.</p>
 </div>
 )}
 
 {/* Loader */}
 {/* Primary Table Header - Movido para dentro do container com sticky */}
 {!loading && itens.length > 0 && setorAtivo !== 'mapa' && (
 <div className="bg-gray-100 px-2 py-1.5 flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase sticky top-0 z-20 border-b border-gray-200 shadow-sm min-w-max">
 <span className="w-10 shrink-0 text-center">OS</span>
 <span className="w-32 shrink-0 sticky left-0 bg-gray-100 z-30">Projeto</span>
 <span className="w-40 shrink-0">Cliente/Empresa</span>
 <span className="w-24 shrink-0">Tag</span>
 <span className="w-[140px] shrink-0">Código</span>
 <span className="w-6 shrink-0 text-center">PDF</span>
 <span className="w-12 shrink-0 text-center">PC</span>
 <span className="w-16 shrink-0 text-center">Apontar</span>
 <span className="w-10 shrink-0 text-center">Qt</span>
 <span className="w-14 shrink-0 text-center">Prod.</span>
 <span className="w-28 shrink-0">Material</span>
 <span className="w-12 shrink-0 text-center">Esp.</span>
 <span className="w-48 shrink-0">Descrição</span>
 <span className="w-20 shrink-0 text-center">Data Planej.</span>
 <span className="w-12 shrink-0 text-center">%</span>
 <span className="w-28 shrink-0 text-right pr-2">Ação</span>
 </div>
 )}

 {loading ? (
 <div className="p-12 flex flex-col items-center justify-center gap-4 text-gray-400">
 <Loader2 size={32} className="animate-spin text-[#32423D]" />
 <div className="text-center">
 <p className="text-xs font-medium text-gray-600">Carregando itens do setor {setorInfo.label}...</p>
 <p className="text-[10px] text-gray-400 mt-1">Aguarde enquanto processamos os dados...</p>
 </div>
 <button 
 onClick={handleCancelLoad}
 className="mt-2 px-4 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-2"
 >
 <X size={14} />
 Cancelar Busca
 </button>
 </div>
 ) : itens.length === 0 ? (
 <div className="p-16 flex flex-col items-center justify-center gap-4 text-gray-400">
 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border-4 border-gray-100 shadow-inner"
 >
 <CheckCircle size={40} className="text-gray-300" />
 </motion.div>
 <div className="text-center max-w-sm">
 <h3 className="text-lg font-bold text-gray-700 mb-2">Nada a Executar</h3>
 <p className="text-xs text-gray-500">
 Não há itens pendentes para o setor <span className="font-bold text-[#32423D]">{setorInfo.label}</span>.
 </p>
 <p className="text-xs text-gray-400 mt-3 bg-[#E0E800]/20 p-3 rounded-lg border border-blue-100 italic">
 Certifique-se de que os filtros estão corretos ou se as etapas anteriores da produção já foram concluídas para liberar saldo para este setor.
 </p>
 </div>
 </div>
 ) : setorAtivo === 'mapa' ? (
 /* Mapa da Produção View */
 <div>
 {/* Mapa Header */}
 <div className="bg-gray-100 px-2 py-1 flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase sticky top-0 z-20 border-b border-gray-200 min-w-max">
 <span className="w-10 shrink-0 text-center">OS</span>
 <span className="w-32 shrink-0 sticky left-0 z-30 bg-gray-100 border-r border-gray-200">Projeto</span>
 <span className="w-40 shrink-0">Cliente/Empresa</span>
 <span className="w-24 shrink-0">Tag</span>
 <span className="w-[140px] shrink-0">Código</span>
 <span className="w-8 shrink-0 text-center">PDF</span>
 <span className="w-12 shrink-0 text-center">PC</span>
 <span className="w-28 shrink-0">Material</span>
 <span className="w-48 shrink-0">Descrição</span>
 <span className="w-16 shrink-0 text-center">Apontar</span>
 <span className="w-10 shrink-0 text-center">Qt</span>
 {visibleSetores.includes('corte') && <span className="w-14 shrink-0 text-center bg-blue-100 rounded py-0.5">Corte</span>}
 {visibleSetores.includes('dobra') && <span className="w-14 shrink-0 text-center bg-purple-100 rounded py-0.5">Dobra</span>}
 {visibleSetores.includes('solda') && <span className="w-14 shrink-0 text-center bg-orange-100 rounded py-0.5">Solda</span>}
 {visibleSetores.includes('pintura') && <span className="w-14 shrink-0 text-center bg-green-100 rounded py-0.5">Pintura</span>}
 {visibleSetores.includes('montagem') && <span className="w-14 shrink-0 text-center bg-red-100 rounded py-0.5">Montag.</span>}
 <span className="w-28 shrink-0 text-right pr-2">Ação</span>
 </div>

 {/* Mapa Items */}
 <div className="divide-y divide-gray-100 min-w-max">
 {itens.map((item) => {
 const passaCorte = item.txtCorte === '1';
 const passaDobra = item.txtDobra === '1';
 const passaSolda = item.txtSolda === '1';
 const passaPintura = item.txtPintura === '1';
 const passaMontagem = item.TxtMontagem === '1';

 const getStatusCell = (passa: boolean, total: number | undefined, target: number) => {
 if (!passa) return { bg: 'bg-gray-100', text: '-', color: 'text-gray-400', pct: 0 };
 const qty = total || 0;
 const pct = target > 0 ? Math.round((qty / target) * 100) : 0;
 const text = `${qty}\\${target}`;

 if (pct >= 100) return { bg: 'bg-green-100', text, color: 'text-green-700', pct };
 if (pct > 0) return { bg: 'bg-yellow-100', text, color: 'text-yellow-700', pct };
 return { bg: 'bg-red-50', text, color: 'text-red-500', pct };
 };

 const corteStatus = getStatusCell(passaCorte, item.CorteTotalExecutado, item.QtdeTotal);
 const dobraStatus = getStatusCell(passaDobra, item.DobraTotalExecutado, item.QtdeTotal);
 const soldaStatus = getStatusCell(passaSolda, item.SoldaTotalExecutado, item.QtdeTotal);
 const pinturaStatus = getStatusCell(passaPintura, item.PinturaTotalExecutado, item.QtdeTotal);
 const montagemStatus = getStatusCell(passaMontagem, item.MontagemTotalExecutado, item.QtdeTotal);

 return (
 <div
 key={item.IdOrdemServicoItem}
 onClick={() => selectItem(item)}
 className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors text-[11px] border-l-4 ${selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem
 ? 'bg-[#E0E800]/20 border-[#32423D] shadow-inner'
 : 'hover:bg-gray-50 border-transparent'
 }`}
 >
 <span className="w-10 shrink-0 text-center font-bold text-[#32423D] bg-blue-100 px-0.5 py-0.5 rounded text-[10px]">
 {item.IdOrdemServico}
 </span>

 <span className="w-32 shrink-0 overflow-hidden text-ellipsis text-[10px] font-bold text-[#32423D] bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap sticky left-0 z-10 border-r border-white" title={item.Projeto}>
 {item.Projeto || '-'}
 </span>
 <span className="w-40 shrink-0 overflow-hidden text-ellipsis text-[10px] text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded uppercase whitespace-nowrap" title={item.Cliente}>
 {item.Cliente || '-'}
 </span>
 <span className="w-24 shrink-0 overflow-hidden text-ellipsis text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap" title={item.Tag}>
 {item.Tag || '-'}
 </span>
 <span className="w-[140px] shrink-0 overflow-hidden text-ellipsis text-[10px] font-black text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded whitespace-nowrap" title={item.CodMatFabricante}>
 {item.CodMatFabricante || '-'}
 </span>
 <div className="w-8 shrink-0 flex justify-center">
 {item.EnderecoArquivo ? (
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/pdf?path=${encodeURIComponent(item.EnderecoArquivo || '')}`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
 title="PDF"
 >
 <FileText size={11} />
 </button>
 ) : (
 <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-50 text-gray-300">
 <FileText size={11} />
 </div>
 )}
 </div>
 <span className="w-12 shrink-0 text-center text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded truncate" title={item.PlanoCorte}>
 {item.PlanoCorte || '-'}
 </span>
 <span className="w-28 shrink-0 text-[10px] font-bold text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded truncate">
 {item.MaterialSW || '-'}
 </span>
 <span className="w-48 shrink-0 text-gray-700 truncate text-[10px]">
 {item.DescResumo?.trim() || '-'}
 </span>
 
 {/* Mapa Action Button (Apontar) */}
 <div className="w-16 shrink-0 flex justify-center">
 {(() => {
  const allDone = (!passaCorte || corteStatus.pct >= 100) &&
  (!passaDobra || dobraStatus.pct >= 100) &&
  (!passaSolda || soldaStatus.pct >= 100) &&
  (!passaPintura || pinturaStatus.pct >= 100) &&
  (!passaMontagem || montagemStatus.pct >= 100);
  const semSaldoMapa = (Number(item.QtdeTotal) || 0) <= 0;

  return allDone ? (
  <div className="w-full flex items-center justify-center gap-1 px-1 py-1 rounded bg-green-50 text-green-600 text-[10px] font-black border border-green-200">
  <CheckCircle size={10} />
  OK
  </div>
  ) : semSaldoMapa ? (
  <div className="w-full flex items-center justify-center gap-1 px-1 py-1 rounded bg-gray-100 text-gray-400 text-[10px] font-bold border border-gray-200 cursor-not-allowed" title="Sem saldo a executar">
  <span className="text-[8px]">S/S</span>
  </div>
  ) : (
  <button
  onClick={(e) => { e.stopPropagation(); setSetorAtivo('mapa'); openModal(item, 'mapa'); }}
  className={`w-full flex items-center justify-center gap-1 px-1 py-1 rounded bg-[#32423D] text-white text-[10px] font-bold hover:bg-[#32423D]/90 transition-all active:scale-95`}
  >
  <Plus size={10} />
  Apontar
  </button>
  );
  })()}
 </div>

 <span className="w-10 shrink-0 text-center font-black text-[#32423D] text-[11px]">
 {item.QtdeTotal}
 </span>

 {/* Status cells for each process */}
 {visibleSetores.includes('corte') && (
 <button
 onClick={(e) => { e.stopPropagation(); setSetorAtivo('corte'); openModal(item, 'corte'); }}
 disabled={corteStatus.pct >= 100 || item.txtCorte !== '1'}
 className={`w-14 shrink-0 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${corteStatus.bg} ${corteStatus.color}`}
 >
 {corteStatus.text}
 </button>
 )}
 {visibleSetores.includes('dobra') && (
 <button
 onClick={(e) => { e.stopPropagation(); setSetorAtivo('dobra'); openModal(item, 'dobra'); }}
 disabled={dobraStatus.pct >= 100 || item.txtDobra !== '1'}
 className={`w-14 shrink-0 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${dobraStatus.bg} ${dobraStatus.color}`}
 >
 {dobraStatus.text}
 </button>
 )}
 {visibleSetores.includes('solda') && (
 <button
 onClick={(e) => { e.stopPropagation(); setSetorAtivo('solda'); openModal(item, 'solda'); }}
 disabled={soldaStatus.pct >= 100 || item.txtSolda !== '1'}
 className={`w-14 shrink-0 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${soldaStatus.bg} ${soldaStatus.color}`}
 >
 {soldaStatus.text}
 </button>
 )}
 {visibleSetores.includes('pintura') && (
 <button
 onClick={(e) => { e.stopPropagation(); setSetorAtivo('pintura'); openModal(item, 'pintura'); }}
 disabled={pinturaStatus.pct >= 100 || item.txtPintura !== '1'}
 className={`w-14 shrink-0 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${pinturaStatus.bg} ${pinturaStatus.color}`}
 >
 {pinturaStatus.text}
 </button>
 )}
 {visibleSetores.includes('montagem') && (
 <button
 onClick={(e) => { e.stopPropagation(); setSetorAtivo('montagem'); openModal(item, 'montagem'); }}
 disabled={montagemStatus.pct >= 100 || item.TxtMontagem !== '1'}
 className={`w-14 shrink-0 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${montagemStatus.bg} ${montagemStatus.color}`}
 >
 {montagemStatus.text}
 </button>
 )}
 
 {/* Actions */}
 <div className="flex gap-1 items-center justify-end w-28 shrink-0 pr-2">
 <div className="flex gap-0.5">
 {item.EnderecoArquivo && (
 <>
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/download?path=${encodeURIComponent(item.EnderecoArquivo || '')}&type=dxf`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-[#E0E800]/10 hover:text-[#32423D] transition-colors border border-gray-200"
 title="DXF"
 >
 <PenTool size={11} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/download?path=${encodeURIComponent(item.EnderecoArquivo || '')}&type=sldprt`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 hover:text-gray-800 transition-colors border border-gray-200"
 title="3D"
 >
 <Box size={11} />
 </button>
 </>
 )}
 </div>

 <div className="flex gap-0.5 border-l border-gray-200 pl-1">
 {/* Apontamento Parcial */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 if ((Number(item.QtdeTotal) || 0) <= 0) return;
  setParcialItem(item);
  setParcialRecurso(setorAtivo);
  setQtdeParcial('');
  setParcialModalOpen(true);
  }}
  disabled={(Number(item.QtdeTotal) || 0) <= 0}
 className={`flex items-center justify-center w-6 h-6 rounded transition-colors border ${
 (Number(item.QtdeTotal) || 0) <= 0
 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
 : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
 }`}
 title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}
 >
 <Zap size={12} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItem(item);
 setQtdeReposicao('');
 setMotivoReposicao('');
 setReposicaoModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
 title="Reposição"
 >
 <RefreshCw size={12} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setIdRncEdicao(null);
 setSelectedItem(item);
 setDescricaoPendencia('');
 setTituloRnc(item.DescResumo || '');
 setSubTituloRnc(item.DescDetal || '');
 setTipoRnc('RNC');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setEspessuraRnc(item.Espessura || '');
 setMaterialSWRnc(item.MaterialSW || '');
 setChkCorteRnc(item.txtCorte === '1');
 setChkDobraRnc(item.txtDobra === '1');
 setChkSoldaRnc(item.txtSolda === '1');
 setChkPinturaRnc(item.txtPintura === '1');
 setChkMontagemRnc(item.TxtMontagem === '1');

 setLoadingPendencias(true);
 fetchHistoricoRNC(item.CodMatFabricante || '');

 setPendenciaModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors border border-red-200"
 title="Pendência"
 >
 <AlertTriangle size={12} />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ) : (
 <div>
 {Object.entries(groupedItens).map(([groupKey, items]) => (
 <div key={groupKey}>
 {/* Group Header */}
 <div className="px-4 py-1 sticky top-0 z-10 bg-gray-100 border-b border-gray-200 text-[#32423D] flex items-center justify-between shadow-sm min-w-max">
 <span className="font-bold text-xs uppercase">{groupKey}</span>
 <span className="text-xs font-medium text-gray-500">{items.length} itens</span>
 </div>

 {/* Items */}
 <div className="divide-y divide-gray-100 min-w-max">
 {items.map((item) => {
 const qtdeProduzida = Number(item.QtdeProduzidaSetor) || 0;
 const qtdeTotal = Number(item.QtdeTotal) || 0;
 const percentual = qtdeTotal > 0 ? Math.round((qtdeProduzida / qtdeTotal) * 100) : 0;
 const concluido = percentual >= 100;

 return (
 <div
 key={item.IdOrdemServicoItem}
 onClick={() => selectItem(item)}
 className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors text-[11px] border-l-4 ${selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem
 ? 'bg-[#E0E800]/20 border-[#32423D] shadow-inner'
 : 'hover:bg-gray-50 border-transparent'
 }`}
 >


 {/* OS Number */}
 <div className="w-10 shrink-0 text-center">
 <span className="font-bold text-[#32423D] bg-blue-100 px-0.5 py-0.5 rounded text-[10px]">
 {item.IdOrdemServico}
 </span>
 </div>

 <span className="w-32 shrink-0 overflow-hidden text-ellipsis text-[10px] font-bold text-[#32423D] bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap sticky left-0 z-10 border-r border-white" title={item.Projeto}>
 {item.Projeto || '-'}
 </span>
 <span className="w-40 shrink-0 overflow-hidden text-ellipsis text-[10px] text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded uppercase whitespace-nowrap" title={item.Cliente}>
 {item.Cliente || '-'}
 </span>
 <span className="w-24 shrink-0 overflow-hidden text-ellipsis text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded whitespace-nowrap" title={item.Tag}>
 {item.Tag || '-'}
 </span>
 <span className="w-[140px] shrink-0 overflow-hidden text-ellipsis text-[10px] font-black text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded whitespace-nowrap" title={item.CodMatFabricante}>
 {item.CodMatFabricante || '-'}
 </span>
 <div className="w-6 shrink-0 flex justify-center">
 {item.EnderecoArquivo ? (
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/pdf?path=${encodeURIComponent(item.EnderecoArquivo || '')}`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
 title="PDF"
 >
 <FileText size={11} />
 </button>
 ) : (
 <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-50 text-gray-300">
 <FileText size={11} />
 </div>
 )}
 </div>
 <div className="w-12 shrink-0 flex items-center justify-center">
 <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded truncate" title={item.PlanoCorte}>
 {item.PlanoCorte || '-'}
 </span>
 </div>
 {/* Apontar Button */}
 <div className="w-16 shrink-0 flex justify-center">
 {(() => {
 const { allowed, predecessor } = checkPredecessorStatus(item, setorAtivo as Setor);
 const semSaldo = qtdeTotal <= 0;
 const bloqueado = !allowed || semSaldo;
 return concluido ? (
 <div className="w-full flex items-center justify-center gap-1 px-1 py-1 rounded bg-green-50 text-green-600 text-[10px] font-black border border-green-200">
 <CheckCircle size={10} />
 OK
 </div>
 ) : (
 <button
 disabled={bloqueado}
 onClick={(e) => {
 e.stopPropagation();
 if (!bloqueado) openModal(item, setorAtivo as Record<string, unknown>);
 }}
 className={`w-full flex items-center justify-center gap-0.5 px-1 py-1 rounded text-[10px] font-bold transition-all shadow-sm ${
 bloqueado
 ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
 : `${setorInfo.color} text-white hover:opacity-90 active:scale-95`
 }`}
 title={semSaldo ? 'Sem saldo a executar' : !allowed ? `Aguardando setor ${predecessor}` : 'Apontar'}
 >
 {semSaldo ? <span className="text-[8px]">S/S</span> : !allowed ? <Clock size={10} /> : <Plus size={10} />}
 {semSaldo ? 'S/S' : allowed ? 'Apontar' : 'Bloq.'}
 </button>
 );
 })()}
 </div>

 {/* Quantidade Total */}
 <div className="w-10 shrink-0 text-center">
 <span className="font-black text-[#32423D]">{qtdeTotal}</span>
 </div>

 {/* Produzido */}
 <div className="w-14 shrink-0 text-center">
 <span className={`font-bold text-[10px] ${concluido ? 'text-green-600' : 'text-gray-600'}`}>
 {qtdeProduzida}/{qtdeTotal}
 </span>
 </div>

 <div className="w-28 shrink-0 flex items-center">
 <span className="text-[10px] font-bold text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded truncate">
 {item.MaterialSW || '-'}
 </span>
 </div>

 {/* Espessura */}
 <div className="w-12 shrink-0 text-center text-[10px] text-gray-600">
 {item.Espessura || '-'}
 </div>

 {/* Descrição */}
 <span className="w-48 shrink-0 text-gray-700 truncate text-[10px]" title={item.DescResumo?.trim() || '-'}>
 {item.DescResumo?.trim() || '-'}
 </span>

 {/* Data Planejamento */}
 <div className="w-20 shrink-0 text-center text-[10px] text-gray-700 font-bold">
 {item.DataPlanejamento ? formatDate(item.DataPlanejamento) : '-'}
 </div>

 {/* Progress */}
 <div className="w-12 shrink-0">
 <div className="flex items-center gap-1">
 <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all ${getProgressColor(percentual)}`}
 style={{ width: `${Math.min(percentual, 100)}%` }}
 />
 </div>
 <span className="text-[8px] text-gray-500 w-6 font-bold">{percentual}%</span>
 </div>
 </div>

 {/* Actions */}
 <div className="flex gap-1 items-center justify-end w-28 shrink-0 pr-2">
 <div className="flex gap-0.5">
 {item.EnderecoArquivo && (
 <>
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/download?path=${encodeURIComponent(item.EnderecoArquivo || '')}&type=dxf`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-[#E0E800]/10 hover:text-[#32423D] transition-colors border border-gray-200"
 title="DXF"
 >
 <PenTool size={11} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 window.open(`${API_BASE}/download?path=${encodeURIComponent(item.EnderecoArquivo || '')}&type=sldprt`, '_blank');
 }}
 className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 hover:text-gray-800 transition-colors border border-gray-200"
 title="3D"
 >
 <Box size={11} />
 </button>
 </>
 )}
 </div>

 <div className="flex gap-0.5 border-l border-gray-200 pl-1">
 {/* Apontamento Parcial */}
 <button
 onClick={(e) => {
 e.stopPropagation();
 if ((Number(item.QtdeTotal) || 0) <= 0) return;
  setParcialItem(item);
  setParcialRecurso(setorAtivo);
  setQtdeParcial('');
  setParcialModalOpen(true);
  }}
 disabled={(Number(item.QtdeTotal) || 0) <= 0}
 className={`flex items-center justify-center w-6 h-6 rounded transition-colors border ${
 (Number(item.QtdeTotal) || 0) <= 0
 ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
 : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
 }`}
 title={(Number(item.QtdeTotal) || 0) <= 0 ? 'Sem saldo a executar' : 'Apontamento Parcial'}
 >
 <Zap size={12} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItem(item);
 setQtdeReposicao('');
 setMotivoReposicao('');
 setReposicaoModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
 title="Reposição"
 >
 <RefreshCw size={12} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setIdRncEdicao(null);
 setSelectedItem(item);
 setDescricaoPendencia('');
 setTituloRnc(item.DescResumo || '');
 setSubTituloRnc(item.DescDetal || '');
 setTipoRnc('RNC');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setEspessuraRnc(item.Espessura || '');
 setMaterialSWRnc(item.MaterialSW || '');
 setChkCorteRnc(item.txtCorte === '1');
 setChkDobraRnc(item.txtDobra === '1');
 setChkSoldaRnc(item.txtSolda === '1');
 setChkPinturaRnc(item.txtPintura === '1');
 setChkMontagemRnc(item.TxtMontagem === '1');

 setLoadingPendencias(true);
 fetchHistoricoRNC(item.CodMatFabricante || '');

 setPendenciaModalOpen(true);
 }}
 className="flex items-center justify-center w-6 h-6 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors border border-red-200"
 title="Pendência"
 >
 <AlertTriangle size={12} />
 </button>
 </div>

 <button
 onClick={(e) => {
 e.stopPropagation();
 selectItem(item);
 setHistoryModalOpen(true);
 }}
 className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-[#E0E800]/10 rounded-full transition-colors"
 title="Histórico"
 >
 <History size={14} />
 </button>


 </div>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Paginação Controls */}
 {!loading && totalPages > 1 && (
 <div className="flex items-center justify-between px-2 py-0.5 bg-gray-50 border-t border-gray-200 mt-auto rounded-b-xl">
 <div className="text-xs text-gray-500 font-medium">
 Mostrando página <span className="font-bold text-gray-700">{page}</span> de <span className="font-bold text-gray-700">{totalPages}</span>
 <span className="ml-2 text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200">Total: {totalItems} itens</span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => { setPage(p => Math.max(1, p - 1)); }}
 disabled={page === 1}
 className="px-2 py-0.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Anterior
 </button>
 <button
 onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
 disabled={page === totalPages}
 className="px-2 py-0.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 Próxima
 </button>
 </div>
 </div>
 )}


 </div>
 </>
 )}
 </>
 ) : (
 <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white rounded-md border border-gray-200 p-8 shadow-sm relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
 <div className="w-20 h-20 bg-[#E0E800]/30 text-[#32423D] rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100">
 <AlertTriangle size={36} />
 </div>
 <h2 className="text-2xl font-bold text-[#32423D] mb-2 tracking-tight">Log de Pendência (Mapa)</h2>
 <p className="text-gray-500 mb-8 max-w-md text-center text-xs leading-relaxed">
 A janela de histórico e edição da pendência está aberta automaticamente. Quando finalizar sua consulta, feche o modal da pendência e clique no botão abaixo para retornar.
 </p>
 <button
 onClick={() => window.location.href = '/visao-geral-pendencias'}
 className="group flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-[#32423D] hover:border-blue-200 transition-all font-medium shadow-sm active:scale-95 z-10"
 >
 <ArrowLeft size={15} className="text-blue-500 group-hover:text-blue-700 transition-colors" />
 Voltar para Todas as Pendências
 </button>
 
 {/* Decoration elements */}
 <div className="absolute top-10 right-10 w-64 h-64 bg-[#E0E800]/20 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
 <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
 </div>
 )}

 {/* Modal de Apontamento */}
 <AnimatePresence>
 {modalOpen && selectedItem && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
 onClick={() => setModalOpen(false)}
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-md shadow-2xl w-full max-w-4xl overflow-hidden"
 >
 {/* Modal Header */}
 <div className={`px-2 py-1 flex items-center justify-between ${modalSetor === 'mapa' ? 'bg-[#32423D]' : setorInfo.color} text-white`}>
 <div className="flex items-center gap-2">
 <div className="p-1.5 bg-white/20 rounded-lg">
 {modalSetor === 'mapa' ? <CheckCircle size={15} /> : (setorInfo.icon ? <setorInfo.icon size={15} /> : <Settings2 size={15} />)}
 </div>
 <div>
 <h3 className="text-xs font-black uppercase tracking-tight">
 {modalSetor === 'mapa' ? 'Finalização Geral (MAPA)' : `Apontar ${setorInfo.label}`}
 </h3>
 <div className="flex items-center gap-1.5">
 <p className="text-[10px] opacity-90 font-bold bg-black/10 px-1 rounded">OS {selectedItem.IdOrdemServico}</p>
 <p className="text-[10px] opacity-90 font-bold bg-black/10 px-1 rounded">Item #{selectedItem.IdOrdemServicoItem}</p>
 </div>
 </div>
 </div>
 <button
 onClick={() => setModalOpen(false)}
 className="p-1 rounded-full hover:bg-white/20 transition-colors"
 >
 <X size={15} />
 </button>
 </div>

 {/* Modal Content */}
 <div className="p-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
 {loadingDetails ? (
 <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
 <Loader2 size={24} className="animate-spin" />
 <p className="text-xs">Carregando detalhes...</p>
 </div>
 ) : itemDetails ? (
 <div className="space-y-2">
 {/* Item Info */}
 <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
 <h3 className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1.5">
 <FileText size={10} /> Informações do Item
 </h3>
 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
 <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
 <span className="text-gray-400 font-medium">Código:</span>
 <span className="font-black text-[#32423D]">{itemDetails.item.CodMatFabricante}</span>
 </div>
 <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
 <span className="text-gray-400 font-medium">Plano Corte:</span>
 <span className="font-black text-purple-700">{(itemDetails.item as Record<string, unknown>).PlanoCorte || '-'}</span>
 </div>
 <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
 <span className="text-gray-400 font-medium">Projeto:</span>
 <span className="font-bold flex-1 text-right truncate ml-2 text-[#32423D]">{itemDetails.item.Projeto}</span>
 </div>
 <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
 <span className="text-gray-400 font-medium">Tag:</span>
 <span className="font-bold flex-1 text-right truncate ml-2 text-purple-700">{itemDetails.item.Tag}</span>
 </div>
 <div className="col-span-2 pt-1">
 <span className="text-gray-400 font-medium">Descrição:</span>
 <span className="ml-2 text-gray-700 font-medium">{itemDetails.item.DescResumo}</span>
 </div>
 </div>

 {/* Action Buttons (Desenhos) */}
 {(itemDetails.item.EnderecoArquivoItemOrdemServico || itemDetails.item.EnderecoArquivo) && (
 <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
 <span className="text-xs font-semibold text-gray-500 block">Arquivos:</span>
 <div className="flex gap-1.5">
 {itemDetails.item.EnderecoArquivo && (
 <>
 <button
 onClick={(e) => {
 e.stopPropagation();
 const pdfUrl = `${API_BASE}/pdf?path=${encodeURIComponent(itemDetails.item.EnderecoArquivo || '')}`;
 window.open(pdfUrl, '_blank');
 }}
 className="flex items-center gap-2 px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs font-bold border border-red-100"
 title="Abrir Desenho PDF"
 >
 <FileText size={14} />
 PDF
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 const dxfUrl = `${API_BASE}/download?path=${encodeURIComponent(itemDetails.item.EnderecoArquivo || '')}&type=dxf`;
 window.open(dxfUrl, '_blank');
 }}
 className="flex items-center gap-2 px-2 py-0.5 bg-[#E0E800]/30 text-[#32423D] rounded hover:bg-[#E0E800]/20 transition-colors text-xs font-bold border border-blue-100"
 title="Abrir Desenho DXF"
 >
 <PenTool size={14} />
 DXF
 </button>

 <button
 onClick={(e) => {
 e.stopPropagation();
 const path3d = `${API_BASE}/download?path=${encodeURIComponent(itemDetails.item.EnderecoArquivo || '')}&type=sldprt`;
 window.open(path3d, '_blank');
 }}
 className="flex items-center gap-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-bold border border-gray-200"
 title="Abrir Desenho 3D"
 >
 <Box size={14} />
 3D
 </button>
 </>
 )}
 </div>
 </div>
 )}
 </div>

 {modalSetor !== 'mapa' && (
 <div className="bg-[#E0E800]/20 border border-blue-100 rounded-lg py-1 px-2 flex items-center justify-between shadow-sm">
 <div className="flex items-center gap-2">
 <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#32423D] shadow-sm">
 <Settings2 size={14} />
 </span>
 <span className="text-xs font-black text-blue-800 uppercase tracking-tighter">Próximo Setor:</span>
 </div>
 <span className="text-xs font-black text-blue-900 bg-white px-2 py-1 rounded shadow-sm border border-blue-100 uppercase tracking-wider">
  {(() => {
 const sequence = [
  { id: 'engenharia', field: 'txtENGENHARIA', label: 'Engenharia' },
  { id: 'isometrico', field: 'txtISOMETRICO', label: 'Isométrico' },
  { id: 'medicao', field: 'txtMEDICAO', label: 'Medição' },
  { id: 'corte', field: 'txtCorte', label: 'Corte' },
  { id: 'cortealaser', field: 'txtCorteaLaser', label: 'Corte a Laser' },
  { id: 'pulsionadeira', field: 'txtPULSIONADEIRA', label: 'Pulsionadeira' },
  { id: 'puncionadeira', field: 'txtPUNCIONADEIRA', label: 'Puncionadeira' },
  { id: 'usinagem', field: 'txtUsinagem', label: 'Usinagem' },
  { id: 'dobra', field: 'txtDobra', label: 'Dobra' },
  { id: 'caldeiraria', field: 'txtCALDEIRARIA', label: 'Caldeiraria' },
  { id: 'serralheria', field: 'txtSERRALHERIA', label: 'Serralheria' },
  { id: 'solda', field: 'txtSolda', label: 'Solda' },
  { id: 'galvanizar', field: 'txtGALVANIZAR', label: 'Galvanizar' },
  { id: 'pintura', field: 'txtPintura', label: 'Pintura' },
  { id: 'acabamento', field: 'txtACABAMENTO', label: 'Acabamento' },
  { id: 'montagem', field: 'TxtMontagem', label: 'Montagem' },
  { id: 'aprovacao', field: 'txtAPROVACAO', label: 'Aprovação' }
 ];
 const currentIndex = sequence.findIndex(s => s.id === String(modalSetor).toLowerCase());
 if (currentIndex === -1) return '-';
 for (let i = currentIndex + 1; i < sequence.length; i++) {
   const target = sequence[i];
   const itemAny = itemDetails.item as any;
   const val1 = String(itemAny[target.field] || '').trim().toUpperCase();
   const val2 = String(itemAny[target.field.toLowerCase()] || '').trim().toUpperCase();
   const isSt = String(itemAny[`st${target.field}`] || '').trim();
   if (val1 === '1' || val2 === '1' || val1 === 'S' || val2 === 'S' || isSt === '1') {
     return target.label;
   }
 }
 return 'Finalizado';
 })()}
 </span>
 </div>
 )}

 {/* Progress */}
 <div className="bg-[#E0E800]/5 rounded-lg p-2 border border-[#E0E800]/20">
 <div className="flex justify-between mb-1">
 <span className="text-[10px] font-black text-gray-500 uppercase">Progresso do Item</span>
 <span className="text-[11px] font-black text-[#32423D]">
 {itemDetails.totalProduzido} / {itemDetails.item.QtdeTotal}
 </span>
 </div>
 <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
 <div
 className={`h-full rounded-full transition-all shadow-sm ${getProgressColor((itemDetails.totalProduzido / (itemDetails.item.QtdeTotal || 1)) * 100)}`}
 style={{ width: `${Math.min((itemDetails.totalProduzido / (itemDetails.item.QtdeTotal || 1)) * 100, 100)}%` }}
 />
 </div>
 <div className="mt-1.5 text-[10px] font-bold text-gray-400 flex items-center justify-between">
 <span>Faltam <span className="text-red-500">{itemDetails.qtdeFaltante}</span> unidades</span>
 <span className="text-[#32423D] bg-[#E0E800]/20 px-1 rounded">{Math.round((itemDetails.totalProduzido / (itemDetails.item.QtdeTotal || 1)) * 100)}% concluído</span>
 </div>
 </div>

 {/* Mapa Awareness & Confirmation */}
 {modalSetor === 'mapa' && (
 <div className="rounded-lg p-5 border bg-[#E0E800]/20 border-blue-200 shadow-sm">
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-full bg-[#32423D] text-white flex items-center justify-center shadow-md">
 <CheckCircle size={24} />
 </div>
 <div>
 <h3 className="text-xs font-bold text-blue-900 uppercase">
 Finalização Total (MAPA)
 </h3>
 <p className="text-xs text-[#32423D]">
 Confirme para concluir todos os setores deste item.
 </p>
 </div>
 </div>

 <div className="bg-white/60 rounded-md p-3 mb-4">
 <p className="text-xs text-blue-800 font-medium mb-2">
 Ações automáticas:
 </p>
 <ul className="text-[11px] text-[#32423D] space-y-1 ml-4 list-disc">
 <li>Aplica <strong>{itemDetails.item.QtdeTotal}</strong> em todos os setores</li>
 <li>Zera o "Saldo a Executar" geral</li>
 <li>Marca o Item como <strong>CONCLUÍDO (C)</strong></li>
 </ul>
 </div>

 <div className="flex flex-wrap gap-1.5 opacity-60">
 {['CORTE', 'DOBRA', 'SOLDA', 'PINTURA', 'MONTAGEM'].map(s => (
 <span key={s} className="px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[9px] font-bold text-[#32423D]">
 {s}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Quantidade Input - Hidden in Mapa Mode */}
 {modalSetor !== 'mapa' && (
 <div className="pt-1">
 <div className="flex gap-2 items-center">
 <div className="flex-1">
 <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">
 Quantidade a Produzir (Faltam {itemDetails.qtdeFaltante})
 </label>
 <input
 type="number"
 min="1"
 max={itemDetails.qtdeFaltante}
 value={qtdeApontar}
 onChange={(e) => {
  let val = e.target.value;
  if (val !== '') {
    const num = parseInt(val) || 0;
    const max = itemDetails?.qtdeFaltante || 0;
    if (num > max) val = String(max);
    else if (num < 0) val = '0';
  }
  setQtdeApontar(val);
}}
 className="w-full px-2 py-1 text-base font-black text-center rounded-lg border border-gray-200 hover:border-[#32423D]/40 focus:border-[#32423D] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all bg-white text-gray-800 h-8"
 placeholder="0"
 />
 </div>
 {itemDetails.qtdeFaltante > 0 && (
 <div className="flex gap-1 w-32 items-end pt-3">
 <button
 onClick={() => setQtdeApontar(String(itemDetails.qtdeFaltante))}
 className="flex-1 py-1 h-8 text-[9px] font-bold bg-[#E0E800]/30 text-[#32423D] rounded border border-blue-100 hover:bg-[#E0E800]/20 transition-colors whitespace-nowrap px-1"
 >
 Total ({itemDetails.qtdeFaltante})
 </button>
 <button
 onClick={() => setQtdeApontar('1')}
 className="flex-1 py-1 h-8 text-[9px] font-bold bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 transition-colors whitespace-nowrap px-1"
 >
 Unid (1)
 </button>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Histórico */}
 {itemDetails.historico.length > 0 && (
 <div>
 <div className="flex items-center gap-2 text-xs font-semibold text-[#32423D] mb-1">
 <History size={14} />
 Histórico de Apontamentos
 </div>
 <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
 {itemDetails.historico.map((h) => (
 <div key={h.IdOrdemServicoItemControle} className="flex justify-between items-center text-xs bg-gray-50 px-2 py-1.5 rounded">
 <span className="font-medium">+{h.QtdeProduzida} un</span>
 <span className="text-gray-400">{h.CriadoPor} " {formatDate(h.DataCriacao)}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 ) : null}
 </div>

 {/* Modal Footer */}
 <div className="px-2 py-0.5 bg-gray-50 flex gap-3">
 <button
 onClick={() => setModalOpen(false)}
 className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
 >
 Cancelar
 </button>
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={handleSubmit}
 disabled={submitting || (modalSetor !== 'mapa' && (!qtdeApontar || parseInt(qtdeApontar) <= 0))}
 className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 ${submitting || (modalSetor !== 'mapa' && (!qtdeApontar || parseInt(qtdeApontar) <= 0))
 ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
 : modalSetor === 'mapa' ? 'bg-[#32423D] text-white shadow-lg' : `${setorInfo.color} text-white`
 }`}
 >
 {submitting ? (
 <>
 <Loader2 size={14} className="animate-spin" />
 Processando...
 </>
 ) : modalSetor === 'mapa' ? (
 <>
 <CheckCircle size={14} />
 Sim, Finalizar Tudo
 </>
 ) : (
 <>
 <CheckCircle size={14} />
 Confirmar Apontamento
 </>
 )}
 </motion.button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* History Modal */}
 <AnimatePresence>
 {historyModalOpen && selectedItem && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
 onClick={() => setHistoryModalOpen(false)}
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-4xl overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 {/* Modal Header */}
 <div className="px-2 py-1 border-b border-gray-100 flex items-center justify-between bg-white">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-[#E0E800]/30 text-[#32423D] rounded-lg">
 <History size={20} />
 </div>
 <div>
 <h3 className="text-lg font-bold text-[#32423D]">Histórico de Movimentação</h3>
 <p className="text-xs text-gray-500">Item #{selectedItem.IdOrdemServicoItem} - OS {selectedItem.IdOrdemServico}</p>
 </div>
 </div>
 <button
 onClick={() => setHistoryModalOpen(false)}
 className="p-2 hover:bg-gray-100 rounded-full transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6">
 {loadingDetails ? (
 <div className="flex flex-col items-center justify-center py-12 gap-4">
 <Loader2 size={40} className="animate-spin text-[#32423D]" />
 <p className="text-gray-500 animate-pulse">Carregando histórico...</p>
 </div>
 ) : itemDetails && itemDetails.historico.length > 0 ? (
 <div className="overflow-hidden border border-gray-100 rounded-md">
 <table className="w-full text-left border-collapse">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white">
 <tr className=" text-[10px] uppercase tracking-wider font-bold text-white">
 <th className="px-2 py-0.5 border-b border-white/20">Data</th>
 <th className="px-2 py-0.5 border-b border-white/20">Setor</th>
 <th className="px-2 py-0.5 border-b border-white/20">Qtde Apontada</th>
 <th className="px-2 py-0.5 border-b border-white/20">Qtde a Apontar</th>
 <th className="px-2 py-0.5 border-b border-white/20">Usuário</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {itemDetails.historico.map((h) => {
 let sectorDisplay = '-';
 if (h.txtCorte && Number(h.txtCorte) > 0) sectorDisplay = 'Corte';
 else if (h.txtDobra && Number(h.txtDobra) > 0) sectorDisplay = 'Dobra';
 else if (h.txtSolda && Number(h.txtSolda) > 0) sectorDisplay = 'Solda';
 else if (h.txtPintura && Number(h.txtPintura) > 0) sectorDisplay = 'Pintura';
 else if (h.txtMontagem && Number(h.txtMontagem) > 0) sectorDisplay = 'Montagem';
 else if (h.Processo) sectorDisplay = h.Processo;

 return (
 <tr key={h.IdOrdemServicoItemControle} className="hover:bg-gray-50 transition-colors">
 <td className="px-2 py-0.5 text-xs text-gray-600">{formatDate(h.DataCriacao)}</td>
 <td className="px-2 py-0.5 text-xs">
 <span className="px-2 py-0.5 rounded-full bg-[#E0E800]/40 text-[#32423D] font-bold uppercase text-[9px]">
 {sectorDisplay}
 </span>
 </td>
 <td className="px-2 py-0.5 text-xs font-bold text-[#32423D]">
 +{h.QtdeProduzida}
 </td>
 <td className="px-2 py-0.5 text-xs font-bold text-[#32423D]">
 {h.QtdeFaltante}
 </td>
 <td className="px-2 py-0.5 text-xs text-gray-500">
 {h.CriadoPor}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
 <AlertCircle size={32} className="text-gray-300" />
 </div>
 <p className="text-gray-500 font-medium">Nenhum apontamento registrado.</p>
 <p className="text-xs text-gray-400">Os registros de movimentação aparecerão aqui.</p>
 </div>
 )}
 </div>

 {/* Modal Footer */}
 <div className="px-2 py-1 bg-gray-50 flex justify-end">
 <button
 onClick={() => setHistoryModalOpen(false)}
 className="px-6 py-2 rounded-lg bg-[#32423D] text-white font-medium hover:bg-[#32423D]/90 transition-colors"
 >
 Fechar
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Modal de Gerar Reposição */}
 <AnimatePresence>
 {reposicaoModalOpen && selectedItem && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
 onClick={() => setReposicaoModalOpen(false)}
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="bg-amber-500 px-2 py-1 text-white">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <RefreshCw size={24} />
 <div>
 <h2 className="font-bold">Gerar Reposição</h2>
 <p className="text-xs text-white/80">
 OS {selectedItem.IdOrdemServico} " Item #{selectedItem.IdOrdemServicoItem}
 </p>
 </div>
 </div>
 <button onClick={() => setReposicaoModalOpen(false)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
            <X size={14} /> Fechar
        </button>
 </div>
 </div>

 {/* Body */}
 <div className="p-6 space-y-4">
 <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-xs text-amber-800">
 Esta ação irá criar um novo item de reposição idêntico a este, incluindo todos os sub-itens caso seja uma montagem, com a quantidade desejada.
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Quantidade de Reposição
 </label>
 <input
 type="number"
 min="1"
 value={qtdeReposicao}
 onChange={(e) => setQtdeReposicao(e.target.value)}
 className="w-full px-2 py-0.5 text-lg font-bold text-center rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
 placeholder="Digite a quantidade..."
 autoFocus
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Motivo (Opcional)
 </label>
 <textarea
 value={motivoReposicao}
 onChange={(e) => setMotivoReposicao(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
 placeholder="Ex: Peça danificada..."
 rows={2}
 />
 </div>
 </div>

 {/* Footer */}
 <div className="px-2 py-1 bg-gray-50 flex gap-3">
 <button
 onClick={() => setReposicaoModalOpen(false)}
 className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium"
 >
 Cancelar
 </button>
 <button
 onClick={handleGerarReposicao}
 disabled={submittingReposicao || !qtdeReposicao || parseInt(qtdeReposicao) <= 0}
 className={`flex-1 py-2 rounded-lg font-bold text-white transition-colors flex items-center justify-center gap-2 ${submittingReposicao || !qtdeReposicao || parseInt(qtdeReposicao) <= 0
 ? 'bg-amber-300 cursor-not-allowed'
 : 'bg-amber-500 hover:bg-amber-600 shadow-md'
 }`}
 >
 {submittingReposicao ? (
 <><Loader2 size={14} className="animate-spin" /> Gerando...</>
 ) : (
 <><RefreshCw size={14} /> Confirmar</>
 )}
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

  {/* Modal de Apontamento Parcial (Excecao) */}
  <AnimatePresence>
  {parcialModalOpen && parcialItem && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
  onClick={() => setParcialModalOpen(false)}>
  <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
  className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
  <div className="bg-blue-600 px-4 py-3 text-white flex items-center justify-between">
  <div className="flex items-center gap-2"><Zap size={20} />
  <div><h2 className="font-bold text-sm">Apontamento Parcial</h2>
  <p className="text-[10px] text-white/80">OS {parcialItem.IdOrdemServico} — Item #{parcialItem.IdOrdemServicoItem}</p></div></div>
  <button onClick={() => setParcialModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors"><X size={14} /></button>
  </div>
  <div className="p-5 space-y-4">
  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
  <p className="font-black text-[#32423D]">{parcialItem.CodMatFabricante || '-'}</p>
  <p className="text-gray-600 mt-0.5 truncate">{parcialItem.DescResumo || '-'}</p>
  <div className="mt-2 flex items-center gap-2">
  <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{parcialRecurso}</span>
  <span className="text-gray-500 text-[10px]">Qt. Total: <strong>{parcialItem.QtdeTotal}</strong></span>
  </div></div>
  <div><label className="block text-xs font-bold text-gray-700 mb-1.5">Quantidade a Apontar</label>
  <input type="number" min="1" max={parcialItem.QtdeTotal} value={qtdeParcial}
  onChange={(e) => { let v = e.target.value; if (v !== '' && Number(v) > Number(parcialItem.QtdeTotal)) v = String(parcialItem.QtdeTotal); setQtdeParcial(v); }}
  className="w-full px-3 py-2 text-2xl font-black text-center rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
  placeholder="0" autoFocus />
  <div className="flex gap-2 mt-2">
  <button onClick={() => setQtdeParcial(String(parcialItem.QtdeTotal))} className="flex-1 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">Total ({parcialItem.QtdeTotal})</button>
  <button onClick={() => setQtdeParcial('1')} className="flex-1 py-1.5 text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Unid (1)</button>
  </div></div></div>
  <div className="px-5 py-3 bg-gray-50 flex gap-2 border-t">
  <button onClick={() => setParcialModalOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium text-sm">Cancelar</button>
  <button disabled={submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0}
  onClick={async () => {
  if (!qtdeParcial || parseInt(qtdeParcial) <= 0) return;
  setSubmittingParcial(true);
  try {
  const resp = await fetch(`${API_BASE}/apontamento-parcial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IdOrdemServicoItem: parcialItem.IdOrdemServicoItem, IdOrdemServico: parcialItem.IdOrdemServico, Processo: parcialRecurso, QtdeProduzida: parseInt(qtdeParcial), CriadoPor: (user as any)?.NomeCompleto || (user as any)?.name || 'Sistema' }) });
  const json = await resp.json();
  if (json.success) { setParcialModalOpen(false); setTimeout(() => { fetchItens(); }, 300); addToast({ type: 'success', title: 'Sucesso', message: 'Apontamento parcial registrado!' }); }
  else { addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao registrar' }); }
  } catch { addToast({ type: 'error', title: 'Erro', message: 'Erro de conexao' }); } finally { setSubmittingParcial(false); }
  }}
  className={`flex-1 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-2 text-sm transition-colors ${submittingParcial || !qtdeParcial || parseInt(qtdeParcial) <= 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
  {submittingParcial ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : <><Zap size={14} /> Confirmar Parcial</>}
  </button></div>
  </motion.div></motion.div>)}
  </AnimatePresence>

  {/* Modal de Gerar Pendência */}
 <AnimatePresence>
 {pendenciaModalOpen && selectedItem && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
 onClick={() => setPendenciaModalOpen(false)}
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0, y: 10 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 10 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-[95vw] xl:max-w-[1400px] flex flex-col max-h-[90vh]"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="bg-red-500 px-2 py-1 text-white flex-shrink-0">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <AlertTriangle size={24} />
 <div>
 <h2 className="font-bold text-lg">Gerar Pendência (RNC)</h2>
 </div>
 </div>
 <button onClick={() => setPendenciaModalOpen(false)} className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg text-slate-600 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs shrink-0">
            <X size={14} /> Fechar
        </button>
 </div>
 </div>

 {/* Body - Scrollable */}
 <div className="p-6 overflow-y-auto space-y-6 w-full max-w-[1920px] mx-auto pb-20">
 {/* Informações do Item (Read-only) grid */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
 <div>
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">ID RNC</label>
 <div className="text-xs font-bold text-red-600 bg-white px-2 py-1 border border-red-200 rounded">{idRncEdicao ? `#${idRncEdicao}` : 'NOVA'}</div>
 </div>
 <div>
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.</label>
 <div className="text-xs font-medium text-gray-700 bg-white px-2 py-1 border border-gray-200 rounded">{selectedItem.IdOrdemServico}</div>
 </div>
 <div>
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.I.</label>
 <div className="text-xs font-medium text-gray-700 bg-white px-2 py-1 border border-gray-200 rounded">{selectedItem.IdOrdemServicoItem}</div>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cód. Mat. Fabric.</label>
 <div className="text-xs font-medium text-gray-700 bg-white px-2 py-1 border border-gray-200 rounded truncate">{selectedItem.CodMatFabricante || '-'}</div>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Projeto</label>
 <div className="text-xs font-medium text-gray-700 bg-white px-2 py-1 border border-gray-200 rounded truncate">{selectedItem.Projeto || '-'}</div>
 </div>
 <div className="col-span-3">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tag</label>
 <div className="text-xs font-medium text-gray-700 bg-white px-2 py-1 border border-gray-200 rounded truncate">{selectedItem.Tag || '-'}</div>
 </div>
 </div>

 {/* Inputs Editáveis */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
 <input
 type="text"
 value={tituloRnc}
 onChange={(e) => setTituloRnc(e.target.value)}
 readOnly={idRncEdicao !== null}
 className={`w-full px-2 py-1 text-xs rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Sub Título</label>
 <input
 type="text"
 value={subTituloRnc}
 onChange={(e) => setSubTituloRnc(e.target.value)}
 readOnly={idRncEdicao !== null}
 className={`w-full px-2 py-1 text-xs rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
 placeholder="Sub-título da RNC"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador</label>
 <select
 value={usuarioResponsavel}
 onChange={(e) => setUsuarioResponsavel(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500"
 >
 <option value="">Selecione...</option>
 {usuariosConfig.map((u) => (
 <option key={u.IdUsuario} value={u.NomeCompleto}>{u.NomeCompleto}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Setor</label>
 <select
 value={setorResponsavel}
 onChange={(e) => setSetorResponsavel(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500"
 >
 <option value="">Selecione...</option>
 {setoresConfig.filter(s => {
 const lower = s.toLowerCase();
 const productionSectors = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
 if (productionSectors.includes(lower)) {
 return processosVisiveis.includes(lower);
 }
 return true;
 }).map((s, i) => (
 <option key={i} value={s}>{s}</option>
 ))}
 </select>
 </div>


 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Espessura</label>
 <select
 value={espessuraRnc}
 onChange={(e) => setEspessuraRnc(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white"
 >
 <option value="">Selecione...</option>
 {espessurasConfig.map(esp => (
 <option key={esp.idEspessura} value={esp.Espessura}>{esp.Espessura}</option>
 ))}
 {/* Fallback if item has an espessura not in table */}
 {espessuraRnc && !espessurasConfig.some(e => e.Espessura === espessuraRnc) && (
 <option value={espessuraRnc}>{espessuraRnc}</option>
 )}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Material SW</label>
 <select
 value={materialSWRnc}
 onChange={(e) => setMaterialSWRnc(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white truncate"
 >
 <option value="">Selecione...</option>
 {materiaisSWConfig.map(mat => (
 <option key={mat.idMaterialSw} value={mat.MaterialSw}>{mat.MaterialSw}</option>
 ))}
 {/* Fallback if item has a material not in table */}
 {materialSWRnc && !materiaisSWConfig.some(m => m.MaterialSw === materialSWRnc) && (
 <option value={materialSWRnc}>{materialSWRnc}</option>
 )}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Data Execução</label>
 <input
 type="date"
 value={dataExecucaoRnc}
 onChange={(e) => setDataExecucaoRnc(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo RNC</label>
 <select
 value={tipoRnc}
 onChange={(e) => setTipoRnc(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:border-red-500"
 >
 <option value="RNC">RNC</option>
 <option value="TAREFA">TAREFA</option>
 <option value="RETRABALHO">RETRABALHO</option>
 <option value="OUTROS">OUTROS</option>
 </select>
 </div>
 </div>
 </div>

 {/* Descrição Completa */}
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Descrição da Pendência *
 </label>
 <textarea
 value={descricaoPendencia}
 onChange={(e) => setDescricaoPendencia(e.target.value)}
 className="w-full px-2 py-1 text-xs rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
 placeholder="Descreva os detalhes da RNC/Pendência..."
 rows={4}
 />
 </div>

 {/* Processos */}
 <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-6 justify-center">
 {processosVisiveis.includes('corte') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkCorteRnc} onChange={(e) => setChkCorteRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkCorteRnc ? 'text-[#32423D] font-bold bg-blue-100' : 'text-gray-700 font-semibold'}`}><Scissors size={14} className={chkCorteRnc ? "text-[#32423D]" : "text-[#32423D]"} /> Corte</span>
 </label>
 )}
 {processosVisiveis.includes('dobra') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkDobraRnc} onChange={(e) => setChkDobraRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkDobraRnc ? 'text-purple-700 font-bold bg-purple-100' : 'text-gray-700 font-semibold'}`}><Wrench size={14} className={chkDobraRnc ? "text-purple-700" : "text-purple-500"} /> Dobra</span>
 </label>
 )}
 {processosVisiveis.includes('solda') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkSoldaRnc} onChange={(e) => setChkSoldaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkSoldaRnc ? 'text-orange-700 font-bold bg-orange-100' : 'text-gray-700 font-semibold'}`}><Flame size={14} className={chkSoldaRnc ? "text-orange-700" : "text-orange-500"} /> Solda</span>
 </label>
 )}
 {processosVisiveis.includes('pintura') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkPinturaRnc} onChange={(e) => setChkPinturaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkPinturaRnc ? 'text-green-700 font-bold bg-green-100' : 'text-gray-700 font-semibold'}`}><Paintbrush size={14} className={chkPinturaRnc ? "text-green-700" : "text-green-500"} /> Acabamento</span>
 </label>
 )}
 {processosVisiveis.includes('montagem') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkMontagemRnc} onChange={(e) => setChkMontagemRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkMontagemRnc ? 'text-red-700 font-bold bg-red-100' : 'text-gray-700 font-semibold'}`}><Settings2 size={14} className={chkMontagemRnc ? "text-red-700" : "text-red-500"} /> Montagem</span>
 </label>
 )}
 </div>

 {/* Seção de Finalização (Só exibida em edição) */}
 {idRncEdicao && (
 <div className="mt-4 border border-green-200 rounded-lg overflow-hidden bg-green-50/30">
 <div
 className="bg-green-100/80 px-2 py-0.5 border-b border-green-200 flex justify-between items-center cursor-pointer transition-colors hover:bg-green-200"
 onClick={() => setFinalizandoRnc(!finalizandoRnc)}
 >
 <h3 className="text-xs font-bold text-green-800 flex items-center gap-2 uppercase tracking-wide">
 <CheckCircle size={14} className={finalizandoRnc ? 'text-green-600' : 'text-green-500 opacity-50'} />
 Finalizar RNC
 </h3>
 <div className="flex items-center gap-2">
 <span className="text-xs text-green-700 font-semibold">{finalizandoRnc ? 'Habilitado' : 'Desabilitado'}</span>
 <input type="checkbox" checked={finalizandoRnc} readOnly className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer" />
 </div>
 </div>

 <AnimatePresence>
 {finalizandoRnc && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
 <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-green-100 bg-white/60">
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Setor Finalização *</label>
 <select value={setorFinalizacao} onChange={e => setSetorFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
 <option value="">Selecione...</option>
 {setoresConfig.filter(s => {
 const lower = s.toLowerCase();
 const productionSectors = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
 if (productionSectors.includes(lower)) {
 return processosVisiveis.includes(lower);
 }
 return true;
 }).map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Colaborador Finalização *</label>
 <select value={colaboradorFinalizacao} onChange={e => setColaboradorFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
 <option value="">Selecione...</option>
 {usuariosConfig.map(u => <option key={u.NomeCompleto} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Data Finalização *</label>
 <input type="date" value={dataFinalizacao} onChange={e => setDataFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-500 outline-none w-full" />
 </div>
 <div className="flex flex-col gap-1 md:col-span-3">
 <label className="text-xs font-bold text-green-800">Parecer Finalização *</label>
 <textarea value={descricaoFinalizacao} onChange={e => setDescricaoFinalizacao(e.target.value)} rows={2} className="p-2 border border-green-200 rounded text-xs bg-white focus:ring-1 focus:ring-green-500 outline-none w-full resize-none placeholder-green-300" placeholder="Insira o parecer de fechamento da RNC..." />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* Tabela Historico de Pendencias */}
 {(() => {
 const pendenciasExibidas = exibirFinalizadas ? pendenciasHistorico : pendenciasHistorico.filter(p => p.ST !== 'FINALIZADO');
 return (
 <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
 <div className="bg-gray-100 px-2 py-1 border-b border-gray-200 flex justify-between items-center">
 <div className="flex items-center gap-3">
 <h3 className="text-xs font-bold text-gray-700 uppercase">Histórico de Pendências deste Item</h3>
 <label className="flex items-center gap-1 cursor-pointer">
 <input type="checkbox" checked={exibirFinalizadas} onChange={(e) => setExibirFinalizadas(e.target.checked)} className="rounded text-[#32423D] focus:ring-[#32423D]/40 w-3 h-3" />
 <span className="text-[10px] text-gray-600 font-medium select-none">Exibir Finalizadas</span>
 </label>
 </div>
 <span className="text-xs text-gray-500">{pendenciasExibidas.length} registro(s)</span>
 </div>
 <div className="px-2 py-0.5 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-end">
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 1</label>
 <input
 type="search"
 value={searchQuery1}
 onChange={(e) => setSearchQuery1(e.target.value)}
 placeholder="Buscar na descrição..."
 className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-[#32423D] focus:outline-none"
 />
 </div>
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 2</label>
 <input
 type="search"
 value={searchQuery2}
 onChange={(e) => setSearchQuery2(e.target.value)}
 placeholder="Buscar na descrição..."
 className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-[#32423D] focus:outline-none"
 />
 </div>
 <div className="pb-0.5 whitespace-nowrap">
 <button
 type="button"
 onClick={() => { setSearchQuery1(''); setSearchQuery2(''); }}
 className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded border border-gray-300 flex items-center justify-center gap-1 transition-colors"
 >
 <X size={14} />
 Limpar Filtros
 </button>
 </div>
 </div>
 <div className="max-h-60 overflow-y-auto">
 {loadingPendencias ? (
 <div className="p-4 flex justify-center text-gray-500"><Loader2 size={20} className="animate-spin" /></div>
 ) : pendenciasHistorico.length === 0 ? (
 <div className="p-4 text-center text-xs text-gray-500">Nenhuma pendência anterior encontrada para este item.</div>
 ) : (
 <table className="w-full text-left text-xs text-gray-600">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] sticky top-0 border-b border-white/20 shadow-sm text-white font-semibold">
 <tr>
 <th className="px-2 py-2 whitespace-nowrap">ST</th>
 <th className="px-2 py-2 whitespace-nowrap">IDRNC</th>
 <th className="px-2 py-2 whitespace-nowrap">Cód.Mat.Fabric</th>
 <th className="px-2 py-2 whitespace-nowrap">OS</th>
 <th className="px-2 py-2 whitespace-nowrap">OS Item</th>
 <th className="px-2 py-2 whitespace-nowrap">Projeto</th>
 <th className="px-2 py-2 whitespace-nowrap">Tag</th>
 <th className="px-2 py-2 whitespace-nowrap">Título</th>
 <th className="px-2 py-2 whitespace-nowrap min-w-[150px]">Sub Título</th>
 <th className="px-2 py-2 whitespace-nowrap">Espessura</th>
 <th className="px-2 py-2 whitespace-nowrap">Material SW</th>
 <th className="px-2 py-2 min-w-[200px]">Descrição Pendência</th>
 <th className="px-2 py-2 whitespace-nowrap">Setor</th>
 <th className="px-2 py-2 whitespace-nowrap">Colaborador</th>
 <th className="px-2 py-2 whitespace-nowrap">Dt. Criação</th>
 <th className="px-2 py-2 whitespace-nowrap">Dt. Execução</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 relative">
 {pendenciasExibidas.map(p => (
 <tr key={p.IDRNC} onClick={() => loadPendenciaForEdit(p)} className="hover:bg-amber-50/50 cursor-pointer transition-colors">
 <td className="px-2 py-1 flex items-center justify-center" title={p.ST === 'PENDENCIA' ? 'Pendente' : 'Finalizada'}>
 {p.ST === 'PENDENCIA' ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle size={14} className="text-green-500" />}
 </td>
 <td className="px-2 py-1 text-center font-medium bg-gray-50">{p.IDRNC}</td>
 <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>
 <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServico || selectedItem?.IdOrdemServico || '-'}</td>
 <td className="px-2 py-1 font-medium bg-gray-50 text-center">{p.IdOrdemServicoItem || selectedItem?.IdOrdemServicoItem || '-'}</td>
 <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>
 <td className="px-2 py-1 truncate max-w-[100px]" title={p.Tag}>{p.Tag}</td>
 <td className="px-2 py-1 truncate max-w-[120px]" title={p.DescResumo}>{p.DescResumo}</td>
 <td className="px-2 py-1 truncate max-w-[150px]" title={p.DescDetal}>{p.DescDetal}</td>
 <td className="px-2 py-1 flex justify-center bg-gray-50">{p.Espessura}</td>
 <td className="px-2 py-1 truncate max-w-[120px]" title={p.MaterialSW}>{p.MaterialSW}</td>
 <td className="px-2 py-1 text-gray-800 text-[11px] leading-tight break-words max-h-16 overflow-y-auto block">{p.DescricaoPendencia}</td>
 <td className="px-2 py-1 font-medium bg-gray-50">{p.SetorResponsavel || '-'}</td>
 <td className="px-2 py-1 font-medium">{p.Colaborador}</td>
 <td className="px-2 py-1 break-words">{p.DataCriacao}</td>
 <td className="px-2 py-1 bg-gray-50 break-words">{p.DataExecucao}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 );
 })()}
 </div>

 {/* Footer */}
 <div className="px-2 py-1 bg-gray-50 flex gap-3 flex-shrink-0 justify-end border-t border-gray-200">
 <button
 onClick={handleNovaPendencia}
 className="px-6 py-2 rounded text-red-600 bg-white border border-red-200 hover:bg-red-50 font-medium transition-colors"
 >
 Novo
 </button>
 <button
 onClick={() => setPendenciaModalOpen(false)}
 className="px-6 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
 >
 Fechar
 </button>
 <button
 onClick={handleSubmitPendencia}
 disabled={submittingPendencia}
 className={`px-6 py-2 rounded font-bold text-white transition-colors flex items-center justify-center gap-2 ${submittingPendencia
 ? 'bg-red-400 cursor-not-allowed opacity-70'
 : 'bg-red-600 hover:bg-red-700 shadow-sm'
 }`}
 >
 {submittingPendencia ? (
 <><Loader2 size={14} className="animate-spin" /> Salvando...</>
 ) : (
 <><AlertTriangle size={14} /> Salvar</>
 )}
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}




