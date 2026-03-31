import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Scissors, Loader2, Filter, Database,
    SplitSquareHorizontal, FileType2,
    CheckCircle2, Clock, Search, X, RefreshCw,
    PlusCircle, AlertCircle, FolderOpen, Send, CheckCircle, RotateCcw, RefreshCcw,
    Lock, Unlock, Trash2, FileSpreadsheet,
    Box, FileText, Wrench, Flame, Paintbrush, Settings2,
    ShieldAlert, User, CalendarDays, Edit3, Shield, ArrowRight
} from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// --- Interfaces ---
interface OSItem {
    CodMatFabricante: string;
    Espessura: string;
    MaterialSW: string;
    IdEmpresa: number;
    IdProjeto: number;
    IdTag: number;
    QtdeTotal: number;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    IdPlanoDeCorte: number | null;
    Projeto: string;
    Tag: string;
    EnderecoArquivo: string;
    DescTag: string;
    DescResumo: string;
    DescDetal: string;
}

interface PlanoCorte {
    IdPlanodecorte: number;
    DescPlanodecorte: string;
    Espessura: string;
    MaterialSW: string;
    DataCad: string | null;
    DataLimite: string | null;
    CriadoPor: string | null;
    Enviadocorte: string | null;
    Concluido: string | null;
    DataInicial: string | null;
    DataFinal: string | null;
    QtdeTotalPecas: number | null;
    QtdeTotalPecasExecutadas: number | null;
    EnderecoCompletoPlanoCorte: string | null;
}

interface ItemAglutinado {
    Espessura: string;
    MaterialSW: string;
    CodMatFabricante: string;
    IdOrdemServicoItem: number;
    IdOrdemServico: number;
    EnderecoArquivo: string;
    QtdeTotal: number;
}

interface ItemIndividual {
    OrdemServicoItemFinalizado: string | null;
    IdOrdemServico: number;
    IdOrdemServicoItem: number;
    Espessura: string;
    MaterialSW: string;
    CodMatFabricante: string;
    Projeto: string;
    Tag: string;
    QtdeTotal: number;
    Acabamento: string | null;
    DescResumo: string;
    DescDetal: string;
    EnderecoArquivo: string;
}

interface RncFormData {
    idRnc: number;
    projeto: string;
    idProjeto: string;
    tag: string;
    idTag: string;
    descTag: string;
    cliente: string;
    codMatFabricante: string;
    descricao: string;
    setor: string;
    usuario: string;
    tipoTarefa: string;
    dataExec: string;
    titulo: string;
    subTitulo: string;
    espessura: string;
    materialSW: string;
    chkCorte: boolean;
    chkDobra: boolean;
    chkSolda: boolean;
    chkPintura: boolean;
    chkMontagem: boolean;
}

interface Rnc { 
    IdRnc: number; 
    Estatus: string; 
    Tag: string; 
    SetorResponsavel: string; 
    DescricaoPendencia: string; 
    DescResumo: string; 
    UsuarioResponsavel: string; 
    TipoTarefa?: string; 
    DataExecucao?: string; 
    DataCriacao: string; 
    DataFinalizacao: string; 
    UsuarioResponsavelFinalizacao?: string; 
    SetorResponsavelFinalizacao?: string; 
    DescricaoFinalizacao?: string; 
    DescEmpresa?: string; 
    DescTag?: string; 
}

const SECTORS = [
    { k: 'Corte', c: 'bg-blue-600' }, 
    { k: 'Dobra', c: 'bg-indigo-600' },
    { k: 'Solda', c: 'bg-red-600' }, 
    { k: 'Pintura', c: 'bg-amber-500' },
    { k: 'Montagem', c: 'bg-emerald-600' },
];

