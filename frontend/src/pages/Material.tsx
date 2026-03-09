import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, X, Package, Save,
    Loader2, RefreshCw, Camera, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';

const API_BASE = '/api';

interface Material {
    IdMaterial?: number;
    CodMatFabricante: string;
    DescResumo?: string;
    DescDetal?: string;
    NumeroRP?: string;
    FamiliaMat?: number;
    DescFamilia?: string;
    CodigoJuridicoMat?: number;
    Fornecedor?: string;
    Peso?: string;
    Unidade?: string;
    Altura?: string;
    Largura?: string;
    Profundidade?: string;
    Valor?: string;
    PercICMS?: string;
    vICMS?: string;
    PercIPI?: string;
    vIPI?: string;
    vLiquido?: string;

    acabamento?: string;
    ImagemProduto?: string | null;
}

interface Option {
    id: number | string;
    label: string;
}

const emptyForm: Material = {
    CodMatFabricante: '',
    DescResumo: '',
    DescDetal: '',
    NumeroRP: '',
    Peso: '',
    Unidade: '',
    Altura: '',
    Largura: '',
    Profundidade: '',
    Valor: '',
    PercICMS: '',
    vICMS: '',
    PercIPI: '',
    vIPI: '',
    vLiquido: '',
    ImagemProduto: '',
};

