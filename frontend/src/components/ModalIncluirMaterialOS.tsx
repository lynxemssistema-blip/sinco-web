import { useState, useEffect } from 'react';
import { Search, Plus, X, Loader2, Check, CheckCircle } from 'lucide-react';

const API_BASE = '/api';

interface Material {
  CodMatFabricante: string;
  DescResumo: string;
  acabamento?: string;
  [key: string]: any;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  osId: number | string;
  osContext: any;
  onSuccess: () => void;
  token: string | null;
}

export default function ModalIncluirMaterialOS({ isOpen, onClose, osId, osContext, onSuccess, token }: ModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [cod: string]: { qtde: number, acabamento: string } }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalAcabamento, setGlobalAcabamento] = useState('');
  const [acabamentos, setAcabamentos] = useState<{ id: string | number, label: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [totalAdded, setTotalAdded] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setAllMaterials([]);
      setSelectedItems({});
      setGlobalAcabamento('');
      setSuccessMsg(null);
      setTotalAdded(0);
      fetchAcabamentos();
      fetchInitialMaterials();
    }
  }, [isOpen]);

  const fetchInitialMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/material/busca-livre?q=`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        setAllMaterials(json.data);
        setSearchResults(json.data);
      }
    } catch (e) {
      console.error('Erro na busca inicial', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcabamentos = async () => {
    try {
      const res = await fetch(`${API_BASE}/acabamento`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAcabamentos(json.data.map((a: any) => ({ id: a.DescAcabamento, label: a.DescAcabamento })));
      }
    } catch (e) {
      console.error('Erro ao buscar acabamentos', e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      // Se pesquisa vazia, volta à lista completa
      setSearchResults(allMaterials);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/material/busca-livre?q=${encodeURIComponent(searchTerm)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data);
      }
    } catch (e) {
      console.error('Erro na busca', e);
    } finally {
      setLoading(false);
    }
  };

  // Limpar pesquisa e voltar à lista completa
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults(allMaterials);
  };

  const toggleSelection = (mat: Material) => {
    setSelectedItems(prev => {
      const novo = { ...prev };
      if (novo[mat.CodMatFabricante]) {
        delete novo[mat.CodMatFabricante];
      } else {
        novo[mat.CodMatFabricante] = { qtde: 1, acabamento: globalAcabamento || mat.acabamento || '' };
      }
      return novo;
    });
  };

  const updateItem = (cod: string, field: 'qtde' | 'acabamento', value: any) => {
    setSelectedItems(prev => ({
      ...prev,
      [cod]: { ...prev[cod], [field]: value }
    }));
  };

  const handleSubmit = async () => {
    const itensArray = Object.keys(selectedItems).map(cod => ({
      codmatfabricante: cod,
      qtde: selectedItems[cod].qtde,
      acabamento: selectedItems[cod].acabamento
    }));

    if (itensArray.length === 0) {
      alert('Selecione pelo menos um material.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_BASE}/ordemservico/${osId}/incluir-materiais-dinamico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          itensSelecionados: itensArray,
          osContext
        })
      });

      const json = await res.json();
      if (json.success) {
        const qtdAdded = itensArray.length;
        setTotalAdded(prev => prev + qtdAdded);

        // ✅ Limpar seleção e pesquisa — retornar à lista completa para novos itens
        setSelectedItems({});
        setSearchTerm('');
        setSearchResults(allMaterials);
        setSuccessMsg(`✓ ${qtdAdded} material(is) incluído(s) na OS. Selecione mais ou clique em Concluir.`);

        // Notificar parent sem fechar (para atualizar contadores externos se necessário)
        onSuccess();
      } else {
        alert('Erro: ' + json.message);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar itens.');
    } finally {
      setSaving(false);
    }
  };

  // Fechar o modal ao concluir (usuário decide quando parar)
  const handleConcluir = () => {
    onClose();
  };

  if (!isOpen) return null;

  const totalSelected = Object.keys(selectedItems).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-[#32423D] text-white rounded-t-lg">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plus size={20} /> Incluir Materiais na O.S. #{osId}
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Busque e selecione materiais. Após confirmar, a lista retorna para você incluir mais itens.
              {totalAdded > 0 && <span className="ml-2 font-bold text-[#E0E800]">({totalAdded} material(is) já incluído(s))</span>}
            </p>
          </div>
          <button onClick={handleConcluir} className="p-1 hover:bg-white/20 rounded transition-colors" title="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Toast de sucesso */}
        {successMsg && (
          <div className="flex items-center gap-2 bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-emerald-700 text-xs font-medium">
            <CheckCircle size={14} className="shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left panel - Search */}
          <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
            <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Buscar por código ou descrição..."
                    className="w-full px-3 py-1.5 border rounded text-xs focus:outline-none focus:border-[#32423D] pr-8"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button type="submit" className="bg-[#32423D] text-white px-3 py-1.5 rounded hover:bg-[#E0E800]/90 hover:text-black transition-colors">
                  <Search size={16} />
                </button>
              </form>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Acabamento Geral:</label>
                <select 
                   className="flex-1 px-2 py-1 border rounded text-xs focus:outline-none focus:border-[#32423D]"
                   value={globalAcabamento}
                   onChange={e => setGlobalAcabamento(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {acabamentos.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs text-[#32423D] underline text-left hover:text-[#32423D]/70"
                >
                  ← Ver todos os materiais
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-2 bg-gray-50">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#32423D]" size={30} /></div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(mat => {
                    const isSelected = !!selectedItems[mat.CodMatFabricante];
                    return (
                      <div 
                        key={mat.CodMatFabricante}
                        onClick={() => toggleSelection(mat)}
                        className={`px-2 py-1 bg-white border rounded shadow-sm cursor-pointer transition-all hover:border-[#32423D] ${isSelected ? 'border-[#E0E800] ring-1 ring-[#E0E800] bg-[#FAFAEE]' : 'border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex-1 min-w-0 flex items-center">
                            <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{mat.CodMatFabricante}</span>
                            <span className="text-[10px] text-gray-600 ml-2 truncate text-ellipsis">{mat.DescResumo}</span>
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <label className="text-[10px] text-gray-500">Qtd:</label>
                              <input 
                                type="number" min="1" step="1"
                                className="w-14 px-1 py-0.5 border rounded text-[10px] focus:outline-none focus:border-[#32423D]"
                                value={selectedItems[mat.CodMatFabricante]?.qtde || 1}
                                onChange={e => updateItem(mat.CodMatFabricante, 'qtde', parseInt(e.target.value) || 1)}
                              />
                            </div>
                          ) : (
                            <div className="text-gray-300 hover:text-gray-400">
                              <Plus size={14} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">Nenhum resultado encontrado.</div>
              )}
            </div>
          </div>

          {/* Right panel - Selected Items */}
          <div className="w-full md:w-[320px] shrink-0 flex flex-col bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-bold text-gray-700">Itens Selecionados ({totalSelected})</h3>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {totalSelected === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Nenhum item selecionado.</div>
              ) : (
                Object.keys(selectedItems).map(cod => {
                  const item = selectedItems[cod];
                  const mat = searchResults.find(m => m.CodMatFabricante === cod) || { DescResumo: 'Desconhecido' };
                  return (
                    <div key={cod} className="border border-gray-200 rounded p-2 bg-gray-50 relative flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <span className="text-xs font-bold text-gray-800">{cod}</span>
                          <span className="text-[10px] text-gray-500 ml-2 truncate">{mat.DescResumo}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <label className="text-[10px] text-gray-500">Qtd:</label>
                          <input
                            type="number" min="1" step="1"
                            className="w-14 px-1 py-0.5 border rounded text-[10px] focus:outline-none focus:border-[#32423D]"
                            value={item.qtde}
                            onChange={e => updateItem(cod, 'qtde', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                      <button onClick={() => toggleSelection({ CodMatFabricante: cod } as any)} className="text-red-500 hover:bg-red-100 rounded p-1 shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="p-4 border-t bg-gray-50 flex flex-col gap-2">
              <button 
                onClick={handleSubmit} 
                disabled={saving || totalSelected === 0}
                className="w-full bg-[#32423D] hover:bg-[#E0E800]/90 hover:text-black text-white py-2 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirmar Inclusão ({totalSelected})
              </button>
              <button 
                onClick={handleConcluir}
                className="w-full border-2 border-[#32423D] text-[#32423D] hover:bg-[#32423D] hover:text-white py-2 rounded font-bold text-sm transition-colors"
              >
                {totalAdded > 0 ? `Concluir (${totalAdded} incluído(s))` : 'Fechar'}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
