import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, Search, PlusCircle, AlertCircle, Box } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const API_BASE = '/api';

export interface OrdemServico {
 IdOrdemServico: number;
 Projeto?: string;
 Tag?: string;
 IdProjeto?: number;
}

export interface OrdemServicoItem {
 IdOrdemServicoItem: number;
 IdOrdemServico?: string | number;
 DescResumo?: string;
 DescDetal?: string;
 Qtd?: number;
 CodigoAlternativo?: string;
}

interface IncluirItensModalProps {
 os: OrdemServico | null;
 onClose: () => void;
 onSuccess: (osId: number) => void;
}

export function IncluirItensModal({ os, onClose, onSuccess }: IncluirItensModalProps) {
 const { addToast } = useToast();
 const [searchItensDisp, setSearchItensDisp] = useState('');
 const [itensDisponiveis, setItensDisponiveis] = useState<OrdemServicoItem[]>([]);
 const [loadingItensDisp, setLoadingItensDisp] = useState(false);
 const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
 const [salvandoItens, setSalvandoItens] = useState(false);

 useEffect(() => {
 if (os) {
 setSearchItensDisp('');
 setItensSelecionados(new Set());
 fetchItensDisponiveis(os, '');
 }
 }, [os]);

 const fetchItensDisponiveis = async (osRef: OrdemServico, search = '') => {
 setLoadingItensDisp(true);
 try {
 const params = new URLSearchParams();
 if (search) params.set('search', search);
 const res = await fetch(`${API_BASE}/ordemservico/${osRef.IdOrdemServico}/itens-disponiveis?${params}`);
 const json = await res.json();
 if (json.success) setItensDisponiveis(json.data);
 else addToast({ type: 'error', title: 'Erro', message: json.message });
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Falha ao buscar itens disponíveis.' });
 } finally {
 setLoadingItensDisp(false);
 }
 };

 const handleConfirmarInclusao = async () => {
 if (!os || itensSelecionados.size === 0) return;
 setSalvandoItens(true);
 try {
 const res = await fetch(`${API_BASE}/ordemservico/${os.IdOrdemServico}/incluir-itens`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ itensSelecionados: Array.from(itensSelecionados) }),
 });
 const json = await res.json();
 if (json.success || json.adicionados > 0) {
 addToast({ type: 'success', title: 'Sucesso', message: json.message });
 onSuccess(os.IdOrdemServico);
 onClose();
 } else {
 addToast({ type: 'warning', title: 'Atenção', message: json.message });
 }
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Falha ao incluir itens.' });
 } finally {
 setSalvandoItens(false);
 }
 };

 const toggleSelect = (itemId: number) => {
 setItensSelecionados(prev => {
 const next = new Set(prev);
 if (next.has(itemId)) next.delete(itemId);
 else next.add(itemId);
 return next;
 });
 };

 if (!os) return null;
 const todosChecados = itensDisponiveis.length > 0 && itensSelecionados.size === itensDisponiveis.length;
 const showModalIncluirItens = os;

 return (
 <AnimatePresence>
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
 style={{ maxHeight: '90vh' }}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-teal-50/60">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-md bg-teal-600 flex items-center justify-center shadow">
 <PackagePlus size={18} className="text-white" />
 </div>
 <div>
 <h3 className="text-base font-bold text-gray-800">Incluir Itens na OS {showModalIncluirItens.IdOrdemServico}</h3>
 <p className="text-xs text-gray-500">Selecione os itens a adicionar. Itens já presentes são excluídos da lista.</p>
 </div>
 </div>
 <button onClick={() => setShowModalIncluirItens(null)}
 className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* Search + select-all bar */}
 <div className="px-4 py-1.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 flex-wrap">
 <div className="relative flex-1" style={{ minWidth: 200 }}>
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
 <input
 type="text"
 value={searchItensDisp}
 onChange={e => {
 setSearchItensDisp(e.target.value);
 }}
 onKeyDown={e => {
 if (e.key === 'Enter') fetchItensDisponiveis(showModalIncluirItens, searchItensDisp);
 }}
 placeholder="Buscar código, descrição, projeto, tag..."
 className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-400"
 />
 </div>
 <button
 onClick={() => fetchItensDisponiveis(showModalIncluirItens, searchItensDisp)}
 className="px-3 py-2 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1"
 >
 <Search size={13} /> Buscar
 </button>
 <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none ml-auto">
 <input
 type="checkbox"
 checked={itensDisponiveis.length > 0 && itensSelecionados.size === itensDisponiveis.length}
 onChange={e => {
 if (e.target.checked) {
 // Seleciona apenas itens com Espessura e MaterialSW preenchidos
 setItensSelecionados(new Set(
 itensDisponiveis
 .filter(i => i.Espessura && String(i.Espessura).trim() !== '' && i.MaterialSW && String(i.MaterialSW).trim() !== '')
 .map(i => i.IdOrdemServicoItem)
 ));
 } else {
 setItensSelecionados(new Set());
 }
 }}
 className="w-4 h-4 accent-teal-600"
 />
 Selecionar todos
 </label>
 <span className="text-xs text-gray-400">{itensSelecionados.size} selecionado(s)</span>
 </div>

 {/* Table */}
 <div className="flex-1 overflow-y-auto">
 {loadingItensDisp ? (
 <div className="flex items-center justify-center py-16 text-gray-400">
 <Loader2 size={24} className="animate-spin mr-2" /> Buscando itens...
 </div>
 ) : itensDisponiveis.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-gray-400">
 <Box size={40} className="mb-2 opacity-20" />
 <p className="text-sm">Nenhum item disponível para inclusão.</p>
 <p className="text-xs mt-1 text-gray-300">Todos os itens já estão incluídos nesta OS ou não há itens cadastrados.</p>
 </div>
 ) : (
 <table className="w-full text-xs">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white text-white sticky top-0 bg-[#567469] z-10">
 <tr className="border-b border-white/20">
 <th className="w-10 px-4 py-2 text-center text-white"></th>
 <th className="px-3 py-2 text-left font-semibold text-white">Código</th>
 <th className="px-3 py-2 text-left font-semibold text-white">Descrição</th>
 <th className="px-3 py-2 text-left font-semibold text-white hidden md:table-cell">Projeto / Tag</th>
 <th className="px-3 py-2 text-center font-semibold text-white hidden lg:table-cell">Espessura</th>
 <th className="px-3 py-2 text-center font-semibold text-white hidden lg:table-cell">Material</th>
 <th className="px-3 py-2 text-center font-semibold text-white">Peso (kg)</th>
 </tr>
 </thead>
 <tbody>
 {itensDisponiveis.map(item => {
 const sel = itensSelecionados.has(item.IdOrdemServicoItem);
 const semEsp = !item.Espessura || String(item.Espessura).trim() === '';
 const semMat = !item.MaterialSW || String(item.MaterialSW).trim() === '';
 const invalido = semEsp || semMat;
 return (
 <tr
 key={item.IdOrdemServicoItem}
 onClick={() => {
 if (invalido) return; // bloqueia seleção de itens inválidos
 setItensSelecionados(prev => {
 const n = new Set(prev);
 sel ? n.delete(item.IdOrdemServicoItem) : n.add(item.IdOrdemServicoItem);
 return n;
 });
 }}
 title={invalido ? 'Item bloqueado: ' + (semEsp ? 'Espessura ' : '') + (semMat ? 'MaterialSW ' : '') + 'não preenchido(s)' : ''}
 className={'border-b border-gray-100 transition-colors ' + (invalido ? 'bg-amber-50 opacity-80 cursor-not-allowed' : sel ? 'bg-teal-50 hover:bg-teal-100/70 cursor-pointer' : 'hover:bg-gray-50 cursor-pointer')}
 >
 <td className="px-4 py-2 text-center">
 {invalido ? (
 <AlertTriangle size={14} className="text-amber-500 mx-auto" />
 ) : (
 <input
 type="checkbox"
 checked={sel}
 readOnly
 className="w-4 h-4 accent-teal-600 cursor-pointer"
 />
 )}
 </td>
 <td className="px-3 py-2">
 <span className={'font-bold px-2 py-0.5 rounded text-[11px] ' + (invalido ? 'text-amber-700 bg-amber-100' : 'text-primary bg-primary/10')}>
 {item.CodMatFabricante || '-'}
 </span>
 </td>
 <td className="px-3 py-2 text-gray-700 max-w-xs">
 <div className="truncate" title={item.DescDetal || item.DescResumo}>
 {item.DescResumo || '-'}
 </div>
 {item.DescDetal && item.DescDetal !== item.DescResumo && (
 <div className="text-gray-400 truncate text-[10px]">{item.DescDetal}</div>
 )}
 </td>
 <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
 <div className="font-medium">{item.Projeto || '-'}</div>
 {item.Tag && <div className="text-[10px] text-gray-400">{item.Tag}</div>}
 </td>
 <td className="px-3 py-2 text-center hidden lg:table-cell">
 {semEsp
 ? <span className="text-amber-600 font-semibold text-[11px]">⚠ Ausente</span>
 : <span className="text-gray-600">{item.Espessura}</span>
 }
 </td>
 <td className="px-3 py-2 text-center hidden lg:table-cell">
 {semMat
 ? <span className="text-amber-600 font-semibold text-[11px]">⚠ Ausente</span>
 : <span className="text-gray-600">{item.MaterialSW}</span>
 }
 </td>
 <td className="px-3 py-2 text-center text-gray-600 font-medium">
 {item.Peso ? item.Peso : '-'}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 )}
 </div>

 {/* Footer */}
 <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
 <div className="text-xs text-gray-500 flex flex-col gap-0.5">
 <span>{itensDisponiveis.length} item(ns) disponível(-eis) · {itensSelecionados.size} selecionado(s)</span>
 {itensDisponiveis.some(i => !i.Espessura || !i.MaterialSW) && (
 <span className="flex items-center gap-1 text-amber-600 font-medium">
 <AlertTriangle size={12} />
 Itens em amarelo estão bloqueados por falta de Espessura ou MaterialSW.
 </span>
 )}
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => setShowModalIncluirItens(null)}
 className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
 >
 Cancelar
 </button>
 <button
 onClick={handleConfirmarInclusao}
 disabled={itensSelecionados.size === 0 || salvandoItens}
 className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
 >
 {salvandoItens ? (
 <><Loader2 size={15} className="animate-spin" /> Incluindo...</>
 ) : (
 <><PackagePlus size={15} /> Incluir {itensSelecionados.size > 0 ? `(${itensSelecionados.size})` : ''} Itens</>
 )}
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
}

