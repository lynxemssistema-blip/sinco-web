import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, X, Save,
    Loader2, RefreshCw, Briefcase, Filter
} from 'lucide-react';

const API_BASE = '/api';

interface Setor {
    idSetor?: number;
    Setor: string;
    Fabrica: string;
    DataLiberada: string;
    DataCriacao?: string;
    CriadoPor?: string;
}

const emptyForm: Setor = {
    Setor: '',
    Fabrica: 'NAO',
    DataLiberada: 'NAO'
};

export default function SetorPage() {
    const [setores, setSetores] = useState<Setor[]>([]);
    const [formData, setFormData] = useState<Setor>(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [searchNome, setSearchNome] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch data from API
    const fetchSetores = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/setores`);
            const json = await res.json();
            if (json.success) {
                setSetores(json.data);
            } else {
                setError(json.message || 'Erro ao carregar dados');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor.');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSetores();
    }, []);

    const filteredSetores = setores.filter(s => {
        return !searchNome || s.Setor?.toLowerCase().includes(searchNome.toLowerCase());
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
    const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
    const inputOptional = `${inputBaseClass} border-gray-200`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = isEditing ? `${API_BASE}/setores/${formData.idSetor}` : `${API_BASE}/setores`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                await fetchSetores();
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

    const handleEdit = (setor: Setor) => {
        setFormData(setor);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Deseja realmente excluir este setor?')) return;

        try {
            const res = await fetch(`${API_BASE}/setores/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (json.success) {
                await fetchSetores();
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
        <div className="space-y-6 h-full flex flex-col min-h-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchSetores}
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
                        Novo Setor
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

            {/* Search Filters Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-2 shrink-0">
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2 m-0">
                        <Search size={12} /> Dados para Pesquisa
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-[10px] flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-2 py-1 rounded transition-colors border border-gray-200 uppercase font-bold"
                    >
                        <Filter size={11} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </button>
                </div>
                {showFilters && (
                <div className="px-4 pb-3 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Nome do Setor:</label>
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="search"
                                    placeholder="Pesquisar por nome..."
                                    value={searchNome}
                                    onChange={(e) => setSearchNome(e.target.value)}
                                    className="w-full pl-7 pr-3 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
                                />
                            </div>
                        </div>
                    </div>
                    {searchNome && (
                    <div className="flex justify-end mt-2">
                        <button
                            onClick={() => setSearchNome('')}
                            className="px-3 py-1 text-gray-500 font-semibold text-[10px] tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1.5 uppercase"
                        >
                            <X size={11} /> Limpar Filtro
                        </button>
                    </div>
                    )}
                </div>
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
                            className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
                                        <Briefcase size={20} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#32423D]">
                                        {isEditing ? 'Editar Setor' : 'Novo Setor'}
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
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Nome do Setor <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Setor"
                                            value={formData.Setor || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            placeholder="Ex: Montagem, Pintura..."
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Fábrica <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <select
                                                name="Fabrica"
                                                value={formData.Fabrica}
                                                onChange={handleInputChange}
                                                className={inputRequired}
                                                required
                                            >
                                                <option value="SIM">Sim</option>
                                                <option value="NAO">Não</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Data Liberada <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <select
                                                name="DataLiberada"
                                                value={formData.DataLiberada}
                                                onChange={handleInputChange}
                                                className={inputRequired}
                                                required
                                            >
                                                <option value="SIM">Sim</option>
                                                <option value="NAO">Não</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                                    <span className="text-red-500 font-bold">*</span> Campos obrigatórios
                                </p>

                                <div className="flex justify-end pt-2">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Loader2 size={32} className="animate-spin" />
                        <p className="text-sm">Carregando dados...</p>
                    </div>
                ) : (
                    <div className="overflow-auto flex-1">
                        <table className="w-full">
                            <thead className="bg-[#567469] text-white">
                                <tr className="border-b border-white/20">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Setor</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Fábrica</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Data Liberada</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider hidden lg:table-cell">Criado Por</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSetores.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <Briefcase size={40} strokeWidth={1.5} />
                                                <p className="text-sm">Nenhum setor encontrado</p>
                                                <button
                                                    onClick={() => setShowForm(true)}
                                                    className="text-[#32423D] font-medium text-sm hover:underline"
                                                >
                                                    Cadastrar novo setor
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSetores.map((setor, idx) => (
                                        <motion.tr
                                            key={setor.idSetor}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-[#32423D] text-sm">{setor.Setor}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${setor.Fabrica === 'SIM' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {setor.Fabrica}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${setor.DataLiberada === 'SIM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {setor.DataLiberada}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                                                <p>{setor.CriadoPor || '-'}</p>
                                                <p className="text-xs text-gray-400">{setor.DataCriacao || ''}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(setor)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setor.idSetor && handleDelete(setor.idSetor)}
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
                            Mostrando <span className="font-medium">{filteredSetores.length}</span> de <span className="font-medium">{setores.length}</span> setores
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
