import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Building2, Calendar, FileText,
    ShieldCheck, ClipboardCheck, ArrowRight, Activity, AlertCircle, CheckCircle2
} from 'lucide-react';

interface DashboardProps {
    onNavigate: (page: string) => void;
}

const quickAccessItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard', desc: 'Visão geral', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Calendar, label: 'Calendário', page: 'calendario', desc: 'Agendamentos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Building2, label: 'Pessoa Jurídica', page: 'pessoa-juridica', desc: 'Gestão de clientes', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: FileText, label: 'Relatórios', page: 'relatorios', desc: 'Análise de dados', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: ShieldCheck, label: 'SST', page: 'sst', desc: 'Segurança trabalho', color: 'text-red-600', bg: 'bg-red-50' },
    { icon: ClipboardCheck, label: 'SGQ', page: 'sgq', desc: 'Controle qualidade', color: 'text-cyan-600', bg: 'bg-cyan-50' },
];

export default function DashboardPage({ onNavigate }: DashboardProps) {
    const [stats, setStats] = useState({ companies: 0, pendingDocs: 0, compliance: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStats(data.stats);
                }
            })
            .catch(err => console.error('Error loading stats:', err))
            .finally(() => setLoading(false));
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
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-8"
        >
            {/* Hero Section */}
            <motion.div variants={item} className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-8 shadow-xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Activity size={200} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">Bem-vindo ao SINCO Lynx</h1>
                    <p className="text-lg opacity-90 leading-relaxed text-blue-50">
                        Sua central de comando para SST, SGQ e PCP.
                        Gerencie processos, acompanhe indicadores e garanta a qualidade em um só lugar.
                    </p>
                </div>
            </motion.div>

            {/* Quick Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={item} className="p-6 rounded-3xl bg-white border border-border shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                            <Building2 size={24} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600">Total</span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Empresas Cadastradas</h3>
                    <p className="text-4xl font-bold mt-2 text-foreground tracking-tight">
                        {loading ? '...' : stats.companies}
                    </p>
                </motion.div>

                <motion.div variants={item} className="p-6 rounded-3xl bg-white border border-border shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform">
                            <AlertCircle size={24} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-orange-100 rounded-full text-orange-700">Atenção</span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Documentos Pendentes</h3>
                    <p className="text-4xl font-bold mt-2 text-foreground tracking-tight">
                        {loading ? '...' : stats.pendingDocs}
                    </p>
                </motion.div>

                <motion.div variants={item} className="p-6 rounded-3xl bg-white border border-border shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={24} />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-emerald-100 rounded-full text-emerald-700">+2.5%</span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">Conformidade SST</h3>
                    <p className="text-4xl font-bold mt-2 text-foreground tracking-tight">
                        {loading ? '...' : `${stats.compliance}%`}
                    </p>
                </motion.div>
            </div>

            {/* Quick Access Section */}
            <motion.div variants={item}>
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <LayoutDashboard size={20} className="text-primary" />
                    Acesso Rápido
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickAccessItems.map((item) => (
                        <motion.button
                            key={item.label}
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onNavigate(item.page)}
                            className="bg-white p-4 rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all group text-left relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                                <div className="p-2 rounded-full bg-gray-50 text-gray-300 group-hover:bg-primary group-hover:text-accent transition-all">
                                    <ArrowRight size={16} />
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
