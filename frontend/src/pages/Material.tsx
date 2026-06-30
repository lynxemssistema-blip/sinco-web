import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus, Search, Edit2, Trash2, X, Package, Save, Filter,
 Loader2, RefreshCw, Camera, Image as ImageIcon, Link as LinkIcon, Globe, FileText, Download
} from 'lucide-react';

const API_BASE = '/api';

interface Material {
 IdMaterial?: number;
 CodMatFabricante: string;
 DescResumo?: string;
 DescDetal?: string;
 NumeroRP?: string;
 FamiliaMat?: number;
 DescFamilia?: string;
 CodigoJuridicoMat?: number;
 Fornecedor?: string;
 Peso?: string;
 Unidade?: string;
 Altura?: string;
 Largura?: string;
 Profundidade?: string;
 Valor?: string;
 PercICMS?: string;
 vICMS?: string;
 PercIPI?: string;
 vIPI?: string;
 vLiquido?: string;

 acabamento?: string;
 ImagemProduto?: string | null;
}

interface Option {
 id: number | string;
 label: string;
}

const emptyForm: Material = {
 CodMatFabricante: '',
 DescResumo: '',
 DescDetal: '',
 NumeroRP: '',
 Peso: '',
 Unidade: '',
 Altura: '',
 Largura: '',
 Profundidade: '',
 Valor: '',
 PercICMS: '',
 vICMS: '',
 PercIPI: '',
 vIPI: '',
 vLiquido: '',
 ImagemProduto: '',
};


