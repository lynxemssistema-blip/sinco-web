import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Save, AlertTriangle, ShieldCheck, RefreshCcw, Server, Users, Plus, GitCompare, ArrowRight, CheckCircle, Code, LogOut, XCircle, Building2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import MatrizAdmin from './MatrizAdmin';

interface SuperadminPageProps {
    defaultTab?: 'config' | 'tenants' | 'schema' | 'users' | 'matrizes';
}

export default function SuperadminPage({ defaultTab = 'matrizes' }: SuperadminPageProps) {
    const { addToast } = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'tenants' | 'schema' | 'users' | 'matrizes'>(defaultTab);

    // Auth State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // DB Config State (Single Tenant / Local Fallback)
    const [dbConfig, setDbConfig] = useState({
        host: '', user: '', password: '', database: '', port: 3306
    });

    // Tenant Management State
    const [tenants, setTenants] = useState<any[]>([]);
    const [newTenant, setNewTenant] = useState({
        nome_cliente: '', db_host: '', db_user: '', db_pass: '', db_name: '', db_port: 3306
    });

    // Schema Compare State
    const [sourceDbId, setSourceDbId] = useState<number | ''>('');
    const [destDbId, setDestDbId] = useState<number | ''>('');
    const [schemaActions, setSchemaActions] = useState<any[]>([]);
    const [comparing, setComparing] = useState(false);
    const [hasCompared, setHasCompared] = useState(false);

    // Users State
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('superadmin_token');
        if (token) {
            checkAuth(token);
        }
    }, []);

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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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
            } else {
                addToast({ type: 'error', message: data.message || 'Credenciais inválidas no banco de dados' });
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao realizar login' });
        } finally {
            setLoading(false);
        }
    };

    // --- TENANT MANAGEMENT HANDLERS ---
    const handleAddTenant = async () => { /* ... existing ... */
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
                setNewTenant({ nome_cliente: '', db_host: '', db_user: '', db_pass: '', db_name: '', db_port: 3306 });
                fetchTenants(token);
            } else {
                addToast({ type: 'error', message: data.message });
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao criar banco' });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncUsers = async (dbId: number) => { /* ... existing ... */
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
            } else {
                addToast({ type: 'error', message: data.message });
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao sincronizar usuários' });
        } finally {
            setLoading(false);
        }
    };

    // Access Tenant Handler
    const handleAccessTenant = async (tenant: any) => {
        if (!confirm(`Deseja acessar o sistema no ambiente: ${tenant.nome_cliente}?`)) return;

        const superToken = localStorage.getItem('superadmin_token');
        if (!superToken) return;

        setLoading(true);
        try {
            const res = await fetch('/api/admin/impersonate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${superToken}`
                },
                body: JSON.stringify({ dbName: tenant.db_name })
            });

            const data = await res.json();
            if (data.success) {
                const userData = {
                    id: 1, // Defaulting to 1 for superadmin impersonation
                    nome: 'Superadmin',
                    login: 'superadmin',
                    role: 'admin',
                    isSuperadmin: true,
                    clientName: tenant.nome_cliente,
                    dbName: tenant.db_name,
                    dbHost: tenant.db_host,
                    dbUser: tenant.db_user,
                    dbPass: tenant.db_pass,
                    dbPort: tenant.db_port,
                    originalLogin: username || 'superadmin'
                };

                localStorage.setItem('sinco_token', data.token);
                localStorage.setItem('sinco_user', JSON.stringify(userData));
                // Explicitly saving superadmin status as requested
                localStorage.setItem('original_superadmin', JSON.stringify({
                    active: true,
                    originalLogin: username || 'superadmin',
                    token: superToken
                }));

                // Toast and reload
                addToast({ type: 'success', message: `Conectando ao ambiente ${tenant.nome_cliente}...` });

                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                addToast({ type: 'error', message: data.message || 'Erro ao gerar token de ambiente' });
            }
        } catch (error) {
            console.error('Error in impersonation:', error);
            addToast({ type: 'error', message: 'Erro ao conectar ao ambiente' });
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
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao comparar schemas' });
        } finally {
            setComparing(false);
        }
    };

    const handleSyncSchema = async () => {
        const token = localStorage.getItem('superadmin_token');
        if (!token || !destDbId || schemaActions.length === 0) return;

        if (!confirm(`Confirmar execução de ${schemaActions.length} alterações no banco de destino?`)) return;

        setLoading(true);
        try {
            const sqlStatements = schemaActions.map(a => a.sql);
            const res = await fetch('/api/admin/schema/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ destDbId, sqlStatements })
            });
            const data = await res.json();
            if (data.success) {
                addToast({ type: 'success', message: data.message });
                setSchemaActions([]);
                setHasCompared(false);
            } else {
                addToast({ type: 'error', message: data.message });
            }
        } catch (error) {
            addToast({ type: 'error', message: 'Erro ao sincronizar schema' });
        } finally {
            setLoading(false);
        }
    };

    // --- DB CONFIG HANDLERS ---
    const handleTestConnection = async () => { /* ... existing ... */
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
        } catch (error) { addToast({ type: 'error', message: 'Erro ao testar conexão' }); } finally { setLoading(false); }
    };

    const handleSaveConfig = async () => { /* ... existing ... */
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
        } catch (error) { addToast({ type: 'error', message: 'Erro ao salvar configuração' }); } finally { setLoading(false); }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600"><ShieldCheck size={32} /></div>
                        <h1 className="text-2xl font-bold text-gray-800">Acesso Superadmin</h1>
                        <p className="text-gray-500 text-sm">Área restrita para gerenciamento do sistema</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
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
                                    } catch (e) {
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
        <div className="space-y-6 w-full max-w-[1920px] mx-auto pb-20">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ShieldCheck className="text-red-500" size={32} />
                            Painel Superadmin
                        </h1>
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
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors border border-red-600/30"
                    >
                        <LogOut size={18} /> Sair do Painel
                    </button>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                <button onClick={() => setActiveTab('matrizes')} className={`flex-1 min-w-[150px] py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'matrizes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center justify-center gap-2"><Building2 size={16} /> Matrizes</div>
                </button>
                <button onClick={() => setActiveTab('tenants')} className={`flex-1 min-w-[150px] py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'tenants' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center justify-center gap-2"><Server size={16} /> Gestão de Bancos</div>
                </button>
                <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[150px] py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center justify-center gap-2"><Users size={16} /> Usuários Globais</div>
                </button>
                <button onClick={() => setActiveTab('schema')} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'schema' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center justify-center gap-2"><GitCompare size={16} /> Comparação de Estrutura</div>
                </button>
                <button onClick={() => setActiveTab('config')} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'config' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    <div className="flex items-center justify-center gap-2"><Database size={16} /> ConfigLocal (Fallback)</div>
                </button>
            </div>

            {activeTab === 'matrizes' && (
                <div className="animate-fade-in bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <MatrizAdmin />
                </div>
            )}

            {activeTab === 'tenants' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Add Tenant Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800"><Plus size={20} className="text-blue-500" /> Cadastrar Novo Banco de Cliente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input placeholder="Nome do Cliente" className="border p-2 rounded" value={newTenant.nome_cliente} onChange={e => setNewTenant({ ...newTenant, nome_cliente: e.target.value })} />
                            <input placeholder="Host" className="border p-2 rounded" value={newTenant.db_host} onChange={e => setNewTenant({ ...newTenant, db_host: e.target.value })} />
                            <input placeholder="Banco" className="border p-2 rounded" value={newTenant.db_name} onChange={e => setNewTenant({ ...newTenant, db_name: e.target.value })} />
                            <input placeholder="Usuário" className="border p-2 rounded" value={newTenant.db_user} onChange={e => setNewTenant({ ...newTenant, db_user: e.target.value })} />
                            <input placeholder="Senha" type="password" className="border p-2 rounded" value={newTenant.db_pass} onChange={e => setNewTenant({ ...newTenant, db_pass: e.target.value })} />
                            <button onClick={handleAddTenant} disabled={loading} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={16} /> Cadastrar</button>
                        </div>
                    </div>
                    {/* Tenant List */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tenants.map(tenant => (
                            <motion.div key={tenant.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2 bg-blue-50 rounded-lg"><Server className="text-blue-600" size={24} /></div>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${tenant.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tenant.ativo ? 'ATIVO' : 'INATIVO'}</span>
                                </div>
                                <h4 className="font-bold text-lg text-gray-800">{tenant.nome_cliente}</h4>
                                <p className="text-gray-500 text-sm mb-4">{tenant.db_host} / {tenant.db_name}</p>
                                <div className="space-y-2 mt-4">
                                    <button onClick={() => handleAccessTenant(tenant)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium shadow-sm"><ArrowRight size={16} /> Acessar Banco</button>
                                    <button onClick={() => handleSyncUsers(tenant.id)} disabled={loading} className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 flex items-center justify-center gap-2 transition-colors"><Users size={16} /> {loading ? 'Sincronizando...' : 'Sincronizar Usuários'}</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )
            }

            {
                activeTab === 'users' && (
                    <div className="space-y-6 animate-fade-in bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Usuários Globais (Centralizados)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">ID</th>
                                        <th className="px-6 py-3">Login</th>
                                        <th className="px-6 py-3">Superadmin</th>
                                        <th className="px-6 py-3">Tenant (Vínculo)</th>
                                        <th className="px-6 py-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{user.id}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{user.login}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.superadmin === 'S' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {user.superadmin === 'S' ? 'SIM' : 'NÃO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.id_conexao_banco ? (
                                                    <span className="text-blue-600">{user.nome_cliente} ({user.db_name})</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Global (Sem Vínculo)</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleSuperadmin(user.id, user.superadmin)}
                                                    className={`font-medium hover:underline ${user.superadmin === 'S' ? 'text-red-600' : 'text-blue-600'}`}
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
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco de Origem (Referência)</label>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Banco de Destino (Cliente)</label>
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
                                        {comparing ? <RefreshCcw className="animate-spin" size={18} /> : <GitCompare size={18} />}
                                        Comparar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {hasCompared && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        {schemaActions.length > 0 ? (
                                            <span className="text-amber-600 flex items-center gap-2"><AlertTriangle size={18} /> Divergências Encontradas ({schemaActions.length})</span>
                                        ) : (
                                            <span className="text-green-600 flex items-center gap-2"><CheckCircle size={18} /> Estruturas Idênticas</span>
                                        )}
                                    </h3>
                                    {schemaActions.length > 0 && (
                                        <button
                                            onClick={handleSyncSchema}
                                            disabled={loading}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 shadow-md shadow-green-200"
                                        >
                                            <RefreshCcw size={18} /> Sincronizar Agora
                                        </button>
                                    )}
                                </div>

                                {schemaActions.length > 0 && (
                                    <div className="divide-y divide-gray-100">
                                        {schemaActions.map((action, idx) => (
                                            <div key={idx} className="p-4 hover:bg-gray-50 group">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${action.type === 'create_table' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {action.type === 'create_table' ? <Database size={18} /> : <Code size={18} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                                            {action.description}
                                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">{action.type}</span>
                                                        </h4>
                                                        <div className="mt-2 bg-gray-900 rounded p-3 text-xs text-gray-300 font-mono overflow-x-auto">
                                                            {action.sql}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {schemaActions.length === 0 && (
                                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                        <CheckCircle size={48} className="text-green-100 mb-4" />
                                        <p>O banco de destino já possui todas as tabelas e colunas do banco de origem.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            {
                activeTab === 'config' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in">
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
                            <button onClick={handleSaveConfig} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