function fmt(val: string | null): string {
    if (!val) return '-';
    const s = String(val).trim();
    const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[1]}/${br[2]}/${br[3]}`;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return s;
}

// ============================================================
// Painel Itens do Plano Selecionado
// ============================================================
function PainelItensPlano({ plano, onFechar, aglutinado, setAglutinado, onGerarRnc, onItemRemoved }: { 
    plano: PlanoCorte; 
    onFechar: () => void; 
    aglutinado: boolean; 
    setAglutinado: (val: boolean) => void;
    onGerarRnc: (item: any) => void;
    onItemRemoved?: () => void;
}) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [itens, setItens] = useState<(ItemAglutinado | ItemIndividual)[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fItem, setFItem] = useState('');
    const [itemInternoSelecionadoId, setItemInternoSelecionadoId] = useState<number | null>(null);

    const fetchItens = async (agl: boolean = aglutinado, item: string = fItem) => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ aglutinado: String(agl) });
            if (item.trim()) params.set('IdOrdemServicoItem', item.trim());
            const res = await fetch(`/api/plano-corte/itens/${plano.IdPlanodecorte}?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else setError(result.message || 'Erro ao buscar itens');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchItens(); }, [plano.IdPlanodecorte]);

    const handleToggle = () => { const novo = !aglutinado; setAglutinado(novo); fetchItens(novo, fItem); };

    // Estados para persistir quais itens foram "abertos" (cor azul claro como no VB)
    const [itensAbertos, setItensAbertos] = useState<Set<number>>(new Set());

    const handleAbrirDesenho = async (filePath: string, tipo: '3D' | 'PDF', itemId: number) => {
        if (!filePath) {
            addToast({ type: 'error', title: 'Erro', message: 'Caminho do arquivo não disponível.' });
            return;
        }
        try {
            const res = await fetch('/api/plano-corte/abrir-desenho', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ filePath, tipo })
            });
            const result = await res.json();
            if (result.success) {
                // Marca o item como aberto para mudar a cor da linha
                setItensAbertos(prev => new Set([...prev, itemId]));
                addToast({ type: 'success', title: 'Desenho Aberto', message: `O arquivo ${tipo} foi aberto no servidor.` });
            } else {
                addToast({ type: 'error', title: 'Arquivo não encontrado', message: result.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        }
    };

    const handleRemoverItem = async (itemId: number) => {
        if (window.confirm('Deseja realmente remover este item do Plano de Corte? O item voltará a ficar disponível para outros planos.')) {
            setLoading(true);
            try {
                const res = await fetch('/api/plano-corte/remover-item', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ idOrdemServicoItem: itemId })
                });
                const result = await res.json();
                if (result.success) {
                    addToast({ type: 'success', title: 'Removido', message: result.message });
                    fetchItens();
                    if (onItemRemoved) onItemRemoved();
                } else {
                    addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao remover item.' });
                }
            } catch (e: any) {
                addToast({ type: 'error', title: 'Erro', message: e.message });
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="flex flex-col bg-white rounded-xl shadow border border-indigo-200 overflow-hidden" style={{ minHeight: 220, maxHeight: 360 }}>
            <div className="shrink-0 bg-indigo-50 border-b border-indigo-200 px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-indigo-600 text-white rounded flex items-center justify-center shrink-0"><Database size={12} /></div>
                    <span className="text-xs font-black text-indigo-800">Itens do Plano #{plano.IdPlanodecorte}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-white border border-indigo-200 rounded px-1.5 focus-within:border-indigo-400 w-28">
                        <Search size={9} className="text-indigo-300 mr-1 shrink-0" />
                        <input type="text" placeholder="Filtrar item OS..." value={fItem}
                            onChange={e => setFItem(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchItens(aglutinado, fItem)}
                            className="w-full text-[10px] py-0.5 outline-none bg-transparent text-slate-700 placeholder:text-indigo-300" />
                    </div>
                    <button onClick={() => fetchItens(aglutinado, fItem)} className="p-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"><Search size={10} /></button>
                    <button onClick={handleToggle} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${aglutinado ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}>
                        {aglutinado ? 'Aglutinado' : 'Individual'}
                    </button>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{loading ? '...' : `${itens.length} itens`}</span>
                    <button onClick={onFechar} className="p-1 rounded hover:bg-indigo-100 text-indigo-400" title="Fechar"><X size={13} /></button>
                </div>
            </div>
            {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5"><AlertCircle size={12} />{error}</div>}
            <div className="flex-1 overflow-auto relative">
                {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={20} /></div>}
                {aglutinado ? (
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Material SW</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde Total</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Endereco Arquivo</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.length > 0 ? (itens as ItemAglutinado[]).map((it, i) => {
                                const isSelected = it.IdOrdemServicoItem === itemInternoSelecionadoId;
                                return (
                                    <tr key={i} 
                                        onClick={() => setItemInternoSelecionadoId(isSelected ? null : it.IdOrdemServicoItem)}
                                        className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                            isSelected ? 'bg-blue-50 border-blue-300' : 
                                            itensAbertos.has(it.IdOrdemServicoItem) ? 'bg-cyan-50' : 'hover:bg-indigo-50/30'
                                        }`}
                                    >
                                        <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">{it.IdOrdemServico} / {it.IdOrdemServicoItem}</td>
                                        <td className="px-2 py-1 text-[10px] font-semibold">{it.Espessura || '-'}</td>
                                        <td className="px-2 py-1 text-[10px]">{it.MaterialSW || '-'}</td>
                                        <td className="px-2 py-1 text-[9px] font-mono text-slate-500">{it.CodMatFabricante || '-'}</td>
                                        <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{it.QtdeTotal}</td>
                                        <td className="px-2 py-1 text-[9px] text-slate-400 max-w-[200px] truncate" title={it.EnderecoArquivo}>{it.EnderecoArquivo || '-'}</td>
                                        <td className="px-2 py-1 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Ícone 3D */}
                                                <button
                                                    onClick={() => handleAbrirDesenho(it.EnderecoArquivo, '3D', it.IdOrdemServicoItem)}
                                                    disabled={!isSelected || !it.CodMatFabricante || !it.EnderecoArquivo}
                                                    className="p-1 px-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Abrir Desenho 3D"}
                                                >
                                                    <Box size={13} />
                                                </button>
                                                {/* Ícone PDF */}
                                                <button
                                                    onClick={() => handleAbrirDesenho(it.EnderecoArquivo, 'PDF', it.IdOrdemServicoItem)}
                                                    disabled={!isSelected || !it.CodMatFabricante || !it.EnderecoArquivo}
                                                    className="p-1 px-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Abrir Desenho PDF"}
                                                >
                                                    <FileText size={13} />
                                                </button>
                                                {/* Gerar RNC */}
                                                <button
                                                    onClick={() => onGerarRnc(it)}
                                                    disabled={!isSelected}
                                                    className="p-1 px-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Gerar Pendência (RNC)"}
                                                >
                                                    <ShieldAlert size={13} />
                                                </button>
                                                {/* Remover do Plano */}
                                                <button
                                                    onClick={() => handleRemoverItem(it.IdOrdemServicoItem)}
                                                    disabled={!isSelected}
                                                    className="p-1 px-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Excluir Item do Plano de Corte"}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum item'}</td></tr>}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Projeto</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Tag</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Material</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Acabamento</th>
                                <th className="px-2 py-1.5 font-black whitespace-nowrap">Desc. Resumo</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Finalizado</th>
                                <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itens.length > 0 ? (itens as ItemIndividual[]).map((it, i) => {
                                const fin = it.OrdemServicoItemFinalizado === 'C';
                                const isSelected = it.IdOrdemServicoItem === itemInternoSelecionadoId;
                                return (
                                    <tr key={i} 
                                        onClick={() => setItemInternoSelecionadoId(isSelected ? null : it.IdOrdemServicoItem)}
                                        className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                            isSelected ? 'bg-blue-50 border-blue-300 shadow-inner' : 
                                            fin ? 'opacity-50' : 
                                            itensAbertos.has(it.IdOrdemServicoItem) ? 'bg-cyan-50' : 'hover:bg-indigo-50/30'
                                        }`}
                                    >
                                        <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">{it.IdOrdemServico} / {it.IdOrdemServicoItem}</td>
                                        <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[60px] truncate">{it.Projeto}</td>
                                        <td className="px-2 py-1 text-[10px] font-bold text-indigo-700 whitespace-nowrap">{it.Tag}</td>
                                        <td className="px-2 py-1 text-[10px] font-semibold">{it.Espessura || '-'}</td>
                                        <td className="px-2 py-1 text-[10px]">{it.MaterialSW || '-'}</td>
                                        <td className="px-2 py-1 text-[9px] font-mono text-slate-500">{it.CodMatFabricante || '-'}</td>
                                        <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{it.QtdeTotal}</td>
                                        <td className="px-2 py-1 text-[10px] text-slate-500">{it.Acabamento || '-'}</td>
                                        <td className="px-2 py-1 text-[10px] max-w-[100px] truncate" title={it.DescResumo}>{it.DescResumo}</td>
                                        <td className="px-2 py-1 text-center">
                                            {fin
                                                ? <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded px-1 py-0.5 text-[9px] font-bold"><CheckCircle2 size={8} />Sim</span>
                                                : <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 rounded px-1 py-0.5 text-[9px] font-bold"><Clock size={8} />Nao</span>}
                                        </td>
                                        <td className="px-2 py-1 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleAbrirDesenho(it.EnderecoArquivo, '3D', it.IdOrdemServicoItem)}
                                                    disabled={!isSelected || !it.CodMatFabricante || !it.EnderecoArquivo}
                                                    className="p-1 px-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Abrir Desenho 3D"}
                                                >
                                                    <Box size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleAbrirDesenho(it.EnderecoArquivo, 'PDF', it.IdOrdemServicoItem)}
                                                    disabled={!isSelected || !it.CodMatFabricante || !it.EnderecoArquivo}
                                                    className="p-1 px-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Abrir Desenho PDF"}
                                                >
                                                    <FileText size={13} />
                                                </button>
                                                {/* Gerar RNC Individual vindo do grid de itens */}
                                                <button
                                                    onClick={() => onGerarRnc(it)}
                                                    disabled={!isSelected}
                                                    className="p-1 px-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Gerar Pendência (RNC)"}
                                                >
                                                    <ShieldAlert size={13} />
                                                </button>
                                                {/* Remover do Plano Individual */}
                                                <button
                                                    onClick={() => handleRemoverItem(it.IdOrdemServicoItem)}
                                                    disabled={!isSelected}
                                                    className="p-1 px-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                                                    title={!isSelected ? "Selecione a linha primeiro" : "Excluir Item do Plano de Corte"}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : <tr><td colSpan={11} className="px-4 py-6 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum item'}</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Painel Esquerdo: Itens de Ordem de Servico (com selecao)
// ============================================================
function PainelItensOS({ tipoFiltro, onPlanosChange, onGerarRnc }: { 
    tipoFiltro: string; 
    onPlanosChange: () => void; 
    onGerarRnc: (item: any) => void;
}) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [itens, setItens] = useState<OSItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [fOS, setFOS] = useState('');
    const [fEsp, setFEsp] = useState('');
    const [fProjeto, setFProjeto] = useState('');
    const [fTag, setFTag] = useState('');
    const [fCod, setFCod] = useState('');
    const [fMat, setFMat] = useState('');
    const [itemFocadoId, setItemFocadoId] = useState<number | null>(null);
    const [itensAbertos, setItensAbertos] = useState<Set<number>>(new Set());

    const fetchItens = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/itens-disponiveis?tipoFiltro=${tipoFiltro}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erro ao buscar itens');
            const result = await res.json();
            if (result.success) setItens(result.data || []);
            else setError(result.message || 'Falha');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [tipoFiltro]);

    useEffect(() => { fetchItens(); }, [fetchItens]);

    const handleAbrirDesenho = async (filePath: string, tipo: '3D' | 'PDF', itemId: number) => {
        if (!filePath) {
            addToast({ type: 'error', title: 'Erro', message: 'Caminho do arquivo não disponível.' });
            return;
        }
        try {
            const res = await fetch('/api/plano-corte/abrir-desenho', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ filePath, tipo })
            });
            const result = await res.json();
            if (result.success) {
                setItensAbertos(prev => new Set([...prev, itemId]));
                addToast({ type: 'success', title: 'Desenho Aberto', message: `O arquivo ${tipo} foi aberto no servidor.` });
            } else {
                addToast({ type: 'error', title: 'Arquivo não encontrado', message: result.message });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        }
    };

    const filtered = useMemo(() => itens.filter(item => {
        if (fOS      && !String(item.IdOrdemServico || '').toLowerCase().includes(fOS.toLowerCase())) return false;
        if (fEsp     && !String(item.Espessura || '').toLowerCase().includes(fEsp.toLowerCase())) return false;
        if (fProjeto && !String(item.Projeto || '').toLowerCase().includes(fProjeto.toLowerCase())) return false;
        if (fTag     && !String(item.Tag || '').toLowerCase().includes(fTag.toLowerCase())) return false;
        if (fCod     && !String(item.CodMatFabricante || '').toLowerCase().includes(fCod.toLowerCase())) return false;
        if (fMat     && !String(item.MaterialSW || '').toLowerCase().includes(fMat.toLowerCase())) return false;
        return true;
    }), [itens, fOS, fEsp, fProjeto, fTag, fCod, fMat]);

    const handleLimpar = () => { setFOS(''); setFEsp(''); setFProjeto(''); setFTag(''); setFCod(''); setFMat(''); };

    const handleToggleRow = (id: number) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
        setItemFocadoId(id);
    };

    const handleToggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(i => i.IdOrdemServicoItem)));
        }
    };

    const handleIncluirNoPlano = async () => {
        if (selected.size === 0) return;
        setSalvando(true); setError(''); setSuccessMsg('');
        try {
            const res = await fetch('/api/plano-corte/incluir-itens', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ itens: Array.from(selected) })
            });
            const result = await res.json();
            if (result.success) {
                let msg = result.message;
                if (result.enderecos && result.enderecos.length > 0) {
                    msg += `. Caminho(s): ${result.enderecos.join(', ')}`;
                }
                setSuccessMsg(msg);
                setSelected(new Set());
                await fetchItens();     // atualiza lista de OS
                onPlanosChange();       // atualiza painel de planos
                setTimeout(() => setSuccessMsg(''), 10000); // 10s para dar tempo de ler o caminho
            } else {
                setError(result.message || 'Erro ao incluir itens');
            }
        } catch (e: any) { setError(e.message); }
        finally { setSalvando(false); }
    };

    const todosSelec = filtered.length > 0 && selected.size === filtered.length;
    const parcialSelec = selected.size > 0 && selected.size < filtered.length;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm"><Database size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Itens de Ordem de Serviço</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Selecione e inclua no plano de corte</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Contador de selecionados */}
                    {selected.size > 0 && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {selected.size} selecionado(s)
                        </span>
                    )}
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        {loading ? '...' : `${filtered.length} itens`}
                    </span>
                    {/* Ações */}
                    <div className="flex items-center gap-2">
                        <button onClick={handleIncluirNoPlano} disabled={selected.size === 0 || salvando} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-600 rounded-lg transition-all shadow-sm font-bold text-xs disabled:opacity-50">
                            {salvando ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                            Incluir no Plano
                        </button>
                        <button onClick={fetchItens} className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensagens */}
            {successMsg && (
                <div className="shrink-0 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-[10px] font-bold border-b border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 size={12} />{successMsg}
                </div>
            )}
            {error && (
                <div className="shrink-0 bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5">
                    <AlertCircle size={12} />{error}
                </div>
            )}

            {/* Filtros */}
            <div className="shrink-0 border-b border-slate-100 px-2 py-1.5 bg-white">
                <div className="flex flex-wrap gap-1 items-center">
                    <Filter size={11} className="text-slate-400 shrink-0" />
                    {[
                        { ph: 'OS',        val: fOS,      set: setFOS,      w: 'w-16' },
                        { ph: 'Espessura', val: fEsp,     set: setFEsp,     w: 'w-20' },
                        { ph: 'Projeto',   val: fProjeto, set: setFProjeto, w: 'w-24' },
                        { ph: 'Tag',       val: fTag,     set: setFTag,     w: 'w-20' },
                        { ph: 'Cod. Fab.', val: fCod,     set: setFCod,     w: 'w-24' },
                        { ph: 'Material',  val: fMat,     set: setFMat,     w: 'w-24' },
                    ].map(({ ph, val, set, w }) => (
                        <div key={ph} className={`flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 focus-within:border-indigo-400 ${w}`}>
                            <input type="text" placeholder={ph} value={val}
                                onChange={e => set(e.target.value)}
                                className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                        </div>
                    ))}
                    <button onClick={handleLimpar} className="flex items-center gap-0.5 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded">
                        <X size={10} />Limpar
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 overflow-auto relative">
                {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={24} /></div>}
                <table className="w-full text-left">
                    <thead className="text-[9px] text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                            <th className="px-2 py-1.5 w-6">
                                <input type="checkbox"
                                    checked={todosSelec}
                                    ref={el => { if (el) el.indeterminate = parcialSelec; }}
                                    onChange={handleToggleAll}
                                    className="cursor-pointer accent-indigo-600" />
                            </th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">OS / Item</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Projeto</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Tag</th>
                            <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Qtde</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Espessura</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Material SW</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Cod. Fab.</th>
                            <th className="px-2 py-1.5 font-black whitespace-nowrap">Desc. Resumo</th>
                            <th className="px-2 py-1.5 font-black text-center whitespace-nowrap">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((item, idx) => {
                            const isSelected = selected.has(item.IdOrdemServicoItem);
                            return (
                                <tr key={`${item.IdOrdemServicoItem}-${idx}`}
                                    onClick={() => handleToggleRow(item.IdOrdemServicoItem)}
                                    className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                        itemFocadoId === item.IdOrdemServicoItem ? 'bg-indigo-100 shadow-inner' : 
                                        isSelected ? 'bg-indigo-50/60' : 
                                        itensAbertos.has(item.IdOrdemServicoItem) ? 'bg-cyan-50' : 'hover:bg-indigo-50/40'
                                    }`}>
                                    <td className="px-2 py-1" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRow(item.IdOrdemServicoItem)}
                                            className="cursor-pointer accent-indigo-600" />
                                    </td>
                                    <td className="px-2 py-1 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                        {item.IdOrdemServico}<span className="text-slate-400 font-normal"> / {item.IdOrdemServicoItem}</span>
                                    </td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[70px] truncate" title={item.Projeto}>{item.Projeto}</td>
                                    <td className="px-2 py-1 text-[10px] font-bold text-indigo-700 whitespace-nowrap max-w-[60px] truncate" title={item.Tag}>{item.Tag}</td>
                                    <td className="px-2 py-1 text-[10px] text-center font-bold text-indigo-600 bg-indigo-50/60">{item.QtdeTotal}</td>
                                    <td className="px-2 py-1 text-[10px] font-semibold text-slate-700 whitespace-nowrap">{item.Espessura || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 whitespace-nowrap">{item.MaterialSW || '-'}</td>
                                    <td className="px-2 py-1 text-[9px] font-mono text-slate-500 whitespace-nowrap">{item.CodMatFabricante || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[100px] truncate" title={item.DescResumo}>{item.DescResumo}</td>
                                    <td className="px-2 py-1 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1.5">
                                            {/* Ícone 1 - 3D */}
                                            <button
                                                onClick={() => handleAbrirDesenho(item.EnderecoArquivo, '3D', item.IdOrdemServicoItem)}
                                                disabled={itemFocadoId !== item.IdOrdemServicoItem || !item.EnderecoArquivo}
                                                className="p-1 px-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                title={itemFocadoId !== item.IdOrdemServicoItem ? "Selecione a linha para habilitar" : "Abrir Desenho 3D"}
                                            >
                                                <Box size={13} />
                                            </button>
                                            {/* Ícone 2 - PDF */}
                                            <button
                                                onClick={() => handleAbrirDesenho(item.EnderecoArquivo, 'PDF', item.IdOrdemServicoItem)}
                                                disabled={itemFocadoId !== item.IdOrdemServicoItem || !item.EnderecoArquivo}
                                                className="p-1 px-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed shadow-sm"
                                                title={itemFocadoId !== item.IdOrdemServicoItem ? "Selecione a linha para habilitar" : "Abrir Desenho PDF"}
                                            >
                                                <FileText size={13} />
                                            </button>
                                            {/* Ícone 3 - RNC */}
                                            <button
                                                onClick={() => onGerarRnc(item)}
                                                disabled={itemFocadoId !== item.IdOrdemServicoItem}
                                                className="p-1 px-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
                                                title={itemFocadoId !== item.IdOrdemServicoItem ? "Selecione a linha para habilitar" : "Gerar Pendência (RNC)"}
                                            >
                                                <ShieldAlert size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">
                                {loading ? 'Carregando...' : 'Nenhum item disponivel'}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================
// Painel Direito: Planos de Corte + Itens do Plano Selecionado
// ============================================================
function PainelPlanosCorte({ refreshTrigger, externalOnGerarRnc }: { refreshTrigger: number; externalOnGerarRnc?: (item: any) => void }) {
    const { token } = useAuth();
    const { addToast } = useToast();
    const [planos, setPlanos] = useState<PlanoCorte[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [error, setError] = useState('');
    const [exibirConcluidos, setExibirConcluidos] = useState(false);
    const [fEsp, setFEsp] = useState('');
    const [fMat, setFMat] = useState('');
    const [fLocal, setFLocal] = useState('');
    const [planoSelecionado, setPlanoSelecionado] = useState<PlanoCorte | null>(null);
    const [aglutinadoGlobal, setAglutinadoGlobal] = useState(true);
    const [itemSelecionado, setItemSelecionado] = useState<any>(null);

    // --- Estados RNC ---
    const [actionModal, setActionModal] = useState<null | 'addRnc'>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState<{ t: 's' | 'e'; m: string } | null>(null);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [tipostarefa, setTipostarefa] = useState<any[]>([]);
    const [rncForm, setRncForm] = useState<RncFormData>({
        idRnc: 0, 
        projeto: '', idProjeto: '', 
        tag: '', idTag: '', descTag: '',
        cliente: '', codMatFabricante: '', 
        descricao: '', setor: 'Corte', usuario: '', tipoTarefa: 'RNC', 
        dataExec: new Date().toISOString().split('T')[0],
        titulo: '', subTitulo: '',
        espessura: '', materialSW: '',
        chkCorte: false, chkDobra: false, chkSolda: false, chkPintura: false, chkMontagem: false
    });

    const fetchPlanos = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ exibirConcluidos: String(exibirConcluidos) });
            if (fEsp.trim()) params.set('Espessura', fEsp.trim());
            if (fMat.trim()) params.set('MaterialSW', fMat.trim());
            const res = await fetch(`/api/plano-corte/lista?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setPlanos(result.data || []);
            else setError(result.message || 'Erro ao buscar planos');
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [exibirConcluidos]);

    useEffect(() => { fetchPlanos(); }, [exibirConcluidos, refreshTrigger]);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const [uRes, tRes] = await Promise.all([
                    fetch('/api/config/usuarios', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/config/tipostarefa', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const [uData, tData] = await Promise.all([uRes.json(), tRes.json()]);
                if (uData.success) setUsuarios(uData.usuarios || []);
                if (tData.success) setTipostarefa(tData.tipostarefa || []);
            } catch (e) { console.error('Erro ao carregar config RNC:', e); }
        };
        loadConfig();
    }, [token]);

    const planosFiltrados = useMemo(() => {
        if (!fLocal.trim()) return planos;
        const q = fLocal.toLowerCase();
        return planos.filter(p =>
            String(p.IdPlanodecorte).includes(q) ||
            (p.DescPlanodecorte || '').toLowerCase().includes(q) ||
            (p.Espessura || '').toLowerCase().includes(q) ||
            (p.MaterialSW || '').toLowerCase().includes(q)
        );
    }, [planos, fLocal]);

    const handleAbrirPasta = async () => {
        if (!planoSelecionado) return;
        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/abrir-pasta`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'info', title: 'Explorer', message: 'Pasta aberta no servidor local.' });
            } else throw new Error(result.message || 'Erro ao abrir pasta');
        } catch (e: any) { setError(e.message); }
        finally { setLoadingAcao(false); }
    };

    const handleLiberarPlano = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte na tabela antes de liberar.' });
            return;
        }
        const isEnviado = planoSelecionado.Enviadocorte === 'S' || planoSelecionado.Enviadocorte === 'SIM';
        if (isEnviado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Plano selecionado já liberado para fábrica, verifique!' });
            return;
        }

        if (!confirm(`Você está liberando o plano de corte para execução: ${planoSelecionado.IdPlanodecorte} ?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/liberar`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Sucesso', message: result.message });
                // Atualiza o plano local na lista
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte ? { ...p, Enviadocorte: 'S' } : p));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: 'S' } : null);
            } else throw new Error(result.message || 'Erro ao liberar plano');
        } catch (e: any) { setError(e.message); }
        finally { setLoadingAcao(false); }
    };

    const handleCancelarLiberacao = async () => {
        if (!planoSelecionado) return;
        if (!confirm(`Você está cancelando a liberação do plano de corte - ${planoSelecionado.IdPlanodecorte} para execução?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/cancelar-liberacao`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Cancelado', message: result.message });
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte
                    ? { ...p, Enviadocorte: null }
                    : p
                ));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: null } : null);
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao cancelar liberação.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleAtualizarArquivos = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte na tabela antes de atualizar.' });
            return;
        }
        if (!aglutinadoGlobal) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Esta ação só está disponível com a visualização em modo Aglutinado.' });
            return;
        }
        if (!confirm(`Deseja atualizar os arquivos do Plano de corte - ${planoSelecionado.IdPlanodecorte} ?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/atualizar-arquivos`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Arquivos Atualizados', message: result.message });
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao atualizar arquivos.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleBloquearPlano = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte na tabela antes de bloquear.' });
            return;
        }
        if (!confirm(`Você está Bloqueando o plano de corte para preenchimento automático: ${planoSelecionado.IdPlanodecorte} ?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/bloquear`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Bloqueado', message: result.message });
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte ? { ...p, Enviadocorte: 'B' } : p));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: 'B' } : null);
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao bloquear plano.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleGerarRnc = (item: any) => {
        // Se o pai forneceu um handler externo, delegamos para ele
        if (externalOnGerarRnc) {
            externalOnGerarRnc(item);
            return;
        }
        setItemSelecionado(item);
        setRncForm({
            idRnc: 0,
            projeto: item.Projeto || '',
            idProjeto: item.IdProjeto || '',
            tag: item.Tag || '',
            idTag: item.IdTag || '',
            descTag: item.DescTag || '',
            cliente: item.DescEmpresa || '',
            codMatFabricante: item.CodMatFabricante || '',
            descricao: '',
            setor: 'Corte',
            usuario: '',
            tipoTarefa: 'RNC',
            dataExec: new Date().toISOString().split('T')[0],
            titulo: item.DescResumo || '',
            subTitulo: item.DescDetal || '',
            espessura: item.Espessura || '',
            materialSW: item.MaterialSW || '',
            chkCorte: item.txtCorte === '1',
            chkDobra: item.txtDobra === '1',
            chkSolda: item.TxtSolda === '1' || item.txtSolda === '1',
            chkPintura: item.txtPintura === '1',
            chkMontagem: item.TxtMontagem === '1' || item.txtMontagem === '1'
        });
        setMsg(null);
        setActionModal('addRnc');
    };

    const salvarNovaRnc = async () => {
        if (!rncForm.setor || !rncForm.usuario || !rncForm.descricao) {
            setMsg({ t: 'e', m: 'Preencha todos os campos obrigatórios.' });
            return;
        }

        setIsSaving(true); setMsg(null);
        try {
            const payload = {
                idOrdemServicoItem: itemSelecionado?.IdOrdemServicoItem,
                idOrdemServico: itemSelecionado?.IdOrdemServico,
                idProjeto: rncForm.idProjeto,
                projeto: rncForm.projeto,
                idTag: rncForm.idTag,
                tag: rncForm.tag,
                descTag: rncForm.descTag,
                descEmpresa: rncForm.cliente,
                codMatFabricante: rncForm.codMatFabricante,
                espessura: rncForm.espessura,
                materialSW: rncForm.materialSW,
                txtCorte: rncForm.chkCorte ? '1' : '',
                txtDobra: rncForm.chkDobra ? '1' : '',
                txtSolda: rncForm.chkSolda ? '1' : '',
                txtPintura: rncForm.chkPintura ? '1' : '',
                txtMontagem: rncForm.chkMontagem ? '1' : '',
                descricaoPendencia: rncForm.descricao,
                setorResponsavel: rncForm.setor,
                usuarioResponsavel: rncForm.usuario,
                titulo: rncForm.titulo,
                subTitulo: rncForm.subTitulo,
                tipoRnc: rncForm.tipoTarefa,
                dataExecucao: rncForm.dataExec,
                usuarioCriacao: 'Sistema', // Ideal pegar do contexto de auth
                descProjeto: rncForm.projeto,
                origemPendencia: 'PLANODECORTE',
                acao: 'SALVAR'
            };

            const res = await fetch('/api/producao/pendencia', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setMsg({ t: 's', m: 'Pendência (RNC) gerada com sucesso!' });
                setTimeout(() => setActionModal(null), 1500);
            } else {
                setMsg({ t: 'e', m: result.message || 'Erro ao salvar' });
            }
        } catch (e: any) {
            setMsg({ t: 'e', m: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDesbloquearPlano = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte bloqueado na tabela.' });
            return;
        }
        if (!confirm(`Você está Desbloqueando o plano de corte: ${planoSelecionado.IdPlanodecorte} ?`)) return;

        setLoadingAcao(true); setError('');
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/desbloquear`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                addToast({ type: 'success', title: 'Desbloqueado', message: result.message });
                setPlanos(prev => prev.map(p => p.IdPlanodecorte === planoSelecionado.IdPlanodecorte ? { ...p, Enviadocorte: '' } : p));
                setPlanoSelecionado(prev => prev ? { ...prev, Enviadocorte: '' } : null);
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao desbloquear plano.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleExcluirPlano = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte para excluir.' });
            return;
        }

        const confirmacao = window.confirm(`Você está excluindo o plano de corte: ${planoSelecionado.IdPlanodecorte} ?`);
        if (!confirmacao) return;

        setLoadingAcao(true);
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/excluir`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.success) {
                addToast({ type: 'success', title: 'Excluído', message: result.message });
                setPlanoSelecionado(null);
                fetchPlanos();
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao excluir plano.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleExportarExcel = async () => {
        if (!planoSelecionado) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um plano de corte para gerar o Excel.' });
            return;
        }

        if (!aglutinadoGlobal) {
            addToast({ 
                type: 'error', 
                title: 'Atenção', 
                message: "Para Gerar o relatório, a opção 'Plano de Corte Aglutinado' deve estar marcada!" 
            });
            // Opcional: focar no toggle ou switch se houvesse um ref, mas aqui alertamos visualmente
            return;
        }

        setLoadingAcao(true);
        try {
            const res = await fetch(`/api/plano-corte/${planoSelecionado.IdPlanodecorte}/exportar-excel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.success) {
                addToast({ 
                    type: 'success', 
                    title: 'Excel Gerado', 
                    message: `${result.message}\nLocal: ${result.path}` 
                });
            } else {
                addToast({ type: 'error', title: 'Erro', message: result.message || 'Falha ao gerar Excel.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: e.message });
        } finally {
            setLoadingAcao(false);
        }
    };

    const handleLimpar = () => { setFEsp(''); setFMat(''); setFLocal(''); setTimeout(fetchPlanos, 50); };

    return (
        <div className="flex flex-col h-full overflow-hidden gap-2">
            {/* Card de planos */}
            <div className="flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ flex: planoSelecionado ? '0 0 auto' : '1 1 auto', maxHeight: planoSelecionado ? '50%' : '100%' }}>
                {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200 flex items-center gap-1.5"><AlertCircle size={12} />{error}</div>}
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                        <Scissors size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Planos de Corte</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Gerenciamento e Arquivos de Saída</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAbrirPasta}
                        disabled={!planoSelecionado || loadingAcao}
                        className="p-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
                        title={!planoSelecionado ? 'Selecione um plano para abrir a pasta' : 'Abrir pasta do plano no Windows Explorer'}
                    >
                        <FolderOpen size={18} />
                    </button>

                    <button
                        onClick={handleAtualizarArquivos}
                        disabled={!planoSelecionado || loadingAcao || !aglutinadoGlobal}
                        className={`p-2.5 border rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
                            aglutinadoGlobal && planoSelecionado
                                ? 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        }`}
                        title={
                            !planoSelecionado
                                ? 'Selecione um plano para atualizar arquivos'
                                : !aglutinadoGlobal
                                    ? 'Ative a visualização Aglutinada nos Itens do Plano para usar esta função'
                                    : `Atualizar arquivos do Plano de Corte #${planoSelecionado.IdPlanodecorte} (LXDS, DXF, DFT, PDF)`
                        }
                    >
                        {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                    </button>

                    <button
                        onClick={handleExportarExcel}
                        disabled={!planoSelecionado || loadingAcao}
                        className={`p-2.5 border rounded-lg transition-colors shadow-sm disabled:opacity-50 ${
                            aglutinadoGlobal && planoSelecionado
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        }`}
                        title={
                            !planoSelecionado
                                ? 'Selecione um plano para gerar Excel'
                                : !aglutinadoGlobal
                                    ? 'Ative a visualização Aglutinada para gerar o relatório Excel'
                                    : `Gerar Relatório Excel do Plano #${planoSelecionado.IdPlanodecorte}`
                        }
                    >
                        {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                    </button>

                    {(() => {
                        const jaLiberado  = planoSelecionado?.Enviadocorte === 'S' || planoSelecionado?.Enviadocorte === 'SIM';
                        const jaBloqueado = planoSelecionado?.Enviadocorte === 'B';

                        if (jaLiberado) {
                            // Plano liberado: mostra Send desabilitado + CancelarLiberacao
                            return (
                                <>
                                    <button
                                        className="p-2.5 bg-gray-50 text-emerald-400 border border-gray-200 rounded-lg cursor-not-allowed opacity-60"
                                        title="Plano já liberado para a fábrica"
                                        onClick={() => addToast({ type: 'info', title: 'Atenção', message: 'Este plano já foi liberado para a fábrica!' })}
                                    >
                                        <Send size={18} />
                                    </button>
                                    <button
                                        onClick={handleCancelarLiberacao}
                                        disabled={loadingAcao}
                                        className="p-2.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors shadow-sm disabled:opacity-50"
                                        title="Cancelar Liberação do Plano de Corte"
                                    >
                                        {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                                    </button>
                                </>
                            );
                        }

                        if (jaBloqueado) {
                            // Plano bloqueado: mostra ícone de bloqueio desabilitado + opção de desbloquear
                            return (
                                <>
                                    <button
                                        className="p-2.5 bg-amber-50 text-amber-500 border border-amber-200 rounded-lg cursor-not-allowed opacity-70"
                                        title="Plano bloqueado para preenchimento automático"
                                        onClick={() => addToast({ type: 'warning', title: 'Bloqueado', message: 'Este plano está bloqueado para preenchimento automático.' })}
                                    >
                                        <Lock size={18} />
                                    </button>
                                    <button
                                        onClick={handleDesbloquearPlano}
                                        disabled={loadingAcao}
                                        className="p-2.5 bg-teal-50 text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors shadow-sm disabled:opacity-50"
                                        title="Desbloquear Plano de Corte (reativar preenchimento automático)"
                                    >
                                        {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <Unlock size={18} />}
                                    </button>
                                </>
                            );
                        }

                        // Estado normal (pendente): mostra Liberar + Bloquear
                        return (
                            <>
                                <button
                                    onClick={handleLiberarPlano}
                                    disabled={loadingAcao}
                                    className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
                                    title={!planoSelecionado ? 'Selecione um plano na tabela para liberar' : 'Liberar arquivos para execução na fábrica'}
                                >
                                    {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                                <button
                                    onClick={handleBloquearPlano}
                                    disabled={!planoSelecionado || loadingAcao}
                                    className="p-2.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-50"
                                    title={!planoSelecionado ? 'Selecione um plano para bloquear' : `Bloquear preenchimento automático do Plano #${planoSelecionado.IdPlanodecorte}`}
                                >
                                    {loadingAcao ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                                </button>
                            </>
                        );
                    })()}

                    {planoSelecionado && (
                        <button
                            onClick={handleExcluirPlano}
                            disabled={loadingAcao}
                            className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                            title={`Excluir Plano de Corte #${planoSelecionado.IdPlanodecorte}`}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}

                    <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                        <span className="text-[10px] font-black text-indigo-400">{planos.length}</span>
                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">planos</span>
                    </div>

                    <button
                        onClick={() => setExibirConcluidos(!exibirConcluidos)}
                        className={`p-2.5 rounded-lg transition-colors border shadow-sm ${exibirConcluidos ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        title={exibirConcluidos ? 'Exibindo todos os planos — clique para só pendentes' : 'Exibindo apenas pendentes — clique para ver todos'}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

                {/* Filtros */}
                <div className="shrink-0 border-b border-slate-100 px-2 py-1.5 bg-white">
                    <div className="flex flex-wrap gap-1">
                        {[{ ph: 'Espessura', val: fEsp, set: setFEsp, w: 'w-20' }, { ph: 'Material SW', val: fMat, set: setFMat, w: 'w-28' }].map(({ ph, val, set, w }) => (
                            <div key={ph} className={`flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 focus-within:border-blue-400 ${w}`}>
                                <input type="text" placeholder={ph} value={val}
                                    onChange={e => set(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchPlanos()}
                                    className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                            </div>
                        ))}
                        <button onClick={fetchPlanos} className="flex items-center gap-0.5 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded">
                            <Search size={10} />Buscar
                        </button>
                        <button onClick={handleLimpar} className="flex items-center gap-0.5 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold rounded">
                            <X size={10} />Limpar
                        </button>
                        <div className="ml-auto flex items-center bg-slate-50 border border-slate-200 rounded px-1.5 w-32">
                            <Search size={9} className="text-slate-400 mr-1 shrink-0" />
                            <input type="text" placeholder="Busca rapida..." value={fLocal}
                                onChange={e => setFLocal(e.target.value)}
                                className="w-full text-[10px] py-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400" />
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-50 text-red-700 px-3 py-1.5 text-[10px] font-bold border-b border-red-200">{error}</div>}

                {/* Tabela */}
                <div className="flex-1 overflow-auto relative">
                    {loading && <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
                    <table className="w-full text-left">
                        <thead className="text-[9px] text-slate-500 uppercase bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">ID Plano</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Descricao</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Espessura</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Material SW</th>
                                <th className="px-2 py-2.5 font-black text-center whitespace-nowrap">Progresso</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Dt. Cadastro</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Dt. Limite</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Criador</th>
                                <th className="px-2 py-2.5 font-black whitespace-nowrap">Pasta</th>
                                <th className="px-2 py-2.5 font-black text-center whitespace-nowrap">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planosFiltrados.length > 0 ? planosFiltrados.map((p, idx) => {
                                const concluido  = p.Concluido === 'S' || p.Concluido === 'SIM' || p.Concluido === 'C';
                                const enviado    = p.Enviadocorte === 'S';
                                const bloqueado  = p.Enviadocorte === 'B';
                                const pct = p.QtdeTotalPecas && p.QtdeTotalPecas > 0
                                    ? Math.round(((p.QtdeTotalPecasExecutadas ?? 0) / p.QtdeTotalPecas) * 100) : null;
                                const sel = planoSelecionado?.IdPlanodecorte === p.IdPlanodecorte;
                                return (
                                    <tr key={`${p.IdPlanodecorte}-${idx}`}
                                        onClick={() => setPlanoSelecionado(sel ? null : p)}
                                        className={`border-b border-slate-100 transition-colors cursor-pointer ${
                                            sel        ? 'bg-indigo-50/80 shadow-inner'
                                            : concluido ? 'opacity-70 bg-slate-50'
                                            : bloqueado ? 'bg-amber-50/40'
                                            : 'hover:bg-slate-50'
                                        }`}>
                                        <td className="px-2 py-2.5 text-[10px] font-bold text-slate-800 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-1.5 w-1.5 rounded-full ${
                                                    concluido ? 'bg-emerald-500'
                                                    : enviado  ? 'bg-blue-500'
                                                    : bloqueado ? 'bg-amber-500'
                                                    : 'bg-slate-400'
                                                }`}></div>
                                                #{p.IdPlanodecorte}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-[10px] max-w-[120px] truncate text-slate-700 font-medium" title={p.DescPlanodecorte ?? ''}>{p.DescPlanodecorte || '-'}</td>
                                        <td className="px-2 py-2 text-[10px] whitespace-nowrap">
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold text-[9px]">{p.Espessura || '-'}</span>
                                        </td>
                                        <td className="px-2 py-2 text-[10px] text-slate-600 whitespace-nowrap font-medium">{p.MaterialSW || '-'}</td>
                                        <td className="px-2 py-2 text-[10px] text-center">
                                            {pct !== null
                                                ? <div className="flex flex-col items-center gap-1">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase">{p.QtdeTotalPecasExecutadas ?? 0}/{p.QtdeTotalPecas}</span>
                                                  </div>
                                                : <span className="text-[10px] text-slate-400 font-bold">{p.QtdeTotalPecas ?? '-'}</span>}
                                        </td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">{fmt(p.DataCad)}</td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">{fmt(p.DataLimite)}</td>
                                        <td className="px-2 py-2 text-[9px] text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1 opacity-70">
                                                <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{p.CriadoPor?.charAt(0) || '?'}</div>
                                                {p.CriadoPor || '-'}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-[9px] text-slate-400 max-w-[100px] truncate italic" title={p.EnderecoCompletoPlanoCorte ?? ''}>{p.EnderecoCompletoPlanoCorte || '-'}</td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            {concluido ? (
                                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-emerald-200">
                                                    <CheckCircle size={10} /> CONCLUÍDO
                                                </span>
                                            ) : enviado ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-blue-200">
                                                    <Scissors size={10} /> ENVIADO
                                                </span>
                                            ) : bloqueado ? (
                                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[9px] font-black border border-amber-200">
                                                    <Lock size={10} /> BLOQUEADO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 text-[9px] font-black border border-slate-200">
                                                    <Clock size={10} /> PENDENTE
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">{loading ? 'Carregando...' : 'Nenhum plano encontrado'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {planoSelecionado && (
                <div className="flex-1 min-h-[300px] mt-2 animate-in slide-in-from-bottom duration-300">
                    <PainelItensPlano 
                        plano={planoSelecionado} 
                        onFechar={() => setPlanoSelecionado(null)} 
                        aglutinado={aglutinadoGlobal}
                        setAglutinado={setAglutinadoGlobal}
                        onGerarRnc={handleGerarRnc}
                        onItemRemoved={fetchPlanos}
                    />
                </div>
            )}

            {actionModal === 'addRnc' && (
                <ModalRnc 
                    rncForm={rncForm} 
                    setRncForm={setRncForm} 
                    isSaving={isSaving} 
                    msg={msg} 
                    setActionModal={setActionModal} 
                    salvarNovaRnc={salvarNovaRnc} 
                    usuarios={usuarios} 
                    tipostarefa={tipostarefa} 
                />
            )}
        </div>
    );
}

// ============================================================
// MODAL RNC
// ============================================================
function ModalRnc({ 
    rncForm, setRncForm, isSaving, msg, setActionModal, salvarNovaRnc, usuarios, tipostarefa 
}: { 
    rncForm: RncFormData; setRncForm: any; isSaving: boolean; msg: any; setActionModal: any; salvarNovaRnc: any; usuarios: any[]; tipostarefa: any[]; 
}) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl shadow-sm"><ShieldAlert size={20} /></div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 leading-none">Gerar Pendência (RNC)</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">
                                {rncForm.projeto} {rncForm.tag ? ` > Tag: ${rncForm.tag}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setActionModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-5">
                    {msg && (
                        <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top duration-300 ${msg.t === 's' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {msg.t === 's' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                            {msg.m}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Título da Pendência (Item)</label>
                            <input 
                                type="text"
                                value={rncForm.titulo}
                                onChange={e => setRncForm((p: any) => ({...p, titulo: e.target.value.toUpperCase()}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all bg-slate-50/30"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Subtítulo / Detalhe</label>
                            <input 
                                type="text"
                                value={rncForm.subTitulo}
                                onChange={e => setRncForm((p: any) => ({...p, subTitulo: e.target.value.toUpperCase()}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-orange-400 transition-all bg-slate-50/30"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Descrição da Não Conformidade</label>
                            <textarea 
                                value={rncForm.descricao} 
                                onChange={e => setRncForm((p: any) => ({...p, descricao: e.target.value.toUpperCase()}))}
                                placeholder="Descreva detalhadamente o problema ou a pendência..."
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-orange-400 min-h-[100px] transition-all bg-slate-50/30"
                            />
                        </div>

                        <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-3 block text-center">Processos Afetados / Origem</label>
                             <div className="flex flex-wrap justify-center gap-4">
                                {[
                                    { label: 'Corte', key: 'chkCorte', icon: Scissors },
                                    { label: 'Dobra', key: 'chkDobra', icon: Wrench },
                                    { label: 'Solda', key: 'chkSolda', icon: Flame },
                                    { label: 'Pintura', key: 'chkPintura', icon: Paintbrush },
                                    { label: 'Montagem', key: 'chkMontagem', icon: Settings2 }
                                ].map(proc => (
                                    <label key={proc.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer ${rncForm[proc.key as keyof RncFormData] ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={!!rncForm[proc.key as keyof RncFormData]}
                                            onChange={e => setRncForm((p: any) => ({...p, [proc.key]: e.target.checked}))}
                                        />
                                        <proc.icon size={14} />
                                        <span className="text-[11px] font-black uppercase tracking-tight">{proc.label}</span>
                                    </label>
                                ))}
                             </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Setor Responsável pela Solução</label>
                            <select 
                                value={rncForm.setor} 
                                onChange={e => setRncForm((p: any) => ({...p, setor: e.target.value}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all bg-slate-50/30 font-mono"
                            >
                                {SECTORS.map(s => <option key={s.k} value={s.k}>{s.k}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Colaborador / Responsável</label>
                            <select 
                                value={rncForm.usuario} 
                                onChange={e => setRncForm((p: any) => ({...p, usuario: e.target.value}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all bg-slate-50/30 font-mono"
                            >
                                <option value="">Selecione...</option>
                                {usuarios.map(u => <option key={u.IdUsuario ?? u.id ?? u.NomeCompleto} value={u.NomeCompleto ?? u.label}>{u.NomeCompleto ?? u.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Tipo (RNC/Pendência)</label>
                            <select 
                                value={rncForm.tipoTarefa} 
                                onChange={e => setRncForm((p: any) => ({...p, tipoTarefa: e.target.value}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all bg-slate-50/30 font-mono"
                            >
                                <option value="RNC">RNC</option>
                                <option value="PENDENCIA">PENDENCIA</option>
                                {tipostarefa.filter(t => (t.TipoTarefa ?? t.label) !== 'RNC' && (t.TipoTarefa ?? t.label) !== 'PENDENCIA').map(t => <option key={t.IdTipoTarefa ?? t.id} value={t.TipoTarefa ?? t.label}>{t.TipoTarefa ?? t.label}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Previsão</label>
                            <input 
                                type="date" 
                                value={rncForm.dataExec} 
                                onChange={e => setRncForm((p: any) => ({...p, dataExec: e.target.value}))}
                                className="w-full border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-orange-400 transition-all bg-slate-50/30 font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 z-10">
                    <button 
                        onClick={() => setActionModal(null)}
                        className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={salvarNovaRnc}
                        disabled={isSaving || !rncForm.descricao.trim()}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center gap-2 font-black text-sm"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <ShieldAlert size={18} />}
                        Gerar RNC
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Pagina principal
// ============================================================
export default function MontagemPlanoCortePage() {
    const { token } = useAuth();
    const { addToast } = useToast();
    const appConfig = useAppConfig();
    const filtroAtivo = appConfig.planoCorteFiltroDC || 'corte';
    const [refreshPlanos, setRefreshPlanos] = useState(0);

    // --- Estados RNC elevados para o nivel da pagina ---
    const [pageActionModal, setPageActionModal] = useState<null | 'addRnc'>(null);
    const [pageItemSelecionado, setPageItemSelecionado] = useState<any>(null);
    const [pageIsSaving, setPageIsSaving] = useState(false);
    const [pageMsg, setPageMsg] = useState<{ t: 's' | 'e'; m: string } | null>(null);
    const [pageUsuarios, setPageUsuarios] = useState<any[]>([]);
    const [pageTipostarefa, setPageTipostarefa] = useState<any[]>([]);
    const [pageRncForm, setPageRncForm] = useState<RncFormData>({
        idRnc: 0, projeto: '', idProjeto: '', tag: '', idTag: '', descTag: '',
        cliente: '', codMatFabricante: '', descricao: '', setor: 'Corte', usuario: '',
        tipoTarefa: 'RNC', dataExec: new Date().toISOString().split('T')[0],
        titulo: '', subTitulo: '', espessura: '', materialSW: '',
        chkCorte: false, chkDobra: false, chkSolda: false, chkPintura: false, chkMontagem: false
    });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const [uRes, tRes] = await Promise.all([
                    fetch('/api/config/usuarios', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/config/tipostarefa', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const [uData, tData] = await Promise.all([uRes.json(), tRes.json()]);
                if (uData.success) setPageUsuarios(uData.usuarios || []);
                if (tData.success) setPageTipostarefa(tData.tipostarefa || []);
            } catch (e) { console.error('Erro ao carregar config RNC pagina:', e); }
        };
        loadConfig();
    }, [token]);

    const handlePageGerarRnc = (item: any) => {
        setPageItemSelecionado(item);
        setPageRncForm({
            idRnc: 0,
            projeto: item.Projeto || '',
            idProjeto: item.IdProjeto || '',
            tag: item.Tag || '',
            idTag: item.IdTag || '',
            descTag: item.DescTag || '',
            cliente: item.DescEmpresa || '',
            codMatFabricante: item.CodMatFabricante || '',
            descricao: '',
            setor: 'Corte',
            usuario: '',
            tipoTarefa: 'RNC',
            dataExec: new Date().toISOString().split('T')[0],
            titulo: item.DescResumo || '',
            subTitulo: item.DescDetal || '',
            espessura: item.Espessura || '',
            materialSW: item.MaterialSW || '',
            chkCorte: item.txtCorte === '1',
            chkDobra: item.txtDobra === '1',
            chkSolda: item.TxtSolda === '1' || item.txtSolda === '1',
            chkPintura: item.txtPintura === '1',
            chkMontagem: item.TxtMontagem === '1' || item.txtMontagem === '1'
        });
        setPageMsg(null);
        setPageActionModal('addRnc');
    };

    const handlePageSalvarRnc = async () => {
        if (!pageRncForm.setor || !pageRncForm.usuario || !pageRncForm.descricao) {
            setPageMsg({ t: 'e', m: 'Preencha todos os campos obrigatórios.' });
            return;
        }
        setPageIsSaving(true); setPageMsg(null);
        try {
            const payload = {
                idOrdemServicoItem: pageItemSelecionado?.IdOrdemServicoItem,
                idOrdemServico: pageItemSelecionado?.IdOrdemServico,
                idProjeto: pageRncForm.idProjeto,
                projeto: pageRncForm.projeto,
                idTag: pageRncForm.idTag,
                tag: pageRncForm.tag,
                descTag: pageRncForm.descTag,
                descEmpresa: pageRncForm.cliente,
                codMatFabricante: pageRncForm.codMatFabricante,
                espessura: pageRncForm.espessura,
                materialSW: pageRncForm.materialSW,
                txtCorte: pageRncForm.chkCorte ? '1' : '',
                txtDobra: pageRncForm.chkDobra ? '1' : '',
                txtSolda: pageRncForm.chkSolda ? '1' : '',
                txtPintura: pageRncForm.chkPintura ? '1' : '',
                txtMontagem: pageRncForm.chkMontagem ? '1' : '',
                descricaoPendencia: pageRncForm.descricao,
                setorResponsavel: pageRncForm.setor,
                usuarioResponsavel: pageRncForm.usuario,
                titulo: pageRncForm.titulo,
                subTitulo: pageRncForm.subTitulo,
                tipoRnc: pageRncForm.tipoTarefa,
                dataExecucao: pageRncForm.dataExec,
                usuarioCriacao: 'Sistema',
                descProjeto: pageRncForm.projeto,
                origemPendencia: 'PLANODECORTE',
                acao: 'SALVAR'
            };
            const res = await fetch('/api/producao/pendencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                setPageMsg({ t: 's', m: 'Pendência (RNC) gerada com sucesso!' });
                addToast({ type: 'success', title: 'RNC Gerada', message: 'Pendência registrada com sucesso!' });
                setTimeout(() => setPageActionModal(null), 1500);
            } else {
                setPageMsg({ t: 'e', m: result.message || 'Erro ao salvar' });
            }
        } catch (e: any) {
            setPageMsg({ t: 'e', m: e.message });
        } finally {
            setPageIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#f1f5f9] text-slate-800">
            <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-5 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm shrink-0"><Scissors size={22} /></div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 leading-none tracking-tight">Montagem Plano de Corte</h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">Selecione itens de OS e inclua no plano de corte</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${filtroAtivo === 'chaparia' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-blue-50 border-blue-300 text-blue-700'}`}>
                        {filtroAtivo === 'chaparia' ? <FileType2 size={14} /> : <SplitSquareHorizontal size={14} />}
                        {filtroAtivo === 'chaparia' ? 'Desenho Chaparia' : 'Setor Corte'}
                        <span className="text-[9px] opacity-60 ml-1">(via Configuracao)</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-2 gap-3 p-3">
                <PainelItensOS
                    tipoFiltro={filtroAtivo}
                    onPlanosChange={() => setRefreshPlanos(v => v + 1)}
                    onGerarRnc={handlePageGerarRnc}
                />
                <PainelPlanosCorte
                    refreshTrigger={refreshPlanos}
                    externalOnGerarRnc={handlePageGerarRnc}
                />
            </div>

            {/* Modal RNC centralizado no nivel da pagina - acessivel por ambos os paineis */}
            {pageActionModal === 'addRnc' && (
                <ModalRnc
                    rncForm={pageRncForm}
                    setRncForm={setPageRncForm}
                    isSaving={pageIsSaving}
                    msg={pageMsg}
                    setActionModal={setPageActionModal}
                    salvarNovaRnc={handlePageSalvarRnc}
                    usuarios={pageUsuarios}
                    tipostarefa={pageTipostarefa}
                />
            )}
        </div>
    );
}
