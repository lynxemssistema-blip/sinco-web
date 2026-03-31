import React, { useState, useEffect } from 'react';
import { Shield, Save, Lock, User, Settings2, CheckCircle, Menu, Trash2, ChevronUp, ChevronDown, ChevronRight, Edit2, FolderPlus, X, ChevronLeft, Eye, EyeOff, Database, Server, ArrowRight, List } from 'lucide-react';
import { iconMap } from '../utils/iconMap';
import type { MenuItem } from '../utils/iconMap';
import { useToast } from '../contexts/ToastContext';
import { useAppConfig, saveLocalPrefs } from '../contexts/AppConfigContext';
import { defaultMenuItems } from '../utils/constants';

const API_BASE = '/api';

export default function ConfiguracaoPage() {
    const { addToast } = useToast();
    const { refetchConfig } = useAppConfig();
    const [isAdmin, setIsAdmin] = useState(false);
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [activeTab, setActiveTab] = useState<'regras' | 'menu'>('regras');

    // Config Regras
    const [restringirApontamento, setRestringirApontamento] = useState('Não');
    const [processosVisiveis, setProcessosVisiveis] = useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem']);
    const [planoCorteFiltroDC, setPlanoCorteFiltroDC] = useState<'corte' | 'chaparia'>('corte');
    const [maxRegistros, setMaxRegistros] = useState<number>(500);
    const [maxRegistrosCustom, setMaxRegistrosCustom] = useState<string>('');

    // Config Menu
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [editingItem, setEditingItem] = useState<{ item: MenuItem } | null>(null);
    const [showIconPicker, setShowIconPicker] = useState(false);

    // Superadmin DB Selection
    const [showDbSelection, setShowDbSelection] = useState(false);
    const [availableDbs, setAvailableDbs] = useState<any[]>([]);
    const [loadingDbs, setLoadingDbs] = useState(false);

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) {
            setIsAdmin(true);
            fetchConfig();
            fetchMenu();
        }
    }, []);

    const fetchConfig = () => {
        fetch(`${API_BASE}/config`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setRestringirApontamento(data.config.RestringirApontamentoSemSaldoAnterior || 'Não');
                    if (data.config.ProcessosVisiveis) {
                        try {
                            setProcessosVisiveis(JSON.parse(data.config.ProcessosVisiveis));
                        } catch (e) {
                            console.error('Erro ao parsear processos visíveis', e);
                        }
                    }
                }
            })
            .catch(() => addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar configurações' }));

        // Preferências situacionais: lê do localStorage
        const filtroSalvo = localStorage.getItem('sinco_planoCorteFiltroDC') as 'corte' | 'chaparia' | null;
        if (filtroSalvo === 'chaparia') setPlanoCorteFiltroDC('chaparia');
        else setPlanoCorteFiltroDC('corte');

        const maxSalvo = parseInt(localStorage.getItem('sinco_maxRegistros') || '500') || 500;
        setMaxRegistros(maxSalvo);
        const presets = [100, 300, 500, 1000, 5000];
        setMaxRegistrosCustom(presets.includes(maxSalvo) ? '' : String(maxSalvo));
    };

    const fetchMenu = () => {
        fetch(`${API_BASE}/config/menu`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const savedMenu: MenuItem[] = data.menu || defaultMenuItems;
                    setMenuItems(savedMenu);
                }
            })
            .catch(() => addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar menu' }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Superadmin Check - Relaxed to allow DB password validation
        if (login === 'superadmin') {
            try {
                const res = await fetch(`${API_BASE}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: login, password: senha })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('superadmin_token', data.token);
                    // Fetch DBs
                    fetchDatabases(data.token);
                    setShowDbSelection(true);
                    return;
                } else {
                    addToast({ type: 'error', title: 'Erro', message: data.message });
                    return;
                }
            } catch (err) {
                addToast({ type: 'error', title: 'Erro', message: 'Erro ao conectar como Superadmin' });
                return;
            }
        }

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, senha })
            });
            const data = await res.json();
            if (data.success && data.user.role === 'admin') {
                setIsAdmin(true);
                localStorage.setItem('adminUser', JSON.stringify(data.user));

                // Also update main user context if needed, but this is admin area specific usually?
                // Actually, let's update main context too to be safe
                // But wait, this page is just for config. 
                // However, for superadmin, we want global switch.

                fetchConfig();
                fetchMenu();
                addToast({ type: 'success', title: 'Bem-vindo', message: 'Login realizado com sucesso' });
            } else {
                addToast({ type: 'error', title: 'Acesso Negado', message: 'Apenas administradores podem acessar.' });
            }
        } catch (err) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão' });
        }
    };

    const fetchDatabases = async (token: string) => {
        setLoadingDbs(true);
        try {
            const res = await fetch(`${API_BASE}/admin/databases`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAvailableDbs(data.data);
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'Erro ao buscar bancos de dados' });
        } finally {
            setLoadingDbs(false);
        }
    };

    const handleSelectDb = (db: any) => {
        // Store selection
        const userData = {
            id: 1, // Dummy ID for superadmin context? Or keep original?
            nome: 'Superadmin',
            role: 'admin',
            isSuperadmin: true,
            dbName: db.db_name,
            clientName: db.nome_cliente,
            originalLogin: 'superadmin' // Store for comparison later
        };

        localStorage.setItem('sinco_user', JSON.stringify(userData));
        localStorage.setItem('adminUser', JSON.stringify(userData)); // For this page's check
        localStorage.setItem('original_superadmin', 'true'); // Flag for retrieval

        setIsAdmin(true);
        setShowDbSelection(false);

        // Trigger fetch interceptor update (it reads from localStorage on every request)
        // Verify by reloading or just proceeding.
        // Reload is safer to clear any cached data in other components
        window.location.reload();
    };

    const handleSaveRegras = async () => {
        // 1. Salva preferências situacionais no localStorage (sem banco)
        saveLocalPrefs({ planoCorteFiltroDC, maxRegistros });

        // 2. Salva regras de negócio na API (banco de dados)
        try {
            const res = await fetch(`${API_BASE}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restringirApontamento,
                    processosVisiveis: JSON.stringify(processosVisiveis),
                })
            });
            const data = await res.json();
            if (data.success) {
                // Atualiza contexto global para as outras telas
                refetchConfig();
                addToast({ type: 'success', title: 'Sucesso', message: 'Configurações salvas!' });
            } else {
                addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao salvar regras' });
            }
        } catch (err) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao salvar regras' });
        }
    };

    const handleSaveMenu = async () => {
        try {
            await fetch(`${API_BASE}/config/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ menu: menuItems })
            });
            addToast({ type: 'success', title: 'Sucesso', message: 'Estrutura do menu salva! Atualize a página.' });
        } catch (err) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro ao salvar menu' });
        }
    };

    // --- MENU LOGIC ---

    const updateItem = (items: MenuItem[], id: string, changes: Partial<MenuItem>): MenuItem[] => {
        return items.map(item => {
            if (item.id === id) return { ...item, ...changes };
            if (item.children) return { ...item, children: updateItem(item.children, id, changes) };
            return item;
        });
    };

    const deleteItem = (items: MenuItem[], id: string): MenuItem[] => {
        return items.filter(item => item.id !== id).map(item => {
            if (item.children) return { ...item, children: deleteItem(item.children, id) };
            return item;
        });
    };

    const handleMove = (path: number[], direction: 'up' | 'down') => {
        const newMenu = [...menuItems];
        let currentLevel = newMenu;

        for (let i = 0; i < path.length - 1; i++) {
            currentLevel = currentLevel[path[i]].children!;
        }

        const index = path[path.length - 1];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < currentLevel.length) {
            [currentLevel[index], currentLevel[targetIndex]] = [currentLevel[targetIndex], currentLevel[index]];
            setMenuItems(newMenu);
        }
    };

    const handleIndent = (path: number[]) => {
        const index = path[path.length - 1];
        if (index === 0) return;

        const newMenu = [...menuItems];
        let currentLevel = newMenu;
        for (let i = 0; i < path.length - 1; i++) {
            currentLevel = currentLevel[path[i]].children!;
        }

        const item = currentLevel[index];
        const prevItem = currentLevel[index - 1];

        currentLevel.splice(index, 1);
        if (!prevItem.children) prevItem.children = [];
        prevItem.children.push(item);

        setMenuItems(newMenu);
    };

    const handleOutdent = (path: number[]) => {
        if (path.length <= 1) return;

        const newMenu = [...menuItems];
        let parentLevel = newMenu;
        for (let i = 0; i < path.length - 2; i++) {
            parentLevel = parentLevel[path[i]].children!;
        }

        const parentIndex = path[path.length - 2];
        const currentIndex = path[path.length - 1];
        const parentItem = parentLevel[parentIndex];

        const item = parentItem.children![currentIndex];
        parentItem.children!.splice(currentIndex, 1);

        parentLevel.splice(parentIndex + 1, 0, item);

        setMenuItems(newMenu);
    };

    const handleAddGroup = () => {
        const newGroup: MenuItem = {
            id: `group_${Date.now()}`,
            label: 'Novo Grupo',
            icon: 'Folder',
            children: []
        };
        setMenuItems([newGroup, ...menuItems]);
    };

    const renderEditorItem = (item: MenuItem, path: number[]) => {
        const Icon = iconMap[item.icon] || Menu;
        const isEditing = editingItem?.item.id === item.id;

        return (
            <div key={item.id} className="mb-2">
                <div className="flex items-center gap-2 bg-white p-2 border rounded-lg hover:shadow-sm">
                    {/* Controls */}
                    <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleMove(path, 'up')} className="p-0.5 hover:bg-gray-100 rounded text-gray-500"><ChevronUp size={12} /></button>
                        <button onClick={() => handleMove(path, 'down')} className="p-0.5 hover:bg-gray-100 rounded text-gray-500"><ChevronDown size={12} /></button>
                    </div>

                    {/* Indentation Controls */}
                    <div className="flex flex-col gap-0.5 border-r pr-2 mr-2 border-gray-100">
                        <button onClick={() => handleIndent(path)} className="p-0.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30" disabled={path[path.length - 1] === 0}><ChevronRight size={12} /></button>
                        <button onClick={() => handleOutdent(path)} className="p-0.5 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30" disabled={path.length === 1}><ChevronLeft size={12} /></button>
                    </div>

                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 animate-fade-in">
                            <button onClick={() => setShowIconPicker(true)} className="p-2 border rounded hover:bg-gray-50 bg-gray-50 min-w-[40px] flex items-center justify-center">
                                <Icon size={18} />
                            </button>
                            <input
                                className="flex-1 border rounded px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-[#E0E800] outline-none"
                                value={item.label}
                                onChange={(e) => setMenuItems(updateItem(menuItems, item.id, { label: e.target.value }))}
                                autoFocus
                            />
                            <button onClick={() => setEditingItem(null)} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100"><CheckCircle size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="p-1.5 bg-gray-50 rounded text-gray-500">
                                <Icon size={18} />
                            </div>
                            <span className="font-medium text-gray-700 flex-1 truncate">{item.label}</span>

                            <button onClick={() => setEditingItem({ item })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                            {/* Only show delete for created groups or allow deleting anything? Allow anything, user can restore default. */}
                            <button onClick={() => setMenuItems(deleteItem(menuItems, item.id))} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                        </div>
                    )}
                </div>

                {/* Children */}
                {item.children && item.children.length > 0 && (
                    <div className="pl-8 border-l border-gray-200 ml-4 mt-2">
                        {item.children.map((child, idx) => renderEditorItem(child, [...path, idx]))}
                    </div>
                )}
            </div>
        );
    };

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 mt-20 animate-fade-in">
                {showDbSelection ? (
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-4xl animate-scale-in">
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                <Database size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Selecione o Banco de Dados</h2>
                            <p className="text-sm text-gray-500 text-center mt-1">Ambiente Superadmin - Escolha onde deseja trabalhar</p>
                        </div>

                        {loadingDbs ? (
                            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                                {availableDbs.map(db => (
                                    <button
                                        key={db.id}
                                        onClick={() => handleSelectDb(db)}
                                        className="flex flex-col items-start p-5 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group text-left relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="text-blue-500" size={20} />
                                        </div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                <Server size={20} className="text-gray-600 group-hover:text-blue-700" />
                                            </div>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${db.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {db.ativo ? 'ATIVO' : 'INATIVO'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 group-hover:text-blue-800">{db.nome_cliente}</h3>
                                        <p className="text-xs text-gray-500 mt-1 font-mono">{db.db_name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{db.db_host}</p>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 flex justify-center">
                            <button onClick={() => setShowDbSelection(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancelar / Voltar</button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                                <Lock size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
                            <p className="text-sm text-gray-500 text-center mt-1">Área de Configuração do Sistema</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        value={login}
                                        onChange={e => setLogin(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                        placeholder="Usuário Admin"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        value={senha}
                                        onChange={e => setSenha(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#32423D] focus:border-transparent outline-none transition-all"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-[#32423D] text-[#E0E800] py-3 rounded-lg font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20">
                                Acessar Configurações
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 w-full max-w-[1920px] mx-auto animate-fade-in pb-20">
            {showIconPicker && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowIconPicker(false)}>
                    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <h3 className="font-bold text-lg text-gray-800">Selecione um Ícone</h3>
                            <button onClick={() => setShowIconPicker(false)} className="text-gray-500 hover:text-gray-700"><X /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-2 custom-scrollbar">
                            {Object.keys(iconMap).map(name => {
                                const Icon = iconMap[name];
                                return (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            if (editingItem) {
                                                setMenuItems(updateItem(menuItems, editingItem.item.id, { icon: name }));
                                                setShowIconPicker(false);
                                            }
                                        }}
                                        className="flex flex-col items-center justify-center p-3 hover:bg-[#E0E800]/20 rounded-lg gap-2 transition-colors border border-transparent hover:border-[#E0E800]"
                                    >
                                        <Icon size={24} className="text-gray-700" />
                                        <span className="text-[10px] text-gray-500 truncate w-full text-center">{name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#32423D] rounded-lg">
                        <Settings2 size={24} className="text-[#E0E800]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#32423D]">Configuração do Sistema</h1>
                        <p className="text-gray-500 text-sm">Gerencie o sistema</p>
                    </div>
                </div>
                <button
                    onClick={() => { localStorage.removeItem('adminUser'); setIsAdmin(false); }}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                    Sair
                </button>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-full max-w-md">
                <button
                    onClick={() => setActiveTab('regras')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${activeTab === 'regras' ? 'bg-white shadow text-[#32423D]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Regras de Negócio
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all ${activeTab === 'menu' ? 'bg-white shadow text-[#32423D]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Menu do Sistema
                </button>
            </div>

            {activeTab === 'regras' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Shield size={18} className="text-[#32423D]" />
                            Regras de Produção
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div>
                                <h3 className="font-medium text-gray-900">Restringir sem saldo anterior</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-xl">
                                    Impede o apontamento se não houver saldo no setor anterior.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={restringirApontamento === 'Sim'} onChange={(e) => setRestringirApontamento(e.target.checked ? 'Sim' : 'Não')} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E0E800]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#32423D]"></div>
                            </label>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSaveRegras} className="flex items-center gap-2 bg-[#32423D] text-[#E0E800] px-4 py-2 rounded-lg font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20">
                                <Save size={18} /> Salvar Regras
                            </button>
                        </div>

                        <div className="mt-8 border-t border-gray-100 pt-6">
                            <h3 className="font-medium text-gray-900 mb-4">Setores/Processos Visíveis</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['corte', 'dobra', 'solda', 'pintura', 'montagem'].map(proc => {
                                    const isVisible = processosVisiveis.includes(proc);
                                    return (
                                        <div key={proc}
                                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${isVisible ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                                            onClick={() => {
                                                if (isVisible) {
                                                    setProcessosVisiveis(processosVisiveis.filter(p => p !== proc));
                                                } else {
                                                    setProcessosVisiveis([...processosVisiveis, proc]);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isVisible ? 'bg-[#32423D]/10 text-[#32423D]' : 'bg-gray-200 text-gray-400'}`}>
                                                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </div>
                                                <span className="capitalize font-medium text-gray-700">{proc}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isVisible ? 'bg-[#32423D] border-[#32423D]' : 'border-gray-300 bg-white'}`}>
                                                {isVisible && <CheckCircle size={12} className="text-[#E0E800]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Desmarque os setores que sua fábrica não utiliza. Eles serão ocultados das telas de Apontamento e OS.
                            </p>
                        </div>

                        <div className="mt-8 border-t border-gray-100 pt-6">
                            <h3 className="font-medium text-gray-900 mb-3">Filtro Padrão — Plano de Corte</h3>
                            <p className="text-sm text-gray-500 mb-4">Define quais itens ficam disponíveis na tela de Montagem do Plano de Corte.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setPlanoCorteFiltroDC('corte')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                                        planoCorteFiltroDC === 'corte'
                                            ? 'border-[#32423D] bg-[#32423D] text-[#E0E800]'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    Setor Corte
                                    <span className="text-[10px] opacity-70 font-mono">(TxtCorte = 1)</span>
                                </button>
                                <button
                                    onClick={() => setPlanoCorteFiltroDC('chaparia')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all ${
                                        planoCorteFiltroDC === 'chaparia'
                                            ? 'border-[#32423D] bg-[#32423D] text-[#E0E800]'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                                    }`}
                                >
                                    Desenho Chaparia
                                    <span className="text-[10px] opacity-70 font-mono">(TxtTipoDesenho = CHAPARIA)</span>
                                </button>
                            </div>
                        </div>

                        {/* ===== LIMITE DE REGISTROS ===== */}
                        <div className="mt-8 border-t border-gray-100 pt-6">
                            <div className="flex items-center gap-2 mb-1">
                                <List size={18} className="text-[#32423D]" />
                                <h3 className="font-medium text-gray-900">Limite de Registros por Listagem</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Número máximo de registros retornados em todas as consultas do sistema.
                                Valor atual: <span className="font-bold text-[#32423D]">{maxRegistros}</span> registros.
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {[100, 300, 500, 1000, 5000].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => { setMaxRegistros(val); setMaxRegistrosCustom(''); }}
                                        className={`px-5 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
                                            maxRegistros === val && maxRegistrosCustom === ''
                                                ? 'border-[#32423D] bg-[#32423D] text-[#E0E800]'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {val.toLocaleString('pt-BR')}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Valor personalizado:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99999"
                                    placeholder="Ex: 2000"
                                    value={maxRegistrosCustom}
                                    onChange={e => {
                                        const v = e.target.value;
                                        setMaxRegistrosCustom(v);
                                        const n = parseInt(v);
                                        if (!isNaN(n) && n > 0) setMaxRegistros(n);
                                    }}
                                    className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E0E800] focus:border-transparent outline-none"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Este limite é aplicado globalmente em todos os SELECTs do app. Um valor muito alto pode impactar a performance.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Menu size={18} className="text-[#32423D]" />
                            Editor de Menu
                        </h2>
                        <button onClick={handleAddGroup} className="flex items-center gap-2 px-3 py-1.5 bg-[#E0E800]/20 text-[#32423D] rounded-lg hover:bg-[#E0E800]/40 text-sm font-bold transition-colors">
                            <FolderPlus size={16} /> Novo Grupo
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-200 min-h-[400px]">
                            {menuItems.map((item, idx) => renderEditorItem(item, [idx]))}
                            {menuItems.length === 0 && <p className="text-gray-400 text-center italic py-10">O menu está vazio. Restaure o padrão.</p>}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setMenuItems(defaultMenuItems)} className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-colors">
                                Restaurar Padrão
                            </button>
                            <button onClick={handleSaveMenu} className="flex items-center gap-2 bg-[#32423D] text-[#E0E800] px-6 py-2 rounded-lg font-bold hover:bg-[#2a3833] transition-colors shadow-lg shadow-[#32423D]/20">
                                <Save size={18} /> Salvar Menu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
