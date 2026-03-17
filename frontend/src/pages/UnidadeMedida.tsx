import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, X, Ruler, Save,
    Loader2, RefreshCw
} from 'lucide-react';

const API_BASE = '/api';

interface UnidadeMedida {
    IdMedida?: number;
    TipoMedida: string;
    DescMedida: string;
}

const emptyForm: UnidadeMedida = {
    TipoMedida: '',
    DescMedida: ''
};

export default function UnidadeMedidaPage() {
    const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
    const [formData, setFormData] = useState<UnidadeMedida>(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch data from API
    const fetchUnidades = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/medida`);
            const json = await res.json();
            if (json.success) {
                setUnidades(json.data);
            } else {
                setError(json.message || 'Erro ao carregar dados');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor. Verifique se o backend está rodando na porta 3000.');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnidades();
    }, []);

    const filteredUnidades = unidades.filter(u =>
        u.TipoMedida?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.DescMedida?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'TipoMedida') {
            // Limit to 3 chars and uppercase
            setFormData(prev => ({ ...prev, [name]: value.toUpperCase().slice(0, 3) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
    const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
    const inputOptional = `${inputBaseClass} border-gray-200`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = isEditing ? `${API_BASE}/medida/${formData.IdMedida}` : `${API_BASE}/medida`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                await fetchUnidades();
                resetForm();
            } else {
                setError(json.message || 'Erro ao salvar');
            }
        } catch (err) {
            setError('Erro ao salvar. Verifique a conexão.');
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (id: number) => {
        try {
            const res = await fetch(`${API_BASE}/medida/${id}`);
            const json = await res.json();
            if (json.success) {
                setFormData(json.data);
                setIsEditing(true);
                setShowForm(true);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Deseja realmente excluir esta unidade de medida?')) return;

        try {
            const res = await fetch(`${API_BASE}/medida/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Edson' }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchUnidades();
            } else {
                setError(json.message || 'Erro ao excluir');
            }
        } catch (err) {
            setError('Erro ao excluir. Verifique a conexão.');
        }
    };

    const resetForm = () => {
        setFormData(emptyForm);
        setIsEditing(false);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#32423D]">Unidades de Medida</h1>
                    <p className="text-gray-500 text-sm">Gerencie o cadastro de unidades de medida para materiais</p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchUnidades}
                        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#32423D] text-white font-medium hover:bg-[#3d4f49] transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Nova Unidade
                    </motion.button>
                </div>
            </div>

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

            {/* Search Bar */}
            <div className="relative max-w-md flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por código ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all"
                />
                </div>
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Limpar pesquisa">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && resetForm()}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md my-8"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
                                        <Ruler size={20} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#32423D]">
                                        {isEditing ? 'Editar Unidade' : 'Nova Unidade'}
                                    </h2>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                                {/* ID Field (readonly when editing) */}
                                {isEditing && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                                        <input
                                            type="text"
                                            value={formData.IdMedida || ''}
                                            readOnly
                                            className={`${inputOptional} bg-gray-100 cursor-not-allowed`}
                                        />
                                    </div>
                                )}

                                {/* TipoMedida */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Unidade <span className="text-red-500 font-bold">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="TipoMedida"
                                        value={formData.TipoMedida || ''}
                                        onChange={handleInputChange}
                                        placeholder="UN, KG, M..."
                                        className={`${inputRequired} uppercase`}
                                        maxLength={3}
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Máximo 3 caracteres</p>
                                </div>

                                {/* DescMedida */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                                    <input
                                        type="text"
                                        name="DescMedida"
                                        value={formData.DescMedida || ''}
                                        onChange={handleInputChange}
                                        placeholder="Descrição da unidade..."
                                        className={inputOptional}
                                        maxLength={50}
                                    />
                                </div>

                                {/* Required fields note */}
                                <p className="text-xs text-gray-400 pt-2">
                                    <span className="text-red-500 font-bold">*</span> Campos obrigatórios
                                </p>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm"
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </button>
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#32423D] text-white font-medium text-sm hover:bg-[#3d4f49] transition-colors disabled:opacity-50"
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        {isEditing ? 'Atualizar' : 'Salvar'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Carregando dados...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Unidade</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUnidades.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <Ruler size={40} strokeWidth={1.5} />
                                                <p className="text-sm">Nenhuma unidade de medida encontrada</p>
                                                <button
                                                    onClick={() => setShowForm(true)}
                                                    className="text-[#32423D] font-medium text-sm hover:underline"
                                                >
                                                    Cadastrar nova unidade
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUnidades.map((unidade, idx) => (
                                        <motion.tr
                                            key={unidade.IdMedida}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                                {unidade.IdMedida}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center font-bold text-sm">
                                                        {unidade.TipoMedida}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {unidade.DescMedida || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => unidade.IdMedida && handleEdit(unidade.IdMedida)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => unidade.IdMedida && handleDelete(unidade.IdMedida)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table Footer */}
                {!loading && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Mostrando <span className="font-medium">{filteredUnidades.length}</span> de <span className="font-medium">{unidades.length}</span> unidades
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
