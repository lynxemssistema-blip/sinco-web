import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronRight, ChevronDown, ClipboardList, Eye,
    Loader2, RefreshCw, Box, CheckCircle, Clock, XCircle, User, Calendar, Settings2, FileText, FolderOpen,
    Filter, Layers, X
} from 'lucide-react';
import { ProgressBar } from '../components/ordem-servico/ProgressBar';
import { SetorDatas } from '../components/ordem-servico/SetorDatas';

const API_BASE = '/api';

interface OrdemServico {
    IdOrdemServico: number;
    Projeto?: string;
    Tag?: string;
    DescTag?: string;
    Descricao?: string;
    Estatus?: string;
    DataPrevisao?: string;
    DataCriacao?: string;
    CriadoPor?: string;
    Liberado_Engenharia?: string;
    Data_Liberacao_Engenharia?: string;
    QtdeTotalItens?: string;
    QtdeItensExecutados?: string;
    PercentualItens?: string;
    QtdeTotalPecas?: string;
    QtdePecasExecutadas?: string;
    PercentualPecas?: string;
    PesoTotal?: string;
    AreaPinturaTotal?: string;
    OrdemServicoFinalizado?: string;
    DataFinalizado?: string;
    IdProjeto?: number;
    IdTag?: number;
    DescEmpresa?: string;
    PlanejadoInicioCorte?: string;
    PlanejadoFinalCorte?: string;
    RealizadoInicioCorte?: string;
    RealizadoFinalCorte?: string;
    PlanejadoInicioDobra?: string;
    PlanejadoFinalDobra?: string;
    RealizadoInicioDobra?: string;
    RealizadoFinalDobra?: string;
    PlanejadoInicioSolda?: string;
    PlanejadoFinalSolda?: string;
    RealizadoInicioSolda?: string;
    RealizadoFinalSolda?: string;
    PlanejadoInicioPintura?: string;
    PlanejadoFinalPintura?: string;
    RealizadoInicioPintura?: string;
    RealizadoFinalPintura?: string;
    PlanejadoInicioMontagem?: string;
    PlanejadoFinalMontagem?: string;
    RealizadoInicioMontagem?: string;
    RealizadoFinalMontagem?: string;
    PlanejadoInicioENGENHARIA?: string;
    PlanejadoFinalENGENHARIA?: string;
    RealizadoInicioENGENHARIA?: string;
    RealizadoFinalENGENHARIA?: string;
    PlanejadoInicioACABAMENTO?: string;
    PlanejadoFinalACABAMENTO?: string;
    RealizadoInicioACABAMENTO?: string;
    RealizadoFinalACABAMENTO?: string;
    EnderecoOrdemServico?: string;
}