export default function MaterialPage() {
 const [materiais, setMateriais] = useState<Material[]>([]);
 const [showFilters, setShowFilters] = useState(true);
 const [formData, setFormData] = useState<Material>(emptyForm);
 const [isEditing, setIsEditing] = useState(false);
 const [searchCodigo, setSearchCodigo] = useState('');
 const [searchDesc, setSearchDesc] = useState('');
 const [searchFamilia, setSearchFamilia] = useState('');
 const [searchFornecedor, setSearchFornecedor] = useState('');
 const [showForm, setShowForm] = useState(false);
 // const [showMontaPecaModal, setShowMontaPecaModal] = useState(false);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showUrlInput, setShowUrlInput] = useState(false);
 const [arquivos, setArquivos] = useState<any[]>([]);
 const [loadingArquivos, setLoadingArquivos] = useState(false);

 // Options for dropdowns
 const [familiaOptions, setFamiliaOptions] = useState<Option[]>([]);
 const [fornecedorOptions, setFornecedorOptions] = useState<Option[]>([]);
 const [unidadeOptions, setUnidadeOptions] = useState<Option[]>([]);

 // Fetch dropdown options
 const fetchOptions = async () => {
 try {
 const [famRes, fornRes, unidRes] = await Promise.all([
 fetch(`${API_BASE}/familia/options`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` } }),
 fetch(`${API_BASE}/pj/options`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` } }),
 fetch(`${API_BASE}/medida/options`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` } })
 ]);
 const [famJson, fornJson, unidJson] = await Promise.all([
 famRes.json(),
 fornRes.json(),
 unidRes.json()
 ]);
 if (famJson.success) setFamiliaOptions(famJson.data);
 if (fornJson.success) setFornecedorOptions(fornJson.data);
 if (unidJson.success) setUnidadeOptions(unidJson.data);
 } catch (err) {
 console.error('Error fetching options:', err);
 }
 };

 // Fetch data from API
 const fetchMateriais = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_BASE}/material`);
 const json = await res.json();
 if (json.success) {
 setMateriais(json.data);
 } else {
 setError(json.message || 'Erro ao carregar dados');
 }
 } catch (err) {
 setError('Erro de conexão com o servidor.');
 console.error('Fetch error:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchMateriais();
 fetchOptions();
 }, []);

 const filteredMateriais = materiais.filter(m => {
     const matchCodigo = !searchCodigo || m.CodMatFabricante?.toLowerCase().includes(searchCodigo.toLowerCase());
     const matchDesc = !searchDesc || 
         (m.DescResumo?.toLowerCase().includes(searchDesc.toLowerCase()) || m.DescDetal?.toLowerCase().includes(searchDesc.toLowerCase()));
     const matchFamilia = !searchFamilia || m.DescFamilia?.toLowerCase().includes(searchFamilia.toLowerCase());
     const matchFornecedor = !searchFornecedor || m.Fornecedor?.toLowerCase().includes(searchFornecedor.toLowerCase());
     return matchCodigo && matchDesc && matchFamilia && matchFornecedor;
 });

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const name = e.target.name;
    const value = name.toLowerCase().includes('desc') ? e.target.value.toUpperCase() : e.target.value;
 const finalValue = (name === 'DescResumo' || name === 'DescDetal') ? value.toUpperCase() : value;
 setFormData(prev => ({ ...prev, [name]: finalValue }));
 };

 const inputBaseClass = "w-full px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
 const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
 const inputOptional = `${inputBaseClass} border-gray-200`;
 const selectClass = `${inputOptional} appearance-none bg-white`;

 const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setFormData(prev => ({ ...prev, ImagemProduto: reader.result as string }));
 };
 reader.readAsDataURL(file);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setError(null);

 try {
 const url = isEditing ? `${API_BASE}/material/${formData.IdMaterial}` : `${API_BASE}/material`;
 const method = isEditing ? 'PUT' : 'POST';

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData),
 });

 const json = await res.json();
 if (json.success) {
 await fetchMateriais();
 resetForm();
 } else {
 setError(json.message || 'Erro ao salvar');
 }
 } catch (err) {
 setError('Erro ao salvar. Verifique a conexão.');
 console.error('Save error:', err);
 } finally {
 setSaving(false);
 }
 };

 
  const handleOpenPDF = async (idMaterial: number) => {
    try {
      const res = await fetch(`${API_BASE}/materiais/${idMaterial}/arquivos`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
      });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        // Open the most recently uploaded PDF
        const file = json.data[0];
        window.open(`${API_BASE}/materiais/arquivos/${file.idArquivo}/download?token=${localStorage.getItem('sinco_token')}`, '_blank');
      } else {
        alert('Este material não possui arquivos PDF anexados.');
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert('Erro ao buscar o arquivo.');
    }
  };

  const handleEdit = async (id: number) => {
 try {
 const res = await fetch(`${API_BASE}/material/${id}`);
 const json = await res.json();
 if (json.success) {
 setFormData(json.data);
 setIsEditing(true);
 setShowForm(true);
 }
 } catch (err) {
 console.error('Fetch error:', err);
 }
 };

 const handleDelete = async (id: number) => {
 if (!confirm('Deseja realmente excluir este material?')) return;

 try {
 const res = await fetch(`${API_BASE}/material/${id}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: 'Edson' }),
 });
 const json = await res.json();
 if (json.success) {
 await fetchMateriais();
 } else {
 setError(json.message || 'Erro ao excluir');
 }
 } catch (err) {
 setError('Erro ao excluir. Verifique a conexão.');
 }
 };

 const resetForm = () => {
 setFormData(emptyForm);
 setIsEditing(false);
 setShowForm(false);
 setArquivos([]);
 };

  const fetchArquivos = async (idMaterial: number) => {
    setLoadingArquivos(true);
    try {
      const res = await fetch(`${API_BASE}/materiais/${idMaterial}/arquivos`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
      });
      const json = await res.json();
      if (json.success) setArquivos(json.data);
    } catch (error) {
      console.error('Error fetching arquivos:', error);
    } finally {
      setLoadingArquivos(false);
    }
  };

  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !formData.IdMaterial) return;
    
    const uploadFormData = new FormData();
    uploadFormData.append('arquivo', files[0]);

    setLoadingArquivos(true);
    try {
      const res = await fetch(`${API_BASE}/materiais/${formData.IdMaterial}/arquivos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` },
        body: uploadFormData
      });
      const json = await res.json();
      if (json.success) {
        fetchArquivos(formData.IdMaterial);
      } else {
        alert(json.message || 'Erro ao enviar arquivo');
      }
    } catch (error) {
      console.error('Error uploading arquivo:', error);
      alert('Erro de conexão ao enviar arquivo');
    } finally {
      setLoadingArquivos(false);
    }
  };

  const handleDeleteArquivo = async (idArquivo: number) => {
    if (!confirm('Deseja realmente excluir este arquivo?')) return;
    try {
      const res = await fetch(`${API_BASE}/materiais/arquivos/${idArquivo}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
      });
      const json = await res.json();
      if (json.success) {
        if (formData.IdMaterial) fetchArquivos(formData.IdMaterial);
      } else {
        alert(json.message || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Error deleting arquivo:', error);
    }
  };

  const handleDownloadArquivo = (idArquivo: number) => {
    window.open(`${API_BASE}/materiais/arquivos/${idArquivo}/download?token=${localStorage.getItem('sinco_token')}`, '_blank');
  };

 return (
 <div className="space-y-6 h-full flex flex-col min-h-0">
 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 
 <p className="text-gray-500 text-xs">Gerencie o cadastro de materiais e produtos</p>
 </div>
 <div className="flex gap-2">
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={fetchMateriais}
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
 Novo Material
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
 <div className="flex flex-col gap-2 bg-white p-3 border border-gray-200 rounded-md shadow-sm mb-4">
    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
            <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Código:</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Pesquisar código..." value={searchCodigo} onChange={(e) => setSearchCodigo(e.target.value)} className="w-full pl-7 pr-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm" />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Descrição:</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Pesquisar descrição..." value={searchDesc} onChange={(e) => setSearchDesc(e.target.value)} className="w-full pl-7 pr-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm" />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Família:</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Pesquisar família..." value={searchFamilia} onChange={(e) => setSearchFamilia(e.target.value)} className="w-full pl-7 pr-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm" />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Fornecedor:</label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Pesquisar fornecedor..." value={searchFornecedor} onChange={(e) => setSearchFornecedor(e.target.value)} className="w-full pl-7 pr-2 py-1.5 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 rounded-sm" />
                </div>
            </div>
        </div>
    )}
    {showFilters && (searchCodigo || searchDesc || searchFamilia || searchFornecedor) && (
        <div className="flex justify-end mt-1">
            <button
                onClick={() => { setSearchCodigo(''); setSearchDesc(''); setSearchFamilia(''); setSearchFornecedor(''); }}
                className="px-3 py-1 text-gray-500 font-semibold text-[10px] tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1.5 uppercase"
            >
                <X size={11} /> Limpar Filtros
            </button>
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
 className="fixed inset-0 bg-black/40 z-[100] flex items-start justify-center p-4 overflow-y-auto"
 onClick={(e) => e.target === e.currentTarget && resetForm()}
 >
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="bg-white rounded-md shadow-xl w-full max-w-3xl my-8 flex flex-col max-h-[85vh] overflow-hidden"
 >
 <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
 <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
 <Package size={20} />
 </div>
 <h2 className="text-lg font-semibold text-[#32423D]">
 {isEditing ? 'Editar Material' : 'Novo Material'}
 </h2>
 </div>
 <button
 type="button"
 onClick={resetForm}
 className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 <div className="p-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
 {/* ID Field (readonly when editing) */}
 {isEditing && (
 <div className="grid grid-cols-3 gap-4">
 
 </div>
 )}

 {/* Image Upload Action Area */}
   <div className="flex flex-row items-center gap-4 mb-4">
     <div className="w-16 h-16 rounded bg-gray-100 border border-gray-200 flex items-center justify-center relative group shrink-0">
        {formData.ImagemProduto ? (
          <>
            <div className="w-full h-full rounded overflow-hidden relative">
              <img src={formData.ImagemProduto} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, ImagemProduto: '' }))} className="p-1 bg-white/20 rounded-full hover:bg-white/40 text-white transition-colors" title="Remover imagem">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            {/* Expanded Image on Hover */}
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] hidden group-hover:flex pointer-events-none bg-white p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-200 animate-in zoom-in-95 duration-200">
               <img src={formData.ImagemProduto} alt="Zoom" className="w-auto h-auto max-w-[80vw] max-h-[80vh] object-contain rounded" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Package size={20} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2">
       <div className="flex flex-row gap-2 items-center">
         <span className="text-xs font-semibold text-gray-700 mr-2">Imagem:</span>
         <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Câmera">
           <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
           <Camera size={14} />
         </label>
         <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Galeria">
           <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
           <ImageIcon size={14} />
         </label>
         <button type="button" onClick={() => setShowUrlInput(!showUrlInput)} className={`p-1.5 rounded border transition-colors ${showUrlInput ? 'bg-[#32423D] text-white border-[#32423D]' : 'border-gray-200 hover:bg-gray-50 text-[#32423D]'}`} title="Link Web">
           <LinkIcon size={14} />
         </button>
         <button type="button" onClick={() => {
           const query = encodeURIComponent((formData.CodMatFabricante || '') + ' ' + (formData.DescResumo || ''));
           window.open(`https://www.google.com/search?tbm=isch&q=${query}`, '_blank');
           setShowUrlInput(true);
         }} className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-[#32423D]" title="Pesquisar WEB">
           <Globe size={14} />
         </button>
         <label className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-[#32423D]" title="Anexar PDF">
           <input type="file" accept="application/pdf" onChange={handleUploadArquivo} className="hidden" />
           <FileText size={14} />
         </label>
       </div>
       {showUrlInput && (
         <input type="text" value={formData.ImagemProduto || ''} onChange={(e) => setFormData(prev => ({ ...prev, ImagemProduto: e.target.value }))} placeholder="URL da imagem (https://...)" className={inputOptional + " py-1 text-xs"} />
       )}
       {/* Lista de Arquivos */}
       {formData.IdMaterial && (
         <div className="mt-2 border-t border-gray-100 pt-2">
           <span className="text-xs font-semibold text-gray-700 block mb-1">Arquivos Anexados ({arquivos.length}):</span>
           {loadingArquivos && <Loader2 className="animate-spin text-[#32423D] mb-2" size={14} />}
           <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
             {arquivos.map((arq) => (
               <div key={arq.idArquivo} className="flex items-center justify-between p-1.5 bg-gray-50 border border-gray-100 rounded text-[10px]">
                 <div className="flex items-center gap-1.5 overflow-hidden">
                   <FileText size={12} className="text-blue-500 shrink-0" />
                   <span className="truncate" title={arq.NomeArquivo}>{arq.NomeArquivo}</span>
                 </div>
                 <div className="flex items-center gap-1 shrink-0 ml-2">
                   <button type="button" onClick={() => handleDownloadArquivo(arq.idArquivo)} className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Baixar/Visualizar">
                     <Download size={12} />
                   </button>
                   <button type="button" onClick={() => handleDeleteArquivo(arq.idArquivo)} className="p-1 hover:bg-red-100 rounded text-red-500" title="Excluir">
                     <Trash2 size={12} />
                   </button>
                 </div>
               </div>
             ))}
             {arquivos.length === 0 && !loadingArquivos && (
               <div className="text-[10px] text-gray-400 italic">Nenhum arquivo anexado.</div>
             )}
           </div>
         </div>
       )}
     </div>
   </div>
   {/* Identificação */}
 <div className="border-b border-gray-100 pb-4">
 <h3 className="text-xs font-semibold text-gray-700 mb-3">Identificação</h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="md:col-span-2">
 <label className="block text-xs font-medium text-gray-600 mb-1">
 Código Material <span className="text-red-500 font-bold">*</span>
 </label>
 <input
 type="text"
 name="CodMatFabricante"
 value={formData.CodMatFabricante || ''}
 onChange={handleInputChange}
 placeholder="Código único do material"
 className={inputRequired}
 required
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Numero RP</label>
 <input
 type="text"
 name="NumeroRP"
 value={formData.NumeroRP || ''}
 onChange={handleInputChange}
 className={inputOptional}
 />
 </div>
 </div>
 </div>

 {/* Descrição */}
 <div className="border-b border-gray-100 pb-4">
 <h3 className="text-xs font-semibold text-gray-700 mb-3">Descrição</h3>
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Descrição Resumo</label>
 <input
 type="text"
 name="DescResumo"
 value={formData.DescResumo || ''}
 onChange={handleInputChange}
 className={inputOptional}
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Descrição Detalhada</label>
 <textarea
 name="DescDetal"
 value={formData.DescDetal || ''}
 onChange={handleInputChange}
 rows={3}
 className={inputOptional}
 />
 </div>
 </div>
 </div>

 {/* Classificação */}
   <div className="border-b border-gray-100 pb-2 mb-2">
     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
       <div>
         <label className="block text-xs font-medium text-gray-500 mb-0.5">Família</label>
         <select name="FamiliaMat" value={formData.FamiliaMat || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">Selecione...</option>
           {familiaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
         </select>
       </div>
       <div>
         <label className="block text-xs font-medium text-gray-500 mb-0.5">Fornecedor</label>
         <select name="CodigoJuridicoMat" value={formData.CodigoJuridicoMat || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">Selecione...</option>
           {fornecedorOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
         </select>
       </div>
     </div>
   </div>
   {/* Dimensões */}
   <div className="border-b border-gray-100 pb-2 mb-2">
     <h3 className="text-xs font-semibold text-gray-700 mb-1">Dados Equipamento</h3>
     <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Peso</label>
         <input type="text" name="Peso" value={formData.Peso || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Unidade</label>
         <select name="Unidade" value={formData.Unidade || ''} onChange={handleInputChange} className={selectClass + " py-1 text-xs"}>
           <option value="">-</option>
           {unidadeOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.id}</option>)}
         </select>
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Altura</label>
         <input type="text" name="Altura" value={formData.Altura || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Largura</label>
         <input type="text" name="Largura" value={formData.Largura || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div className="col-span-2">
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Profundidade</label>
         <input type="text" name="Profundidade" value={formData.Profundidade || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
     </div>
   </div>
   {/* Dados Fiscais */}
   <div className="pb-2">
     <h3 className="text-xs font-semibold text-gray-700 mb-1">Dados Fiscais</h3>
     <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valor Unit.</label>
         <input type="text" name="Valor" value={formData.Valor || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% ICMS</label>
         <input type="text" name="PercICMS" value={formData.PercICMS || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ ICMS</label>
         <input type="text" name="vICMS" value={formData.vICMS || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">% IPI</label>
         <input type="text" name="PercIPI" value={formData.PercIPI || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">$ IPI</label>
         <input type="text" name="vIPI" value={formData.vIPI || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
       <div>
         <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Valor Líquido</label>
         <input type="text" name="vLiquido" value={formData.vLiquido || ''} onChange={handleInputChange} className={inputOptional + " py-1 text-xs"} />
       </div>
     </div>
   </div>
   {/* Required fields note */}
 <p className="text-xs text-gray-400 pt-2">
 <span className="text-red-500 font-bold">*</span> Campos obrigatórios
 </p>
 </div>

 {/* Modal Footer with Cancel & Save buttons */}
 <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-xl">
 <button
 type="button"
 onClick={resetForm}
 className="px-2 py-1 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
 >
 Cancelar
 </button>
 <button
 type="submit"
 disabled={saving}
 className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#32423D] hover:bg-[#E0E800]/100 hover:text-gray-900 text-white font-bold text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 {isEditing ? 'Atualizar' : 'Salvar'}
 </button>
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
 
 <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider w-16">Img</th>
 <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Código</th>
 <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Descrição</th>
 <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Família</th>
 <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-white uppercase tracking-wider">Fornecedor</th>
 <th className="px-2 py-1.5 text-right text-[10px] font-semibold text-white uppercase tracking-wider w-24">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredMateriais.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-12 text-center">
 <div className="flex flex-col items-center gap-3 text-gray-400">
 <Package size={40} strokeWidth={1.5} />
 <p className="text-xs">Nenhum material encontrado</p>
 <button
 onClick={() => setShowForm(true)}
 className="text-[#32423D] font-medium text-xs hover:underline"
 >
 Cadastrar novo material
 </button>
 </div>
 </td>
 </tr>
 ) : (
 filteredMateriais.map((material, idx) => (
 <motion.tr
 key={material.IdMaterial}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.02 }}
 className="hover:bg-gray-50/50 transition-colors"
 >
 
 <td className="px-2 py-1.5">
 <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
 {material.ImagemProduto ? (
 <img
 src={material.ImagemProduto}
 alt=""
 className="w-full h-full object-cover"
 />
 ) : (
 <Package size={14} className="text-gray-400" />
 )}
 </div>
 </td>
 <td className="px-2 py-1.5">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-[#32423D]/10 text-[#32423D] flex items-center justify-center">
 <Package size={14} />
 </div>
 <span className="text-[11px] font-medium text-gray-900 truncate max-w-[150px]">
 {material.CodMatFabricante || '-'}
 </span>
 </div>
 </td>
 <td className="px-2 py-1.5 text-[11px] text-gray-600 truncate max-w-[200px]">
 {material.DescResumo || material.DescDetal?.substring(0, 50) || '-'}
 </td>
 <td className="px-2 py-1.5 text-[11px] text-gray-600">
 {material.DescFamilia || '-'}
 </td>
 <td className="px-2 py-1.5 text-[11px] text-gray-600 truncate max-w-[150px]">
 {material.Fornecedor || '-'}
 </td>
 <td className="px-2 py-1.5">
 <div className="flex items-center justify-end gap-1">
 <button
 onClick={() => material.IdMaterial && handleEdit(material.IdMaterial)}
 className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
 title="Editar"
 >
 <Edit2 size={14} />
   </button>
   <button
   onClick={() => material.IdMaterial && handleOpenPDF(material.IdMaterial)}
   className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
   title="Abrir PDF"
   >
   <FileText size={14} />
   </button>
 <button
 onClick={() => material.IdMaterial && handleDelete(material.IdMaterial)}
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
 Mostrando <span className="font-medium">{filteredMateriais.length}</span> de <span className="font-medium">{materiais.length}</span> materiais
 </p>
 </div>
 )}
 </div>
 </div>
 );
}
