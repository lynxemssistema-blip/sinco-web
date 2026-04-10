import { useState, useEffect, useCallback } from 'react';
import {
    Users, Search, X, Loader2, RefreshCw,
    Shield, User, Building2, Mail, AtSign,
    UserCheck, UserX, KeyRound, FileText, Tag,
    Scissors, FoldVertical, Flame, Paintbrush, Wrench,
    Warehouse, Map, ClipboardList, PackageCheck, Box,
    TrendingUp, Eye, Briefcase, DollarSign, FlaskConical, Truck,
    Plus, Save, Trash2, Settings, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UsuarioAdmin {
    idUsuario: number;
    NomeCompleto: string;
    Login: string;
    Senha: string | null;
    TipoUsuario: string;
    Setor: string | null;
    email: string | null;
    status: string;
    Descricao: string | null;
    Sigla: string | null;
    EnderecoImagem: string | null;
    txtCorte: string | null; txtDobra: string | null; txtSolda: string | null;
    txtPintura: string | null; txtMontagem: string | null; txtAlmoxarifado: string | null;
    MapaProducao: string | null; Romaneio: string | null; OrdemServico: string | null;
    SolidWorks: string | null; GerenciamentoProducao: string | null;
    VisaoGeralProducao: string | null; Comercial: string | null;
    Financeiro: string | null; Teste: string | null; Expedicao: string | null;
}

interface FormData {
    idUsuario: number | null;
    NomeCompleto: string; Login: string; Senha: string; TipoUsuario: string;
    Setor: string; email: string; Descricao: string; Sigla: string; EnderecoImagem: string;
    txtCorte: string; txtDobra: string; txtSolda: string; txtPintura: string;
    txtMontagem: string; txtAlmoxarifado: string; MapaProducao: string;
    Romaneio: string; OrdemServico: string; SolidWorks: string;
    GerenciamentoProducao: string; VisaoGeralProducao: string;
    Comercial: string; Financeiro: string; Teste: string; Expedicao: string;
}

interface ProcessoFabricacao {
    IdProcessoFabricacao: number;
    ProcessoFabricacao: string;
    CodigoProcessoFabricacao: string;
}

interface UsuarioProcesso {
    IdUsuarioprocessofabricacao: number;
    ProcessoFabricacao: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const emptyForm: FormData = {
    idUsuario: null, NomeCompleto: '', Login: '', Senha: '', TipoUsuario: 'C',
    Setor: '', email: '', Descricao: '', Sigla: '', EnderecoImagem: '',
    txtCorte: '', txtDobra: '', txtSolda: '', txtPintura: '',
    txtMontagem: '', txtAlmoxarifado: '', MapaProducao: '', Romaneio: '',
    OrdemServico: '', SolidWorks: '', GerenciamentoProducao: '',
    VisaoGeralProducao: '', Comercial: '', Financeiro: '', Teste: '', Expedicao: ''
};

const permissoes: { key: keyof FormData; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'txtCorte',              label: 'Corte',         icon: <Scissors size={12} />,     color: 'text-red-500' },
    { key: 'txtDobra',              label: 'Dobra',         icon: <FoldVertical size={12} />, color: 'text-orange-500' },
    { key: 'txtSolda',              label: 'Solda',         icon: <Flame size={12} />,        color: 'text-amber-500' },
    { key: 'txtPintura',            label: 'Pintura',       icon: <Paintbrush size={12} />,   color: 'text-pink-500' },
    { key: 'txtMontagem',           label: 'Montagem',      icon: <Wrench size={12} />,       color: 'text-blue-500' },
    { key: 'txtAlmoxarifado',       label: 'Almoxarifado',  icon: <Warehouse size={12} />,    color: 'text-teal-500' },
    { key: 'MapaProducao',          label: 'Mapa Prod.',    icon: <Map size={12} />,          color: 'text-cyan-500' },
    { key: 'Romaneio',              label: 'Romaneio',      icon: <ClipboardList size={12} />,color: 'text-violet-500' },
    { key: 'OrdemServico',          label: 'O. Serviço',    icon: <PackageCheck size={12} />, color: 'text-indigo-500' },
    { key: 'SolidWorks',            label: 'SolidWorks',    icon: <Box size={12} />,          color: 'text-sky-500' },
    { key: 'GerenciamentoProducao', label: 'Ger. Prod.',    icon: <TrendingUp size={12} />,   color: 'text-emerald-500' },
    { key: 'VisaoGeralProducao',    label: 'Visão Prod.',   icon: <Eye size={12} />,          color: 'text-lime-600' },
    { key: 'Comercial',             label: 'Comercial',     icon: <Briefcase size={12} />,    color: 'text-yellow-600' },
    { key: 'Financeiro',            label: 'Financeiro',    icon: <DollarSign size={12} />,   color: 'text-green-600' },
    { key: 'Teste',                 label: 'Teste',         icon: <FlaskConical size={12} />, color: 'text-purple-500' },
    { key: 'Expedicao',             label: 'Expedição',     icon: <Truck size={12} />,        color: 'text-stone-500' },
];

function userToForm(u: UsuarioAdmin): FormData {
    return {
        idUsuario: u.idUsuario, NomeCompleto: u.NomeCompleto || '', Login: u.Login || '',
        Senha: u.Senha || '', TipoUsuario: u.TipoUsuario || 'C', Setor: u.Setor || '',
        email: u.email || '', Descricao: u.Descricao || '', Sigla: u.Sigla || '',
        EnderecoImagem: u.EnderecoImagem || '',
        txtCorte: u.txtCorte || '', txtDobra: u.txtDobra || '', txtSolda: u.txtSolda || '',
        txtPintura: u.txtPintura || '', txtMontagem: u.txtMontagem || '',
        txtAlmoxarifado: u.txtAlmoxarifado || '', MapaProducao: u.MapaProducao || '',
        Romaneio: u.Romaneio || '', OrdemServico: u.OrdemServico || '',
        SolidWorks: u.SolidWorks || '', GerenciamentoProducao: u.GerenciamentoProducao || '',
        VisaoGeralProducao: u.VisaoGeralProducao || '', Comercial: u.Comercial || '',
        Financeiro: u.Financeiro || '', Teste: u.Teste || '', Expedicao: u.Expedicao || '',
    };
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function CadastroUsuarioPage() {
    const { user, token } = useAuth();
    const { addToast } = useToast();

    // Acesso restrito a administradores
    if (!user || (user.role !== 'admin' && !user.isSuperadmin)) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
                <div className="p-4 bg-red-100 rounded-full text-red-600"><Lock size={40} /></div>
                <h2 className="text-xl font-black text-red-700">Acesso Negado</h2>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                    Somente usuários do tipo <strong>Administrador</strong> podem acessar o Cadastro de Usuários.
                </p>
            </div>
        );
    }

    // ── State ──
    const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fNome, setFNome] = useState('');
    const [fSetor, setFSetor] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [form, setForm] = useState<FormData>({ ...emptyForm });
    const [showForm, setShowForm] = useState(false);
    const [isNewMode, setIsNewMode] = useState(false);
    const [setores, setSetores] = useState<string[]>([]);
    const [showSenha, setShowSenha] = useState(false);

    // Processos
    const [showProcessos, setShowProcessos] = useState(false);
    const [loadingProc, setLoadingProc] = useState(false);
    const [loadingUserProc, setLoadingUserProc] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false); // Global flag for association actions
    const [processos, setProcessos] = useState<ProcessoFabricacao[]>([]);
    const [userProcessos, setUserProcessos] = useState<UsuarioProcesso[]>([]);

    // ── Carregar setores + processos no mount (independente de usuário) ──
    useEffect(() => {
        // Setores
        fetch('/api/rnc/sectors')
            .then(r => r.json())
            .then(data => { if (data.success) setSetores(data.data || []); })
            .catch(() => {});

        // Processos de fabricação — carregados uma única vez, independente de seleção
        // NOTA: rota renomeada para evitar conflito com /api/usuario/:id
        setLoadingProc(true);
        fetch('/api/processosfabricacao')
            .then(r => r.json())
            .then(data => { if (data.success) setProcessos(data.data || []); })
            .catch(() => {})
            .finally(() => setLoadingProc(false));
    }, []);

    // ── Fetchusuários ──
    const fetchUsuarios = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fNome.trim()) params.set('NomeCompleto', fNome.trim());
            if (fSetor.trim()) params.set('Setor', fSetor.trim());
            const res = await fetch(`/api/admin/usuarios?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) { addToast({ type: 'warning', title: 'Sessão Expirada', message: 'Faça login novamente.' }); return; }
            const result = await res.json();
            if (result.success) { setUsuarios(result.data || []); }
            else { addToast({ type: 'info', title: 'Resultado', message: result.message || 'Nenhum usuário encontrado.' }); setUsuarios([]); }
        } catch { addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar usuários.' }); }
        finally { setLoading(false); }
    }, [fNome, fSetor, token]);

    useEffect(() => { if (token) fetchUsuarios(); }, [token]);

    // ── Fetch processos do usuário selecionado ──
    const fetchUserProcessos = useCallback(async (userId: number) => {
        setLoadingUserProc(true);
        try {
            const res = await fetch(`/api/processosfabricacao/usuario/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setUserProcessos(data.data || []);
        } catch { addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar processos do usuário.' }); }
        finally { setLoadingUserProc(false); }
    }, [token]);

    const handleLimpar = () => { setFNome(''); setFSetor(''); setTimeout(fetchUsuarios, 50); };

    const handleNovo = () => {
        setSelectedId(null); setForm({ ...emptyForm });
        setIsNewMode(true); setShowForm(true);
        setShowProcessos(false); setShowSenha(false);
    };

    const handleSelectUser = (u: UsuarioAdmin) => {
        if (selectedId === u.idUsuario) {
            setSelectedId(null); setShowForm(false); setIsNewMode(false); setShowProcessos(false); return;
        }
        setSelectedId(u.idUsuario); setForm(userToForm(u));
        setIsNewMode(false); setShowForm(true); setShowSenha(false);
        setShowProcessos(false); setUserProcessos([]);
    };

    const handleToggleProcessos = () => {
        if (!showProcessos && form.idUsuario) fetchUserProcessos(form.idUsuario);
        setShowProcessos(prev => !prev);
    };

    const handleAssociarProcesso = async (p: ProcessoFabricacao) => {
        if (!form.idUsuario || loadingAction) return;
        setLoadingAction(true);
        try {
            const res = await fetch('/api/processosfabricacao/associar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    IdUsuario: form.idUsuario,
                    IdProcessoFabricacao: p.IdProcessoFabricacao,
                    ProcessoFabricacao: p.ProcessoFabricacao
                })
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                fetchUserProcessos(form.idUsuario); // Refresh the user's processes
            } else {
                addToast({ type: 'warning', title: 'Aviso', message: result.message });
            }
        } catch {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao vincular processo.' });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleDesvincularProcesso = async (idVinculo: number) => {
        if (!form.idUsuario || loadingAction) return;
        if (!confirm("Deseja realmente remover este processo associado ao usuário?")) return;
        
        setLoadingAction(true);
        try {
            const res = await fetch(`/api/processosfabricacao/desvincular/${idVinculo}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                fetchUserProcessos(form.idUsuario); // Refresh the user's processes
            } else {
                addToast({ type: 'warning', title: 'Aviso', message: result.message });
            }
        } catch {
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao desvincular processo.' });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleSalvar = async () => {
        if (!form.NomeCompleto.trim()) { addToast({ type: 'warning', title: 'Atenção', message: 'Nome Completo é obrigatório!' }); return; }
        if (!form.Login.trim()) { addToast({ type: 'warning', title: 'Atenção', message: 'Login é obrigatório!' }); return; }
        if (form.Login.trim().length < 5) { addToast({ type: 'warning', title: 'Atenção', message: 'Login deve ter no mínimo 5 caracteres!' }); return; }
        if (!form.TipoUsuario) { addToast({ type: 'warning', title: 'Atenção', message: 'Tipo de Usuário é obrigatório!' }); return; }
        if (isNewMode && !form.Senha.trim()) { addToast({ type: 'warning', title: 'Atenção', message: 'Senha é obrigatória para novo usuário!' }); return; }
        if (isNewMode && form.Senha.trim().length < 8) { addToast({ type: 'warning', title: 'Atenção', message: 'Senha deve ter no mínimo 8 caracteres!' }); return; }
        if (!isNewMode && form.Senha && form.Senha.length < 8) { addToast({ type: 'warning', title: 'Atenção', message: 'Senha deve ter no mínimo 8 caracteres!' }); return; }

        setSaving(true);
        try {
            const url = isNewMode ? '/api/usuario' : `/api/usuario/${form.idUsuario}`;
            const method = isNewMode ? 'POST' : 'PUT';
            const body: any = {
                NomeCompleto: form.NomeCompleto, Login: form.Login, TipoUsuario: form.TipoUsuario,
                Setor: form.Setor || '', email: form.email || '', Descricao: form.Descricao || '',
                Sigla: form.Sigla || '', txtCorte: form.txtCorte || '', txtDobra: form.txtDobra || '',
                txtSolda: form.txtSolda || '', txtPintura: form.txtPintura || '',
                txtMontagem: form.txtMontagem || '', txtAlmoxarifado: form.txtAlmoxarifado || '',
                MapaProducao: form.MapaProducao || '', Romaneio: form.Romaneio || '',
                OrdemServico: form.OrdemServico || '', SolidWorks: form.SolidWorks || '',
                GerenciamentoProducao: form.GerenciamentoProducao || '',
                VisaoGeralProducao: form.VisaoGeralProducao || '', Comercial: form.Comercial || '',
                Financeiro: form.Financeiro || '', Teste: form.Teste || '', Expedicao: form.Expedicao || '',
            };
            if (isNewMode) body.Senha = form.Senha;
            else if (form.Senha && form.Senha.trim() !== '') body.Senha = form.Senha;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                if (isNewMode && result.id) {
                    setForm(prev => ({ ...prev, idUsuario: result.id }));
                    setSelectedId(result.id); setIsNewMode(false);
                }
                fetchUsuarios();
            } else { addToast({ type: 'warning', title: 'Atenção', message: result.message }); }
        } catch (e: any) { addToast({ type: 'error', title: 'Erro', message: 'Falha ao salvar: ' + e.message }); }
        finally { setSaving(false); }
    };

    const handleExcluir = async () => {
        if (!form.idUsuario) return;
        if (!confirm(`Deseja realmente excluir o usuário "${form.NomeCompleto}"?`)) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/usuario/${form.idUsuario}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                setSelectedId(null); setShowForm(false); setForm({ ...emptyForm });
                setShowProcessos(false); fetchUsuarios();
            } else { addToast({ type: 'warning', title: 'Atenção', message: result.message }); }
        } catch { addToast({ type: 'error', title: 'Erro', message: 'Falha ao excluir.' }); }
        finally { setSaving(false); }
    };

    const updateField = (key: keyof FormData, value: string) => setForm(prev => ({ ...prev, [key]: value }));
    const toggleCheck = (key: keyof FormData) => setForm(prev => ({ ...prev, [key]: prev[key] === 'S' ? '' : 'S' }));

    const tipoLabel = (tipo: string) => {
        if (tipo === 'A') return { label: 'Administrador', cls: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Shield size={11} /> };
        return { label: 'Comum', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <User size={11} /> };
    };
    const statusBadge = (st: string) => {
        const ativo = st === 'A' || !st;
        return ativo
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-emerald-100 text-emerald-700 border-emerald-200"><UserCheck size={10} />Ativo</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border bg-red-100 text-red-700 border-red-200"><UserX size={10} />Inativo</span>;
    };

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 p-3 gap-2 overflow-hidden">

            {/* ── Top Bar ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm"><Users size={20} /></div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none">Cadastro de Usuários</h1>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Gerenciamento de Usuários</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleNovo} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black shadow-sm hover:bg-emerald-700 transition-colors">
                        <Plus size={14} /> Novo
                    </button>
                    <button onClick={handleSalvar} disabled={saving || !showForm}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm transition-colors ${showForm ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                    </button>
                    <button onClick={handleExcluir} disabled={saving || isNewMode || !form.idUsuario}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm transition-colors ${!isNewMode && form.idUsuario ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                        <Trash2 size={14} /> Excluir
                    </button>
                    {!isNewMode && form.idUsuario && (
                        <button onClick={handleToggleProcessos}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black shadow-sm transition-colors ${showProcessos ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}>
                            <Settings size={14} />
                            {showProcessos ? 'Ocultar' : 'Ver Processos'}
                            {showProcessos ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-400 shadow-inner">
                        <Search size={12} className="text-slate-400" />
                        <input type="text" placeholder="Nome completo..." value={fNome} onChange={e => setFNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsuarios()}
                            className="w-36 text-[11px] outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-400 shadow-inner">
                        <Building2 size={12} className="text-slate-400" />
                        <input type="text" placeholder="Setor..." value={fSetor} onChange={e => setFSetor(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsuarios()}
                            className="w-24 text-[11px] outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                    </div>
                    <button onClick={fetchUsuarios} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black shadow-sm hover:bg-indigo-700 transition-colors"><Search size={12} /> Buscar</button>
                    {(fNome || fSetor) && <button onClick={handleLimpar} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"><X size={14} /></button>}
                    <button onClick={fetchUsuarios} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">{loading ? '...' : `${usuarios.length} reg.`}</span>
                </div>
            </div>

            {/* ── Form Panel ── */}
            {showForm && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-1.5 ${isNewMode ? 'bg-gradient-to-r from-emerald-600 to-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-500'}`}>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            {isNewMode ? <><Plus size={12} /> Novo Usuário</> : <><User size={12} /> Dados — ID {form.idUsuario}</>}
                        </span>
                        <button onClick={() => { setShowForm(false); setSelectedId(null); setIsNewMode(false); setShowProcessos(false); }} className="p-0.5 text-white/60 hover:text-white rounded"><X size={14} /></button>
                    </div>
                    <div className="flex gap-4 p-3">
                        {/* Col 1: Avatar + Tipo */}
                        <div className="flex flex-col items-center gap-2 pr-4 border-r border-slate-100 min-w-[110px]">
                            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl border-2 border-indigo-200 shadow-sm">
                                {form.NomeCompleto?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <p className="text-[10px] font-black text-slate-700 text-center leading-tight max-w-[100px] truncate">{form.NomeCompleto || 'Novo'}</p>
                            <div className="flex flex-col gap-1 w-full">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tipo</label>
                                <div className="flex gap-1">
                                    <button onClick={() => updateField('TipoUsuario', 'A')} className={`flex-1 text-[10px] font-black px-1.5 py-1 rounded-md border transition-all ${form.TipoUsuario === 'A' ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-purple-200'}`}>
                                        <Shield size={9} className="inline mr-0.5 -mt-0.5" />Admin
                                    </button>
                                    <button onClick={() => updateField('TipoUsuario', 'C')} className={`flex-1 text-[10px] font-black px-1.5 py-1 rounded-md border transition-all ${form.TipoUsuario !== 'A' ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-blue-200'}`}>
                                        <User size={9} className="inline mr-0.5 -mt-0.5" />Comum
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Col 2: Dados Pessoais */}
                        <div className="flex-1 grid grid-cols-4 gap-x-4 gap-y-1.5 min-w-0">
                            {!isNewMode && <EditableField icon={<AtSign size={12} />} label="ID" value={String(form.idUsuario || '')} readOnly />}
                            <EditableField icon={<User size={12} />} label="Nome Completo" value={form.NomeCompleto} onChange={v => updateField('NomeCompleto', v)} />

                            {/* Login */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="text-slate-400 shrink-0"><KeyRound size={12} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Login <span className="text-slate-300 font-normal normal-case">(mín.5)</span></p>
                                    <input type="text" value={form.Login} onChange={e => updateField('Login', e.target.value)}
                                        className={`w-full text-[11px] font-bold text-slate-700 border-b outline-none bg-transparent py-0.5 mt-0.5 transition-colors ${form.Login && form.Login.length < 5 ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                                        placeholder="—" />
                                    {form.Login && form.Login.length < 5 && <p className="text-[9px] text-red-500">{form.Login.length}/5</p>}
                                </div>
                            </div>

                            {/* Senha */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="text-slate-400 shrink-0"><KeyRound size={12} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Senha <span className="text-slate-300 font-normal normal-case">(mín.8)</span></p>
                                        {!isNewMode && (
                                            <button onClick={() => { setShowSenha(v => !v); if (!showSenha) updateField('Senha', ''); }}
                                                className="text-[9px] text-indigo-500 hover:text-indigo-700 font-black underline">
                                                {showSenha ? 'Cancelar' : 'Alterar'}
                                            </button>
                                        )}
                                    </div>
                                    {(isNewMode || showSenha) ? (
                                        <>
                                            <input type="text" value={form.Senha} onChange={e => updateField('Senha', e.target.value)}
                                                className={`w-full text-[11px] font-bold text-slate-700 border-b outline-none bg-transparent py-0.5 mt-0.5 transition-colors ${form.Senha && form.Senha.length < 8 ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
                                                placeholder="Digite a senha..." autoFocus={showSenha} />
                                            {form.Senha && form.Senha.length < 8 && <p className="text-[9px] text-red-500">{form.Senha.length}/8</p>}
                                        </>
                                    ) : (
                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 tracking-widest">••••••••</p>
                                    )}
                                </div>
                            </div>

                            <EditableField icon={<Mail size={12} />} label="E-mail" value={form.email} onChange={v => updateField('email', v)} />

                            {/* Setor Combobox */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="text-slate-400 shrink-0"><Building2 size={12} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Setor</p>
                                    <select value={form.Setor} onChange={e => updateField('Setor', e.target.value)}
                                        className="w-full text-[11px] font-bold text-slate-700 border-b border-slate-200 focus:border-indigo-400 outline-none bg-transparent py-0.5 mt-0.5 cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 2px center', appearance: 'none' as any }}>
                                        <option value="">— Selecione —</option>
                                        {setores.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <EditableField icon={<Tag size={12} />} label="Sigla" value={form.Sigla} onChange={v => updateField('Sigla', v)} />
                            <EditableField icon={<FileText size={12} />} label="Descrição" value={form.Descricao} onChange={v => updateField('Descricao', v)} />
                        </div>

                        {/* Col 3: Permissões */}
                        <div className="shrink-0 border-l border-slate-100 pl-4 min-w-[320px]">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Permissões / Módulos</label>
                            <div className="grid grid-cols-4 gap-1">
                                {permissoes.map(p => {
                                    const checked = form[p.key] === 'S';
                                    return (
                                        <button key={p.key} type="button" onClick={() => toggleCheck(p.key)}
                                            className={`flex items-center gap-1 px-1.5 py-1 rounded-md border text-[10px] font-bold transition-all ${checked ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                                {checked && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                            </div>
                                            <span className={`shrink-0 ${checked ? p.color : ''}`}>{p.icon}</span>
                                            <span className="truncate">{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Painel de Processos ── */}
            {showProcessos && form.idUsuario && (
                <div className="bg-white border border-amber-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Settings size={12} /> Processos de Fabricação — {form.NomeCompleto}
                        </span>
                        <button onClick={() => setShowProcessos(false)} className="p-0.5 text-white/60 hover:text-white rounded"><X size={14} /></button>
                    </div>
                    <div className="flex gap-3 p-3">
                        {/* Grid 1: Todos os processos — carregado no mount, independente de usuário */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                Processos Disponíveis <span className="text-slate-300 font-normal">({processos.length})</span>
                            </p>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                {loadingProc ? (
                                    <div className="flex items-center justify-center h-16"><Loader2 className="animate-spin text-slate-400" size={18} /></div>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-[11px]">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-1.5 text-left font-black text-slate-500 border-b border-slate-100 text-[10px] uppercase tracking-wider">ID</th>
                                                    <th className="px-3 py-1.5 text-left font-black text-slate-500 border-b border-slate-100 text-[10px] uppercase tracking-wider">Processo</th>
                                                    <th className="px-3 py-1.5 text-left font-black text-slate-500 border-b border-slate-100 text-[10px] uppercase tracking-wider">Código</th>
                                                    <th className="px-3 py-1.5 border-b border-slate-100 w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {processos.length === 0 ? (
                                                    <tr><td colSpan={4} className="py-6 text-center text-slate-400 text-[11px]">Nenhum processo cadastrado</td></tr>
                                                ) : processos.map(p => (
                                                    <tr key={p.IdProcessoFabricacao} 
                                                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <td className="px-3 py-1 font-black text-indigo-600">{p.IdProcessoFabricacao}</td>
                                                        <td className="px-3 py-1 text-slate-700 font-medium">{p.ProcessoFabricacao}</td>
                                                        <td className="px-3 py-1 text-slate-500 font-mono text-[10px]">{p.CodigoProcessoFabricacao}</td>
                                                        <td className="px-3 py-1 text-right">
                                                            <button 
                                                                onClick={() => handleAssociarProcesso(p)}
                                                                className={`p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all ${loadingAction ? 'opacity-30 pointer-events-none' : ''}`}
                                                                title="Vincular processo"
                                                            >
                                                                <Plus size={12}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grid 2: Processos do usuário selecionado */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                Processos Vinculados a <strong className="text-slate-600">{form.NomeCompleto}</strong> <span className="text-slate-300 font-normal">({userProcessos.length})</span>
                            </p>
                            <div className="border border-amber-200 rounded-lg overflow-hidden">
                                {loadingUserProc ? (
                                    <div className="flex items-center justify-center h-16"><Loader2 className="animate-spin text-amber-500" size={18} /></div>
                                ) : (
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-[11px]">
                                            <thead className="bg-amber-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-1.5 text-left font-black text-amber-700 border-b border-amber-100 text-[10px] uppercase tracking-wider">ID</th>
                                                    <th className="px-3 py-1.5 text-left font-black text-amber-700 border-b border-amber-100 text-[10px] uppercase tracking-wider">Processo</th>
                                                    <th className="px-3 py-1.5 text-right font-black text-amber-700 border-b border-amber-100 text-[10px] uppercase tracking-wider w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {userProcessos.length === 0 ? (
                                                    <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-[11px]">Nenhum processo vinculado a este usuário</td></tr>
                                                ) : userProcessos.map(p => (
                                                    <tr key={p.IdUsuarioprocessofabricacao} className="border-b border-amber-50 hover:bg-amber-100 transition-colors">
                                                        <td className="px-3 py-1 font-black text-amber-700">{p.IdUsuarioprocessofabricacao}</td>
                                                        <td className="px-3 py-1 text-slate-700 font-medium">{p.ProcessoFabricacao}</td>
                                                        <td className="px-3 py-1 text-right">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDesvincularProcesso(p.IdUsuarioprocessofabricacao); }}
                                                                className={`p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all ${loadingAction ? 'opacity-30 pointer-events-none' : ''}`}
                                                                title="Remover vínculo"
                                                            >
                                                                <Trash2 size={12}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Grid de Usuários ── */}
            <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {loading && <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-indigo-600" size={28} /></div>}
                    {!loading && (
                        <table className="w-full text-[11px] text-left border-separate border-spacing-0">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center w-12">#</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Nome Completo</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Login</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Setor</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">E-mail</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Tipo</th>
                                    <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.length === 0 ? (
                                    <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-40">Nenhum usuário encontrado</td></tr>
                                ) : usuarios.map(u => {
                                    const tipo = tipoLabel(u.TipoUsuario);
                                    const selected = selectedId === u.idUsuario;
                                    return (
                                        <tr key={u.idUsuario} onClick={() => handleSelectUser(u)}
                                            className={`cursor-pointer transition-colors border-b border-slate-50 ${selected ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-2 text-center font-black text-indigo-600">{u.idUsuario}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0">
                                                        {u.NomeCompleto?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{u.NomeCompleto}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{u.Login}</td>
                                            <td className="px-4 py-2 text-slate-600">{u.Setor || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-4 py-2 text-slate-500 text-[10px]">{u.email || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${tipo.cls}`}>{tipo.icon}{tipo.label}</span>
                                            </td>
                                            <td className="px-4 py-2 text-center">{statusBadge(u.status)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Reusable Field ─────────────────────────────────────────────────────────────
function EditableField({ icon, label, value, onChange, readOnly, type }: {
    icon: React.ReactNode; label: string; value: string;
    onChange?: (v: string) => void; readOnly?: boolean; type?: string;
}) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="text-slate-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">{label}</p>
                {readOnly ? (
                    <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">{value}</p>
                ) : (
                    <input type={type || 'text'} value={value} onChange={e => onChange?.(e.target.value)}
                        className="w-full text-[11px] font-bold text-slate-700 border-b border-slate-200 focus:border-indigo-400 outline-none bg-transparent py-0.5 mt-0.5 transition-colors"
                        placeholder="—" />
                )}
            </div>
        </div>
    );
}
