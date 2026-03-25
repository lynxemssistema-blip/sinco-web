import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, X, FolderKanban, Save,
    Loader2, RefreshCw, Calendar, Tag as TagIcon, ChevronRight, ChevronDown, FolderOpen, CheckCircle2,
    Building2, Truck, Banknote
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';

import { formatToBRDate } from '../utils/dateUtils';

const API_BASE = '/api';

interface Projeto {
    IdProjeto?: number;
    Projeto: string;
    DescProjeto?: string;
    ClienteProjeto?: string;
    Responsavel?: string;
    DataPrevisao?: string;
    PrazoEntrega?: string;
    StatusProj?: string;
    DescStatus?: string;
    liberado?: string;
    DataLiberacao?: string;
    PlanejadoFinanceiro?: string;
    DataEntradaPedido?: string;
    UF?: string;
    // Alfatec-specific
    GerenteProjeto?: string;
    Segmento?: string;
    Cnpj?: string;
    NomeFantasia?: string;
    IE?: string;
    EnderecoCliente?: string;
    ContatoComercial?: string;
    FoneContatoComercial?: string;
    EmailComercial?: string;
    ContatoTecnico?: string;
    FoneContatoTecnico?: string;
    EmailTecnico?: string;
    // Entrega
    ClienteEntrega?: string;
    CnpjEntrega?: string;
    ContatoEntrega?: string;
    TelefoneEntrega?: string;
    HrEntrega?: string;
    EnderecoEntrega?: string;
    // Cobranca
    ClienteCobranca?: string;
    CnpjCobranca?: string;
    ContatoCobranca?: string;
    TelefoneCobranca?: string;
    EmailCobranca?: string;
    EnderecoCobranca?: string;
    // Fornecimento
    Pagamento?: string;
    ObservacaoFornec?: string;
    Transferencia?: string;
    Pix?: string;
    Cartao?: string;
    Empenho?: string;
    Boleto?: string;
    Dinheiro?: string;
    HrComercial?: string;
    HrNoturno?: string;
    HrCombinar?: string;
    Frete?: string;
    Embalagem?: string;
    FabricacaoEmpresa?: string;
    ValorFabricacao?: string;
    RevendaEmpresa?: string;
    ValorRevenda?: string;
    FreteEmpresa?: string;
    ValorFrete?: string;
    InstalacaoEmpresa?: string;
    ValorInstalacao?: string;
    EmbalagemEmpresa?: string;
    ValorEmbalagem?: string;
    TotalFinal?: string;
    ObservacaoFinal?: string;
}

interface Tag {
    IdTag?: number;
    Tag: string;
    DescTag?: string;
    IdProjeto?: number;
    Projeto?: string;
    DataPrevisao?: string;
    TipoProduto?: string;
    UnidadeProduto?: string;
    QtdeTag?: string;
    QtdeLiberada?: string;
    SaldoTag?: string;
    ValorTag?: string;
    StatusTag?: number;
    DescStatus?: string;
}

interface Option {
    id: number | string;
    label: string;
}

const emptyProjetoForm: Projeto = {
    Projeto: '',
    DescProjeto: '',
    ClienteProjeto: '',
    Responsavel: '',
    DataPrevisao: '',
    PrazoEntrega: '',
    StatusProj: 'AT',
    DescStatus: 'Ativo',
    PlanejadoFinanceiro: '',
    DataEntradaPedido: ''
};

const emptyTagForm: Tag = {
    Tag: '',
    DescTag: '',
    DataPrevisao: '',
    TipoProduto: '',
    UnidadeProduto: '',
    QtdeTag: '',
    QtdeLiberada: '',
    SaldoTag: '',
};

