import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, RefreshCw, CheckCircle, XCircle, FileCheck,
    ArrowLeftCircle, AlertTriangle, FileText,
    Trash2, Loader2, Truck
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatToBRDate } from '../utils/dateUtils';

const API_BASE = '/api/romaneio-retorno';

export default function RomaneioRetornoPage() {
    const { showAlert: addAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [filters, setFilters] = useState({
        romaneio: '',
        projeto: '',
        tag: '',
        numDoc: '',
        mostrarConcluidos: false
    });

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'item' | 'history', data: any } | null>(null);

    // Fetch items based on filters
    const fetchItems = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams(filters as any).toString();
            const res = await fetch(`${API_BASE}/items?${query}`);
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
                // Clear history and selection if we search again
                setHistory([]);
                setSelectedItem(null);
            }
        } catch (error) {
            addAlert('Erro ao buscar itens', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch history for selected item
    const fetchHistory = async (itemId: number) => {
        try {
            const res = await fetch(`${API_BASE}/history/${itemId}`);
            const data = await res.json();
            if (data.success) {
                setHistory(data.data);
            }
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        }
    };

    const handleItemSelect = (item: any) => {
        setSelectedItem(item);
        fetchHistory(item.IdRomaneioItem);
    };

    const handleProcessReturn = async (itemId: number, qtde: number, observacao: string, tipo: string) => {
        try {
            const res = await fetch(`${API_BASE}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idRomaneioItem: itemId,
                    qtdeRetorno: qtde,
                    observacao,
                    tipoRetorno: tipo,
                    usuario: 'Sistema' // TODO: Get from auth
                })
            });
            const data = await res.json();
            if (data.success) {
                addAlert(data.message, 'success');
                fetchItems(); // Refresh main grid
                if (selectedItem?.IdRomaneioItem === itemId) {
                    fetchHistory(itemId); // Refresh history if it's the selected one
                }
            } else {
                addAlert(data.message, 'error');
            }
        } catch (error) {
            addAlert('Erro ao processar retorno', 'error');
        }
    };

    const handleDeleteHistory = async (idControle: number) => {
        if (!confirm('Tem certeza que deseja cancelar esta entrada?')) return;
        try {
            const res = await fetch(`${API_BASE}/history/${idControle}?usuario=Sistema`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                addAlert(data.message, 'success');
                fetchItems();
                if (selectedItem) fetchHistory(selectedItem.IdRomaneioItem);
            } else {
                addAlert(data.message, 'error');
            }
        } catch (error) {
            addAlert('Erro ao excluir histórico', 'error');
        }
    };

    // Context Menu Handlers
    const handleContextMenu = (e: React.MouseEvent, type: 'item' | 'history', data: any) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, data });
    };

    const closeContextMenu = () => setContextMenu(null);

    useEffect(() => {
        const handleClick = () => closeContextMenu();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Header - Filters */}
            <header className="bg-white border-b border-gray-200 p-4 shadow-sm">
                <div className="w-full max-w-[1920px] mx-auto flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Romaneio</label>
                        <input
                            type="text"
                            value={filters.romaneio}
                            onChange={e => setFilters({ ...filters, romaneio: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: 15"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Projeto</label>
                        <input
                            type="text"
                            value={filters.projeto}
                            onChange={e => setFilters({ ...filters, projeto: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tag</label>
                        <input
                            type="text"
                            value={filters.tag}
                            onChange={e => setFilters({ ...filters, tag: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cod. Material</label>
                        <input
                            type="text"
                            value={filters.numDoc}
                            onChange={e => setFilters({ ...filters, numDoc: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            checked={filters.mostrarConcluidos}
                            onChange={e => setFilters({ ...filters, mostrarConcluidos: e.target.checked })}
                            id="mostrarConcluidos"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="mostrarConcluidos" className="text-sm text-gray-600">Mostrar + Concluídos</label>
                    </div>
                    <button
                        onClick={fetchItems}
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#32423D] text-white px-6 py-2 rounded-md hover:bg-[#26312D] transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        PESQUISA
                    </button>
                </div>
            </header>

            {/* Main Content - Two Grids */}
            <main className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
                {/* Top Grid - Items */}
                <section className="flex-[2] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-500" />
                            ITENS DO ROMANEIO PARA RETORNO
                        </h2>
                        <span className="text-xs text-gray-500 font-mono">{items.length} itens encontrados</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#32423D] text-white text-xs sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Romaneio</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Projeto</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Tag</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Qtde Enviada</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Qtde Retorno</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Saldo</th>
                                    <th className="px-4 py-3 uppercase tracking-wider">Situação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">
                                            Nenhum item encontrado. Use os filtros acima para pesquisar.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr
                                            key={item.IdRomaneioItem}
                                            onClick={() => handleItemSelect(item)}
                                            onContextMenu={(e) => handleContextMenu(e, 'item', item)}
                                            className={`hover:bg-blue-50 cursor-pointer transition-colors text-sm ${selectedItem?.IdRomaneioItem === item.IdRomaneioItem ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}
                                        >
                                            <td className="px-4 py-2">
                                                {item.MarcarComoFinalizado === 'S' ?
                                                    <CheckCircle className="w-4 h-4 text-green-500" /> :
                                                    <RefreshCw className="w-4 h-4 text-blue-400" />
                                                }
                                            </td>
                                            <td className="px-4 py-2 font-mono">{item.IdRomaneio}</td>
                                            <td className="px-4 py-2">{item.PROJETO}</td>
                                            <td className="px-4 py-2 font-semibold text-blue-900">{item.TAG}</td>
                                            <td className="px-4 py-2 font-bold">{item.QtdeRomaneio}</td>
                                            <td className="px-4 py-2 text-green-600 font-bold">{item.QtdeTotalRetorno || 0}</td>
                                            <td className="px-4 py-2 text-red-600 font-bold">{(item.QtdeRomaneio || 0) - (item.QtdeTotalRetorno || 0)}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${item.Situacao?.includes('RETORNO') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {item.Situacao || 'AGUARDANDO'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Bottom Grid - History */}
                <section className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[200px]">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-green-500" />
                            HISTÓRICO DE MOVIMENTAÇÃO DO ITEM SELECIONADO
                        </h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-200 text-gray-700 text-[10px] uppercase sticky top-0 z-10 font-bold">
                                <tr>
                                    <th className="px-4 py-2">Data/Hora</th>
                                    <th className="px-4 py-2">Quantidade</th>
                                    <th className="px-4 py-2">Tipo</th>
                                    <th className="px-4 py-2">Usuário</th>
                                    <th className="px-4 py-2">Observação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {!selectedItem ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                            Selecione um item no grid acima para ver seu histórico.
                                        </td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                            Nenhuma movimentação registrada para este item.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((h) => (
                                        <tr
                                            key={h.idromaneioitemcontrole}
                                            onContextMenu={(e) => handleContextMenu(e, 'history', h)}
                                            className="hover:bg-gray-50 text-xs"
                                        >
                                            <td className="px-4 py-2 font-mono">{formatToBRDate(h.DataCriacao)}</td>
                                            <td className="px-4 py-2 font-bold text-blue-600">{h.QtdeIdentificadores}</td>
                                            <td className="px-4 py-2 font-semibold">{h.Situacao}</td>
                                            <td className="px-4 py-2">{h.UsuarioLogado}</td>
                                            <td className="px-4 py-2 text-gray-500">{h.Observacao}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* Context Menu Component */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 w-72 overflow-hidden"
                    >
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            Ações Disponíveis
                        </div>

                        {contextMenu.type === 'item' ? (
                            <>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <CheckCircle className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform" />
                                    <span>Marcar Todos</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <XCircle className="w-4 h-4 text-gray-400 group-hover:scale-110 transition-transform" />
                                    <span>Desmarcar Todos</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <RefreshCw className="w-4 h-4 text-black group-hover:rotate-180 transition-transform duration-500" />
                                    <span>Inverter Seleção</span>
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={() => handleProcessReturn(contextMenu.data.IdRomaneioItem, contextMenu.data.QtdeRomaneio - (contextMenu.data.QtdeTotalRetorno || 0), 'Entrada em lote', 'ENTRADA/RETORNO')}
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors"
                                >
                                    <FileCheck className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                    <span>Marcar Itens Selecionados Como Entrada/Retorno</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <ArrowLeftCircle className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
                                    <span>Marcar Item Individual como Entrada/Retorno</span>
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <ArrowLeftCircle className="w-4 h-4 text-black rotate-180 group-hover:translate-x-1 transition-transform" />
                                    <span>Marcar como Item Finalizado</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <AlertTriangle className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                                    <span>Gerar RNC - Lista Pendência Retorno</span>
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 group transition-colors">
                                    <FileText className="w-4 h-4 text-red-700 group-hover:scale-110 transition-transform" />
                                    <span>Abrir Desenho PDF</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleDeleteHistory(contextMenu.data.idromaneioitemcontrole)}
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-sm text-red-600 group transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    <span>Cancelar a entrada/Retorno do Item</span>
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
