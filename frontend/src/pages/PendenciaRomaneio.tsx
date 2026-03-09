import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle, ArrowLeft, Save, Loader2,
    Calendar, User, Layers, MessageSquare, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { formatToBRDate } from '../utils/dateUtils';

interface PendenciaRomaneioPageProps {
    onNavigate: (id: string) => void;
    idRomaneioItem: number | null;
}

interface ItemContext {
    IdRomaneioItem: number;
    IdOrdemServicoItem: number;
    IdOrdemServico: number;
    IdRomaneio: number;
    Romaneio: string;
    IdMaterial: number;
    DescResumo: string;
    DescDetal: string;
    CodMatFabricante: string;
    Espessura: string;
    MaterialSW: string;
    IdProjeto: number;
    Projeto: string;
    IdTag: number;
    Tag: string;
    DescTag: string;
    IdEmpresa: number;
    DescEmpresa: string;
    DescricaoRomaneio: string;
    DescricaoProjeto_Full: string;
    DescProjeto: string;
}

interface Pendencia {
    IdOrdemServicoItemPendencia: number;
    SetorResponsavel: string;
    TipoTarefa: string;
    UsuarioResponsavel: string;
    DataExecucao: string;
    DescricaoPendencia: string;
    DataCriacao: string;
    Usuario: string;
    Estatus: string;
    // New fields for display in Edit Mode
    IdOrdemServico?: number;
    IdOrdemServicoItem?: number;
    CodMatFabricante?: string;
}

