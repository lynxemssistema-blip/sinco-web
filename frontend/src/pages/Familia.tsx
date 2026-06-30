import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus, Search, Edit2, Trash2, X, FolderTree, Save,
 Loader2, RefreshCw
} from 'lucide-react';

const API_BASE = '/api';

interface Familia {
 IdFamilia?: number;
 DescFamilia: string;
}

const emptyForm: Familia = {
 DescFamilia: ''
};

export default function FamiliaPage() {
 const [familias, setFamilias] = useState<Familia[]>([]);
 const [formData, setFormData] = useState<Familia>(emptyForm);
 const [isEditing, setIsEditing] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [showForm, setShowForm] = useState(false);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 // Fetch data from API
 const fetchFamilias = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_BASE}/familia`);
 const json = await res.json();
 if (json.success) {
 setFamilias(json.data);
 } else {
 setError(json.message || 'Erro ao carregar dados');
 }
 } catch {
 setError('Erro de conexão com o servidor. Verifique se o backend está rodando na porta 3000.');
 console.error('Fetch error:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchFamilias();
 }, []);

 const filteredFamilias = familias.filter(f =>
 f.DescFamilia?.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const name = e.target.name;
    const value = name.toLowerCase().includes('desc') ? e.target.value.toUpperCase() : e.target.value;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const inputBaseClass = "w-full px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
 const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
 // const inputOptional = `${inputBaseClass} border-gray-200`;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setError(null);

 try {
 const url = isEditing ? `${API_BASE}/familia/${formData.IdFamilia}` : `${API_BASE}/familia`;
 const method = isEditing ? 'PUT' : 'POST';

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData),
 });

 const json = await res.json();
 if (json.success) {
 await fetchFamilias();
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

 const handleEdit = async (id: number) => {
 try {
 const res = await fetch(`${API_BASE}/familia/${id}`);
 const json = await res.json();
 if (json.success) {
 setFormData(json.data);
 setIsEditing(true);
 setShowForm(true);
 }
 } catch {
 console.error('Fetch error:', err);
 }
 };

 const handleDelete = async (id: number) => {
 if (!confirm('Deseja realmente excluir esta família?')) return;

 try {
 const res = await fetch(`${API_BASE}/familia/${id}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: 'Edson' }),
 });
 const json = await res.json();
 if (json.success) {
 await fetchFamilias();
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
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 
 <p className="text-gray-500 text-xs">Gerencie o cadastro de famílias de produtos</p>
 </div>
 <div className="flex gap-2">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={fetchFamilias}
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
 Nova Família
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

 {/* Search Bar */}
 <div className="relative max-w-md flex items-center gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
 <input
 type="text"
 placeholder="Buscar por descrição..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all"
 />
 </div>
 {searchTerm && (
 <button onClick={() => setSearchTerm('')} className="p-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Limpar pesquisa">
 <X size={15} />
 </button>
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
 className="bg-white rounded-md shadow-xl w-full max-w-md my-8"
 >
 <div className="flex items-center justify-between p-5 border-b border-gray-100">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
 <FolderTree size={20} />
 </div>
 <h2 className="text-lg font-semibold text-[#32423D]">
 {isEditing ? 'Editar Família' : 'Nova Família'}
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

 {/* DescFamilia */}
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Descrição Família <span className="text-red-500 font-bold">*</span>
 </label>
 <input
 type="text"
 name="DescFamilia"
 value={formData.DescFamilia || ''}
 onChange={handleInputChange}
 placeholder="Digite a descrição da família..."
 className={inputRequired}
 maxLength={50}
 required
 />
 <p className="text-xs text-gray-400 mt-1">Máximo 50 caracteres</p>
 </div>

 {/* Required fields note */}
 <p className="text-xs text-gray-400 pt-2">
 <span className="text-red-500 font-bold">*</span> Campos obrigatórios
 </p>

 {/* Actions */}
 <div className="pt-2 flex justify-end w-full">
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
 <thead className="bg-[#567469] text-white bg-[#567469] text-white">
 <tr className=" border-b border-white/20">

 <th className="px-2 py-0.5 text-left text-xs font-semibold text-white uppercase tracking-wider">Descrição Família</th>
 <th className="px-2 py-0.5 text-right text-xs font-semibold text-white uppercase tracking-wider w-28">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredFamilias.length === 0 ? (
 <tr>
 <td colSpan={3} className="px-4 py-12 text-center">
 <div className="flex flex-col items-center gap-3 text-gray-400">
 <FolderTree size={40} strokeWidth={1.5} />
 <p className="text-xs">Nenhuma família encontrada</p>
 <button
 onClick={() => setShowForm(true)}
 className="text-[#32423D] font-medium text-xs hover:underline"
 >
 Cadastrar nova família
 </button>
 </div>
 </td>
 </tr>
 ) : (
 filteredFamilias.map((familia, idx) => (
 <motion.tr
 key={familia.IdFamilia}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.03 }}
 className="hover:bg-gray-50/50 transition-colors"
 >
 <td className="px-2 py-0.5">
 <span className="text-xs font-medium text-gray-700">
 {familia.DescFamilia || '-'}
 </span>
 </td>
 <td className="px-2 py-0.5">
 <div className="flex items-center justify-end gap-1">
 <button
 onClick={() => familia.IdFamilia && handleEdit(familia.IdFamilia)}
 className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
 title="Editar"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => familia.IdFamilia && handleDelete(familia.IdFamilia)}
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
 Mostrando <span className="font-medium">{filteredFamilias.length}</span> de <span className="font-medium">{familias.length}</span> famílias
 </p>
 </div>
 )}
 </div>
 </div>
 );
}
