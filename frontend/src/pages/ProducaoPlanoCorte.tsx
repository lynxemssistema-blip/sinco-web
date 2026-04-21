import { useState, useEffect, useCallback } from 'react';
import {
    Scissors, Loader2, Database, RefreshCw,
    CheckCircle2, Clock, Search, X, ArrowRight,
    FolderOpen, Send, Flag, Box, FileText, Layers, FileCode,
    ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface PlanoCorte {
    IdPlanodecorte: number;
    DescPlanodecorte: string;
    Espessura: string;
    MaterialSW: string;
    DataLiberacao: string | null;
    UsuarioLiberacao: string | null;
    DataInicial: string | null;
    DataFinal: string | null;
    QtdeTotalPecas: number | null;
    QtdeTotalPecasExecutadas: number | null;
    EnderecoCompletoPlanoCorte: string | null;
    LiberacaoParaCorte: string | null;
    DataLiberacaoParaCorte: string | null;
    UsuarioLiberacaoParaCorte: string | null;
    Concluido: string | null;
}

interface ItemPlano {
    CodMatFabricante: string;
    IdPlanodeCorte: number;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    Espessura: string;
    MaterialSW: string;
    IdProjeto: number;
    Projeto: string;
    IdTag: number;
    Tag: string;
    Acabamento: string;
    txtSoldagem: string;
    ProdutoPrincipal: string;
    QtdeTotal: number;
    txtCorte: string;
    CorteTotalExecutado: number;
    CorteTotalExecutar: number;
    Parcial: number;
    OrdemServicoItemFinalizado: string;
    DescResumo: string;
    DescDetal: string;
    EnderecoArquivo: string;
    EnderecoArquivoItemOrdemServico: string;
    qtde: number;
    txtDobra: string;
    txtSolda: string;
    txtPintura: string;
    txtMontagem: string;
    sttxtCorte: string;
    RealizadoInicioCorte: string;
    RealizadoFinalCorte: string;
    Liberado_Engenharia: string;
}

function fmt(val: string | null): string {
    if (!val) return '—';
    const s = String(val).trim();
    if (s === '0' || s === '0/0/0' || s === '00/00/0000') return '—';
    
    // Se já estiver no formato DD/MM/YYYY, retorna como está (pode ter hora)
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
    
    // Se for ISO ou formato MySQL (YYYY-MM-DD), converte
    if (s.includes('-')) {
        try {
            const d = new Date(s.replace(/-/g, '/')); // replace para Safari/Chrome stability
            if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
        } catch(e) {}
    }
    
    if (s.includes('T')) return new Date(s).toLocaleDateString('pt-BR');
    
    return s;
}

export default function ProducaoPlanoCorte() {
    const { token, user } = useAuth();
    const { addToast } = useToast();

    // Estado Planos
    const [planos, setPlanos] = useState<PlanoCorte[]>([]);
    const [loadingPlanos, setLoadingPlanos] = useState(false);
    const [exibirTodosPlanos, setExibirTodosPlanos] = useState(false);
    const [planoSel, setPlanoSel] = useState<PlanoCorte | null>(null);
    const [itemSel, setItemSel] = useState<ItemPlano | null>(null);

    // Filtros Planos
    const [fPDesc, setFPDesc] = useState('');
    const [fPEsp, setFPEsp] = useState('');
    const [fPMat, setFPMat] = useState('');
    const [fPId, setFPId] = useState('');

    // Estado Itens
    const [itens, setItens] = useState<ItemPlano[]>([]);
    const [loadingItens, setLoadingItens] = useState(false);
    const [exibirTodosItens, setExibirTodosItens] = useState(false);

    // Filtros Itens
    const [fIProj, setFIProj] = useState('');
    const [fITag, setFITag] = useState('');
    const [fIRes, setFIRes] = useState('');
    const [fICod, setFICod] = useState('');

    // Modal de Lançamento
    const [modalLancarOpen, setModalLancarOpen] = useState(false);
    const [lancarItem, setLancarItem] = useState<ItemPlano | null>(null);
    const [lancarSaldo, setLancarSaldo] = useState(0);
    const [tipoApontamento, setTipoApontamento] = useState<'Total' | 'Parcial'>('Total');
    const [qtdeApontar, setQtdeApontar] = useState('');

    const fetchPlanos = useCallback(async () => {
        setLoadingPlanos(true);
        try {
            const params = new URLSearchParams({ exibirTodos: String(exibirTodosPlanos) });
            if (fPDesc.trim()) params.set('descplanodecorte', fPDesc.trim());
            if (fPEsp.trim())  params.set('Espessura', fPEsp.trim());
            if (fPMat.trim())  params.set('MaterialSW', fPMat.trim());
            if (fPId.trim())   params.set('IdPlanodeCorte', fPId.trim());

            const res = await fetch(`/api/producao-plano-corte/lista?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const contentType = res.headers.get('content-type');
            if (!res.ok) {
                const errData = (contentType && contentType.includes('application/json')) ? await res.json() : null;
                const msg = errData?.message || `Erro HTTP ${res.status}`;
                throw new Error(msg);
            }

            if (contentType && !contentType.includes('application/json')) {
                throw new Error('O servidor retornou um formato inesperado (HTML).');
            }

            const result = await res.json();
            if (result.success) {
                setPlanos(result.data || []);
                if (result.data.length === 0 && result.message) {
                    addToast({ type: 'info', title: 'Busca Concluída', message: result.message });
                }
            } else {
                addToast({ type: 'warning', title: 'Aviso', message: result.message || 'Houve um problema ao carregar os dados.' });
            }
        } catch (e: any) {
            console.error('Erro fetchPlanos:', e);
            addToast({ 
                type: 'error', 
                title: 'Erro ao Carregar', 
                message: `Não foi possível listar os planos. Detalhe: ${e.message}` 
            });
        } finally { setLoadingPlanos(false); }
    }, [exibirTodosPlanos, fPDesc, fPEsp, fPMat, fPId, token]);

    const fetchItens = useCallback(async () => {
        if (!planoSel) { setItens([]); return; }
        setLoadingItens(true);
        try {
            const params = new URLSearchParams({ exibirTodos: String(exibirTodosItens) });
            if (fIProj.trim()) params.set('Projeto', fIProj.trim());
            if (fITag.trim())  params.set('Tag', fITag.trim());
            if (fIRes.trim())  params.set('DescResumo', fIRes.trim());
            if (fICod.trim())  params.set('CodMatFabricante', fICod.trim());

            const res = await fetch(`/api/producao-plano-corte/itens/${planoSel.IdPlanodecorte}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                addToast({ type: 'warning', title: 'Sessão Expirada', message: 'Faça login novamente para continuar.' });
                return;
            }

            const contentType = res.headers.get('content-type');
            if (!res.ok || (contentType && !contentType.includes('application/json'))) {
                throw new Error(`Erro HTTP ${res.status}`);
            }

            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else addToast({ type: 'error', title: 'Aviso', message: result.message || 'Nenhum item encontrado para este plano.' });
        } catch (e: any) {
            console.error('Erro fetchItens:', e);
            addToast({ 
                type: 'error', 
                title: 'Erro de Leitura', 
                message: 'Não conseguimos ler os detalhes dos itens. Tente atualizar a visão ou contate o suporte.' 
            });
        } finally { setLoadingItens(false); }
    }, [planoSel, exibirTodosItens, fIProj, fITag, fIRes, fICod, token]);

    const [loadingAcao, setLoadingAcao] = useState(false);

    const handleAbrirPasta = async () => {
        if (!planoSel) { addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte.' }); return; }
        const endereco = planoSel.EnderecoCompletoPlanoCorte;
        if (!endereco) { addToast({ type: 'warning', title: 'Atenção', message: 'Este plano não possui pasta configurada.' }); return; }
        try {
            const res = await fetch('/api/system/open-folder', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: endereco })
            });
            const result = await res.json();
            if (result.success) addToast({ type: 'success', title: 'Pasta Aberta', message: 'O Explorer foi aberto na pasta do plano.' });
            else addToast({ type: 'error', title: 'Erro', message: result.message || 'Não foi possível abrir a pasta.' });
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha na comunicação: ' + e.message });
        }
    };

    const handleLiberarProducao = async () => {
        if (!planoSel) { addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte.' }); return; }
        if (planoSel.LiberacaoParaCorte === 'S') {
            addToast({ type: 'warning', title: 'Atenção', message: 'Plano de corte já liberado para produção!' }); return;
        }
        if (!confirm(`Deseja Liberar o Plano de Corte - ${planoSel.IdPlanodecorte}, para produção?`)) return;
        setLoadingAcao(true);
        try {
            const res = await fetch(`/api/producao-plano-corte/${planoSel.IdPlanodecorte}/liberar-producao`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Liberado', message: result.message });
                fetchPlanos();
                setPlanoSel(null); // Limpa seleção para forçar recarregamento se necessário
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao liberar plano.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro de comunicação: ' + e.message });
        } finally { setLoadingAcao(false); }
    };

    const handleFinalizarPlano = async () => {
        if (!planoSel) { addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte.' }); return; }
        
        if (planoSel.Concluido && planoSel.Concluido.trim() !== '') {
            addToast({ type: 'warning', title: 'Atenção', message: 'Este plano já está concluído!' });
            return;
        }

        const itensPendentes = itens.filter(it => !it.sttxtCorte || it.sttxtCorte.trim() === '');
        let confirmMsg = `Deseja Finalizar o PC - ${planoSel.IdPlanodecorte}?`;
        
        if (itensPendentes.length > 0) {
            confirmMsg = `Existem ${itensPendentes.length} itens pendentes neste plano. Deseja Finalizar o Plano de Corte - ${planoSel.IdPlanodecorte} e concluir as peças automaticamente?`;
        }

        if (!confirm(confirmMsg)) return;

        setLoadingAcao(true);
        try {
            const res = await fetch(`/api/producao-plano-corte/${planoSel.IdPlanodecorte}/finalizar`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Plano Finalizado', message: result.message });
                fetchPlanos();
                setPlanoSel(null);
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao finalizar plano.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Erro de comunicação: ' + e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleAbrirDesenho = async (it: ItemPlano, tipo: '3D' | 'PDF' | 'DXF' | 'PDF_ITEM') => {
        let path = '';

        switch (tipo) {
            case '3D': path = it.EnderecoArquivo; break;
            case 'PDF': path = it.EnderecoArquivo; break;
            case 'PDF_ITEM': path = it.EnderecoArquivoItemOrdemServico; break;
            case 'DXF': 
                path = it.EnderecoArquivo; 
                break;
        }

        if (!path) {
            addToast({ type: 'warning', title: 'Aviso', message: 'Caminho do arquivo não localizado para este item.' });
            return;
        }

        try {
            const res = await fetch('/api/plano-corte/abrir-desenho', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: path, tipo, it })
            });
            const result = await res.json();
            if (!result.success) {
                addToast({ type: 'error', title: 'Erro ao Abrir', message: result.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha na rede: ' + e.message });
        }
    };

    const handleLancarProducao = (it: ItemPlano) => {
        if (!planoSel) return;
        if (!planoSel.LiberacaoParaCorte || planoSel.LiberacaoParaCorte.trim() === '') {
            addToast({ type: 'warning', title: 'Atenção', message: 'Plano de corte não liberado para iniciar o corte.' });
            return;
        }

        if (it.OrdemServicoItemFinalizado === 'C' || it.sttxtCorte === 'C') {
            addToast({ type: 'info', title: 'Aviso', message: 'Item já finalizado!' });
            return;
        }

        const qtde = Number(it.QtdeTotal) || 0;
        const executar = Number(it.CorteTotalExecutar) || 0 || qtde;
        const saldo = executar;

        setLancarItem(it);
        setLancarSaldo(saldo);
        setTipoApontamento('Total');
        setQtdeApontar('');
        setModalLancarOpen(true);
    };

    const confirmLancarProducao = async () => {
        if (!planoSel || !lancarItem) return;
        
        let entrada = lancarSaldo; // Por padrão, se Total, a entrada é todo o saldo

        if (tipoApontamento === 'Parcial') {
            entrada = parseFloat(qtdeApontar.replace(',', '.'));
            if (isNaN(entrada) || entrada <= 0 || entrada > lancarSaldo) {
                addToast({ type: 'error', title: 'Valor Inválido', message: `Informe um valor entre 1 e ${lancarSaldo}.` });
                return;
            }
        }

        setLoadingAcao(true);
        try {
            const res = await fetch(`/api/producao-plano-corte/itens/${lancarItem.IdOrdemServicoItem}/lancar-producao`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    entrada,
                    idPlanodecorte: planoSel.IdPlanodecorte,
                    TipoApontamento: tipoApontamento,
                    usuario: user?.NomeCompleto || user?.nome || 'Sistema'
                })
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                setModalLancarOpen(false);
                fetchItens();
                fetchPlanos(); 
            } else {
                addToast({ type: 'error', title: 'Erro no Lançamento', message: result.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro de Comunicação', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    useEffect(() => { fetchPlanos(); }, [exibirTodosPlanos]);
    useEffect(() => { 
        setItemSel(null);
        fetchItens(); 
    }, [planoSel, exibirTodosItens]);

    const limparFiltrosPlanos = () => {
        setFPDesc(''); setFPEsp(''); setFPMat(''); setFPId(''); 
        setExibirTodosPlanos(false);
        setTimeout(fetchPlanos, 50);
    };

    const limparFiltrosItens = () => {
        setFIProj(''); setFITag(''); setFIRes(''); setFICod('');
        setExibirTodosItens(false);
        setTimeout(fetchItens, 50);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-50 p-3 gap-3">
            
            <div className={`flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${planoSel ? 'h-1/3' : 'h-full'}`}>
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                            <Scissors size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">Produção — Planos de Corte</h2>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Visão Execução Fábrica</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-inner focus-within:border-blue-400">
                            <Search size={12} className="text-slate-400" />
                            <input type="text" placeholder="ID" value={fPId} onChange={e=>setFPId(e.target.value)} className="w-12 text-[10px] outline-none font-bold text-blue-700" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            <input type="text" placeholder="Descrição..." value={fPDesc} onChange={e=>setFPDesc(e.target.value)} className="w-32 text-[10px] outline-none border-l border-slate-100 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            <input type="text" placeholder="Esp..." value={fPEsp} onChange={e=>setFPEsp(e.target.value)} className="w-16 text-[10px] outline-none border-l border-slate-100 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchPlanos()} />
                            {(fPId || fPDesc || fPEsp || fPMat) && (
                                <button onClick={limparFiltrosPlanos} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                            )}
                        </div>
                        
                        <button onClick={fetchPlanos} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><RefreshCw size={14} className={loadingPlanos ? 'animate-spin':''}/></button>

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                            <button
                                onClick={handleAbrirPasta}
                                disabled={!planoSel}
                                className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Abrir Pasta Plano de Corte"
                            >
                                <FolderOpen size={16} />
                            </button>
                            <button
                                onClick={handleLiberarProducao}
                                disabled={!planoSel || planoSel.LiberacaoParaCorte === 'S' || loadingAcao}
                                className={`p-2 border rounded-lg transition-colors shadow-sm disabled:cursor-not-allowed ${
                                    planoSel?.LiberacaoParaCorte === 'S'
                                        ? 'bg-gray-50 text-gray-400 border-gray-200 opacity-50'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 disabled:opacity-40'
                                }`}
                                title={planoSel?.LiberacaoParaCorte === 'S' ? 'Plano já liberado para produção' : 'Liberar Plano de Corte para Produção'}
                            >
                                {loadingAcao ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                            <button
                                onClick={handleFinalizarPlano}
                                disabled={!planoSel || loadingAcao}
                                className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Finalizar Plano de Corte"
                            >
                                <Flag size={16} />
                            </button>
                        </div>

                        <button 
                            onClick={()=>setExibirTodosPlanos(!exibirTodosPlanos)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${exibirTodosPlanos ? 'bg-emerald-500 text-white border-emerald-600 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {exibirTodosPlanos ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                            {exibirTodosPlanos ? 'TODOS' : 'PENDENTES'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    {loadingPlanos && (
                        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    )}
                    <table className="w-full text-[11px] text-left border-separate border-spacing-0">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">ID</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Descrição</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Espessura</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Material SW</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 italic">Liberação Eng.</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">Liberado em</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Início</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Fim</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Peças</th>
                                <th className="px-3 py-2 font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">Exec.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planos.map(p => (
                                <tr 
                                    key={p.IdPlanodecorte} 
                                    onClick={()=>setPlanoSel(p)}
                                    className={`group cursor-pointer transition-colors border-b border-slate-50 ${planoSel?.IdPlanodecorte === p.IdPlanodecorte ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-100' : 'hover:bg-slate-50'}`}
                                >
                                    <td className="px-3 py-1.5 font-black text-blue-600">{p.IdPlanodecorte}</td>
                                    <td className="px-3 py-1.5 font-bold text-slate-700">{p.DescPlanodecorte || '—'}</td>
                                    <td className="px-3 py-1.5 font-black text-slate-600 uppercase italic">{p.Espessura || '—'}</td>
                                    <td className="px-3 py-1.5 font-medium text-slate-500">{p.MaterialSW || '—'}</td>
                                    <td className="px-3 py-1.5 text-blue-500 italic font-medium">{fmt(p.DataLiberacao)}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{fmt(p.DataLiberacaoParaCorte)}</td>
                                    <td className="px-3 py-1.5 text-center text-slate-500 font-mono">{fmt(p.DataInicial)}</td>
                                    <td className="px-3 py-1.5 text-center text-slate-500 font-mono">{fmt(p.DataFinal)}</td>
                                    <td className="px-3 py-1.5 text-center font-black text-indigo-600 bg-indigo-50/30">{p.QtdeTotalPecas ?? 0}</td>
                                    <td className="px-3 py-1.5 text-center font-black text-emerald-600 bg-emerald-50/30">{p.QtdeTotalPecasExecutadas ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {planoSel ? (
                <div className="flex flex-col flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between px-4 py-2 bg-indigo-50/50 border-b border-indigo-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                                <Database size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-indigo-900 tracking-tight leading-none">Itens do Plano #{planoSel.IdPlanodecorte}</h2>
                                <p className="text-[10px] text-indigo-500 uppercase font-black tracking-widest mt-0.5">{planoSel.DescPlanodecorte}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white border border-indigo-100 rounded-lg px-2 py-1 shadow-sm focus-within:border-indigo-400">
                                <Search size={12} className="text-indigo-300" />
                                <input type="text" placeholder="Projeto" value={fIProj} onChange={e=>setFIProj(e.target.value)} className="w-24 text-[10px] outline-none font-bold" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                <input type="text" placeholder="Tag" value={fITag} onChange={e=>setFITag(e.target.value)} className="w-20 text-[10px] outline-none border-l border-indigo-50 pl-1.5" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                <input type="text" placeholder="Fabricante..." value={fICod} onChange={e=>setFICod(e.target.value)} className="w-28 text-[10px] outline-none border-l border-indigo-50 pl-1.5 uppercase" onKeyDown={e=>e.key==='Enter'&&fetchItens()} />
                                {(fIProj || fITag || fIRes || fICod) && (
                                    <button onClick={limparFiltrosItens} className="p-0.5 text-indigo-200 hover:text-red-500 transition-colors"><X size={12}/></button>
                                )}
                            </div>

                            <button onClick={fetchItens} className="p-1.5 text-indigo-400 hover:bg-white rounded-lg transition-colors"><RefreshCw size={14} className={loadingItens ? 'animate-spin':''}/></button>

                            <button 
                                onClick={()=>setExibirTodosItens(!exibirTodosItens)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${exibirTodosItens ? 'bg-emerald-600 text-white border-emerald-700 shadow-inner' : 'bg-white text-indigo-500 border-indigo-200 hover:bg-indigo-50'}`}
                            >
                                {exibirTodosItens ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                                {exibirTodosItens ? 'INCL. CONCLUÍDOS' : 'PENDENTES'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar relative">
                        {loadingItens && (
                            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                            </div>
                        )}
                        <table className="w-full text-[10px] text-left border-separate border-spacing-0">
                            <thead className="bg-indigo-50/30 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Ações</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Fabricante</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Projeto</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Tag</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Resumo</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Qtde</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Cortado</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">A Cortar</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center min-w-[100px]">Parcial</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Início Corte</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100 text-center">Final Corte</th>
                                    <th className="px-3 py-2 font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-100">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens.length > 0 ? itens.map((it, idx) => {
                                    const executado = Number(it.CorteTotalExecutado) || 0;
                                    const qtde      = Number(it.QtdeTotal) || 0;
                                    const executar  = Number(it.CorteTotalExecutar) || 0 || qtde;
                                    const total     = executado + executar;
                                    const pct       = total > 0 ? Math.min(100, Math.round((executado / total) * 100)) : 0;
                                    const finalizado = it.sttxtCorte === 'C';
                                    const selecionado = itemSel?.IdOrdemServicoItem === it.IdOrdemServicoItem;
                                    return (
                                        <tr 
                                            key={`${it.IdOrdemServicoItem}-${idx}`} 
                                            onClick={() => setItemSel(it)}
                                            className={`group cursor-pointer transition-colors border-b border-slate-50 ${selecionado ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-100' : 'hover:bg-slate-50'} ${finalizado ? 'opacity-60' : ''}`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className={`flex items-center gap-1 transition-all duration-200 ${selecionado ? 'opacity-100' : 'opacity-30 pointer-events-none grayscale'}`}>
                                                    <button onClick={() => handleAbrirDesenho(it, '3D')} className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors" title="Abrir 3D (SolidWorks)"><Box size={14}/></button>
                                                    <button onClick={() => handleAbrirDesenho(it, 'PDF')} className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors" title="Abrir Desenho PDF"><FileText size={14}/></button>
                                                    <button onClick={() => handleAbrirDesenho(it, 'DXF')} className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-colors" title="Abrir Desenho DXF"><Layers size={14}/></button>
                                                    <button onClick={() => handleAbrirDesenho(it, 'PDF_ITEM')} className="p-1 hover:bg-amber-100 text-amber-600 rounded transition-colors" title="Abrir PDF do Item"><FileCode size={14}/></button>
                                                    <div className="w-px h-3 bg-slate-200 mx-1"></div>
                                                    <button onClick={() => handleLancarProducao(it)} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded transition-colors" title="Lançar Produção de Peças Cortadas"><ClipboardCheck size={14}/></button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 font-black text-slate-800 uppercase tabular-nums">{it.CodMatFabricante}</td>
                                            <td className="px-3 py-2 font-bold text-slate-700">{it.Projeto}</td>
                                            <td className="px-3 py-2 font-black text-blue-600">{it.Tag}</td>
                                            <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={it.DescResumo}>{it.DescResumo}</td>
                                            <td className="px-3 py-2 text-center font-black text-indigo-600">{it.QtdeTotal}</td>
                                            <td className="px-3 py-2 text-center font-black text-emerald-600">{executado}</td>
                                            <td className="px-3 py-2 text-center font-black text-orange-600">{executar}</td>
                                            <td className="px-2 py-2">
                                                <div className="flex flex-col gap-0.5 w-full min-w-[100px]">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="text-[9px] font-black text-slate-700 tabular-nums">{executado}/{qtde}</span>
                                                        <span className="text-[9px] font-black text-indigo-600">{pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-500': pct > 0 ? 'bg-amber-400': 'bg-slate-200'}`} style={{width:`${pct}%`}}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500 font-mono text-[9px]">{it.RealizadoInicioCorte ? fmt(it.RealizadoInicioCorte) : '—'}</td>
                                            <td className="px-3 py-2 text-center text-slate-500 font-mono text-[9px]">{it.RealizadoFinalCorte ? fmt(it.RealizadoFinalCorte) : '—'}</td>
                                            <td className="px-3 py-2">
                                                {finalizado ? (
                                                    <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-black text-[8px]"><CheckCircle2 size={8}/>CONCLUÍDO</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-black text-[8px]"><Clock size={8}/>PENDENTE</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={11} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest opacity-40">
                                        {exibirTodosItens ? 'Nenhum item encontrado neste plano' : 'Nenhum item pendente — ative "Incl. Concluídos" para ver todos'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-xl opacity-60">
                    <div className="p-4 bg-slate-50 rounded-full mb-3 text-slate-300">
                        <ArrowRight size={48} className="-rotate-45" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecione um plano de corte acima para ver seus itens</p>
                </div>
            )}

            {modalLancarOpen && lancarItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-[#1A2E35] p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ClipboardCheck size={80} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-white">Lançar Produção - Plano de Corte</h3>
                                <p className="text-[#8B9A96] text-xs font-bold uppercase tracking-wider mt-1">{lancarItem.CodMatFabricante}</p>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex bg-gray-100 p-1 mb-4 rounded-lg border border-gray-200">
                                <button 
                                    onClick={() => { setTipoApontamento('Total'); setQtdeApontar(''); }}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tipoApontamento === 'Total' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Apontamento Total
                                </button>
                                <button 
                                    onClick={() => { setTipoApontamento('Parcial'); setQtdeApontar(''); }}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${tipoApontamento === 'Parcial' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Apontamento Parcial
                                </button>
                            </div>

                            {tipoApontamento === 'Parcial' && (
                                <div className="mb-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Quantidade a Produzir</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={lancarSaldo}
                                            value={qtdeApontar}
                                            onChange={(e) => setQtdeApontar(e.target.value)}
                                            className="flex-1 px-3 py-2 text-xl font-black text-center rounded-lg border-2 border-gray-100 hover:border-blue-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all bg-white text-gray-800"
                                            placeholder="0"
                                        />
                                        <div className="flex flex-col gap-1 w-28">
                                            <button
                                                onClick={() => setQtdeApontar(String(lancarSaldo))}
                                                className="flex-1 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                            >
                                                Restante ({lancarSaldo})
                                            </button>
                                            <button
                                                onClick={() => setQtdeApontar('1')}
                                                className="flex-1 py-1 text-[10px] font-bold bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                                            >
                                                Unidade (1)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tipoApontamento === 'Total' && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center mb-4">
                                    <div className="text-xs text-blue-600 font-bold mb-1">Quantidade a ser concluída</div>
                                    <div className="text-3xl font-black text-blue-900">{lancarSaldo}</div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    onClick={() => setModalLancarOpen(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmLancarProducao}
                                    disabled={loadingAcao || (tipoApontamento === 'Parcial' && (!qtdeApontar || Number(qtdeApontar) <= 0))}
                                    className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    Confirmar Apontamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
