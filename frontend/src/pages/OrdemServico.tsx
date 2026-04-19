import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronRight, ChevronDown, ClipboardList, Eye,
    Loader2, RefreshCw, Box, CheckCircle, Clock, XCircle, User, Calendar, Settings2, FileText, FolderOpen,
    Filter, Layers, X, ArrowLeft, Trash2, Flag, RotateCcw, Hash, Copy, FileSpreadsheet, PenTool, AlertTriangle, Star,
    ShieldAlert, Scissors, Wrench, Flame, Paintbrush, PackagePlus
} from 'lucide-react';
import { ProgressBar } from '../components/ordem-servico/ProgressBar';
import { SetorDatas } from '../components/ordem-servico/SetorDatas';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';

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
    QtdeTotalItens?: string | number;
    QtdeItensExecutados?: string | number;
    QtdeTotalItensCalc?: number;
    QtdeItensExecutadosCalc?: number;
    PercentualItensCalc?: number;
    PercentualItens?: string | number;
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
    NumeroOPOmie?: string;
    Fator?: number | string;
    temApontamento?: boolean;
}

interface OrdemServicoItem {
    IdOrdemServicoItem: number;
    IdOrdemServico?: string | number;
    DescResumo?: string;
    DescDetal?: string;
    Fator?: number;
    QtdeTotal?: number;
    Peso?: number;
    AreaPintura?: number;
    Acabamento?: string;
    Unidade?: string;
    Espessura?: string;
    CodMatFabricante?: string;
    MaterialSW?: string;
    EnderecoArquivo?: string;
    ProdutoPrincipal?: string;
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






import React from 'react';
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#fee', color: '#c00' }}>
                    <h2>Something went wrong in OrdemServico!</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function OrdemServicoPage() {
    return <ErrorBoundary><OrdemServicoContent /></ErrorBoundary>;
}

function OrdemServicoContent() {
    const { token } = useAuth();
    // Data state
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [expandedOrdens, setExpandedOrdens] = useState<Set<number>>(new Set());
    const [selectedOSId, setSelectedOSId] = useState<number | null>(null);
    const [ordensItens, setOrdensItens] = useState<Record<number, OrdemServicoItem[]>>({});
    const [loadingItens, setLoadingItens] = useState<Set<number>>(new Set());
    const [liberandoOS, setLiberandoOS] = useState<number | null>(null);

    // Liberar OS com Fator Modal
    const [liberacaoFatorModal, setLiberacaoFatorModal] = useState<OrdemServico | null>(null);
    const [novoFator, setNovoFator] = useState<string>('');

    // Modal Clone Inter-Projetos
    const [showModalClonar, setShowModalClonar] = useState<OrdemServico | null>(null);
    const [cloneDescricao, setCloneDescricao] = useState('');
    const [cloneFator, setCloneFator] = useState(1);
    const [cloneProjetoId, setCloneProjetoId] = useState<number | string>('');
    const [cloneTagId, setCloneTagId] = useState<number | string>('');

    // Modal Incluir Itens na OS
    const [showModalIncluirItens, setShowModalIncluirItens] = useState<OrdemServico | null>(null);
    const [itensDisponiveis, setItensDisponiveis] = useState<OrdemServicoItem[]>([]);
    const [loadingItensDisp, setLoadingItensDisp] = useState(false);
    const [searchItensDisp, setSearchItensDisp] = useState('');
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
    const [salvandoItens, setSalvandoItens] = useState(false);
    const [cloneTags, setCloneTags] = useState<DropdownOption[]>([]);
    const [loadingCloneTags, setLoadingCloneTags] = useState(false);
    const [cloneTagsEmpty, setCloneTagsEmpty] = useState(false);
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const { addToast } = useToast();

    // ============================================================
    // Estados do Modal Gerar Pendência (RNC) - idêntico ao ApontamentoProducao
    // ============================================================
    const [pendenciaModalOpen, setPendenciaModalOpen] = useState(false);
    const [selectedItemRnc, setSelectedItemRnc] = useState<OrdemServicoItem & { IdOrdemServico?: number } | null>(null);
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
    const [pendenciasHistorico, setPendenciasHistorico] = useState<any[]>([]);
    const [loadingPendencias, setLoadingPendencias] = useState(false);
    const [exibirFinalizadas, setExibirFinalizadas] = useState(false);
    const [searchQuery1, setSearchQuery1] = useState('');
    const [searchQuery2, setSearchQuery2] = useState('');
    // Config options for Pendencia
    const [setoresRncConfig, setSetoresRncConfig] = useState<string[]>([]);
    const [usuariosRncConfig, setUsuariosRncConfig] = useState<{ IdUsuario: number, NomeCompleto: string }[]>([]);
    const [espessurasRncConfig, setEspessurasRncConfig] = useState<{ idEspessura: number, Espessura: string }[]>([]);
    const [materiaisSWRncConfig, setMateriaisSWRncConfig] = useState<{ idMaterialSw: number, MaterialSw: string }[]>([]);
    
    // Filtros de Data Independentes
    const [dataCriacaoInicio, setDataCriacaoInicio] = useState('');
    const [dataCriacaoFim, setDataCriacaoFim] = useState('');
    const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState('');
    const [dataPrevisaoFim, setDataPrevisaoFim] = useState('');
    const [dataLiberacaoInicio, setDataLiberacaoInicio] = useState('');
    const [dataLiberacaoFim, setDataLiberacaoFim] = useState('');

    const formatDateBR = (dateStr?: string) => {
        if (!dateStr || dateStr === '-') return '-';
        try {
            if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.split(' ')[0];
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    const handleOpenFile = async (e: React.MouseEvent, path: string, type: 'pdf' | 'dxf' | 'sldprt') => {
        e.stopPropagation();
        if (!path) return;
        try {
            const res = await fetch(`${API_BASE}/ordemservicoitem/check-file?path=${encodeURIComponent(path)}&type=${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.exists) {
                if (type === 'pdf') {
                    window.open(`${API_BASE}/pdf?path=${encodeURIComponent(path)}`, '_blank');
                } else {
                    window.open(`${API_BASE}/download?path=${encodeURIComponent(path)}&type=${type}`, '_blank');
                }
            } else {
                addToast({ type: 'error', title: 'Arquivo Mídia', message: 'Arquivo não existe no servidor!' });
            }
        } catch (err: any) {
            addToast({ type: 'error', title: 'Erro', message: `Falha ao abrir arquivo: ${err.message}` });
        }
    };

    const handleTogglePrincipal = async (e: React.MouseEvent, item: OrdemServicoItem, marcar: boolean, osId: number) => {
        e.stopPropagation();
        
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservicoitem/${item.IdOrdemServicoItem}/toggle-principal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    marcar,
                    idOrdemServico: osId,
                    codMatFabricante: item.CodMatFabricante,
                    descResumo: item.DescResumo,
                    descDetal: item.DescDetal
                })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: json.message });
                setOrdensItens(prev => {
                    const osItems = [...(prev[osId] || [])];
                    const updatedItems = osItems.map(i => ({
                        ...i,
                        ProdutoPrincipal: i.IdOrdemServicoItem === item.IdOrdemServicoItem 
                            ? (marcar ? 'SIM' : undefined) 
                            : (marcar ? undefined : i.ProdutoPrincipal)
                    }));
                    return { ...prev, [osId]: updatedItems };
                });
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message });
            }
        } catch (err: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro de comunicação com servidor.' });
        }
    };

    const handleDeleteItem = async (e: React.MouseEvent, item: OrdemServicoItem, osId: number) => {
        e.stopPropagation();
        if (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM') {
            addToast({ type: 'warning', title: 'Atenção', message: 'Item da Ordem Serviço não pode ser excluido, O.S. já liberada! Verifique!' });
            return;
        }
        
        if (!window.confirm("Deseja excluir o registro selecionado?")) return;
        
        try {
            const res = await fetch(`${API_BASE}/ordemservicoitem/${item.IdOrdemServicoItem}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                addToast({ type: 'success', title: 'Sucesso', message: 'Item excluído com sucesso!' });
                setOrdensItens(prev => ({
                    ...prev,
                    [osId]: prev[osId].filter(i => i.IdOrdemServicoItem !== item.IdOrdemServicoItem)
                }));
            } else {
                addToast({ type: 'error', title: 'Falha', message: data.message });
            }
        } catch (err: any) {
            addToast({ type: 'error', title: 'Erro', message: err.message });
        }
    };

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
    const [projetosClonagem, setProjetosClonagem] = useState<DropdownOption[]>([]);

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
                const [projRes, tagsRes, projCloneRes] = await Promise.all([
                    fetch(`${API_BASE}/ordemservico/projetos`),
                    fetch(`${API_BASE}/ordemservico/tags`),
                    fetch(`${API_BASE}/ordemservico/projetos-clonagem`)
                ]);
                const projJson = await projRes.json();
                const tagsJson = await tagsRes.json();
                const projCloneJson = await projCloneRes.json();
                if (projJson.success) setProjetos(projJson.data);
                if (tagsJson.success) setTags(tagsJson.data);
                if (projCloneJson.success) setProjetosClonagem(projCloneJson.data);
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

    // Update clone tags when clone project changes
    useEffect(() => {
        setCloneTagId('');       // sempre reseta a tag ao trocar projeto
        setCloneTagsEmpty(false);
        if (cloneProjetoId) {
            setLoadingCloneTags(true);
            fetch(`${API_BASE}/ordemservico/tags-clonagem?projetoId=${encodeURIComponent(cloneProjetoId)}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success) {
                        setCloneTags(json.data);
                        setCloneTagsEmpty(json.data.length === 0);
                    }
                })
                .finally(() => setLoadingCloneTags(false));
        } else {
            setCloneTags([]);
        }
    }, [cloneProjetoId]);

    const fetchOrdens = useCallback(async (page = 1, append = false) => {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '50');
            if (!mostrarTodos) params.set('filter', 'liberados');
            else params.set('filter', 'todos');
            if (projetoFilter) params.set('projeto', projetoFilter);
            if (tagFilter) params.set('tag', tagFilter);
            if (searchTerm && searchMode === 'os') params.set('search', searchTerm);
            
            if (dataCriacaoInicio && dataCriacaoFim) {
                params.set('dataCriacaoInicio', dataCriacaoInicio);
                params.set('dataCriacaoFim', dataCriacaoFim);
            }
            if (dataPrevisaoInicio && dataPrevisaoFim) {
                params.set('dataPrevisaoInicio', dataPrevisaoInicio);
                params.set('dataPrevisaoFim', dataPrevisaoFim);
            }
            if (dataLiberacaoInicio && dataLiberacaoFim) {
                params.set('dataLiberacaoInicio', dataLiberacaoInicio);
                params.set('dataLiberacaoFim', dataLiberacaoFim);
            }

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
    }, [projetoFilter, tagFilter, searchTerm, searchMode, mostrarTodos]);

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
    }, [projetoFilter, tagFilter, mostrarTodos, dataCriacaoInicio, dataCriacaoFim, dataPrevisaoInicio, dataPrevisaoFim, dataLiberacaoInicio, dataLiberacaoFim]);

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
        setSelectedOSId(osId);
        if (!ordensItens[osId]) {
            fetchItens(osId);
        }
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
        setDataCriacaoInicio('');
        setDataCriacaoFim('');
        setDataPrevisaoInicio('');
        setDataPrevisaoFim('');
        setDataLiberacaoInicio('');
        setDataLiberacaoFim('');
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
    
    const proceedWithLiberacao = async (os: OrdemServico, fator: number | string) => {
        const result = await Swal.fire({
            title: 'Tipo de Liberação',
            text: `Como deseja liberar a Ordem de Serviço ${os.IdOrdemServico}?`,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Total',
            denyButtonText: 'Parcial',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10B981',
            denyButtonColor: '#F59E0B',
            reverseButtons: true
        });

        if (result.isDismissed) {
            return;
        }

        const tipoLiberacao = result.isConfirmed ? 'Total' : 'Parcial';

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/liberar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    IdOrdemServico: os.IdOrdemServico,
                    IdTag: os.IdTag,
                    IdProjeto: os.IdProjeto,
                    Fator: fator,
                    EnderecoOrdemServico: os.EnderecoOrdemServico,
                    TipoLiberacao: tipoLiberacao.toLowerCase() === 'total' ? 'Total' : 'Parcial'
                })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: `Ordem de Serviço ${os.IdOrdemServico} liberada! (${tipoLiberacao})` });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: 'S', OrdemServicoFinalizado: 'C', Fator: Number(fator) } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao liberar Ordem de Serviço.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleLiberarOS = async (os: OrdemServico) => {
        if (os.Fator === 0 || os.Fator === '0' || os.Fator == null) {
            setLiberacaoFatorModal(os);
            setNovoFator('');
            return;
        }

        await proceedWithLiberacao(os, os.Fator);
    };

    const handleCancelarLiberacao = async (os: OrdemServico) => {
        if (!window.confirm(`Ao cancelar a liberação da Ordem de Serviço nº ${os.IdOrdemServico}\nCaso existam Planos de Corte vinculados aos itens desta OS e não haja execução, os respectivos itens serão automaticamente cancelados. Deseja prosseguir?`)) {
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/cancelar-liberacao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ IdOrdemServico: os.IdOrdemServico })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: 'Liberação cancelada!' });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: '', OrdemServicoFinalizado: '' } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao cancelar liberação.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleAtualizarArquivos = async (os: OrdemServico) => {
        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/atualizar-arquivos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ IdOrdemServico: os.IdOrdemServico })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Arquivos Atualizados', message: 'Diretórios limpos e arquivos processados.' });
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao atualizar arquivos.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleAlterarFator = async (os: OrdemServico) => {
        const items = ordensItens[os.IdOrdemServico];
        if (!items || items.length === 0) {
            addToast({ type: 'error', title: 'Atenção', message: 'Não há itens a serem alterados!' });
            return;
        }

        const novoFator = window.prompt("Informe o novo valor Multiplicador", os.Fator?.toString() || "1");
        if (!novoFator) return;
        
        const fatorNum = parseFloat(novoFator.replace(',', '.'));
        if (isNaN(fatorNum) || fatorNum <= 0) {
            addToast({ type: 'error', title: 'Atenção', message: 'O valor informado não é um número válido' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/alterar-fator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    IdOrdemServico: os.IdOrdemServico,
                    FatorMultiplicador: fatorNum
                })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Fator Alterado', message: 'Multplicador, pesos e áreas atualizados com sucesso.' });
                // Atualiza OS localmente para refletir o novo fator
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Fator: fatorNum } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao alterar fator.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleExcluirOS = async (os: OrdemServico) => {
        const confirmDelete = window.confirm(`Deseja Excluir/Cancelar a Ordem de Serviço: ${os.IdOrdemServico}?`);
        if (!confirmDelete) return;

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/excluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    IdOrdemServico: os.IdOrdemServico,
                    Usuario: 'Sistema' // Pode ser pego do Contexto de Auth depois se disponivel
                })
            });

            const data = await res.json();
            if (data.success) {
                addToast({ type: 'success', title: 'Sucesso', message: data.message });
                // Remove da listagem local
                setOrdens(prev => prev.filter(o => o.IdOrdemServico !== os.IdOrdemServico));
                setSelectedOSId(null);
            } else {
                addToast({ type: 'error', title: 'Atenção', message: data.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor ao excluir.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleFinalizarOS = async (os: OrdemServico) => {
        const confirmResult = window.confirm(`Deseja Finalizar todo o processo de fabricação da OS - ${os.IdOrdemServico} selecionada?`);
        if (!confirmResult) return;

        if (os.OrdemServicoFinalizado === 'C') {
            addToast({ type: 'error', title: 'Atenção', message: 'O.S. já Finalizada' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/finalizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ IdOrdemServico: os.IdOrdemServico })
            });

            const data = await res.json();
            if (data.success) {
                addToast({ type: 'success', title: 'Conclusão OS', message: data.message });
                // Refresh records natively
                fetchOrdens(1); 
            } else {
                addToast({ type: 'error', title: 'Atenção', message: data.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor ao finalizar.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleCancelarFinalizacaoOS = async (os: OrdemServico) => {
        const confirmResult = window.confirm(`Deseja cancelar a finalização de todo o processo de fabricação da OS - ${os.IdOrdemServico}?`);
        if (!confirmResult) return;

        if (os.OrdemServicoFinalizado !== 'C') {
            addToast({ type: 'error', title: 'Atenção', message: 'A O.S. não está Finalizada!' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(`${API_BASE}/ordemservico/cancelar-finalizacao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ IdOrdemServico: os.IdOrdemServico })
            });

            const data = await res.json();
            if (data.success) {
                addToast({ type: 'success', title: 'Conclusão', message: data.message });
                fetchOrdens(1); 
            } else {
                addToast({ type: 'error', title: 'Atenção', message: data.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor ao cancelar finalização.' });
        } finally {
            setLiberandoOS(null);
        }
    };


    const handleInserirOpOmie = async (os: OrdemServico) => {
        const result = await Swal.fire({
            title: 'OMIE',
            text: 'Informe o número da Ordem de Produção do OMIE',
            input: 'text',
            inputValue: os.NumeroOPOmie || '',
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'O número da OP do OMIE não pode estar vazio!';
                }
            }
        });

        if (result.isConfirmed) {
            const numeroOp = result.value;
            setLiberandoOS(os.IdOrdemServico);
            try {
                const response = await fetch(`${API_BASE}/ordemservico/numero-op`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('sinco_token')}`
                    },
                    body: JSON.stringify({
                        IdOrdemServico: os.IdOrdemServico,
                        NumeroOPOmie: numeroOp.trim()
                    })
                });

                const data = await response.json();
                if (data.success) {
                    addToast({ type: 'success', title: 'Sucesso', message: `Número OP ${numeroOp} associado com sucesso à OS ${os.IdOrdemServico}!` });
                    fetchOrdens(1);
                } else {
                    addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao atualizar número OP do OMIE.' });
                }
            } catch (error: any) {
                console.error('Erro ao atualizar OP do OMIE:', error);
                addToast({ type: 'error', title: 'Erro de Conexão', message: 'Não foi possível conectar ao servidor.' });
            } finally {
                setLiberandoOS(null);
            }
        } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            addToast({ type: 'info', title: 'Aviso', message: 'Operação cancelada pelo usuário.' });
        }
    };

    // ============================================================
    // Lógica do Modal Pendência (RNC) - idêntico ao ApontamentoProducao
    // ============================================================
    useEffect(() => {
        fetch(`${API_BASE}/config/setores`)
            .then(res => res.json())
            .then(json => { if (json.success) setSetoresRncConfig(json.setores || json.data); })
            .catch(console.error);
        fetch(`${API_BASE}/config/usuarios`)
            .then(res => res.json())
            .then(json => { if (json.success) setUsuariosRncConfig(json.usuarios); })
            .catch(console.error);
        fetch(`${API_BASE}/config/espessuras`)
            .then(res => res.json())
            .then(json => { if (json.success) setEspessurasRncConfig(json.data); })
            .catch(console.error);
        fetch(`${API_BASE}/config/materiais`)
            .then(res => res.json())
            .then(json => { if (json.success) setMateriaisSWRncConfig(json.data); })
            .catch(console.error);
    }, []);

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
        } catch { setPendenciasHistorico([]); }
        finally { setLoadingPendencias(false); }
    };

    useEffect(() => {
        if (selectedItemRnc?.CodMatFabricante && pendenciaModalOpen) {
            const id = setTimeout(() => fetchHistoricoRNC(selectedItemRnc.CodMatFabricante || ''), 500);
            return () => clearTimeout(id);
        }
    }, [searchQuery1, searchQuery2, pendenciaModalOpen]);

    const handleGerarRnc = (e: React.MouseEvent, item: OrdemServicoItem, osId: number) => {
        e.stopPropagation();
        const itemComOs = { ...item, IdOrdemServico: osId };
        setSelectedItemRnc(itemComOs);
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
        setTituloRnc(item.DescResumo || '');
        setSubTituloRnc(item.DescDetal || '');
        setEspessuraRnc(item.Espessura || '');
        setMaterialSWRnc(item.MaterialSW || '');
        setChkCorteRnc(false);
        setChkDobraRnc(false);
        setChkSoldaRnc(false);
        setChkPinturaRnc(false);
        setChkMontagemRnc(false);
        setPendenciasHistorico([]);
        setPendenciaModalOpen(true);
    };

    const handleNovaPendenciaOS = () => {
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
        setEspessuraRnc(selectedItemRnc?.Espessura || '');
        setMaterialSWRnc(selectedItemRnc?.MaterialSW || '');
        setChkCorteRnc(false);
        setChkDobraRnc(false);
        setChkSoldaRnc(false);
        setChkPinturaRnc(false);
        setChkMontagemRnc(false);
    };

    const loadPendenciaForEditOS = (p: any) => {
        setIdRncEdicao(p.IDRNC);
        setDescricaoPendencia(p.DescricaoPendencia || '');
        setTituloRnc(p.DescResumo || '');
        setSubTituloRnc(p.DescDetal || '');
        setEspessuraRnc(p.Espessura || '');
        setMaterialSWRnc(p.MaterialSW || '');
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
            } else setDataFinalizacao('');
        } else {
            setFinalizandoRnc(false);
            setSetorFinalizacao(''); setColaboradorFinalizacao(''); setDataFinalizacao(''); setDescricaoFinalizacao('');
        }
        addToast({ type: 'info', title: 'Edição Ativada', message: `Carregando Pendência #${p.IDRNC}` });
    };

    const handleSubmitPendenciaOS = async () => {
        if (!selectedItemRnc) return;
        if (!setorResponsavel || !usuarioResponsavel || !descricaoPendencia) {
            addToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Setor, Colaborador e Descrição são obrigatórios.' });
            return;
        }
        if (finalizandoRnc) {
            if (!setorFinalizacao || !colaboradorFinalizacao || !dataFinalizacao || !descricaoFinalizacao) {
                addToast({ type: 'error', title: 'Campos de Finalização', message: 'Para concluir a RNC, preencha todos os campos de finalização.' });
                return;
            }
            if (!window.confirm('Deseja realmente confirmar a finalização desta RNC?')) return;
        }
        setSubmittingPendencia(true);
        try {
            const payload = {
                idOrdemServicoItem: selectedItemRnc.IdOrdemServicoItem,
                idOrdemServico: selectedItemRnc.IdOrdemServico,
                idProjeto: '',
                projeto: selectedItemRnc.Projeto || '',
                idTag: '',
                tag: selectedItemRnc.Tag || '',
                descTag: selectedItemRnc.DescTag || '',
                descEmpresa: '',
                codMatFabricante: selectedItemRnc.CodMatFabricante || '',
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
                usuarioCriacao: 'Sistema',
                descProjeto: selectedItemRnc.Projeto || '',
                origemPendencia: 'PLANODECORTE',
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
                setLoadingPendencias(true);
                try {
                    const histRes = await fetch(`${API_BASE}/producao/pendencias/historico?codMatFabricante=${encodeURIComponent(selectedItemRnc.CodMatFabricante || '')}`);
                    const histJson = await histRes.json();
                    if (histJson.success) setPendenciasHistorico(histJson.data);
                } catch { } finally { setLoadingPendencias(false); }
                addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Operação realizada com sucesso.' });
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar pendência.' });
            }
        } catch {
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão.' });
        } finally {
            setSubmittingPendencia(false);
        }
    };


    
    
    const handleOpenClonarOS = (os: OrdemServico) => {
        setCloneDescricao(os.Descricao || '');
        setCloneFator(1);
        setCloneProjetoId(os.IdProjeto || '');
        setCloneTagId(os.IdTag || '');
        setShowModalClonar(os);
    };

    // ── Incluir Itens ────────────────────────────────────────────────────────
    const fetchItensDisponiveis = async (os: OrdemServico, search = '') => {
        setLoadingItensDisp(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            const res = await fetch(`${API_BASE}/ordemservico/${os.IdOrdemServico}/itens-disponiveis?${params}`);
            const json = await res.json();
            if (json.success) setItensDisponiveis(json.data);
            else addToast({ type: 'error', title: 'Erro', message: json.message });
        } catch {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao buscar itens disponíveis.' });
        } finally {
            setLoadingItensDisp(false);
        }
    };

    const handleOpenIncluirItens = (os: OrdemServico) => {
        if (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM') {
            addToast({ type: 'warning', title: 'Atenção', message: 'OS liberada para engenharia não aceita novos itens.' });
            return;
        }
        setItensSelecionados(new Set());
        setSearchItensDisp('');
        setShowModalIncluirItens(os);
        fetchItensDisponiveis(os);
    };

    const handleConfirmarInclusao = async () => {
        if (!showModalIncluirItens || itensSelecionados.size === 0) return;
        setSalvandoItens(true);
        try {
            const res = await fetch(`${API_BASE}/ordemservico/${showModalIncluirItens.IdOrdemServico}/incluir-itens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itensSelecionados: Array.from(itensSelecionados) }),
            });
            const json = await res.json();
            if (json.success || json.adicionados > 0) {
                addToast({ type: 'success', title: 'Sucesso', message: json.message });
                setShowModalIncluirItens(null);
                // Recarregar itens da OS
                const osId = showModalIncluirItens.IdOrdemServico;
                setOrdensItens(prev => { const n = { ...prev }; delete n[osId]; return n; });
                setLoadingItens(prev => { const n = new Set(prev); n.add(osId); return n; });
                const r = await fetch(`${API_BASE}/ordemservico/${osId}/itens`);
                const d = await r.json();
                if (d.success) setOrdensItens(prev => ({ ...prev, [osId]: d.data }));
                setLoadingItens(prev => { const n = new Set(prev); n.delete(osId); return n; });
            } else {
                addToast({ type: 'warning', title: 'Atenção', message: json.message });
            }
        } catch {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao incluir itens.' });
        } finally {
            setSalvandoItens(false);
        }
    };

    const executeClone = async (os: OrdemServico) => {
        if (!cloneProjetoId || !cloneTagId) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um Projeto e uma Tag destino!' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const response = await fetch(`${API_BASE}/ordemservico/clonar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('sinco_token')}`
                },
                body: JSON.stringify({
                    IdOrdemServico: os.IdOrdemServico,
                    novoIdProjeto: cloneProjetoId,
                    novoIdTag: cloneTagId,
                    novaDescricao: cloneDescricao,
                    novoFator: cloneFator,
                    usuarioNome: localStorage.getItem('user_name') || 'Usuario Web'
                })
            });

            const data = await response.json();
            if (data.success) {
                setShowModalClonar(null);
                addToast({ type: 'success', title: 'Sucesso', message: `OS clonada perfeitamente! Nova OS ID: ${data.novoId}` });
                fetchOrdens(1);
            } else {
                addToast({ type: 'error', title: 'Erro na Clonagem', message: data.message || 'Erro ao duplicar a OS.' });
            }
        } catch (error: any) {
            console.error('Erro ao clonar O.S:', error);
            addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha ao se comunicar com a API de Clonagem.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const renderOSDetail = (os: OrdemServico) => {
        const itens = ordensItens[os.IdOrdemServico] || [];
        const isLoadingItens = loadingItens.has(os.IdOrdemServico);
        return (
            
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                {/* Voltar and Actions Bar */}
                <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 bg-gray-50 gap-4">
                    <button onClick={() => setSelectedOSId(null)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                        <ArrowLeft size={16} />
                        Voltar para Lista
                    </button>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="text-right sm:mr-4">
                            <div className="text-xs text-gray-400">Ordem de Serviço</div>
                            <div className="text-lg font-bold text-primary">OS {os.IdOrdemServico}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Botão Incluir Itens — apenas se não liberada */}
                            {os.Liberado_Engenharia !== 'S' && os.OrdemServicoFinalizado !== 'C' && (
                                <button
                                    onClick={() => handleOpenIncluirItens(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-teal-50 text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Incluir Itens na Ordem de Serviço"
                                >
                                    <PackagePlus size={18} />
                                </button>
                            )}

                            <button 
                                onClick={() => handleAtualizarArquivos(os)}
                                disabled={liberandoOS === os.IdOrdemServico}
                                className="p-2.5 border rounded-lg shadow-sm transition-colors bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 disabled:opacity-50"
                                title="Atualizar arquivos na pasta da OS"
                            >
                                <RefreshCw size={18} />
                            </button>

                            {os.Liberado_Engenharia === 'S' && os.OrdemServicoFinalizado !== 'C' && (
                                <button 
                                    onClick={() => handleInserirOpOmie(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Informar Ordem de Produção ERP (OMIE)"
                                >
                                    <Hash size={18} />
                                </button>
                            )}

                            <button 
                                onClick={() => handleAlterarFator(os)}
                                disabled={liberandoOS === os.IdOrdemServico}
                                className="p-2.5 border rounded-lg shadow-sm transition-colors bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 disabled:opacity-50"
                                title="Alterar Fator Multiplicador da O.S."
                            >
                                <Settings2 size={18} />
                            </button>

                            <button 
                                onClick={() => handleExcluirOS(os)}
                                disabled={liberandoOS === os.IdOrdemServico}
                                className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                                title="Excluir Ordem de Serviço"
                            >
                                <Trash2 size={18} />
                            </button>

                            <button 
                                onClick={() => handleOpenClonarOS(os)}
                                disabled={liberandoOS === os.IdOrdemServico}
                                className="p-2.5 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors shadow-sm disabled:opacity-50"
                                title="Criar Cópia (Duplicar) desta Ordem de Serviço"
                            >
                                <Copy size={18} />
                            </button>

                            {os.OrdemServicoFinalizado !== 'C' && (
                                <button 
                                    onClick={() => handleFinalizarOS(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Finalizar Ordem de Serviço"
                                >
                                    <Flag size={18} />
                                </button>
                            )}

                            {os.OrdemServicoFinalizado === 'C' && (
                                <button 
                                    onClick={() => handleCancelarFinalizacaoOS(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Cancelar Finalização da O.S."
                                >
                                    <RotateCcw size={18} />
                                </button>
                            )}

                            {os.Liberado_Engenharia !== 'S' ? (
                                <button 
                                    onClick={() => handleLiberarOS(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Liberar Ordem de Serviço"
                                >
                                    {liberandoOS === os.IdOrdemServico ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        addToast({ type: 'info', title: 'Atenção', message: 'A OS já está liberada! Utilize a opção de Cancelar Liberação se necessário.' });
                                    }}
                                    className="p-2.5 bg-gray-50 text-green-500 border border-gray-200 rounded-lg cursor-not-allowed opacity-60"
                                    title="Ordem de Serviço já liberada"
                                >
                                    <CheckCircle size={18} />
                                </button>
                            )}

                            {os.Liberado_Engenharia === 'S' && (
                                <button 
                                    onClick={() => !os.temApontamento && handleCancelarLiberacao(os)}
                                    disabled={liberandoOS === os.IdOrdemServico || os.temApontamento}
                                    className={`p-2.5 border rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
                                        os.temApontamento 
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                    }`}
                                    title={os.temApontamento 
                                        ? 'Não é possível cancelar: esta OS já possui apontamentos de produção registrados.' 
                                        : 'Cancelar Liberação Engenharia'}
                                >
                                    {liberandoOS === os.IdOrdemServico ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
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
                                                <span className="text-gray-600 font-medium">{formatDateBR(os.DataCriacao)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Previsão:</span>
                                                <span className="text-gray-600 font-medium">{formatDateBR(os.DataPrevisao)}</span>
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
                                                <span className="text-gray-800 font-bold">{formatDateBR(os.Data_Liberacao_Engenharia)}</span>
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
                                                <span className="text-gray-600">
                                                    {Number(os.QtdePecasExecutadasCalc ?? os.QtdePecasExecutadas) || 0}/
                                                    {Number(os.QtdeTotalPecasCalc ?? os.QtdeTotalPecas) || 0}
                                                </span>
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
                                        <span className="w-8">DXF</span>
                                        <span className="w-8">3D</span>
                                        <span className="w-32">Código Desenho</span>
                                        <span className="flex-1">Descrição</span>
                                        <span className="w-12 text-center">Qtde</span>
                                        <span className="w-14 text-center">Peso</span>
                                        {visibleSetores.includes('corte') && <span className="w-16 hidden lg:block text-center">Corte</span>}
                                        {visibleSetores.includes('dobra') && <span className="w-16 hidden lg:block text-center">Dobra</span>}
                                        {visibleSetores.includes('solda') && <span className="w-16 hidden lg:block text-center">Solda</span>}
                                        {visibleSetores.includes('pintura') && <span className="w-16 hidden lg:block text-center">Pintura</span>}
                                        {visibleSetores.includes('montagem') && <span className="w-16 hidden lg:block text-center">Mont.</span>}
                                        <span className="w-10 ml-auto mr-2"></span>
                                    </div>

                                    {/* Skeleton Rows */}
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-2 pl-6 py-3 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                                            {/* Media Icon Skeletons */}
                                            <div className="flex gap-1 w-28">
                                                <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                                                <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                                                <div className="w-8 h-8 rounded bg-gray-200 shrink-0" />
                                            </div>
                                            {/* Código Desenho Skeleton */}
                                            <div className="w-32 h-6 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
                                            {/* Descrição Skeleton */}
                                            <div className="flex-1 h-4 rounded bg-gray-100" style={{ width: `${60 + Math.random() * 30}%` }} />
                                            {/* Qtde Skeleton */}
                                            <div className="w-8 h-4 rounded bg-gray-100 mx-2" />
                                            {/* Peso Skeleton */}
                                            <div className="w-10 h-4 rounded bg-gray-100 mx-2" />
                                            {/* Progress Skeletons */}
                                            {visibleSetores.includes('corte') && <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />}
                                            {visibleSetores.includes('dobra') && <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />}
                                            {visibleSetores.includes('solda') && <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />}
                                            {visibleSetores.includes('pintura') && <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />}
                                            {visibleSetores.includes('montagem') && <div className="w-12 h-1.5 rounded-full bg-gray-100 hidden lg:block mx-2" />}
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
                                            <div className="flex gap-1 shrink-0" style={{ width: '11.5rem' }}>
                                                <span className="w-8 text-center" title="PDF do Item">PDF</span>
                                                <span className="w-8 text-center">DXF</span>
                                                <span className="w-8 text-center">3D</span>
                                                <span className="w-8 text-center" title="PDF da O.S.">OS</span>
                                                <span className="w-8 text-center" title="Conjunto Principal">★</span>
                                            </div>
                                            <span className="w-32">Código Desenho</span>
                                            <span className="flex-1">Descrição</span>
                                            <span className="w-12 text-center" title="Fator Multiplicador">Fator</span>
                                            <span className="w-12 text-center">Qtde</span>
                                            <span className="w-14 text-center">Peso</span>
                                            {visibleSetores.includes('corte') && <span className="w-16 hidden lg:block text-center">Corte</span>}
                                            {visibleSetores.includes('dobra') && <span className="w-16 hidden lg:block text-center">Dobra</span>}
                                            {visibleSetores.includes('solda') && <span className="w-16 hidden lg:block text-center">Solda</span>}
                                            {visibleSetores.includes('pintura') && <span className="w-16 hidden lg:block text-center">Pintura</span>}
                                            {visibleSetores.includes('montagem') && <span className="w-16 hidden lg:block text-center">Mont.</span>}
                                        </div>

                                        {itens.map((item) => (
                                            <div
                                                key={item.IdOrdemServicoItem}
                                                className={`flex items-center gap-2 pl-6 py-2 rounded-lg transition-colors group ${
                                                    item.ProdutoPrincipal === 'SIM' ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-white'
                                                }`}
                                            >
                                                <div className="flex gap-1 shrink-0" style={{ width: '11.5rem' }}>
                                                    {item.EnderecoArquivo ? (
                                                        <button
                                                            onClick={(e) => handleOpenFile(e, item.EnderecoArquivo || '', 'pdf')}
                                                            className="w-8 h-8 rounded flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                            title={`Abrir PDF do Item: ${item.CodMatFabricante}`}
                                                        >
                                                            <FileText size={14} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                                            <FileText size={14} />
                                                        </div>
                                                    )}

                                                    {item.EnderecoArquivo ? (
                                                        <button
                                                            onClick={(e) => handleOpenFile(e, item.EnderecoArquivo || '', 'dxf')}
                                                            className="w-8 h-8 rounded flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                            title={`Download DXF: ${item.CodMatFabricante}`}
                                                        >
                                                            <PenTool size={14} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                                            <PenTool size={14} />
                                                        </div>
                                                    )}

                                                    {item.EnderecoArquivo ? (
                                                        <button
                                                            onClick={(e) => handleOpenFile(e, item.EnderecoArquivo || '', 'sldprt')}
                                                            className="w-8 h-8 rounded flex items-center justify-center bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                                                            title={`Download 3D: ${item.CodMatFabricante}`}
                                                        >
                                                            <Box size={14} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                                            <Box size={14} />
                                                        </div>
                                                    )}

                                                    {os.EnderecoOrdemServico ? (
                                                        <button
                                                            onClick={(e) => handleOpenFile(e, os.EnderecoOrdemServico || '', 'pdf')}
                                                            className="w-8 h-8 rounded flex items-center justify-center bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                                                            title={`Abrir PDF da O.S.`}
                                                        >
                                                            <FileText size={14} />
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-50 text-gray-300" title="Sem PDF da O.S.">
                                                            <FileText size={14} />
                                                        </div>
                                                    )}
                                                    
                                                    {item.ProdutoPrincipal === 'SIM' ? (
                                                        <button
                                                            onClick={(e) => {
                                                                const isBloqueada = (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') || (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM');
                                                                if (isBloqueada) {
                                                                    e.stopPropagation();
                                                                    addToast({ type: 'warning', title: 'Atenção', message: 'Ação bloqueada: O.S. já liberada ou finalizada!' });
                                                                    return;
                                                                }
                                                                handleTogglePrincipal(e, item, false, os.IdOrdemServico);
                                                            }}
                                                            className={`w-8 h-8 rounded flex items-center justify-center ${
                                                                (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') || (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM')
                                                                    ? 'bg-yellow-50 text-yellow-400 cursor-not-allowed opacity-80'
                                                                    : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                            } transition-colors`}
                                                            title={`Conjunto Principal: ${item.CodMatFabricante}`}
                                                        >
                                                            <Star size={14} className="fill-current" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                const isBloqueada = (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') || (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM');
                                                                if (isBloqueada) {
                                                                    e.stopPropagation();
                                                                    addToast({ type: 'warning', title: 'Atenção', message: 'Ação bloqueada: O.S. já liberada ou finalizada!' });
                                                                    return;
                                                                }
                                                                handleTogglePrincipal(e, item, true, os.IdOrdemServico);
                                                            }}
                                                            className={`w-8 h-8 rounded flex items-center justify-center ${
                                                                (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') || (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM')
                                                                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                                    : 'bg-gray-50 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
                                                            } transition-colors`}
                                                            title={
                                                                (os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') || (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM')
                                                                    ? 'Ação bloqueada'
                                                                    : `Marcar: ${item.CodMatFabricante} como Conjunto Principal`
                                                            }
                                                        >
                                                            <Star size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <span
                                                    className="w-32 text-xs font-bold text-primary bg-accent/20 px-2 py-1 rounded truncate"
                                                    title={item.CodMatFabricante || 'Sem código'}
                                                >
                                                    {item.CodMatFabricante || '-'}
                                                </span>

                                                <span className="flex-1 text-sm text-gray-700 truncate" title={item.DescDetal || item.DescResumo}>
                                                    {item.DescResumo || '-'}
                                                </span>

                                                <span className="w-12 text-xs font-semibold text-accent text-center bg-accent/10 rounded my-auto py-0.5" title="Fator">
                                                    {item.Fator !== undefined ? item.Fator : '1'}
                                                </span>
                                                <span className="w-12 text-xs text-gray-600 text-center">{item.QtdeTotal || '-'}</span>
                                                <span className="w-14 text-xs text-gray-600 text-center">{item.Peso ? `${item.Peso}kg` : '-'}</span>
                                                {visibleSetores.includes('corte') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.CortePercentual} label="Corte" /></div>}
                                                {visibleSetores.includes('dobra') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.DobraPercentual} label="Dobra" /></div>}
                                                {visibleSetores.includes('solda') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.SoldaPercentual} label="Solda" /></div>}
                                                {visibleSetores.includes('pintura') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.PinturaPercentual} label="Pintura" /></div>}
                                                {visibleSetores.includes('montagem') && <div className="hidden lg:flex w-16 justify-center"><ProgressBar value={item.MontagemPercentual} label="Montagem" /></div>}
                                                
                                                {/* Botão Gerar Pendência (RNC) - sempre visível */}
                                                <button
                                                    onClick={(e) => handleGerarRnc(e, item, os.IdOrdemServico)}
                                                    className="w-8 h-8 rounded flex items-center justify-center bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors ml-auto"
                                                    title="Gerar Pendência (RNC)"
                                                >
                                                    <ShieldAlert size={16} />
                                                </button>

                                                {!(os.Liberado_Engenharia === 'S' || os.Liberado_Engenharia === 'SIM' || os.OrdemServicoFinalizado === 'C' || os.OrdemServicoFinalizado === 'S') && !(item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM') && (
                                                    <button
                                                        onClick={(e) => handleDeleteItem(e, item, os.IdOrdemServico)}
                                                        className="w-8 h-8 rounded flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors mr-2"
                                                        title="Excluir Linha Selecionada"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
        );
    };

    const renderOSCard = (os: OrdemServico, idx: number) => {
        const isExpanded = false;
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
                        <span className="text-sm font-medium text-gray-900">
                            {Number(os.QtdeItensExecutadosCalc ?? os.QtdeItensExecutados) || 0}/{Number(os.QtdeTotalItensCalc ?? os.QtdeTotalItens) || 0}
                        </span>
                        <span className="text-[10px] text-gray-400">Itens</span>
                    </div>

                    <div className="hidden md:flex flex-col items-center w-20">
                        <span className="text-sm font-medium text-gray-900">{Number(os.PercentualItensCalc ?? os.PercentualItens) || 0}%</span>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-0.5">
                            <div
                                className={`h-full rounded-full transition-all ${getProgressColor(Number(os.PercentualItensCalc ?? os.PercentualItens))}`}
                                style={{ width: `${Math.min(Number(os.PercentualItensCalc ?? os.PercentualItens) || 0, 100)}%` }}
                            />
                        </div>
                    </div>

                    <span className={`hidden sm:inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(os.OrdemServicoFinalizado)}`}>
                        {os.OrdemServicoFinalizado === 'C' ? 'Finalizado' : 'Em Andamento'}
                    </span>

                    {/* Badge de Total de Itens - Sempre Visível */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-accent/20 text-primary" title="Total de Itens">
                        <Box size={12} />
                        {Number(os.QtdeTotalItensCalc ?? os.QtdeTotalItens) || 0}
                    </span>

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
                    
                    {os.EnderecoOrdemServico && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    addToast({ type: 'info', title: 'Aguarde', message: 'Gerando Relatório Excel...' });
                                    const res = await fetch(`/api/ordemservico/${os.IdOrdemServico}/excel`, { 
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        addToast({ type: 'success', title: 'Concluído', message: 'Excel gerado e pasta aberta!' });
                                    } else {
                                        throw new Error(data.message || 'Erro do servidor');
                                    }
                                } catch (err: any) {
                                    addToast({ type: 'error', title: 'Falha', message: `Ao gerar Excel: ${err.message}` });
                                }
                            }}
                            className="p-2 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Gerar Relatório Excel"
                        >
                            <FileSpreadsheet size={16} />
                        </button>
                    )}
                </motion.div>

                
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

                    {/* Projeto Filter - texto livre */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Projeto..."
                            value={projetoFilter}
                            onChange={(e) => { setProjetoFilter(e.target.value); setTagFilter(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && fetchOrdens(1)}
                            className="pl-3 pr-7 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-40"
                        />
                        {projetoFilter && (
                            <button
                                onClick={() => { setProjetoFilter(''); setTagFilter(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors"
                                title="Limpar projeto"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Tag Filter - texto livre */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tag..."
                            value={tagFilter}
                            onChange={(e) => setTagFilter(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchOrdens(1)}
                            className="pl-3 pr-7 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-36"
                        />
                        {tagFilter && (
                            <button
                                onClick={() => setTagFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors"
                                title="Limpar tag"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

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

                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white">
                        <input
                            type="checkbox"
                            checked={mostrarTodos}
                            onChange={(e) => setMostrarTodos(e.target.checked)}
                            className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                        />
                        <span className="text-sm text-gray-700 cursor-pointer select-none" onClick={() => setMostrarTodos(!mostrarTodos)}>
                            Exibir Não Liberados / Finalizados
                        </span>
                    </div>

                    {/* Date Filters Row */}
                    <div className="flex flex-wrap items-center gap-2 w-full mt-2">
                        {/* Data Criação */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-100 bg-gray-50/30">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-[9px] uppercase font-bold text-gray-400 mr-1">Criação</span>
                            <input type="date" value={dataCriacaoInicio} onChange={(e) => setDataCriacaoInicio(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            <span className="text-[9px] text-gray-300 mx-0.5">-</span>
                            <input type="date" value={dataCriacaoFim} onChange={(e) => setDataCriacaoFim(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            {(dataCriacaoInicio || dataCriacaoFim) && (
                                <button onClick={() => { setDataCriacaoInicio(''); setDataCriacaoFim(''); }} className="ml-1 text-gray-300 hover:text-red-400"><X size={10} /></button>
                            )}
                        </div>

                        {/* Data Previsão */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-100 bg-gray-50/30">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-[9px] uppercase font-bold text-gray-400 mr-1">Previsão</span>
                            <input type="date" value={dataPrevisaoInicio} onChange={(e) => setDataPrevisaoInicio(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            <span className="text-[9px] text-gray-300 mx-0.5">-</span>
                            <input type="date" value={dataPrevisaoFim} onChange={(e) => setDataPrevisaoFim(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            {(dataPrevisaoInicio || dataPrevisaoFim) && (
                                <button onClick={() => { setDataPrevisaoInicio(''); setDataPrevisaoFim(''); }} className="ml-1 text-gray-300 hover:text-red-400"><X size={10} /></button>
                            )}
                        </div>

                        {/* Data Liberação */}
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-100 bg-gray-50/30">
                            <Calendar size={12} className="text-gray-400" />
                            <span className="text-[9px] uppercase font-bold text-gray-400 mr-1">Liberação</span>
                            <input type="date" value={dataLiberacaoInicio} onChange={(e) => setDataLiberacaoInicio(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            <span className="text-[9px] text-gray-300 mx-0.5">-</span>
                            <input type="date" value={dataLiberacaoFim} onChange={(e) => setDataLiberacaoFim(e.target.value)} className="bg-transparent border-none p-0 text-[10px] text-gray-600 focus:ring-0 w-24" />
                            {(dataLiberacaoInicio || dataLiberacaoFim) && (
                                <button onClick={() => { setDataLiberacaoInicio(''); setDataLiberacaoFim(''); }} className="ml-1 text-gray-300 hover:text-red-400"><X size={10} /></button>
                            )}
                        </div>
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
            {searchMode === 'os' && selectedOSId && ordens.find(o => o.IdOrdemServico === selectedOSId) ? renderOSDetail(ordens.find(o => o.IdOrdemServico === selectedOSId)!) : searchMode === 'os' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 size={32} className="animate-spin" />
                            <p className="text-sm">Carregando ordens de serviço...</p>
                        </div>
                    ) : ordens.length === 0 && selectedOSId ? (
                         <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <ClipboardList size={40} strokeWidth={1.5} />
                            <p className="text-sm">Atualizando...</p>
                            {(() => { setTimeout(() => setSelectedOSId(null), 10); return null; })()}
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

            {/* Modal de Clonar OS */}
            <AnimatePresence>
                {showModalClonar && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                    <Copy size={20} className="text-accent" />
                                    Clonar Ordem de Serviço
                                </h3>
                                <button
                                    onClick={() => setShowModalClonar(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                                    <strong>Atenção:</strong> Você está prestes a duplicar a <strong>OS {showModalClonar.IdOrdemServico}</strong>.<br/> 
                                    Selecione o Projeto e a Tag de destino.
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Novo Projeto Destino *
                                    </label>
                                    <select
                                        value={cloneProjetoId}
                                        onChange={(e) => {
                                            setCloneProjetoId(e.target.value);
                                            setCloneTagId(''); // reset tag ao trocar projeto
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
                                        required
                                    >
                                        <option value="">Selecione o Projeto...</option>
                                        {projetosClonagem.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nova Tag Destino *
                                    </label>
                                    {loadingCloneTags ? (
                                        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                                            <Loader2 size={14} className="animate-spin" />
                                            Carregando tags...
                                        </div>
                                    ) : cloneTagsEmpty ? (
                                        <div className="flex items-center gap-2 px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-sm text-amber-700">
                                            <span className="text-base">⚠️</span>
                                            <span>Este projeto não possui tags cadastradas. Selecione outro projeto para continuar.</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={cloneTagId}
                                            onChange={(e) => setCloneTagId(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
                                            required
                                            disabled={!cloneProjetoId}
                                        >
                                            <option value="">Selecione a Tag...</option>
                                            {cloneTags.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fator Multiplicador
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={cloneFator}
                                        onChange={(e) => setCloneFator(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Multiplica as quantidades e pesos da OS original.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nova Descrição (Opcional)
                                    </label>
                                    <textarea
                                        value={cloneDescricao}
                                        onChange={(e) => setCloneDescricao(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent resize-none"
                                        placeholder="Descreva o motivo da clonagem ou especificidades da nova OS..."
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowModalClonar(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => executeClone(showModalClonar)}
                                    disabled={liberandoOS === showModalClonar.IdOrdemServico || !cloneProjetoId || !cloneTagId}
                                    className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {liberandoOS === showModalClonar.IdOrdemServico ? (
                                        <><Loader2 size={16} className="animate-spin" /> Clonando...</>
                                    ) : (
                                        <><Copy size={16} /> Confirmar Clonagem</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── Modal Incluir Itens na OS ─────────────────────────────── */}
            <AnimatePresence>
                {showModalIncluirItens && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
                            style={{ maxHeight: '90vh' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-teal-50/60">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shadow">
                                        <PackagePlus size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800">Incluir Itens na OS {showModalIncluirItens.IdOrdemServico}</h3>
                                        <p className="text-xs text-gray-500">Selecione os itens a adicionar. Itens já presentes são excluídos da lista.</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModalIncluirItens(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search + select-all bar */}
                            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
                                <div className="relative flex-1" style={{ minWidth: 200 }}>
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={searchItensDisp}
                                        onChange={e => {
                                            setSearchItensDisp(e.target.value);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') fetchItensDisponiveis(showModalIncluirItens, searchItensDisp);
                                        }}
                                        placeholder="Buscar código, descrição, projeto, tag..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                                    />
                                </div>
                                <button
                                    onClick={() => fetchItensDisponiveis(showModalIncluirItens, searchItensDisp)}
                                    className="px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1"
                                >
                                    <Search size={13} /> Buscar
                                </button>
                                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none ml-auto">
                                    <input
                                        type="checkbox"
                                        checked={itensDisponiveis.length > 0 && itensSelecionados.size === itensDisponiveis.length}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setItensSelecionados(new Set(itensDisponiveis.map(i => i.IdOrdemServicoItem)));
                                            } else {
                                                setItensSelecionados(new Set());
                                            }
                                        }}
                                        className="w-4 h-4 accent-teal-600"
                                    />
                                    Selecionar todos
                                </label>
                                <span className="text-xs text-gray-400">{itensSelecionados.size} selecionado(s)</span>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto">
                                {loadingItensDisp ? (
                                    <div className="flex items-center justify-center py-16 text-gray-400">
                                        <Loader2 size={24} className="animate-spin mr-2" /> Buscando itens...
                                    </div>
                                ) : itensDisponiveis.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                        <Box size={40} className="mb-2 opacity-20" />
                                        <p className="text-sm">Nenhum item disponível para inclusão.</p>
                                        <p className="text-xs mt-1 text-gray-300">Todos os itens já estão incluídos nesta OS ou não há itens cadastrados.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-gray-50 z-10">
                                            <tr className="border-b border-gray-200">
                                                <th className="w-10 px-4 py-2 text-center text-gray-400"></th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500">Código</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500">Descrição</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-500 hidden md:table-cell">Projeto / Tag</th>
                                                <th className="px-3 py-2 text-center font-semibold text-gray-500 hidden lg:table-cell">Espessura</th>
                                                <th className="px-3 py-2 text-center font-semibold text-gray-500 hidden lg:table-cell">Material</th>
                                                <th className="px-3 py-2 text-center font-semibold text-gray-500">Peso (kg)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itensDisponiveis.map(item => {
                                                const sel = itensSelecionados.has(item.IdOrdemServicoItem);
                                                return (
                                                    <tr
                                                        key={item.IdOrdemServicoItem}
                                                        onClick={() => {
                                                            setItensSelecionados(prev => {
                                                                const n = new Set(prev);
                                                                sel ? n.delete(item.IdOrdemServicoItem) : n.add(item.IdOrdemServicoItem);
                                                                return n;
                                                            });
                                                        }}
                                                        className={`border-b border-gray-100 cursor-pointer transition-colors ${sel ? 'bg-teal-50 hover:bg-teal-100/70' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <td className="px-4 py-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={sel}
                                                                readOnly
                                                                className="w-4 h-4 accent-teal-600 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                                                                {item.CodMatFabricante || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-700 max-w-xs">
                                                            <div className="truncate" title={item.DescDetal || item.DescResumo}>
                                                                {item.DescResumo || '-'}
                                                            </div>
                                                            {item.DescDetal && item.DescDetal !== item.DescResumo && (
                                                                <div className="text-gray-400 truncate text-[10px]">{item.DescDetal}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
                                                            <div className="font-medium">{item.Projeto || '-'}</div>
                                                            {item.Tag && <div className="text-[10px] text-gray-400">{item.Tag}</div>}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-600 hidden lg:table-cell">
                                                            {item.Espessura || '-'}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-600 hidden lg:table-cell">
                                                            {item.MaterialSW || '-'}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-600 font-medium">
                                                            {item.Peso ? `${item.Peso}` : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
                                <span className="text-xs text-gray-500">
                                    {itensDisponiveis.length} item(ns) disponível(-eis) · {itensSelecionados.size} selecionado(s)
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowModalIncluirItens(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmarInclusao}
                                        disabled={itensSelecionados.size === 0 || salvandoItens}
                                        className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                                    >
                                        {salvandoItens ? (
                                            <><Loader2 size={15} className="animate-spin" /> Incluindo...</>
                                        ) : (
                                            <><PackagePlus size={15} /> Incluir {itensSelecionados.size > 0 ? `(${itensSelecionados.size})` : ''} Itens</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Fator Modal */}
            {liberacaoFatorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col animate-in zoom-in-95 duration-200 border border-gray-100 overflow-hidden">
                        <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-red-800">Fator Inválido ou Ausente</h3>
                                <p className="text-xs text-red-600/80">O fator da O.S. não pode ser zero.</p>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4 text-center">
                                Por favor, informe um novo Fator Multiplicador para a Ordem de Serviço <span className="font-semibold text-gray-800">OS {liberacaoFatorModal.IdOrdemServico}</span> antes de prosseguir com a liberação.
                            </p>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 ml-1">Fator Multiplicador (Apenas Inteiros)</label>
                                <input 
                                    type="number" 
                                    step="1"
                                    min="1"
                                    autoFocus
                                    value={novoFator}
                                    onChange={(e) => setNovoFator(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Ex: 1, 2, 3..."
                                    className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
                            <button
                                onClick={() => setLiberacaoFatorModal(null)}
                                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const num = parseInt(novoFator, 10);
                                    if (!num || num <= 0) {
                                        addToast({ type: 'error', title: 'Atenção', message: 'Fator inválido. Digite um número inteiro maior que zero.' });
                                        return;
                                    }
                                    setLiberacaoFatorModal(null);
                                    proceedWithLiberacao(liberacaoFatorModal, num);
                                }}
                                disabled={!novoFator || parseInt(novoFator, 10) <= 0}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Liberação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Modal Gerar Pendência (RNC) - idêntico ao ApontamentoProducao  */}
            {/* ============================================================ */}
            <AnimatePresence>
                {pendenciaModalOpen && selectedItemRnc && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setPendenciaModalOpen(false); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert size={24} />
                                    <h2 className="text-lg font-bold">Gerar Pendência (RNC)</h2>
                                </div>
                                <button onClick={() => setPendenciaModalOpen(false)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5 flex-1">
                                {/* Campos somente leitura - contexto do item */}
                                <div className="grid grid-cols-12 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">ID RNC</label>
                                        <div className={`text-sm font-bold px-3 py-2 border rounded ${idRncEdicao ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                            {idRncEdicao ? `#${idRncEdicao}` : 'NOVA'}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItemRnc.IdOrdemServico}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.I.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItemRnc.IdOrdemServicoItem}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cód. Mat. Fabric.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.CodMatFabricante || '-'}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Projeto</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.Projeto || '-'}</div>
                                    </div>
                                    <div className="col-span-6">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tag</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.Tag || '-'}</div>
                                    </div>
                                    <div className="col-span-6">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Descrição</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.DescResumo || '-'}</div>
                                    </div>
                                </div>

                                {/* Inputs Editáveis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
                                        <input type="text" value={tituloRnc} onChange={e => setTituloRnc(e.target.value)}
                                            readOnly={idRncEdicao !== null}
                                            className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Sub Título</label>
                                        <input type="text" value={subTituloRnc} onChange={e => setSubTituloRnc(e.target.value)}
                                            readOnly={idRncEdicao !== null}
                                            className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                                            placeholder="Sub-título da RNC" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador</label>
                                        <select value={usuarioResponsavel} onChange={e => setUsuarioResponsavel(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
                                            <option value="">Selecione...</option>
                                            {usuariosRncConfig.map(u => <option key={u.IdUsuario} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Setor</label>
                                        <select value={setorResponsavel} onChange={e => setSetorResponsavel(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
                                            <option value="">Selecione...</option>
                                            {setoresRncConfig.filter(s => {
                                                const lower = s.toLowerCase();
                                                const productionSectors = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
                                                if (productionSectors.includes(lower)) {
                                                    return visibleSetores.includes(lower);
                                                }
                                                return true;
                                            }).map((s, i) => <option key={i} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Espessura</label>
                                            <select value={espessuraRnc} onChange={e => setEspessuraRnc(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white">
                                                <option value="">Selecione...</option>
                                                {espessurasRncConfig.map(esp => <option key={esp.idEspessura} value={esp.Espessura}>{esp.Espessura}</option>)}
                                                {espessuraRnc && !espessurasRncConfig.some(e => e.Espessura === espessuraRnc) && <option value={espessuraRnc}>{espessuraRnc}</option>}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Material SW</label>
                                            <select value={materialSWRnc} onChange={e => setMaterialSWRnc(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white truncate">
                                                <option value="">Selecione...</option>
                                                {materiaisSWRncConfig.map(mat => <option key={mat.idMaterialSw} value={mat.MaterialSw}>{mat.MaterialSw}</option>)}
                                                {materialSWRnc && !materiaisSWRncConfig.some(m => m.MaterialSw === materialSWRnc) && <option value={materialSWRnc}>{materialSWRnc}</option>}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Data Execução</label>
                                            <input type="date" value={dataExecucaoRnc} onChange={e => setDataExecucaoRnc(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo RNC</label>
                                            <select value={tipoRnc} onChange={e => setTipoRnc(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
                                                <option value="RNC">RNC</option>
                                                <option value="TAREFA">TAREFA</option>
                                                <option value="RETRABALHO">RETRABALHO</option>
                                                <option value="OUTROS">OUTROS</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Descrição */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição da Pendência *</label>
                                    <textarea value={descricaoPendencia} onChange={e => setDescricaoPendencia(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                        placeholder="Descreva os detalhes da RNC/Pendência..." rows={4} />
                                </div>

                                {/* Processos */}
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-6 justify-center">
                                    {visibleSetores.includes('corte') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkCorteRnc} onChange={e => setChkCorteRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkCorteRnc ? 'text-blue-700 font-bold bg-blue-100' : 'text-gray-700 font-semibold'}`}><Scissors size={14} className={chkCorteRnc ? 'text-blue-700' : 'text-blue-500'} /> Corte</span>
                                        </label>
                                    )}
                                    {visibleSetores.includes('dobra') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkDobraRnc} onChange={e => setChkDobraRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkDobraRnc ? 'text-purple-700 font-bold bg-purple-100' : 'text-gray-700 font-semibold'}`}><Wrench size={14} className={chkDobraRnc ? 'text-purple-700' : 'text-purple-500'} /> Dobra</span>
                                        </label>
                                    )}
                                    {visibleSetores.includes('solda') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkSoldaRnc} onChange={e => setChkSoldaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkSoldaRnc ? 'text-orange-700 font-bold bg-orange-100' : 'text-gray-700 font-semibold'}`}><Flame size={14} className={chkSoldaRnc ? 'text-orange-700' : 'text-orange-500'} /> Solda</span>
                                        </label>
                                    )}
                                    {visibleSetores.includes('pintura') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkPinturaRnc} onChange={e => setChkPinturaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkPinturaRnc ? 'text-green-700 font-bold bg-green-100' : 'text-gray-700 font-semibold'}`}><Paintbrush size={14} className={chkPinturaRnc ? 'text-green-700' : 'text-green-500'} /> Acabamento</span>
                                        </label>
                                    )}
                                    {visibleSetores.includes('montagem') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkMontagemRnc} onChange={e => setChkMontagemRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkMontagemRnc ? 'text-red-700 font-bold bg-red-100' : 'text-gray-700 font-semibold'}`}><Settings2 size={14} className={chkMontagemRnc ? 'text-red-700' : 'text-red-500'} /> Montagem</span>
                                        </label>
                                    )}
                                </div>

                                {/* Seção Finalização - só exibida em edição */}
                                {idRncEdicao && (
                                    <div className="mt-4 border border-green-200 rounded-lg overflow-hidden bg-green-50/30">
                                        <div className="bg-green-100/80 px-4 py-3 border-b border-green-200 flex justify-between items-center cursor-pointer hover:bg-green-200 transition-colors"
                                            onClick={() => setFinalizandoRnc(!finalizandoRnc)}>
                                            <h3 className="text-sm font-bold text-green-800 flex items-center gap-2 uppercase tracking-wide">
                                                <CheckCircle size={16} className={finalizandoRnc ? 'text-green-600' : 'text-green-500 opacity-50'} />
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
                                                            <select value={setorFinalizacao} onChange={e => setSetorFinalizacao(e.target.value)}
                                                                className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
                                                                <option value="">Selecione...</option>
                                                                {setoresRncConfig.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs font-bold text-green-800">Colaborador Finalização *</label>
                                                            <select value={colaboradorFinalizacao} onChange={e => setColaboradorFinalizacao(e.target.value)}
                                                                className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
                                                                <option value="">Selecione...</option>
                                                                {usuariosRncConfig.map(u => <option key={u.NomeCompleto} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs font-bold text-green-800">Data Finalização *</label>
                                                            <input type="date" value={dataFinalizacao} onChange={e => setDataFinalizacao(e.target.value)}
                                                                className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full" />
                                                        </div>
                                                        <div className="flex flex-col gap-1 md:col-span-3">
                                                            <label className="text-xs font-bold text-green-800">Parecer Finalização *</label>
                                                            <textarea value={descricaoFinalizacao} onChange={e => setDescricaoFinalizacao(e.target.value)} rows={2}
                                                                className="p-2 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full resize-none placeholder-green-300"
                                                                placeholder="Insira o parecer de fechamento da RNC..." />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Histórico de Pendências */}
                                {(() => {
                                    const pendenciasExibidas = exibirFinalizadas ? pendenciasHistorico : pendenciasHistorico.filter((p: any) => p.ST !== 'FINALIZADO');
                                    return (
                                        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
                                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xs font-bold text-gray-700 uppercase">Histórico de Pendências deste Item</h3>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={exibirFinalizadas} onChange={e => setExibirFinalizadas(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                                        <span className="text-[10px] text-gray-600 font-medium select-none">Exibir Finalizadas</span>
                                                    </label>
                                                </div>
                                                <span className="text-xs text-gray-500">{pendenciasExibidas.length} registro(s)</span>
                                            </div>
                                            <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-end">
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 1</label>
                                                    <input type="text" value={searchQuery1} onChange={e => setSearchQuery1(e.target.value)}
                                                        placeholder="Buscar na descrição..."
                                                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:outline-none" />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 2</label>
                                                    <input type="text" value={searchQuery2} onChange={e => setSearchQuery2(e.target.value)}
                                                        placeholder="Buscar na descrição..."
                                                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:outline-none" />
                                                </div>
                                                <button type="button" onClick={() => { setSearchQuery1(''); setSearchQuery2(''); }}
                                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded border border-gray-300 flex items-center gap-1 transition-colors">
                                                    <X size={14} /> Limpar Filtros
                                                </button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {loadingPendencias ? (
                                                    <div className="p-4 flex justify-center text-gray-500"><Loader2 size={20} className="animate-spin" /></div>
                                                ) : pendenciasHistorico.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">Nenhuma pendência anterior encontrada para este item.</div>
                                                ) : (
                                                    <table className="w-full text-left text-xs text-gray-600">
                                                        <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 shadow-sm text-gray-500 font-semibold">
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
                                                        <tbody className="divide-y divide-gray-100">
                                                            {pendenciasExibidas.map((p: any) => (
                                                                <tr key={p.IDRNC} onClick={() => loadPendenciaForEditOS(p)} className="hover:bg-amber-50/50 cursor-pointer transition-colors">
                                                                    <td className="px-2 py-1 flex items-center justify-center" title={p.ST === 'PENDENCIA' ? 'Pendente' : 'Finalizada'}>
                                                                        {p.ST === 'PENDENCIA' ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle size={14} className="text-green-500" />}
                                                                    </td>
                                                                    <td className="px-2 py-1 text-center font-medium bg-gray-50">{p.IDRNC}</td>
                                                                    <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>
                                                                    <td className="px-2 py-1 bg-gray-50 text-center">{p.IdOrdemServico}</td>
                                                                    <td className="px-2 py-1 bg-gray-50 text-center">{p.IdOrdemServicoItem}</td>
                                                                    <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>
                                                                    <td className="px-2 py-1 truncate max-w-[100px]" title={p.Tag}>{p.Tag}</td>
                                                                    <td className="px-2 py-1 truncate max-w-[120px]" title={p.DescResumo}>{p.DescResumo}</td>
                                                                    <td className="px-2 py-1 truncate max-w-[150px]" title={p.DescDetal}>{p.DescDetal}</td>
                                                                    <td className="px-2 py-1 text-center bg-gray-50">{p.Espessura}</td>
                                                                    <td className="px-2 py-1 truncate max-w-[120px]" title={p.MaterialSW}>{p.MaterialSW}</td>
                                                                    <td className="px-2 py-1 text-gray-800 text-[11px] leading-tight">{p.DescricaoPendencia}</td>
                                                                    <td className="px-2 py-1 font-medium bg-gray-50">{p.SetorResponsavel || '-'}</td>
                                                                    <td className="px-2 py-1 font-medium">{p.Colaborador}</td>
                                                                    <td className="px-2 py-1">{p.DataCriacao}</td>
                                                                    <td className="px-2 py-1 bg-gray-50">{p.DataExecucao}</td>
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
                            <div className="px-6 py-4 bg-gray-50 flex gap-3 flex-shrink-0 justify-end border-t border-gray-200 rounded-b-xl">
                                <button onClick={handleNovaPendenciaOS}
                                    className="px-6 py-2 rounded text-red-600 bg-white border border-red-200 hover:bg-red-50 font-medium transition-colors">
                                    Novo
                                </button>
                                <button onClick={() => setPendenciaModalOpen(false)}
                                    className="px-6 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors">
                                    Fechar
                                </button>
                                <button onClick={handleSubmitPendenciaOS} disabled={submittingPendencia}
                                    className={`px-6 py-2 rounded font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                                        submittingPendencia ? 'bg-red-400 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-700 shadow-sm'
                                    }`}>
                                    {submittingPendencia
                                        ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                                        : <><AlertTriangle size={16} /> Salvar</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
