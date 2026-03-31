import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, ChevronDown, ChevronRight, Moon, Sun, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { getIcon } from '../utils/iconMap';
import type { MenuItem } from '../utils/iconMap';
import type { User } from '../contexts/AuthContext';

interface AppLayoutProps {
    children: React.ReactNode;
    menuItems: MenuItem[];
    activePageId: string;
    activeLabel: string;
    onNavigate: (id: string) => void;
    onLogout?: () => void;
    user?: User | null;
}

export function AppLayout({ children, menuItems, activePageId, activeLabel, onNavigate, onLogout, user }: AppLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [isDark, setIsDark] = useState(false);

    // Ref para o scroll container do sidebar desktop
    const sidebarScrollRef = useRef<HTMLDivElement>(null);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Auto-expand parent if child is active
    useEffect(() => {
        menuItems.forEach(item => {
            if (item.children) {
                const hasActiveChild = item.children.some(c => c.id === activePageId);
                if (hasActiveChild) {
                    setExpandedItems(prev => ({ ...prev, [item.id]: true }));
                }
            }
        });
    }, [activePageId, menuItems]);

    // Scroll automático para centralizar o item ativo no sidebar
    useEffect(() => {
        if (!sidebarScrollRef.current) return;
        // Aguarda um tick para garantir que o DOM foi atualizado
        const timer = setTimeout(() => {
            const activeEl = sidebarScrollRef.current?.querySelector(`[data-menu-id="${activePageId}"]`) as HTMLElement | null;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 80);
        return () => clearTimeout(timer);
    }, [activePageId]);

    const renderMenuItem = (item: MenuItem, depth = 0, isMobile = false) => {
        const Icon = getIcon(item.icon);
        const isActive = activePageId === item.id;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.id];

        return (
            <li key={item.id} className="mb-1">
                <button
                    data-menu-id={item.id}
                    onClick={() => {
                        if (hasChildren) {
                            toggleExpand(item.id);
                        } else {
                            onNavigate(item.id);
                            if (isMobile) setIsMobileMenuOpen(false);
                        }
                    }}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                        isActive && !hasChildren
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "text-primary/70 hover:bg-primary/10 hover:text-primary"
                    )}
                    style={{ paddingLeft: `${(depth * 12) + 12}px` }}
                >
                    <div className={cn(
                        "p-1.5 rounded-md transition-colors",
                        isActive && !hasChildren ? "bg-primary-foreground/20" : "bg-primary/5 group-hover:bg-primary/10"
                    )}>
                        <Icon size={18} />
                    </div>
                    <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                        <span className="opacity-70">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    )}
                </button>
                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-primary/5 rounded-b-lg"
                        >
                            {item.children!.map(child => renderMenuItem(child, depth + 1, isMobile))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </li>
        );
    };

    const SidebarContent = ({ isMobile = false, scrollRef }: { isMobile?: boolean; scrollRef?: React.RefObject<HTMLDivElement> }) => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-primary/10 flex items-center gap-3">
                <img src="/lynx-logo.png" alt="Lynx" className="w-8 h-8 rounded-lg object-contain" />
                <div>
                    <h2 className="font-bold text-lg tracking-tight">SINCO</h2>
                    <p className="text-[10px] uppercase tracking-wider opacity-60">Web System</p>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                <ul>
                    {menuItems.map(item => renderMenuItem(item, 0, isMobile))}
                </ul>
            </div>

            <div className="p-4 border-t border-primary/10 space-y-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm text-primary/80"
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
                </button>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors text-sm text-primary/80"
                >
                    <LogOut size={18} />
                    <span>Sair</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen overflow-hidden bg-background transition-colors duration-300 flex">
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden md:flex bg-[#F9F8F3] text-primary fixed inset-y-0 left-0 z-30 shadow-xl flex-col border-r border-primary/10 transition-transform duration-300 w-72 h-full",
                isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
            )}>
                <SidebarContent scrollRef={sidebarScrollRef} />
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground z-40 flex items-center justify-between px-4 shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg">SINCO</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-foreground text-primary flex items-center justify-center font-bold">
                    <UserIcon size={16} />
                </div>
            </header>

            {/* Mobile Drawer (Overlay) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="fixed inset-y-0 left-0 w-[80%] max-w-[300px] bg-[#F9F8F3] text-primary z-50 md:hidden shadow-2xl border-r border-primary/10 h-full"
                        >
                            <SidebarContent isMobile={true} />
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-primary/10 rounded-full text-primary"
                            >
                                <X size={20} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className={cn(
                "pt-16 md:pt-0 h-full w-full overflow-auto custom-scrollbar transition-all duration-300",
                isSidebarCollapsed ? "md:ml-0" : "md:ml-72"
            )}>
                <div className="p-4 md:p-8 w-full max-w-[1920px] mx-auto space-y-6">
                    {/* Header Desktop (Breadcrumb/Title) */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="hidden md:flex p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-primary/70 transition-colors"
                                title={isSidebarCollapsed ? "Mostrar Menu" : "Ocultar Menu"}
                            >
                                <Menu size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{activeLabel}</h1>
                                <p className="text-muted-foreground text-sm mt-1">Gerenciamento e Controle</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            {/* User Profile or Actions */}
                            <div className="flex items-center gap-3 px-4 py-2 bg-card border rounded-full shadow-sm">
                                <div className="flex flex-col items-end mr-1 text-right">
                                    <span className="text-sm font-medium leading-tight">{user?.nome || 'Usuário'}</span>
                                    {user?.clientName && (
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            {user.clientName} {user.dbName ? `(${user.dbName})` : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <UserIcon size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Slot */}
                    <div className="animate-fade-in-up">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
