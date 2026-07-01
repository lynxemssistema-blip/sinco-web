import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Save, AlertTriangle, ShieldCheck, RefreshCcw, Server, Users, Plus, GitCompare, ArrowRight, CheckCircle, Code, LogOut, XCircle, Search, X, Trash2, Monitor } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface SuperadminPageProps {
 defaultTab?: 'config' | 'tenants' | 'schema' | 'users';
}

export default function SuperadminPage({ defaultTab = 'users' }: SuperadminPageProps) {
 const { addToast } = useToast();
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [loading, setLoading] = useState(false);
 const [activeTab, setActiveTab] = useState<'config' | 'tenants' | 'schema' | 'users' | 'audit'>(defaultTab);

 // Auth State
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');

 // DB Config State (Single Tenant / Local Fallback)
 const [dbConfig, setDbConfig] = useState({
 host: '', user: '', password: '', database: '', port: 3306
 });

 // Tenant Management State
 const [tenants, setTenants] = useState<Record<string, unknown>[]>([]);
 const [newTenant, setNewTenant] = useState({
 nome_cliente: '', db_host: '', db_user: '', db_pass: '', db_name: '', db_port: 3306, copia_banco_dados: ''
 });

 // Schema Compare State
 const [sourceDbId, setSourceDbId] = useState<number | ''>('');
 const [destDbId, setDestDbId] = useState<number | ''>('');
 const [schemaActions, setSchemaActions] = useState<Record<string, unknown>[]>([]);
 const [comparing, setComparing] = useState(false);
 const [hasCompared, setHasCompared] = useState(false);
 const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
 const [syncResults, setSyncResults] = useState<Record<string, unknown>[]>([]);
 const [syncing, setSyncing] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [history, setHistory] = useState<Record<string, unknown>[]>([]);

 // Tenant Search
 const [tenantSearch, setTenantSearch] = useState('');

 // Users State
 const [users, setUsers] = useState<Record<string, unknown>[]>([]);
 const [userSearchLogin, setUserSearchLogin] = useState('');
 const [userSearchTenant, setUserSearchTenant] = useState('');

 // Login Audit State
 const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([]);
 const [loadingAudit, setLoadingAudit] = useState(false);
 const [auditHoras, setAuditHoras] = useState(24);

 useEffect(() => {
 const sincoUserRaw = localStorage.getItem('sinco_user');
 const sincoToken = localStorage.getItem('sinco_token');

 if (sincoUserRaw && sincoToken) {
 try {
 const sincoUser = JSON.parse(sincoUserRaw);
 const hasSuperCreds =
 sincoUser.isSuperadmin === true ||
 sincoUser.superadmin === 'S' ||
 sincoUser.login?.toLowerCase() === 'superadmin';

 if (hasSuperCreds) {
 // Sempre sincronizar superadmin_token com o sinco_token atual
 localStorage.setItem('superadmin_token', sincoToken);
 setIsAuthenticated(true);
 fetchTenants(sincoToken);
 fetchUsers(sincoToken);
 return;
 }
 } catch {
 console.error('Erro ao verificar sessão principal', e);
 }
 }

 // Fallback: token de login manual do painel admin
 const superToken = localStorage.getItem('superadmin_token');
 if (superToken) {
 checkAuth(superToken);
 }
 }, []);

 const fetchAuditLogs = async (horas = auditHoras) => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 setLoadingAudit(true);
 try {
 const res = await fetch(`/api/admin/login-audit?horas=${horas}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) setAuditLogs(data.data);
 } catch { addToast({ type: 'error', message: 'Erro ao buscar registros de acesso' }); }
 finally { setLoadingAudit(false); }
 };

 const handleCleanAudit = async () => {
 if (!confirm('Remover todos os registros com mais de 24 horas?')) return;
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 try {
 const res = await fetch('/api/admin/login-audit', {
 method: 'DELETE',
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 addToast({ type: 'success', message: data.message });
 fetchAuditLogs();
 }
 } catch { addToast({ type: 'error', message: 'Erro ao limpar registros' }); }
 };


 const checkAuth = async (token: string) => {
 try {
 const res = await fetch('/api/admin/check-auth', {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setIsAuthenticated(true);
 fetchTenants(token);
 fetchUsers(token);
 } else {
 localStorage.removeItem('superadmin_token');
 setIsAuthenticated(false);
 }
 } catch {
 console.error(error);
 localStorage.removeItem('superadmin_token');
 setIsAuthenticated(false);
 }
 };

 const fetchTenants = async (token: string) => {
 try {
 const res = await fetch('/api/admin/databases', {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 setTenants(data.data);
 }
 } catch {
 console.error('Error fetching tenants:', error);
 }
 };

 const fetchUsers = async (token: string) => {
 try {
 const res = await fetch('/api/admin/users', {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) setUsers(data.data);
 } catch {
 console.error(error);
 }
 };

 const handleToggleSuperadmin = async (userId: number, currentStatus: string) => {
 const newStatus = currentStatus === 'S' ? 'N' : 'S';
 try {
 const token = localStorage.getItem('superadmin_token');
 const res = await fetch(`/api/admin/users/${userId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ superadmin: newStatus })
 });
 const data = await res.json();
 if (data.success) {
 addToast({ type: 'success', message: 'Status atualizado com sucesso' });
 if (token) fetchUsers(token);
 } else {
 addToast({ type: 'error', message: data.message });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao atualizar usuário' });
 }
 };

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();

 // Client-side check removed to allow backend authentication
 console.log('Tentando login com:', username);

 setLoading(true);
 try {
 // Authenticate against Central DB (using the same credentials for verification against the DB record)
 const res = await fetch('/api/admin/login', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ username, password })
 });
 const data = await res.json();

 if (data.success) {
 localStorage.setItem('superadmin_token', data.token);

 // Store Superadmin status in memory/storage as requested
 localStorage.setItem('superadmin_active_session', 'true');

 setIsAuthenticated(true);
 addToast({ type: 'success', message: 'Login realizado com sucesso' });
 fetchTenants(data.token);
 fetchUsers(data.token);
 } else {
 addToast({ type: 'error', message: data.message || 'Credenciais inválidas no banco de dados' });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao realizar login' });
 } finally {
 setLoading(false);
 }
 };

 // --- TENANT MANAGEMENT HANDLERS ---
 const handleAddTenant = async () => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 setLoading(true);
 try {
 const res = await fetch('/api/admin/databases', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(newTenant)
 });
 const data = await res.json();
 if (data.success) {
 addToast({ type: 'success', message: 'Banco cadastrado com sucesso' });
 setNewTenant({ nome_cliente: '', db_host: '', db_user: '', db_pass: '', db_name: '', db_port: 3306, copia_banco_dados: '' });
 fetchTenants(token);
 } else {
 addToast({ type: 'error', message: data.message });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao criar banco' });
 } finally {
 setLoading(false);
 }
 };

 const handleSyncUsers = async (dbId: number) => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 setLoading(true);
 try {
 const res = await fetch(`/api/admin/sync-users/${dbId}`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 addToast({ type: 'success', message: data.message });
 fetchUsers(token);
 } else {
 addToast({ type: 'error', message: data.message });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao sincronizar usuários' });
 } finally {
 setLoading(false);
 }
 };

 const handleSyncAllUsers = async () => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 if (!confirm('Deseja iniciar a sincronização global de todos os clientes? Isso pode levar alguns segundos.')) return;
 
 setLoading(true);
 try {
 const res = await fetch(`/api/admin/sync-all`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (data.success) {
 addToast({ type: 'success', message: data.message });
 fetchUsers(token);
 } else {
 addToast({ type: 'error', message: data.message });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao sincronizar todos os usuários' });
 } finally {
 setLoading(false);
 }
 };

 // Access Tenant Handler
 const handleAccessTenant = async (tenant: Record<string, unknown>) => {
 if (!confirm(`Deseja acessar o sistema no ambiente: ${tenant.nome_cliente}?`)) return;

 // sinco_token tem isSuperadmin=true — /api/superadmin/switch-db aceita diretamente
 const activeToken = localStorage.getItem('sinco_token') || localStorage.getItem('superadmin_token');
 if (!activeToken) {
 addToast({ type: 'error', message: 'Sessão não encontrada. Faça login novamente.' });
 return;
 }

 setLoading(true);
 try {
 const res = await fetch('/api/superadmin/switch-db', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${activeToken}`
 },
 body: JSON.stringify({ dbName: tenant.db_name })
 });

 const data = await res.json();
 console.log('[SuperAdmin] switch-db response:', data.success, data.message || '');

 if (data.success && data.token) {
 const userData = {
 id: data.user?.id || 1,
 nome: data.user?.nome || 'Superadmin',
 login: data.user?.login || 'superadmin',
 role: 'admin',
 isSuperadmin: true,
 superadmin: 'S',
 clientName: tenant.nome_cliente,
 dbName: tenant.db_name,
 };

 // Preservar token original para retorno ao painel
 localStorage.setItem('superadmin_token', activeToken);
 localStorage.setItem('sinco_token', data.token);
 localStorage.setItem('sinco_user', JSON.stringify(userData));

 addToast({ type: 'success', message: `Conectando ao ambiente ${tenant.nome_cliente}...` });
 setTimeout(() => { window.location.href = '/dashboard'; }, 800);
 } else {
 addToast({ type: 'error', message: data.message || 'Erro ao trocar banco.' });
 }
 } catch {
 console.error('[SuperAdmin] Error switching tenant:', error);
 addToast({ type: 'error', message: 'Erro de conexão ao trocar banco.' });
 } finally {
 setLoading(false);
 }
 };


 // --- SCHEMA COMPARE HANDLERS ---
 const handleCompareSchema = async () => {
 const token = localStorage.getItem('superadmin_token');
 if (!token || !sourceDbId || !destDbId) return;

 setComparing(true);
 setHasCompared(false);
 setSchemaActions([]);

 try {
 const res = await fetch('/api/admin/schema/compare', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ sourceDbId, destDbId })
 });
 const data = await res.json();
 if (data.success) {
 setSchemaActions(data.actions);
 setHasCompared(true);
 if (data.actions.length === 0) {
 addToast({ type: 'success', message: 'Estruturas idênticas! Nenhuma ação necessária.' });
 }
 } else {
 addToast({ type: 'error', message: data.message });
 }
 } catch {
 addToast({ type: 'error', message: 'Erro ao comparar schemas' });
 } finally {
 setComparing(false);
 }
 };

 const handleSyncSchema = async (onlySelected = true) => {
 const token = localStorage.getItem('superadmin_token');
 if (!token || !destDbId) return;
 const toRun = onlySelected && selectedActions.size > 0
 ? schemaActions.filter((_: Record<string, unknown>, i: number) => selectedActions.has(i))
 : [...schemaActions];
 if (!toRun.length) { addToast({ type: 'error', message: 'Nenhuma divergência selecionada' }); return; }
 if (!confirm('Executar ' + toRun.length + ' alteração(ões)? Erros SQL serão ignorados e listados.')) return;
 setSyncing(true); setSyncResults([]);
 try {
 const srcTenant = tenants.find((t: Record<string, unknown>) => t.id === sourceDbId);
 const res = await fetch('/api/admin/schema/sync', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
 body: JSON.stringify({ destDbId, actions: toRun, sourceDbName: srcTenant?.db_name || 'origem' })
 });
 const data = await res.json();
 if (data.success) {
 setSyncResults(data.results || []);
 const ok = (data.results || []).filter((r: Record<string, unknown>) => r.status === 'ok').length;
 const err = (data.results || []).filter((r: Record<string, unknown>) => r.status === 'erro').length;
 addToast({ type: err > 0 ? 'error' : 'success', message: ok + ' executado(s) · ' + err + ' com erro(s)' });
 const runSet = new Set(toRun.map((a: Record<string, unknown>) => a.sql));
 setSchemaActions((prev: Record<string, unknown>[]) => prev.filter((a: Record<string, unknown>) => !runSet.has(a.sql)));
 setSelectedActions(new Set());
 } else { addToast({ type: 'error', message: data.message }); }
 } catch { addToast({ type: 'error', message: 'Erro ao sincronizar schema' }); }
 finally { setSyncing(false); }
 };

 const fetchHistory = async () => {
 const token = localStorage.getItem('superadmin_token');
 const dest = tenants.find((t: Record<string, unknown>) => t.id === destDbId);
 try {
 const res = await fetch('/api/admin/schema/history?banco=' + (dest?.db_name || '') + '&limit=100',
 { headers: { 'Authorization': 'Bearer ' + token } });
 const data = await res.json();
 if (data.success) { setHistory(data.data); setShowHistory(true); }
 } catch { addToast({ type: 'error', message: 'Erro ao buscar histórico' }); }
 };

 const toggleSelectAll = () => {
 if (selectedActions.size === schemaActions.length) setSelectedActions(new Set());
 else setSelectedActions(new Set(schemaActions.map((_: Record<string, unknown>, i: number) => i)));
 };

 // --- DB CONFIG HANDLERS ---
 const handleTestConnection = async () => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 setLoading(true);
 try {
 const res = await fetch('/api/admin/db/test', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify(dbConfig)
 });
 const data = await res.json();
 if (data.success) addToast({ type: 'success', message: data.message });
 else addToast({ type: 'error', message: data.message });
 } catch { addToast({ type: 'error', message: 'Erro ao testar conexão' }); } finally { setLoading(false); }
 };

 const handleSaveConfig = async () => {
 const token = localStorage.getItem('superadmin_token');
 if (!token) return;
 if (!confirm('Tem certeza? Isso irá alterar a conexão do banco de dados e aplicar as novas configurações.')) return;
 setLoading(true);
 try {
 const res = await fetch('/api/admin/db/save', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
 body: JSON.stringify(dbConfig)
 });
 const data = await res.json();
 if (data.success) addToast({ type: 'success', message: data.message });
 else addToast({ type: 'error', message: data.message });
 } catch { addToast({ type: 'error', message: 'Erro ao salvar configuração' }); } finally { setLoading(false); }
 };

 if (!isAuthenticated) {
 return (
 <div className="flex items-center justify-center min-h-[60vh] h-full flex flex-col min-h-0">
 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md p-8 bg-white rounded-md shadow-xl border border-gray-100">
 <div className="flex flex-col items-center mb-6">
 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><ShieldCheck size={32} /></div>
 
 <p className="text-gray-500 text-xs">Área restrita para gerenciamento do sistema</p>
 </div>
 <form onSubmit={handleLogin} className="space-y-4">
 <div><label className="block text-xs font-medium text-gray-700 mb-1">Usuário</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-2 py-1 border rounded-lg" /></div>
 <div><label className="block text-xs font-medium text-gray-700 mb-1">Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-2 py-1 border rounded-lg" /></div>
 <button type="submit" disabled={loading} className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold flex justify-center items-center gap-2">{loading ? <RefreshCcw className="animate-spin" size={20} /> : 'Entrar no Painel'}</button>

 <button
 type="button"
 onClick={() => window.location.href = '/dashboard'}
 className="w-full py-3 mt-2 bg-gray-100 text-gray-700 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors"
 >
 <ArrowRight className="rotate-180" size={20} /> Voltar para o Sistema
 </button>

 <button
 type="button"
 onClick={async () => {
 if (confirm('Deseja realmente fechar a aplicação e encerrar os servidores?')) {
 try {
 await fetch('/api/admin/shutdown', { method: 'POST' });
 } catch {
 console.error('Erro ao encerrar servidor:', e);
 }
 window.close();
 // Fallback if window.close() is blocked
 setTimeout(() => window.location.href = 'about:blank', 500);
 }
 }}
 className="w-full py-3 mt-2 border border-red-200 text-red-600 rounded-lg font-semibold flex justify-center items-center gap-2 hover:bg-red-50 transition-colors"
 >
 <XCircle size={20} /> Sair / Fechar App
 </button>
 </form>
 </motion.div>
 </div>
 );
 }

 return (
 <div className="space-y-4 w-full h-full overflow-y-auto max-w-[1920px] mx-auto pb-20 px-2 md:px-4">
 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-md p-5 text-white shadow-xl relative overflow-hidden shrink-0 mt-2">
 <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
 <div className="relative z-10 flex justify-between items-center">
 <div>
 
 <p className="text-gray-400 mt-2">Gerenciamento Multi-Tenant e Configurações</p>
 </div>
 <button
 onClick={() => {
 if (confirm('Deseja sair do Painel Superadmin?')) {
 setIsAuthenticated(false);
 localStorage.removeItem('superadmin_token');
 localStorage.removeItem('superadmin_active_session');
 window.location.href = '/';
 }
 }}
 className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors border border-red-600/30"
 >
 <LogOut size={15} /> Sair do Painel
 </button>
 </div>
 </motion.div>

 {/* Tabs */}
 <div className="flex space-x-1 bg-gray-100 p-1 rounded-md overflow-x-auto">
 <button onClick={() => setActiveTab('tenants')} className={`flex-1 min-w-[150px] py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'tenants' ? 'bg-white text-[#32423D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 <div className="flex items-center justify-center gap-2"><Server size={14} /> Gestão de Bancos</div>
 </button>
 <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[150px] py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-[#32423D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 <div className="flex items-center justify-center gap-2"><Users size={14} /> Usuários Globais</div>
 </button>
 <button onClick={() => setActiveTab('schema')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'schema' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 <div className="flex items-center justify-center gap-2"><GitCompare size={14} /> Comparação de Estrutura</div>
 </button>
 <button onClick={() => setActiveTab('config')} className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'config' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 <div className="flex items-center justify-center gap-2"><Database size={14} /> ConfigLocal (Fallback)</div>
 </button>
 <button onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }} className={`flex-1 min-w-[130px] py-2.5 text-xs font-medium rounded-lg transition-all ${activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
 <div className="flex items-center justify-center gap-2"><Monitor size={14} /> Acessos ao Sistema</div>
 </button>
 </div>

 {activeTab === 'tenants' && (
 <div className="space-y-4 animate-fade-in">
 {/* Add Tenant Form */}
 <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
 <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-800"><Plus size={15} className="text-[#32423D]" /> Cadastrar Novo Banco de Cliente</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <input placeholder="Nome do Cliente" className="border p-2 rounded" value={newTenant.nome_cliente} onChange={e => setNewTenant({ ...newTenant, nome_cliente: e.target.value })} />
 <input placeholder="Host" className="border p-2 rounded" value={newTenant.db_host} onChange={e => setNewTenant({ ...newTenant, db_host: e.target.value })} />
 <input placeholder="Banco" className="border p-2 rounded" value={newTenant.db_name} onChange={e => setNewTenant({ ...newTenant, db_name: e.target.value })} />
 <input placeholder="Usuário" className="border p-2 rounded" value={newTenant.db_user} onChange={e => setNewTenant({ ...newTenant, db_user: e.target.value })} />
 <input placeholder="Senha" type="password" className="border p-2 rounded" value={newTenant.db_pass} onChange={e => setNewTenant({ ...newTenant, db_pass: e.target.value })} />
 <input placeholder="Cópia Banco Dados (Backup)" className="border p-2 rounded" value={newTenant.copia_banco_dados} onChange={e => setNewTenant({ ...newTenant, copia_banco_dados: e.target.value })} />
 <button onClick={handleAddTenant} disabled={loading} className="bg-[#32423D] text-white p-2 rounded hover:bg-[#32423D]/80 flex items-center justify-center gap-2 md:col-span-3 lg:col-span-1"><Save size={14} /> Cadastrar</button>
 </div>
 </div>
 
 {/* Search + Bulk Actions */}
 <div className="flex items-center gap-3 mb-4">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
 <input
 type="search"
 placeholder="Pesquisar banco de dados..."
 value={tenantSearch}
 onChange={(e) => setTenantSearch(e.target.value)}
 className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] transition-all"
 />
 {tenantSearch && (
 <button onClick={() => setTenantSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
 <X size={14} />
 </button>
 )}
 </div>
 {tenantSearch && (
 <span className="text-xs text-gray-500 font-medium">
 {tenants.filter(t =>
 t.nome_cliente.toLowerCase().includes(tenantSearch.toLowerCase()) ||
 t.db_name.toLowerCase().includes(tenantSearch.toLowerCase())
 ).length} resultado(s)
 </span>
 )}
 <div className="ml-auto">
 <button
 onClick={handleSyncAllUsers}
 disabled={loading}
 className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2 shadow-sm transition-colors text-xs"
 >
 {loading ? <RefreshCcw className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
 {loading ? 'Sincronizando...' : 'Sincronizar Todos'}
 </button>
 </div>
 </div>

 {/* Tenant List */}
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
 {tenants
 .filter(t =>
 !tenantSearch ||
 t.nome_cliente.toLowerCase().includes(tenantSearch.toLowerCase()) ||
 t.db_name.toLowerCase().includes(tenantSearch.toLowerCase())
 )
 .map(tenant => (
 <motion.div key={tenant.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:border-blue-300 transition-colors flex flex-col">
 <div className="flex justify-between items-start mb-2">
 <div className="p-1.5 bg-[#E0E800]/20 rounded-md"><Server className="text-[#32423D]" size={20} /></div>
 <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tenant.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tenant.ativo ? 'ATIVO' : 'INATIVO'}</span>
 </div>
 <h4 className="font-bold text-base text-gray-800 truncate">{tenant.nome_cliente}</h4>
 <p className="text-gray-500 text-[10px] mb-1 font-mono truncate">{tenant.db_host} / {tenant.db_name}</p>
 {tenant.copia_banco_dados && (
 <p className="text-[#32423D] text-[10px] italic truncate mb-2" title={tenant.copia_banco_dados}>
 Backup: {tenant.copia_banco_dados}
 </p>
 )}
 <div className="mt-auto pt-3 space-y-1.5">
 <button onClick={() => handleAccessTenant(tenant)} className="w-full py-1.5 text-xs bg-[#32423D] hover:bg-[#32423D]/80 text-white rounded-md flex items-center justify-center gap-1.5 transition-colors font-medium shadow-sm"><ArrowRight size={14} /> Acessar</button>
 <button onClick={() => handleToggleTenantStatus(tenant)} disabled={loading} className={`w-full py-1.5 text-xs ${tenant.ativo ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-100' : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-100'} rounded-md flex items-center justify-center gap-1.5 transition-colors font-medium`}><ShieldCheck size={14} /> {tenant.ativo ? 'Desativar' : 'Ativar'}</button>
 <button onClick={() => handleSyncUsers(tenant.id)} disabled={loading} className="w-full py-1.5 text-xs bg-white hover:bg-gray-50 text-gray-700 rounded-md border border-gray-200 flex items-center justify-center gap-1.5 transition-colors"><Users size={14} /> {loading ? 'Sincronizando...' : 'Usuários'}</button>
 </div>
 </motion.div>
 ))}
 </div>
 </div>
 )
 }

 {
 activeTab === 'users' && (
 <div className="space-y-6 animate-fade-in bg-white p-6 rounded-md shadow-sm border border-gray-200">
 <h3 className="text-lg font-semibold mb-4 text-gray-800">Usuários Globais (Centralizados)</h3>
 
 <div className="flex flex-col sm:flex-row gap-4 mb-4">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
 <input type="text" placeholder="Filtrar por Login..." value={userSearchLogin} onChange={(e) => setUserSearchLogin(e.target.value)} className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D]" />
 {userSearchLogin && (
 <button onClick={() => setUserSearchLogin('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
 <X size={14} />
 </button>
 )}
 </div>
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
 <input type="text" placeholder="Filtrar por Tenant (Banco)..." value={userSearchTenant} onChange={(e) => setUserSearchTenant(e.target.value)} className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D]" />
 {userSearchTenant && (
 <button onClick={() => setUserSearchTenant('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
 <X size={14} />
 </button>
 )}
 </div>
 </div>

 <div className="overflow-auto flex-1">
 <table className="w-full text-xs text-left text-gray-500">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white text-xs text-white uppercase bg-[#567469]">
 <tr>
 
 <th className="px-4 py-1.5">Login</th>
 <th className="px-4 py-1.5">Superadmin</th>
 <th className="px-4 py-1.5">Tenant (Vínculo)</th>
 <th className="px-4 py-1.5">Ações</th>
 </tr>
 </thead>
 <tbody>
 {users.filter(user => {
 const loginStr = String(user.login || '').toLowerCase();
 const tenantStr = user.id_conexao_banco ? `${user.nome_cliente} ${user.db_name}`.toLowerCase() : 'global';
 const matchesLogin = !userSearchLogin || loginStr.includes(userSearchLogin.toLowerCase());
 const matchesTenant = !userSearchTenant || tenantStr.includes(userSearchTenant.toLowerCase());
 return matchesLogin && matchesTenant;
 }).map(user => (
 <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
 
 <td className="px-2 py-1 font-medium text-gray-900">{user.login}</td>
 <td className="px-2 py-1">
 <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.superadmin === 'S' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
 {user.superadmin === 'S' ? 'SIM' : 'NÃO'}
 </span>
 </td>
 <td className="px-2 py-1">
 {user.id_conexao_banco ? (
 <span className="text-[#32423D]">{user.nome_cliente} ({user.db_name})</span>
 ) : (
 <span className="text-gray-400 italic">Global (Sem Vínculo)</span>
 )}
 </td>
 <td className="px-2 py-1">
 <button
 onClick={() => handleToggleSuperadmin(user.id, user.superadmin)}
 className={`font-medium hover:underline ${user.superadmin === 'S' ? 'text-red-600' : 'text-[#32423D]'}`}
 >
 {user.superadmin === 'S' ? 'Remover Superadmin' : 'Tornar Superadmin'}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )
 }

 {
 activeTab === 'schema' && (
 <div className="space-y-6 animate-fade-in">
 <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
 <div className="flex flex-col md:flex-row items-center gap-4">
 <div className="flex-1 w-full">
 <label className="block text-xs font-medium text-gray-700 mb-1">Banco de Origem (Referência)</label>
 <select
 className="w-full p-2.5 border rounded-lg bg-gray-50"
 value={sourceDbId}
 onChange={(e) => setSourceDbId(Number(e.target.value))}
 >
 <option value="">Selecione a Origem...</option>
 {tenants.map(t => (
 <option key={t.id} value={t.id} disabled={t.id === destDbId}>{t.nome_cliente} ({t.db_name})</option>
 ))}
 </select>
 </div>
 <div className="text-gray-400 hidden md:block pt-6"><ArrowRight /></div>
 <div className="flex-1 w-full">
 <label className="block text-xs font-medium text-gray-700 mb-1">Banco de Destino (Cliente)</label>
 <select
 className="w-full p-2.5 border rounded-lg bg-purple-50 border-purple-100"
 value={destDbId}
 onChange={(e) => setDestDbId(Number(e.target.value))}
 >
 <option value="">Selecione o Destino...</option>
 {tenants.map(t => (
 <option key={t.id} value={t.id} disabled={t.id === sourceDbId}>{t.nome_cliente} ({t.db_name})</option>
 ))}
 </select>
 </div>
 <div className="pt-6">
 <button
 onClick={handleCompareSchema}
 disabled={!sourceDbId || !destDbId || sourceDbId === destDbId || comparing}
 className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-md shadow-purple-200"
 >
 {comparing ? <RefreshCcw className="animate-spin" size={15} /> : <GitCompare size={15} />}
 Comparar
 </button>
 </div>
 </div>
 </div>

 {hasCompared && (
 <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
 <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap justify-between items-center gap-2">
 <h3 className="font-bold text-gray-800 flex items-center gap-2">
 {schemaActions.length > 0
 ? <span className="text-amber-600 flex items-center gap-2"><AlertTriangle size={15}/> Divergências ({schemaActions.length}) · Sel.: {selectedActions.size}</span>
 : <span className="text-green-600 flex items-center gap-2"><CheckCircle size={15}/> Idênticos</span>}
 </h3>
 {schemaActions.length > 0 && (
 <div className="flex items-center gap-2 flex-wrap">
 <button onClick={fetchHistory} className="px-2 py-0.5 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-1"><Database size={13}/> Histórico</button>
 <button onClick={toggleSelectAll} className="px-2 py-0.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
 {selectedActions.size === schemaActions.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
 </button>
 <button onClick={() => handleSyncSchema(true)} disabled={syncing || selectedActions.size === 0}
 className="px-2 py-1 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
 <RefreshCcw size={15} className={syncing ? 'animate-spin' : ''}/>
 {syncing ? 'Executando...' : 'Executar Sel. (' + selectedActions.size + ')'}
 </button>
 <button onClick={() => handleSyncSchema(false)} disabled={syncing}
 className="px-2 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
 Todos ({schemaActions.length})
 </button>
 </div>
 )}
 </div>

 {schemaActions.length > 0 && (
 <div className="divide-y divide-gray-100 max-h-[45vh] overflow-y-auto">
 {schemaActions.map((action: Record<string, unknown>, idx: number) => (
 <div key={idx} className={'p-3 hover:bg-gray-50 ' + (selectedActions.has(idx) ? 'bg-blue-50/40' : '')}>
 <div className="flex items-start gap-3">
 <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
 checked={selectedActions.has(idx)}
 onChange={() => { const s = new Set(selectedActions); if (s.has(idx)) { s.delete(idx); } else { s.add(idx); } setSelectedActions(s); }}
 />
 <div className={'p-1.5 rounded-lg shrink-0 ' + (action.type === 'create_table' ? 'bg-[#E0E800]/40 text-[#32423D]' : 'bg-amber-100 text-amber-700')}>
 {action.type === 'create_table' ? <Database size={15}/> : <Code size={15}/>}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-xs">
 {action.description}
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono shrink-0">{action.type}</span>
 </h4>
 <div className="mt-1 bg-gray-900 rounded p-2 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre">{action.sql}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {syncResults.length > 0 && (
 <div className="border-t border-gray-200 p-4 bg-gray-50">
 <h4 className="font-bold text-gray-700 mb-2 text-xs flex items-center gap-2"><CheckCircle size={15}/> Relatório de Execução</h4>
 <div className="space-y-1 max-h-48 overflow-y-auto">
 {syncResults.map((r: Record<string, unknown>, i: number) => (
 <div key={i} className={'flex items-start gap-2 text-xs rounded px-2 py-0.5 ' + (r.status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
 {r.status === 'ok' ? <CheckCircle size={12} className="shrink-0 mt-0.5"/> : <XCircle size={12} className="shrink-0 mt-0.5"/>}
 <div className="min-w-0">
 <div className="font-semibold truncate">{r.description}</div>
 {r.error && <div className="text-red-600 text-[10px] mt-0.5">{r.error}</div>}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {schemaActions.length === 0 && syncResults.length === 0 && (
 <div className="p-10 text-center text-gray-400 flex flex-col items-center">
 <CheckCircle size={40} className="text-green-100 mb-3"/>
 <p>Banco de destino já está sincronizado com a origem.</p>
 </div>
 )}
 </div>
 )}

 {showHistory && (
 <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
 <div className="p-4 border-b flex justify-between items-center bg-gray-50">
 <h3 className="font-bold text-gray-800 flex items-center gap-2 text-xs"><Database size={14}/> Histórico de Sincronizações</h3>
 <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-700"><XCircle size={15}/></button>
 </div>
 <div className="overflow-x-auto max-h-64">
 <table className="w-full text-xs">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white uppercase text-[10px]">
 <tr>
 <th className="px-2 py-1 text-left">Data</th>
 <th className="px-2 py-1 text-left">Usuário</th>
 <th className="px-2 py-1 text-left">Destino</th>
 <th className="px-2 py-1 text-left">Tipo</th>
 <th className="px-2 py-1 text-left">Status</th>
 <th className="px-2 py-1 text-left">Descrição</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {history.map((h: Record<string, unknown>) => (
 <tr key={h.id} className="hover:bg-gray-50">
 <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{new Date(h.data_execucao).toLocaleString('pt-BR')}</td>
 <td className="px-2 py-1 font-medium">{h.usuario}</td>
 <td className="px-2 py-1 font-mono">{h.banco_destino}</td>
 <td className="px-2 py-1 text-gray-500">{h.tipo_acao}</td>
 <td className="px-2 py-1">
 <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold ' + (h.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{h.status.toUpperCase()}</span>
 </td>
 <td className="px-2 py-1 max-w-xs truncate text-gray-600" title={h.descricao}>{h.descricao}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )
 }

 {
 activeTab === 'config' && (
 <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 animate-fade-in">
 <p className="text-gray-500 mb-4">Configuração local usada apenas se a autenticação central falhar.</p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div><label>Host</label><input className="border w-full p-2 rounded" value={dbConfig.host} onChange={e => setDbConfig({ ...dbConfig, host: e.target.value })} /></div>
 <div><label>User</label><input className="border w-full p-2 rounded" value={dbConfig.user} onChange={e => setDbConfig({ ...dbConfig, user: e.target.value })} /></div>
 </div>
 <div className="space-y-4">
 <div><label>Database</label><input className="border w-full p-2 rounded" value={dbConfig.database} onChange={e => setDbConfig({ ...dbConfig, database: e.target.value })} /></div>
 <div><label>Password</label><input type="password" className="border w-full p-2 rounded" value={dbConfig.password} onChange={e => setDbConfig({ ...dbConfig, password: e.target.value })} /></div>
 </div>
 </div>
 <div className="mt-6 flex justify-end gap-3">
 <button onClick={handleTestConnection} disabled={loading} className="px-6 py-2 border rounded hover:bg-gray-50">Testar</button>
 <button onClick={handleSaveConfig} disabled={loading} className="px-6 py-2 bg-[#32423D] text-white rounded hover:bg-[#32423D]/80">Salvar</button>
 </div>
 </div>
 )
 }
 {
 activeTab === 'audit' && (
 <div className="space-y-4 animate-fade-in">
 {/* Header */}
 <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <Monitor size={15} className="text-blue-600" />
 <h3 className="font-semibold text-gray-800">Acessos ao Sistema</h3>
 <span className="text-xs text-gray-400 ml-1">— apenas informativo, registros &gt;24h podem ser excluídos</span>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <select
 value={auditHoras}
 onChange={e => { const h = Number(e.target.value); setAuditHoras(h); fetchAuditLogs(h); }}
 className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
 >
 <option value={1}>Última 1h</option>
 <option value={6}>Últimas 6h</option>
 <option value={12}>Últimas 12h</option>
 <option value={24}>Últimas 24h</option>
 <option value={48}>Últimas 48h</option>
 <option value={168}>Últimos 7 dias</option>
 </select>
 <button
 onClick={() => fetchAuditLogs()}
 disabled={loadingAudit}
 className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
 >
 <RefreshCcw size={13} className={loadingAudit ? 'animate-spin' : ''} /> Atualizar
 </button>
 <button
 onClick={handleCleanAudit}
 className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
 >
 <Trash2 size={13} /> Limpar &gt;24h
 </button>
 </div>
 </div>
 </div>

 {/* Tabela */}
 <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
 {loadingAudit ? (
 <div className="p-12 flex items-center justify-center gap-3 text-gray-400">
 <RefreshCcw size={20} className="animate-spin" />
 <span className="text-xs">Carregando registros...</span>
 </div>
 ) : auditLogs.length === 0 ? (
 <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
 <Monitor size={36} strokeWidth={1.5} />
 <p className="text-xs">Nenhum acesso registrado no período</p>
 </div>
 ) : (
 <div className="overflow-auto">
 <div className="px-2 py-1 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
 {auditLogs.length} registro(s) encontrado(s)
 </div>
 <table className="w-full">
 <thead className="bg-[#567469] text-white">
 <tr>
 <th className="px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider">Data / Hora</th>
 <th className="px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider">Usuário</th>
 <th className="px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider">Empresa</th>
 <th className="px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider">Banco</th>
 <th className="px-2 py-1 text-left text-[9px] font-semibold uppercase tracking-wider">IP</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {auditLogs.map((log: Record<string, unknown>) => (
 <motion.tr
 key={log.id}
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="hover:bg-blue-50/30 transition-colors"
 >
 <td className="px-2 py-0.5">
 <span className="text-[11px] text-gray-700 font-mono whitespace-nowrap">
 {new Date(log.data_acesso).toLocaleString('pt-BR')}
 </span>
 </td>
 <td className="px-2 py-0.5">
 <span className="text-[11px] font-semibold text-[#32423D]">{log.login}</span>
 </td>
 <td className="px-2 py-0.5">
 <span className="text-[11px] text-gray-600">{log.client_name || '—'}</span>
 </td>
 <td className="px-2 py-0.5">
 <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{log.db_name || '—'}</span>
 </td>
 <td className="px-2 py-0.5">
 <span className="text-[10px] text-gray-400 font-mono">{log.ip_address || '—'}</span>
 </td>
 </motion.tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )
 }
 </div >
 );
}
