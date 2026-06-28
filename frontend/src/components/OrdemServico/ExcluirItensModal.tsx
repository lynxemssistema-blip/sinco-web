import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const API_BASE = '/api';

export interface OrdemServico {
 IdOrdemServico: number;
 Projeto?: string;
 Tag?: string;
 itens?: OrdemServicoItem[];
}

export interface OrdemServicoItem {
 IdOrdemServicoItem: number;
 IdOrdemServico?: string | number;
 DescResumo?: string;
 DescDetal?: string;
 Espessura?: string;
 CodMatFabricante?: string;
 MaterialSW?: string;
 Projeto?: string;
 Tag?: string;
 DescTag?: string;
 Qtd?: number;
 QtdeTotal?: number;
 Peso?: number;
 AreaPintura?: number;
 Liberado_Engenharia?: string;
 Pendencia?: string;
 PecaManufat?: string;
 OrdemServicoFinalizado?: string;
}

interface ExcluirItensModalProps {
 os: OrdemServico | null;
 itensOS: OrdemServicoItem[];
 isLoadingOS: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

export function ExcluirItensModal({ os, itensOS, isLoadingOS, onClose, onSuccess }: ExcluirItensModalProps) {
 const { addToast } = useToast();
 const [excluirItemChecks, setExcluirItemChecks] = useState<Set<number>>(new Set());
 const [excluindoItens, setExcluindoItens] = useState(false);

 useEffect(() => {
 if (os) setExcluirItemChecks(new Set());
 }, [os]);

 const toggleExcluirCheck = (itemId: number) => {
 setExcluirItemChecks(prev => {
 const next = new Set(prev);
 if (next.has(itemId)) next.delete(itemId);
 else next.add(itemId);
 return next;
 });
 };

 const toggleTodosExcluir = (itens: OrdemServicoItem[]) => {
 setExcluirItemChecks(prev => prev.size === itens.length ? new Set() : new Set(itens.map(i => i.IdOrdemServicoItem)));
 };

 const confirmExcluirItens = async () => {
 if (!os || excluirItemChecks.size === 0) return;
 const ids = Array.from(excluirItemChecks);
 if (!window.confirm(`Tem certeza que deseja excluir ${ids.length} item(ns) selecionado(s) da OS ${os.IdOrdemServico}? Esta ação não pode ser desfeita.`)) return;
 setExcluindoItens(true);
 let falhas = 0;
 for (const idItem of ids) {
 try {
 const res = await fetch(`${API_BASE}/ordemservicoitem/excluir`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ idOrdemServicoItem: idItem, idOrdemServico: os.IdOrdemServico })
 });
 const json = await res.json();
 if (!json.success) {
 falhas++;
 addToast({ type: 'error', title: 'Erro', message: `Erro ao excluir item #${idItem}: ${json.message}` });
 }
 } catch {
 falhas++;
 addToast({ type: 'error', title: 'Erro', message: `Falha ao conectar servidor` });
 }
 }
 setExcluindoItens(false);
 if (falhas === 0) {
 addToast({ type: 'success', title: 'Sucesso', message: `${ids.length} item(ns) excluído(s).` });
 onSuccess();
 onClose();
 } else {
 onSuccess();
 }
 };

 if (!os) return null;
 const todosChecados = itensOS.length > 0 && excluirItemChecks.size === itensOS.length;
 const totalSel = itensOS.filter(i => excluirItemChecks.has(i.IdOrdemServicoItem));

 return (
 <AnimatePresence>
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
 onClick={(e) => e.target === e.currentTarget && !excluindoItens && onClose()}
 >
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-3xl overflow-hidden border border-red-100 flex flex-col max-h-[85vh]"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50 shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-md bg-red-100 text-red-600 flex items-center justify-center"><Trash2 size={20} /></div>
 <div>
 <h2 className="text-base font-bold text-red-700">Excluir Itens — OS {os.IdOrdemServico}</h2>
 <p className="text-xs text-red-500 mt-0.5">{os.Projeto} / {os.Tag} · Selecione os itens a excluir</p>
 </div>
 </div>
 <button onClick={() => !excluindoItens && onClose()} className="p-2 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="flex-1 overflow-auto bg-gray-50/50 p-5">
 <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
 <label className="flex items-center gap-2 cursor-pointer select-none">
 <input type="checkbox" checked={todosChecados} onChange={() => toggleTodosExcluir(itensOS)}
 disabled={isLoadingOS || excluindoItens} className="w-4 h-4 accent-red-500" />
 <span className="text-xs text-gray-500 font-medium">
 {excluirItemChecks.size > 0
 ? <span className="text-red-600 font-bold">{excluirItemChecks.size} selecionado(s)</span>
 : itensOS.length + ' item(s) no total'
 }
 </span>
 </label>
 <div className="flex items-center gap-2">
 <button onClick={() => !excluindoItens && setos(null)} disabled={excluindoItens}
 className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors">
 Cancelar
 </button>
 <button onClick={handleConfirmarExclusaoItens}
 disabled={excluirItemChecks.size === 0 || excluindoItens}
 className="px-4 py-1.5 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow">
 {excluindoItens ? <><Loader2 size={13} className="animate-spin" /> Excluindo...</> : <><Trash2 size={13} /> Excluir ({excluirItemChecks.size})</>}
 </button>
 </div>
 </div>
 {/* Lista */}
 <div className="overflow-y-auto flex-1">
 {isLoadingOS ? (
 <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
 <Loader2 size={28} className="animate-spin" /><p className="text-sm">Carregando itens...</p>
 </div>
 ) : itensOS.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
 <Box size={32} strokeWidth={1.5} /><p className="text-sm">Nenhum item encontrado</p>
 </div>
 ) : (
 <table className="w-full text-sm border-collapse">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white text-white bg-[#567469] border-b border-white/20 sticky top-0 z-10">
 <tr>
 <th className="w-10 px-3 py-2.5"></th>
 <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase">Código</th>
 <th className="px-3 py-2.5 text-left text-xs text-white font-semibold uppercase">Descrição</th>
 <th className="px-3 py-2.5 text-center text-xs text-white font-semibold uppercase">Qtde</th>
 <th className="px-3 py-2.5 text-center text-xs text-white font-semibold uppercase">Peso (kg)</th>
 <th className="px-3 py-2.5 text-center text-xs text-white font-semibold uppercase">Área (m²)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {itensOS.map((item) => {
 const checked = excluirItemChecks.has(item.IdOrdemServicoItem);
 const areaItem = (item as any).AreaPintura;
 return (
 <tr key={item.IdOrdemServicoItem}
 onClick={() => !excluindoItens && toggleExcluirCheck(item.IdOrdemServicoItem)}
 className={'cursor-pointer transition-all border-l-4 ' + (checked ? 'bg-red-50 border-l-red-400' : 'hover:bg-gray-50 border-l-transparent')}>
 <td className="px-3 py-2.5 text-center">
 <input type="checkbox" checked={checked}
 onChange={() => toggleExcluirCheck(item.IdOrdemServicoItem)}
 onClick={(e) => e.stopPropagation()}
 disabled={excluindoItens} className="w-4 h-4 accent-red-500 cursor-pointer" />
 </td>
 <td className="px-3 py-2.5">
 <span className="font-bold text-xs text-primary bg-accent/20 px-2 py-0.5 rounded">{item.CodMatFabricante || '-'}</span>
 {item.ProdutoPrincipal === 'SIM' && <Star size={10} className="inline ml-1 text-yellow-500 fill-yellow-400" />}
 </td>
 <td className="px-3 py-2.5 text-xs text-gray-700 max-w-xs truncate" title={item.DescDetal || item.DescResumo || ''}>{item.DescResumo || '-'}</td>
 <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-700">{item.QtdeTotal ?? '-'}</td>
 <td className="px-3 py-2.5 text-center text-xs text-gray-600">{item.Peso ? Number(item.Peso).toFixed(2) : '-'}</td>
 <td className="px-3 py-2.5 text-center text-xs text-gray-600">{areaItem ? Number(areaItem).toFixed(2) : '-'}</td>
 </tr>
 );
 })}
 </tbody>
 <tfoot className="bg-gray-50 border-t-2 border-gray-200 sticky bottom-0">
 <tr>
 <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 font-semibold">Total ({itensOS.length})</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-primary">{itensOS.reduce((a, i) => a + (Number(i.QtdeTotal) || 0), 0)}</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-primary">{itensOS.reduce((a, i) => a + (Number(i.Peso) || 0), 0).toFixed(2)}</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-primary">{itensOS.reduce((a, i) => a + (Number((i as any).AreaPintura) || 0), 0).toFixed(2)}</td>
 </tr>
 {excluirItemChecks.size > 0 && (
 <tr className="bg-red-50 border-t border-red-200">
 <td colSpan={3} className="px-4 py-2 text-xs text-red-600 font-bold">Selecionados ({totalSel.length})</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-red-600">{totalSel.reduce((a, i) => a + (Number(i.QtdeTotal) || 0), 0)}</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-red-600">{totalSel.reduce((a, i) => a + (Number(i.Peso) || 0), 0).toFixed(2)} kg</td>
 <td className="px-3 py-2 text-center text-xs font-bold text-red-600">{totalSel.reduce((a, i) => a + (Number((i as any).AreaPintura) || 0), 0).toFixed(2)} m²</td>
 </tr>
 )}
 </tfoot>
 </table>
 )}
 </div>
 </div>
 </motion.div>
 </motion.div>
 </AnimatePresence>
 );
}

