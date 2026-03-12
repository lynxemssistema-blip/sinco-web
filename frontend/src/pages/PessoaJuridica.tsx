import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, X, Building2, Save,
    Camera, Loader2, RefreshCw, ImageIcon
} from 'lucide-react';

const API_BASE = '/api';

interface PessoaJuridica {
    IdPessoa?: number;
    Cnpj: string;
    RazaoSocial: string;
    NomeFantasia: string;
    Segmento: string;
    Responsavel: string;
    Email: string;
    Endereco: string;
    Numero: string;
    Bairro: string;
    Complemento: string;
    Cep: string;
    Cidade: string;
    Estado: string;
    Telefone: string;
    EnderecoLogo?: string;
}

const emptyForm: PessoaJuridica = {
    Cnpj: '', RazaoSocial: '', NomeFantasia: '', Segmento: '',
    Responsavel: '', Email: '', Endereco: '', Numero: '',
    Bairro: '', Complemento: '', Cep: '', Cidade: '', Estado: '', Telefone: ''
};

export default function PessoaJuridicaPage() {
    const [empresas, setEmpresas] = useState<PessoaJuridica[]>([]);
    const [formData, setFormData] = useState<PessoaJuridica>(emptyForm);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Logo upload state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Fetch data from API
    const fetchEmpresas = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/pj`);
            const json = await res.json();
            if (json.success) {
                setEmpresas(json.data);
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
        fetchEmpresas();
    }, []);

    const filteredEmpresas = empresas.filter(e =>
        e.RazaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.Cnpj?.includes(searchTerm) ||
        e.NomeFantasia?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Mask functions - apply formatting progressively during typing
    const maskCNPJ = (value: string): string => {
        const nums = value.replace(/\D/g, '').slice(0, 14);
        return nums
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})\.(\d{3})(\d)/, '.$1.$2/$3')
            .replace(/(\d{4})(\d)/, '$1-$2');
    };

    const maskCEP = (value: string): string => {
        const nums = value.replace(/\D/g, '').slice(0, 8);
        return nums.replace(/^(\d{5})(\d)/, '$1-$2');
    };

    const maskPhone = (value: string): string => {
        const nums = value.replace(/\D/g, '').slice(0, 11);
        if (nums.length <= 10) {
            return nums
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        return nums
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2');
    };

    // Masked input handler - applies mask while typing
    const handleMaskedChange = (e: React.ChangeEvent<HTMLInputElement>, maskFn: (v: string) => string) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: maskFn(value) }));
    };

    // Input class for required fields with visual indicator
    const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
    const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
    const inputOptional = `${inputBaseClass} border-gray-200`;

    const handleCepBlur = async () => {
        const cep = formData.Cep.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        Endereco: data.logradouro || prev.Endereco,
                        Bairro: data.bairro || prev.Bairro,
                        Cidade: data.localidade || prev.Cidade,
                        Estado: data.uf || prev.Estado,
                    }));
                }
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
            }
        }
    };

    // Logo file handler
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Por favor, selecione uma imagem válida.');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('A imagem deve ter no máximo 5MB.');
                return;
            }
            setLogoFile(file);
            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = isEditing ? `${API_BASE}/pj/${formData.IdPessoa}` : `${API_BASE}/pj`;
            const method = isEditing ? 'PUT' : 'POST';

            // Use FormData for file upload support
            const fd = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== undefined && value !== null && key !== 'IdPessoa' && key !== 'EnderecoLogo') {
                    fd.append(key, String(value));
                }
            });

            // Add logo file if selected
            if (logoFile) {
                fd.append('Logo', logoFile);
            }

            const res = await fetch(url, {
                method,
                body: fd, // Use FormData instead of JSON
            });

            const json = await res.json();
            if (json.success) {
                await fetchEmpresas();
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
            const res = await fetch(`${API_BASE}/pj/${id}`);
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
        if (!confirm('Deseja realmente excluir esta empresa?')) return;

        try {
            const res = await fetch(`${API_BASE}/pj/${id}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario: 'Edson' }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchEmpresas();
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
        setLogoFile(null);
        setLogoPreview(null);
        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#32423D]">Pessoa Jurídica</h1>
                    <p className="text-gray-500 text-sm">Gerencie o cadastro de empresas</p>
                </div>
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchEmpresas}
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
                        Nova Empresa
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
                    placeholder="Buscar por nome, fantasia ou CNPJ..."
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
                                        <Building2 size={20} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-[#32423D]">
                                        {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
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
                                {/* Logo + Basic Info */}
                                <div className="flex gap-5">
                                    <div className="flex flex-col items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500">Logo</label>
                                        <input
                                            type="file"
                                            ref={logoInputRef}
                                            onChange={handleLogoChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <div
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#E0E800] hover:text-[#32423D] transition-colors cursor-pointer overflow-hidden relative group"
                                        >
                                            {logoPreview ? (
                                                <>
                                                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Camera size={20} className="text-white" />
                                                    </div>
                                                </>
                                            ) : formData.EnderecoLogo ? (
                                                <>
                                                    <img src={`${formData.EnderecoLogo}`} alt="Logo" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Camera size={20} className="text-white" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <ImageIcon size={20} />
                                                    <span className="text-[10px]">Upload</span>
                                                </div>
                                            )}
                                        </div>
                                        {(logoPreview || logoFile) && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLogoFile(null);
                                                    setLogoPreview(null);
                                                    if (logoInputRef.current) logoInputRef.current.value = '';
                                                }}
                                                className="text-xs text-red-500 hover:text-red-700"
                                            >
                                                Remover
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 grid grid-cols-12 gap-4">
                                        <div className="col-span-4">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                CNPJ <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="Cnpj"
                                                value={formData.Cnpj || ''}
                                                onChange={(e) => handleMaskedChange(e, maskCNPJ)}
                                                placeholder="00.000.000/0000-00"
                                                className={inputRequired}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-8">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Razão Social <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="RazaoSocial"
                                                value={formData.RazaoSocial || ''}
                                                onChange={handleInputChange}
                                                className={inputRequired}
                                                required
                                            />
                                        </div>
                                        <div className="col-span-6">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Nome Fantasia</label>
                                            <input
                                                type="text"
                                                name="NomeFantasia"
                                                value={formData.NomeFantasia || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                        <div className="col-span-6">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Segmento</label>
                                            <input
                                                type="text"
                                                name="Segmento"
                                                value={formData.Segmento || ''}
                                                onChange={handleInputChange}
                                                className={inputOptional}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
                                        <input
                                            type="text"
                                            name="Responsavel"
                                            value={formData.Responsavel || ''}
                                            onChange={handleInputChange}
                                            className={inputOptional}
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Email <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="Email"
                                            value={formData.Email || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                                        <input
                                            type="text"
                                            name="Telefone"
                                            value={formData.Telefone || ''}
                                            onChange={(e) => handleMaskedChange(e, maskPhone)}
                                            placeholder="(00) 00000-0000"
                                            className={inputOptional}
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                {/* Address Section */}
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Endereço</p>
                                </div>
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            CEP <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Cep"
                                            value={formData.Cep || ''}
                                            onChange={(e) => handleMaskedChange(e, maskCEP)}
                                            onBlur={handleCepBlur}
                                            placeholder="00000-000"
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-6">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Endereço <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Endereco"
                                            value={formData.Endereco || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Número <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Numero"
                                            value={formData.Numero || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Bairro <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Bairro"
                                            value={formData.Bairro || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Complemento</label>
                                        <input
                                            type="text"
                                            name="Complemento"
                                            value={formData.Complemento || ''}
                                            onChange={handleInputChange}
                                            className={inputOptional}
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Cidade <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Cidade"
                                            value={formData.Cidade || ''}
                                            onChange={handleInputChange}
                                            className={inputRequired}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            UF <span className="text-red-500 font-bold">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Estado"
                                            value={formData.Estado || ''}
                                            onChange={(e) => setFormData(p => ({ ...p, Estado: e.target.value.toUpperCase() }))}
                                            maxLength={2}
                                            className={`${inputRequired} text-center uppercase`}
                                            required
                                        />
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">CNPJ</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Cidade/UF</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Telefone</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredEmpresas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                                <Building2 size={40} strokeWidth={1.5} />
                                                <p className="text-sm">Nenhuma empresa encontrada</p>
                                                <button
                                                    onClick={() => setShowForm(true)}
                                                    className="text-[#32423D] font-medium text-sm hover:underline"
                                                >
                                                    Cadastrar nova empresa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmpresas.map((empresa, idx) => (
                                        <motion.tr
                                            key={empresa.IdPessoa}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center font-bold text-sm overflow-hidden">
                                                        {empresa.EnderecoLogo ? (
                                                            <img src={`${empresa.EnderecoLogo}`} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            empresa.RazaoSocial?.charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[#32423D] text-sm">{empresa.RazaoSocial}</p>
                                                        <p className="text-xs text-gray-500">{empresa.NomeFantasia}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell font-mono">
                                                {empresa.Cnpj?.replace(/,/g, '.')}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                                                {empresa.Cidade}/{empresa.Estado}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                                                {empresa.Telefone}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => empresa.IdPessoa && handleEdit(empresa.IdPessoa)}
                                                        className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => empresa.IdPessoa && handleDelete(empresa.IdPessoa)}
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
                            Mostrando <span className="font-medium">{filteredEmpresas.length}</span> de <span className="font-medium">{empresas.length}</span> empresas
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
