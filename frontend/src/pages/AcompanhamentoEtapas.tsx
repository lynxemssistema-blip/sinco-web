import React, { useState, useEffect } from 'react';

import { 
    Search, Filter, Save, X, Calendar, Edit3, Briefcase, 
    ChevronDown, ChevronUp, AlertCircle, CheckCircle, Maximize2, Minimize2
} from 'lucide-react';

interface EtapasRow {
    IdProjeto: number;
    Projeto: string;
    DataPrevisao: string;
    DataFinal: string;
    Cliente: string;
    EstadoOrigem: string;
    StatusProj: string;
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

    // Linhas mostrando datas
    const [viewDatesRows, setViewDatesRows] = useState<Set<number>>(new Set());

    const toggleDatesView = (idProjeto: number) => {
        setViewDatesRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idProjeto)) newSet.delete(idProjeto);
            else newSet.add(idProjeto);
            return newSet;
        });
    };

    const updateObservacao = async (idProjeto: number, novaObs: string) => {
        try {
            const response = await fetch(`/api/acompanhamento/projeto/${idProjeto}/observacao`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observacao: novaObs })
            });
            if (!response.ok) throw new Error('Erro ao salvar');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar a observação.');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            const response = await fetch(`/api/acompanhamento-etapas?${queryParams.toString()}`);
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

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        setLoadingTags(true);
        try {
            const res = await fetch(`/api/acompanhamento/projeto/${row.IdProjeto}/tags`);
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

    const handleSave = async () => {
        if (!selectedProjeto) return;
        setSaving(true);
        try {
            // Filtra apenas os campos que foram preenchidos (para não apagar os outros caso mande vazio)
            const payload: any = {};
            Object.entries(editForm).forEach(([key, val]) => {
                if (val) payload[key] = val;
            });

            if (Object.keys(payload).length === 0) {
                alert('Preencha ao menos uma data para atualizar as tags deste projeto.');
                setSaving(false);
                return;
            }

            if (selectedTagIds.size === 0) {
                alert('Selecione ao menos uma tag para atualizar.');
                setSaving(false);
                return;
            }

            let usuarioLogado = 'Sistema';
            try {
                const u = JSON.parse(localStorage.getItem('sinco_user') || '{}');
                usuarioLogado = u.username || u.name || u.NomeCompleto || 'Sistema';
            } catch (e) {}

            const response = await fetch(`/api/acompanhamento-etapas/projeto/${selectedProjeto.IdProjeto}/bulk-update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ payload, usuario: usuarioLogado, tagIds: Array.from(selectedTagIds) })
            });
            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData.message || 'Erro ao atualizar datas');
            }
            alert(resData.message || 'Datas atualizadas com sucesso em todas as tags deste projeto!');
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao atualizar datas: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    // Helper para gerar os campos do modal
    const renderFormRow = (titulo: string, sulfixo: string) => (
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
                <div>
                    <label className="text-[10px] text-gray-500">Real. Início</label>
                    <input type="date" name={`RealizadoInicio${sulfixo}`} value={editForm[`RealizadoInicio${sulfixo}`] || ''} onChange={handleEditChange} className="w-full text-xs p-1 border rounded" />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500">Real. Fim</label>
                    <input type="date" name={sulfixo === 'Expedicao' ? 'realizadoFinalExpedicao' : `RealizadoFinal${sulfixo}`} value={editForm[sulfixo === 'Expedicao' ? 'realizadoFinalExpedicao' : `RealizadoFinal${sulfixo}`] || ''} onChange={handleEditChange} className="w-full text-xs p-1 border rounded" />
                </div>
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col bg-gray-50 transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 overflow-hidden' : 'h-[calc(100vh-4rem)]'}`}>
                
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
                            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-3">
                                {/* Campos Textuais */}
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Projeto (Doc)</label>
                                    <input type="text" name="projeto" value={filters.projeto} onChange={handleFilterChange} className="w-full text-xs p-1.5 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Cliente / Obra</label>
                                    <input type="text" name="cliente" value={filters.cliente} onChange={handleFilterChange} className="w-full text-xs p-1.5 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Estado Origem</label>
                                    <input type="text" name="estadoOrigem" value={filters.estadoOrigem} onChange={handleFilterChange} className="w-full text-xs p-1.5 border rounded focus:border-[#03624C] focus:ring-1 focus:ring-[#03624C] outline-none" />
                                </div>
                            </div>

                            {/* Filtros de Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Previsão</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Início" name="dataPrevisaoInicio" value={filters.dataPrevisaoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                        <input type="text" placeholder="Fim" name="dataPrevisaoFim" value={filters.dataPrevisaoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                    </div>
                                </div>
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Final</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Início" name="dataFinalInicio" value={filters.dataFinalInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                        <input type="text" placeholder="Fim" name="dataFinalFim" value={filters.dataFinalFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                    </div>
                                </div>
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Planejamento</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Início" name="dataPlanejamentoInicio" value={filters.dataPlanejamentoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                        <input type="text" placeholder="Fim" name="dataPlanejamentoFim" value={filters.dataPlanejamentoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                    </div>
                                </div>
                                <div className="border border-gray-200 p-2 rounded bg-white">
                                    <label className="block text-[10px] uppercase font-semibold text-[#03624C] mb-1 flex items-center gap-1"><Calendar size={10}/> Data Realizado</label>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Início" name="dataRealizadoInicio" value={filters.dataRealizadoInicio} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                        <input type="text" placeholder="Fim" name="dataRealizadoFim" value={filters.dataRealizadoFim} onChange={handleFilterChange} className="w-full text-xs p-1 border rounded outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button type="submit" className="bg-[#03624C] hover:bg-[#024a3a] text-white px-4 py-1.5 rounded-md text-sm font-medium shadow-sm flex items-center gap-2 transition-colors">
                                    <Search size={16} /> Filtrar
                                </button>
                            </div>
                        </form>
                </div>

                {/* GRID SECTION */}
                <div className="flex-1 overflow-hidden p-4 relative flex flex-col">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03624C]"></div>
                        </div>
                    ) : (
                        <div className="bg-white shadow-sm border border-gray-200 rounded-md overflow-auto flex-1 relative">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead className="sticky top-0 z-40 bg-gray-100 shadow-sm">
                                    {/* CABEÇALHO PRINCIPAL */}
                                    <tr className="bg-gray-100 text-gray-700 text-[10px] uppercase tracking-wider border-b-2 border-gray-300">
                                        <th rowSpan={2} className="p-2 border-r border-gray-300 sticky left-0 bg-gray-100 z-50 w-[80px]">Doc/Proj</th>
                                        <th rowSpan={2} className="p-2 border-r border-gray-300 sticky left-[80px] bg-gray-100 z-50 max-w-[200px]">Obra/Cliente</th>
                                        <th rowSpan={2} className="p-2 border-r border-gray-300 text-center">Região</th>
                                        <th rowSpan={2} className="p-2 border-r border-gray-300 text-center min-w-[150px]">Observação</th>
                                        <th rowSpan={2} className="p-2 border-r border-gray-300 text-center">Status</th>
                                        <th rowSpan={2} className="p-2 border-r-4 border-gray-400 text-center">Data Fim</th>
                                        
                                        <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Medição</th>
                                        <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">Isométrico</th>
                                        <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Engenharia</th>
                                        <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-indigo-50">Aprovação</th>
                                        <th colSpan={2} className="p-2 text-center border-r-2 border-gray-400 bg-blue-50">Acabamento</th>
                                        <th colSpan={2} className="p-2 text-center bg-indigo-50">Expedição</th>
                                        <th rowSpan={2} className="p-2 border-l border-gray-300 text-center sticky right-0 bg-gray-100 z-50">Ações</th>
                                    </tr>
                                    {/* SUB-CABEÇALHO (Falta/Ok) */}
                                    <tr className="text-[10px] uppercase text-gray-600 border-b border-gray-300">
                                        {Array.from({length: 6}).map((_, i) => (
                                            <React.Fragment key={i}>
                                                <th className="p-1.5 text-center border-r border-gray-200 bg-red-50 text-red-700 font-bold min-w-[70px]">Falta <span className="text-gray-400 font-normal">/ Plan.</span></th>
                                                <th className="p-1.5 text-center border-r-2 border-gray-400 bg-green-50 text-green-700 font-bold min-w-[70px]">Ok <span className="text-gray-400 font-normal">/ Real.</span></th>
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
                                            const showDates = viewDatesRows.has(row.IdProjeto);
                                            return (
                                            <React.Fragment key={row.IdProjeto}>
                                            <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                                                <td className="p-2 border-r border-gray-200 sticky left-0 z-10 bg-white group-hover:bg-gray-50 font-medium text-[#03624C]">{row.Projeto || row.IdProjeto}</td>
                                                <td className="p-2 border-r border-gray-200 sticky left-[80px] z-10 bg-white group-hover:bg-gray-50 truncate max-w-[200px]" title={row.Cliente}>{row.Cliente}</td>
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
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.StatusProj?.toUpperCase() === 'CONCLUIDO' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {row.StatusProj}
                                                    </span>
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
                                                    <button onClick={() => toggleDatesView(row.IdProjeto)} className={`p-1 rounded transition-colors ${showDates ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Alternar Datas/Quantidades">
                                                        <Calendar size={16} />
                                                    </button>
                                                    <button onClick={() => openEditModal(row)} className="text-[#03624C] hover:text-[#024a3a] p-1 bg-teal-50 hover:bg-teal-100 rounded transition-colors" title="Editar Datas Lote">
                                                        <Edit3 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {showDates && (
                                                <tr className="bg-indigo-50/30 border-b-2 border-indigo-200">
                                                    <td colSpan={6} className="p-2 border-r-4 border-gray-400 text-right pr-4 text-[10px] font-bold text-indigo-700 sticky left-0 z-10 bg-indigo-50/80">DATAS (Plan. / Real.):</td>
                                                    
                                                    {/* MEDIÇÃO */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.PlanMedicao || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.RealMedicao || '-'}</td>
                                                    
                                                    {/* ISOMETRICO */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.PlanIsometrico || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.RealIsometrico || '-'}</td>
                                                    
                                                    {/* ENGENHARIA */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.PlanEngenharia || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.RealEngenharia || '-'}</td>
                                                    
                                                    {/* APROVACAO */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.PlanAprovacao || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.RealAprovacao || '-'}</td>
                                                    
                                                    {/* ACABAMENTO */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.PlanAcabamento || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-blue-50/80">{row.RealAcabamento || '-'}</td>
                                                    
                                                    {/* EXPEDICAO */}
                                                    <td className="p-2 border-r border-indigo-200 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.PlanExpedicao || '-'}</td>
                                                    <td className="p-2 border-r-2 border-gray-400 text-center text-[10px] text-indigo-900 bg-indigo-50/80">{row.RealExpedicao || '-'}</td>

                                                    <td className="p-2 border-l border-gray-200 sticky right-0 z-10 bg-indigo-50/80"></td>
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
                                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded flex items-start gap-2">
                                    <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                                    <p className="text-xs text-amber-800">
                                        As datas informadas serão aplicadas <strong>às Tags selecionadas</strong> deste projeto, sobrescrevendo valores antigos. Deixe em branco o que não quiser alterar.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    {/* SELEÇÃO DE TAGS */}
                                    <div className="w-1/3 flex flex-col bg-white border border-gray-200 rounded-md p-3">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b">
                                            <h3 className="font-semibold text-gray-700 text-sm">Tags a atualizar</h3>
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
                                        </div>
                                        {loadingTags ? (
                                            <div className="text-xs text-gray-500 text-center py-4">Carregando tags...</div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-1 pr-2 custom-scrollbar">
                                                {projetoTags.length === 0 ? (
                                                    <span className="text-xs text-gray-400">Nenhuma tag encontrada.</span>
                                                ) : (
                                                    projetoTags.map(tag => (
                                                        <label key={tag.IdTag} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
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
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-gray-800 leading-tight">{tag.Tag}</span>
                                                                <span className="text-[10px] text-gray-500 truncate max-w-[180px]" title={tag.DescTag}>{tag.DescTag}</span>
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-2 pt-2 border-t text-[10px] text-gray-500 font-medium">
                                            {selectedTagIds.size} de {projetoTags.length} tags selecionadas
                                        </div>
                                    </div>

                                    {/* FORMULÁRIO DE DATAS */}
                                    <div className="w-2/3 bg-white border border-gray-200 rounded-md p-4">
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
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#03624C] hover:bg-[#024a3a] text-white rounded text-sm font-medium shadow flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {saving ? (
                                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Salvando...</>
                                    ) : (
                                        <><Save size={16} /> Salvar Datas em Lote</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
}
