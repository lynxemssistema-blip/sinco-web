import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronRight, ChevronDown, ClipboardList, Eye,
    Loader2, RefreshCw, Box, CheckCircle, Clock, XCircle, User, Calendar, Settings2, FileText, FolderOpen,
    Filter, Layers, X, ArrowLeft, Trash2, Flag, RotateCcw, Hash, Copy
} from 'lucide-react';
import { ProgressBar } from '../components/ordem-servico/ProgressBar';
import { SetorDatas } from '../components/ordem-servico/SetorDatas';
import { useToast } from '../contexts/ToastContext';
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
    NumeroOPOmie?: string;
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
    // Data state
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [expandedOrdens, setExpandedOrdens] = useState<Set<number>>(new Set());
    const [selectedOSId, setSelectedOSId] = useState<number | null>(null);
    const [ordensItens, setOrdensItens] = useState<Record<number, OrdemServicoItem[]>>({});
    const [loadingItens, setLoadingItens] = useState<Set<number>>(new Set());
    const [liberandoOS, setLiberandoOS] = useState<number | null>(null);

    // Modal Clone Inter-Projetos
    const [showModalClonar, setShowModalClonar] = useState<OrdemServico | null>(null);
    const [cloneDescricao, setCloneDescricao] = useState('');
    const [cloneFator, setCloneFator] = useState(1);
    const [cloneProjetoId, setCloneProjetoId] = useState<number | string>('');
    const [cloneTagId, setCloneTagId] = useState<number | string>('');
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const { addToast } = useToast();

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
            if (!mostrarTodos) params.set('filter', 'liberados');
            else params.set('filter', 'todos');
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
    }, [projetoFilter, tagFilter, mostrarTodos]);

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
    
    const handleLiberarOS = async (os: OrdemServico) => {
        if (os.Fator === 0 || os.Fator === '0' || os.Fator == null) {
            addToast({ type: 'error', title: 'Erro', message: 'O fator da Ordem de Serviço não pode ser 0 ou nulo para liberação.' });
            return;
        }

        const tipoLiberacao = window.prompt("Digite 'Total' ou 'Parcial' para confirmar o tipo de liberação:");
        if (!tipoLiberacao || (tipoLiberacao.toLowerCase() !== 'total' && tipoLiberacao.toLowerCase() !== 'parcial')) {
            addToast({ type: 'error', title: 'Atenção', message: 'Liberação cancelada. É necessário informar Total ou Parcial.' });
            return;
        }

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
                    Fator: os.Fator,
                    EnderecoOrdemServico: os.EnderecoOrdemServico,
                    TipoLiberacao: tipoLiberacao.toLowerCase() === 'total' ? 'Total' : 'Parcial'
                })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: `Ordem de Serviço ${os.IdOrdemServico} liberada! (${tipoLiberacao})` });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: 'S', OrdemServicoFinalizado: 'C' } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao liberar Ordem de Serviço.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
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


    
    
    const handleOpenClonarOS = (os: OrdemServico) => {
        setCloneDescricao(os.Descricao || '');
        setCloneFator(1);
        setCloneProjetoId(os.IdProjeto || '');
        setCloneTagId(os.IdTag || '');
        setShowModalClonar(os);
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
                                    onClick={() => handleCancelarLiberacao(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Cancelar Liberação Engenharia"
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
                                            <span className="w-12 text-center" title="Fator Multiplicador">Fator</span>
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

                    {/* Mostrar Todos */}
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
        </div>
    );
}
