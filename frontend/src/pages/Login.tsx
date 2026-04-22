import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
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
                login(data.user, data.token);
                addToast({ type: 'success', title: 'Bem-vindo', message: `Olá, ${data.user.nome}!` });
                window.location.href = '/dashboard';
            } else {
                addToast({ type: 'error', title: 'Acesso Negado', message: data.message || 'Credenciais inválidas' });
            }
        } catch (error) {
            console.error('Login error:', error);
            addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha na comunicação com o servidor' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background font-sans overflow-hidden">
            {/* Esquerda: Hero / Branding */}
            <div className="relative hidden lg:flex flex-col justify-between p-12 bg-primary overflow-hidden">
                {/* Elementos Decorativos de Fundo */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#425750]/30 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-4"
                    >
                        <div className="bg-white/10 p-3 rounded-md backdrop-blur-md border border-white/10 shadow-lg">
                            <img src="/lynx-logo.png" alt="Lynx" className="w-10 h-10 object-contain" />
                        </div>
                        <div>
                            <h2 className="text-primary-foreground font-extrabold text-2xl tracking-tight">Lynx System</h2>
                            <p className="text-primary-foreground/60 text-xs font-bold uppercase tracking-widest">Enterprise Solutions</p>
                        </div>
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-lg mt-auto mb-20">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-5xl font-extrabold text-primary-foreground leading-[1.1] tracking-tight mb-6"
                    >
                        Gerencie tudo <br/>
                        <span className="text-accent">com inteligência.</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-lg text-primary-foreground/70 font-medium leading-relaxed"
                    >
                        O Sistema Integrado de Controle definitivo para unificar seus dados de SST, SGQ e muito mais em um único dashboard robusto.
                    </motion.p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-primary-foreground/50 text-sm font-medium">
                    <ShieldCheck size={18} />
                    <span>Conexão Segura e Criptografada</span>
                </div>
            </div>

            {/* Direita: Formulário de Login */}
            <div className="flex flex-col justify-center px-6 py-12 lg:px-24 xl:px-32 relative">
                {/* Mobile Header (só aparece se lg:hidden) */}
                <div className="lg:hidden flex flex-col items-center mb-10 mt-[-2rem]">
                    <div className="bg-primary p-4 rounded-md shadow-md mb-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-50" />
                        <img src="/lynx-logo.png" alt="Lynx" className="w-16 h-16 object-contain relative z-10" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-foreground tracking-tight">SINCO Web</h2>
                    <p className="text-muted-foreground font-medium mt-1">Acesse sua conta</p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="w-full max-w-md mx-auto"
                >
                    <div className="hidden lg:block mb-10">
                        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Acesse sua conta</h2>
                        <p className="text-muted-foreground font-medium mt-2">Insira suas credenciais corporativas abaixo</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground ml-1">Usuário</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-colors">
                                    <User className="text-muted-foreground group-focus-within:text-primary transition-colors" size={18} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-14 pr-4 py-3 bg-card border border-border rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50 font-medium text-foreground shadow-sm"
                                    placeholder="ex: admin"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-bold text-foreground">Senha</label>
                            </div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-colors">
                                    <Lock className="text-muted-foreground group-focus-within:text-primary transition-colors" size={18} strokeWidth={2} />
                                </div>
                                <input
                                    type="password"
                                    className="w-full pl-14 pr-4 py-3 bg-card border border-border rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50 font-medium text-foreground shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-bold text-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3 overflow-hidden relative group"
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

                    <div className="mt-12 text-center">
                        <p className="text-xs font-medium text-muted-foreground/60">
                            &copy; {new Date().getFullYear()} Lynx System. Todos os direitos reservados.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
