import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
    LayoutDashboard, Building2, Calendar, FileText,
    ShieldCheck, ClipboardCheck, ArrowRight, Activity, AlertCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/cn';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

const quickAccessItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard', desc: 'Visão geral' },
    { icon: Calendar, label: 'Calendário', page: 'calendario', desc: 'Agendamentos' },
    { icon: Building2, label: 'Pessoa Jurídica', page: 'pessoa-juridica', desc: 'Gestão de clientes' },
    { icon: FileText, label: 'Relatórios', page: 'relatorios', desc: 'Análise de dados' },
    { icon: ShieldCheck, label: 'SST', page: 'sst', desc: 'Segurança trabalho' },
    { icon: ClipboardCheck, label: 'SGQ', page: 'sgq', desc: 'Controle qualidade' },
];

function AnimatedCounter({ value, isPercent = false }: { value: number, isPercent?: boolean }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 1500; // ms
        const incrementTime = 16; // 60fps
        const totalSteps = Math.round(duration / incrementTime);
        const stepValue = value / totalSteps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep += 1;
            start += stepValue;
            if (currentStep >= totalSteps) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.ceil(start));
            }
        }, incrementTime);

        return () => clearInterval(timer);
    }, [value]);

    return <span>{count}{isPercent ? '%' : ''}</span>;
}

function SkeletonCard() {
    return (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden skeleton-shimmer">
            <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-secondary/80"></div>
                <div className="w-16 h-6 rounded-full bg-secondary/80"></div>
            </div>
            <div className="w-32 h-4 rounded-md bg-secondary/80"></div>
            <div className="w-20 h-10 rounded-md bg-secondary/80 mt-2"></div>
        </div>
    );
}

export default function DashboardPage({ onNavigate }: DashboardProps) {
    const [stats, setStats] = useState({ companies: 0, pendingDocs: 0, compliance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate real API load time for dramatic effect
        setTimeout(() => {
            fetch('/api/dashboard/stats')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setStats(data.stats);
                    }
                })
                .catch(err => console.error('Error loading stats:', err))
                .finally(() => setLoading(false));
        }, 800);
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10 pb-12 relative"
        >
            {/* Background Blurs */}
            <div className="absolute top-20 right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-20 left-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Hero Section */}
            <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-8 md:p-12 shadow-xl flex flex-col justify-end min-h-[300px]">
                {/* Hero Decorators */}
                <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[150%] bg-white/5 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />
                <div className="absolute -bottom-10 -right-10 opacity-10 transform rotate-12 scale-150">
                    <Activity size={240} strokeWidth={1} />
                </div>
                
                <div className="relative z-10 max-w-3xl">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md mb-6 border border-white/10"
                    >
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white/90">Sistema Online</span>
                    </motion.div>
                    
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
                        Bem-vindo ao <span className="text-accent">SINCO</span>
                    </h1>
                    <p className="text-lg md:text-xl opacity-80 leading-relaxed max-w-2xl font-medium">
                        Sua central de comando integrada. Gerencie equipes, acompanhe indicadores em tempo real e impulsione a qualidade.
                    </p>
                </div>
            </motion.div>

            {/* Quick Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 bg-blue-500/10 rounded-xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                                    <Building2 size={24} strokeWidth={2.5} />
                                </div>
                                <span className="text-xs font-bold px-3 py-1 bg-secondary rounded-full text-muted-foreground">Total</span>
                            </div>
                            <h3 className="text-muted-foreground text-sm font-bold tracking-wide">Empresas Cadastradas</h3>
                            <p className="text-4xl md:text-5xl font-black mt-2 text-foreground tracking-tight tabular-nums">
                                <AnimatedCounter value={stats.companies} />
                            </p>
                        </motion.div>

                        <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg hover:border-orange-500/20 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 bg-orange-500/10 rounded-xl text-orange-600 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                                    <AlertCircle size={24} strokeWidth={2.5} />
                                </div>
                                <span className="text-xs font-bold px-3 py-1 bg-orange-500/10 rounded-full text-orange-600">Atenção</span>
                            </div>
                            <h3 className="text-muted-foreground text-sm font-bold tracking-wide">Documentos Pendentes</h3>
                            <p className="text-4xl md:text-5xl font-black mt-2 text-foreground tracking-tight tabular-nums">
                                <AnimatedCounter value={stats.pendingDocs} />
                            </p>
                        </motion.div>

                        <motion.div variants={item} className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                    <CheckCircle2 size={24} strokeWidth={2.5} />
                                </div>
                                <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-600">+2.5%</span>
                            </div>
                            <h3 className="text-muted-foreground text-sm font-bold tracking-wide">Conformidade SST</h3>
                            <p className="text-4xl md:text-5xl font-black mt-2 text-foreground tracking-tight tabular-nums">
                                <AnimatedCounter value={stats.compliance} isPercent />
                            </p>
                        </motion.div>
                    </>
                )}
            </div>

            {/* Quick Access Section */}
            <motion.div variants={item} className="relative z-10 pt-4">
                <h2 className="text-2xl font-extrabold text-foreground mb-8 flex items-center gap-3">
                    <div className="p-2 bg-primary text-primary-foreground rounded-lg shadow-md">
                        <LayoutDashboard size={24} strokeWidth={2.5} />
                    </div>
                    Módulos Rápidos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {quickAccessItems.map((item) => (
                        <motion.button
                            key={item.label}
                            whileHover={{ y: -6, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onNavigate(item.page)}
                            className="bg-card p-5 rounded-2xl border border-border shadow-md hover:shadow-lg hover:shadow-primary/5 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-4 rounded-xl bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md transition-all duration-300">
                                    <item.icon size={26} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                                    <p className="text-sm font-medium text-muted-foreground/80 mt-0.5">{item.desc}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary/50 text-foreground/40 group-hover:bg-primary group-hover:text-accent transition-all duration-300 group-hover:translate-x-1">
                                    <ArrowRight size={18} strokeWidth={2.5} />
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
