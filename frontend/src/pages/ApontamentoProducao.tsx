import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, RefreshCw, Loader2, FileText, CheckCircle, Clock, X, ArrowLeft,
    Scissors, Wrench, Flame, Paintbrush, Settings2, Plus, History, AlertCircle, Filter, XCircle, Star, Map,
    PenTool, Box, AlertTriangle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAppConfig } from '../contexts/AppConfigContext';

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

interface SelectOption {
    value: string;
    label: string;
}

type Setor = 'mapa' | 'corte' | 'dobra' | 'solda' | 'pintura' | 'montagem' | 'mapaproducao';

const setores: { id: Setor; label: string; icon: typeof Scissors; color: string }[] = [
    { id: 'mapa', label: 'Mapa', icon: Settings2, color: 'bg-gray-700' },
    { id: 'corte', label: 'Corte', icon: Scissors, color: 'bg-blue-500' },
    { id: 'dobra', label: 'Dobra', icon: Wrench, color: 'bg-purple-500' },
    { id: 'solda', label: 'Solda', icon: Flame, color: 'bg-orange-500' },
    { id: 'pintura', label: 'Pintura', icon: Paintbrush, color: 'bg-green-500' },
    { id: 'montagem', label: 'Montagem', icon: Settings2, color: 'bg-red-500' },
    { id: 'mapaproducao', label: 'Mapa Produção', icon: Map, color: 'bg-indigo-600' },
];

