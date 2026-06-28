import React, { useState, useEffect, useRef } from 'react';
import { Database, ChevronDown, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/cn';

interface BancoAtivo {
 id: number;
 nome_cliente: string;
 db_name: string;
 db_host: string;
}

export function DatabaseSwitcher() {
 const { user, token, switchDatabase } = useAuth();
 const [isOpen, setIsOpen] = useState(false);
 const [bancos, setBancos] = useState<BancoAtivo[]>([]);
 const [loading, setLoading] = useState(false);
 const [switching, setSwitching] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Only render for SuperAdmins
 if (!user?.isSuperadmin) return null;

 // Close dropdown on outside click
 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handler);
 return () => document.removeEventListener('mousedown', handler);
 }, []);

 const fetchBancos = async () => {
 if (bancos.length > 0) return; // Already loaded
 setLoading(true);
 setError(null);
 try {
 const res = await fetch('/api/superadmin/bancos-ativos', {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setBancos(data.data);
 } else {
 setError(data.message || 'Erro ao carregar bancos.');
 }
 } catch {
 setError('Falha ao conectar com o servidor.');
 } finally {
 setLoading(false);
 }
 };

 const handleOpen = () => {
 setIsOpen(v => !v);
 fetchBancos();
 };

 const handleSwitch = async (dbName: string) => {
 if (dbName === user?.dbName) { setIsOpen(false); return; }
 setSwitching(dbName);
 setError(null);
 const result = await switchDatabase(dbName);
 setSwitching(null);
 if (result.success) {
 setIsOpen(false);
 setBancos([]); // Force reload next open
 // Reload page to ensure all components re-fetch with new tenant
 window.location.reload();
 } else {
 setError(result.message || 'Erro ao trocar banco.');
 }
 };

 return (
 <div ref={dropdownRef} className="relative" id="db-switcher-container">
 <button
 id="db-switcher-btn"
 onClick={handleOpen}
 title="Trocar banco de dados (SuperAdmin)"
 className={cn(
 "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200",
 "bg-amber-50 border border-amber-300 text-amber-700",
 "hover:bg-amber-100 hover:border-amber-400 hover:shadow-sm",
 "dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
 )}
 >
 <Database size={15} strokeWidth={2} />
 <span className="hidden sm:inline max-w-[130px] truncate">
 {user?.dbName || 'N/A'}
 </span>
 <ChevronDown
 size={13}
 strokeWidth={2.5}
 className={cn("transition-transform duration-200", isOpen && "rotate-180")}
 />
 </button>

 {isOpen && (
 <div className={cn(
 "absolute right-0 mt-2 w-72 bg-card border border-border rounded-md shadow-2xl z-[200]",
 "animate-in fade-in slide-in-from-top-2 duration-150"
 )}>
 {/* Header */}
 <div className="px-3 py-1.5 border-b border-border">
 <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
 <Database size={15} strokeWidth={2} />
 <span className="text-xs font-bold uppercase tracking-wider">Trocar Banco de Dados</span>
 </div>
 <p className="text-[11px] text-muted-foreground mt-1">
 SuperAdmin — acesso global a todos os tenants ativos
 </p>
 </div>

 {/* Error */}
 {error && (
 <div className="mx-3 mt-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
 <AlertCircle size={13} className="text-destructive shrink-0" />
 <span className="text-xs text-destructive">{error}</span>
 </div>
 )}

 {/* List */}
 <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
 {loading && (
 <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
 <Loader2 size={16} className="animate-spin" />
 <span className="text-xs">Carregando bancos...</span>
 </div>
 )}

 {!loading && bancos.map(banco => {
 const isActive = banco.db_name === user?.dbName;
 const isSwitching = switching === banco.db_name;

 return (
 <button
 key={banco.id}
 id={`db-option-${banco.db_name}`}
 onClick={() => handleSwitch(banco.db_name)}
 disabled={!!switching}
 className={cn(
 "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150",
 "hover:bg-secondary disabled:cursor-wait",
 isActive && "bg-primary/5"
 )}
 >
 <div className={cn(
 "w-2 h-2 rounded-full shrink-0 mt-0.5",
 isActive ? "bg-green-500" : "bg-muted-foreground/30"
 )} />
 <div className="flex-1 min-w-0">
 <p className={cn(
 "text-sm font-semibold truncate",
 isActive ? "text-primary" : "text-foreground"
 )}>
 {banco.nome_cliente}
 </p>
 <p className="text-[11px] text-muted-foreground font-mono truncate">
 {banco.db_name}
 </p>
 </div>
 {isSwitching ? (
 <Loader2 size={14} className="animate-spin text-primary shrink-0" />
 ) : isActive ? (
 <CheckCircle2 size={14} className="text-green-500 shrink-0" />
 ) : null}
 </button>
 );
 })}

 {!loading && bancos.length === 0 && !error && (
 <p className="text-xs text-center text-muted-foreground py-6">
 Nenhum banco ativo encontrado.
 </p>
 )}
 </div>

 {/* Footer badge */}
 <div className="px-4 py-2 border-t border-border bg-amber-50/50 dark:bg-amber-900/10 rounded-b-xl">
 <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 font-medium">
 🔐 Modo SuperAdmin — troca aplica reload automático
 </p>
 </div>
 </div>
 )}
 </div>
 );
}
