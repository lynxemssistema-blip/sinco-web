import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, RefreshCw, CheckCircle, XCircle, FileCheck,
    ArrowLeft, ArrowLeftCircle, AlertTriangle, FileText,
    Trash2, Loader2, Truck, History, RotateCcw, X
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatToBRDate } from '../utils/dateUtils';

const API_BASE = '/api/romaneio-retorno';

// ─── Sub-view: Histórico romaneioitemcontrole ────────────────────────────────
function HistoricoControleView({ item, onBack }: { item: any; onBack: () => void }) {
    const { showAlert } = useAlert();
    const [controles, setControles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchControles = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/controle/${item.IdOrdemServicoItem || item.IDOrdemServicoITEM}`);
            const data = await res.json();
            if (data.success) setControles(data.data);
            else showAlert(data.message, 'error');
        } catch {
            showAlert('Erro ao buscar histórico de controle.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchControles(); }, []);

    const handleEstorno = async (ctrl: any) => {
        if (ctrl.Situacao === 'ESTORNO') {
            showAlert('Registro já estornado.', 'warning');
            return;
        }
        if (!confirm(`Confirma o ESTORNO deste registro?\nQtde: ${ctrl.QtdeUsuario ?? ctrl.QtdeIdentificadores}\nIsso devolverá a quantidade ao item do romaneio.`)) return;
        setProcessingId(ctrl.idromaneioitemcontrole);
        try {
            const res = await fetch(`${API_BASE}/estorno/${ctrl.idromaneioitemcontrole}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: 'Sistema' })
            });
            const data = await res.json();
            if (data.success) {
                showAlert(data.message, 'success');
                fetchControles();
            } else {
                showAlert(data.message, 'error');
            }
        } catch {
            showAlert('Erro ao realizar estorno.', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const situacaoBadge = (s: string) => {
        if (!s) return 'bg-gray-100 text-gray-600';
        if (s === 'ESTORNO') return 'bg-red-100 text-red-700';
        if (s.includes('RETORNO') || s.includes('ENTRADA')) return 'bg-green-100 text-green-700';
        return 'bg-blue-100 text-blue-700';
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
            {/* Cabeçalho da sub-view */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#32423D] text-white text-sm font-medium hover:bg-[#26312D] transition-colors"
                >
                    <ArrowLeft size={16} />
                    Voltar
                </button>
                <div className="h-5 w-px bg-gray-300" />
                <div>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <History size={16} className="text-[#32423D]" />
                        Histórico de Controle — ID OS Item: <span className="text-[#32423D]">{item.IdOrdemServicoItem || item.IDOrdemServicoITEM}</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Projeto: <strong>{item.PROJETO}</strong> &nbsp;|&nbsp; Tag: <strong>{item.TAG}</strong> &nbsp;|&nbsp; Romaneio: <strong>#{item.IdRomaneio}</strong>
                    </p>
                </div>
                <button
                    onClick={fetchControles}
                    className="ml-auto p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Recarregar"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin text-[#32423D]' : 'text-gray-500'} />
                </button>
            </header>

            {/* Tabela romaneioitemcontrole */}
            <main className="flex-1 overflow-auto p-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Tabela: romaneioitemcontrole</span>
                        <span className="text-xs text-gray-400 font-mono">{controles.length} registro(s)</span>
                    </div>
                    <div className="overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#567469] text-white text-[11px] uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2">ID Controle</th>
                                    <th className="px-3 py-2">ID Item Rom.</th>
                                    <th className="px-3 py-2">ID OS Item</th>
                                    <th className="px-3 py-2">Qtde Identificadores</th>
                                    <th className="px-3 py-2">Qtde Usuário</th>
                                    <th className="px-3 py-2">Situação</th>
                                    <th className="px-3 py-2">Data Criação</th>
                                    <th className="px-3 py-2">Usuário</th>
                                    <th className="px-3 py-2">Observação</th>
                                    <th className="px-3 py-2 text-center">Estorno</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center">
                                            <Loader2 size={22} className="animate-spin text-[#32423D] mx-auto" />
                                        </td>
                                    </tr>
                                ) : controles.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-gray-400 italic text-sm">
                                            Nenhum registro encontrado para este ID de OS Item.
                                        </td>
                                    </tr>
                                ) : controles.map((ctrl) => (
                                    <tr key={ctrl.idromaneioitemcontrole} className={`hover:bg-gray-50 transition-colors ${ctrl.Situacao === 'ESTORNO' ? 'opacity-60' : ''}`}>
                                        <td className="px-3 py-1.5 font-mono text-xs text-gray-500">{ctrl.idromaneioitemcontrole}</td>
                                        <td className="px-3 py-1.5 font-mono text-xs">{ctrl.IdRomaneioItem}</td>
                                        <td className="px-3 py-1.5 font-mono text-xs font-bold text-[#32423D]">{ctrl.IDOrdemServicoITEM}</td>
                                        <td className="px-3 py-1.5 text-center font-bold">{ctrl.QtdeIdentificadores}</td>
                                        <td className="px-3 py-1.5 text-center font-bold text-blue-700">{ctrl.QtdeUsuario ?? '-'}</td>
                                        <td className="px-3 py-1.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${situacaoBadge(ctrl.Situacao)}`}>
                                                {ctrl.Situacao || 'AGUARDANDO'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-xs font-mono text-gray-500">{formatToBRDate(ctrl.DataCriacao)}</td>
                                        <td className="px-3 py-1.5 text-xs">{ctrl.UsuarioLogado}</td>
                                        <td className="px-3 py-1.5 text-xs text-gray-500 max-w-[200px] truncate" title={ctrl.Observacao}>{ctrl.Observacao || '-'}</td>
                                        <td className="px-3 py-1.5 text-center">
                                            {ctrl.Situacao === 'ESTORNO' ? (
                                                <span className="text-[10px] text-red-400 font-bold">ESTORNADO</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleEstorno(ctrl)}
                                                    disabled={processingId === ctrl.idromaneioitemcontrole}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-[11px] font-semibold border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50 mx-auto"
                                                    title="Realizar Estorno: devolve qtde ao item do romaneio"
                                                >
                                                    {processingId === ctrl.idromaneioitemcontrole
                                                        ? <Loader2 size={12} className="animate-spin" />
                                                        : <RotateCcw size={12} />}
                                                    Estornar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ─── Página Principal: Romaneio-Retorno ─────────────────────────────────────
export default function RomaneioRetornoPage() {
    const { showAlert: addAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [historicoItem, setHistoricoItem] = useState<any | null>(null); // Item para abrir sub-view
    const [filters, setFilters] = useState({
        romaneio: '',
        projeto: '',
        tag: '',
        numDoc: '',
        mostrarConcluidos: false
    });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'item', data: any } | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters as any).toString();
            const res = await fetch(`${API_BASE}/items?${query}`);
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
                setSelectedItem(null);
            }
        } catch {
            addAlert('Erro ao buscar itens', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessReturn = async (itemId: number, qtde: number, observacao: string, tipo: string) => {
        try {
            const res = await fetch(`${API_BASE}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idRomaneioItem: itemId, qtdeRetorno: qtde, observacao, tipoRetorno: tipo, usuario: 'Sistema' })
            });
            const data = await res.json();
            if (data.success) { addAlert(data.message, 'success'); fetchItems(); }
            else addAlert(data.message, 'error');
        } catch { addAlert('Erro ao processar retorno', 'error'); }
    };

    const handleContextMenu = (e: React.MouseEvent, data: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'item', data });
    };

    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Se estiver na sub-view de histórico, renderiza ela
    if (historicoItem) {
        return <HistoricoControleView item={historicoItem} onBack={() => setHistoricoItem(null)} />;
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-gray-50 overflow-hidden">
            {/* ── PARTE 1: Filtros compactos ─────────────────────────────── */}
            <header className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[110px]">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Romaneio</label>
                        <input
                            type="text"
                            value={filters.romaneio}
                            onChange={e => setFilters({ ...filters, romaneio: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchItems()}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
                            placeholder="Ex: 15"
                        />
                    </div>
                    <div className="flex-1 min-w-[110px]">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Projeto</label>
                        <input
                            type="text"
                            value={filters.projeto}
                            onChange={e => setFilters({ ...filters, projeto: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchItems()}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
                        />
                    </div>
                    <div className="flex-1 min-w-[110px]">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tag</label>
                        <input
                            type="text"
                            value={filters.tag}
                            onChange={e => setFilters({ ...filters, tag: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchItems()}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
                        />
                    </div>
                    <div className="flex-1 min-w-[110px]">
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Cód. Material</label>
                        <input
                            type="text"
                            value={filters.numDoc}
                            onChange={e => setFilters({ ...filters, numDoc: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && fetchItems()}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 pb-0.5">
                        <input
                            type="checkbox"
                            checked={filters.mostrarConcluidos}
                            onChange={e => setFilters({ ...filters, mostrarConcluidos: e.target.checked })}
                            id="mostrarConcluidos"
                            className="w-3.5 h-3.5 text-[#32423D] border-gray-300 rounded"
                        />
                        <label htmlFor="mostrarConcluidos" className="text-xs text-gray-600 whitespace-nowrap">Mostrar Concluídos</label>
                    </div>
                    <button
                        onClick={fetchItems}
                        disabled={loading}
                        className="flex items-center gap-1.5 bg-[#32423D] text-white px-4 py-1.5 rounded hover:bg-[#26312D] transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        Pesquisar
                    </button>
                </div>
            </header>

            {/* ── PARTE 2: Grid de Itens — denso + coluna IdOrdemServicoItem ── */}
            <main className="flex-1 overflow-hidden p-3 flex flex-col">
                <section className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-xs font-bold text-gray-700 flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-[#32423D]" />
                            ITENS DO ROMANEIO PARA RETORNO
                        </h2>
                        <div className="flex items-center gap-3">
                            {selectedItem && (
                                <span className="text-[11px] text-[#32423D] font-semibold animate-pulse">
                                    Item #{selectedItem.IdRomaneioItem} selecionado
                                </span>
                            )}
                            <span className="text-[11px] text-gray-400 font-mono">{items.length} itens</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#567469] text-white text-[11px] uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-1.5">Status</th>
                                    <th className="px-3 py-1.5">Romaneio</th>
                                    <th className="px-3 py-1.5">ID OS Item</th>
                                    <th className="px-3 py-1.5">Projeto</th>
                                    <th className="px-3 py-1.5">Tag</th>
                                    <th className="px-3 py-1.5 text-right">Qtde Env.</th>
                                    <th className="px-3 py-1.5 text-right">Qtde Ret.</th>
                                    <th className="px-3 py-1.5 text-right">Saldo</th>
                                    <th className="px-3 py-1.5">Situação</th>
                                    <th className="px-3 py-1.5 text-center">Histórico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[12px]">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-10 text-center text-gray-400 italic text-sm">
                                            {loading
                                                ? <Loader2 size={20} className="animate-spin text-[#32423D] mx-auto" />
                                                : 'Nenhum item encontrado. Use os filtros acima para pesquisar.'}
                                        </td>
                                    </tr>
                                ) : items.map((item) => (
                                    <tr
                                        key={item.IdRomaneioItem}
                                        onClick={() => setSelectedItem(selectedItem?.IdRomaneioItem === item.IdRomaneioItem ? null : item)}
                                        onContextMenu={(e) => handleContextMenu(e, item)}
                                        className={`hover:bg-[#E0E800]/10 cursor-pointer transition-colors border-l-4 ${selectedItem?.IdRomaneioItem === item.IdRomaneioItem
                                            ? 'bg-[#E0E800]/15 border-[#32423D]'
                                            : 'border-transparent'}`}
                                    >
                                        <td className="px-3 py-1">
                                            {item.MarcarComoFinalizado === 'S'
                                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                : <RefreshCw className="w-3.5 h-3.5 text-blue-400" />}
                                        </td>
                                        <td className="px-3 py-1 font-mono text-gray-500">#{item.IdRomaneio}</td>
                                        <td className="px-3 py-1 font-mono font-bold text-[#32423D]">{item.IdOrdemServicoItem || item.IDOrdemServicoITEM || '-'}</td>
                                        <td className="px-3 py-1 text-gray-700 max-w-[180px] truncate" title={item.PROJETO}>{item.PROJETO}</td>
                                        <td className="px-3 py-1 font-semibold text-blue-900">{item.TAG}</td>
                                        <td className="px-3 py-1 text-right font-bold">{item.QtdeRomaneio}</td>
                                        <td className="px-3 py-1 text-right text-green-600 font-bold">{item.QtdeTotalRetorno || 0}</td>
                                        <td className="px-3 py-1 text-right text-red-600 font-bold">{(item.QtdeRomaneio || 0) - (item.QtdeTotalRetorno || 0)}</td>
                                        <td className="px-3 py-1">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${item.Situacao?.includes('RETORNO') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.Situacao || 'AGUARDANDO'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1 text-center" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setHistoricoItem(item)}
                                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors mx-auto"
                                                title="Abrir histórico de controle (romaneioitemcontrole)"
                                            >
                                                <History size={11} />
                                                Ver Hist.
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-64 overflow-hidden"
                    >
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            Ações — Item #{contextMenu.data?.IdRomaneioItem}
                        </div>
                        <button
                            onClick={() => { setHistoricoItem(contextMenu.data); setContextMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50 text-sm text-indigo-700 group transition-colors"
                        >
                            <History className="w-4 h-4" />
                            <span>Ver Histórico de Controle</span>
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                            onClick={() => {
                                const d = contextMenu.data;
                                handleProcessReturn(d.IdRomaneioItem, (d.QtdeRomaneio || 0) - (d.QtdeTotalRetorno || 0), 'Entrada em lote', 'ENTRADA/RETORNO');
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0E800]/10 text-sm text-gray-700 group transition-colors"
                        >
                            <FileCheck className="w-4 h-4 text-amber-500" />
                            <span>Marcar como Entrada/Retorno</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0E800]/10 text-sm text-gray-700 group transition-colors">
                            <ArrowLeftCircle className="w-4 h-4 text-orange-600" />
                            <span>Marcar como Item Finalizado</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0E800]/10 text-sm text-gray-700 group transition-colors">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>Gerar RNC - Pendência Retorno</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#E0E800]/10 text-sm text-gray-700 group transition-colors">
                            <FileText className="w-4 h-4 text-red-700" />
                            <span>Abrir Desenho PDF</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
