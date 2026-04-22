import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, ChevronDown, ChevronRight, Moon, Sun, User as UserIcon, Search, HelpCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { helpContents } from '../utils/helpContent';
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
    const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    const currentHelp = helpContents[activePageId] || helpContents['default'];
    // Ref para o scroll container do sidebar desktop
    const sidebarScrollRef = useRef<HTMLDivElement>(null);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.classList.toggle('dark');
    };

    const toggleExpand = (id: string) => {
        if (isSidebarCollapsed) setIsSidebarCollapsed(false); // Auto expand sidebar if trying to open menu
        setExpandedItems(prev => {
            const isExpanding = !prev[id];
            if (isExpanding) {
                setLastInteractedId(id);
            }
            return { ...prev, [id]: isExpanding };
        });
    };

    // Auto-expand parent(s) se child is active
    useEffect(() => {
        const expandParentsOf = (items: MenuItem[], targetId: string): boolean => {
            for (const item of items) {
                if (item.children) {
                    const directChild = item.children.some(c => c.id === targetId);
                    const deepChild = expandParentsOf(item.children, targetId);
                    if (directChild || deepChild) {
                        setExpandedItems(prev => ({ ...prev, [item.id]: true }));
                        return true;
                    }
                }
            }
            return false;
        };
        expandParentsOf(menuItems, activePageId);
    }, [activePageId, menuItems]);

    // Scroll automático para centralizar
    useEffect(() => {
        if (!sidebarScrollRef.current || isSidebarCollapsed) return;
        const targetId = lastInteractedId || activePageId;
        if (!targetId) return;
        const timer = setTimeout(() => {
            const el = sidebarScrollRef.current?.querySelector(`[data-menu-id="${targetId}"]`) as HTMLElement | null;
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
            if (lastInteractedId) setLastInteractedId(null);
        }, 150); 
        return () => clearTimeout(timer);
    }, [activePageId, lastInteractedId, isSidebarCollapsed]);

    // Filtro
    const filterMenuItems = (items: MenuItem[], term: string): MenuItem[] => {
        if (!term.trim()) return items;
        const lower = term.toLowerCase();
        return items.reduce<MenuItem[]>((acc, item) => {
            const labelMatch = item.label.toLowerCase().includes(lower);
            const filteredChildren = item.children ? filterMenuItems(item.children, term) : [];
            if (labelMatch) {
                acc.push(item);
            } else if (filteredChildren.length > 0) {
                acc.push({ ...item, children: filteredChildren });
            }
            return acc;
        }, []);
    };

    const filteredMenuItems = useMemo(
        () => filterMenuItems(menuItems, appliedSearch),
        [menuItems, appliedSearch]
    );

    const renderMenuItem = (item: MenuItem, depth = 0, isMobile = false, isCollapsed = false) => {
        const Icon = getIcon(item.icon);
        const isActive = activePageId === item.id;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.id];

        return (
            <li key={item.id} className="mb-1" title={isCollapsed ? item.label : undefined}>
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
                        "w-full flex items-center px-3 py-2.5 rounded-md transition-all duration-200 group relative",
                        isCollapsed ? "justify-center" : "gap-3",
                        isActive && !hasChildren
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                    )}
                    style={{ paddingLeft: isCollapsed ? '0.75rem' : `${(depth * 12) + 12}px` }}
                >
                    <div className={cn(
                        "p-1 rounded-md transition-all duration-200",
                        isActive && !hasChildren 
                            ? "bg-primary-foreground/20" 
                            : isCollapsed ? "group-hover:bg-primary/10" : "bg-transparent group-hover:bg-primary/5"
                    )}>
                        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                    </div>
                    
                    {!isCollapsed && (
                        <>
                            <span className="font-medium text-sm flex-1 text-left tracking-wide">{item.label}</span>
                            {hasChildren && (
                                <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                                    {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                                </span>
                            )}
                        </>
                    )}
                </button>
                <AnimatePresence>
                    {hasChildren && isExpanded && !isCollapsed && (
                        <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-secondary/30 rounded-md mt-1"
                        >
                            {item.children!.map(child => renderMenuItem(child, depth + 1, isMobile, isCollapsed))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </li>
        );
    };

    const SidebarContent = ({ isMobile = false, isCollapsed = false, scrollRef }: { isMobile?: boolean; isCollapsed?: boolean; scrollRef?: React.RefObject<HTMLDivElement | null> }) => (
        <div className="flex flex-col h-full">
            <div className={cn("p-4 border-b border-border flex items-center transition-all duration-200", isCollapsed ? "justify-center" : "gap-3")}>
                <div className="relative group shrink-0">
                    <img src="/lynx-logo.png" alt="Lynx" className="w-9 h-9 rounded-md object-contain bg-primary/5 p-1" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h2 className="font-extrabold text-lg tracking-tight leading-none text-foreground">SINCO</h2>
                        <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">SaaS Plataform</p>
                    </div>
                )}
            </div>

            {/* Search Box */}
            <div className={cn("px-3 pt-4 pb-2 transition-all duration-300", isCollapsed ? "opacity-0 h-0 p-0 overflow-hidden" : "opacity-100 h-auto")}>
                <div className="relative flex gap-1 group">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Pesquisar menu..."
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') setAppliedSearch(sidebarSearch); }}
                            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-md bg-transparent border border-border focus:outline-none focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-foreground/50 text-foreground transition-all duration-200"
                        />
                        {sidebarSearch && (
                            <button onClick={() => { setSidebarSearch(''); setAppliedSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
                <ul>
                    {filteredMenuItems.map(item => renderMenuItem(item, 0, isMobile, isCollapsed))}
                </ul>
                {appliedSearch && filteredMenuItems.length === 0 && !isCollapsed && (
                    <p className="text-xs text-center text-foreground/40 mt-6 font-medium">Nenhum item encontrado</p>
                )}
            </div>

            <div className={cn("p-4 border-t border-border space-y-2", isCollapsed && "flex flex-col items-center px-1")}>
                <button
                    onClick={toggleTheme}
                    title={isCollapsed ? (isDark ? 'Modo Claro' : 'Modo Escuro') : undefined}
                    className={cn(
                        "flex items-center rounded-md hover:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all text-sm font-medium text-foreground/80",
                        isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5 w-full"
                    )}
                >
                    {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
                    {!isCollapsed && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
                </button>
                <button
                    onClick={onLogout}
                    title={isCollapsed ? 'Sair do Sistema' : undefined}
                    className={cn(
                        "flex items-center rounded-md hover:bg-destructive/10 hover:text-destructive focus:ring-1 focus:ring-destructive/50 transition-all text-sm font-medium text-foreground/80",
                        isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5 w-full"
                    )}
                >
                    <LogOut size={18} strokeWidth={2} />
                    {!isCollapsed && <span>Sair Seguro</span>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="h-screen overflow-hidden bg-background transition-colors duration-500 flex font-sans">
            {/* Desktop Sidebar (Glassmorphism) */}
            <aside className={cn(
                "hidden md:flex bg-card border-r border-border fixed inset-y-0 left-0 z-30 shadow-lg flex-col transition-all duration-400 ease-in-out h-full",
                isSidebarCollapsed ? "w-20" : "w-72"
            )}>
                {SidebarContent({ scrollRef: sidebarScrollRef, isCollapsed: isSidebarCollapsed })}
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-40 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-secondary rounded-md text-foreground transition-colors">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-xl tracking-tight text-foreground">SINCO</span>
                </div>
                <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
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
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 w-[85%] max-w-[320px] bg-card border-r border-border z-50 md:hidden shadow-2xl h-full"
                        >
                            {SidebarContent({ isMobile: true })}
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-secondary rounded-md text-foreground hover:bg-primary/10 transition-colors"
                            >
                                <X size={18} strokeWidth={2} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className={cn(
                "pt-16 md:pt-0 h-full w-full overflow-auto custom-scrollbar transition-all duration-400 ease-in-out bg-background relative",
                isSidebarCollapsed ? "md:ml-20" : "md:ml-72"
            )}>
                {/* Floating Decorative Blur */}
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[30%] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                <div className="p-4 md:p-8 w-full max-w-7xl mx-auto relative z-10">
                    {/* Header Desktop (Breadcrumb/Title) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div className="flex items-start gap-4">
                            <button 
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="hidden md:flex p-2.5 bg-card border border-border hover:shadow-sm hover:border-primary/50 rounded-md text-foreground/80 hover:text-primary transition-all active:scale-95"
                                title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                            >
                                <Menu size={20} strokeWidth={2} />
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">{activeLabel}</h1>
                                <p className="text-muted-foreground text-sm mt-1 font-medium">Plataforma de Gerenciamento Especializado</p>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            {/* Help Button */}
                            <button 
                                onClick={() => setShowHelp(true)} 
                                className="group flex items-center gap-2 px-4 py-2 bg-card border border-border hover:border-primary/50 rounded-md transition-all shadow-sm"
                                title="Precisa de ajuda?"
                            >
                                <div className="bg-primary/10 text-primary rounded-md p-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <HelpCircle size={14} strokeWidth={2} />
                                </div>
                                <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors">Ajuda</span>
                            </button>

                            {/* User Profile Glass Pill */}
                            <div className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-card border border-border rounded-md shadow-sm transition-shadow cursor-pointer hover:border-primary/50">
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-sm font-bold leading-tight text-foreground">{user?.nome || 'Usuário'}</span>
                                    {user?.clientName && (
                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                            {user.clientName} {user.dbName ? `(${user.dbName})` : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-md bg-secondary text-foreground flex items-center justify-center font-bold">
                                    <UserIcon size={16} strokeWidth={2} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard/Page Content Slot */}
                    <div className="animate-fade-in-up">
                        {children}
                    </div>
                </div>
            </main>

            {/* Global Help Modal (Glassmorphism) */}
            <AnimatePresence>
                {showHelp && (
                    <div className="fixed inset-0 bg-primary/40 z-50 flex items-center justify-center backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-card rounded-md shadow-2xl border border-border p-6 max-w-lg w-[calc(100%-2rem)] m-4"
                        >
                            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-md text-primary">
                                        <HelpCircle size={24} /> 
                                    </div>
                                    {currentHelp.title}
                                </h2>
                                <button onClick={() => setShowHelp(false)} className="text-foreground/40 hover:text-foreground p-2 rounded-md transition-colors hover:bg-secondary">
                                    <X size={20} className="stroke-[2]" />
                                </button>
                            </div>
                            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm font-medium">
                                {currentHelp.description}
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={() => setShowHelp(false)} 
                                    className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-bold transition-all active:scale-95 shadow-sm"
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
