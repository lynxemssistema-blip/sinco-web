import { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, X, Loader2, RefreshCw,
    Shield, User, Building2, Mail, AtSign,
    UserCheck, UserX
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface UsuarioAdmin {
    idUsuario: number;
    NomeCompleto: string;
    Login: string;
    TipoUsuario: string;
    Setor: string | null;
    email: string | null;
    status: string;
}

export default function CadastroUsuarioPage() {
    const { token } = useAuth();
    const { addToast } = useToast();

    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [loading, setLoading] = useState(false);
    const [fNome, setFNome] = useState('');
    const [fSetor, setFSetor] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const fetchUsuarios = useCallback(async () => {
        if (!token) return; // aguarda token estar disponível
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fNome.trim()) params.set('NomeCompleto', fNome.trim());
            if (fSetor.trim()) params.set('Setor', fSetor.trim());

            const res = await fetch(`/api/admin/usuarios?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                addToast({ type: 'warning', title: 'Sessão Expirada', message: 'Sua sessão expirou. Por favor, faça login novamente.' });
                return;
            }

            const result = await res.json();
            if (result.success) {
                setUsuarios(result.data || []);
                if ((result.data || []).length === 0) {
                    addToast({ type: 'info', title: 'Resultado', message: 'Nenhum usuário encontrado para os filtros informados.' });
                }
            } else {
                addToast({ type: 'warning', title: 'Aviso', message: result.message || 'Nenhum usuário encontrado.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar usuários: ' + e.message });
        } finally {
            setLoading(false);
        }
    }, [fNome, fSetor, token]);

    useEffect(() => { 
        if (token) fetchUsuarios(); 
    }, [token]);

    const handleLimpar = () => {
        setFNome('');
        setFSetor('');
        setTimeout(fetchUsuarios, 50);
    };

    const tipoLabel = (tipo: string) => {
        if (tipo === 'A' || tipo === 'Admin') return { label: 'Administrador', cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Shield size={11} /> };
        if (tipo === 'C') return { label: 'Comum', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <User size={11} /> };
        return { label: tipo || '—', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: <User size={11} /> };
    };

    const statusBadge = (st: string) => {
        const ativo = st === 'A' || st === 'ativo' || st === 'Ativo' || !st;
        return ativo
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-emerald-100 text-emerald-700 border-emerald-200"><UserCheck size={10} />Ativo</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-red-100 text-red-700 border-red-200"><UserX size={10} />Inativo</span>;
    };

    const selectedUser = usuarios.find(u => u.idUsuario === selectedId);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 p-3 gap-3 overflow-hidden">

            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none">Cadastro de Usuários</h1>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Usuários Administrativos</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-400 shadow-inner">
                        <Search size={12} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Nome completo..."
                            value={fNome}
                            onChange={e => setFNome(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchUsuarios()}
                            className="w-44 text-[11px] outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-400 shadow-inner">
                        <Building2 size={12} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Setor..."
                            value={fSetor}
                            onChange={e => setFSetor(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchUsuarios()}
                            className="w-32 text-[11px] outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                        />
                    </div>

                    <button
                        onClick={fetchUsuarios}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black shadow-sm hover:bg-indigo-700 transition-colors"
                    >
                        <Search size={12} />
                        Buscar
                    </button>

                    {(fNome || fSetor) && (
                        <button onClick={handleLimpar} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200" title="Limpar filtros">
                            <X size={14} />
                        </button>
                    )}

                    <button onClick={fetchUsuarios} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Atualizar">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <span className="ml-2 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
                        {loading ? '...' : `${usuarios.length} reg.`}
                    </span>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex flex-1 gap-3 overflow-hidden">

                {/* Grid de Usuários */}
                <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-auto">
                        {loading && (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="animate-spin text-indigo-600" size={28} />
                            </div>
                        )}
                        {!loading && (
                            <table className="w-full text-[11px] text-left border-separate border-spacing-0">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center w-12">#</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Nome Completo</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Login</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Setor</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">E-mail</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Tipo</th>
                                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usuarios.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-40">
                                                Nenhum usuário encontrado
                                            </td>
                                        </tr>
                                    ) : usuarios.map(u => {
                                        const tipo = tipoLabel(u.TipoUsuario);
                                        const selected = selectedId === u.idUsuario;
                                        return (
                                            <tr
                                                key={u.idUsuario}
                                                onClick={() => setSelectedId(selected ? null : u.idUsuario)}
                                                className={`cursor-pointer transition-colors border-b border-slate-50 ${selected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className="px-4 py-2 text-center font-black text-indigo-600">{u.idUsuario}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0">
                                                            {u.NomeCompleto?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className="font-bold text-slate-800">{u.NomeCompleto}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{u.Login}</td>
                                                <td className="px-4 py-2 text-slate-600">{u.Setor || <span className="text-slate-300">—</span>}</td>
                                                <td className="px-4 py-2 text-slate-500 text-[10px]">{u.email || <span className="text-slate-300">—</span>}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${tipo.cls}`}>
                                                        {tipo.icon}
                                                        {tipo.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center">{statusBadge(u.status)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Painel Detalhe (visível quando usuário selecionado) */}
                {selectedUser && (
                    <div className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-2">
                        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">Detalhes</span>
                                <button onClick={() => setSelectedId(null)} className="p-1 text-indigo-300 hover:text-indigo-600 rounded transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-4 space-y-4">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-2 py-3">
                                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl">
                                    {selectedUser.NomeCompleto?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-800">{selectedUser.NomeCompleto}</p>
                                    <p className="text-[10px] font-mono text-slate-500">{selectedUser.Login}</p>
                                </div>
                                {statusBadge(selectedUser.status)}
                            </div>

                            {/* Detalhes */}
                            <div className="space-y-2.5 border-t border-slate-100 pt-3">
                                <DetailRow icon={<Shield size={12} />} label="Tipo" value={tipoLabel(selectedUser.TipoUsuario).label} />
                                <DetailRow icon={<Building2 size={12} />} label="Setor" value={selectedUser.Setor || '—'} />
                                <DetailRow icon={<Mail size={12} />} label="E-mail" value={selectedUser.email || '—'} />
                                <DetailRow icon={<AtSign size={12} />} label="ID" value={String(selectedUser.idUsuario)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-[11px] font-bold text-slate-700 truncate">{value}</p>
            </div>
        </div>
    );
}
