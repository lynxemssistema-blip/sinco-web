import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus, Search, Edit2, Trash2, X, Save,
 Loader2, RefreshCw, Filter, User, Camera, Image as ImageIcon
} from 'lucide-react';

const API_BASE = '/api';

interface Motorista {
 IdMotorista?: number;
 Motorista: string;
 DataCadastro?: string;
 CNH: string;
 Categoria: string;
 Telefone: string; DataVencimentoCNH?: string; ImagemCNH?: string;
 UsuarioD_E_L_E_T_E?: string; // Optional field for who deleted it, not strictly needed for UI list
}

const emptyForm: Motorista = { DataVencimentoCNH: '', ImagemCNH: '',
 Motorista: '',
 CNH: '',
 Categoria: '',
 Telefone: ''
};

export default function MotoristaPage() {
 const [motoristas, setMotoristas] = useState<Motorista[]>([]);
 const [formData, setFormData] = useState<Motorista>(emptyForm);
 const [isEditing, setIsEditing] = useState(false);
 const [searchNome, setSearchNome] = useState(''); const [searchVencimentoInicio, setSearchVencimentoInicio] = useState(''); const [searchVencimentoFim, setSearchVencimentoFim] = useState('');
 const [showFilters, setShowFilters] = useState(false);
 const [showForm, setShowForm] = useState(false);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [zoomLevel, setZoomLevel] = useState(1);
 // Fetch data from API
 const fetchMotoristas = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_BASE}/motoristas`);
 const json = await res.json();
 if (json.success) {
 setMotoristas(json.data);
 } else {
 setError(json.message || 'Erro ao carregar dados');
 }
 } catch {
 setError('Erro de conexão com o servidor.');
 console.error('Fetch error:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchMotoristas();
 }, []);

 const filteredMotoristas = motoristas.filter(m => {
     let matchNome = !searchNome || m.Motorista?.toLowerCase().includes(searchNome.toLowerCase());
     let matchData = true;
     if (searchVencimentoInicio && m.DataVencimentoCNH) {
         matchData = matchData && m.DataVencimentoCNH >= searchVencimentoInicio;
     }
     if (searchVencimentoFim && m.DataVencimentoCNH) {
         matchData = matchData && m.DataVencimentoCNH <= searchVencimentoFim;
     }
     if ((searchVencimentoInicio || searchVencimentoFim) && !m.DataVencimentoCNH) {
         matchData = false;
     }
     return matchNome && matchData;
 });

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
 const name = e.target.name;
    const value = name.toLowerCase().includes('desc') ? e.target.value.toUpperCase() : e.target.value;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         const formPayload = new FormData();
         formPayload.append('file', file);
         try {
             const res = await fetch(`${API_BASE}/motoristas/upload-cnh`, {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` },
                 body: formPayload
             });
             const json = await res.json();
             if (json.success && json.url) {
                 setFormData(prev => ({ ...prev, ImagemCNH: json.url }));
             } else {
                 setError('Falha ao fazer upload da imagem.');
             }
         } catch (error) {
             setError('Erro de conexão ao fazer upload da imagem.');
         }
     }
 };

 const handleWheel = (e: React.WheelEvent) => {
 if (e.deltaY < 0) {
 setZoomLevel(prev => Math.min(prev + 0.25, 4));
 } else {
 setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
 }
 };

 const inputBaseClass = "w-full px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
 const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
 const inputOptional = `${inputBaseClass} border-gray-200`;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setError(null);

 try {
 const url = isEditing ? `${API_BASE}/motoristas/${formData.IdMotorista}` : `${API_BASE}/motoristas`;
 const method = isEditing ? 'PUT' : 'POST';

 const res = await fetch(url, {
 method,
 headers: { 
 'Content-Type': 'application/json'
 },
 body: JSON.stringify(formData),
 });

 const json = await res.json();
 if (json.success) {
 await fetchMotoristas();
 resetForm();
 } else {
 setError(json.message || 'Erro ao salvar');
 }
 } catch {
 setError('Erro ao salvar. Verifique a conexão.');
 console.error('Save error:', err);
 } finally {
 setSaving(false);
 }
 };

 const handleEdit = (motorista: Motorista) => {
 setFormData(motorista);
 setIsEditing(true);
 setShowForm(true);
 };

 const handleDelete = async (id: number) => {
 if (!confirm('Deseja realmente excluir este motorista?')) return;

 try {
 const res = await fetch(`${API_BASE}/motoristas/${id}`, {
 method: 'DELETE'
 });
 const json = await res.json();
 if (json.success) {
 await fetchMotoristas();
 } else {
 setError(json.message || 'Erro ao excluir');
 }
 } catch {
 setError('Erro ao excluir. Verifique a conexão.');
 }
 };

 const resetForm = () => {
 setFormData(emptyForm);
 setIsEditing(false);
 setShowForm(false);
 };

 return (
 <div className="space-y-6 h-full flex flex-col min-h-0">
 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
 <div className="flex gap-2">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={fetchMotoristas}
 className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
 disabled={loading}
 >
 <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
 </motion.button>
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => { resetForm(); setShowForm(true); }}
 className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#32423D] text-white font-medium hover:bg-[#3d4f49] transition-colors shadow-sm"
 >
 <Plus size={15} />
 Novo Motorista
 </motion.button>
 </div>
 </div>

 {/* Error Alert */}
 {error && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs"
 >
 {error}
 </motion.div>
 )}

 {/* Search Filters Section */}
 <div className="bg-white rounded-md shadow-sm border border-gray-100 mb-2 shrink-0">
 <div className="flex justify-between items-center px-2 py-1 border-b border-gray-100">
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2 m-0">
 <Search size={12} /> Dados para Pesquisa
 </h3>
 <button
 type="button"
 onClick={() => setShowFilters(!showFilters)}
 className="text-[10px] flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-2 py-1 rounded transition-colors border border-gray-200 uppercase font-bold"
 >
 <Filter size={11} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
 </button>
 </div>
 {showFilters && (
 <div className="px-4 pb-3 pt-2">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Nome do Motorista:</label>
 <div className="relative">
 <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
 <input
 type="search"
 placeholder="Pesquisar por nome..."
 value={searchNome}
 onChange={(e) => setSearchNome(e.target.value)}
 className="w-full pl-7 pr-3 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
 />
 </div>
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Vencimento CNH (Início):</label>
 <input
 type="date"
 value={searchVencimentoInicio}
 onChange={(e) => setSearchVencimentoInicio(e.target.value)}
 className="w-full px-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
 />
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Vencimento CNH (Fim):</label>
 <input
 type="date"
 value={searchVencimentoFim}
 onChange={(e) => setSearchVencimentoFim(e.target.value)}
 className="w-full px-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm"
 />
 </div>
 </div>
 {(searchNome || searchVencimentoInicio || searchVencimentoFim) && (
 <div className="flex justify-end mt-2">
 <button
 onClick={() => {
 setSearchNome('');
 setSearchVencimentoInicio('');
 setSearchVencimentoFim('');
 }}
 className="px-3 py-1 text-gray-500 font-semibold text-[10px] tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1.5 uppercase"
 >
 <X size={11} /> Limpar Filtro
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Form Modal */}
 <AnimatePresence>
 {showForm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
 onClick={(e) => e.target === e.currentTarget && resetForm()}
 >
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="bg-white rounded-md shadow-xl w-full max-w-lg my-8"
 >
 <div className="flex items-center justify-between p-5 border-b border-gray-100">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
 <User size={20} />
 </div>
 <h2 className="text-lg font-semibold text-[#32423D]">
 {isEditing ? 'Editar Motorista' : 'Novo Motorista'}
 </h2>
 </div>
 <button
 onClick={resetForm}
 className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-5 space-y-5">
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Nome do Motorista <span className="text-red-500 font-bold">*</span>
 </label>
 <input
 type="text"
 name="Motorista"
 value={formData.Motorista || ''}
 onChange={handleInputChange}
 className={inputRequired}
 placeholder="Nome completo..."
 required
 />
 </div>
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 CNH
 </label>
 <input
 type="text"
 name="CNH"
 value={formData.CNH || ''}
 onChange={handleInputChange}
 className={inputOptional}
 placeholder="Nº da CNH"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Categoria
 </label>
 <input
 type="text"
 name="Categoria"
 value={formData.Categoria || ''}
 onChange={handleInputChange}
 className={inputOptional}
 placeholder="Ex: AD, D..."
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Telefone
 </label>
 <input
 type="text"
 name="Telefone"
 value={formData.Telefone || ''}
 onChange={handleInputChange}
 className={inputOptional}
 placeholder="(XX) XXXXX-XXXX"
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Data de Venc. CNH
 </label>
 <input
 type="date"
 name="DataVencimentoCNH"
 value={formData.DataVencimentoCNH || ''}
 onChange={handleInputChange}
 className={inputOptional}
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Imagem CNH
 </label>
 <div className="mt-1 flex justify-center px-4 py-3 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors bg-gray-50/50">
 <div className="space-y-1 text-center w-full">
 {formData.ImagemCNH ? (
 <div className="relative inline-block group/img" onMouseLeave={() => setZoomLevel(1)}>
 <img src={formData.ImagemCNH} alt="CNH" className="mx-auto h-16 w-auto rounded object-cover shadow-sm cursor-zoom-in" />
 
 {/* Fullscreen Lightbox View on Hover */}
 <div className="fixed inset-0 z-[100] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/img:pointer-events-auto bg-black/40 backdrop-blur-sm" onWheel={handleWheel}>
 <img src={formData.ImagemCNH} alt="CNH Ampliada" className="max-w-[90vw] max-h-[90vh] object-contain drop-shadow-2xl rounded-lg transition-transform duration-75" style={{ transform: `scale(${zoomLevel})` }} />
 </div>

 <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, ImagemCNH: '' }))}
 className="absolute -top-2 -right-2 p-1 bg-white rounded-full text-red-500 hover:text-red-700 shadow-md border border-gray-100 z-50 opacity-0 group-hover/img:opacity-100 transition-opacity"
 >
 <X size={14} />
 </button>
 </div>
 ) : (
 <ImageIcon className="mx-auto h-10 w-10 text-gray-400" />
 )}
 <div className="flex justify-center text-sm text-gray-600 mt-2">
 <label htmlFor="cnh-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none px-2 py-1 flex items-center gap-2 border border-gray-200 hover:bg-gray-50">
 <Camera size={14} />
 <span>Upload foto da CNH</span>
 <input id="cnh-upload" name="cnh-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
 </label>
 </div>
 <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
 </div>
 </div>
 </div>
 </div>

 <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
 <span className="text-red-500 font-bold">*</span> Campos obrigatórios
 </p>

 <div className="flex justify-end pt-2">
 <motion.button
 type="submit"
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#32423D] text-white font-medium text-xs hover:bg-[#3d4f49] transition-colors disabled:opacity-50"
 disabled={saving}
 >
 {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 {isEditing ? 'Atualizar' : 'Salvar'}
 </motion.button>
 </div>
 </form>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Data Table */}
 <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
 {loading ? (
 <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
 <Loader2 size={32} className="animate-spin" />
 <p className="text-xs">Carregando dados...</p>
 </div>
 ) : (
 <div className="overflow-auto flex-1">
 <table className="w-full">
 <thead className="bg-[#567469] text-white">
 <tr className="border-b border-white/20">
 <th className="px-2 py-0.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Motorista</th>
 <th className="px-2 py-0.5 text-left text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">CNH</th>
 <th className="px-2 py-0.5 text-center text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Categoria</th>
 <th className="px-2 py-0.5 text-center text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Venc. CNH</th>
 <th className="px-2 py-0.5 text-left text-xs font-semibold text-white uppercase tracking-wider hidden md:table-cell">Telefone</th>
 <th className="px-2 py-0.5 text-center text-xs font-semibold text-white uppercase tracking-wider w-16">Foto</th>
 <th className="px-2 py-0.5 text-right text-xs font-semibold text-white uppercase tracking-wider">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredMotoristas.length === 0 ? (
 <tr>
 <td colSpan={6} className="px-4 py-12 text-center">
 <div className="flex flex-col items-center gap-3 text-gray-400">
 <User size={40} strokeWidth={1.5} />
 <p className="text-xs">Nenhum motorista encontrado</p>
 <button
 onClick={() => setShowForm(true)}
 className="text-[#32423D] font-medium text-xs hover:underline"
 >
 Cadastrar novo motorista
 </button>
 </div>
 </td>
 </tr>
 ) : (
 filteredMotoristas.map((motorista, idx) => (
 <motion.tr
 key={motorista.IdMotorista}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.03 }}
 className="hover:bg-gray-50/50 transition-colors"
 >
 <td className="px-2 py-0.5">
 <p className="font-medium text-[#32423D] text-xs">{motorista.Motorista}</p>
 <p className="text-xs text-gray-400 md:hidden">{motorista.Telefone}</p>
 </td>
 <td className="px-2 py-0.5 text-xs text-gray-600 hidden md:table-cell">
 {motorista.CNH || '-'}
 </td>
 <td className="px-2 py-0.5 text-center hidden md:table-cell">
 <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
 {motorista.Categoria || '-'}
 </span>
 </td>
 <td className="px-2 py-0.5 text-center hidden md:table-cell">
 {motorista.DataVencimentoCNH ? (
 (() => {
 const dataVenc = new Date(motorista.DataVencimentoCNH);
 const diffTime = dataVenc.getTime() - new Date().getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 const isExpired = diffDays < 0;
 const isExpiring = diffDays >= 0 && diffDays <= 30;
 const formatada = dataVenc.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
 
 if (isExpired || isExpiring) {
 return (
 <div className="group relative inline-block cursor-help">
 <span className={`px-2 py-1 rounded text-xs font-bold border \${isExpired ? 'bg-red-100 text-red-600 border-red-200' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
 {formatada}
 </span>
 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
 {isExpired ? 'CNH Vencida!' : 'CNH vencendo em ' + diffDays + ' dia(s)!'}
 <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
 </div>
 </div>
 );
 }
 return <span className="text-gray-600">{formatada}</span>;
 })()
 ) : (
 <span className="text-gray-300">-</span>
 )}
 </td>
 <td className="px-2 py-0.5 text-xs text-gray-600 hidden md:table-cell">
 {motorista.Telefone || '-'}
 </td>
 <td className="px-2 py-0.5 text-center overflow-visible">
 {motorista.ImagemCNH ? (
 <div className="relative inline-block group/img" onMouseLeave={() => setZoomLevel(1)}>
 <img src={motorista.ImagemCNH} alt="CNH" className="mx-auto w-8 h-8 rounded-full object-cover border border-gray-200 cursor-zoom-in shadow-sm relative" />
 
 {/* Fullscreen Lightbox View on Hover */}
 <div className="fixed inset-0 z-[100] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 pointer-events-none group-hover/img:pointer-events-auto bg-black/40 backdrop-blur-sm" onWheel={handleWheel}>
 <img src={motorista.ImagemCNH} alt="CNH Ampliada" className="max-w-[90vw] max-h-[90vh] object-contain drop-shadow-2xl rounded-lg transition-transform duration-75" style={{ transform: `scale(${zoomLevel})` }} />
 </div>
 </div>
 ) : (
 <span className="text-gray-300">-</span>
 )}
 </td>
 <td className="px-2 py-0.5">
 <div className="flex items-center justify-end gap-1">
 <button
 onClick={() => handleEdit(motorista)}
 className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
 title="Editar"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => motorista.IdMotorista && handleDelete(motorista.IdMotorista)}
 className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
 title="Excluir"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </td>
 </motion.tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}

 {/* Table Footer */}
 {!loading && (
 <div className="px-2 py-0.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
 <p className="text-xs text-gray-500">
 Mostrando <span className="font-medium">{filteredMotoristas.length}</span> de <span className="font-medium">{motoristas.length}</span> motoristas
 </p>
 </div>
 )}
 </div>
 </div>
 );
}
