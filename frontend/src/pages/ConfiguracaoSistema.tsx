import React, { useState, useEffect } from 'react';
import { Database, Search, Plus, Edit2, Trash2, X, Check, Loader2, Filter, FileText, Folder, Settings2, Tag } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const API_BASE = '/api';

interface ConfiguracaoSistema {
    id?: number;
    chave: string;
    valor: string;
    descricao?: string;
    tipo: 'caminho' | 'template' | 'parametro' | 'outro';
    data_criacao?: string;
    data_atualizacao?: string;
}

const TIPO_OPTIONS = [
    { value: 'caminho', label: 'Caminho', icon: Folder, color: 'blue' },
    { value: 'template', label: 'Template', icon: FileText, color: 'purple' },
    { value: 'parametro', label: 'Parâmetro', icon: Settings2, color: 'green' },
    { value: 'outro', label: 'Outro', icon: Tag, color: 'gray' }
];

export default function ConfiguracaoSistemaPage() {
    const { addToast } = useToast();
    const [configuracoes, setConfiguracoes] = useState<ConfiguracaoSistema[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState<string>('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingConfig, setEditingConfig] = useState<ConfiguracaoSistema | null>(null);
    const [formData, setFormData] = useState<ConfiguracaoSistema>({
        chave: '',
        valor: '',
        descricao: '',
        tipo: 'outro'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchConfiguracoes();
    }, [filterTipo]);

    const fetchConfiguracoes = async () => {
        setLoading(true);
        try {
            const url = filterTipo
                ? `${API_BASE}/configuracao-sistema?tipo=${filterTipo}`
                : `${API_BASE}/configuracao-sistema`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setConfiguracoes(data.data);
            }
        } catch (error) {
            console.error('Error fetching configuracoes:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar configurações' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
    };

    const filteredConfiguracoes = configuracoes.filter(c =>
        c.chave.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.descricao && c.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.valor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (config: ConfiguracaoSistema | null = null) => {
        if (config) {
            setEditingConfig(config);
            setFormData(config);
        } else {
            setEditingConfig(null);
            setFormData({
                chave: '',
                valor: '',
                descricao: '',
                tipo: 'outro'
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.chave || !formData.valor) {
            addToast({ type: 'error', title: 'Atenção', message: 'Chave e valor são obrigatórios' });
            return;
        }

        setSubmitting(true);
        try {
            const url = editingConfig
                ? `${API_BASE}/configuracao-sistema/${editingConfig.chave}`
                : `${API_BASE}/configuracao-sistema`;

            const method = editingConfig ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                addToast({
                    type: 'success',
                    title: 'Sucesso',
                    message: editingConfig ? 'Configuração atualizada!' : 'Configuração criada!'
                });
                setShowModal(false);
                fetchConfiguracoes();
            } else {
                addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao salvar' });
            }
        } catch (error) {
            console.error('Error saving config:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (chave: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir a configuração "${chave}"?`)) return;

        try {
            const res = await fetch(`${API_BASE}/configuracao-sistema/${chave}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                addToast({ type: 'success', title: 'Sucesso', message: 'Configuração excluída' });
                fetchConfiguracoes();
            } else {
                addToast({ type: 'error', title: 'Erro', message: 'Erro ao excluir' });
            }
        } catch (error) {
            console.error('Error deleting config:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão' });
        }
    };

    const getTipoStyle = (tipo: string) => {
        const option = TIPO_OPTIONS.find(opt => opt.value === tipo);
        const colors = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200',
            green: 'bg-green-100 text-green-700 border-green-200',
            gray: 'bg-gray-100 text-gray-700 border-gray-200'
        };
        return colors[option?.color as keyof typeof colors] || colors.gray;
    };

    const getTipoIcon = (tipo: string) => {
        const option = TIPO_OPTIONS.find(opt => opt.value === tipo);
        return option?.icon || Tag;
    };

    const truncateText = (text: string, maxLength: number = 60) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="p-6 max-w-[1800px] mx-auto animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#32423D] rounded-lg shadow-lg shadow-[#32423D]/20">
                        <Database size={24} className="text-[#E0E800]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#32423D]">Configuração do Sistema</h1>
                        <p className="text-gray-500 text-sm">Gerenciamento de parâmetros e configurações</p>
                    </div>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-[#32423D] text-[#E0E800] px-4 py-2.5 rounded-xl font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20"
                >
                    <Plus size={20} />
                    <span>Nova Configuração</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por chave, valor ou descrição..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all shadow-sm group-hover:shadow-md"
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="relative group min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={20} />
                    <select
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all shadow-sm appearance-none cursor-pointer hover:shadow-md"
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                    >
                        <option value="">Todos os Tipos</option>
                        {TIPO_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {TIPO_OPTIONS.map(opt => {
                    const count = configuracoes.filter(c => c.tipo === opt.value).length;
                    const Icon = opt.icon;
                    return (
                        <div key={opt.value} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 capitalize">{opt.label}</p>
                                    <p className="text-2xl font-bold text-[#32423D] mt-1">{count}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${getTipoStyle(opt.value)}`}>
                                    <Icon size={20} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Chave</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-[#32423D]" size={24} />
                                            <p className="text-sm">Carregando configurações...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredConfiguracoes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        Nenhuma configuração encontrada
                                    </td>
                                </tr>
                            ) : (
                                filteredConfiguracoes.map((config) => {
                                    const Icon = getTipoIcon(config.tipo);
                                    return (
                                        <tr key={config.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <span className="font-mono text-sm font-medium text-gray-800">{config.chave}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-gray-600" title={config.valor}>
                                                    {truncateText(config.valor, 50)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getTipoStyle(config.tipo)}`}>
                                                    <Icon size={12} />
                                                    {TIPO_OPTIONS.find(opt => opt.value === config.tipo)?.label}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-gray-500">
                                                    {config.descricao ? truncateText(config.descricao, 40) : '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(config)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => config.chave && handleDelete(config.chave)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {editingConfig ? <Edit2 size={20} className="text-[#32423D]" /> : <Plus size={20} className="text-[#32423D]" />}
                                {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Chave *</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingConfig}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="Ex: NovoParametro"
                                        value={formData.chave}
                                        onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
                                    />
                                    {editingConfig && <p className="text-xs text-gray-400 mt-1">A chave não pode ser alterada</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all appearance-none bg-white"
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                                    >
                                        {TIPO_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all resize-none"
                                    placeholder="Valor da configuração"
                                    value={formData.valor}
                                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                    placeholder="Descrição opcional"
                                    value={formData.descricao || ''}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 bg-[#32423D] text-[#E0E800] px-6 py-2 rounded-lg font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    {editingConfig ? 'Salvar Alterações' : 'Criar Configuração'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