export default function ProjetoPage() {
    const { showAlert } = useAlert();


    const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3>(0);
    // Projetos state
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [projetoFormData, setProjetoFormData] = useState<Projeto>(emptyProjetoForm);
    const [isEditingProjeto, setIsEditingProjeto] = useState(false);
    const [showProjetoForm, setShowProjetoForm] = useState(false);

    // Expanded projects and their tags
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
    const [projectTags, setProjectTags] = useState<Record<number, Tag[]>>({});
    const [loadingTags, setLoadingTags] = useState<Set<number>>(new Set());

    // Tag form state
    const [tagFormData, setTagFormData] = useState<Tag>(emptyTagForm);
    const [isEditingTag, setIsEditingTag] = useState(false);
    const [showTagForm, setShowTagForm] = useState(false);
    const [selectedProjetoForTag, setSelectedProjetoForTag] = useState<Projeto | null>(null);

    // Common state
    const [searchFilters, setSearchFilters] = useState({
        projeto: '',
        descProjeto: '',
        cliente: '',
        dataInicio: '',
        dataFim: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Options for dropdowns
    const [clienteOptions, setClienteOptions] = useState<Option[]>([]);
    const [medidaOptions, setMedidaOptions] = useState<Option[]>([]);
    const [tipoProdutoOptions, setTipoProdutoOptions] = useState<Option[]>([]);

    // Fetch dropdown options
    const fetchOptions = async () => {
        try {
            const [pjRes, medRes, tipoRes] = await Promise.all([
                fetch(`${API_BASE}/pj/options`),
                fetch(`${API_BASE}/medida/options`),
                fetch(`${API_BASE}/tipoproduto/options`)
            ]);
            const [pjJson, medJson, tipoJson] = await Promise.all([pjRes.json(), medRes.json(), tipoRes.json()]);
            if (pjJson.success) setClienteOptions(pjJson.data);
            if (medJson.success) setMedidaOptions(medJson.data);
            if (tipoJson.success) setTipoProdutoOptions(tipoJson.data);
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    // Fetch Projetos
    const fetchProjetos = async (overrideFilters?: any) => {
        setLoading(true);
        setError(null);
        try {
            const activeFilters = overrideFilters || searchFilters;
            const params = new URLSearchParams();
            if (activeFilters.projeto) params.append('projeto', activeFilters.projeto);
            if (activeFilters.descProjeto) params.append('descProjeto', activeFilters.descProjeto);
            if (activeFilters.cliente) params.append('descEmpresa', activeFilters.cliente); // Enviamos descEmpresa para buscar
            if (activeFilters.dataInicio) {
                // Formato de HTML input date é YYYY-MM-DD. Precisamos converter para DD/MM/YYYY
                const [y, m, d] = activeFilters.dataInicio.split('-');
                params.append('dataInicio', `${d}/${m}/${y}`);
            }
            if (activeFilters.dataFim) {
                const [y, m, d] = activeFilters.dataFim.split('-');
                params.append('dataFim', `${d}/${m}/${y}`);
            }

            const qs = params.toString();
            const res = await fetch(`${API_BASE}/projeto${qs ? `?${qs}` : ''}`);
            const json = await res.json();
            if (json.success) {
                setProjetos(json.data);
            } else {
                showAlert(json.message || 'Erro ao carregar dados', "error");
            }
        } catch (err) {
            showAlert('Erro de conexão com o servidor.', "error");
        } finally {
            setLoading(false);
        }
    };

    // Fetch Tags for a project
    const fetchTags = async (projetoId: number) => {
        setLoadingTags(prev => new Set(prev).add(projetoId));
        try {
            const res = await fetch(`${API_BASE}/projeto/${projetoId}/tags`);
            const json = await res.json();
            if (json.success) {
                setProjectTags(prev => ({ ...prev, [projetoId]: json.data }));
            }
        } catch (err) {
            console.error('Error fetching tags:', err);
        } finally {
            setLoadingTags(prev => {
                const next = new Set(prev);
                next.delete(projetoId);
                return next;
            });
        }
    };

    useEffect(() => {
        fetchProjetos();
        fetchOptions();
    }, []);

    // Auto-calculate TotalFinal (sum of composition table values)
    useEffect(() => {
        const toNum = (v: string | undefined) => parseFloat(v || '0') || 0;
        const total =
            toNum(projetoFormData.ValorFabricacao) +
            toNum(projetoFormData.ValorRevenda) +
            toNum(projetoFormData.ValorFrete) +
            toNum(projetoFormData.ValorInstalacao) +
            toNum(projetoFormData.ValorEmbalagem);
        if (total > 0) {
            setProjetoFormData(prev => ({ ...prev, TotalFinal: String(total) }));
        }
    }, [
        projetoFormData.ValorFabricacao,
        projetoFormData.ValorRevenda,
        projetoFormData.ValorFrete,
        projetoFormData.ValorInstalacao,
        projetoFormData.ValorEmbalagem,
    ]);

    // Auto-calculate payment Valor Total (sum of payment method values)
    // stored as a computed display value - shown in the Valor Total field in the payment section
    const calcPaymentTotal = () => {
        const toNum = (v: string | undefined) => parseFloat(v || '0') || 0;
        const sum =
            toNum(projetoFormData.Transferencia) +
            toNum(projetoFormData.Pix) +
            toNum(projetoFormData.Cartao) +
            toNum(projetoFormData.Empenho) +
            toNum(projetoFormData.Boleto) +
            toNum(projetoFormData.Dinheiro);
        return sum > 0 ? String(sum) : '';
    };


    const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
    const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
    const inputOptional = `${inputBaseClass} border-gray-200`;
    const selectClass = `${inputOptional} appearance-none bg-white`;

    // Toggle project expansion
    const toggleProject = async (projetoId: number) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projetoId)) {
            newExpanded.delete(projetoId);
        } else {
            newExpanded.add(projetoId);
            // Fetch tags if not already loaded
            if (!projectTags[projetoId]) {
                await fetchTags(projetoId);
            }
        }
        setExpandedProjects(newExpanded);
    };

    // Projetos exibidos (não precisa filtrar client-side, o backend já filtra)
    const filteredProjetos = projetos;

    // === PROJETO HANDLERS ===
    const handleProjetoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target;
        const name = target.name;
        let value = target.value;
        const type = target.type;

        // Forçar caixa alta em todos os campos de texto/textarea
        if (type === 'text' || target.tagName === 'TEXTAREA') {
            value = value.toUpperCase();
        }

        setProjetoFormData(prev => {
            const nextData = { ...prev, [name]: value };

            // Cálculo automático de 'Dias (Prazo)'
            if (name === 'DataPrevisao') {
                if (value) {
                    const parts = value.split('-');
                    if (parts.length === 3) {
                        const prevDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const diffTime = prevDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        nextData.PrazoEntrega = diffDays.toString();
                    }
                } else {
                    nextData.PrazoEntrega = '';
                }
            }

            return nextData;
        });
    };

    const handleProjetoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = isEditingProjeto ? `${API_BASE}/projeto/${projetoFormData.IdProjeto}` : `${API_BASE}/projeto`;
            const method = isEditingProjeto ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projetoFormData),
            });

            const json = await res.json();
            if (json.success) {
                await fetchProjetos();
                resetProjetoForm();
                showAlert(isEditingProjeto ? 'Projeto atualizado!' : 'Projeto criado!', "success");
            } else {
                showAlert(json.message || 'Erro ao salvar', "error");
            }
        } catch (err) {
            showAlert('Erro ao salvar. Verifique a conexão.', "error");
        } finally {
            setSaving(false);
        }
    };

    const handleProjetoEdit = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/projeto/${id}`);
            const json = await res.json();
            if (json.success) {
                setProjetoFormData(json.data);
                setIsEditingProjeto(true);
                setShowProjetoForm(true);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const handleProjetoDelete = async (id: number) => {
        if (!confirm('Deseja realmente excluir este projeto?')) return;

        try {
            const res = await fetch(`${API_BASE}/projeto/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Edson' }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchProjetos();
                showAlert('Projeto excluído com sucesso.', "success");
            } else {
                showAlert(json.message || 'Erro ao excluir', "error");
            }
        } catch (err) {
            showAlert('Erro ao excluir. Verifique a conexão.', "error");
        }
    };


    const handleOpenFolder = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/projeto/${id}/open-folder`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showAlert('Pasta aberta no servidor.', "success");
            } else {
                showAlert(json.message || 'Erro ao abrir pasta.', "error");
            }
        } catch (err) {
            showAlert('Erro de conexão ao tentar abrir pasta.', "error");
        }
    };

    const handleLiberar = async (id: number) => {
        if (!confirm('Deseja realmente liberar este projeto?')) return;
        try {
            const res = await fetch(`${API_BASE}/projeto/${id}/liberar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Sistema' })
            });
            const json = await res.json();
            if (json.success) {
                showAlert('Projeto liberado com sucesso!', "success");
                fetchProjetos(); // Recarrega
            } else {
                showAlert(json.message || 'Erro ao liberar.', "error");
            }
        } catch (err) {
            showAlert('Erro de conexão ao liberar.', "error");
        }
    };

    const resetProjetoForm = () => {
        setProjetoFormData(emptyProjetoForm);
        setIsEditingProjeto(false);
        setShowProjetoForm(false);
    };

    // === TAG HANDLERS ===
    const openTagForm = (projeto: Projeto) => {
        setSelectedProjetoForTag(projeto);
        setTagFormData(emptyTagForm);
        setIsEditingTag(false);
        setShowTagForm(true);
    };

    const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target;
        const name = target.name;
        let value = target.value;
        const type = target.type;

        if (type === 'text' || target.tagName === 'TEXTAREA') {
            value = value.toUpperCase();
        }

        setTagFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const payload = {
                ...tagFormData,
                IdProjeto: selectedProjetoForTag?.IdProjeto,
                Projeto: selectedProjetoForTag?.Projeto
            };

            const url = isEditingTag ? `${API_BASE}/tag/${tagFormData.IdTag}` : `${API_BASE}/tag`;
            const method = isEditingTag ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                if (selectedProjetoForTag?.IdProjeto) {
                    await fetchTags(selectedProjetoForTag.IdProjeto);
                }
                resetTagForm();
                showAlert('Tag salva com sucesso!', "success");
            } else {
                showAlert(json.message || 'Erro ao salvar', "error");
            }
        } catch (err) {
            showAlert('Erro ao salvar. Verifique a conexão.', "error");
        } finally {
            setSaving(false);
        }
    };

    const handleTagEdit = async (tag: Tag, projeto: Projeto) => {
        setSelectedProjetoForTag(projeto);
        try {
            const res = await fetch(`${API_BASE}/tag/${tag.IdTag}`);
            const json = await res.json();
            if (json.success) {
                setTagFormData(json.data);
                setIsEditingTag(true);
                setShowTagForm(true);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const handleTagDelete = async (tagId: number, projetoId: number) => {
        if (!confirm('Deseja realmente excluir esta tag?')) return;

        try {
            const res = await fetch(`${API_BASE}/tag/${tagId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Edson' }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchTags(projetoId);
                showAlert('Tag excluída.', "success");
            } else {
                showAlert(json.message || 'Erro ao excluir', "error");
            }
        } catch (err) {
            showAlert('Erro ao excluir. Verifique a conexão.', "error");
        }
    };

    const resetTagForm = () => {
        setTagFormData(emptyTagForm);
        setIsEditingTag(false);
        setShowTagForm(false);
        setSelectedProjetoForTag(null);
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'FN': return 'bg-green-100 text-green-700';
            case 'CA': return 'bg-red-100 text-red-700';
            case 'PA': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#32423D]">Projetos e Tags</h1>
                    <p className="text-gray-500 text-sm">Clique em um projeto para expandir e ver suas tags</p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchProjetos}
                        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { resetProjetoForm(); setShowProjetoForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#32423D] text-white font-medium hover:bg-[#3d4f49] transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Novo Projeto
                    </motion.button>
                </div>
            </div>

            {/* Search Filters Section (VB.NET Style) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-2">
                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                    <Search size={14} /> Dados para Pesquisa
                </h3>

                <div className="flex flex-col gap-4">
                    {/* Linha 1: Projeto e Descrição */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-[1]">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Projeto:</label>
                            <input
                                type="text"
                                value={searchFilters.projeto}
                                onChange={(e) => setSearchFilters(prev => ({ ...prev, projeto: e.target.value.toUpperCase() }))}
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-[#32423D] rounded-none shrink-0"
                                placeholder="PROJETOS-00X"
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Descrição Projeto:</label>
                            <input
                                type="text"
                                value={searchFilters.descProjeto}
                                onChange={(e) => setSearchFilters(prev => ({ ...prev, descProjeto: e.target.value.toUpperCase() }))}
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-[#32423D] rounded-none"
                                placeholder="Detalhes textuais..."
                            />
                        </div>
                    </div>

                    {/* Linha 2: Cliente */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-[2]">
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Cliente:</label>
                            <input
                                type="text"
                                value={searchFilters.cliente}
                                onChange={(e) => setSearchFilters(prev => ({ ...prev, cliente: e.target.value.toUpperCase() }))}
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-[#32423D] rounded-none"
                                placeholder="ALFATEC, SIEMENS, ETC..."
                            />
                        </div>

                        {/* Empty spacer para manter o grid layout similar ao VB.NET */}
                        <div className="flex-[1] hidden md:block"></div>
                    </div>

                    {/* Linha 3: Dt Prev. Intervalo de */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Dt Prev. Intervalo de:</label>
                                <input
                                    type="date"
                                    value={searchFilters.dataInicio}
                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                                    className="w-full md:w-40 px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-[#32423D] rounded-none"
                                />
                            </div>
                            <span className="text-gray-400 font-medium pb-2 text-sm italic mr-1 self-end mb-1 md:mb-0">a</span>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-600 mb-1 invisible">Fim</label>
                                <input
                                    type="date"
                                    value={searchFilters.dataFim}
                                    onChange={(e) => setSearchFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                                    className="w-full md:w-40 px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-[#32423D] rounded-none"
                                />
                            </div>
                        </div>

                        {/* Botões de Pesquisar e Limpar */}
                        <div className="ml-auto mt-2 md:mt-0 flex items-center gap-2">
                            {(searchFilters.projeto || searchFilters.descProjeto || searchFilters.cliente || searchFilters.dataInicio || searchFilters.dataFim) && (
                                <button
                                    onClick={() => {
                                        const emptyFilters = { projeto: '', descProjeto: '', cliente: '', dataInicio: '', dataFim: '' };
                                        setSearchFilters(emptyFilters);
                                        fetchProjetos(emptyFilters);
                                    }}
                                    className="px-4 py-2 text-red-600 font-bold text-sm tracking-wide rounded hover:bg-red-50 transition-colors flex items-center gap-2 border border-transparent hover:border-red-200"
                                >
                                    <X size={16} />
                                    Limpar
                                </button>
                            )}
                            <button
                                onClick={() => fetchProjetos()}
                                disabled={loading}
                                className="px-6 py-2 bg-[#E0E800]/20 border border-[#32423D]/20 text-[#32423D] font-bold text-sm tracking-wide rounded hover:bg-[#E0E800]/40 transition-colors flex items-center gap-2"
                            >
                                <Search size={16} />
                                {loading ? 'Buscando...' : 'Pesquisar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tree View */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Carregando dados...</p>
                    </div>
                ) : filteredProjetos.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <FolderKanban size={40} strokeWidth={1.5} />
                        <p className="text-sm">Nenhum projeto encontrado</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredProjetos.map((projeto, idx) => {
                            const isExpanded = expandedProjects.has(projeto.IdProjeto!);
                            const tags = projectTags[projeto.IdProjeto!] || [];
                            const isLoadingTags = loadingTags.has(projeto.IdProjeto!);

                            return (
                                <div key={projeto.IdProjeto}>
                                    {/* Project Row */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-[#E0E800]/5' : ''}`}
                                        onClick={() => projeto.IdProjeto && toggleProject(projeto.IdProjeto)}
                                    >
                                        {/* Expand Icon */}
                                        <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                                            {isLoadingTags ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : isExpanded ? (
                                                <ChevronDown size={18} className="text-[#32423D]" />
                                            ) : (
                                                <ChevronRight size={18} />
                                            )}
                                        </div>

                                        {/* Project Icon */}
                                        <div className="w-9 h-9 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center">
                                            <FolderKanban size={16} />
                                        </div>

                                        {/* Project Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 font-mono">{projeto.IdProjeto}</span>
                                                <span className="text-sm font-medium text-gray-900 truncate">{projeto.Projeto}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{projeto.ClienteProjeto || 'Sem cliente'}</div>
                                        </div>

                                        {/* Data Previsão */}
                                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 w-28" title="Previsão de Entrega">
                                            <Calendar size={14} className="text-gray-400" />
                                            {formatToBRDate(projeto.DataPrevisao)}
                                        </div>

                                        {/* Prazo */}
                                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 w-24" title="Prazo em dias">
                                            <TagIcon size={14} className="text-gray-400" />
                                            {projeto.PrazoEntrega ? `${projeto.PrazoEntrega} dias` : '-'}
                                        </div>

                                        {/* Status */}
                                        <span className={`hidden sm:inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(projeto.StatusProj)}`}>
                                            {projeto.DescStatus || 'Ativo'}
                                        </span>

                                        {/* Tags Count Badge */}
                                        {projectTags[projeto.IdProjeto!] && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[#E0E800]/20 text-[#32423D]">
                                                <TagIcon size={12} />
                                                {tags.length}
                                            </span>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => projeto.IdProjeto && handleOpenFolder(projeto.IdProjeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Abrir Pasta Projeto"
                                            >
                                                <FolderOpen size={16} />
                                            </button>
                                            {(!projeto.liberado || projeto.liberado.trim() === '') && (
                                                <button
                                                    onClick={() => projeto.IdProjeto && handleLiberar(projeto.IdProjeto)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                                    title="Liberar Projeto"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                            <button
                                                onClick={() => openTagForm(projeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                title="Nova Tag"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => projeto.IdProjeto && handleProjetoEdit(projeto.IdProjeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                title="Editar Projeto"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => projeto.IdProjeto && handleProjetoDelete(projeto.IdProjeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Excluir Projeto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </motion.div>

                                    {/* Tags (Expanded) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden bg-gray-50/50"
                                            >
                                                {isLoadingTags ? (
                                                    <div className="pl-16 py-4 text-sm text-gray-400 flex items-center gap-2">
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Carregando tags...
                                                    </div>
                                                ) : tags.length === 0 ? (
                                                    <div className="pl-16 py-4 text-sm text-gray-400 flex items-center gap-2">
                                                        <TagIcon size={14} />
                                                        Nenhuma tag cadastrada
                                                        <button
                                                            onClick={() => openTagForm(projeto)}
                                                            className="text-[#32423D] font-medium hover:underline ml-2"
                                                        >
                                                            Adicionar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="pl-10 pr-4 py-2 space-y-1">
                                                        {/* Tags Header */}
                                                        <div className="flex items-center gap-3 pl-6 py-1 text-xs font-medium text-gray-400 uppercase">
                                                            <span className="w-16">ID</span>
                                                            <span className="flex-1">Tag</span>
                                                            <span className="w-24 hidden sm:block">Prev. Entrega</span>
                                                            <span className="w-32 hidden sm:block">Tipo</span>
                                                            <span className="w-16 text-center">Qtde</span>
                                                            <span className="w-16 text-center">Lib.</span>
                                                            <span className="w-16 text-center">Saldo</span>
                                                            <span className="w-20"></span>
                                                        </div>

                                                        {/* Tag Rows */}
                                                        {tags.map((tag) => (
                                                            <motion.div
                                                                key={tag.IdTag}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="flex items-center gap-3 pl-6 py-2 rounded-lg hover:bg-white transition-colors group"
                                                            >
                                                                {/* Tree line connector */}
                                                                <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl-lg -ml-2"></div>

                                                                {/* Tag Icon */}
                                                                <div className="w-7 h-7 rounded-lg bg-[#E0E800]/20 text-[#32423D] flex items-center justify-center">
                                                                    <TagIcon size={12} />
                                                                </div>

                                                                <span className="w-10 text-xs text-gray-400 font-mono">{tag.IdTag}</span>
                                                                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{tag.Tag}</span>
                                                                <span className="w-24 text-xs text-gray-500 truncate hidden sm:block">
                                                                    {formatToBRDate(tag.DataPrevisao)}
                                                                </span>
                                                                <span className="w-32 text-xs text-gray-500 truncate hidden sm:block">{tag.TipoProduto || '-'}</span>
                                                                <span className="w-16 text-sm text-gray-600 text-center">{tag.QtdeTag || '-'}</span>
                                                                <span className="w-16 text-sm text-gray-600 text-center">{tag.QtdeLiberada || '-'}</span>
                                                                <span className="w-16 text-sm text-gray-600 text-center">{tag.SaldoTag || '-'}</span>

                                                                {/* Tag Actions */}
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleTagEdit(tag, projeto)}
                                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                                        title="Editar Tag"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => tag.IdTag && projeto.IdProjeto && handleTagDelete(tag.IdTag, projeto.IdProjeto)}
                                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                        title="Excluir Tag"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                )
                }

                {/* Footer */}
                {
                    !loading && filteredProjetos.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                                <span className="font-medium">{filteredProjetos.length}</span> projetos •
                                <span className="font-medium ml-1">{expandedProjects.size}</span> expandidos
                            </p>
                        </div>
                    )
                }
            </div >

            {/* Projeto Form Modal */}
            <AnimatePresence>
                {
                    showProjetoForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
                            onClick={(e) => e.target === e.currentTarget && resetProjetoForm()}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-gray-100"
                            >
                                <form onSubmit={handleProjetoSubmit}>
                                    {/* Header / Toolbar */}
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded bg-[#32423D] text-white flex items-center justify-center">
                                                <FolderKanban size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-[#32423D] tracking-tight">
                                                    {isEditingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
                                                </h2>
                                                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5 font-medium">Gestão de Projetos</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => resetProjetoForm()} className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm rounded">
                                                <Plus size={16} /> Novo
                                            </button>
                                            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#32423D] text-white text-sm font-semibold hover:bg-[#3d4f49] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm rounded">
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Salvar
                                            </button>
                                            {isEditingProjeto && (
                                                <button type="button" onClick={() => { setShowProjetoForm(false); setIsEditingTag(false); openTagForm(projetoFormData); }} className="px-4 py-2 border border-[#32423D]/20 text-[#32423D] bg-[#E0E800]/20 text-sm font-semibold hover:bg-[#E0E800]/40 transition-colors flex items-center gap-2 shadow-sm rounded">
                                                    <TagIcon size={16} /> Inserir Tag
                                                </button>
                                            )}
                                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                            <button type="button" onClick={resetProjetoForm} className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center gap-2 shadow-sm rounded">
                                                Fechar <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 4-tab form – same for all matrices */}
                                    <div className="flex flex-col">
                                        {/* Tab bar */}
                                        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                                            {([
                                                { icon: <FolderKanban size={14} />, label: 'Projeto' },
                                                { icon: <Building2 size={14} />, label: 'Faturamento' },
                                                { icon: <Truck size={14} />, label: 'Entrega / Cobrança' },
                                                { icon: <Banknote size={14} />, label: 'Fornecimento' },
                                            ] as { icon: React.ReactNode; label: string }[]).map((tab, i) => (
                                                <button key={i} type="button"
                                                    onClick={() => setActiveTab(i as 0 | 1 | 2 | 3)}
                                                    className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === i ? 'border-[#32423D] text-[#32423D] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                                    {tab.icon}{tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="p-6">
                                            {/* TAB 0 – PROJETO */}
                                            {activeTab === 0 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {isEditingProjeto && (
                                                        <div>
                                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">ID</label>
                                                            <input type="text" value={projetoFormData.IdProjeto || ''} readOnly className="w-full px-3 py-2 bg-gray-100 border border-gray-200 text-sm font-mono text-gray-400 cursor-not-allowed rounded-none" />
                                                        </div>
                                                    )}
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Nome Projeto <span className="text-red-500">*</span></label>
                                                        <input type="text" name="Projeto" value={projetoFormData.Projeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded-none" required />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Cliente</label>
                                                        <select name="ClienteProjeto" value={projetoFormData.ClienteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
                                                            <option value="">Selecione...</option>
                                                            {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">CNPJ</label>
                                                        <input type="text" name="Cnpj" value={projetoFormData.Cnpj || ''} onChange={handleProjetoInputChange} placeholder="00.000.000/0000-00" className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Segmento</label>
                                                        <input type="text" name="Segmento" value={projetoFormData.Segmento || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Responsável Técnico</label>
                                                        <input type="text" name="Responsavel" value={projetoFormData.Responsavel || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Gerente do Projeto</label>
                                                        <input type="text" name="GerenteProjeto" value={projetoFormData.GerenteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Endereço do Cliente</label>
                                                        <textarea name="EnderecoCliente" value={projetoFormData.EnderecoCliente || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Data Prev. Entrega</label>
                                                        <input type="date" name="DataPrevisao" value={projetoFormData.DataPrevisao || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Entrada Pedido</label>
                                                        <input type="date" name="DataEntradaPedido" value={projetoFormData.DataEntradaPedido || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Planejado Financeiro</label>
                                                        <input type="date" name="PlanejadoFinanceiro" value={projetoFormData.PlanejadoFinanceiro || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Dias (Prazo)</label>
                                                        <input type="text" name="PrazoEntrega" value={projetoFormData.PrazoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Observações Finais</label>
                                                        <textarea name="ObservacaoFinal" value={projetoFormData.ObservacaoFinal || ''} onChange={handleProjetoInputChange} rows={3} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
                                                    </div>
                                                </div>
                                            )}
                                            {/* TAB 1 – FATURAMENTO */}
                                            {activeTab === 1 && (
                                                <div className="space-y-4">
                                                    {/* Cliente / Faturamento */}
                                                    <div className="p-4 border border-gray-200 bg-gray-50/50">
                                                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3 flex items-center gap-1"><Building2 size={12} />Dados do Cliente (Faturamento)</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
                                                                <select name="ClienteProjeto" value={projetoFormData.ClienteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
                                                                    <option value="">Selecione...</option>
                                                                    {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Fantasia</label>
                                                                <input type="text" name="NomeFantasia" value={projetoFormData.NomeFantasia || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div></div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
                                                                <input type="text" name="Cnpj" value={projetoFormData.Cnpj || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" placeholder="__.___.___/____-__" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">IE (Insc. Estadual)</label>
                                                                <input type="text" name="IE" value={projetoFormData.IE || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
                                                                <textarea name="EnderecoCliente" value={projetoFormData.EnderecoCliente || ''} onChange={handleProjetoInputChange} rows={3} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" placeholder="Endereço, Número, Bairro, Cidade, Estado, CEP, Telefone" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Contato Comercial */}
                                                    <div className="p-4 border border-gray-200 bg-gray-50/50">
                                                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Contato Comercial</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div className="md:col-span-3">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                                                                <input type="text" name="ContatoComercial" value={projetoFormData.ContatoComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                                                                <input type="text" name="FoneContatoComercial" value={projetoFormData.FoneContatoComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                                                <input type="text" name="EmailComercial" value={projetoFormData.EmailComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Contato Técnico */}
                                                    <div className="p-4 border border-gray-200 bg-gray-50/50">
                                                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Contato Técnico</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div className="md:col-span-3">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
                                                                <input type="text" name="ContatoTecnico" value={projetoFormData.ContatoTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                                                                <input type="text" name="FoneContatoTecnico" value={projetoFormData.FoneContatoTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                                                <input type="text" name="EmailTecnico" value={projetoFormData.EmailTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* TAB 2 – ENTREGA / COBRANÇA */}
                                            {activeTab === 2 && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div className="p-4 border border-gray-200 bg-gray-50/50 space-y-3">
                                                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1"><Truck size={12} />Entrega</h4>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente Entrega</label>
                                                            <select name="ClienteEntrega" value={projetoFormData.ClienteEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
                                                                <option value="">Selecione...</option>
                                                                {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
                                                            <input type="text" name="CnpjEntrega" value={projetoFormData.CnpjEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Contato</label>
                                                                <input type="text" name="ContatoEntrega" value={projetoFormData.ContatoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                                                                <input type="text" name="TelefoneEntrega" value={projetoFormData.TelefoneEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Hr/Entrega</label>
                                                            <input type="text" name="HrEntrega" value={projetoFormData.HrEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
                                                            <textarea name="EnderecoEntrega" value={projetoFormData.EnderecoEntrega || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
                                                        </div>
                                                    </div>
                                                    <div className="p-4 border border-gray-200 bg-gray-50/50 space-y-3">
                                                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1"><Banknote size={12} />Cobrança</h4>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente Cobrança</label>
                                                            <select name="ClienteCobranca" value={projetoFormData.ClienteCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
                                                                <option value="">Selecione...</option>
                                                                {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
                                                            <input type="text" name="CnpjCobranca" value={projetoFormData.CnpjCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Contato</label>
                                                                <input type="text" name="ContatoCobranca" value={projetoFormData.ContatoCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
                                                                <input type="text" name="TelefoneCobranca" value={projetoFormData.TelefoneCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                                            <input type="text" name="EmailCobranca" value={projetoFormData.EmailCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
                                                            <textarea name="EnderecoCobranca" value={projetoFormData.EnderecoCobranca || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* TAB 3 – FORNECIMENTO */}
                                            {activeTab === 3 && (
                                                <div className="space-y-4">
                                                    {/* Row 1: Prazo + Forma de Pagto */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-32 shrink-0">
                                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Prazo Entrega</label>
                                                                <input type="text" name="PrazoEntrega" value={projetoFormData.PrazoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                            </div>
                                                            <span className="text-xs text-gray-500 mt-5">Dias</span>
                                                        </div>
                                                        <fieldset className="border border-gray-200 px-3 py-2">
                                                            <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Forma de Pagto</legend>
                                                            <div className="flex gap-5 mt-1">
                                                                {['Antecipado', 'Parcelado'].map(v => (
                                                                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                                                        <input type="radio" name="Pagamento" value={v} checked={(projetoFormData.Pagamento || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
                                                                    </label>
                                                                ))}

                                                            </div>
                                                        </fieldset>
                                                    </div>
                                                    {/* Observação */}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Observação</label>
                                                        <textarea name="ObservacaoFornec" value={projetoFormData.ObservacaoFornec || ''} onChange={handleProjetoInputChange} rows={3} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
                                                    </div>
                                                    {/* Payment values grid + Valor Total */}
                                                    <div className="flex gap-4 items-start">
                                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                                            {[
                                                                ['Transferencia', 'Transferência'],
                                                                ['Pix', 'Pix'],
                                                                ['Cartao', 'C.Crédito'],
                                                                ['Empenho', 'Empenho'],
                                                                ['Boleto', 'Boleto'],
                                                                ['Dinheiro', 'Dinheiro'],
                                                            ].map(([n, l]) => (
                                                                <div key={n} className="flex items-center gap-2">
                                                                    <label className="w-24 text-xs font-semibold text-gray-600 shrink-0">{l}</label>
                                                                    <input type="text" name={n} value={(projetoFormData[n as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="w-40 shrink-0">
                                                            <label className="block text-xs font-bold text-gray-700 mb-1">Valor Total (R$)</label>
                                                            <input type="text" readOnly value={calcPaymentTotal()} className="w-full px-3 py-2 border border-[#32423D] bg-[#E0E800]/20 text-sm font-bold focus:outline-none rounded-none text-right cursor-default" />
                                                        </div>

                                                    </div>
                                                    {/* Frete + Turno da Entrega + Embalagem */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <fieldset className="border border-gray-200 px-3 py-2">
                                                            <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Frete</legend>
                                                            <div className="flex gap-4 mt-1">
                                                                {['Empresa', 'Cliente'].map(v => (
                                                                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                                                        <input type="radio" name="Frete" value={v} checked={(projetoFormData.Frete || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </fieldset>
                                                        <fieldset className="border border-gray-200 px-3 py-2">
                                                            <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Turno da Entrega</legend>
                                                            <div className="flex gap-3 mt-1 flex-wrap">
                                                                {[['HrComercial', 'Comercial'], ['HrNoturno', 'Noturno'], ['HrCombinar', 'Combinar']].map(([n, l]) => (
                                                                    <label key={n} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                                                        <input type="checkbox" checked={!!projetoFormData[n as keyof Projeto] && String(projetoFormData[n as keyof Projeto]).trim() !== ''} onChange={e => setProjetoFormData(prev => ({ ...prev, [n]: e.target.checked ? 'S' : '' }))} className="accent-[#32423D]" />{l}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </fieldset>
                                                        <fieldset className="border border-gray-200 px-3 py-2">
                                                            <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Embalagem</legend>
                                                            <div className="flex gap-4 mt-1">
                                                                {['Inclusa', 'Não Inclusa'].map(v => (
                                                                    <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                                                        <input type="radio" name="Embalagem" value={v} checked={(projetoFormData.Embalagem || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </fieldset>
                                                    </div>
                                                    {/* PRODUTO / EMPRESA / VALOR table */}
                                                    <div className="border border-gray-200">
                                                        <div className="grid grid-cols-3 bg-[#32423D] text-white text-[10px] uppercase font-bold tracking-wider">
                                                            <div className="px-3 py-2">Produto</div>
                                                            <div className="px-3 py-2">Empresa</div>
                                                            <div className="px-3 py-2">Valor (R$)</div>
                                                        </div>
                                                        {[
                                                            ['FabricacaoEmpresa', 'ValorFabricacao', 'Fabricação'],
                                                            ['RevendaEmpresa', 'ValorRevenda', 'Revenda'],
                                                            ['FreteEmpresa', 'ValorFrete', 'Frete'],
                                                            ['InstalacaoEmpresa', 'ValorInstalacao', 'Instalação'],
                                                            ['EmbalagemEmpresa', 'ValorEmbalagem', 'Embalagem'],
                                                        ].map(([ne, nv, l], idx) => (
                                                            <div key={ne} className={`grid grid-cols-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                                <div className="px-3 py-1.5 text-sm font-semibold text-gray-700 border-r border-b border-gray-200">{l}</div>
                                                                <div className="px-2 py-1 border-r border-b border-gray-200">
                                                                    <input type="text" name={ne} value={(projetoFormData[ne as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 text-sm focus:outline-none focus:border-[#32423D] border border-transparent focus:border rounded-none" />
                                                                </div>
                                                                <div className="px-2 py-1 border-b border-gray-200">
                                                                    <input type="text" name={nv} value={(projetoFormData[nv as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 text-sm focus:outline-none focus:border-[#32423D] border border-transparent focus:border rounded-none" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="grid grid-cols-3 bg-[#32423D]/10 border-t border-gray-200">
                                                            <div className="px-3 py-2 text-xs font-bold text-gray-700 md:col-span-2 col-span-2">Total</div>
                                                            <div className="px-2 py-1">
                                                                <input type="text" name="TotalFinal" value={projetoFormData.TotalFinal || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 font-bold text-sm text-right focus:outline-none border border-transparent focus:border-[#32423D] focus:border rounded-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}





                                        </div>{/* closes <div className="p-6"> */}
                                    </div>{/* closes <div className="flex flex-col"> */}
                                </form>

                            </motion.div>
                        </motion.div >
                    )
                }
            </AnimatePresence >

            {/* Tag Form Modal */}
            <AnimatePresence>
                {
                    showTagForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
                            onClick={(e) => e.target === e.currentTarget && resetTagForm()}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8"
                            >
                                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
                                            <TagIcon size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-[#32423D]">
                                                {isEditingTag ? 'Editar Tag' : 'Nova Tag'}
                                            </h2>
                                            <p className="text-xs text-gray-500">Projeto: {selectedProjetoForTag?.Projeto}</p>
                                        </div>
                                    </div>
                                    <button onClick={resetTagForm} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleTagSubmit} className="p-5 space-y-4">
                                    {isEditingTag && (
                                        <div className="w-24">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                                            <input type="text" value={tagFormData.IdTag || ''} readOnly className={`${inputOptional} bg-gray-100 cursor-not-allowed`} />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Descrição Tag <span className="text-red-500">*</span></label>
                                            <input type="text" name="Tag" value={tagFormData.Tag || ''} onChange={handleTagInputChange} className={inputRequired} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Data Prev. Entrega</label>
                                            <input
                                                type="date"
                                                name="DataPrevisao"
                                                value={(() => {
                                                    const v = tagFormData.DataPrevisao || '';
                                                    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                                                    return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
                                                })()}
                                                onChange={e => {
                                                    const [y, m, d] = (e.target.value || '').split('-');
                                                    const br = y && m && d ? `${d}/${m}/${y}` : '';
                                                    setTagFormData(prev => ({ ...prev, DataPrevisao: br }));
                                                }}
                                                className={inputOptional}
                                            />
                                            {(() => {
                                                const v = tagFormData.DataPrevisao || '';
                                                const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                                                if (!match) return null;
                                                const target = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
                                                const today = new Date(); today.setHours(0, 0, 0, 0);
                                                let count = 0;
                                                const cur = new Date(today);
                                                if (target <= today) {
                                                    return (
                                                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                                                            ⚠ Prazo vencido
                                                        </span>
                                                    );
                                                }
                                                while (cur < target) {
                                                    cur.setDate(cur.getDate() + 1);
                                                    const dow = cur.getDay();
                                                    if (dow !== 0 && dow !== 6) count++;
                                                }
                                                const color = count >= 5
                                                    ? 'bg-green-100 text-green-700'
                                                    : count >= 1
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700';
                                                return (
                                                    <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${color}`}>
                                                        📅 {count} dia{count !== 1 ? 's' : ''} útil{count !== 1 ? 'eis' : ''} restante{count !== 1 ? 's' : ''}
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Produto</label>
                                        <select name="TipoProduto" value={tagFormData.TipoProduto || ''} onChange={handleTagInputChange} className={selectClass}>
                                            <option value="">Selecione...</option>
                                            {tipoProdutoOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade</label>
                                            <input type="text" name="QtdeTag" value={tagFormData.QtdeTag || ''} onChange={handleTagInputChange} className={inputOptional} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Qt. Liberada</label>
                                            <input type="text" name="QtdeLiberada" value={tagFormData.QtdeLiberada || ''} onChange={handleTagInputChange} className={inputOptional} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Saldo</label>
                                            <input type="text" name="SaldoTag" value={tagFormData.SaldoTag || ''} onChange={handleTagInputChange} className={inputOptional} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Medida</label>
                                            <select name="UnidadeProduto" value={tagFormData.UnidadeProduto || ''} onChange={handleTagInputChange} className={selectClass}>
                                                <option value="">-</option>
                                                {medidaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.id}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                                        <textarea name="DescTag" value={tagFormData.DescTag || ''} onChange={handleTagInputChange} rows={3} className={inputOptional} />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button type="button" onClick={resetTagForm} className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50" disabled={saving}>Cancelar</button>
                                        <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#32423D] text-white font-medium disabled:opacity-50" disabled={saving}>
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            {isEditingTag ? 'Atualizar' : 'Salvar'}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
}