export default function ApontamentoProducaoPage() {
    const { addToast } = useToast();
    const { processosVisiveis, maxRegistros } = useAppConfig();
    // visibleSetores is derived from the global config (replaces per-component state)
    const visibleSetores: string[] = processosVisiveis;
    // filteredSetores: the tabs to show (always include 'mapa' + 'mapaproducao', filter sectors by config)
    const filteredSetores = setores.filter(s => s.id === 'mapa' || s.id === 'mapaproducao' || processosVisiveis.includes(s.id));
    const [setorAtivo, setSetorAtivo] = useState<Setor>('corte');
    const [itens, setItens] = useState<ApontamentoItem[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fromGlobal, setFromGlobal] = useState(false);
    const [showTabs, setShowTabs] = useState(true); // new state for tabs visibility

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [projetoFilter, setProjetoFilter] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    const [osFilter, setOsFilter] = useState('');
    const [clienteFilter, setClienteFilter] = useState('');
    const [itemFilter, setItemFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'concluido'>('todos');
    const [groupBy, setGroupBy] = useState<'os' | 'projeto' | 'tag' | 'cliente' | 'produto_principal'>('os');
    const checkPredecessorStatus = (item: ApontamentoItem, currentSetor: Setor) => {
        if (currentSetor === 'mapa' || currentSetor === 'mapaproducao') return { allowed: true };
        
        // Se já existe saldo a executar no setor atual (visão por setor), permite apontar independente do predecessor
        if ((item as any).TotalExecutar > 0) return { allowed: true };
        
        const sequence: Setor[] = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
        const currentIndex = sequence.indexOf(currentSetor);
        
        if (currentIndex <= 0) return { allowed: true }; // Primeiro setor ou não mapeado

        // Buscar o predecessor ativo mais próximo
        for (let i = currentIndex - 1; i >= 0; i--) {
            const pred = sequence[i];
            const isActive = 
                (pred === 'corte' && item.txtCorte === '1') ||
                (pred === 'dobra' && item.txtDobra === '1') ||
                (pred === 'solda' && item.txtSolda === '1') ||
                (pred === 'pintura' && item.txtPintura === '1') ||
                (pred === 'montagem' && item.TxtMontagem === '1');

            if (isActive) {
                const totalExec = 
                    (pred === 'corte' && (item.CorteTotalExecutado || 0)) ||
                    (pred === 'dobra' && (item.DobraTotalExecutado || 0)) ||
                    (pred === 'solda' && (item.SoldaTotalExecutado || 0)) ||
                    (pred === 'pintura' && (item.PinturaTotalExecutado || 0)) ||
                    (pred === 'montagem' && (item.MontagemTotalExecutado || 0)) || 0;

                return { 
                    allowed: totalExec > 0, 
                    predecessor: pred.charAt(0).toUpperCase() + pred.slice(1) 
                };
            }
        }

        return { allowed: true };
    };

    const [showFilters, setShowFilters] = useState(false);

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ApontamentoItem | null>(null);
    const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [qtdeApontar, setQtdeApontar] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [confirmingMapa, setConfirmingMapa] = useState(false);
    const [modalSetor, setModalSetor] = useState<Setor>('mapa');
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    // Reposicao Modal
    const [reposicaoModalOpen, setReposicaoModalOpen] = useState(false);
    const [qtdeReposicao, setQtdeReposicao] = useState('');
    const [motivoReposicao, setMotivoReposicao] = useState('');
    const [submittingReposicao, setSubmittingReposicao] = useState(false);

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
            // Wait for loadPendenciaForEdit to be available (it is defined below, so we might need to duplicate its essential parts or just use it if it's hoisted. Wait, const arrows are not hoisted!)
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

    // Config for visible sectors
    useEffect(() => {
        fetch(`${API_BASE}/config`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.config.ProcessosVisiveis) {
                    try {
                        const visible = JSON.parse(data.config.ProcessosVisiveis);
                        setVisibleSetores(visible);
                        // If current active sector is not visible, switch to first visible one or mapa
                        if (!visible.includes(setorAtivo) && setorAtivo !== 'mapa') {
                            setSetorAtivo('mapa');
                        }
                    } catch (e) {
                        console.error('Error parsing visible sectors', e);
                        setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']);
                    }
                } else {
                    // Default all visible
                    setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']);
                }
            })
            .catch(() => setVisibleSetores(['corte', 'dobra', 'solda', 'pintura', 'montagem']));
    }, []);

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
            setSearchTerm(openOs);
        }
        if (openItem) {
            setItemFilter(openItem);
            setSearchTerm(openItem);
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
            if (searchTerm) params.set('search', searchTerm);
            if (itemFilter) params.set('item', itemFilter);
            if (statusFilter !== 'todos') params.set('status', statusFilter);

            // Use different route for mapa
            const url = setorAtivo === 'mapa'
                ? `${API_BASE}/apontamento/mapa/producao?${params}`
                : `${API_BASE}/apontamento/${setorAtivo}?${params}`;

            const res = await fetch(url, { signal: controller.signal });
            const json = await res.json();

            if (json.success) {
                setItens(json.data);
            } else {
                setError(json.message || 'Erro ao carregar itens');
            }
        } catch (err: any) {
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
    }, [setorAtivo, projetoFilter, tagFilter, osFilter, searchTerm, statusFilter, itemFilter, clienteFilter]);

    const handleCancelLoad = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setError('O carregamento foi cancelado pelo usuário.');
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchItens(), 300);
        return () => {
            clearTimeout(timer);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchItens]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setProjetoFilter('');
        setTagFilter('');
        setOsFilter('');
        setItemFilter('');
        setStatusFilter('todos');
        setClienteFilter('');
    }, []);

    // Check if any filter is active
    const hasActiveFilters = searchTerm || projetoFilter || tagFilter || osFilter || itemFilter || clienteFilter || statusFilter !== 'todos';

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
        } catch (err) {
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
        } catch (err) {
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
            const res = await fetch(`${API_BASE}/apontamento`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    IdOrdemServicoItem: selectedItem.IdOrdemServicoItem,
                    IdOrdemServico: selectedItem.IdOrdemServico,
                    Processo: modalSetor,
                    QtdeProduzida: qProduzir,
                    CriadoPor: 'Edson' // In a real app, this would be the logged user
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
        } catch (err) {
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
                addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Reposição gerada com sucesso!' });
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar reposição' });
            }
        } catch (err) {
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
                } catch (e) { } finally { setLoadingPendencias(false); }

                // Removed handleNovaPendencia to keep user on the same screen (Rule 4)
                if (!idRncEdicao) {
                    // Se for insert, apenas atualize para o ID novo (simulação ou apenas permita novo insert mantendo tela)
                    // Na verdade, ao invés de limpar tudo, ele continua na tela. 
                }
                fetchItens();
                addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Operação realizada com sucesso.' });
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar pendência.' });
            }
        } catch (err) {
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
        } catch (error) {
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
    }, [searchQuery1, searchQuery2, pendenciaModalOpen]);

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
            } catch(e) {}
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

    return (
        <div className="space-y-4">
            {!fromGlobal ? (
                <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        {fromGlobal && (
                            <button
                                onClick={() => window.location.href = '/visao-geral-pendencias'}
                                className="flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#32423D] transition-colors"
                                title="Voltar para Todas as Pendências"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h1 className="text-2xl font-bold text-[#32423D] flex items-center gap-2">
                            Apontamento de Produção
                            <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter">PATCH 1.4</span>
                        </h1>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">Registre a produção por setor</p>
                </div>
                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowTabs(!showTabs)}
                        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        title="Ocultar/Visualizar Abas de Setor"
                    >
                        {showTabs ? <X size={18} /> : <Settings2 size={18} />}
                        <span className="hidden sm:inline">{showTabs ? 'Ocultar Abas' : 'Mostrar Abas'}</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${showFilters || hasActiveFilters
                            ? 'border-[#E0E800] bg-[#E0E800]/10 text-[#32423D]'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Filter size={18} />
                        Filtros
                        {hasActiveFilters && (
                            <span className="w-2 h-2 rounded-full bg-[#E0E800]" />
                        )}
                    </motion.button>
                    <div className="flex flex-col items-end mr-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Limite de Leitura</span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shadow-sm">{maxRegistros || 300} itens</span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchItens}
                        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </motion.button>
                </div>
            </div>

            {/* Setor Tabs */}
            <AnimatePresence>
                {showTabs && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden"
                    >
                        <div className="flex flex-wrap gap-2">
                            {filteredSetores.map((setor) => {
                                const Icon = setor.icon;
                                const isActive = setorAtivo === setor.id;
                                return (
                                    <motion.button
                                        key={setor.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSetorAtivo(setor.id)}
                                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-medium transition-all text-sm ${isActive
                                            ? `${setor.color} text-white shadow-lg`
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {setor.label}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-hidden"
                    >
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Search */}
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="OS, código, plano corte, descrição, espessura, material..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                                        />
                                    </div>
                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm('')} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 bg-white shadow-sm transition-colors" title="Limpar pesquisa">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Projeto Filter */}
                            <div className="min-w-[150px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Projeto</label>
                                <input
                                    type="text"
                                    placeholder="Digite o projeto..."
                                    value={projetoFilter}
                                    onChange={(e) => { setProjetoFilter(e.target.value); setTagFilter(''); setOsFilter(''); }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                                />
                            </div>

                            {/* Tag Filter */}
                            <div className="min-w-[150px]">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tag</label>
                                <input
                                    type="text"
                                    placeholder="Digite a tag..."
                                    value={tagFilter}
                                    onChange={(e) => { setTagFilter(e.target.value); setOsFilter(''); }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50"
                                />
                            </div>

                            {/* OS Filter */}
                            <div className="min-w-[120px]">
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Ordem de Serviço</label>
                                <input
                                    type="text"
                                    placeholder="Digite a OS..."
                                    value={osFilter}
                                    onChange={(e) => setOsFilter(e.target.value)}
                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
                                />
                            </div>

                            {/* Item Filter */}
                            <div className="min-w-[80px]">
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Item ID</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 123"
                                    value={itemFilter}
                                    onChange={(e) => setItemFilter(e.target.value)}
                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
                                />
                            </div>

                            {/* Cliente Filter */}
                            <div className="min-w-[120px]">
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Cliente</label>
                                <input
                                    type="text"
                                    placeholder="Digite o cliente..."
                                    value={clienteFilter}
                                    onChange={(e) => setClienteFilter(e.target.value)}
                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#E0E800]/50"
                                />
                            </div>

                            {/* Group By */}
                            <div className="min-w-[120px]">
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Agrupar Por</label>
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as any)}
                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white text-xs font-bold text-blue-700 bg-blue-50 border-blue-200"
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
                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white text-xs"
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
                                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <XCircle size={16} />
                                    Limpar
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"
                >
                    <AlertCircle size={18} />
                    {error}
                </motion.div>
            )}

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                {/* Primary Table Header - Movido para dentro do container com sticky */}
                {!loading && itens.length > 0 && setorAtivo !== 'mapa' && (
                    <div className="bg-gray-100 px-2 py-1.5 flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase sticky top-0 z-20 border-b border-gray-200 shadow-sm">
                        <span className="w-5"></span>
                        <span className="w-6">PDF</span>
                        <span className="w-10 text-center">OS</span>
                        <span className="w-28">Info</span>
                        <span className="w-12 text-center">Item</span>
                        <span className="min-w-[100px]">Código</span>
                        <span className="w-20">Plano Corte</span>
                        <span className="w-28">Material</span>
                        <span className="w-12 text-center">Esp.</span>
                        <span className="flex-1">Descrição</span>
                        <span className="w-10 text-center">Qt</span>
                        <span className="w-14 text-center">Prod.</span>
                        <span className="w-12 text-center">%</span>
                        <span className="w-56 text-right pr-2">Ação</span>
                    </div>
                )}

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4 text-gray-400">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">Carregando itens do setor {setorInfo.label}...</p>
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
                            <p className="text-sm text-gray-500">
                                Não há itens pendentes para o setor <span className="font-bold text-[#32423D]">{setorInfo.label}</span>.
                            </p>
                            <p className="text-xs text-gray-400 mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
                                Certifique-se de que os filtros estão corretos ou se as etapas anteriores da produção já foram concluídas para liberar saldo para este setor.
                            </p>
                        </div>
                    </div>
                ) : setorAtivo === 'mapa' ? (
                    /* Mapa da Produção View */
                    <div>
                        {/* Mapa Header */}
                        <div className="bg-gray-100 px-2 py-1 flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase sticky top-0 z-20 border-b border-gray-200">
                            <span className="w-10 text-center">OS</span>
                            <span className="w-28">Info</span>
                            <span className="w-12 text-center">Item</span>
                            <span className="min-w-[100px]">Código</span>
                            <span className="w-20">Plano Corte</span>
                            <span className="w-28">Material</span>
                            <span className="flex-1">Descrição</span>
                            <span className="w-10 text-center">Qt</span>
                            {visibleSetores.includes('corte') && <span className="w-14 text-center bg-blue-100 rounded py-0.5">Corte</span>}
                            {visibleSetores.includes('dobra') && <span className="w-14 text-center bg-purple-100 rounded py-0.5">Dobra</span>}
                            {visibleSetores.includes('solda') && <span className="w-14 text-center bg-orange-100 rounded py-0.5">Solda</span>}
                            {visibleSetores.includes('pintura') && <span className="w-14 text-center bg-green-100 rounded py-0.5">Pintura</span>}
                            {visibleSetores.includes('montagem') && <span className="w-14 text-center bg-red-100 rounded py-0.5">Montag.</span>}
                            <span className="w-16 text-center">Ação</span>
                        </div>

                        {/* Mapa Items */}
                        <div className="divide-y divide-gray-100">
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
                                            ? 'bg-blue-50 border-blue-600 shadow-inner'
                                            : 'hover:bg-gray-50 border-transparent'
                                            }`}
                                    >
                                        <span className="w-10 text-center font-bold text-[#32423D] bg-blue-100 px-0.5 py-0.5 rounded text-[10px]">
                                            {item.IdOrdemServico}
                                        </span>

                                        {/* Info Column */}
                                        <div className="w-28 flex flex-col gap-0 text-[9px]">
                                            <span className="truncate font-bold text-blue-700 bg-blue-50 px-1 rounded-sm" title={item.Projeto}>{item.Projeto}</span>
                                            <span className="truncate text-purple-700 bg-purple-50 px-1 rounded-sm" title={item.Tag}>{item.Tag}</span>
                                            {item.Cliente && <span className="truncate text-gray-600 bg-gray-50 px-1 rounded-sm uppercase" title={item.Cliente}>{item.Cliente}</span>}
                                        </div>

                                        <span className="w-12 text-center text-gray-400 text-[9px]">
                                            #{item.IdOrdemServicoItem}
                                        </span>
                                        <span className="min-w-[100px] text-[10px] font-black text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                                            {item.CodMatFabricante || '-'}
                                        </span>
                                        <span className="w-20 text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded truncate">
                                            {item.PlanoCorte || '-'}
                                        </span>
                                        <span className="w-28 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate">
                                            {item.MaterialSW || '-'}
                                        </span>
                                        <span className="flex-1 text-gray-700 truncate text-[10px]">
                                            {item.DescResumo || '-'}
                                        </span>
                                        <span className="w-10 text-center font-black text-[#32423D] text-[11px]">
                                            {item.QtdeTotal}
                                        </span>

                                        {/* Status cells for each process */}
                                        {visibleSetores.includes('corte') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSetorAtivo('corte'); openModal(item, 'corte'); }}
                                                disabled={corteStatus.pct >= 100 || item.txtCorte !== '1'}
                                                className={`w-14 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${corteStatus.bg} ${corteStatus.color}`}
                                            >
                                                {corteStatus.text}
                                            </button>
                                        )}
                                        {visibleSetores.includes('dobra') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSetorAtivo('dobra'); openModal(item, 'dobra'); }}
                                                disabled={dobraStatus.pct >= 100 || item.txtDobra !== '1'}
                                                className={`w-14 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${dobraStatus.bg} ${dobraStatus.color}`}
                                            >
                                                {dobraStatus.text}
                                            </button>
                                        )}
                                        {visibleSetores.includes('solda') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSetorAtivo('solda'); openModal(item, 'solda'); }}
                                                disabled={soldaStatus.pct >= 100 || item.txtSolda !== '1'}
                                                className={`w-14 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${soldaStatus.bg} ${soldaStatus.color}`}
                                            >
                                                {soldaStatus.text}
                                            </button>
                                        )}
                                        {visibleSetores.includes('pintura') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSetorAtivo('pintura'); openModal(item, 'pintura'); }}
                                                disabled={pinturaStatus.pct >= 100 || item.txtPintura !== '1'}
                                                className={`w-14 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${pinturaStatus.bg} ${pinturaStatus.color}`}
                                            >
                                                {pinturaStatus.text}
                                            </button>
                                        )}
                                        {visibleSetores.includes('montagem') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSetorAtivo('montagem'); openModal(item, 'montagem'); }}
                                                disabled={montagemStatus.pct >= 100 || item.TxtMontagem !== '1'}
                                                className={`w-14 text-center text-[9px] font-black py-0.5 rounded transition-transform hover:scale-105 active:scale-95 disabled:hover:scale-100 ${montagemStatus.bg} ${montagemStatus.color}`}
                                            >
                                                {montagemStatus.text}
                                            </button>
                                        )}
                                        {/* Mapa Action Button */}
                                        {(() => {
                                            const allDone = (!passaCorte || corteStatus.pct >= 100) &&
                                                (!passaDobra || dobraStatus.pct >= 100) &&
                                                (!passaSolda || soldaStatus.pct >= 100) &&
                                                (!passaPintura || pinturaStatus.pct >= 100) &&
                                                (!passaMontagem || montagemStatus.pct >= 100);

                                            return allDone ? (
                                                <div className="w-16 flex items-center justify-center gap-1 px-1 py-1 rounded bg-green-50 text-green-600 text-[10px] font-black ml-1 border border-green-200">
                                                    <CheckCircle size={10} />
                                                    OK
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSetorAtivo('mapa'); openModal(item, 'mapa'); }}
                                                    className={`w-16 flex items-center justify-center gap-1 px-1 py-1 rounded bg-[#32423D] text-white text-[10px] font-bold hover:bg-[#32423D]/90 ml-1 transition-all active:scale-95`}
                                                >
                                                    <Plus size={10} />
                                                    Apontar
                                                </button>
                                            );
                                        })()}
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
                                <div className={`px-4 py-1 sticky top-0 z-10 ${setorInfo.color} text-white flex items-center justify-between shadow-sm`}>
                                    <span className="font-medium text-sm">{groupKey}</span>
                                    <span className="text-xs opacity-80">{items.length} itens</span>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-gray-100">
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
                                                    ? 'bg-blue-50 border-blue-600 shadow-inner'
                                                    : 'hover:bg-gray-50 border-transparent'
                                                    }`}
                                            >
                                                {/* Status Icon */}
                                                <div className="w-5 flex-shrink-0">
                                                    {concluido ? (
                                                        <CheckCircle size={14} className="text-green-500" />
                                                    ) : (
                                                        <Clock size={14} className="text-yellow-500" />
                                                    )}
                                                </div>

                                                {/* PDF / Arquivos (Indicador estático) */}
                                                <div className="w-6 flex-shrink-0">
                                                    {item.EnderecoArquivo ? (
                                                        <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-50 text-blue-600 cursor-default" title="Clique para arquivos">
                                                            <FileText size={11} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded flex items-center justify-center bg-gray-50 text-gray-300">
                                                            <FileText size={11} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* OS Number */}
                                                <span className="w-10 text-center font-bold text-[#32423D] bg-blue-100 px-0.5 py-0.5 rounded text-[10px]">
                                                    {item.IdOrdemServico}
                                                </span>

                                                {/* Info Column */}
                                                <div className="w-28 flex flex-col gap-0 text-[8px]">
                                                    <span className="truncate font-bold text-blue-700 bg-blue-50 px-1 rounded-sm" title={item.Projeto}>{item.Projeto}</span>
                                                    <span className="truncate text-purple-700 bg-purple-50 px-1 rounded-sm" title={item.Tag}>{item.Tag}</span>
                                                    {item.Cliente && <span className="truncate text-gray-600 bg-gray-50 px-1 rounded-sm uppercase" title={item.Cliente}>{item.Cliente}</span>}
                                                </div>

                                                {/* Item ID */}
                                                <span className="w-12 text-center text-gray-400 text-[9px]">
                                                    #{item.IdOrdemServicoItem}
                                                </span>

                                                {/* Código */}
                                                <span className="min-w-[100px] text-[10px] font-black text-[#32423D] bg-[#E0E800]/20 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                    {item.CodMatFabricante || '-'}
                                                </span>

                                                {/* Plano de Corte */}
                                                <span className="w-20 text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded truncate">
                                                    {item.PlanoCorte || '-'}
                                                </span>
                                                <span className="w-28 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate">
                                                    {item.MaterialSW || '-'}
                                                </span>

                                                {/* Espessura */}
                                                <span className="w-12 text-center text-[10px] text-gray-600">
                                                    {item.Espessura || '-'}
                                                </span>

                                                {/* Descrição */}
                                                <span className="flex-1 text-gray-700 truncate text-[10px]">
                                                    {item.DescResumo || '-'}
                                                </span>

                                                {/* Quantidade Total */}
                                                <div className="w-10 text-center">
                                                    <span className="font-black text-[#32423D]">{qtdeTotal}</span>
                                                </div>

                                                {/* Produzido */}
                                                <div className="w-14 text-center">
                                                    <span className={`font-bold text-[10px] ${concluido ? 'text-green-600' : 'text-gray-600'}`}>
                                                        {qtdeProduzida}/{qtdeTotal}
                                                    </span>
                                                </div>

                                                {/* Progress */}
                                                <div className="w-12">
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
                                                <div className="flex gap-1 items-center justify-end w-56 pr-2">
                                                    {/* File Icons on Selected Line */}
                                                    {selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem && (
                                                        <div className="flex gap-0.5 mr-1.5">
                                                            {item.EnderecoArquivo && (
                                                                <>
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
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`${API_BASE}/download?path=${encodeURIComponent(item.EnderecoArquivo || '')}&type=dxf`, '_blank');
                                                                        }}
                                                                        className="flex items-center justify-center p-1 bg-gray-100 text-gray-600 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors border border-gray-200"
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
                                                    )}

                                                    {/* Additional Icons on Selected Line */}
                                                    {selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem && (
                                                        <div className="flex gap-0.5 mr-1.5 border-l border-gray-200 pl-1">
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

                                                                    // Fetch history for RNC grid
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
                                                    )}

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            selectItem(item);
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="Histórico"
                                                    >
                                                        <History size={14} />
                                                    </button>

                                                    {(() => {
                                                        const { allowed, predecessor } = checkPredecessorStatus(item, setorAtivo as Setor);
                                                        return concluido ? (
                                                            <div className="w-16 flex items-center justify-center gap-1 px-1 py-1 rounded bg-green-50 text-green-600 text-[10px] font-black border border-green-200">
                                                                <CheckCircle size={10} />
                                                                OK
                                                            </div>
                                                        ) : (
                                                            <button
                                                                disabled={!allowed}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openModal(item, setorAtivo as any);
                                                                }}
                                                                className={`w-16 flex items-center justify-center gap-0.5 px-1 py-1 rounded text-[10px] font-bold transition-all shadow-sm ml-1 ${
                                                                    !allowed 
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                                                        : `${setorInfo.color} text-white hover:opacity-90 active:scale-95`
                                                                }`}
                                                                title={!allowed ? `Aguardando setor ${predecessor}` : 'Apontar'}
                                                            >
                                                                {!allowed ? (
                                                                    <Clock size={10} />
                                                                ) : (
                                                                    <Plus size={10} />
                                                                )}
                                                                {allowed ? 'Apontar' : 'Bloq.'}
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Detalhes / Histórico Panel */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                        >
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                        <History size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#32423D]">Histórico de Todo o Item</h3>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-tighter">OS {selectedItem.IdOrdemServico} " ITEM #{selectedItem.IdOrdemServicoItem}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 bg-white">
                                {loadingDetails ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 size={32} className="animate-spin text-blue-600" />
                                        <p className="text-xs text-gray-400 animate-pulse font-medium">Carregando histórico completo...</p>
                                    </div>
                                ) : itemDetails && itemDetails.historico.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-inner max-h-[400px]">
                                        <table className="w-full text-left border-collapse bg-white">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-gray-100 text-[10px] uppercase tracking-wider font-bold text-gray-600 border-b border-gray-200">
                                                    <th className="px-3 py-2">ID</th>
                                                    <th className="px-3 py-2">Criado</th>
                                                    <th className="px-3 py-2">Data / Hora</th>
                                                    <th className="px-3 py-2">Cód. Fabrica</th>
                                                    <th className="px-2 py-2 text-center">Qt. T.</th>
                                                    <th className="px-2 py-2 text-center">Qt. P.</th>
                                                    <th className="px-2 py-2 text-center">Qt. F.</th>
                                                    {processosVisiveis.includes('corte') && <th className="px-2 py-2 text-center" title="Corte">Cor.</th>}
                                                    {processosVisiveis.includes('dobra') && <th className="px-2 py-2 text-center" title="Dobra">Dob.</th>}
                                                    {processosVisiveis.includes('solda') && <th className="px-2 py-2 text-center" title="Solda">Sol.</th>}
                                                    {processosVisiveis.includes('pintura') && <th className="px-2 py-2 text-center" title="Pintura">Pin.</th>}
                                                    {processosVisiveis.includes('montagem') && <th className="px-2 py-2 text-center" title="Montagem">Mon.</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {itemDetails.historico.map((h: any) => (
                                                    <tr key={h.idordemservicoitemControle} className="hover:bg-blue-50/30 transition-colors">
                                                        <td className="px-3 py-2 text-[10px] text-gray-500">{h.idordemservicoitemControle}</td>
                                                        <td className="px-3 py-2 text-[10px] text-gray-700 truncate max-w-[80px]" title={h.CriadoPor}>{h.CriadoPor}</td>
                                                        <td className="px-3 py-2 text-[10px] font-medium text-gray-500 whitespace-nowrap">{formatDate(h.DataCriacao)}</td>
                                                        <td className="px-3 py-2 text-[10px] font-bold text-[#32423D] bg-yellow-50">{h.Codmatfabricante || '-'}</td>
                                                        <td className="px-2 py-2 text-[10px] font-bold text-[#32423D] text-center">{h.QtdeTotal}</td>
                                                        <td className="px-2 py-2 text-[10px] font-bold text-blue-600 text-center">{h.QtdeProduzida}</td>
                                                        <td className="px-2 py-2 text-[10px] font-bold text-red-600 text-center">{h.QtdeFaltante}</td>
                                                        {processosVisiveis.includes('corte') && <td className="px-2 py-2 text-[10px] text-center font-bold">{h.txtCorte || ''}</td>}
                                                        {processosVisiveis.includes('dobra') && <td className="px-2 py-2 text-[10px] text-center font-bold">{h.txtDobra || ''}</td>}
                                                        {processosVisiveis.includes('solda') && <td className="px-2 py-2 text-[10px] text-center font-bold">{h.txtSolda || ''}</td>}
                                                        {processosVisiveis.includes('pintura') && <td className="px-2 py-2 text-[10px] text-center font-bold">{h.txtPintura || ''}</td>}
                                                        {processosVisiveis.includes('montagem') && <td className="px-2 py-2 text-[10px] text-center font-bold">{h.txtMontagem || ''}</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                                            <AlertCircle size={24} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-500">Sem histórico de movimentação</p>
                                        <p className="text-xs text-gray-400 max-w-[200px] mt-1">Este item ainda não possui registros de produção em nenhum setor.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </>
            ) : (
                <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-blue-100">
                        <AlertTriangle size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#32423D] mb-2 tracking-tight">Log de Pendência (Mapa)</h2>
                    <p className="text-gray-500 mb-8 max-w-md text-center text-sm leading-relaxed">
                        A janela de histórico e edição da pendência está aberta automaticamente. Quando finalizar sua consulta, feche o modal da pendência e clique no botão abaixo para retornar.
                    </p>
                    <button
                        onClick={() => window.location.href = '/visao-geral-pendencias'}
                        className="group flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all font-medium shadow-sm active:scale-95 z-10"
                    >
                        <ArrowLeft size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        Voltar para Todas as Pendências
                    </button>
                    
                    {/* Decoration elements */}
                    <div className="absolute top-10 right-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className={`px-4 py-2 flex items-center justify-between ${modalSetor === 'mapa' ? 'bg-blue-600' : setorInfo.color} text-white`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg">
                                        {modalSetor === 'mapa' ? <CheckCircle size={18} /> : (setorInfo.icon ? <setorInfo.icon size={18} /> : <Settings2 size={18} />)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-tight">
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
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {loadingDetails ? (
                                    <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
                                        <Loader2 size={24} className="animate-spin" />
                                        <p className="text-sm">Carregando detalhes...</p>
                                    </div>
                                ) : itemDetails ? (
                                    <div className="space-y-4">
                                        {/* Item Info */}
                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
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
                                                    <span className="font-black text-purple-700">{(itemDetails.item as any).PlanoCorte || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-0.5">
                                                    <span className="text-gray-400 font-medium">Projeto:</span>
                                                    <span className="font-bold flex-1 text-right truncate ml-2 text-blue-700">{itemDetails.item.Projeto}</span>
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
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <span className="text-xs font-semibold text-gray-500 mb-2 block">Arquivos do Item:</span>
                                                    <div className="flex gap-2">
                                                        {itemDetails.item.EnderecoArquivo && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const pdfUrl = `${API_BASE}/pdf?path=${encodeURIComponent(itemDetails.item.EnderecoArquivo || '')}`;
                                                                        window.open(pdfUrl, '_blank');
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs font-bold border border-red-100"
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
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-xs font-bold border border-blue-100"
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
                                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs font-bold border border-gray-200"
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
                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm">
                                                        <Settings2 size={14} />
                                                    </span>
                                                    <span className="text-xs font-black text-blue-800 uppercase tracking-tighter">Próximo Setor:</span>
                                                </div>
                                                <span className="text-xs font-black text-blue-900 bg-white px-2 py-1 rounded shadow-sm border border-blue-100 uppercase tracking-wider">
                                                    {(() => {
                                                        const sequence = [
                                                            { id: 'corte', field: 'txtCorte', label: 'Corte' },
                                                            { id: 'dobra', field: 'txtDobra', label: 'Dobra' },
                                                            { id: 'solda', field: 'txtSolda', label: 'Solda' },
                                                            { id: 'pintura', field: 'txtPintura', label: 'Pintura' },
                                                            { id: 'montagem', field: 'TxtMontagem', label: 'Montagem' }
                                                        ];
                                                        const currentIndex = sequence.findIndex(s => s.id === modalSetor);
                                                        if (currentIndex === -1) return '-';
                                                        for (let i = currentIndex + 1; i < sequence.length; i++) {
                                                            const target = sequence[i];
                                                            if (itemDetails.item[target.field as keyof ApontamentoItem] === '1') {
                                                                return target.label;
                                                            }
                                                        }
                                                        return 'Finalizado';
                                                    })()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Progress */}
                                        <div className="bg-[#E0E800]/5 rounded-lg p-3 border border-[#E0E800]/20">
                                            <div className="flex justify-between mb-1.5">
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
                                            <div className="rounded-lg p-5 border bg-blue-50 border-blue-200 shadow-sm">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                                                        <CheckCircle size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-blue-900 uppercase">
                                                            Finalização Total (MAPA)
                                                        </h3>
                                                        <p className="text-xs text-blue-700">
                                                            Confirme para concluir todos os setores deste item.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white/60 rounded-md p-3 mb-4">
                                                    <p className="text-xs text-blue-800 font-medium mb-2">
                                                        Ações automáticas:
                                                    </p>
                                                    <ul className="text-[11px] text-blue-700 space-y-1 ml-4 list-disc">
                                                        <li>Aplica <strong>{itemDetails.item.QtdeTotal}</strong> em todos os setores</li>
                                                        <li>Zera o "Saldo a Executar" geral</li>
                                                        <li>Marca o Item como <strong>CONCLUÍDO (C)</strong></li>
                                                    </ul>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5 opacity-60">
                                                    {['CORTE', 'DOBRA', 'SOLDA', 'PINTURA', 'MONTAGEM'].map(s => (
                                                        <span key={s} className="px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-[9px] font-bold text-blue-700">
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Quantidade Input - Hidden in Mapa Mode */}
                                        {modalSetor !== 'mapa' && (
                                            <div className="pt-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">
                                                    Quantidade a Produzir
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={itemDetails.qtdeFaltante}
                                                        value={qtdeApontar}
                                                        onChange={(e) => setQtdeApontar(e.target.value)}
                                                        className="flex-1 px-3 py-2 text-xl font-black text-center rounded-lg border-2 border-gray-100 hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-gray-800"
                                                        placeholder="0"
                                                    />
                                                    {itemDetails.qtdeFaltante > 0 && (
                                                        <div className="flex flex-col gap-1 w-28">
                                                            <button
                                                                onClick={() => setQtdeApontar(String(itemDetails.qtdeFaltante))}
                                                                className="flex-1 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                                            >
                                                                Restante ({itemDetails.qtdeFaltante})
                                                            </button>
                                                            <button
                                                                onClick={() => setQtdeApontar('1')}
                                                                className="flex-1 py-1 text-[10px] font-bold bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                                            >
                                                                Unidade (1)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Histórico */}
                                        {itemDetails.historico.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-semibold text-[#32423D] mb-2">
                                                    <History size={14} />
                                                    Histórico de Apontamentos
                                                </div>
                                                <div className="max-h-32 overflow-y-auto space-y-1">
                                                    {itemDetails.historico.map((h) => (
                                                        <div key={h.IdOrdemServicoItemControle} className="flex justify-between text-xs bg-gray-50 px-3 py-2 rounded">
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
                            <div className="px-6 py-4 bg-gray-50 flex gap-3">
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
                                        : modalSetor === 'mapa' ? 'bg-blue-600 text-white shadow-lg' : `${setorInfo.color} text-white`
                                        }`}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Processando...
                                        </>
                                    ) : modalSetor === 'mapa' ? (
                                        <>
                                            <CheckCircle size={16} />
                                            Sim, Finalizar Tudo
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setHistoryModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
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
                                        <Loader2 size={40} className="animate-spin text-blue-600" />
                                        <p className="text-gray-500 animate-pulse">Carregando histórico...</p>
                                    </div>
                                ) : itemDetails && itemDetails.historico.length > 0 ? (
                                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                                                    <th className="px-4 py-3 border-b border-gray-100">Data</th>
                                                    <th className="px-4 py-3 border-b border-gray-100">Setor</th>
                                                    <th className="px-4 py-3 border-b border-gray-100">Qtd</th>
                                                    <th className="px-4 py-3 border-b border-gray-100">Usuário</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {itemDetails.historico.map((h) => (
                                                    <tr key={h.IdOrdemServicoItemControle} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-xs text-gray-600">{formatDate(h.DataCriacao)}</td>
                                                        <td className="px-4 py-3 text-xs">
                                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase text-[9px]">
                                                                {h.Processo || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-[#32423D]">
                                                            +{h.QtdeProduzida}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-500">
                                                            {h.CriadoPor}
                                                        </td>
                                                    </tr>
                                                ))}
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
                            <div className="px-6 py-4 bg-gray-50 flex justify-end">
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setReposicaoModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-amber-500 px-6 py-4 text-white">
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
                                    <button onClick={() => setReposicaoModalOpen(false)} className="p-1 rounded-full hover:bg-white/20">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4">
                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
                                    Esta ação irá criar um novo item de reposição idêntico a este, incluindo todos os sub-itens caso seja uma montagem, com a quantidade desejada.
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Quantidade de Reposição
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qtdeReposicao}
                                        onChange={(e) => setQtdeReposicao(e.target.value)}
                                        className="w-full px-4 py-3 text-lg font-bold text-center rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                        placeholder="Digite a quantidade..."
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Motivo (Opcional)
                                    </label>
                                    <textarea
                                        value={motivoReposicao}
                                        onChange={(e) => setMotivoReposicao(e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                        placeholder="Ex: Peça danificada..."
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 flex gap-3">
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
                                        <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                                    ) : (
                                        <><RefreshCw size={16} /> Confirmar</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Gerar Pendência */}
            <AnimatePresence>
                {pendenciaModalOpen && selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setPendenciaModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] xl:max-w-[1400px] flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-red-500 px-6 py-4 text-white flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={24} />
                                        <div>
                                            <h2 className="font-bold text-lg">Gerar Pendência (RNC)</h2>
                                        </div>
                                    </div>
                                    <button onClick={() => setPendenciaModalOpen(false)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body - Scrollable */}
                            <div className="p-6 overflow-y-auto space-y-6 w-full max-w-[1920px] mx-auto pb-20">
                                {/* Informações do Item (Read-only) grid */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">ID RNC</label>
                                        <div className="text-sm font-bold text-red-600 bg-white px-3 py-2 border border-red-200 rounded">{idRncEdicao ? `#${idRncEdicao}` : 'NOVA'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItem.IdOrdemServico}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.I.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItem.IdOrdemServicoItem}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cód. Mat. Fabric.</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItem.CodMatFabricante || '-'}</div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Projeto</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItem.Projeto || '-'}</div>
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tag</label>
                                        <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItem.Tag || '-'}</div>
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
                                            className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Sub Título</label>
                                        <input
                                            type="text"
                                            value={subTituloRnc}
                                            onChange={(e) => setSubTituloRnc(e.target.value)}
                                            readOnly={idRncEdicao !== null}
                                            className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                                            placeholder="Sub-título da RNC"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador</label>
                                        <select
                                            value={usuarioResponsavel}
                                            onChange={(e) => setUsuarioResponsavel(e.target.value)}
                                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500"
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
                                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500"
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
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white"
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
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white truncate"
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
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo RNC</label>
                                            <select
                                                value={tipoRnc}
                                                onChange={(e) => setTipoRnc(e.target.value)}
                                                className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500"
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
                                        className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                        placeholder="Descreva os detalhes da RNC/Pendência..."
                                        rows={4}
                                    />
                                </div>

                                {/* Processos */}
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-6 justify-center">
                                    {processosVisiveis.includes('corte') && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={chkCorteRnc} onChange={(e) => setChkCorteRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
                                            <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkCorteRnc ? 'text-blue-700 font-bold bg-blue-100' : 'text-gray-700 font-semibold'}`}><Scissors size={14} className={chkCorteRnc ? "text-blue-700" : "text-blue-500"} /> Corte</span>
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
                                            className="bg-green-100/80 px-4 py-3 border-b border-green-200 flex justify-between items-center cursor-pointer transition-colors hover:bg-green-200"
                                            onClick={() => setFinalizandoRnc(!finalizandoRnc)}
                                        >
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
                                                            <select value={setorFinalizacao} onChange={e => setSetorFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
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
                                                            <select value={colaboradorFinalizacao} onChange={e => setColaboradorFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
                                                                <option value="">Selecione...</option>
                                                                {usuariosConfig.map(u => <option key={u.NomeCompleto} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <label className="text-xs font-bold text-green-800">Data Finalização *</label>
                                                            <input type="date" value={dataFinalizacao} onChange={e => setDataFinalizacao(e.target.value)} className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full" />
                                                        </div>
                                                        <div className="flex flex-col gap-1 md:col-span-3">
                                                            <label className="text-xs font-bold text-green-800">Parecer Finalização *</label>
                                                            <textarea value={descricaoFinalizacao} onChange={e => setDescricaoFinalizacao(e.target.value)} rows={2} className="p-2 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full resize-none placeholder-green-300" placeholder="Insira o parecer de fechamento da RNC..." />
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
                                            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xs font-bold text-gray-700 uppercase">Histórico de Pendências deste Item</h3>
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={exibirFinalizadas} onChange={(e) => setExibirFinalizadas(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                                        <span className="text-[10px] text-gray-600 font-medium select-none">Exibir Finalizadas</span>
                                                    </label>
                                                </div>
                                                <span className="text-xs text-gray-500">{pendenciasExibidas.length} registro(s)</span>
                                            </div>
                                            <div className="px-4 py-3 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-end">
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 1</label>
                                                    <input
                                                        type="text"
                                                        value={searchQuery1}
                                                        onChange={(e) => setSearchQuery1(e.target.value)}
                                                        placeholder="Buscar na descrição..."
                                                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 2</label>
                                                    <input
                                                        type="text"
                                                        value={searchQuery2}
                                                        onChange={(e) => setSearchQuery2(e.target.value)}
                                                        placeholder="Buscar na descrição..."
                                                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="pb-0.5 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSearchQuery1(''); setSearchQuery2(''); }}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded border border-gray-300 flex items-center justify-center gap-1 transition-colors"
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
                                                        <tbody className="divide-y divide-gray-100 relative">
                                                            {pendenciasExibidas.map(p => (
                                                                <tr key={p.IDRNC} onClick={() => loadPendenciaForEdit(p)} className="hover:bg-amber-50/50 cursor-pointer transition-colors">
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
                            <div className="px-6 py-4 bg-gray-50 flex gap-3 flex-shrink-0 justify-end border-t border-gray-200">
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
                                        <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                                    ) : (
                                        <><AlertTriangle size={16} /> Salvar</>
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




