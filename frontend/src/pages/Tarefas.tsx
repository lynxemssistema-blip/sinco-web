import { useState, useEffect } from 'react';
import { Loader2, ListTodo, CheckCircle, Edit3, Loader, Plus, Save, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const API_BASE = '/api';

const SECTORS = [
    { k: 'Corte', c: 'bg-indigo-500' },
    { k: 'Dobra', c: 'bg-emerald-500' },
    { k: 'Solda', c: 'bg-amber-500' },
    { k: 'Pintura', c: 'bg-sky-500' },
    { k: 'Montagem', c: 'bg-purple-500' }
];

interface Tarefa {
    IdOrdemServicoItemPendencia: string;
    IdProjeto: string;
    Projeto: string;
    DescEmpresa: string;
    IdTag: string;
    Tag: string;
    DescTag: string;
    IdOrdemServico: string;
    IdOrdemServicoItem: string;
    CodMatFabricante: string;
    DescricaoPendencia: string;
    Usuario: string;
    DataCriacao: string;
    TipoTarefa: string;
    SetorResponsavel: string;
    UsuarioResponsavel: string;
    IdUsuarioResponsavel: string;
    EmailResponsavelPelaTarefa: string;
    DataExecucao: string;
    SetorResponsavelFinalizacao: string;
    FinalizadoPorUsuarioSetor: string;
    DescricaoFinalizacao: string;
    Data_Correcao: string;
    UsuarioProjeto: string;
    Status: string;
    TipoCadastro: string;
    ControleEnvioEmail: string;
    TipoRegistro: string;
}

const isoToBr = (iso: string) => iso ? iso.split('-').reverse().join('/') : '';
const brToIso = (br: string) => {
    if (!br) return '';
    const [d,m,y] = br.split(' ')[0].split('/');
    if (!d || !m || !y || y.length !== 4) return br;
    return `${y}-${m}-${d}`;
}

export default function TarefasPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<Tarefa[]>([]);
    const [showFinalized, setShowFinalized] = useState(false);

    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [tipostarefa, setTiposTarefa] = useState<any[]>([]);
    
    const [msg, setMsg] = useState<{ ok: boolean, t: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [fromGlobal, setFromGlobal] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const [visibleSetores, setVisibleSetores] = useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem']);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') === 'visao-geral-pendencias') setFromGlobal(true);
        const openIdParam = params.get('id');
        if (openIdParam) setOpenId(openIdParam);
    }, []);

    const limpo = {
        idRnc: undefined as number | undefined, 
        idProjeto: undefined as number | undefined,
        projeto: undefined as string | undefined,
        idTag: undefined as number | undefined,
        tag: undefined as string | undefined,
        estatus: 'TarefaAberta', 
        descricao: '', 
        setor: 'Corte', 
        usuario: '', 
        tipoTarefa: '', 
        dataExec: '', 
        
        usuarioFin: '', 
        dataFin: '', 
        setorFin: 'Corte', 
        descFin: '', 
        wantsToFinalize: false 
    };

    const [rncForm, setRncForm] = useState({ ...limpo });

    const fetchTarefas = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/tarefas`);
            if (showFinalized) url.searchParams.append('showFinalized', 'true');

            const headers: Record<string, string> = {};
            const token = localStorage.getItem('sinco_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(url.toString(), { headers });
            const data = await res.json();
            
            if (data.success) {
                setItems(data.data || []);
            } else {
                setError(data.message || 'Erro ao buscar tarefas.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchConfig = async () => {
            const h = { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` };
            try {
                const [r1, r2, rConfig] = await Promise.all([
                    fetch(`${API_BASE}/config/usuarios`, { headers: h }).then(r=>r.json()),
                    fetch(`${API_BASE}/config/tipostarefa`, { headers: h }).then(r=>r.json()),
                    fetch(`${API_BASE}/config`, { headers: h }).then(r=>r.json())
                ]);
                if(r1.success) setUsuarios(r1.usuarios);
                if(r2.success) setTiposTarefa(r2.tipostarefa);
                if(rConfig.success && rConfig.config.ProcessosVisiveis) {
                    try {
                        setVisibleSetores(JSON.parse(rConfig.config.ProcessosVisiveis));
                    } catch(e) { /* fallback case */ }
                }
            } catch(e) { console.error("Erro ao carregar configurações", e); }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        fetchTarefas();
    }, [showFinalized]);

    const salvarNovaTarefa = async () => {
        if (!rncForm.descricao.trim()) return;
        setIsSaving(true); setMsg(null);
        try {
            const sysTime = new Date().toLocaleTimeString('pt-BR');
            const dataBr = rncForm.dataExec ? `${isoToBr(rncForm.dataExec.split('T')[0])} ${sysTime}` : '';
            
            const payload = {
                idRnc: rncForm.idRnc, idProjeto: rncForm.idProjeto, projeto: rncForm.projeto,
                idTag: rncForm.idTag, tag: rncForm.tag,
                descricao: rncForm.descricao, 
                setor: (rncForm.setor || '').toUpperCase(), // Aplicando CAIXA ALTA
                usuario: rncForm.usuario,
                tipoTarefa: rncForm.tipoTarefa, dataExec: dataBr,
                tipoRegistro: 'TAREFA', estatus: 'TarefaAberta', origemPendencia: 'ACAOPCP'
            };

            const isInsert = !rncForm.idRnc;

            const r = await (await fetch(`${API_BASE}/visao-geral/pendencias`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` },
                body: JSON.stringify(payload)
            })).json();

            if (r.success) {
                setMsg({ ok: true, t: rncForm.idRnc ? 'Tarefa atualizada!' : 'Tarefa criada com sucesso!' });
                fetchTarefas();
                
                if (isInsert) {
                    // Após insert, limpar os campos primordiais de cadastro.
                    setRncForm(p => ({ ...p, idRnc: undefined, descricao: '' }));
                }

                setTimeout(() => setMsg(null), 3000);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const finalizarRnc = async () => {
        if (!rncForm.idRnc) return;
        if (!rncForm.usuarioFin || !rncForm.dataFin || !rncForm.setorFin || !rncForm.descFin) {
            setMsg({ ok: false, t: 'Todos os campos de finalização são obrigatórios!' });
            return;
        }

        setIsSaving(true); setMsg(null);
        try {
            const dataBrFin = rncForm.dataFin ? isoToBr(rncForm.dataFin) : '';
            const payload = {
                usuarioFin: rncForm.usuarioFin, dataFin: dataBrFin, 
                setorFin: (rncForm.setorFin || '').toUpperCase(), // Aplicando CAIXA ALTA
                descFin: rncForm.descFin, idProjeto: rncForm.idProjeto
            };
            const r = await (await fetch(`${API_BASE}/visao-geral/pendencias/${rncForm.idRnc}/finalizar`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` },
                body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                setMsg({ ok: true, t: 'Tarefa finalizada com sucesso!' });
                fetchTarefas();
                // Fecha a tela de finalização
                setRncForm(p => ({ ...p, estatus: 'TarefaFinalizada' }));
                setTimeout(() => setMsg(null), 3000);
            } else setMsg({ ok: false, t: r.message });
        } catch { setMsg({ ok: false, t: 'Erro de conexão.' }); } finally { setIsSaving(false); }
    };

    const openEditMode = (t: Tarefa) => {
        const rawSetor = (t.SetorResponsavel || '').trim();
        const mappedSetor = SECTORS.find(s => s.k.toLowerCase() === rawSetor.toLowerCase())?.k || (['Medição', 'Medicao'].includes(rawSetor) ? 'Medição' : (['Isométrico', 'Isometrico'].includes(rawSetor) ? 'Isométrico' : rawSetor)) || 'Corte';
        
        const rawTipoTarefa = (t.TipoTarefa || '').trim();
        const mappedTipoTarefa = (tipostarefa || []).find(tt => tt.TipoTarefa.toLowerCase() === rawTipoTarefa.toLowerCase())?.TipoTarefa || rawTipoTarefa;
        
        const mappedUsuario = (usuarios || []).find(u => u.NomeCompleto.toLowerCase() === (t.UsuarioResponsavel || '').toLowerCase())?.NomeCompleto || t.UsuarioResponsavel || '';

        setRncForm({
            idRnc: Number(t.IdOrdemServicoItemPendencia),
            idProjeto: Number(t.IdProjeto) || undefined,
            projeto: t.Projeto,
            idTag: Number(t.IdTag) || undefined,
            tag: t.Tag,
            estatus: t.Status === 'TarefaAberta' ? 'TarefaAberta' : 'TarefaFinalizada',
            descricao: t.DescricaoPendencia || '',
            setor: mappedSetor,
            usuario: mappedUsuario,
            tipoTarefa: mappedTipoTarefa,
            dataExec: t.DataCriacao ? brToIso(t.DataCriacao.split(' ')[0]) : '',
            
            // Dados da finalizacao
            usuarioFin: t.FinalizadoPorUsuarioSetor || '',
            dataFin: t.Data_Correcao ? brToIso(t.Data_Correcao) : (t.Status === 'TarefaAberta' ? new Date().toISOString().split('T')[0] : ''),
            setorFin: t.SetorResponsavelFinalizacao || 'Corte',
            descFin: t.DescricaoFinalizacao || '',
            wantsToFinalize: false
        });

        // Scroll to top to see the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (openId && items.length > 0) {
            const item = items.find(i => i.IdOrdemServicoItemPendencia.toString() === openId);
            if (item) {
                openEditMode(item);
                setOpenId(null);
            }
        }
    }, [items, openId]);

    const handleExportExcel = () => {
        if (!items || items.length === 0) {
            alert("Não há tarefas visíveis para exportar.");
            return;
        }

        const dataToExport = items.map(item => ({
            "ID OS Item Pendência": (item.IdOrdemServicoItemPendencia || '').toString().trim().toUpperCase(),
            "Projeto": (item.Projeto || '').toString().trim().toUpperCase(),
            "Empresa": (item.DescEmpresa || '').toString().trim().toUpperCase(),
            "Tag": (item.Tag || '').toString().trim().toUpperCase(),
            "Desc Tag": (item.DescTag || '').toString().trim().toUpperCase(),
            "Tipo Tarefa": (item.TipoTarefa || '').toString().trim().toUpperCase(),
            "Descrição Pendência": (item.DescricaoPendencia || '').toString().trim().toUpperCase(),
            "Data Execução": (item.DataExecucao || '').toString().trim().toUpperCase(),
            "Usuário Responsável": (item.UsuarioResponsavel || '').toString().trim().toUpperCase(),
            "Status": (item.Status || '').toString().trim().toUpperCase()
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tarefas_RNC");
        
        XLSX.writeFile(workbook, `ListaTarefasRNC_${new Date().toISOString().slice(0,10).replace(/-/g, '')}.xlsx`);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#fafbfc] animate-in fade-in zoom-in-95 duration-300 p-4 xl:p-6 overflow-auto custom-scrollbar">
            
            {fromGlobal && (
                <div className="mb-4">
                    <button
                        onClick={() => window.location.href = '/visao-geral-pendencias'}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-bold text-xs"
                    >
                        Voltar para Visão Geral de Pendências
                    </button>
                </div>
            )}

            {/* CABEÇALHO -> FORMULÁRIO PRINCIPAL (INLINE) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 shrink-0 flex flex-col relative overflow-hidden">
                {/* Overlay de Loading do Salvar */}
                {isSaving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2"><Loader className="animate-spin text-blue-600" size={28} /><span className="text-[10px] font-bold text-slate-600 uppercase">Processando...</span></div>}

                {/* Topbar of Form */}
                <div className="bg-[#f8fafc] border-b border-slate-200 px-5 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        {rncForm.idRnc ? <Edit3 className="text-amber-500" size={20} /> : <Plus className="text-blue-600" size={20} />}
                        {rncForm.idRnc ? `Editando Tarefa #${rncForm.idRnc}` : 'Cadastrar Nova Tarefa'}
                    </h2>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => setRncForm({ ...limpo })}
                            className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg shadow-sm transition-colors"
                        >
                            Limpar / Novo
                        </button>
                        <button 
                            onClick={salvarNovaTarefa} 
                            disabled={!rncForm.descricao.trim() || rncForm.estatus === 'TarefaFinalizada'}
                            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={14} /> Salvar Dados
                        </button>
                    </div>
                </div>

                {/* Form Fields */}
                <div className="p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {/* ID Readonly */}
                        <div className="opacity-70 bg-slate-50 rounded-lg">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Cód. (ID)</label>
                            <input type="text" readOnly value={rncForm.idRnc || ''} placeholder="Automático" className="w-full bg-transparent border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 outline-none cursor-not-allowed" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Responsável</label>
                            <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.usuario} onChange={e => setRncForm(prev => ({...prev, usuario: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors">
                                <option value="">Selecione...</option>
                                {rncForm.usuario && !(usuarios || []).find(u => u.NomeCompleto === rncForm.usuario) && <option value={rncForm.usuario}>{rncForm.usuario}</option>}
                                {(usuarios || []).map(u => <option key={`task_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Tipo de Tarefa</label>
                            <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.tipoTarefa} onChange={e => setRncForm(prev => ({...prev, tipoTarefa: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors">
                                <option value="">Selecione...</option>
                                {rncForm.tipoTarefa && !(tipostarefa || []).find(t => t.TipoTarefa === rncForm.tipoTarefa) && <option value={rncForm.tipoTarefa}>{rncForm.tipoTarefa}</option>}
                                {(tipostarefa || []).map(t => <option key={`task_${t.IdTipoTarefa}`} value={t.TipoTarefa}>{t.TipoTarefa}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Setor</label>
                            <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.setor} onChange={e => setRncForm(prev => ({...prev, setor: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors">
                                {SECTORS.filter(s => visibleSetores.includes(s.k.toLowerCase())).map(s => <option key={`task_${s.k}`} value={s.k}>{s.k}</option>)}
                                <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                {rncForm.setor && !SECTORS.find(s=>s.k===rncForm.setor) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setor) && <option value={rncForm.setor}>{rncForm.setor}</option>}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Data Execução (Prevista)</label>
                            <input disabled={rncForm.estatus === 'TarefaFinalizada'} type="date" value={rncForm.dataExec} onChange={e => setRncForm(prev => ({...prev, dataExec: e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Descrição / Notas da Tarefa <span className="text-red-500">*</span></label>
                        <textarea disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.descricao} onChange={e => setRncForm(prev => ({...prev, descricao: e.target.value.toUpperCase()}))} rows={2} placeholder="Descreva a tarefa..." className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 resize-none font-medium shadow-inner disabled:bg-slate-50 disabled:cursor-not-allowed transition-colors" />
                    </div>
                    {msg && <div className={`px-4 py-2 rounded-lg text-xs uppercase font-bold text-center ${msg.ok ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>{msg.t}</div>}
                </div>
            </div>

            {/* SEÇÃO INLINE DE FINALIZAÇÃO (SÓ APARECE SE ID EXISTIR) */}
            {rncForm.idRnc && (
                <div className={`bg-emerald-50 rounded-xl shadow-sm border border-emerald-200 mb-4 shrink-0 flex flex-col relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${rncForm.estatus === 'TarefaFinalizada' ? 'opacity-80' : ''}`}>
                    <div className="bg-emerald-100/50 border-b border-emerald-200 px-5 py-3 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <CheckCircle size={18} className="text-emerald-600" /> 
                            {rncForm.estatus === 'TarefaFinalizada' ? `Tarefa Finalizada - ID #${rncForm.idRnc}` : `Área de Finalização - ID #${rncForm.idRnc}`}
                        </h3>
                        {rncForm.estatus !== 'TarefaFinalizada' && (
                            <button onClick={finalizarRnc} disabled={!rncForm.usuarioFin || !rncForm.dataFin || isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50">
                                <CheckCircle size={14} /> Gravar Finalização
                            </button>
                        )}
                    </div>
                    
                    <div className="p-5 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Resp. pela Finalização</label>
                                <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.usuarioFin} onChange={e => setRncForm(prev => ({...prev, usuarioFin: e.target.value}))} className="w-full border border-emerald-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:border-emerald-400 disabled:opacity-75">
                                    <option value="">Selecione...</option>
                                    {rncForm.usuarioFin && !(usuarios || []).find(u => u.NomeCompleto === rncForm.usuarioFin) && <option value={rncForm.usuarioFin}>{rncForm.usuarioFin}</option>}
                                    {(usuarios || []).map(u => <option key={`fin_${u.IdUsuario}`} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Data de Finalização</label>
                                <input disabled={rncForm.estatus === 'TarefaFinalizada'} type="date" value={rncForm.dataFin} onChange={e => setRncForm(prev => ({...prev, dataFin: e.target.value}))} className="w-full border border-emerald-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:border-emerald-400 disabled:opacity-75" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Setor de Acerto</label>
                                <select disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.setorFin} onChange={e => setRncForm(prev => ({...prev, setorFin: e.target.value}))} className="w-full border border-emerald-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 outline-none focus:border-emerald-400 disabled:opacity-75">
                                    {SECTORS.filter(s => visibleSetores.includes(s.k.toLowerCase())).map(s => <option key={`fin_${s.k}`} value={s.k}>{s.k}</option>)}
                                    <option value="Expedição">Expedição</option><option value="Manutenção">Manutenção</option><option value="Qualidade">Qualidade</option><option value="Projetos">Projetos</option><option value="Administrativo">Administrativo</option><option value="Comercial">Comercial</option><option value="Isométrico">Isométrico</option><option value="Medição">Medição</option>
                                    {rncForm.setorFin && !SECTORS.find(s=>s.k===rncForm.setorFin) && !['Expedição','Manutenção','Qualidade','Projetos','Administrativo','Comercial','Isométrico','Medição'].includes(rncForm.setorFin) && <option value={rncForm.setorFin}>{rncForm.setorFin}</option>}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1 block mb-1">Resumo Ocorrido / Resolução</label>
                            <textarea disabled={rncForm.estatus === 'TarefaFinalizada'} value={rncForm.descFin} onChange={e => setRncForm(prev => ({...prev, descFin: e.target.value.toUpperCase()}))} rows={2} placeholder="Detalhes da finalização..." className="w-full border border-emerald-200 bg-white rounded-lg px-4 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 resize-none font-medium shadow-inner disabled:opacity-75" />
                        </div>
                    </div>
                </div>
            )}

            {/* SEÇÃO DA TABELA (GRID) */}
            <div className="bg-white p-4 rounded-t-xl shadow-sm border border-slate-200 border-b-0 flex items-center justify-between shrink-0 flex-wrap gap-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><ListTodo className="text-slate-400" size={18} /> Histórico de Tarefas</h3>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
                        <input 
                            type="checkbox" 
                            checked={showFinalized} 
                            onChange={(e) => setShowFinalized(e.target.checked)}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Consultar Finalizadas</span>
                    </label>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 cursor-pointer bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 font-bold uppercase text-[11px]">
                        <FileSpreadsheet size={14} /> Relatório Excel
                    </button>
                </div>
            </div>
            
            <div className="flex-1 bg-white border border-slate-200 rounded-b-xl overflow-hidden flex flex-col min-h-[300px] shadow-sm relative">
                {error && <div className="bg-red-50 text-red-700 p-3 text-xs font-bold border-b border-red-100">{error}</div>}
                
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col gap-2 items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                )}

                <div className="table-container relative">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                        <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Situação</th>
                                <th className="px-3 py-2">Projeto</th>
                                <th className="px-3 py-2">Empresa</th>
                                <th className="px-3 py-2">Tag</th>
                                <th className="px-3 py-2">Cód. Mat.</th>
                                <th className="px-3 py-2">OS</th>
                                <th className="px-3 py-2">Item OS</th>
                                <th className="px-3 py-2 min-w-[200px]">Descrição/Pendência</th>
                                <th className="px-3 py-2">Resp. Setor</th>
                                <th className="px-3 py-2">Usuário Resp.</th>
                                <th className="px-3 py-2">Criado Em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400 font-medium">
                                        Nenhuma tarefa encontrada.
                                    </td>
                                </tr>
                            )}
                            {items.map(item => (
                                <tr key={item.IdOrdemServicoItemPendencia} onClick={() => openEditMode(item)} className={`cursor-pointer group hover:bg-blue-50/50 transition-colors ${item.Status === 'Finalizada' ? 'bg-[#fafcfd] opacity-70' : 'bg-white'}`}>
                                    <td className="px-3 py-2 font-mono text-slate-600 font-bold flex items-center gap-1.5"><Edit3 size={10} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" /> #{item.IdOrdemServicoItemPendencia}</td>
                                    <td className="px-3 py-2">
                                        {item.Status === 'TarefaAberta' ? (
                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">ABERTA</span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">FINALIZADA</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 font-bold text-slate-700 truncate max-w-[150px]">{item.Projeto || '—'}</td>
                                    <td className="px-3 py-2 truncate max-w-[150px]" title={item.DescEmpresa}>{item.DescEmpresa || '—'}</td>
                                    <td className="px-3 py-2 font-bold text-blue-700 truncate max-w-[120px]">{item.Tag || '—'}</td>
                                    <td className="px-3 py-2 font-mono truncate max-w-[120px]" title={item.CodMatFabricante}>{item.CodMatFabricante || '—'}</td>
                                    <td className="px-3 py-2 font-mono">{item.IdOrdemServico || '—'}</td>
                                    <td className="px-3 py-2 font-mono">{item.IdOrdemServicoItem || '—'}</td>
                                    <td className="px-3 py-2 truncate max-w-[300px] font-medium text-slate-800" title={item.DescricaoPendencia}>{item.DescricaoPendencia}</td>
                                    <td className="px-3 py-2 text-slate-600 font-medium">{item.SetorResponsavel || '—'}</td>
                                    <td className="px-3 py-2 text-slate-600">{item.UsuarioResponsavel || '—'}</td>
                                    <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{item.DataCriacao}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
