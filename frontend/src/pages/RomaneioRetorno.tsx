import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search, RefreshCw, CheckCircle, FileCheck,
 ArrowLeft, ArrowLeftCircle, AlertTriangle, FileText,
 Loader2, Truck, History, RotateCcw, X
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';
import { formatToBRDate } from '../utils/dateUtils';

const API_BASE = '/api/romaneio-retorno';

// ─── Sub-view: Histórico romaneioitemcontrole ────────────────────────────────
function HistoricoControleView({ item, onBack }: { item: Record<string, unknown>; onBack: () => void }) {
 const { showAlert } = useAlert();
 const { user } = useAuth();
 const [controles, setControles] = useState<Record<string, unknown>[]>([]);
 const [loading, setLoading] = useState(true);
 const [processingId, setProcessingId] = useState<number | null>(null);
 const [estornoModal, setEstornoModal] = useState<{ ctrl: Record<string, unknown>; obs: string; qtde: string } | null>(null);
 const [dateFilter, setDateFilter] = useState({ inicio: '', fim: '' });

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

 const handleEstorno = async () => {
 if (!estornoModal) return;
 const { ctrl, obs, qtde } = estornoModal;
 const ctrlId = ctrl.idromaneioitem ?? ctrl.IdRomaneioItem ?? null;
 if (!ctrlId) {
 showAlert('ID do registro de controle não identificado. Atualize a lista e tente novamente.', 'error');
 setEstornoModal(null);
 return;
 }
 const maxQtde = Number(ctrl.qtdeUsuario ?? ctrl.QtdeUsuario ?? 0);
 const qtdeNum = Number(qtde);
 if (!qtdeNum || qtdeNum <= 0) {
 showAlert('Informe uma quantidade válida para estorno.', 'warning');
 return;
 }
 if (qtdeNum > maxQtde) {
 showAlert(`Quantidade (${qtdeNum}) não pode ser maior que a registrada (${maxQtde}).`, 'warning');
 return;
 }
 setProcessingId(ctrlId);
 setEstornoModal(null);
 try {
 const res = await fetch(`${API_BASE}/estorno/${ctrlId}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: user?.nome || 'Sistema', observacao: obs, qtdeEstorno: qtdeNum })
 });
 const data = await res.json();
 if (data.success) fetchControles();
 else showAlert(data.message, 'error');
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
 <div className="flex flex-col bg-white border border-indigo-200 rounded-lg shadow-inner overflow-hidden mb-2 relative">
 {/* Cabeçalho da sub-view */}
 <header className="bg-indigo-50 border-b border-indigo-100 px-3 py-2 flex items-center gap-3">
 <button
 onClick={onBack}
 className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
 >
 <X size={12} />
 Fechar
 </button>
 <div className="h-5 w-px bg-gray-300" />
 <div>
 <h2 className="text-xs font-bold text-gray-800 flex items-center gap-2">
 <History size={14} className="text-[#32423D]" />
 Histórico de Controle —{' '}
 <span className="text-[#32423D]">
 {item.DescResumo || item.CodMatFabricante || `ID: ${item.IdOrdemServicoItem || item.IDOrdemServicoITEM}`}
 </span>
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
 <main className="max-h-[350px] overflow-auto p-3">
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 {/* Filtro por data de retorno */}
 <div className="bg-gray-50 px-2 py-1 border-b border-gray-200 flex items-center gap-3 flex-wrap">
 <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Data Retorno:</span>
 <div className="flex items-center gap-1.5">
 <label className="text-[10px] text-gray-400 font-semibold uppercase">De</label>
 <input type="date" value={dateFilter.inicio} onChange={e => setDateFilter(f => ({ ...f, inicio: e.target.value }))}
 className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#32423D]/30 outline-none" />
 </div>
 <div className="flex items-center gap-1.5">
 <label className="text-[10px] text-gray-400 font-semibold uppercase">Até</label>
 <input type="date" value={dateFilter.fim} onChange={e => setDateFilter(f => ({ ...f, fim: e.target.value }))}
 className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#32423D]/30 outline-none" />
 </div>
 {(dateFilter.inicio || dateFilter.fim) && (
 <button onClick={() => setDateFilter({ inicio: '', fim: '' })} className="text-[10px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-0.5">
 <X size={11} /> Limpar
 </button>
 )}
 <span className="ml-auto text-xs text-gray-400 font-mono">{controles.filter(ctrl => {
 if (!dateFilter.inicio && !dateFilter.fim) return true;
 const d = ctrl.DataRetorno ? new Date(ctrl.DataRetorno) : null;
 if (!d) return false;
 if (dateFilter.inicio && d < new Date(dateFilter.inicio)) return false;
 if (dateFilter.fim) { const fim = new Date(dateFilter.fim); fim.setHours(23,59,59); if (d > fim) return false; }
 return true;
 }).length} registro(s)</span>
 </div>
 <div className="overflow-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-[#567469] text-white text-[11px] uppercase sticky top-0 z-10">
 <tr>
 <th className="px-2 py-1 text-center">Qtde Usuário</th>
 <th className="px-2 py-1">Situação</th>
 <th className="px-2 py-1">Data Retorno</th>
 <th className="px-2 py-1">Usuário Retorno</th>
 <th className="px-2 py-1">Observação</th>
 <th className="px-2 py-1 text-center">Estorno</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-xs">
 {loading ? (
 <tr>
 <td colSpan={6} className="px-4 py-10 text-center">
 <Loader2 size={22} className="animate-spin text-[#32423D] mx-auto" />
 </td>
 </tr>
 ) : (() => {
 const filtered = controles.filter(ctrl => {
 if (!dateFilter.inicio && !dateFilter.fim) return true;
 const d = ctrl.DataRetorno ? new Date(ctrl.DataRetorno) : null;
 if (!d) return false;
 if (dateFilter.inicio && d < new Date(dateFilter.inicio)) return false;
 if (dateFilter.fim) { const fim = new Date(dateFilter.fim); fim.setHours(23,59,59); if (d > fim) return false; }
 return true;
 });
 return filtered.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic text-xs">
 {controles.length === 0 ? 'Nenhum registro encontrado para este ID de OS Item.' : 'Nenhum registro no período selecionado.'}
 </td>
 </tr>
 ) : filtered.map((ctrl) => (
 <tr key={ctrl.idromaneioitem ?? ctrl.IdRomaneioItem} className={`hover:bg-gray-50 transition-colors ${ctrl.Situacao === 'ESTORNO' ? 'opacity-60' : ''}`}>
 <td className="px-2 py-0.5 text-center font-bold text-blue-700">{ctrl.qtdeUsuario ?? ctrl.QtdeUsuario ?? '-'}</td>
 <td className="px-2 py-0.5">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${situacaoBadge(ctrl.Situacao)}`}>
 {ctrl.Situacao || 'AGUARDANDO'}
 </span>
 </td>
 <td className="px-2 py-0.5 text-xs font-mono text-gray-500">{ctrl.DataRetorno ? formatToBRDate(ctrl.DataRetorno) : '-'}</td>
 <td className="px-2 py-0.5 text-xs font-medium text-[#32423D]">{ctrl.UsuarioRetorno || ctrl.Usuario || '-'}</td>
 <td className="px-2 py-0.5 text-xs text-gray-500 max-w-[200px] truncate" title={ctrl.Observacao}>{ctrl.Observacao || '-'}</td>
 <td className="px-2 py-0.5 text-center">
 {ctrl.Situacao === 'ESTORNO' ? (
 <span className="text-[10px] text-red-400 font-bold">ESTORNADO</span>
 ) : (
 <button
 onClick={() => setEstornoModal({ ctrl, obs: '', qtde: String(ctrl.qtdeUsuario ?? ctrl.QtdeUsuario ?? '') })}
 disabled={processingId === (ctrl.idromaneioitem ?? ctrl.IdRomaneioItem)}
 className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700 text-[11px] font-semibold border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50 mx-auto"
 title="Realizar Estorno: devolve qtde ao item do romaneio"
 >
 {processingId === (ctrl.idromaneioitem ?? ctrl.IdRomaneioItem)
 ? <Loader2 size={12} className="animate-spin" />
 : <RotateCcw size={12} />}
 Estornar
 </button>
 )}
 </td>
 </tr>
 ))})()}
 </tbody>
 </table>
 </div>
 </div>
 </main>

 {/* Modal Estorno com Observação */}
 {estornoModal && (() => {
 const maxQtde = Number(estornoModal.ctrl.qtdeUsuario ?? estornoModal.ctrl.QtdeUsuario ?? 0);
 const qtdeNum = Number(estornoModal.qtde);
 const qtdeInvalida = qtdeNum > maxQtde;
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEstornoModal(null)}>
 <div className="bg-white rounded-md shadow-2xl border border-gray-200 p-6 w-[420px]" onClick={e => e.stopPropagation()}>
 <h3 className="text-xs font-bold text-orange-700 mb-3 flex items-center gap-2">
 <RotateCcw size={15} /> Confirmar Estorno
 </h3>
 <div className="bg-orange-50 rounded-lg p-3 mb-4 text-xs">
 <p>Qtde registrada no retorno: <strong className="text-orange-700">{maxQtde}</strong></p>
 <p className="text-gray-500 mt-1">A quantidade digitada será devolvida ao item do romaneio.</p>
 </div>
 <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Quantidade a estornar <span className="text-red-500">*</span></label>
 <input
 type="number" min={1} max={maxQtde}
 value={estornoModal.qtde}
 onChange={e => setEstornoModal({ ...estornoModal, qtde: e.target.value })}
 autoFocus
 placeholder={`Máx: ${maxQtde}`}
 className={`w-full px-2 py-1 border rounded-lg text-xs outline-none mb-1 transition-colors ${
 qtdeInvalida
 ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
 : 'border-gray-300 focus:ring-2 focus:ring-orange-400/40'
 }`}
 />
 {qtdeInvalida && (
 <p className="text-red-600 text-[11px] mb-3">Quantidade não pode ser maior que {maxQtde}.</p>
 )}
 {!qtdeInvalida && <div className="mb-3" />}
 <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Observação (opcional)</label>
 <input
 type="text" maxLength={150}
 value={estornoModal.obs}
 onChange={e => setEstornoModal({ ...estornoModal, obs: e.target.value })}
 onKeyDown={e => e.key === 'Enter' && handleEstorno()}
 placeholder="Motivo do estorno..."
 className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-400/40 outline-none mb-4"
 />
 <div className="flex gap-2">
 <button
 onClick={handleEstorno}
 disabled={qtdeInvalida || !estornoModal.qtde}
 className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
 >
 Confirmar Estorno
 </button>
 <button onClick={() => setEstornoModal(null)} className="px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
 Cancelar
 </button>
 </div>
 </div>
 </div>
 );
 })()}
 </div>
 );
}

