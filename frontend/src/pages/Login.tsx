import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
    const { login } = useAuth();
    const { addToast } = useToast();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
                login(data.user);
                addToast({ type: 'success', title: 'Bem-vindo', message: `Olá, ${data.user.nome}!` });
                // Use full page navigation to trigger AppContent
                window.location.href = '/dashboard';
            } else {
                addToast({ type: 'error', title: 'Erro', message: data.message || 'Credenciais inválidas' });
            }
        } catch (error) {
            console.error('Login error:', error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha na conexão com o servidor' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9F8F3] p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden"
            >
                <div className="bg-[#32423D] p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 bg-[#E0E800]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <img src="/lynx-logo.png" alt="SINCO" className="w-16 h-16 mx-auto mb-4 rounded-xl shadow-lg bg-white/10 p-2 backdrop-blur-sm" />
                        <h1 className="text-2xl font-bold text-white tracking-tight">SINCO Web</h1>
                        <p className="text-white/60 text-sm mt-1">Sistema Integrado de Controle</p>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 ml-1">Usuário</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={20} />
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                    placeholder="Seu usuário"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 ml-1">Senha</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#32423D] transition-colors" size={20} />
                                <input
                                    type="password"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-[#32423D] hover:bg-[#2a3833] text-[#E0E800] rounded-xl font-bold text-lg shadow-lg shadow-[#32423D]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={22} />
                                ) : (
                                    <>
                                        Entrar
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} Lynx System. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