export default function PendenciaRomaneioPage({ onNavigate, idRomaneioItem }: PendenciaRomaneioPageProps) {
    const { user } = useAuth();
    const { showAlert } = useAlert();

    // States for data
    const [itemContext, setItemContext] = useState<ItemContext | null>(null);
    const [pendencies, setPendencies] = useState<Pendencia[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);
    const [collaborators, setCollaborators] = useState<{ idUsuario: number, NomeCompleto: string }[]>([]);
    const [taskTypes, setTaskTypes] = useState<string[]>([]);

    // Loading/Global states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [showFinalized, setShowFinalized] = useState(false);
    const [searchQuery1, setSearchQuery1] = useState('');
    const [searchQuery2, setSearchQuery2] = useState('');
    const [isCustomTaskType, setIsCustomTaskType] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        IdOrdemServicoItemPendencia: undefined as number | undefined,
        setorResponsavel: '',
        idUsuarioResponsavel: '',
        usuarioResponsavel: '',
        tipoTarefa: '',
        dataExecucao: new Date().toISOString().split('T')[0],
        descricaoPendencia: '',
        // Read-only display fields
        displayIdOrdemServico: undefined as number | undefined,
        displayIdOrdemServicoItem: undefined as number | undefined,
        displayCodMatFabricante: ''
    });

    // Fetch initial data
    useEffect(() => {
        if (!idRomaneioItem) {
            setError('Nenhum item selecionado para gerar pendência.');
            setLoading(false);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            try {
                // 1. Get header context
                const resCtx = await fetch(`/api/rnc/item-data/${idRomaneioItem}`);
                const dataCtx = await resCtx.json();
                if (!dataCtx.success) throw new Error(dataCtx.message);
                setItemContext(dataCtx.data);

                // 2. Get existing pendencies
                const params = new URLSearchParams({
                    showFinalized: String(showFinalized),
                    q1: searchQuery1,
                    q2: searchQuery2
                });
                const resList = await fetch(`/api/rnc/list/${idRomaneioItem}?${params}`);
                const dataList = await resList.json();
                if (dataList.success) setPendencies(dataList.data);

                // 3. Get lookup data
                const [resSectors, resTasks, resColabs] = await Promise.all([
                    fetch('/api/rnc/sectors'),
                    fetch('/api/rnc/task-types'),
                    fetch('/api/rnc/collaborators')
                ]);

                const [dSectors, dTasks, dColabs] = await Promise.all([
                    resSectors.json(), resTasks.json(), resColabs.json()
                ]);

                if (dSectors.success) setSectors(dSectors.data);
                if (dTasks.success) setTaskTypes(dTasks.data);
                if (dColabs.success) setCollaborators(dColabs.data);

            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [idRomaneioItem, showFinalized, searchQuery1, searchQuery2]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemContext) return;

        setSaving(true);
        setError(null);

        const payload = {
            ...formData,
            idOrdemServicoItemPendencia: formData.IdOrdemServicoItemPendencia, // Ensure camelCase for backend
            idOrdemServicoItem: itemContext.IdOrdemServicoItem, // Correctly mapped to OS Item ID as requested
            idOrdemServico: itemContext.IdOrdemServico,
            idRomaneio: itemContext.IdRomaneio,
            romaneio: itemContext.IdRomaneio, // VB.NET uses IdRomaneio as "Romaneio" string too
            idMaterial: itemContext.IdMaterial,
            descResumo: itemContext.DescResumo,
            descDetal: itemContext.DescDetal,
            codMatFabricante: itemContext.CodMatFabricante,
            espessura: itemContext.Espessura,
            materialSW: itemContext.MaterialSW,
            idProjeto: itemContext.IdProjeto,
            projeto: itemContext.Projeto,
            descProjeto: itemContext.DescProjeto,
            idTag: itemContext.IdTag,
            tag: itemContext.Tag,
            descTag: itemContext.DescTag,
            descEmpresa: itemContext.DescEmpresa,
            usuario: user?.nome || 'Sistema',
            criadoPorSetor: user?.setor || '',
            origemPendencia: 'Romaneio'
        };

        try {
            const res = await fetch('/api/rnc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                // Refresh list
                const params = new URLSearchParams({
                    showFinalized: String(showFinalized),
                    q1: searchQuery1,
                    q2: searchQuery2
                });
                const resList = await fetch(`/api/rnc/list/${idRomaneioItem}?${params}`);
                const dataList = await resList.json();
                if (dataList.success) setPendencies(dataList.data);

                // Refresh task types if custom type was added
                if (isCustomTaskType) {
                    const resTasks = await fetch('/api/rnc/task-types');
                    const dTasks = await resTasks.json();
                    if (dTasks.success) setTaskTypes(dTasks.data);
                    setIsCustomTaskType(false);
                }

                // Clear form but keep contextual lookups
                setFormData({
                    IdOrdemServicoItemPendencia: undefined,
                    setorResponsavel: '',
                    idUsuarioResponsavel: '',
                    usuarioResponsavel: '',
                    tipoTarefa: '',
                    dataExecucao: new Date().toISOString().split('T')[0],
                    descricaoPendencia: '',
                    displayIdOrdemServico: undefined,
                    displayIdOrdemServicoItem: undefined,
                    displayCodMatFabricante: ''
                });
                showAlert('Processo concluído!', "success");
            } else {
                showAlert(json.message, "error");
            }
        } catch (err) {
            showAlert('Erro ao salvar RNC', "error");
        } finally {
            setSaving(false);
        }
    };

    const handleFinalize = async () => {
        if (!formData.IdOrdemServicoItemPendencia) return;

        if (!window.confirm('Tem certeza que deseja FINALIZAR esta pendência? Isso irá decrementar o contador de pendências.')) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/rnc/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idOrdemServicoItemPendencia: formData.IdOrdemServicoItemPendencia,
                    usuario: user?.nome || 'Sistema',
                    setor: user?.setor || '',
                    descricao: formData.descricaoPendencia // Send current description content
                })
            });
            const json = await res.json();

            if (json.success) {
                // Refresh list
                const params = new URLSearchParams({
                    showFinalized: String(showFinalized),
                    q1: searchQuery1,
                    q2: searchQuery2
                });
                const resList = await fetch(`/api/rnc/list/${idRomaneioItem}?${params}`);
                const dataList = await resList.json();
                if (dataList.success) setPendencies(dataList.data);

                // Clear form
                setFormData({
                    IdOrdemServicoItemPendencia: undefined,
                    setorResponsavel: '',
                    idUsuarioResponsavel: '',
                    usuarioResponsavel: '',
                    tipoTarefa: '',
                    dataExecucao: new Date().toISOString().split('T')[0],
                    descricaoPendencia: '',
                    displayIdOrdemServico: undefined,
                    displayIdOrdemServicoItem: undefined,
                    displayCodMatFabricante: ''
                });
                showAlert('Pendência FINALIZADA com sucesso!', "success");
            } else {
                showAlert(json.message, "error");
            }
        } catch (err) {
            showAlert('Erro ao finalizar pendência', "error");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (p: Pendencia) => {
        const colab = collaborators.find(c => c.NomeCompleto === p.UsuarioResponsavel);

        // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
        let formattedDate = '';
        if (p.DataExecucao) {
            // Check if format is dd/mm/yyyy HH:MM:SS or just date partition
            const datePart = p.DataExecucao.split(' ')[0];
            if (datePart.includes('/')) {
                const parts = datePart.split('/');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            } else if (datePart.includes('-')) {
                // Already YYYY-MM-DD
                formattedDate = datePart;
            }
        }

        setFormData({
            IdOrdemServicoItemPendencia: p.IdOrdemServicoItemPendencia,
            setorResponsavel: p.SetorResponsavel || '',
            idUsuarioResponsavel: colab ? String(colab.idUsuario) : '',
            usuarioResponsavel: p.UsuarioResponsavel || '',
            tipoTarefa: p.TipoTarefa || '',
            dataExecucao: formattedDate,
            descricaoPendencia: p.DescricaoPendencia || '',
            // Map read-only fields
            displayIdOrdemServico: p.IdOrdemServico,
            displayIdOrdemServicoItem: p.IdOrdemServicoItem,
            displayCodMatFabricante: p.CodMatFabricante || ''
        });
        setIsCustomTaskType(false); // Exit custom task type mode when editing
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400 gap-4">
                <Loader2 size={40} className="animate-spin" />
                <p>Carregando informações da pendência...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-20">
            {/* Header Controls */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => onNavigate('romaneio')}
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-[#32423D] font-medium transition-colors"
                >
                    <ArrowLeft size={20} />
                    Voltar para Romaneios
                </button>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Módulo RNC
                    </span>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-3">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {/* Item Context Card - Premium Horizontal Layout */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-[#32423D] flex items-center gap-2 text-sm">
                        <Layers size={16} className="text-[#E0E800]" />
                        Informações do Item
                    </h2>
                </div>

                <div className="p-6">
                    {/* Main Technical Summary Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">Item ID</p>
                            <p className="text-sm font-bold text-[#32423D]">
                                #{idRomaneioItem}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-amber-600 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">O.S.I.</p>
                            <p className="text-sm font-bold text-amber-700">
                                {itemContext?.IdOrdemServicoItem || '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">Projeto</p>
                            <p className="text-sm font-bold text-[#32423D] truncate" title={itemContext?.Projeto}>
                                {itemContext?.Projeto || '-'}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1 line-clamp-1">{itemContext?.DescProjeto}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">Romaneio</p>
                            <p className="text-sm font-bold text-[#32423D]">
                                #{itemContext?.IdRomaneio} {itemContext?.DescricaoRomaneio || ''}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">Tag / Desc. Tag</p>
                            <p className="text-sm font-bold text-[#32423D]">
                                {itemContext?.Tag || '-'}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1 line-clamp-1">{itemContext?.DescTag}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">O.S. (Geral)</p>
                            <p className="text-sm font-bold text-[#32423D]">
                                #{itemContext?.IdOrdemServico || '-'}
                            </p>
                            <p className="text-[9px] text-[#32423D] opacity-70 mt-1">Cliente: {itemContext?.DescEmpresa || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-orange-600 uppercase font-black mb-1.5 tracking-tighter whitespace-nowrap">Cód. Mat. Fabricante</p>
                            <p className="text-sm font-black text-orange-600">
                                {itemContext?.CodMatFabricante || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Secondary Details Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 border-t border-gray-50 items-center">
                        <div className="md:col-span-4">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Descrição Item</p>
                            <p className="text-base font-bold text-[#32423D]">{itemContext?.DescResumo || 'Item sem descrição'}</p>
                            <p className="text-[11px] text-gray-500 leading-tight mt-1">{itemContext?.DescDetal}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Espessura</p>
                            <p className="text-sm font-semibold text-[#32423D]">{itemContext?.Espessura || '-'}</p>
                        </div>
                        <div className="md:col-span-3">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Material SW</p>
                            <p className="text-sm font-semibold text-[#32423D]">{itemContext?.MaterialSW || '-'}</p>
                        </div>
                        <div className="md:col-span-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
                                <AlertTriangle size={14} className="text-amber-600" />
                                <div>
                                    <p className="text-[9px] text-amber-700 font-bold uppercase">Situação Atual</p>
                                    <p className="text-[11px] font-bold text-amber-900">{(itemContext as any)?.Situacao || 'AGUARDANDO APONTAMENTO'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-[#32423D] px-6 py-4 text-white flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Save size={18} />
                        {formData.IdOrdemServicoItemPendencia ? `Editar RNC #${formData.IdOrdemServicoItemPendencia}` : 'Cadastrar Nova RNC/Pendência'}
                    </h3>
                    {formData.IdOrdemServicoItemPendencia && (
                        <span className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/20">Modo Edição Ativo</span>
                    )}
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">

                    {/* Read-Only Context Fields (Visible only in Edit Mode) */}
                    {formData.IdOrdemServicoItemPendencia && (
                        <div className="bg-gray-50/80 p-4 rounded-xl border border-dashed border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    ID Ordem Serviço
                                </label>
                                <div className="text-sm font-bold text-[#32423D] bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                    {formData.displayIdOrdemServico || '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    ID Item OS
                                </label>
                                <div className="text-sm font-bold text-[#32423D] bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                    {formData.displayIdOrdemServicoItem || '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Cód. Mat. Fabricante
                                </label>
                                <div className="text-sm font-bold text-orange-600 bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                    {formData.displayCodMatFabricante || '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    ID RNC / Pendência
                                </label>
                                <div className="text-sm font-bold text-orange-600 bg-white border border-gray-200 px-3 py-2 rounded-lg">
                                    {formData.IdOrdemServicoItemPendencia || '-'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Sector Select */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
                                Setor Responsável <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full bg-amber-50/30 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800] transition-all"
                                value={formData.setorResponsavel}
                                onChange={(e) => setFormData({ ...formData, setorResponsavel: e.target.value })}
                            >
                                <option value="">Selecione um setor...</option>
                                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Responsible Select */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Responsável</label>
                            <select
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800] transition-all"
                                value={formData.idUsuarioResponsavel}
                                onChange={(e) => {
                                    const colab = collaborators.find(c => String(c.idUsuario) === e.target.value);
                                    setFormData({
                                        ...formData,
                                        idUsuarioResponsavel: e.target.value,
                                        usuarioResponsavel: colab ? colab.NomeCompleto : ''
                                    });
                                }}
                            >
                                <option value="">Selecione um colaborador...</option>
                                {collaborators.map(c => <option key={c.idUsuario} value={c.idUsuario}>{c.NomeCompleto}</option>)}
                            </select>
                        </div>

                        {/* Task Type Select */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Tipo de Tarefa/RNC</label>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800] transition-all"
                                    value={isCustomTaskType ? 'OUTRO' : formData.tipoTarefa}
                                    onChange={(e) => {
                                        if (e.target.value === 'OUTRO') {
                                            setIsCustomTaskType(true);
                                            setFormData({ ...formData, tipoTarefa: '' });
                                        } else {
                                            setIsCustomTaskType(false);
                                            setFormData({ ...formData, tipoTarefa: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="">Selecione o tipo...</option>
                                    {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="OUTRO">+ Outro (Digitar)</option>
                                </select>
                                {isCustomTaskType && (
                                    <input
                                        type="text"
                                        placeholder="Digite o novo tipo de tarefa..."
                                        className="w-full mt-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800] transition-all"
                                        value={formData.tipoTarefa}
                                        onChange={(e) => setFormData({ ...formData, tipoTarefa: e.target.value.toUpperCase() })}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Execution Date */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Calendar size={12} />
                                Data de Execução
                            </label>
                            <input
                                type="date"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800]"
                                value={formData.dataExecucao}
                                onChange={(e) => setFormData({ ...formData, dataExecucao: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                                <MessageSquare size={12} />
                                Descrição da Pendência
                            </label>
                            <textarea
                                className="w-full bg-amber-50/10 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E0E800]/20 focus:border-[#E0E800] min-h-[80px]"
                                placeholder="Descreva os detalhes da não conformidade ou pendência encontrada..."
                                value={formData.descricaoPendencia}
                                onChange={(e) => setFormData({ ...formData, descricaoPendencia: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        {formData.IdOrdemServicoItemPendencia && (
                            <button
                                type="button"
                                onClick={() => setFormData({
                                    IdOrdemServicoItemPendencia: undefined,
                                    setorResponsavel: '',
                                    idUsuarioResponsavel: '',
                                    usuarioResponsavel: '',
                                    tipoTarefa: '',
                                    dataExecucao: new Date().toISOString().split('T')[0],

                                    descricaoPendencia: '',
                                    displayIdOrdemServico: undefined,
                                    displayIdOrdemServicoItem: undefined,
                                    displayCodMatFabricante: ''
                                })}
                                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all font-semibold text-sm"
                            >
                                Novo Cadastro
                            </button>
                        )}
                        {formData.IdOrdemServicoItemPendencia && (
                            <button
                                type="button"
                                onClick={handleFinalize}
                                disabled={saving}
                                className="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 font-bold"
                            >
                                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Finalizar RNC
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-[#32423D] text-white px-8 py-2.5 rounded-xl hover:bg-[#3d4f49] disabled:opacity-50 transition-all shadow-md flex items-center gap-2 font-bold"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {formData.IdOrdemServicoItemPendencia ? 'Atualizar RNC' : 'Salvar RNC/Pendência'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List of existing pendencies */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={16} />
                        Histórico de Pendências (RNCs) do Item
                    </h4>
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showFinalized}
                                onChange={(e) => setShowFinalized(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#E0E800] focus:ring-[#E0E800]"
                            />
                            + Finalizadas
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Busca 1..."
                                value={searchQuery1}
                                onChange={(e) => setSearchQuery1(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-[#E0E800]"
                            />
                            <input
                                type="text"
                                placeholder="Busca 2..."
                                value={searchQuery2}
                                onChange={(e) => setSearchQuery2(e.target.value)}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-[#E0E800]"
                            />
                        </div>
                    </div>
                </div>

                {pendencies.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
                        <MessageSquare className="mx-auto mb-3 opacity-20" size={48} />
                        <p className="text-sm">Nenhuma rnc encontrada com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendencies.map((p) => (
                            <motion.div
                                key={p.IdOrdemServicoItemPendencia}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`bg-white rounded-2xl shadow-sm border ${p.Estatus === 'FINALIZADA' ? 'border-green-100' : 'border-amber-100'} p-5 flex flex-col md:flex-row gap-6 relative`}
                            >
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.Estatus === 'FINALIZADA' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {p.Estatus || 'ABERTA'}
                                        </span>
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono font-bold">RNC #{p.IdOrdemServicoItemPendencia}</span>
                                        <h5 className="font-bold text-[#32423D]">{p.TipoTarefa || 'Tipo não especificado'}</h5>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            por {p.Usuario} em {formatToBRDate(p.DataCriacao)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed italic border-l-4 border-gray-100 pl-4 py-1">
                                        "{p.DescricaoPendencia}"
                                    </p>

                                    {/* Finalization Details */}
                                    {p.Estatus === 'FINALIZADA' && (
                                        <div className="mt-4 p-4 bg-green-50/50 rounded-xl border border-green-100/50 space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-700 uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Detalhes da Correção / Finalização
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-green-600/70 font-bold uppercase">Responsável Finalização</p>
                                                    <p className="text-xs font-semibold text-green-800">
                                                        {(p as any).FinalizadoPorUsuarioSetor || '-'}
                                                        <span className="ml-2 font-normal text-green-600/60">em {(p as any).DataAcertoProjeto || '-'}</span>
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-green-600/70 font-bold uppercase">Setor</p>
                                                    <p className="text-xs font-semibold text-green-800">{(p as any).SetorResponsavelFinalizacao || '-'}</p>
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <p className="text-[10px] text-green-600/70 font-bold uppercase">Descrição da Finalização</p>
                                                    <p className="text-xs text-green-800 leading-relaxed bg-white/50 p-2 rounded-lg italic">
                                                        "{(p as any).DescricaoFinalizacao || 'Nenhuma descrição informada'}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Layers size={14} className="text-gray-400" />
                                            <span className="text-gray-500 font-medium">Setor: {p.SetorResponsavel}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <User size={14} className="text-gray-400" />
                                            <span className="text-gray-500 font-medium">Resp: {p.UsuarioResponsavel}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Calendar size={14} className="text-gray-400" />
                                            <span className="text-gray-500 font-medium">Exec: {formatToBRDate(p.DataExecucao)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex md:flex-col justify-center gap-2">
                                    <button
                                        disabled={p.Estatus === 'FINALIZADA'}
                                        onClick={() => handleEdit(p)}
                                        className="px-4 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-[#E0E800]/20 hover:text-[#32423D] transition-all text-xs font-bold disabled:opacity-30 disabled:hover:bg-gray-50"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