// ─── Página Principal: Romaneio-Retorno ─────────────────────────────────────
export default function RomaneioRetornoPage() {
 const { showAlert: addAlert } = useAlert();
 const { user } = useAuth();
 const [loading, setLoading] = useState(false);
 const [items, setItems] = useState<Record<string, unknown>[]>([]);
 const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
 const [historicoItem, setHistoricoItem] = useState<Record<string, unknown> | null>(null); // Item para abrir sub-view
 const [filters, setFilters] = useState({
 romaneio: '',
 projeto: '',
 tag: '',
 numDoc: '',
 mostrarConcluidos: false
 });
 const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'item', data: Record<string, unknown> } | null>(null);
 const [retornoPanel, setRetornoPanel] = useState<{ item: Record<string, unknown> } | null>(null);
 const [retornoQtde, setRetornoQtde] = useState('');
 const [retornoSaving, setRetornoSaving] = useState(false);

 const fetchItems = async () => {
 setLoading(true);
 try {
 const query = new URLSearchParams(filters as Record<string, unknown>).toString();
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

 const handleRegistrarRetorno = async () => {
 if (!retornoPanel) return;
 const qtde = Number(retornoQtde);
 const maxQ = Number(retornoPanel.item.Saldo) || 0;
 if (!qtde || qtde <= 0) { addAlert('Informe uma quantidade válida.', 'warning'); return; }
 if (qtde > maxQ) { addAlert(`Quantidade (${qtde}) não pode ser maior que o saldo atual (${maxQ}).`, 'warning'); return; }
 setRetornoSaving(true);
 try {
 const res = await fetch(`${API_BASE}/registrar-retorno`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 idRomaneioItem: retornoPanel.item.IdRomaneioItem,
 idRomaneio: retornoPanel.item.IdRomaneio,
 qtdeGrid: qtde,
 usuario: user?.nome || 'Sistema',
 nomeCompleto: user?.nome || 'Sistema'
 })
 });
 const data = await res.json();
 if (data.success) {
 setRetornoPanel(null); setRetornoQtde('');
 fetchItems();
 } else { addAlert(data.message, 'error'); }
 } catch { addAlert('Erro de conexão.', 'error'); }
 finally { setRetornoSaving(false); }
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

 const handleContextMenu = (e: React.MouseEvent, data: Record<string, unknown>) => {
 e.preventDefault();
 setContextMenu({ x: e.clientX, y: e.clientY, type: 'item', data });
 };

 useEffect(() => {
 const handleClick = () => setContextMenu(null);
 window.addEventListener('click', handleClick);
 return () => window.removeEventListener('click', handleClick);
 }, []);

 // Removido o early return do histórico para renderização inline

 return (
 <div className="flex flex-col flex-1 min-h-0 bg-gray-50 overflow-hidden">
 {/* ── PARTE 1: Filtros compactos ─────────────────────────────── */}
 <header className="bg-white border-b border-gray-200 px-2 py-1 shadow-sm">
 <div className="flex flex-wrap gap-2 items-end">
 <div className="flex-1 min-w-[110px]">
 <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Romaneio</label>
 <input
 type="text"
 value={filters.romaneio}
 onChange={e => setFilters({ ...filters, romaneio: e.target.value })}
 onKeyDown={e => e.key === 'Enter' && fetchItems()}
 className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
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
 className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
 />
 </div>
 <div className="flex-1 min-w-[110px]">
 <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Tag</label>
 <input
 type="text"
 value={filters.tag}
 onChange={e => setFilters({ ...filters, tag: e.target.value })}
 onKeyDown={e => e.key === 'Enter' && fetchItems()}
 className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
 />
 </div>
 <div className="flex-1 min-w-[110px]">
 <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Cód. Material</label>
 <input
 type="text"
 value={filters.numDoc}
 onChange={e => setFilters({ ...filters, numDoc: e.target.value })}
 onKeyDown={e => e.key === 'Enter' && fetchItems()}
 className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-[#32423D]/30 outline-none"
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
 className="flex items-center gap-1.5 bg-[#32423D] text-white px-4 py-1.5 rounded hover:bg-[#26312D] transition-colors disabled:opacity-50 text-xs font-medium"
 >
 {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
 Pesquisar
 </button>
 </div>
 </header>

 {/* ── PARTE 2: Grid de Itens — denso + coluna IdOrdemServicoItem ── */}
 <main className="flex-1 overflow-hidden p-3 flex flex-col">
 <section className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
 <div className="bg-gray-50 px-2 py-0.5 border-b border-gray-200 flex justify-between items-center">
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
 <th className="px-2 py-0.5">Status</th>
 <th className="px-2 py-0.5">Romaneio</th>
 <th className="px-2 py-0.5">ID OS Item</th>
 <th className="px-2 py-0.5">Projeto</th>
 <th className="px-2 py-0.5">Tag</th>
 <th className="px-2 py-0.5 text-right">Qtde Env.</th>
 <th className="px-2 py-0.5 text-right">Qtde Ret.</th>
 <th className="px-2 py-0.5 text-right">Saldo</th>
 <th className="px-2 py-0.5">Situação</th>
 <th className="px-2 py-0.5 text-center">Histórico</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 text-[12px]">
 {items.length === 0 ? (
 <tr>
 <td colSpan={10} className="px-4 py-10 text-center text-gray-400 italic text-xs">
 {loading
 ? <Loader2 size={20} className="animate-spin text-[#32423D] mx-auto" />
 : 'Nenhum item encontrado. Use os filtros acima para pesquisar.'}
 </td>
 </tr>
 ) : items.map((item) => (
 <React.Fragment key={item.IdRomaneioItem}>
 <tr
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
 <td className="px-3 py-1 text-right font-bold">{item.QtdeEnviada}</td>
 <td className="px-3 py-1 text-right text-green-600 font-bold">{item.QtdeTotalRetorno || 0}</td>
 <td className="px-3 py-1 text-right text-red-600 font-bold">{item.Saldo}</td>
 <td className="px-3 py-1">
 <span className={`px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${item.Situacao?.includes('RETORNO') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
 {item.Situacao || 'AGUARDANDO'}
 </span>
 </td>
 <td className="px-3 py-1 text-center" onClick={e => e.stopPropagation()}>
 <div className="flex items-center gap-1 justify-center flex-wrap">
 {(() => {
 const saldo = Number(item.Saldo) || 0;
 return saldo > 0 ? (
 <button
 onClick={() => { setRetornoPanel({ item }); setRetornoQtde(''); }}
 className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold border border-green-300 hover:bg-green-100 transition-colors"
 title={`Totalizar retorno de peças (saldo: ${saldo})`}
 >
 ↩ Retorno
 </button>
 ) : (
 <span
 className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-400 text-[10px] font-bold border border-gray-200 cursor-not-allowed"
 title="Saldo zerado — sem peças para retornar"
 >
 ↩ Retorno
 </span>
 );
 })()}
 <button
 onClick={() => setHistoricoItem(item)}
 className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors"
 title="Abrir histórico de controle (romaneioitemcontrole)"
 >
 <History size={11} />
 Ver Hist.
 </button>
 </div>
 </td>
 </tr>

 {historicoItem?.IdRomaneioItem === item.IdRomaneioItem && (

   <tr>

     <td colSpan={10} className="p-0 bg-gray-100/50 border-b-2 border-indigo-200">

       <div className="p-2 animate-in slide-in-from-top-2 duration-200">

         <HistoricoControleView item={historicoItem} onBack={() => setHistoricoItem(null)} />

       </div>

     </td>

   </tr>

 )}

 </React.Fragment>

 ))}

 </tbody>
 </table>
 </div>
 </section>
 </main>

 {/* Painel Inline — Totalizar Retorno */}
 {retornoPanel && (
 <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => { setRetornoPanel(null); setRetornoQtde(''); }}>
 <div className="bg-white rounded-md shadow-2xl border border-gray-200 p-6 w-[400px]" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xs font-bold text-[#32423D] flex items-center gap-2">
 <span>↩</span> Totalizar Retorno
 </h3>
 <button onClick={() => { setRetornoPanel(null); setRetornoQtde(''); }} className="text-gray-400 hover:text-gray-600">✕</button>
 </div>
 <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
 <div className="flex justify-between"><span className="text-gray-500">Romaneio:</span><strong>#{retornoPanel.item.IdRomaneio}</strong></div>
 <div className="flex justify-between"><span className="text-gray-500">Projeto / Tag:</span><strong>{retornoPanel.item.PROJETO} / {retornoPanel.item.TAG}</strong></div>
 <div className="flex justify-between"><span className="text-gray-500">Qtde Enviada:</span><strong className="text-blue-700">{retornoPanel.item.QtdeEnviada}</strong></div>
 <div className="flex justify-between"><span className="text-gray-500">Já retornado:</span><strong className="text-green-700">{retornoPanel.item.QtdeTotalRetorno || 0}</strong></div>
 </div>
 <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">Quantidade que retornou</label>
 <input
 type="number" min={1} max={Number(retornoPanel.item.Saldo) || 0}
 value={retornoQtde}
 onChange={e => setRetornoQtde(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleRegistrarRetorno()}
 autoFocus
 placeholder={'Max: ' + (Number(retornoPanel.item.Saldo) || 0)}
 className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#32423D]/40 outline-none mb-4"
 />
 <div className="flex gap-2">
 <button
 onClick={handleRegistrarRetorno}
 disabled={retornoSaving}
 className="flex-1 bg-[#32423D] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#26312D] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
 >
 {retornoSaving ? '...' : '✓ Confirmar Retorno'}
 </button>
 <button onClick={() => { setRetornoPanel(null); setRetornoQtde(''); }} className="px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
 Cancelar
 </button>
 </div>
 </div>
 </div>
 )}

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
 <div className="px-2 py-0.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
 Ações — Item #{contextMenu.data?.IdRomaneioItem}
 </div>
 {(() => {
 const d = contextMenu.data;
 const saldo = Number(d.Saldo) || 0;
 return saldo > 0 ? (
 <button
 onClick={() => { setRetornoPanel({ item: d }); setRetornoQtde(''); setContextMenu(null); }}
 className="w-full flex items-center gap-3 px-2 py-1 hover:bg-green-50 text-xs text-green-700 group transition-colors font-semibold"
 >
 <span className="w-4 h-4 text-center">↩</span>
 <span>Totalizar Retorno</span>
 </button>
 ) : (
 <div className="w-full flex items-center gap-3 px-2 py-1 text-xs text-gray-400 cursor-not-allowed" title="Saldo zerado">
 <span className="w-4 h-4 text-center">↩</span>
 <span>Totalizar Retorno (sem saldo)</span>
 </div>
 );
 })()}
 <div className="border-t border-gray-100 my-1" />
 <button
 onClick={() => { setHistoricoItem(contextMenu.data); setContextMenu(null); }}
 className="w-full flex items-center gap-3 px-2 py-1 hover:bg-indigo-50 text-xs text-indigo-700 group transition-colors"
 >
 <History className="w-4 h-4" />
 <span>Ver Histórico de Controle</span>
 </button>
 <div className="border-t border-gray-100 my-1" />
 <button
 onClick={() => {
 const d = contextMenu.data;
 handleProcessReturn(d.IdRomaneioItem, Number(d.Saldo) || 0, 'Entrada em lote', 'ENTRADA/RETORNO');
 setContextMenu(null);
 }}
 className="w-full flex items-center gap-3 px-2 py-1 hover:bg-[#E0E800]/10 text-xs text-gray-700 group transition-colors"
 >
 <FileCheck className="w-4 h-4 text-amber-500" />
 <span>Marcar como Entrada/Retorno</span>
 </button>
 <button className="w-full flex items-center gap-3 px-2 py-1 hover:bg-[#E0E800]/10 text-xs text-gray-700 group transition-colors">
 <ArrowLeftCircle className="w-4 h-4 text-orange-600" />
 <span>Marcar como Item Finalizado</span>
 </button>
 <button className="w-full flex items-center gap-3 px-2 py-1 hover:bg-[#E0E800]/10 text-xs text-gray-700 group transition-colors">
 <AlertTriangle className="w-4 h-4 text-red-600" />
 <span>Gerar RNC - Pendência Retorno</span>
 </button>
 <button className="w-full flex items-center gap-3 px-2 py-1 hover:bg-[#E0E800]/10 text-xs text-gray-700 group transition-colors">
 <FileText className="w-4 h-4 text-red-700" />
 <span>Abrir Desenho PDF</span>
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
