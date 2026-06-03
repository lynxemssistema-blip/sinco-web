import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, ArrowRight, ShieldCheck, Database, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface LoginAcessoProps {
    /** Callback chamado após autenticação local bem-sucedida (modo portão) */
    onAuthSuccess?: () => void;
}

/**
 * LoginAcesso — Tela de login obrigatória para acesso ao banco ativo.
 * O usuário precisa autenticar contra a tabela `usuario` do banco de dados
 * ativo antes de acessar qualquer outra tela do sistema.
 *
 * Modos de uso:
 *   1. Portão obrigatório (onAuthSuccess fornecido): bloqueia o app até login local
 *   2. Menu lateral (sem onAuthSuccess): permite troca de conta com redirect
 */
export default function LoginAcessoPage({ onAuthSuccess }: LoginAcessoProps) {
    const { login: authLogin, user: currentUser } = useAuth();
    const { addToast } = useToast();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Banco de dados ativo (lido do usuário logado ou localStorage)
    const getActiveDb = (): string => {
        if (currentUser?.dbName) return currentUser.dbName;
        try {
            const stored = JSON.parse(localStorage.getItem('sinco_user') || '{}');
            return stored.dbName || 'N/A';
        } catch { return 'N/A'; }
    };

    const getClientName = (): string => {
        if (currentUser?.clientName) return currentUser.clientName;
        try {
            const stored = JSON.parse(localStorage.getItem('sinco_user') || '{}');
            return stored.clientName || '';
        } catch { return ''; }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            addToast({ type: 'error', title: 'Atenção', message: 'Preencha usuário e senha' });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login: username, senha: password })
            });

            const data = await res.json();

            if (data.success) {
                // Atualiza a sessão com o novo usuário
                authLogin(data.user, data.token);
                setSuccess(true);

                const dbName = data.user.dbName || getActiveDb();
                addToast({ type: 'success', title: 'Login realizado', message: `Bem-vindo, ${data.user.nome}! Banco: ${dbName}` });

                // Marca autenticação local na sessionStorage
                sessionStorage.setItem(`sinco_local_auth_${dbName}`, 'true');

                if (onAuthSuccess) {
                    // Modo portão: libera o acesso ao app
                    setTimeout(() => onAuthSuccess(), 1000);
                } else {
                    // Modo menu: redireciona para dashboard
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                }
            } else {
                addToast({ type: 'error', title: 'Acesso Negado', message: data.message || 'Credenciais inválidas para este banco de dados' });
            }
        } catch (error) {
            console.error('Login error:', error);
            addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha na comunicação com o servidor' });
        } finally {
            setLoading(false);
        }
    };

    const activeDb = getActiveDb();
    const clientName = getClientName();

    return (
        <div className="min-h-[80vh] grid grid-cols-1 lg:grid-cols-2 gap-0 font-sans overflow-hidden">
            {/* Esquerda: Informações do Banco Ativo */}
            <div className="relative hidden lg:flex flex-col justify-between p-12 bg-[#32423D] rounded-l-2xl overflow-hidden">
                {/* Elementos Decorativos de Fundo */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#E0E800]/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-4"
                    >
                        <div className="bg-white/10 p-3 rounded-md backdrop-blur-md border border-white/10 shadow-lg">
                            <Database className="w-8 h-8 text-[#E0E800]" />
                        </div>
                        <div>
                            <h2 className="text-white font-extrabold text-xl tracking-tight">Acesso ao Banco Ativo</h2>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Autenticação Local</p>
                        </div>
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-lg mt-auto mb-16">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <h1 className="text-4xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
                            Conectar ao <br/>
                            <span className="text-[#E0E800]">banco de dados.</span>
                        </h1>
                        <p className="text-lg text-white/60 font-medium leading-relaxed mb-8">
                            Insira suas credenciais para acessar o banco de dados atualmente ativo no sistema.
                        </p>

                        {/* Info do Banco Ativo */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-white/80 text-sm font-bold uppercase tracking-wider">Banco Ativo</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/50 text-sm">Database:</span>
                                    <span className="text-[#E0E800] font-bold font-mono text-sm">{activeDb}</span>
                                </div>
                                {clientName && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/50 text-sm">Cliente:</span>
                                        <span className="text-white font-semibold text-sm">{clientName}</span>
                                    </div>
                                )}
                                {currentUser && (
                                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                        <span className="text-white/50 text-sm">Logado como:</span>
                                        <span className="text-white/80 font-medium text-sm">{currentUser.nome || currentUser.login}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-white/40 text-sm font-medium">
                    <ShieldCheck size={18} />
                    <span>Dados validados contra a tabela de usuários do banco ativo</span>
                </div>
            </div>

            {/* Direita: Formulário de Login */}
            <div className="flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 relative bg-white rounded-r-2xl">
                {/* Mobile: Info do banco (só aparece se lg:hidden) */}
                <div className="lg:hidden flex flex-col items-center mb-8">
                    <div className="bg-[#32423D] p-4 rounded-xl shadow-md mb-4">
                        <Database className="w-10 h-10 text-[#E0E800]" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Login no Banco Ativo</h2>
                    <p className="text-gray-500 font-medium mt-1 text-sm text-center">
                        Banco: <span className="font-bold text-[#32423D]">{activeDb}</span>
                    </p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-full max-w-md mx-auto"
                >
                    <div className="hidden lg:block mb-10">
                        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Acesse sua conta</h2>
                        <p className="text-gray-500 font-medium mt-2">
                            Insira suas credenciais cadastradas no banco <span className="font-bold text-[#32423D]">{activeDb}</span>
                        </p>
                    </div>

                    {success ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center p-10 bg-green-50 rounded-2xl border border-green-100"
                        >
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="text-green-600" size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-green-800 mb-2">Login Realizado!</h3>
                            <p className="text-green-600 text-sm text-center">Redirecionando para o Dashboard...</p>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Usuário</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-colors">
                                        <User className="text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-14 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#32423D] focus:ring-2 focus:ring-[#E0E800]/30 outline-none transition-all placeholder:text-gray-400 font-medium text-gray-800 shadow-sm"
                                        placeholder="ex: admin"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        autoComplete="username"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700 ml-1">Senha</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-colors">
                                        <Lock className="text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={18} strokeWidth={2} />
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full pl-14 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#32423D] focus:ring-2 focus:ring-[#E0E800]/30 outline-none transition-all placeholder:text-gray-400 font-medium text-gray-800 shadow-sm"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-[#32423D] hover:bg-[#2a3833] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#32423D]/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3 overflow-hidden relative group"
                                >
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            Entrar no Sistema
                                            <ArrowRight size={20} strokeWidth={2.5} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-10 text-center">
                        <p className="text-xs font-medium text-gray-400">
                            &copy; {new Date().getFullYear()} Lynx System. Todos os direitos reservados.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
