import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import TipoProdutoPage from '../../pages/TipoProduto';
import { useToast } from '../../contexts/ToastContext';

interface Tag {
  IdTag?: number;
  Tag?: string;
  DataPrevisao?: string;
  TipoProduto?: string;
  QtdeTag?: string;
  QtdeLiberada?: string;
  SaldoTag?: string;
  Medida?: string;
  DescTag?: string;
  Finalizado?: string;
}

interface NovaTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projetoId: string | number;
  projetoNome: string;
  tagToEdit?: Tag | null;
  API_BASE: string;
}

export default function NovaTagModal({ isOpen, onClose, onSuccess, projetoId, projetoNome, tagToEdit, API_BASE }: NovaTagModalProps) {
  const { user } = useAuth();
  const { showAlert } = useToast();
  const isEditingTag = !!tagToEdit;
  
  const emptyTagForm: Tag = {
    Tag: '', DataPrevisao: '', TipoProduto: '', QtdeTag: '', QtdeLiberada: '', SaldoTag: '', Medida: '', DescTag: ''
  };

  const [tagFormData, setTagFormData] = useState<Tag>(emptyTagForm);
  const [showTipoProdutoModal, setShowTipoProdutoModal] = useState(false);
  const [tipoProdutoOptions, setTipoProdutoOptions] = useState<{id:string, label:string}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tagToEdit) {
        setTagFormData(tagToEdit);
      } else {
        setTagFormData(emptyTagForm);
      }
      fetchOptions();
    }
  }, [isOpen, tagToEdit]);

  const fetchOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/utils/opcoes-tipo-produto`);
      const json = await res.json();
      if (json.success) setTipoProdutoOptions(json.data);
    } catch (err) {
      console.error('Error fetching type options:', err);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTagFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const hoje = new Date();
      const dataHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
      const loginUsuario = (user as any)?.Login || (user as any)?.login || (user as any)?.NomeCompleto || (user as any)?.nome || 'Sistema';

      const payload = {
        ...tagFormData,
        IdProjeto: projetoId,
        Projeto: projetoNome,
        ...(!isEditingTag ? { CriadoPor: loginUsuario, DataEntrada: dataHoje } : {})
      };

      const url = isEditingTag ? `${API_BASE}/tag/${tagFormData.IdTag}` : `${API_BASE}/tag`;
      const method = isEditingTag ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showAlert('Tag salva com sucesso!', 'success');
        onSuccess();
        onClose();
      } else {
        showAlert(json.message || 'Erro ao salvar tag', 'error');
      }
    } catch {
      showAlert('Erro ao salvar. Verifique a conexão.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputRequired = 'w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-xs';
  const inputOptional = 'w-full border border-gray-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-xs text-gray-600';
  const selectClass = 'w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-xs bg-white';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-white rounded-md shadow-xl w-full max-w-2xl my-8 relative z-[101]"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
                <TagIcon size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#32423D]">
                  {isEditingTag ? 'Editar Tag' : 'Nova Tag'}
                </h2>
                <p className="text-xs text-gray-500">Projeto: {projetoNome}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleTagSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição Tag <span className="text-red-500">*</span></label>
                <input type="text" name="Tag" value={tagFormData.Tag || ''} onChange={handleTagInputChange} className={inputRequired} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Prev. Entrega</label>
                <input
                  type="date"
                  name="DataPrevisao"
                  value={(() => {
                    const v = tagFormData.DataPrevisao || '';
                    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
                  })()}
                  onChange={e => {
                    const [y, m, d] = (e.target.value || '').split('-');
                    const br = y && m && d ? `${d}/${m}/${y}` : '';
                    setTagFormData(prev => ({ ...prev, DataPrevisao: br }));
                  }}
                  className={inputOptional}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTipoProdutoModal(true)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100 text-gray-500 hover:bg-[#32423D] hover:text-white transition-colors border border-gray-200"
                  title="Novo Tipo Produto"
                >
                  <Plus size={10} strokeWidth={3} />
                </button>
                Tipo Produto
              </label>
              <select name="TipoProduto" value={tagFormData.TipoProduto || ''} onChange={handleTagInputChange} className={selectClass}>
                <option value="">Selecione...</option>
                {tipoProdutoOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade</label>
                <input type="text" name="QtdeTag" value={tagFormData.QtdeTag || ''} onChange={handleTagInputChange} className={inputOptional} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Qt. Liberada</label>
                <input type="text" name="QtdeLiberada" value={tagFormData.QtdeLiberada || ''} readOnly className={`${inputOptional} bg-gray-100 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Saldo</label>
                <input type="text" name="SaldoTag" value={tagFormData.SaldoTag || ''} readOnly className={`${inputOptional} bg-gray-100 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-2">
                  <button type="button" className="inline-flex items-center justify-center w-4 h-4 rounded bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed" disabled>
                    <Plus size={10} strokeWidth={3} />
                  </button>
                  Medida
                </label>
                <input type="text" name="Medida" value={tagFormData.Medida || ''} onChange={handleTagInputChange} className={inputOptional} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <textarea name="DescTag" value={tagFormData.DescTag || ''} onChange={handleTagInputChange} rows={3} className={inputOptional} />
            </div>
            
            <div className="flex justify-end pt-4 mt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#32423D] hover:bg-emerald-800 text-white rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </motion.div>
        
        {showTipoProdutoModal && (
          <div className="fixed inset-0 z-[110]">
            <TipoProdutoPage
              isModal
              onCloseModal={() => {
                setShowTipoProdutoModal(false);
                fetchOptions();
              }}
            />
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
