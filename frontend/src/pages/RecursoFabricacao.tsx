import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, X, Save,
  Loader2, RefreshCw, Briefcase, Filter
} from 'lucide-react';

const API_BASE = '/api';

interface Recurso {
  IdProcessoFabricacao?: number;
  processofabricacao: string;
  CodigoProcessoFabricacao?: string;
  Fabrica: string;
  DataLiberada: string;
  Setup?: number;
  TempoPadrao?: number;
  DataCriacao?: string;
  CriadoPor?: string;
}

const emptyForm: Recurso = {
  processofabricacao: '',
  CodigoProcessoFabricacao: '',
  Fabrica: 'NÂO',
  DataLiberada: 'NÂO',
  Setup: 0,
  TempoPadrao: 0
};

export default function RecursoFabricacaoPage() {
  const { token } = useAuth();
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [formData, setFormData] = useState<Recurso>(emptyForm); // For modal (NEW)
  const [editFormData, setEditFormData] = useState<Recurso>(emptyForm); // For inline (EDIT)
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [searchNome, setSearchNome] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  const fetchRecursos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/recursos?t=${new Date().getTime()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setRecursos(json.data);
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
    fetchRecursos();
  }, []);

  const filteredRecursos = recursos.filter(s => {
    return !searchNome || s.processofabricacao?.toLowerCase().includes(searchNome.toLowerCase());
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name;
    const value = (name === 'processofabricacao' || name === 'CodigoProcessoFabricacao') ? e.target.value.toUpperCase() : e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInputInline = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name;
    const value = (name === 'processofabricacao' || name === 'CodigoProcessoFabricacao') ? e.target.value.toUpperCase() : e.target.value;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputBaseClass = `w-full px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all`;
  const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Duplication check
    const isDuplicate = recursos.some(r => 
      r.processofabricacao.toUpperCase().trim() === formData.processofabricacao.toUpperCase().trim()
    );

    if (isDuplicate) {
      setError('Já existe um processo cadastrado com este nome.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = `${API_BASE}/recursos`;
      const method = 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        await fetchRecursos();
        setFormData(emptyForm);
        setShowForm(false);
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

  const handleUpdateInline = async () => {
    // Duplication check
    const isDuplicate = recursos.some(r => 
      r.processofabricacao.toUpperCase().trim() === editFormData.processofabricacao.toUpperCase().trim() && 
      r.IdProcessoFabricacao !== editFormData.IdProcessoFabricacao
    );

    if (isDuplicate) {
      setError('Já existe um processo cadastrado com este nome.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/recursos/${editFormData.IdProcessoFabricacao}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (json.success) {
        await fetchRecursos();
        handleCancelInline();
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

  const handleEdit = (recurso: Recurso) => {
    setEditFormData(recurso);
    setEditingId(recurso.IdProcessoFabricacao || null);
    setError(null);
  };

  const handleCancelInline = () => {
    setEditingId(null);
    setEditFormData(emptyForm);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este recurso?')) return;

    try {
      const res = await fetch(`${API_BASE}/recursos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        await fetchRecursos();
      } else {
        setError(json.message || 'Erro ao excluir');
      }
    } catch {
      setError('Erro ao excluir. Verifique a conexão.');
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setShowForm(false);
    setError(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchRecursos}
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
            Novo Processo
          </motion.button>
        </div>
      </div>

      {/* Error Alert Main Page */}
      {error && !showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex justify-between items-center"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:bg-red-100 rounded p-1"><X size={14}/></button>
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
            className="text-[10px] flex items-center gap-1.5 text-blue-500 hover:text-blue-700 hover:bg-gray-50 px-2 py-1 rounded transition-colors border border-gray-200 uppercase font-bold"
          >
            <Filter size={11} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
        </div>
        {showFilters && (
          <div className="px-4 pb-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Nome do Processo:</label>
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
            </div>
            {searchNome && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setSearchNome('')}
                  className="px-3 py-1 text-red-500 font-semibold text-[10px] tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-700 hover:border-red-200 transition-colors flex items-center gap-1.5 uppercase"
                >
                  <X size={11} /> Limpar Filtro
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal (Only for inserts now) */}
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
                    <Briefcase size={20} />
                  </div>
                  <h2 className="text-lg font-semibold text-[#32423D]">
                    Novo Processo
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
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs"
                  >
                    {error}
                  </motion.div>
                )}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Nome do Processo <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        name="processofabricacao"
                        value={formData.processofabricacao || ''}
                        onChange={handleInputChange}
                        className={inputRequired}
                        placeholder="Ex: Usinagem..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Código
                      </label>
                      <input
                        type="text"
                        name="CodigoProcessoFabricacao"
                        value={formData.CodigoProcessoFabricacao || ''}
                        onChange={handleInputChange}
                        className={inputBaseClass + " border-gray-200"}
                        placeholder="Ex: US-01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Fábrica <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        name="Fabrica"
                        value={formData.Fabrica}
                        onChange={handleInputChange}
                        className={inputRequired}
                        required
                      >
                        <option value="SIM">Sim</option>
                        <option value="NAO">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Data Liberada <span className="text-red-500 font-bold">*</span>
                      </label>
                      <select
                        name="DataLiberada"
                        value={formData.DataLiberada}
                        onChange={handleInputChange}
                        className={inputRequired}
                        required
                      >
                        <option value="SIM">Sim</option>
                        <option value="NAO">Não</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Setup (min)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="Setup"
                        value={formData.Setup === undefined ? '' : formData.Setup}
                        onChange={handleInputChange}
                        className={inputBaseClass + " border-gray-200"}
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Tempo Padrão (min)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="TempoPadrao"
                        value={formData.TempoPadrao === undefined ? '' : formData.TempoPadrao}
                        onChange={handleInputChange}
                        className={inputBaseClass + " border-gray-200"}
                        placeholder="Ex: 5"
                      />
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
                    Salvar
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
              <thead className="bg-[#567469] text-white sticky top-0 z-10">
                <tr className="border-b border-white/20">
                  <th className="px-2 py-1 text-left text-[9px] font-semibold text-white uppercase tracking-wider">Processo</th>
                  <th className="px-2 py-1 text-left text-[9px] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Código</th>
                  <th className="px-2 py-1 text-center text-[9px] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Fábrica</th>
                  <th className="px-2 py-1 text-center text-[9px] font-semibold text-white uppercase tracking-wider hidden md:table-cell">Data Liberada</th>
                  <th className="px-2 py-1 text-right text-[9px] font-semibold text-white uppercase tracking-wider hidden sm:table-cell w-20">Setup</th>
                  <th className="px-2 py-1 text-right text-[9px] font-semibold text-white uppercase tracking-wider hidden sm:table-cell w-20">T. Padrão</th>
                  <th className="px-2 py-1 text-right text-[9px] font-semibold text-white uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecursos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Briefcase size={40} strokeWidth={1.5} />
                        <p className="text-xs">Nenhum processo encontrado</p>
                        <button
                          onClick={() => setShowForm(true)}
                          className="text-[#32423D] font-medium text-xs hover:underline"
                        >
                          Cadastrar novo processo
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecursos.map((recurso, idx) => (
                    <motion.tr
                      key={recurso.IdProcessoFabricacao}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.01 }}
                      className={`${editingId === recurso.IdProcessoFabricacao ? 'bg-amber-50/40' : 'hover:bg-gray-50/50'} transition-colors`}
                    >
                      {editingId === recurso.IdProcessoFabricacao ? (
                        <>
                          {/* INLINE EDIT MODE */}
                          <td className="px-2 py-1">
                            <input 
                              type="text" 
                              name="processofabricacao" 
                              value={editFormData.processofabricacao || ''} 
                              className="w-full px-1.5 py-1 rounded border border-transparent bg-transparent font-medium text-[#32423D] text-[11px] uppercase outline-none cursor-default" 
                              disabled
                            />
                          </td>
                          <td className="px-2 py-1 hidden md:table-cell">
                            <input 
                              type="text" 
                              name="CodigoProcessoFabricacao" 
                              value={editFormData.CodigoProcessoFabricacao || ''} 
                              onChange={handleInputInline} 
                              className="w-full px-1.5 py-1 rounded border border-gray-300 text-[10px] uppercase focus:border-[#32423D] outline-none" 
                            />
                          </td>
                          <td className="px-2 py-1 text-center hidden md:table-cell w-20">
                            <select 
                              name="Fabrica" 
                              value={editFormData.Fabrica} 
                              onChange={handleInputInline} 
                              className="w-full px-1 py-1 rounded border border-gray-300 text-[10px] focus:border-[#32423D] outline-none"
                            >
                              <option value="SIM">SIM</option>
                              <option value="NÂO">NÃO</option>
                            </select>
                          </td>
                          <td className="px-2 py-1 text-center hidden md:table-cell w-20">
                            <select 
                              name="DataLiberada" 
                              value={editFormData.DataLiberada} 
                              onChange={handleInputInline} 
                              className="w-full px-1 py-1 rounded border border-gray-300 text-[10px] focus:border-[#32423D] outline-none"
                            >
                              <option value="SIM">SIM</option>
                              <option value="NÂO">NÃO</option>
                            </select>
                          </td>
                          <td className="px-2 py-1 text-right hidden sm:table-cell">
                            <input 
                              type="number" 
                              step="0.01" 
                              name="Setup" 
                              value={editFormData.Setup === undefined ? '' : editFormData.Setup} 
                              onChange={handleInputInline} 
                              className="w-full px-1.5 py-1 rounded border border-gray-300 text-[10px] text-right focus:border-[#32423D] outline-none" 
                            />
                          </td>
                          <td className="px-2 py-1 text-right hidden sm:table-cell">
                            <input 
                              type="number" 
                              step="0.01" 
                              name="TempoPadrao" 
                              value={editFormData.TempoPadrao === undefined ? '' : editFormData.TempoPadrao} 
                              onChange={handleInputInline} 
                              className="w-full px-1.5 py-1 rounded border border-gray-300 text-[10px] text-right focus:border-[#32423D] outline-none" 
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={handleUpdateInline}
                                disabled={saving}
                                className="px-2 py-1 rounded text-white bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50"
                                title="Salvar"
                              >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                onClick={handleCancelInline}
                                disabled={saving}
                                className="px-2 py-1 rounded text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center shadow-sm disabled:opacity-50"
                                title="Cancelar"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* NORMAL READ-ONLY MODE */}
                          <td className="px-3 py-1">
                            <p className="font-medium text-[#32423D] text-[11px]">{recurso.processofabricacao}</p>
                          </td>
                          <td className="px-3 py-1 hidden md:table-cell text-[11px] text-gray-600">
                            {recurso.CodigoProcessoFabricacao || '-'}
                          </td>
                          <td className="px-3 py-1 text-center hidden md:table-cell">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${recurso.Fabrica === 'SIM' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {recurso.Fabrica}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-center hidden md:table-cell">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${recurso.DataLiberada === 'SIM' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              {recurso.DataLiberada}
                            </span>
                          </td>
                          <td className="px-3 py-1 text-right hidden sm:table-cell text-[11px] text-gray-600 font-medium">
                            {recurso.Setup ?? '-'}
                          </td>
                          <td className="px-3 py-1 text-right hidden sm:table-cell text-[11px] text-gray-600 font-medium">
                            {recurso.TempoPadrao ?? '-'}
                          </td>
                          
                          <td className="px-3 py-1">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => handleEdit(recurso)}
                                className="p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-[#E0E800]/20 transition-colors"
                                title="Editar Inline"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => recurso.IdProcessoFabricacao && handleDelete(recurso.IdProcessoFabricacao)}
                                className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
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
              Mostrando <span className="font-medium">{filteredRecursos.length}</span> de <span className="font-medium">{recursos.length}</span> processos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
