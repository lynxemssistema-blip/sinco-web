import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Loader2, PackagePlus, Info, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ModalIncluirMaterialOS from '../components/ModalIncluirMaterialOS';
import NovaTagModal from '../components/projetos/NovaTagModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface Option {
  id: string | number;
  label: string;
}

interface CriarOrdemServicoProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function CriarOrdemServicoPage({ onClose, onSuccess }: CriarOrdemServicoProps = {}) {
  const { user, token } = useAuth();
  
  const [projetos, setProjetos] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newOsId, setNewOsId] = useState<number>(0);
  const [newOsContext, setNewOsContext] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    IdProjeto: '',
    Projeto: '',
    IdTag: '',
    Tag: '',
    DescTag: '',
    Descricao: '',
    IdEmpresa: '',
    DescEmpresa: '',
    DataPrevisao: '',
    ProdutoPadrao: '',
    CodDesenhoProduto: '',
    DescricaoProduto: '',
    ProdutoCriadoPor: '',
    DataCriacaoProduto: '',
    Fator: '1',
    TipoLiberacaoOrdemServico: 'Total'
  });

  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [saveAction, setSaveAction] = useState<'com_itens' | 'sem_itens'>('com_itens');
  const [showNovaTagModal, setShowNovaTagModal] = useState(false);

  useEffect(() => {
    if (!token) return; // aguarda autenticação antes de buscar
    fetchProjetos();
  }, [token]); // re-executa quando o token ficar disponível

  const fetchProjetos = async () => {
    try {
      const res = await fetch(`${API_BASE}/ordemservico/projetos-clonagem?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setProjetos(json.data);
    } catch (err) {
      console.error('Error fetching projetos:', err);
    }
  };

  const fetchTags = async (projetoId: string) => {
    try {
      const res = await fetch(`${API_BASE}/ordemservico/tags-clonagem?projetoId=${projetoId}&t=${Date.now()}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        setTags(json.data);
        if (json.data.length === 1) {
          const singleTag = json.data[0];
          setFormData(prev => ({ ...prev, IdTag: (singleTag.value || singleTag.id).toString(), Tag: singleTag.label }));
          fetchTagDetails((singleTag.value || singleTag.id).toString(), true);
        }
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const fetchTagDetails = async (idTag: string, isAutoSelected = false) => {
    try {
      const res = await fetch(`${API_BASE}/tag/${idTag}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        const saldo = parseFloat(json.data.SaldoTag || '0');
        if (saldo <= 0) {
          setMessage({ type: 'error', text: `A Tag selecionada possui saldo zero e não pode ser usada. ${isAutoSelected ? 'Por favor, escolha outro projeto ou crie outra tag para este projeto.' : ''}` });
          setFormData(prev => ({ ...prev, IdTag: '', Tag: '', DescTag: '', DataPrevisao: '' }));
          return;
        } else {
          setMessage(null);
        }

        setFormData(prev => ({
          ...prev,
          DescTag: json.data.DescTag || '',
          DataPrevisao: json.data.DataPrevisao || ''
        }));
      }
    } catch (err) {
      console.error('Error fetching tag details:', err);
    }
  };

  const fetchMaterialByCod = async (codMat: string) => {
    if (!codMat) return;
    try {
      // Usar a busca de material para popular os campos
      const res = await fetch(`${API_BASE}/material/busca-cod?q=${encodeURIComponent(codMat)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        const mat = json.data[0];
        setFormData(prev => ({
          ...prev,
          DescricaoProduto: mat.DescResumo || mat.DescDetal || '',
          ProdutoCriadoPor: mat.CriadoPor || 'Sistema',
          DataCriacaoProduto: mat.DataCriacao || ''
        }));
      }
    } catch (err) {
      console.error('Error fetching material:', err);
    }
  };

  const handleProjetoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idProjeto = e.target.value;
    const projeto = projetos.find(p => (p.value || p.id)?.toString() === idProjeto)?.label || '';
    setFormData(prev => ({ ...prev, IdProjeto: idProjeto, Projeto: projeto, IdTag: '', Tag: '', DescTag: '', DataPrevisao: '' }));
    setTags([]);
    if (idProjeto) fetchTags(idProjeto);
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idTag = e.target.value;
    const tag = tags.find(t => (t.value || t.id)?.toString() === idTag)?.label || '';
    setFormData(prev => ({ ...prev, IdTag: idTag, Tag: tag }));
    if (idTag) fetchTagDetails(idTag, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === 'Descricao') {
      value = value.toUpperCase();
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProdutoPadraoBlur = () => {
    if (formData.ProdutoPadrao) {
      fetchMaterialByCod(formData.ProdutoPadrao);
    }
  };

  const getWorkingDays = (endDateStr: string) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr);
    // Para resolver fuso horario com strings YYYY-MM-DD
    const endLocal = new Date(end.getTime() + end.getTimezoneOffset() * 60000);
    const start = new Date();
    if (isNaN(endLocal.getTime())) return null;
    
    start.setHours(0, 0, 0, 0);
    endLocal.setHours(0, 0, 0, 0);
    
    if (endLocal < start) return 0;
    
    let count = 0;
    let curr = new Date(start);
    while (curr <= endLocal) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curr.setDate(curr.getDate() + 1);
    }
    return count;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.IdProjeto || !formData.IdTag) {
      setMessage({ type: 'error', text: 'Projeto e Tag são obrigatórios.' });
      return;
    }
    
    if (Number(formData.Fator) <= 0) {
      setMessage({ type: 'error', text: 'O campo Fator deve ser maior que zero.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      ...formData,
      CriadoPor: user?.nomeCompleto || user?.nome || user?.login || 'Sistema',
      Estatus: 'A',
      IdMatriz: user?.IdMatriz || 0
    };

    try {
      const res = await fetch(`${API_BASE}/ordemservico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (json.success) {
        if (saveAction === 'com_itens') {
          setNewOsId(json.id);
          setNewOsContext(payload);
          setShowModal(true);
        } else {
          setMessage({ type: 'success', text: `Ordem de Serviço ${json.id} criada com sucesso!` });
          setFormData({
            IdProjeto: '', Projeto: '', IdTag: '', Tag: '', DescTag: '', Descricao: '',
            IdEmpresa: '', DescEmpresa: '', DataPrevisao: '',
            ProdutoPadrao: '', CodDesenhoProduto: '', DescricaoProduto: '', ProdutoCriadoPor: '',
            DataCriacaoProduto: '', Fator: '1', TipoLiberacaoOrdemServico: 'Total'
          });
          setTags([]);
          if (onSuccess) onSuccess();
        }
      } else {
        setMessage({ type: 'error', text: json.message || 'Erro ao salvar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  
  const handleModalSuccess = (count?: number) => {
    setMessage({ type: 'success', text: `Ordem de Serviço ${newOsId} criada e ${count || 0} itens incluídos com sucesso!` });
    setTimeout(() => setMessage(null), 3000);
    setFormData({
      IdProjeto: '', Projeto: '', IdTag: '', Tag: '', DescTag: '', Descricao: '',
      IdEmpresa: '', DescEmpresa: '', EnderecoOrdemServico: 'G:\\Meu Drive\\00-Ordem Serviço', DataPrevisao: '',
      ProdutoPadrao: '', CodDesenhoProduto: '', DescricaoProduto: '', ProdutoCriadoPor: '',
      DataCriacaoProduto: '', Fator: '1', TipoLiberacaoOrdemServico: 'Total'
    });
    setTags([]);
    setShowModal(false);
    if (onSuccess) onSuccess();
  };

  const inputClass = "w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#32423D] bg-white";

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0 bg-gray-50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#32423D] flex items-center gap-2">
            <Plus size={24} /> Criar Ordem Serviço
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Cadastre novas ordens de serviço, definindo projeto, previsão e os dados principais do produto.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-white hover:bg-gray-100 p-2 rounded-full shadow-sm"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded text-xs font-semibold ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded shadow-sm border border-gray-200 flex-1 overflow-auto space-y-6">
        
        {/* Parte 1 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">1. Dados Principais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Projeto <span className="text-red-500">*</span>
                <span
                  className="group relative cursor-help inline-flex items-center"
                  title=""
                >
                  <Info size={12} className="text-blue-400 hover:text-blue-600 transition-colors" />
                  <span className="absolute top-full left-0 mt-2 w-64 p-2.5 bg-slate-800 text-white text-[10px] leading-relaxed rounded shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal">
                    <strong className="block text-yellow-300 mb-1">📋 Critérios de exibição:</strong>
                    Somente projetos que atendam <em>todos</em> os critérios abaixo são exibidos:
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      <li>Não estão <strong>finalizados</strong> (Finalizado ≠ 'C')</li>
                      <li>Não estão <strong>liberados pela engenharia</strong> (Liberado ≠ 'S')</li>
                      <li>Não foram <strong>excluídos</strong> do sistema</li>
                    </ul>
                    <span className="block mt-1.5 text-slate-300">Se o projeto não aparecer, verifique o status dele em <em>Gestão de Projetos</em>.</span>
                  </span>
                </span>
              </label>
              <select name="IdProjeto" value={formData.IdProjeto} onChange={handleProjetoChange} className={inputClass} required>
                <option value="">Selecione um projeto...</option>
                {projetos.length === 0
                  ? <option disabled value="">⚠ Nenhum projeto disponível (veja critérios ⓘ)</option>
                  : projetos.map(p => <option key={p.value || p.id} value={p.value || p.id}>{p.label}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                <span>Tag <span className="text-red-500">*</span></span>
                {formData.IdProjeto && (
                  <button
                    type="button"
                    onClick={() => setShowNovaTagModal(true)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-500 hover:bg-[#32423D] hover:text-white transition-colors border border-gray-200"
                    title="Criar nova Tag para este projeto"
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                )}
              </label>
              <select name="IdTag" value={formData.IdTag} onChange={handleTagChange} className={inputClass} required disabled={!formData.IdProjeto}>
                <option value="">Selecione uma tag...</option>
                {tags.map(t => <option key={t.value || t.id} value={t.value || t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
              <input type="text" name="Descricao" value={formData.Descricao} onChange={handleInputChange} className={inputClass} />
            </div>
            <div className="hidden">
              {/* Campos preenchidos automaticamente e ocultos se não editáveis */}
              <input type="text" name="DescTag" value={formData.DescTag} onChange={handleInputChange} />
              <input type="text" name="IdEmpresa" value={formData.IdEmpresa} onChange={handleInputChange} />
              <input type="text" name="DescEmpresa" value={formData.DescEmpresa} onChange={handleInputChange} />
            </div>
          </div>
        </section>

        {/* Previsão */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">2. Previsão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Data de Previsão (Tag)</label>
              <input type="date" name="DataPrevisao" value={formData.DataPrevisao?.substring(0, 10) || ''} onChange={handleInputChange} className={inputClass} />
            </div>
            <div className="flex items-end pb-0">
              {formData.DataPrevisao && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded border border-blue-200">
                  Restam {getWorkingDays(formData.DataPrevisao)} dias úteis
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Parte 5 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">3. Dados do Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Produto Padrão (Cod. Material)</label>
              <input type="text" name="ProdutoPadrao" value={formData.ProdutoPadrao} onChange={handleInputChange} onBlur={handleProdutoPadraoBlur} placeholder="Digite para buscar material" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Código Desenho Produto</label>
              <input type="text" name="CodDesenhoProduto" value={formData.CodDesenhoProduto} onChange={handleInputChange} className={inputClass} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Descrição Produto</label>
              <input type="text" name="DescricaoProduto" value={formData.DescricaoProduto} onChange={handleInputChange} className={inputClass} readOnly />
            </div>
          </div>
        </section>

        {/* Parte 6 e 7 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">4. Configurações de Liberação e Salvar</h3>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex gap-4 flex-1">
              <div className="w-1/3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Fator <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0.01" name="Fator" value={formData.Fator} onChange={handleInputChange} className={inputClass} required />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Liberação</label>
                <select name="TipoLiberacaoOrdemServico" value={formData.TipoLiberacaoOrdemServico} onChange={handleInputChange} className={inputClass}>
                  <option value="Total">Total</option>
                  <option value="Parcial">Parcial</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                type="submit" 
                onClick={() => setSaveAction('sem_itens')}
                disabled={saving} 
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded font-bold text-xs transition-colors whitespace-nowrap border border-gray-300"
              >
                {saving && saveAction === 'sem_itens' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Salvar (Vazio)
              </button>
              <button 
                type="submit" 
                onClick={() => setSaveAction('com_itens')}
                disabled={saving} 
                className="flex items-center gap-2 bg-[#32423D] hover:bg-[#E0E800]/100 hover:text-black text-white px-5 py-1.5 rounded font-bold text-xs transition-colors whitespace-nowrap"
              >
                {saving && saveAction === 'com_itens' ? <Loader2 size={15} className="animate-spin" /> : <PackagePlus size={15} />}
                Salvar e Compor Itens
              </button>
            </div>
          </div>
        </section>
      </form>
      <ModalIncluirMaterialOS 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          // Opcional: Se o usuário fechar o modal sem incluir, limpa o form também.
          handleModalSuccess();
        }}
        osId={newOsId}
        osContext={newOsContext}
        onSuccess={handleModalSuccess}
        token={token}
      />
      <NovaTagModal
        isOpen={showNovaTagModal}
        onClose={() => setShowNovaTagModal(false)}
        onSuccess={() => {
          if (formData.IdProjeto) {
            fetchTags(formData.IdProjeto);
          }
        }}
        projetoId={formData.IdProjeto}
        projetoNome={formData.Projeto}
        API_BASE={API_BASE}
      />
    </div>
  );
}
