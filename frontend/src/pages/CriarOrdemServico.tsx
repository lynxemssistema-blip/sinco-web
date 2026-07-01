import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = '/api';

interface Option {
  id: string | number;
  label: string;
}

export default function CriarOrdemServicoPage() {
  const { user, token } = useAuth();
  
  const [projetos, setProjetos] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    IdProjeto: '',
    Projeto: '',
    IdTag: '',
    Tag: '',
    DescTag: '',
    Descricao: '',
    IdEmpresa: '',
    DescEmpresa: '',
    EnderecoOrdemServico: '',
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

  useEffect(() => {
    fetchProjetos();
  }, []);

  const fetchProjetos = async () => {
    try {
      const res = await fetch(`${API_BASE}/ordemservico/projetos-clonagem`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) setProjetos(json.data);
    } catch (err) {
      console.error('Error fetching projetos:', err);
    }
  };

  const fetchTags = async (projetoId: string) => {
    try {
      const res = await fetch(`${API_BASE}/ordemservico/tags-clonagem?projetoId=${projetoId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) setTags(json.data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const fetchTagDetails = async (idTag: string) => {
    try {
      const res = await fetch(`${API_BASE}/tag/${idTag}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
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
    const projeto = projetos.find(p => p.id.toString() === idProjeto)?.label || '';
    setFormData(prev => ({ ...prev, IdProjeto: idProjeto, Projeto: projeto, IdTag: '', Tag: '', DescTag: '', DataPrevisao: '' }));
    setTags([]);
    if (idProjeto) fetchTags(idProjeto);
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idTag = e.target.value;
    const tag = tags.find(t => t.id.toString() === idTag)?.label || '';
    setFormData(prev => ({ ...prev, IdTag: idTag, Tag: tag }));
    if (idTag) fetchTagDetails(idTag);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProdutoPadraoBlur = () => {
    if (formData.ProdutoPadrao) {
      fetchMaterialByCod(formData.ProdutoPadrao);
    }
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
        setMessage({ type: 'success', text: 'Ordem de Serviço criada com sucesso!' });
        setFormData({
          IdProjeto: '', Projeto: '', IdTag: '', Tag: '', DescTag: '', Descricao: '',
          IdEmpresa: '', DescEmpresa: '', EnderecoOrdemServico: '', DataPrevisao: '',
          ProdutoPadrao: '', CodDesenhoProduto: '', DescricaoProduto: '', ProdutoCriadoPor: '',
          DataCriacaoProduto: '', Fator: '1', TipoLiberacaoOrdemServico: 'Total'
        });
        setTags([]);
      } else {
        setMessage({ type: 'error', text: json.message || 'Erro ao salvar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#32423D] bg-white";

  return (
    <div className="space-y-6 h-full flex flex-col min-h-0 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#32423D] flex items-center gap-2">
          <Plus size={24} /> Criar Ordem Serviço
        </h1>
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
              <label className="block text-xs font-medium text-gray-500 mb-1">Projeto <span className="text-red-500">*</span></label>
              <select name="IdProjeto" value={formData.IdProjeto} onChange={handleProjetoChange} className={inputClass} required>
                <option value="">Selecione um projeto...</option>
                {projetos.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tag <span className="text-red-500">*</span></label>
              <select name="IdTag" value={formData.IdTag} onChange={handleTagChange} className={inputClass} required disabled={!formData.IdProjeto}>
                <option value="">Selecione uma tag...</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
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

        {/* Parte 2 e 4 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">2. Endereço e Previsão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Endereço da Ordem de Serviço</label>
              <input type="text" name="EnderecoOrdemServico" value={formData.EnderecoOrdemServico} onChange={handleInputChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Data de Previsão (Tag)</label>
              <input type="date" name="DataPrevisao" value={formData.DataPrevisao?.substring(0, 10) || ''} onChange={handleInputChange} className={inputClass} readOnly />
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
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-1 mb-3">4. Configurações de Liberação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fator <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" min="0.01" name="Fator" value={formData.Fator} onChange={handleInputChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Liberação</label>
              <select name="TipoLiberacaoOrdemServico" value={formData.TipoLiberacaoOrdemServico} onChange={handleInputChange} className={inputClass}>
                <option value="Total">Total</option>
                <option value="Parcial">Parcial</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end border-t pt-4">
          <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#32423D] hover:bg-[#E0E800]/100 hover:text-black text-white px-5 py-2 rounded font-bold text-xs transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Salvar Registro
          </button>
        </div>
      </form>
    </div>
  );
}
