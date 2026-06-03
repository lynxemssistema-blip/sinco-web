import { usePersistentState } from '../hooks/usePersistentState';
import React, { useState, useEffect } from 'react';
import { useAppConfig } from '../contexts/AppConfigContext';
import { 
    Search, Filter, Save, X, Calendar, Edit3, Briefcase, 
    ChevronDown, ChevronUp, AlertCircle, CheckCircle, Maximize2, Minimize2
} from 'lucide-react';

// Helper: lê NomeCompleto do usuário logado
// O servidor armazena NomeCompleto da tabela usuario no campo "nome" do sinco_user
const getUsuarioLogado = (): string => {
    try {
        const u = JSON.parse(localStorage.getItem('sinco_user') || '{}');
        return u.nome || u.NomeCompleto || u.nomecompleto || u.nome_completo || u.username || 'Sistema';
    } catch { return 'Sistema'; }
};

// Helper: monta headers com Authorization JWT
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('sinco_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// Helper: lê configuração de permissão de Realizado sem Planejamento
// Retorna true = permitido (desbloqueado) | false = bloqueado (exige planejamento)
const getPermitirRealizadoSemPlanejamento = (): boolean => {
    // Bancos que têm padrão DESBLOQUEADO
    const bancosDesbloqueados = ['lynxlocal', 'amceletrica'];
    try {
        const userData = JSON.parse(localStorage.getItem('sinco_user') || '{}');
        const dbName = (userData.dbName || '').toLowerCase();
        const isBancoLivre = bancosDesbloqueados.some(b => dbName.includes(b));

        // Se há valor explícito salvo, usar ele
        const val = localStorage.getItem('sinco_permitirRealizadoSemPlanejamento');
        if (val === 'Sim') return true;
        if (val === 'Não') return false;

        // Sem valor salvo: padrão depende do banco
        // lynxlocal e amceletrica → DESBLOQUEADO (true)
        // Outros bancos → BLOQUEADO (false)
        return isBancoLivre;
    } catch {
        return false; // Falha segura: bloqueado
    }
};

// Converte datas ISO (YYYY-MM-DD) ou já em BR (DD/MM/YYYY) para exibição DD/MM/AAAA
const fmtBR = (d?: string | null): string | null => {
    if (!d || !d.trim()) return null;
    const s = d.trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, dd] = s.substring(0, 10).split('-');
        return `${dd}/${m}/${y}`;
    }
    return s;
};

interface EtapasRow {
    IdProjeto: number;
    Projeto: string;
    DataPrevisao: string;
    DataFinal: string;
    Cliente: string;
    EstadoOrigem: string;
    StatusProj: string;
    liberado: string | null;
    TotalTags: number;
    FaltaMedicao: number;
    OkMedicao: number;
    FaltaIsometrico: number;
    OkIsometrico: number;
    FaltaEngenharia: number;
    OkEngenharia: number;
    FaltaAprovacao: number;
    OkAprovacao: number;
    FaltaAcabamento: number;
    OkAcabamento: number;
    FaltaExpedicao: number;
    OkExpedicao: number;
    Observacao?: string;
    PlanMedicao?: string; RealMedicao?: string;
    PlanIsometrico?: string; RealIsometrico?: string;
    PlanEngenharia?: string; RealEngenharia?: string;
    PlanAprovacao?: string; RealAprovacao?: string;
    PlanAcabamento?: string; RealAcabamento?: string;
    PlanExpedicao?: string; RealExpedicao?: string;
}