interface OrdemServicoItem {
    IdOrdemServicoItem: number;
    IdOrdemServico?: string | number;
    DescResumo?: string;
    DescDetal?: string;
    QtdeTotal?: number;
    Peso?: number;
    AreaPintura?: number;
    Acabamento?: string;
    Unidade?: string;
    Espessura?: string;
    CodMatFabricante?: string;
    MaterialSW?: string;
    EnderecoArquivo?: string;
    Finalizado?: string;
    CortePercentual?: number;
    DobraPercentual?: number;
    SoldaPercentual?: number;
    PinturaPercentual?: number;
    MontagemPercentual?: number;
    // Para busca de itens
    Projeto?: string;
    Tag?: string;
    DescTag?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

interface DropdownOption {
    value: string;
    label: string;
}





export default function OrdemServicoPage() {
    // Data state
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [expandedOrdens, setExpandedOrdens] = useState<Set<number>>(new Set());
    const [ordensItens, setOrdensItens] = useState<Record<number, OrdemServicoItem[]>>({});
    const [loadingItens, setLoadingItens] = useState<Set<number>>(new Set());

    // Pagination
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [projetoFilter, setProjetoFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [groupBy, setGroupBy] = useState<'none' | 'projeto' | 'tag'>('none');

    // Dropdown options
    const [projetos, setProjetos] = useState<DropdownOption[]>([]);
    const [tags, setTags] = useState<DropdownOption[]>([]);

    // Item search mode
    const [searchMode, setSearchMode] = useState<'os' | 'item'>('os');
    const [itemSearchResults, setItemSearchResults] = useState<OrdemServicoItem[]>([]);
    const [searchingItems, setSearchingItems] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visibleSetores, setVisibleSetores] = useState<string[]>([]);

    // Fetch dropdown options
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [projRes, tagsRes] = await Promise.all([
                    fetch(`${API_BASE}/ordemservico/projetos`),
                    fetch(`${API_BASE}/ordemservico/tags`)
                ]);
                const projJson = await projRes.json();
                const tagsJson = await tagsRes.json();
                if (projJson.success) setProjetos(projJson.data);
                if (tagsJson.success) setTags(tagsJson.data);
            } catch (err) {
                console.error('Error fetching options:', err);
            }
        };
        fetchOptions();

        // Fetch config for visible sectors
        fetch(`${API_BASE}/config`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.config.ProcessosVisiveis) {
                    try {
                        setVisibleSetores(JSON.parse(data.config.ProcessosVisiveis));
                    } catch (e) {
                        setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']);
                    }
                } else {
                    setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']);
                }
            })
            .catch(() => setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']));
    }, []);

    // Update tags when projeto changes
    useEffect(() => {
        if (projetoFilter) {
            fetch(`${API_BASE}/ordemservico/tags?projeto=${encodeURIComponent(projetoFilter)}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success) setTags(json.data);
                });
        }
    }, [projetoFilter]);

    const fetchOrdens = useCallback(async (page = 1, append = false) => {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '50');
            if (projetoFilter) params.set('projeto', projetoFilter);
            if (tagFilter) params.set('tag', tagFilter);
            if (searchTerm && searchMode === 'os') params.set('search', searchTerm);

            const res = await fetch(`${API_BASE}/ordemservico?${params}`);
            const json = await res.json();

            if (json.success) {
                if (append) {
                    setOrdens(prev => [...prev, ...json.data]);
                } else {
                    setOrdens(json.data);
                }
                setPagination(json.pagination);
            } else {
                setError(json.message || 'Erro ao carregar dados');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [projetoFilter, tagFilter, searchTerm, searchMode]);

    // Search items by document code
    const searchItems = useCallback(async (term: string) => {
        if (term.length < 2) {
            setItemSearchResults([]);
            return;
        }
        setSearchingItems(true);
        try {
            const res = await fetch(`${API_BASE}/ordemservico/busca-item?q=${encodeURIComponent(term)}`);
            const json = await res.json();
            if (json.success) {
                setItemSearchResults(json.data);
            }
        } catch (err) {
            console.error('Error searching items:', err);
        } finally {
            setSearchingItems(false);
        }
    }, []);

    // Effect for search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchMode === 'item' && searchTerm) {
                searchItems(searchTerm);
            } else if (searchMode === 'os') {
                fetchOrdens(1);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, searchMode]);

    // Initial load and filter changes
    useEffect(() => {
        fetchOrdens(1);
    }, [projetoFilter, tagFilter]);

    const fetchItens = useCallback(async (osId: number) => {
        setLoadingItens(prev => new Set(prev).add(osId));
        try {
            const res = await fetch(`${API_BASE}/ordemservico/${osId}/itens`);
            const json = await res.json();
            if (json.success) {
                setOrdensItens(prev => ({ ...prev, [osId]: json.data }));
            }
        } catch (err) {
            console.error('Error fetching itens:', err);
        } finally {
            setLoadingItens(prev => {
                const next = new Set(prev);
                next.delete(osId);
                return next;
            });
        }
    }, []);

    const toggleOS = useCallback(async (osId: number) => {
        setExpandedOrdens(prev => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(osId)) {
                newExpanded.delete(osId);
            } else {
                newExpanded.add(osId);
                if (!ordensItens[osId]) {
                    fetchItens(osId);
                }
            }
            return newExpanded;
        });
    }, [ordensItens, fetchItens]);

    const loadMore = useCallback(() => {
        if (pagination?.hasMore && !loadingMore) {
            fetchOrdens(pagination.page + 1, true);
        }
    }, [pagination, loadingMore, fetchOrdens]);

    const clearFilters = useCallback(() => {
        setProjetoFilter('');
        setTagFilter('');
        setSearchTerm('');
        setGroupBy('none');
        setSearchMode('os');
        setItemSearchResults([]);
    }, []);

    // Group orders by projeto or tag
    const groupedOrdens = useMemo(() => {
        if (groupBy === 'none') return null;

        return ordens.reduce((acc, os) => {
            const key = (groupBy === 'projeto' ? os.Projeto : os.Tag) || 'Sem Grupo';
            if (!acc[key]) acc[key] = [];
            acc[key].push(os);
            return acc;
        }, {} as Record<string, OrdemServico[]>);
    }, [ordens, groupBy]);

    const hasActiveFilters = projetoFilter || tagFilter || searchTerm;

    const getStatusIcon = (status?: string, finalizado?: string) => {
        if (finalizado === 'C') return <CheckCircle size={16} className="text-green-500" />;
        if (status === 'C') return <XCircle size={16} className="text-red-500" />;
        return <Clock size={16} className="text-yellow-500" />;
    };

    const getStatusBadge = (finalizado?: string) => {
        if (finalizado === 'C') return 'bg-green-100 text-green-700';
        return 'bg-yellow-100 text-yellow-700';
    };

    const getProgressColor = (percent?: number) => {
        if (!percent || percent === 0) return 'bg-gray-200';
        if (percent < 30) return 'bg-red-400';
        if (percent < 70) return 'bg-yellow-400';
        return 'bg-green-500';
    };

    // Render a single OS card
    const renderOSCard = (os: OrdemServico, idx: number) => {
        const isExpanded = expandedOrdens.has(os.IdOrdemServico);
        const itens = ordensItens[os.IdOrdemServico] || [];
        const isLoadingItens = loadingItens.has(os.IdOrdemServico);

        return (
            <div key={os.IdOrdemServico}>
                {/* OS Row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.2) }}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-accent/5' : ''}`}
                    onClick={() => toggleOS(os.IdOrdemServico)}
                >
                    <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                        {isLoadingItens ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : isExpanded ? (
                            <ChevronDown size={18} className="text-primary" />
                        ) : (
                            <ChevronRight size={18} />
                        )}
                    </div>

                    {getStatusIcon(os.Estatus, os.OrdemServicoFinalizado)}

                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <ClipboardList size={16} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">OS {os.IdOrdemServico}</span>
                            <span className="text-sm font-medium text-gray-900 truncate">{os.Tag || '-'}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {os.Projeto} • {os.DescTag || 'Sem descrição'}
                        </div>
                    </div>

                    <div className="hidden md:flex flex-col items-center text-center w-16">
                        <span className="text-sm font-medium text-gray-900">{os.QtdeItensExecutados || 0}/{os.QtdeTotalItens || 0}</span>
                        <span className="text-[10px] text-gray-400">Itens</span>
                    </div>

                    <div className="hidden md:flex flex-col items-center w-20">
                        <span className="text-sm font-medium text-gray-900">{os.PercentualItens || 0}%</span>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                            <div
                                className={`h-full rounded-full transition-all ${getProgressColor(Number(os.PercentualItens))}`}
                                style={{ width: `${Math.min(Number(os.PercentualItens) || 0, 100)}%` }}
                            />
                        </div>
                    </div>

                    <span className={`hidden sm:inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(os.OrdemServicoFinalizado)}`}>
                        {os.OrdemServicoFinalizado === 'C' ? 'Finalizado' : 'Em Andamento'}
                    </span>

                    {ordensItens[os.IdOrdemServico] && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-accent/20 text-primary">
                            <Box size={12} />
                            {itens.length}
                        </span>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); toggleOS(os.IdOrdemServico); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-accent/20 transition-colors"
                        title="Ver Detalhes"
                    >
                        <Eye size={16} />
                    </button>

                    {os.EnderecoOrdemServico && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    await fetch('/api/system/open-folder', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ path: os.EnderecoOrdemServico })
                                    });
                                } catch (err) {
                                    console.error('Failed to open folder', err);
                                }
                            }}
                            className="p-2 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title={`Abrir pasta: ${os.EnderecoOrdemServico}`}
                        >
                            <FolderOpen size={16} />
                        </button>
                    )}
                </motion.div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden bg-gray-50/50"
                        >
                            {/* Info Panel */}
                            <div className="px-6 py-4 border-b border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    {/* Info cards... */}
                                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                                            <User size={14} />
                                            Informações Gerais
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Criado Por:</span>
                                                <span className="text-gray-700 font-medium">{os.CriadoPor || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Criação:</span>
                                                <span className="text-gray-600">{os.DataCriacao || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Previsão:</span>
                                                <span className="text-gray-600">{os.DataPrevisao || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                                            <Calendar size={14} />
                                            Liberação Engenharia
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Status:</span>
                                                <span className={`font-medium ${os.Liberado_Engenharia === 'S' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {os.Liberado_Engenharia === 'S' ? 'Liberado' : 'Pendente'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Liberação:</span>
                                                <span className="text-gray-600 font-medium">{os.Data_Liberacao_Engenharia || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                                            <Box size={14} />
                                            Totais
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peso Total:</span>
                                                <span className="text-gray-600">{os.PesoTotal ? `${os.PesoTotal} kg` : '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Área Pintura:</span>
                                                <span className="text-gray-600">{os.AreaPinturaTotal ? `${os.AreaPinturaTotal} m²` : '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peças:</span>
                                                <span className="text-gray-600">{os.QtdePecasExecutadas || 0}/{os.QtdeTotalPecas || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Datas por Setor */}
                                <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
                                    <Settings2 size={14} />
                                    Cronograma por Setor
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                    <SetorDatas nome="Engenharia" planejadoInicio={os.PlanejadoInicioENGENHARIA} planejadoFim={os.PlanejadoFinalENGENHARIA} realizadoInicio={os.RealizadoInicioENGENHARIA} realizadoFim={os.RealizadoFinalENGENHARIA} />
                                    {visibleSetores.includes('corte') && <SetorDatas nome="Corte" planejadoInicio={os.PlanejadoInicioCorte} planejadoFim={os.PlanejadoFinalCorte} realizadoInicio={os.RealizadoInicioCorte} realizadoFim={os.RealizadoFinalCorte} />}
                                    {visibleSetores.includes('dobra') && <SetorDatas nome="Dobra" planejadoInicio={os.PlanejadoInicioDobra} planejadoFim={os.PlanejadoFinalDobra} realizadoInicio={os.RealizadoInicioDobra} realizadoFim={os.RealizadoFinalDobra} />}
                                    {visibleSetores.includes('solda') && <SetorDatas nome="Solda" planejadoInicio={os.PlanejadoInicioSolda} planejadoFim={os.PlanejadoFinalSolda} realizadoInicio={os.RealizadoInicioSolda} realizadoFim={os.RealizadoFinalSolda} />}
                                    {visibleSetores.includes('pintura') && <SetorDatas nome="Pintura" planejadoInicio={os.PlanejadoInicioPintura} planejadoFim={os.PlanejadoFinalPintura} realizadoInicio={os.RealizadoInicioPintura} realizadoFim={os.RealizadoFinalPintura} />}
                                    {visibleSetores.includes('montagem') && <SetorDatas nome="Montagem" planejadoInicio={os.PlanejadoInicioMontagem} planejadoFim={os.PlanejadoFinalMontagem} realizadoInicio={os.RealizadoInicioMontagem} realizadoFim={os.RealizadoFinalMontagem} />}
                                    <SetorDatas nome="Acabamento" planejadoInicio={os.PlanejadoInicioACABAMENTO} planejadoFim={os.PlanejadoFinalACABAMENTO} realizadoInicio={os.RealizadoInicioACABAMENTO} realizadoFim={os.RealizadoFinalACABAMENTO} />
                                </div>
                            </div>

                            {/* Itens */}
                            {isLoadingItens ? (
                                <div className="px-4 py-4">
                                    {/* Loading Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="relative">
                                            <Loader2 size={20} className="animate-spin text-accent" />
                                            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-primary">Carregando itens da OS...</div>
                                            <div className="text-xs text-gray-400">Buscando dados do servidor</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-[#E0E800] via-[#32423D] to-[#E0E800] rounded-full animate-pulse"
                                                style={{ width: '100%', animation: 'shimmer 1.5s infinite' }} />
                                        </div>
                                    </div>

                                    {/* Skeleton Table Header */}
                                    <div className="flex items-center gap-2 pl-6 py-2 text-[10px] font-medium text-gray-300 uppercase border-b border-gray-100">
                                        <span className="w-8">PDF</span>
                                        <span className="w-32">Código Desenho</span>
                                        <span className="flex-1">Descrição</span>
                                        <span className="w-12 text-center">Qtde</span>
                                        <span className="w-14 text-center">Peso</span>
                                        {visibleSetores.includes('corte') && <span className="w-16 hidden lg:block text-center">Corte</span>}
                                        {visibleSetores.includes('dobra') && <span className="w-16 hidden lg:block text-center">Dobra</span>}
                                        {visibleSetores.includes('solda') && <span className="w-16 hidden lg:block text-center">Solda</span>}
                                        {visibleSetores.includes('pintura') && <span className="w-16 hidden lg:block text-center">Pintura</span>}
                                        {visibleSetores.includes('montagem') && <span className="w-16 hidden lg:block text-center">Mont.</span>}
                                    </div>

                                    {/* Skeleton Rows */}
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-2 pl-6 py-3 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                                            {/* PDF Icon Skeleton */}
                                            <div className="w-8 h-8 rounded bg-gray-200" />
                                            {/* Código Desenho Skeleton */}
                                            <div className="w-32 h-6 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                                            {/* Descrição Skeleton */}
                                            <div className="flex-1 h-4 rounded bg-gray-100" style={{ width: `${60 + Math.random() * 30}%` }} />
                                            {/* Qtde Skeleton */}
                                            <div className="w-8 h-4 rounded bg-gray-100 mx-2" />
                                            {/* Peso Skeleton */}
                                            <div className="w-10 h-4 rounded bg-gray-100 mx-2" />
                                            {/* Progress Skeletons */}
                                            <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />
                                            <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />
                                            <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />
                                            <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />
                                            <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />
                                        </div>
                                    ))}

                                    {/* Loading Message */}
                                    <div className="text-center py-2 text-xs text-gray-400">
                                        Aguarde enquanto os itens são carregados...
                                    </div>
                                </div>
                            ) : itens.length === 0 ? (
                                <div className="pl-16 py-4 text-sm text-gray-400 flex items-center gap-2">
                                    <Box size={14} />
                                    Nenhum item nesta OS
                                </div>
                            ) : (
                                <div className="px-4 py-2">
                                    <div className="text-xs font-semibold text-primary mb-2 pl-2">
                                        Itens da OS ({itens.length})
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 pl-6 py-1 text-[10px] font-medium text-gray-400 uppercase">
                                            <span className="w-8">PDF</span>
                                            <span className="w-32">Código Desenho</span>
                                            <span className="flex-1">Descrição</span>
                                            <span className="w-12 text-center">Qtde</span>
                                            <span className="w-14 text-center">Peso</span>
                                            <span className="w-16 hidden lg:block text-center">Corte</span>
                                            <span className="w-16 hidden lg:block text-center">Dobra</span>
                                            <span className="w-16 hidden lg:block text-center">Solda</span>
                                            <span className="w-16 hidden lg:block text-center">Pintura</span>
                                            <span className="w-16 hidden lg:block text-center">Mont.</span>
                                        </div>

                                        {itens.map((item) => (
                                            <div
                                                key={item.IdOrdemServicoItem}
                                                className="flex items-center gap-2 pl-6 py-2 rounded-lg hover:bg-white transition-colors group"
                                            >
                                                {item.EnderecoArquivo ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const path = item.EnderecoArquivo || '';
                                                            const pdfUrl = `${API_BASE}/pdf?path=${encodeURIComponent(path)}`;
                                                            window.open(pdfUrl, '_blank');
                                                        }}
                                                        className="w-8 h-8 rounded flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                        title={`Abrir desenho: ${item.CodMatFabricante}`}
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                ) : (
                                                    <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                                        <FileText size={14} />
                                                    </div>
                                                )}

                                                <span
                                                    className="w-32 text-xs font-bold text-primary bg-accent/20 px-2 py-1 rounded truncate"
                                                    title={item.CodMatFabricante || 'Sem código'}
                                                >
                                                    {item.CodMatFabricante || '-'}
                                                </span>

                                                <span className="flex-1 text-sm text-gray-700 truncate" title={item.DescDetal || item.DescResumo}>
                                                    {item.DescResumo || '-'}
                                                </span>

                                                <span className="w-12 text-xs text-gray-600 text-center">{item.QtdeTotal || '-'}</span>
                                                <span className="w-14 text-xs text-gray-600 text-center">{item.Peso ? `${item.Peso}kg` : '-'}</span>
                                                {visibleSetores.includes('corte') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.CortePercentual} label="Corte" /></div>}
                                                {visibleSetores.includes('dobra') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.DobraPercentual} label="Dobra" /></div>}
                                                {visibleSetores.includes('solda') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.SoldaPercentual} label="Solda" /></div>}
                                                {visibleSetores.includes('pintura') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.PinturaPercentual} label="Pintura" /></div>}
                                                {visibleSetores.includes('montagem') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.MontagemPercentual} label="Montagem" /></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                    {error}
                </motion.div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Ordens de Serviço</h1>
                    <p className="text-gray-500 text-sm">
                        {pagination ? `${ordens.length} de ${pagination.total} ordens` : 'Carregando...'}
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fetchOrdens(1)}
                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    disabled={loading}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </motion.button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Mode Toggle */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => { setSearchMode('os'); setItemSearchResults([]); }}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${searchMode === 'os' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            Buscar OS
                        </button>
                        <button
                            onClick={() => setSearchMode('item')}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${searchMode === 'item' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            Buscar Documento
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={searchMode === 'os' ? "Buscar OS, projeto, tag..." : "Buscar código desenho..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                            />
                            {(searchingItems || (searchMode === 'os' && loading && searchTerm)) && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
                            )}
                        </div>
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 bg-white shadow-sm transition-colors" title="Limpar pesquisa">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {/* Projeto Filter */}
                    <select
                        value={projetoFilter}
                        onChange={(e) => { setProjetoFilter(e.target.value); setTagFilter(''); }}
                        className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        <option value="">Todos Projetos</option>
                        {projetos.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>

                    {/* Tag Filter */}
                    <select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        <option value="">Todas Tags</option>
                        {tags.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>

                    {/* Group By */}
                    <div className="flex items-center gap-2">
                        <Layers size={16} className="text-gray-400" />
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as 'none' | 'projeto' | 'tag')}
                            className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                            <option value="none">Sem Agrupamento</option>
                            <option value="projeto">Agrupar por Projeto</option>
                            <option value="tag">Agrupar por Tag</option>
                        </select>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <X size={14} />
                            Limpar
                        </button>
                    )}
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Filter size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">Filtros ativos:</span>
                        {projetoFilter && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Projeto: {projetoFilter}
                            </span>
                        )}
                        {tagFilter && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                                Tag: {tagFilter}
                            </span>
                        )}
                        {searchTerm && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                Busca: "{searchTerm}"
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Item Search Results */}
            {searchMode === 'item' && itemSearchResults.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-[#E0E800]/10 to-transparent border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-primary">
                            Resultados da Busca por Documento ({itemSearchResults.length})
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {itemSearchResults.map((item) => (
                            <div key={item.IdOrdemServicoItem} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                {item.EnderecoArquivo ? (
                                    <button
                                        onClick={() => {
                                            const path = item.EnderecoArquivo || '';
                                            const pdfUrl = `${API_BASE}/pdf?path=${encodeURIComponent(path)}`;
                                            window.open(pdfUrl, '_blank');
                                        }}
                                        className="w-8 h-8 rounded flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        <FileText size={14} />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                        <FileText size={14} />
                                    </div>
                                )}
                                <span className="text-xs font-bold text-primary bg-accent/20 px-2 py-1 rounded">
                                    {item.CodMatFabricante}
                                </span>
                                <span className="flex-1 text-sm text-gray-700 truncate">
                                    {item.DescResumo || '-'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    OS {item.IdOrdemServico}
                                </span>
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                    {item.Projeto} / {item.Tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            {searchMode === 'os' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-sm">Carregando ordens de serviço...</p>
                        </div>
                    ) : ordens.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <ClipboardList size={40} strokeWidth={1.5} />
                            <p className="text-sm">Nenhuma ordem de serviço encontrada</p>
                        </div>
                    ) : groupBy !== 'none' && groupedOrdens ? (
                        // Grouped View
                        <div>
                            {Object.entries(groupedOrdens).map(([groupName, groupOrdens]) => (
                                <div key={groupName}>
                                    <div className="px-4 py-3 bg-gradient-to-r from-[#32423D] to-[#32423D]/80 text-white sticky top-0 z-10">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{groupName}</span>
                                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                                {groupOrdens.length} OS
                                            </span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {groupOrdens.map((os, idx) => renderOSCard(os, idx))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Normal View
                        <div className="divide-y divide-gray-100">
                            {ordens.map((os, idx) => renderOSCard(os, idx))}
                        </div>
                    )}

                    {/* Load More Button */}
                    {pagination?.hasMore && !loading && (
                        <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Carregando...
                                    </>
                                ) : (
                                    <>
                                        Carregar Mais
                                        <span className="text-xs opacity-70">
                                            ({pagination.total - ordens.length} restantes)
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Footer Stats */}
                    {!loading && ordens.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                                <span className="font-medium">{ordens.length}</span> de <span className="font-medium">{pagination?.total || ordens.length}</span> ordens de serviço •
                                <span className="font-medium ml-1">{expandedOrdens.size}</span> expandidas
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