export default function MaterialPage() {
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [formData, setFormData] = useState<Material>(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);

    // Options for dropdowns
    const [familiaOptions, setFamiliaOptions] = useState<Option[]>([]);
    const [fornecedorOptions, setFornecedorOptions] = useState<Option[]>([]);
    const [unidadeOptions, setUnidadeOptions] = useState<Option[]>([]);

    // Fetch dropdown options
    const fetchOptions = async () => {
        try {
            const [famRes, fornRes, unidRes] = await Promise.all([
                fetch(`${API_BASE}/familia/options`),
                fetch(`${API_BASE}/pj/options`),
                fetch(`${API_BASE}/medida/options`)
            ]);
            const [famJson, fornJson, unidJson] = await Promise.all([
                famRes.json(),
                fornRes.json(),
                unidRes.json()
            ]);
            if (famJson.success) setFamiliaOptions(famJson.data);
            if (fornJson.success) setFornecedorOptions(fornJson.data);
            if (unidJson.success) setUnidadeOptions(unidJson.data);
        } catch (err) {
            console.error('Error fetching options:', err);
        }
    };

    // Fetch data from API
    const fetchMateriais = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/material`);
            const json = await res.json();
            if (json.success) {
                setMateriais(json.data);
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
        fetchMateriais();
        fetchOptions();
    }, []);

    const filteredMateriais = materiais.filter(m =>
        m.CodMatFabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.DescResumo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.DescFamilia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.Fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
    const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
    const inputOptional = `${inputBaseClass} border-gray-200`;
    const selectClass = `${inputOptional} appearance-none bg-white`;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, ImagemProduto: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = isEditing ? `${API_BASE}/material/${formData.IdMaterial}` : `${API_BASE}/material`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                await fetchMateriais();
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
            const res = await fetch(`${API_BASE}/material/${id}`);
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
        if (!confirm('Deseja realmente excluir este material?')) return;

        try {
            const res = await fetch(`${API_BASE}/material/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Edson' }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchMateriais();
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
                    <h1 className="text-2xl font-bold text-[#32423D]">Cadastro de Materiais</h1>
                    <p className="text-gray-500 text-sm">Gerencie o cadastro de materiais e produtos</p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchMateriais}
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
                        Novo Material
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
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por código, descrição, família ou fornecedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all"
                />
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
                            className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
                                        <Package size={20} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#32423D]">
                                        {isEditing ? 'Editar Material' : 'Novo Material'}
                                    </h2>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                                {/* ID Field (readonly when editing) */}
                                {isEditing && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">ID</label>
                                            <input
                                                type="text"
                                                value={formData.IdMaterial || ''}
                                                readOnly
                                                className={`${inputOptional} bg-gray-100 cursor-not-allowed`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Image Upload Action Area */}
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Imagem do Produto</h3>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        {/* Preview Box */}
                                        <div className="w-full sm:w-32 h-32 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden relative group shrink-0">
                                            {formData.ImagemProduto ? (
                                                <>
                                                    <img
                                                        src={formData.ImagemProduto}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, ImagemProduto: '' }))}
                                                            className="p-2 bg-white/20 rounded-full hover:bg-white/40 text-white transition-colors"
                                                            title="Remover imagem"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                                    <Package size={32} strokeWidth={1.5} />
                                                    <span className="text-xs">Sem imagem</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-1 space-y-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                {/* Camera Button */}
                                                <label className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all active:scale-95">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                    />
                                                    <Camera size={20} className="text-[#32423D]" />
                                                    <span className="text-xs font-medium text-gray-600">Câmera</span>
                                                </label>

                                                {/* Gallery Button */}
                                                <label className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all active:scale-95">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                    />
                                                    <ImageIcon size={20} className="text-[#32423D]" />
                                                    <span className="text-xs font-medium text-gray-600">Galeria</span>
                                                </label>

                                                {/* Link Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowUrlInput(!showUrlInput)}
                                                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all active:scale-95 ${showUrlInput
                                                        ? 'border-[#32423D] bg-[#32423D]/5'
                                                        : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <LinkIcon size={20} className="text-[#32423D]" />
                                                    <span className="text-xs font-medium text-gray-600">Link Web</span>
                                                </button>
                                            </div>

                                            {/* URL Input */}
                                            {showUrlInput && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="pt-1"
                                                >
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">URL da Imagem</label>
                                                    <input
                                                        type="text"
                                                        value={formData.ImagemProduto || ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, ImagemProduto: e.target.value }))}
                                                        placeholder="https://exemplo.com/imagem.jpg"
                                                        className={inputOptional}
                                                    />
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        Cole o link direto da imagem na web
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Identificação */}
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Identificação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Código Material <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="CodMatFabricante"
                                                value={formData.CodMatFabricante || ''}
                                                onChange={handleInputChange}
                                                placeholder="Código único do material"
                                                className={inputRequired}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Numero RP</label>
                                            <input
                                                type="text"
                                                name="NumeroRP"
                                                value={formData.NumeroRP || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Descrição */}
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Descrição</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição Resumo</label>
                                            <input
                                                type="text"
                                                name="DescResumo"
                                                value={formData.DescResumo || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Descrição Detalhada</label>
                                            <textarea
                                                name="DescDetal"
                                                value={formData.DescDetal || ''}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className={inputOptional}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Classificação */}
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Classificação</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Família</label>
                                            <select
                                                name="FamiliaMat"
                                                value={formData.FamiliaMat || ''}
                                                onChange={handleInputChange}
                                                className={selectClass}
                                            >
                                                <option value="">Selecione...</option>
                                                {familiaOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Fornecedor</label>
                                            <select
                                                name="CodigoJuridicoMat"
                                                value={formData.CodigoJuridicoMat || ''}
                                                onChange={handleInputChange}
                                                className={selectClass}
                                            >
                                                <option value="">Selecione...</option>
                                                {fornecedorOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Dimensões */}
                                <div className="border-b border-gray-100 pb-4">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados Equipamento</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Peso</label>
                                            <input
                                                type="text"
                                                name="Peso"
                                                value={formData.Peso || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
                                            <select
                                                name="Unidade"
                                                value={formData.Unidade || ''}
                                                onChange={handleInputChange}
                                                className={selectClass}
                                            >
                                                <option value="">-</option>
                                                {unidadeOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.id}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Altura</label>
                                            <input
                                                type="text"
                                                name="Altura"
                                                value={formData.Altura || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Largura</label>
                                            <input
                                                type="text"
                                                name="Largura"
                                                value={formData.Largura || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Profundidade</label>
                                            <input
                                                type="text"
                                                name="Profundidade"
                                                value={formData.Profundidade || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dados Fiscais */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados Fiscais</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Valor Unit.</label>
                                            <input
                                                type="text"
                                                name="Valor"
                                                value={formData.Valor || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">% ICMS</label>
                                            <input
                                                type="text"
                                                name="PercICMS"
                                                value={formData.PercICMS || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">$ ICMS</label>
                                            <input
                                                type="text"
                                                name="vICMS"
                                                value={formData.vICMS || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">% IPI</label>
                                            <input
                                                type="text"
                                                name="PercIPI"
                                                value={formData.PercIPI || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">$ IPI</label>
                                            <input
                                                type="text"
                                                name="vIPI"
                                                value={formData.vIPI || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Valor Líquido</label>
                                            <input
                                                type="text"
                                                name="vLiquido"
                                                value={formData.vLiquido || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                    </div>
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
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">ID</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Img</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Família</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fornecedor</th>
                                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMateriais.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <Package size={40} strokeWidth={1.5} />
                                                <p className="text-sm">Nenhum material encontrado</p>
                                                <button
                                                    onClick={() => setShowForm(true)}
                                                    className="text-[#32423D] font-medium text-sm hover:underline"
                                                >
                                                    Cadastrar novo material
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMateriais.map((material, idx) => (
                                        <motion.tr
                                            key={material.IdMaterial}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-3 py-3 text-sm text-gray-500 font-mono">
                                                {material.IdMaterial}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                                    {material.ImagemProduto ? (
                                                        <img
                                                            src={material.ImagemProduto}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package size={16} className="text-gray-400" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center">
                                                        <Package size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                                        {material.CodMatFabricante || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-[200px]">
                                                {material.DescResumo || material.DescDetal?.substring(0, 50) || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600">
                                                {material.DescFamilia || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-[150px]">
                                                {material.Fornecedor || '-'}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => material.IdMaterial && handleEdit(material.IdMaterial)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => material.IdMaterial && handleDelete(material.IdMaterial)}
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
                            Mostrando <span className="font-medium">{filteredMateriais.length}</span> de <span className="font-medium">{materiais.length}</span> materiais
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