export default function AcompanhamentoEtapas() {
    const { processosVisiveis, nomesProcessosEngenharia } = useAppConfig();
    const isVisible = (sector: string) => processosVisiveis.includes(sector);
    const customName = (sector: string, def: string) => nomesProcessosEngenharia[sector as keyof typeof nomesProcessosEngenharia] || def;
    const visibleEngSectors = ['medicao', 'isometrico', 'engenharia', 'aprovacao', 'acabamento', 'expedicao'].filter(s => isVisible(s));

    const [data, setData] = useState<EtapasRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // Filtros
    const [filters, setFilters] = useState({
        projeto: '',
        cliente: '',
        estadoOrigem: '',
        dataPrevisaoInicio: '',
        dataPrevisaoFim: '',
        dataFinalInicio: '',
        dataFinalFim: '',
        dataPlanejamentoInicio: '',
        dataPlanejamentoFim: '',
        dataRealizadoInicio: '',
        dataRealizadoFim: ''
    });

    // Modal
    const [selectedProjeto, setSelectedProjeto] = useState<EtapasRow | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    
    // Tag Selection for Modal
    const [projetoTags, setProjetoTags] = useState<any[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
    const [loadingTags, setLoadingTags] = useState(false);

    // Modo individual (alterar somente 1 tag)
    const [modoIndividual, setModoIndividual] = useState(false);
    const [selectedSingleTagId, setSelectedSingleTagId] = useState<number | null>(null);

    // Configuração: Permitir Realizado sem Planejamento (lida do localStorage)
    const [permitirRealizado, setPermitirRealizado] = useState<boolean>(getPermitirRealizadoSemPlanejamento);

    // Linha mostrando datas — acordeão exclusivo (só 1 projeto por vez)
    const [viewDatesRow, setViewDatesRow] = useState<number | null>(null);

    const toggleDatesView = (idProjeto: number) => {
        setViewDatesRow(prev => prev === idProjeto ? null : idProjeto);
    };

    const updateObservacao = async (idProjeto: number, novaObs: string) => {
        try {
            const response = await fetch(`/api/acompanhamento/projeto/${idProjeto}/observacao`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ observacao: novaObs })
            });
            if (!response.ok) throw new Error('Erro ao salvar');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar a observação.');
        }
    };

    // Compara data Real com a previsão do projeto
    // Retorna 'late' se Real > Previsão, 'ok' se <= Previsão, 'none' se sem dados
    const checkRealVsPrevisao = (realStr: string | undefined, previsaoStr: string): 'late' | 'ok' | 'none' => {
        if (!realStr || !previsaoStr) return 'none';
        const toBRDate = (s: string) => {
            const clean = s.substring(0, 10);
            // DD/MM/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}/.test(clean)) {
                const [d, m, y] = clean.split('/');
                return new Date(`${y}-${m}-${d}`);
            }
            // YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return new Date(clean);
            return null;
        };
        const dReal = toBRDate(realStr);
        const dPrev = toBRDate(previsaoStr);
        if (!dReal || !dPrev) return 'none';
        return dReal > dPrev ? 'late' : 'ok';
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            const response = await fetch(`/api/acompanhamento-etapas?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });
            const res = await response.json();
            setData(res.data || []);
        } catch (err) {
            console.error('Erro ao buscar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const dateFields = ['dataPrevisaoInicio','dataPrevisaoFim','dataFinalInicio','dataFinalFim','dataPlanejamentoInicio','dataPlanejamentoFim','dataRealizadoInicio','dataRealizadoFim'];

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Campos de data não recebem toUpperCase (formato YYYY-MM-DD)
        setFilters(prev => ({ ...prev, [name]: dateFields.includes(name) ? value : value.toUpperCase() }));
    };

    const clearFilter = (name: string) => {
        setFilters(prev => ({ ...prev, [name]: '' }));
    };

    const clearAllFilters = () => {
        setFilters({
            projeto: '', cliente: '', estadoOrigem: '',
            dataPrevisaoInicio: '', dataPrevisaoFim: '',
            dataFinalInicio: '', dataFinalFim: '',
            dataPlanejamentoInicio: '', dataPlanejamentoFim: '',
            dataRealizadoInicio: '', dataRealizadoFim: ''
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const openEditModal = async (row: EtapasRow) => {
        setSelectedProjeto(row);
        // Em um caso real, buscaríamos as datas atuais do projeto.
        // Aqui estamos apenas inicializando vazio para que o usuário insira as novas datas que irão sobrepor em lote
        setEditForm({
            PlanejadoInicioMedicao: '', PlanejadoFinalMedicao: '', RealizadoInicioMedicao: '', RealizadoFinalMedicao: '',
            PlanejadoInicioIsometrico: '', PlanejadoFinalIsometrico: '', RealizadoInicioIsometrico: '', RealizadoFinalIsometrico: '',
            PlanejadoInicioEngenharia: '', PlanejadoFinalEngenharia: '', RealizadoInicioEngenharia: '', RealizadoFinalEngenharia: '',
            PlanejadoInicioAprovacao: '', PlanejadoFinalAprovacao: '', RealizadoInicioAprovacao: '', RealizadoFinalAprovacao: '',
            PlanejadoInicioAcabamento: '', PlanejadoFinalAcabamento: '', RealizadoInicioAcabamento: '', RealizadoFinalAcabamento: '',
            PlanejadoInicioExpedicao: '', PlanejadoFinalExpedicao: '', RealizadoInicioExpedicao: '', realizadoFinalExpedicao: ''
        });
        setIsModalOpen(true);
        setModoIndividual(false);
        setSelectedSingleTagId(null);
        // Relê a configuração de Realizado ao abrir o modal (pode ter mudado em Configurações)
        setPermitirRealizado(getPermitirRealizadoSemPlanejamento());
        setLoadingTags(true);
        try {
            const res = await fetch(`/api/acompanhamento/projeto/${row.IdProjeto}/tags`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                setProjetoTags(json.data);
                setSelectedTagIds(new Set(json.data.map((t: any) => t.IdTag)));
            } else {
                setProjetoTags([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTags(false);
        }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Pré-carrega as datas da tag selecionada nos campos do formulário
    const loadTagDates = (tag: any) => {
        // Converte DD/MM/YYYY para YYYY-MM-DD para os inputs type="date"
        const toISO = (d: string | null | undefined): string => {
            if (!d || !d.trim()) return '';
            const s = d.trim();
            if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
                const [dd, mm, yyyy] = s.split('/');
                return `${yyyy}-${mm}-${dd}`;
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
            return '';
        };
        setEditForm({
            PlanejadoInicioMedicao:    toISO(tag.PlanejadoInicioMedicao),
            PlanejadoFinalMedicao:     toISO(tag.PlanejadoFinalMedicao),
            RealizadoInicioMedicao:    toISO(tag.RealizadoInicioMedicao),
            RealizadoFinalMedicao:     toISO(tag.RealizadoFinalMedicao),
            PlanejadoInicioIsometrico: toISO(tag.PlanejadoInicioIsometrico),
            PlanejadoFinalIsometrico:  toISO(tag.PlanejadoFinalIsometrico),
            RealizadoInicioIsometrico: toISO(tag.RealizadoInicioIsometrico),
            RealizadoFinalIsometrico:  toISO(tag.RealizadoFinalIsometrico),
            PlanejadoInicioEngenharia: toISO(tag.PlanejadoInicioEngenharia),
            PlanejadoFinalEngenharia:  toISO(tag.PlanejadoFinalEngenharia),
            RealizadoInicioEngenharia: toISO(tag.RealizadoInicioEngenharia),
            RealizadoFinalEngenharia:  toISO(tag.RealizadoFinalEngenharia),
            PlanejadoInicioAprovacao:  toISO(tag.PlanejadoInicioAprovacao),
            PlanejadoFinalAprovacao:   toISO(tag.PlanejadoFinalAprovacao),
            RealizadoInicioAprovacao:  toISO(tag.RealizadoInicioAprovacao),
            RealizadoFinalAprovacao:   toISO(tag.RealizadoFinalAprovacao),
            PlanejadoInicioAcabamento: toISO(tag.PlanejadoInicioAcabamento),
            PlanejadoFinalAcabamento:  toISO(tag.PlanejadoFinalAcabamento),
            RealizadoInicioAcabamento: toISO(tag.RealizadoInicioAcabamento),
            RealizadoFinalAcabamento:  toISO(tag.RealizadoFinalAcabamento),
            PlanejadoInicioExpedicao:  toISO(tag.PlanejadoInicioExpedicao),
            PlanejadoFinalExpedicao:   toISO(tag.PlanejadoFinalExpedicao),
            RealizadoInicioExpedicao:  toISO(tag.RealizadoInicioExpedicao),
            realizadoFinalExpedicao:   toISO(tag.realizadoFinalExpedicao),
        });
    };

    const handleSave = async () => {
        if (!selectedProjeto) return;

        // Validação de modo individual: exatamente 1 tag
        if (modoIndividual) {
            if (!selectedSingleTagId) {
                alert('⚠️ Modo Tag Individual: selecione exatamente UMA tag na lista antes de salvar.\n\nEscolha a tag desejada clicando no botão de seleção ao lado do nome.');
                return;
            }
        } else {
            if (selectedTagIds.size === 0) {
                alert('Selecione ao menos uma tag para atualizar.');
                return;
            }
        }

        setSaving(true);
        try {
            const payload: any = {};
            Object.entries(editForm).forEach(([key, val]) => {
                if (val) payload[key] = val;
            });

            if (Object.keys(payload).length === 0) {
                alert('Preencha ao menos uma data para atualizar a(s) tag(s).');
                setSaving(false);
                return;
            }

            const usuarioLogado = getUsuarioLogado();
            const tagIds = modoIndividual ? [selectedSingleTagId!] : Array.from(selectedTagIds);

            const response = await fetch(`/api/acompanhamento-etapas/projeto/${selectedProjeto.IdProjeto}/bulk-update`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ payload, usuario: usuarioLogado, tagIds })
            });
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.message || 'Erro ao atualizar datas');
            alert(resData.message || 'Datas atualizadas com sucesso!');
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar datas: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSaving(false);
        }
    };

    // Helper para gerar os campos do modal
    // realDisabled: só bloqueia se a configuração estiver BLOQUEADA E Plan. Início estiver vazio
    const renderFormRow = (titulo: string, sulfixo: string) => {
        const planIni = editForm[`PlanejadoInicio${sulfixo}`] || '';
        // Respeita a configuração do sistema:
        //   - permitirRealizado=true  → sempre habilitado (padrão DESBLOQUEADO)
        //   - permitirRealizado=false → só habilita quando planIni estiver preenchido
        const realDisabled = !permitirRealizado && !planIni;
        const tooltipTexto = realDisabled
            ? 'Configuração do sistema: Realizado exige Planejamento. Preencha Plan. Início primeiro.'
            : '';
        return (
        <div className="grid grid-cols-5 gap-2 items-center mb-2 border-b border-gray-100 pb-2">
            <div className="font-semibold text-gray-700 text-xs uppercase">{titulo}</div>
            <div className="col-span-2 grid grid-cols-2 gap-2 border-r border-gray-200 pr-2">
                <div>
                    <label className="text-[10px] text-gray-500">Plan. Início</label>
                    <input type="date" name={`PlanejadoInicio${sulfixo}`} value={editForm[`PlanejadoInicio${sulfixo}`] || ''} onChange={handleEditChange} className="w-full text-xs p-1 border rounded" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500">Plan. Fim</label>
                    <input type="date" name={`PlanejadoFinal${sulfixo}`} value={editForm[`PlanejadoFinal${sulfixo}`] || ''} onChange={handleEditChange} className="w-full text-xs p-1 border rounded" />
                </div>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-2 pl-2">
                <div title={tooltipTexto}>
                    <label className={`text-[10px] ${realDisabled ? 'text-red-400' : 'text-gray-500'}`}>
                        Real. Início {realDisabled && <span className="font-bold">⚠</span>}
                    </label>
                    <input type="date" name={`RealizadoInicio${sulfixo}`}
                        value={editForm[`RealizadoInicio${sulfixo}`] || ''}
                        onChange={handleEditChange}
                        disabled={realDisabled}
                        className={`w-full text-xs p-1 border rounded ${realDisabled ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' : ''}`}
                    />
                </div>
                <div title={tooltipTexto}>
                    <label className={`text-[10px] ${realDisabled ? 'text-red-400' : 'text-gray-500'}`}>
                        Real. Fim {realDisabled && <span className="font-bold">⚠</span>}
                    </label>
                    <input type="date"
                        name={sulfixo === 'Expedicao' ? 'realizadoFinalExpedicao' : `RealizadoFinal${sulfixo}`}
                        value={editForm[sulfixo === 'Expedicao' ? 'realizadoFinalExpedicao' : `RealizadoFinal${sulfixo}`] || ''}
                        onChange={handleEditChange}
                        disabled={realDisabled}
                        className={`w-full text-xs p-1 border rounded ${realDisabled ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50' : ''}`}
                    />
                </div>
            </div>
        </div>
        );
    };

    return (
        <div className={`flex flex-col bg-gray-50 transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 overflow-hidden' : 'h-full'}`}>
                
                {/* HEADER & FILTERS */}
                <div className={`bg-white shadow-sm transition-all duration-300 ${!showFilters ? 'p-2 border-b border-gray-200' : 'p-4 border-b border-gray-200'}`}>
                    <div className={`flex justify-end items-center ${showFilters ? 'mb-3' : ''}`}>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setShowFilters(!showFilters)} className="text-xs flex items-center gap-1 text-gray-600 hover:text-[#03624C] transition-colors border px-2 py-1 rounded bg-gray-50">
                                <Filter size={14} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                            </button>
                            <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-gray-500 hover:text-[#03624C] transition-colors rounded border bg-gray-50" title={isExpanded ? "Restaurar" : "Maximizar"}>
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className={`bg-gray-50 p-3 rounded-md border border-gray-100 ${!showFilters ? 'hidden' : 'block'}`}>
                            {/* Campos Textuais */}
                            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-3">
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Projeto (Doc)</label>
                                    <div className="relative flex items-center">
                                        <input type="text" name="projeto" value={filters.projeto} onChange={handleFilterChange} className="w-full text-xs p-1.5 pr-6 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none uppercase" />
                                        {filters.projeto && <button type="button" onClick={() => clearFilter('projeto')} className="absolute right-1 text-gray-400 hover:text-red-500"><X size={12}/></button>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Cliente / Obra</label>
                                    <div className="relative flex items-center">
                                        <input type="text" name="cliente" value={filters.cliente} onChange={handleFilterChange} className="w-full text-xs p-1.5 pr-6 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none uppercase" />
                                        {filters.cliente && <button type="button" onClick={() => clearFilter('cliente')} className="absolute right-1 text-gray-400 hover:text-red-500"><X size={12}/></button>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Estado Origem</label>
                                    <div className="relative flex items-center">
                                        <input type="text" name="estadoOrigem" value={filters.estadoOrigem} onChange={handleFilterChange} className="w-full text-xs p-1.5 pr-6 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none uppercase" />
                                        {filters.estadoOrigem && <button type="button" onClick={() => clearFilter('estadoOrigem')} className="absolute right-1 text-gray-400 hover:text-red-500"><X size={12}/></button>}
                                    </div>
                                </div>
                            </div>

                            {/* Filtros de Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Data Previsão */}
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Previsão</label>
                                    <div className="flex gap-1 items-center">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">De</span>
                                            <div className="relative">
                                                <input type="date" name="dataPrevisaoInicio" value={filters.dataPrevisaoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataPrevisaoInicio && <button type="button" onClick={() => clearFilter('dataPrevisaoInicio')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">Até</span>
                                            <div className="relative">
                                                <input type="date" name="dataPrevisaoFim" value={filters.dataPrevisaoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataPrevisaoFim && <button type="button" onClick={() => clearFilter('dataPrevisaoFim')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Data Final */}
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Final</label>
                                    <div className="flex gap-1 items-center">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">De</span>
                                            <div className="relative">
                                                <input type="date" name="dataFinalInicio" value={filters.dataFinalInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataFinalInicio && <button type="button" onClick={() => clearFilter('dataFinalInicio')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">Até</span>
                                            <div className="relative">
                                                <input type="date" name="dataFinalFim" value={filters.dataFinalFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataFinalFim && <button type="button" onClick={() => clearFilter('dataFinalFim')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Data Planejamento */}
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Planejamento</label>
                                    <div className="flex gap-1 items-center">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">De</span>
                                            <div className="relative">
                                                <input type="date" name="dataPlanejamentoInicio" value={filters.dataPlanejamentoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataPlanejamentoInicio && <button type="button" onClick={() => clearFilter('dataPlanejamentoInicio')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">Até</span>
                                            <div className="relative">
                                                <input type="date" name="dataPlanejamentoFim" value={filters.dataPlanejamentoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataPlanejamentoFim && <button type="button" onClick={() => clearFilter('dataPlanejamentoFim')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Data Realizado */}
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Realizado</label>
                                    <div className="flex gap-1 items-center">
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">De</span>
                                            <div className="relative">
                                                <input type="date" name="dataRealizadoInicio" value={filters.dataRealizadoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataRealizadoInicio && <button type="button" onClick={() => clearFilter('dataRealizadoInicio')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <span className="text-[9px] text-gray-400 mb-0.5">Até</span>
                                            <div className="relative">
                                                <input type="date" name="dataRealizadoFim" value={filters.dataRealizadoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none focus:border-[#03624C]" />
                                                {filters.dataRealizadoFim && <button type="button" onClick={() => clearFilter('dataRealizadoFim')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><X size={10}/></button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                                <button type="button" onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 border border-gray-300 px-3 py-1.5 rounded hover:border-red-300 transition-colors">
                                    <X size={12}/> Limpar Todos
                                </button>
                                <button type="submit" className="bg-[#03624C] hover:bg-[#024a3a] text-white px-4 py-1.5 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 transition-colors">
                                    <Search size={16} /> Filtrar
                                </button>
                            </div>
                        </form>
                </div>

                {/* GRID SECTION */}
                <div className="flex-1 p-4 relative flex flex-col min-h-0">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03624C]"></div>
                        </div>
                    ) : (
                        <div className="scrollable-table bg-white shadow-sm border border-gray-200 rounded-md relative">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="bg-[#567469] text-white bg-[#567469] text-white text-white bg-[#567469] sticky top-0 z-40 bg-[#0B3A2D] shadow-sm">
                                    {/* CABEÇALHO PRINCIPAL */}
                                    <tr className="bg-[#0B3A2D] text-white text-[10px] uppercase tracking-wider border-b-2 border-[#1b6351]">
                                        <th rowSpan={2} className="p-2 border-r border-[#1b6351] sticky left-0 bg-[#0B3A2D] z-50 w-[80px]">Doc/Proj</th>
                                        <th rowSpan={2} className="p-2 sticky left-[80px] bg-[#0B3A2D] z-50 max-w-[200px]" style={{boxShadow: '2px 0 0 0 #1b6351'}}>Obra/Cliente</th>
                                        <th rowSpan={2} className="p-2 border-r border-[#1b6351] text-center">Região</th>
                                        <th rowSpan={2} className="p-2 border-r border-[#1b6351] text-center min-w-[150px]">Observação</th>
                                        <th rowSpan={2} className="p-2 border-r border-[#1b6351] text-center">Status</th>
                                        <th rowSpan={2} className="p-2 border-r border-[#1b6351] text-center font-bold" title="Prazo de entrega previsto do projeto">
                                            Prev. Projeto
                                        </th>
                                        <th rowSpan={2} className="p-2 border-r-4 border-[#1b6351] text-center">Data Fim</th>
                                        
                                        {isVisible('medicao') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('medicao', 'Medição')}</th>}
                                        {isVisible('isometrico') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('isometrico', 'Isométrico')}</th>}
                                        {isVisible('engenharia') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('engenharia', 'Engenharia')}</th>}
                                        {isVisible('aprovacao') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('aprovacao', 'Aprovação')}</th>}
                                        {isVisible('acabamento') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('acabamento', 'Acabamento')}</th>}
                                        {isVisible('expedicao') && <th colSpan={2} className="p-2 text-center border-r-2 border-[#1b6351]">{customName('expedicao', 'Expedição')}</th>}
                                        <th rowSpan={2} className="p-2 border-l border-[#1b6351] text-center sticky right-0 bg-[#0B3A2D] z-50">Ações</th>
                                    </tr>
                                    {/* SUB-CABEÇALHO (Falta/Ok) */}
                                    <tr className="text-[10px] uppercase text-white border-b border-[#1b6351]">
                                        {visibleEngSectors.map((s, i) => (
                                            <React.Fragment key={i}>
                                                <th className="p-1.5 text-center border-r border-[#1b6351] bg-[#0f4a3b] font-bold min-w-[70px]">Falta</th>
                                                <th className="p-1.5 text-center border-r-2 border-[#1b6351] bg-[#145d4b] font-bold min-w-[70px]">Ok</th>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-xs text-gray-700">
                                    {data.length === 0 ? (
                                        <tr>
                                            <td colSpan={18} className="p-8 text-center text-gray-500">Nenhum projeto encontrado.</td>
                                        </tr>
                                    ) : (
                                        data.map(row => {
                                            const showDates = viewDatesRow === row.IdProjeto;
                                            const isLiberado = row.liberado?.toUpperCase() === 'S';
                                            // Desabilitar botão calendario se não há nenhuma data
                                            const hasDates = !!(row.PlanMedicao || row.RealMedicao ||
                                                row.PlanIsometrico || row.RealIsometrico ||
                                                row.PlanEngenharia || row.RealEngenharia ||
                                                row.PlanAprovacao  || row.RealAprovacao  ||
                                                row.PlanAcabamento || row.RealAcabamento ||
                                                row.PlanExpedicao  || row.RealExpedicao);
                                            return (
                                            <React.Fragment key={row.IdProjeto}>
                                            <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                                <td className="p-2 border-r border-gray-200 sticky left-0 z-10 bg-white group-hover:bg-gray-50 font-medium text-[#03624C]">{row.Projeto || row.IdProjeto}</td>
                                                <td className="p-2 sticky left-[80px] z-10 bg-white group-hover:bg-gray-50 truncate max-w-[200px]" style={{boxShadow: '2px 0 0 0 #9ca3af'}} title={row.Cliente}>{row.Cliente}</td>
                                                <td className="p-2 border-r border-gray-200 text-center">{row.EstadoOrigem}</td>
                                                <td className="p-2 border-r border-gray-200 text-center">
                                                    <input 
                                                        type="text" 
                                                        defaultValue={row.Observacao || ''} 
                                                        onBlur={(e) => updateObservacao(row.IdProjeto, e.target.value)}
                                                        className="w-full min-w-[150px] text-xs p-1 border border-transparent hover:border-gray-300 focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] rounded outline-none bg-transparent focus:bg-white transition-colors"
                                                        placeholder="Adicionar obs..."
                                                    />
                                                </td>
                                                <td className="p-2 border-r border-gray-200 text-center">
                                                    {isLiberado ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-800 text-[10px] font-bold">
                                                            ✔ Liberado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-400 text-amber-800 text-[10px] font-bold">
                                                            ⏳ Pendente
                                                        </span>
                                                    )}
                                                </td>
                                                {/* PREV. PROJETO */}
                                                <td className="p-2 border-r border-gray-200 text-center">
                                                    {row.DataPrevisao ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 border border-orange-400 text-orange-800 font-bold text-[10px] whitespace-nowrap">
                                                            🗓 {typeof row.DataPrevisao === 'string' && row.DataPrevisao.includes('T')
                                                                ? fmtBR(row.DataPrevisao)
                                                                : row.DataPrevisao}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 text-[10px]">—</span>
                                                    )}
                                                </td>
                                                <td className="p-2 border-r-4 border-gray-400 text-center whitespace-nowrap">{row.DataFinal}</td>
                                                
                                                {/* MEDIÇÃO */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaMedicao}</td>
                                                <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkMedicao}</td>
                                                
                                                {/* ISOMETRICO */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaIsometrico}</td>
                                                <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkIsometrico}</td>
                                                
                                                {/* ENGENHARIA */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaEngenharia}</td>
                                                <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkEngenharia}</td>
                                                
                                                {/* APROVACAO */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaAprovacao}</td>
                                                <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkAprovacao}</td>
                                                
                                                {/* ACABAMENTO */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaAcabamento}</td>
                                                <td className="p-2 border-r-2 border-gray-400 text-center font-semibold text-green-600 bg-green-50/30">{row.OkAcabamento}</td>
                                                
                                                {/* EXPEDICAO */}
                                                <td className="p-2 border-r border-gray-200 text-center font-semibold text-red-600 bg-red-50/30">{row.FaltaExpedicao}</td>
                                                <td className="p-2 text-center font-semibold text-green-600 bg-green-50/30 border-r-2 border-gray-400">{row.OkExpedicao}</td>

                                                {/* AÇÕES */}
                                                <td className="p-2 border-l border-gray-200 text-center sticky right-0 z-10 bg-white group-hover:bg-gray-50 flex items-center justify-center gap-1 h-full min-h-[40px]">
                                                    <button
                                                        onClick={() => hasDates && toggleDatesView(row.IdProjeto)}
                                                        disabled={!hasDates}
                                                        className={`p-1 rounded transition-colors ${
                                                            !hasDates
                                                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                                : showDates
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                        title={!hasDates ? 'Sem datas cadastradas' : 'Exibir datas de planejamento'}
                                                    >
                                                        <Calendar size={16} />
                                                    </button>
                                                    <button onClick={() => openEditModal(row)} className="text-[#03624C] hover:text-[#024a3a] p-1 bg-teal-50 hover:bg-teal-100 rounded transition-colors" title="Editar Datas Lote">
                                                        <Edit3 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {showDates && (
                                                <tr className="border-b-2 border-indigo-300 bg-slate-50">
                                                    <td colSpan={7} className="p-0 border-r-4 border-gray-400 sticky left-0 z-10 bg-slate-100"></td>

                                                    {/* MEDIÇÃO */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanMedicao) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanMedicao)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {(() => {
                                                            const status = checkRealVsPrevisao(row.RealMedicao, row.DataPrevisao);
                                                            return fmtBR(row.RealMedicao)
                                                                ? <span title={status === 'late' ? `Atrasado! Real (${fmtBR(row.RealMedicao)}) > Prev. Projeto (${row.DataPrevisao})` : `No prazo`} className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap ${
                                                                    status === 'late' ? 'bg-red-600 ring-1 ring-red-300' :
                                                                    status === 'ok'   ? 'bg-green-600 ring-1 ring-green-300' :
                                                                    'bg-emerald-600'
                                                                  }`}>{fmtBR(row.RealMedicao)}</span>
                                                                : <span className="text-slate-400 text-[10px]">-</span>;
                                                        })()}
                                                    </td>

                                                    {/* ISOMÉTRICO */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanIsometrico) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanIsometrico)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {(() => {
                                                            const status = checkRealVsPrevisao(row.RealIsometrico, row.DataPrevisao);
                                                            return fmtBR(row.RealIsometrico)
                                                                ? <span title={status === 'late' ? `Atrasado! Real (${fmtBR(row.RealIsometrico)}) > Prev. Projeto (${row.DataPrevisao})` : `No prazo`} className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap ${
                                                                    status === 'late' ? 'bg-red-600 ring-1 ring-red-300' :
                                                                    status === 'ok'   ? 'bg-green-600 ring-1 ring-green-300' :
                                                                    'bg-emerald-600'
                                                                  }`}>{fmtBR(row.RealIsometrico)}</span>
                                                                : <span className="text-slate-400 text-[10px]">-</span>;
                                                        })()}
                                                    </td>

                                                    {/* ENGENHARIA */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanEngenharia) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanEngenharia)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {(() => {
                                                            const status = checkRealVsPrevisao(row.RealEngenharia, row.DataPrevisao);
                                                            return fmtBR(row.RealEngenharia)
                                                                ? <span title={status === 'late' ? `Atrasado! Real (${fmtBR(row.RealEngenharia)}) > Prev. Projeto (${row.DataPrevisao})` : `No prazo`} className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap ${
                                                                    status === 'late' ? 'bg-red-600 ring-1 ring-red-300' :
                                                                    status === 'ok'   ? 'bg-green-600 ring-1 ring-green-300' :
                                                                    'bg-emerald-600'
                                                                  }`}>{fmtBR(row.RealEngenharia)}</span>
                                                                : <span className="text-slate-400 text-[10px]">-</span>;
                                                        })()}
                                                    </td>

                                                    {/* APROVAÇÃO */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanAprovacao) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanAprovacao)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {(() => {
                                                            const status = checkRealVsPrevisao(row.RealAprovacao, row.DataPrevisao);
                                                            return fmtBR(row.RealAprovacao)
                                                                ? <span title={status === 'late' ? `Atrasado! Real (${fmtBR(row.RealAprovacao)}) > Prev. Projeto (${row.DataPrevisao})` : `No prazo`} className={`inline-block px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap ${
                                                                    status === 'late' ? 'bg-red-600 ring-1 ring-red-300' :
                                                                    status === 'ok'   ? 'bg-green-600 ring-1 ring-green-300' :
                                                                    'bg-emerald-600'
                                                                  }`}>{fmtBR(row.RealAprovacao)}</span>
                                                                : <span className="text-slate-400 text-[10px]">-</span>;
                                                        })()}
                                                    </td>

                                                    {/* ACABAMENTO */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanAcabamento) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanAcabamento)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {fmtBR(row.RealAcabamento) ? <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.RealAcabamento)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>

                                                    {/* EXPEDIÇÃO */}
                                                    <td className="p-1.5 border-r border-indigo-200 text-center bg-blue-50">
                                                        {fmtBR(row.PlanExpedicao) ? <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.PlanExpedicao)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-1.5 border-r-2 border-gray-400 text-center bg-emerald-50">
                                                        {fmtBR(row.RealExpedicao) ? <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold whitespace-nowrap">{fmtBR(row.RealExpedicao)}</span> : <span className="text-slate-400 text-[10px]">-</span>}
                                                    </td>

                                                    <td className="p-2 border-l border-gray-200 sticky right-0 z-10 bg-slate-100"></td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL DE EDIÇÃO EM LOTE */}
                {isModalOpen && selectedProjeto && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-bold text-[#32423D] flex items-center gap-2">
                                        <Edit3 className="text-[#03624C]" size={20} />
                                        Alterar Datas em Lote (Etapas)
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Projeto: <strong className="text-gray-800">{selectedProjeto.Projeto || selectedProjeto.IdProjeto}</strong> - {selectedProjeto.Cliente}
                                    </p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">

                                {/* Toggle Modo */}
                                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg w-fit">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoIndividual(false);
                                            setSelectedSingleTagId(null);
                                            // Restaura todos selecionados
                                            setSelectedTagIds(new Set(projetoTags.map(t => t.IdTag)));
                                            setEditForm({
                                                PlanejadoInicioMedicao: '', PlanejadoFinalMedicao: '', RealizadoInicioMedicao: '', RealizadoFinalMedicao: '',
                                                PlanejadoInicioIsometrico: '', PlanejadoFinalIsometrico: '', RealizadoInicioIsometrico: '', RealizadoFinalIsometrico: '',
                                                PlanejadoInicioEngenharia: '', PlanejadoFinalEngenharia: '', RealizadoInicioEngenharia: '', RealizadoFinalEngenharia: '',
                                                PlanejadoInicioAprovacao: '', PlanejadoFinalAprovacao: '', RealizadoInicioAprovacao: '', RealizadoFinalAprovacao: '',
                                                PlanejadoInicioAcabamento: '', PlanejadoFinalAcabamento: '', RealizadoInicioAcabamento: '', RealizadoFinalAcabamento: '',
                                                PlanejadoInicioExpedicao: '', PlanejadoFinalExpedicao: '', RealizadoInicioExpedicao: '', realizadoFinalExpedicao: ''
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                            !modoIndividual
                                                ? 'bg-white shadow text-[#03624C] border border-[#03624C]/20'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        📋 Em Lote
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModoIndividual(true);
                                            setSelectedSingleTagId(null);
                                            setSelectedTagIds(new Set());
                                            setEditForm({
                                                PlanejadoInicioMedicao: '', PlanejadoFinalMedicao: '', RealizadoInicioMedicao: '', RealizadoFinalMedicao: '',
                                                PlanejadoInicioIsometrico: '', PlanejadoFinalIsometrico: '', RealizadoInicioIsometrico: '', RealizadoFinalIsometrico: '',
                                                PlanejadoInicioEngenharia: '', PlanejadoFinalEngenharia: '', RealizadoInicioEngenharia: '', RealizadoFinalEngenharia: '',
                                                PlanejadoInicioAprovacao: '', PlanejadoFinalAprovacao: '', RealizadoInicioAprovacao: '', RealizadoFinalAprovacao: '',
                                                PlanejadoInicioAcabamento: '', PlanejadoFinalAcabamento: '', RealizadoInicioAcabamento: '', RealizadoFinalAcabamento: '',
                                                PlanejadoInicioExpedicao: '', PlanejadoFinalExpedicao: '', RealizadoInicioExpedicao: '', realizadoFinalExpedicao: ''
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                                            modoIndividual
                                                ? 'bg-white shadow text-blue-700 border border-blue-300'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        🎯 Tag Individual
                                    </button>
                                </div>

                                {/* Aviso contextual */}
                                <div className={`border-l-4 p-3 rounded flex items-start gap-2 ${
                                    modoIndividual
                                        ? 'bg-blue-50 border-blue-400'
                                        : 'bg-amber-50 border-amber-400'
                                }`}>
                                    <AlertCircle className={modoIndividual ? 'text-blue-500' : 'text-amber-500'} size={16} style={{flexShrink:0, marginTop:2}} />
                                    <p className={`text-xs ${modoIndividual ? 'text-blue-800' : 'text-amber-800'}`}>
                                        {modoIndividual ? (
                                            <>
                                                Modo <strong>Tag Individual</strong>: selecione <strong>exatamente uma tag</strong> na lista. As datas atuais dessa tag serão carregadas automaticamente para edição.
                                                {!selectedSingleTagId && (
                                                    <span className="ml-1 font-bold text-blue-700"> ← Nenhuma tag selecionada ainda.</span>
                                                )}
                                            </>
                                        ) : (
                                            <>As datas informadas serão aplicadas <strong>às Tags selecionadas</strong> deste projeto, sobrescrevendo valores antigos. Deixe em branco o que não quiser alterar.</>
                                        )}
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    {/* SELEÇÃO DE TAGS */}
                                    <div className="w-1/3 flex flex-col bg-white border border-gray-200 rounded-md p-3">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                            <h3 className="font-semibold text-gray-700 text-sm">
                                                {modoIndividual ? '🎯 Selecione 1 Tag' : 'Tags a atualizar'}
                                            </h3>
                                            {!modoIndividual && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        if (selectedTagIds.size === projetoTags.length && projetoTags.length > 0) {
                                                            setSelectedTagIds(new Set());
                                                        } else {
                                                            setSelectedTagIds(new Set(projetoTags.map(t => t.IdTag)));
                                                        }
                                                    }} 
                                                    className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-700 hover:bg-gray-200"
                                                >
                                                    {selectedTagIds.size === projetoTags.length && projetoTags.length > 0 ? 'Desmarcar' : 'Selecionar Todas'}
                                                </button>
                                            )}
                                        </div>
                                        {loadingTags ? (
                                            <div className="text-xs text-gray-500 text-center py-4">Carregando tags...</div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-1 pr-2 custom-scrollbar">
                                                {projetoTags.length === 0 ? (
                                                    <span className="text-xs text-gray-400">Nenhuma tag encontrada.</span>
                                                ) : (
                                                    projetoTags.map(tag => (
                                                        <label
                                                            key={tag.IdTag}
                                                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border transition-colors ${
                                                                modoIndividual && selectedSingleTagId === tag.IdTag
                                                                    ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300'
                                                                    : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                                                            }`}
                                                        >
                                                            {modoIndividual ? (
                                                                // MODO INDIVIDUAL: radio button
                                                                <input
                                                                    type="radio"
                                                                    name="singleTag"
                                                                    className="text-blue-600 focus:ring-blue-500"
                                                                    checked={selectedSingleTagId === tag.IdTag}
                                                                    onChange={() => {
                                                                        setSelectedSingleTagId(tag.IdTag);
                                                                        loadTagDates(tag); // pré-carrega as datas da tag
                                                                    }}
                                                                />
                                                            ) : (
                                                                // MODO LOTE: checkbox
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="rounded text-[#03624C] focus:ring-[#03624C]"
                                                                    checked={selectedTagIds.has(tag.IdTag)}
                                                                    onChange={(e) => {
                                                                        const newSet = new Set(selectedTagIds);
                                                                        if (e.target.checked) newSet.add(tag.IdTag);
                                                                        else newSet.delete(tag.IdTag);
                                                                        setSelectedTagIds(newSet);
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-gray-800 leading-tight">{tag.Tag}</span>
                                                                <span className="text-[10px] text-gray-500 truncate max-w-[180px]" title={tag.DescTag}>{tag.DescTag}</span>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-2 pt-2 border-t text-[10px] font-medium">
                                            {modoIndividual ? (
                                                <span className={selectedSingleTagId ? 'text-blue-700' : 'text-red-500'}>
                                                    {selectedSingleTagId
                                                        ? `✔ 1 tag selecionada`
                                                        : '⚠ Selecione 1 tag'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">{selectedTagIds.size} de {projetoTags.length} tags selecionadas</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* FORMULÁRIO DE DATAS */}
                                    <div className="w-2/3 bg-white border border-gray-200 rounded-md p-4">
                                        {/* Badge de status da configuração */}
                                        <div className={`flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full w-fit text-[10px] font-bold border ${
                                            permitirRealizado
                                                ? 'bg-green-50 border-green-300 text-green-700'
                                                : 'bg-red-50 border-red-300 text-red-700'
                                        }`}>
                                            <span>{permitirRealizado ? '🔓' : '🔒'}</span>
                                            <span>
                                                Realizado: {permitirRealizado
                                                    ? 'Livre (sem exigir Planejamento)'
                                                    : 'Restrito (exige Planejamento preenchido)'}
                                            </span>
                                        </div>
                                        {renderFormRow('Medição', 'Medicao')}
                                        {renderFormRow('Isométrico', 'Isometrico')}
                                        {renderFormRow('Engenharia', 'Engenharia')}
                                        {renderFormRow('Aprovação', 'Aprovacao')}
                                        {renderFormRow('Acabamento', 'Acabamento')}
                                        {renderFormRow('Expedição', 'Expedicao')}
                                    </div>

                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsModalOpen(false)} 
                                    disabled={saving}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave} 
                                    disabled={saving || (modoIndividual && !selectedSingleTagId)}
                                    className="px-4 py-2 bg-[#03624C] hover:bg-[#024a3a] text-white rounded text-sm font-medium shadow flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Salvando...</>
                                    ) : (
                                        <><Save size={16} /> {modoIndividual ? 'Salvar Tag' : 'Salvar Datas em Lote'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
}
