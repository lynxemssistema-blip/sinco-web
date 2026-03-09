import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Key, Shield, User, X, Check, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const API_BASE = '/api';

interface Usuario {
    idUsuario?: number;
    NomeCompleto: string;
    Login: string;
    Senha?: string;
    TipoUsuario: string;
    email?: string;
    status: string;
}

export default function UsuarioPage() {
    const { addToast } = useToast();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
    const [formData, setFormData] = useState<Usuario>({
        NomeCompleto: '',
        Login: '',
        Senha: '',
        TipoUsuario: 'C',
        status: 'A'
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/usuario`);
            const data = await res.json();
            if (data.success) {
                setUsuarios(data.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar usuários' });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
    };

    const filteredUsuarios = usuarios.filter(u =>
        u.NomeCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Login.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = (usuario: Usuario | null = null) => {
        if (usuario) {
            setEditingUsuario(usuario);
            setFormData({
                ...usuario,
                Senha: '' // Don't show password on edit
            });
        } else {
            setEditingUsuario(null);
            setFormData({
                NomeCompleto: '',
                Login: '',
                Senha: '',
                TipoUsuario: 'C',
                status: 'A'
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.NomeCompleto || !formData.Login || (!editingUsuario && !formData.Senha)) {
            addToast({ type: 'error', title: 'Atenção', message: 'Preencha todos os campos obrigatórios' });
            return;
        }

        setSubmitting(true);
        try {
            const url = editingUsuario
                ? `${API_BASE}/usuario/${editingUsuario.idUsuario}`
                : `${API_BASE}/usuario`;

            const method = editingUsuario ? 'PUT' : 'POST';

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
                    message: editingUsuario ? 'Usuário atualizado!' : 'Usuário criado!'
                });
                setShowModal(false);
                fetchUsuarios();
            } else {
                addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao salvar' });
            }
        } catch (error) {
            console.error('Error saving user:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

        try {
            const res = await fetch(`${API_BASE}/usuario/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                addToast({ type: 'success', title: 'Sucesso', message: 'Usuário excluído' });
                fetchUsuarios();
            } else {
                addToast({ type: 'error', title: 'Erro', message: 'Erro ao excluir' });
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão' });
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#32423D] rounded-lg shadow-lg shadow-[#32423D]/20">
                        <Users size={24} className="text-[#E0E800]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#32423D]">Usuários</h1>
                        <p className="text-gray-500 text-sm">Gerenciamento de acesso ao sistema</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou login..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all shadow-sm group-hover:shadow-md"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-[#32423D] text-[#E0E800] px-4 py-2.5 rounded-xl font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline">Novo Usuário</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Login</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-[#32423D]" size={24} />
                                            <p className="text-sm">Carregando usuários...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        Nenhum usuário encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredUsuarios.map((usuario) => (
                                    <tr key={usuario.idUsuario} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#E0E800]/20 flex items-center justify-center text-[#32423D] font-bold text-lg">
                                                    {usuario.NomeCompleto.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-800">{usuario.NomeCompleto}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600 font-mono text-sm">{usuario.Login}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${usuario.TipoUsuario === 'A' || usuario.TipoUsuario === 'Admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {usuario.TipoUsuario === 'A' || usuario.TipoUsuario === 'Admin' ? (
                                                    <Shield size={12} />
                                                ) : (
                                                    <User size={12} />
                                                )}
                                                {usuario.TipoUsuario === 'A' || usuario.TipoUsuario === 'Admin' ? 'Admin' : 'Comum'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Ativo
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(usuario)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => usuario.idUsuario && handleDelete(usuario.idUsuario)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {editingUsuario ? <Edit2 size={20} className="text-[#32423D]" /> : <Plus size={20} className="text-[#32423D]" />}
                                {editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                        placeholder="Ex: João da Silva"
                                        value={formData.NomeCompleto}
                                        onChange={(e) => setFormData({ ...formData, NomeCompleto: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                            placeholder="Ex: joao.silva"
                                            value={formData.Login}
                                            onChange={(e) => setFormData({ ...formData, Login: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Acesso</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all appearance-none bg-white"
                                            value={formData.TipoUsuario}
                                            onChange={(e) => setFormData({ ...formData, TipoUsuario: e.target.value })}
                                        >
                                            <option value="C">Comum</option>
                                            <option value="A">Administrador</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingUsuario ? 'Nova Senha (opcional)' : 'Senha'}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        required={!editingUsuario}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                        placeholder={editingUsuario ? 'Deixe em branco para manter' : '••••••'}
                                        value={formData.Senha}
                                        onChange={(e) => setFormData({ ...formData, Senha: e.target.value })}
                                    />
                                </div>
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
                                    {editingUsuario ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
