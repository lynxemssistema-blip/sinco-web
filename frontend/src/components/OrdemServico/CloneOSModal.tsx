import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, X, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const API_BASE = '/api';

interface OrdemServico {
 IdOrdemServico: number;
 Projeto?: string;
 Tag?: string;
 Descricao?: string;
 IdProjeto?: string | number;
 IdTag?: string | number;
}

interface DropdownOption {
 value: string;
 label: string;
}

interface CloneOSModalProps {
 os: OrdemServico;
 onClose: () => void;
 projetosClonagem: DropdownOption[];
 onSuccess: () => void;
 userNome?: string;
}

export function CloneOSModal({ os, onClose, projetosClonagem, onSuccess, userNome }: CloneOSModalProps) {
 const { addToast } = useToast();
 
 const [cloneDescricao, setCloneDescricao] = useState(os.Descricao || '');
 const [cloneFator, setCloneFator] = useState(1);
 const [cloneProjetoId, setCloneProjetoId] = useState<number | string>(() => {
 return localStorage.getItem('powerbuild_selected_idprojeto') || os.IdProjeto || '';
 });
 const [cloneTagId, setCloneTagId] = useState<number | string>(os.IdTag || '');
 
 const [cloneTags, setCloneTags] = useState<DropdownOption[]>([]);
 const [loadingCloneTags, setLoadingCloneTags] = useState(false);
 const [cloneTagsEmpty, setCloneTagsEmpty] = useState(false);
 const [liberandoOS, setLiberandoOS] = useState<number | null>(null);

 useEffect(() => {
 // Pre-fill message on mount if from PowerBuild
 const savedProjetoId = localStorage.getItem('powerbuild_selected_idprojeto');
 const savedTagId = localStorage.getItem('powerbuild_selected_idtag');
 const savedProjetoNm = localStorage.getItem('powerbuild_selected_nomprojeto');
 const savedTagNm = localStorage.getItem('powerbuild_selected_nomtag');
 
 if (savedProjetoId) {
 addToast({
 type: 'info',
 title: 'Projeto/Tag pré-selecionados',
 message: `Pré-preenchido com: ${savedProjetoNm}${savedTagNm ? ' / ' + savedTagNm : ''} (do Power Build)`
 });
 if (savedTagId) {
 sessionStorage.setItem('_pending_clone_tag', savedTagId);
 sessionStorage.setItem('_pending_clone_tag_nome', savedTagNm || '');
 }
 }
 }, []);

 useEffect(() => {
 setCloneTagId('');
 setCloneTagsEmpty(false);
 if (cloneProjetoId) {
 setLoadingCloneTags(true);
 fetch(`${API_BASE}/ordemservico/tags-clonagem?projetoId=${encodeURIComponent(cloneProjetoId)}`)
 .then(res => res.json())
 .then(json => {
 if (json.success) {
 setCloneTags(json.data);
 setCloneTagsEmpty(json.data.length === 0);
 // Aplica tag pendente do Power Build (se existir)
 const pendingTag = sessionStorage.getItem('_pending_clone_tag');
 if (pendingTag && json.data.some((t: any) => t.value.toString() === pendingTag)) {
 setCloneTagId(pendingTag);
 }
 sessionStorage.removeItem('_pending_clone_tag');
 sessionStorage.removeItem('_pending_clone_tag_nome');
 }
 })
 .finally(() => setLoadingCloneTags(false));
 } else {
 setCloneTags([]);
 }
 }, [cloneProjetoId]);

 const executeClone = async () => {
 if (!cloneProjetoId || !cloneTagId) {
 addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um Projeto e uma Tag destino!' });
 return;
 }

 setLiberandoOS(os.IdOrdemServico);
 try {
 const response = await fetch(`${API_BASE}/ordemservico/clonar`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}`
 },
 body: JSON.stringify({
 IdOrdemServico: os.IdOrdemServico,
 novoIdProjeto: cloneProjetoId,
 novoIdTag: cloneTagId,
 novaDescricao: cloneDescricao,
 novoFator: cloneFator,
 usuarioNome: userNome || 'Sistema Web'
 })
 });

 const data = await response.json();
 if (data.success) {
 addToast({ type: 'success', title: 'Sucesso', message: `OS clonada perfeitamente! Nova OS ID: ${data.novoId}` });
 onSuccess();
 onClose();
 } else {
 addToast({ type: 'error', title: 'Erro na Clonagem', message: data.message || 'Erro ao duplicar a OS.' });
 }
 } catch (error: any) {
 console.error('Erro ao clonar O.S:', error);
 addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha ao se comunicar com a API de Clonagem.' });
 } finally {
 setLiberandoOS(null);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-white rounded-md shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
 >
 <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50">
 <h3 className="text-lg font-bold text-primary flex items-center gap-2">
 <Copy size={20} className="text-accent" />
 Clonar Ordem de Serviço
 </h3>
 <button
 onClick={onClose}
 className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 <div className="p-6 overflow-y-auto flex-1 space-y-4">
 <div className="bg-[#E0E800]/30 text-[#32423D] p-3 rounded-lg text-sm mb-4">
 <strong>Atenção:</strong> Você está prestes a duplicar a <strong>OS {os.IdOrdemServico}</strong>.<br/> 
 Selecione o Projeto e a Tag de destino.
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Novo Projeto Destino *
 </label>
 <select
 value={cloneProjetoId}
 onChange={(e) => setCloneProjetoId(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
 required
 >
 <option value="">Selecione o Projeto...</option>
 {projetosClonagem.map(p => (
 <option key={p.value} value={p.value}>{p.label}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nova Tag Destino *
 </label>
 {loadingCloneTags ? (
 <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
 <Loader2 size={14} className="animate-spin" />
 Carregando tags...
 </div>
 ) : cloneTagsEmpty ? (
 <div className="flex items-center gap-2 px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-sm text-amber-700">
 <span className="text-base">⚠️</span>
 <span>Este projeto não possui tags cadastradas. Selecione outro projeto para continuar.</span>
 </div>
 ) : (
 <select
 value={cloneTagId}
 onChange={(e) => setCloneTagId(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
 required
 disabled={!cloneProjetoId}
 >
 <option value="">Selecione a Tag...</option>
 {cloneTags.map(t => (
 <option key={t.value} value={t.value}>{t.label}</option>
 ))}
 </select>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Fator Multiplicador
 </label>
 <input
 type="number"
 min="1"
 step="1"
 value={cloneFator}
 onChange={(e) => setCloneFator(parseInt(e.target.value) || 1)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent"
 />
 <p className="text-xs text-gray-500 mt-1">Multiplica as quantidades e pesos da OS original.</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Nova Descrição (Opcional)
 </label>
 <textarea
 value={cloneDescricao}
 onChange={(e) => setCloneDescricao(e.target.value)}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent resize-none"
 placeholder="Descreva o motivo da clonagem ou especificidades da nova OS..."
 />
 </div>
 </div>

 <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
 <button
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
 >
 Cancelar
 </button>
 <button
 onClick={executeClone}
 disabled={liberandoOS === os.IdOrdemServico || !cloneProjetoId || !cloneTagId}
 className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {liberandoOS === os.IdOrdemServico ? (
 <><Loader2 size={16} className="animate-spin" /> Clonando...</>
 ) : (
 <><Copy size={16} /> Confirmar Clonagem</>
 )}
 </button>
 </div>
 </motion.div>
 </div>
 );
}
