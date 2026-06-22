import React, { useState, useEffect } from 'react';
import { Search, Loader2, Package, Layers, Plus, Trash2, ArrowRight, X, Eraser, Settings, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ProcessoFabricacaoModal from '../components/ProcessoFabricacaoModal';

const API_BASE = '/api/peca-manufaturada';

export default function MontaPecaManufaturadaPage({ usuario = 'Sistema' }: { usuario?: string }) {
    const { user } = useAuth();
    const [processoModalDesenho, setProcessoModalDesenho] = useState<any | null>(null);
    const [processoMaintenanceDesenho, setProcessoMaintenanceDesenho] = useState<any | null>(null);
    const [checkingProducto, setCheckingProducto] = useState(false);
    const [processosExistentes, setProcessosExistentes] = useState<any[]>([]);
    const [loadingProcessos, setLoadingProcessos] = useState(false);
    const [isExistingProduct, setIsExistingProduct] = useState(false);
    const [desenhos, setDesenhos] = useState<any[]>([]);
    const [pecas, setPecas] = useState<any[]>([]);
    const [composicao, setComposicao] = useState<any[]>([]);
    const [materiais, setMateriais] = useState<any[]>([]);
    
    const [selectedDesenho, setSelectedDesenho] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'composicao' | 'materiais'>('composicao');

    const [pesqDesenhoCod, setPesqDesenhoCod] = useState('');
    const [pesqDesenhoDesc, setPesqDesenhoDesc] = useState('');
    const [pesqPecaCod, setPesqPecaCod] = useState('');
    const [pesqPecaDesc, setPesqPecaDesc] = useState('');
    const [pesqMaterialCod, setPesqMaterialCod] = useState('');
    const [pesqMaterialDesc, setPesqMaterialDesc] = useState('');
    
    const [pesqComposicaoCod, setPesqComposicaoCod] = useState('');
    const [pesqComposicaoDesc, setPesqComposicaoDesc] = useState('');

    const [loadingDesenhos, setLoadingDesenhos] = useState(false);
    const [loadingPecas, setLoadingPecas] = useState(false);
    const [loadingComposicao, setLoadingComposicao] = useState(false);
    const [loadingMateriais, setLoadingMateriais] = useState(false);

    const fetchDesenhos = async () => {
        setLoadingDesenhos(true);
        try {
            const params = new URLSearchParams();
            if (pesqDesenhoCod) params.append('codigo', pesqDesenhoCod);
            if (pesqDesenhoDesc) params.append('descricao', pesqDesenhoDesc);
            
            const url = `${API_BASE}/desenhos${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setDesenhos(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDesenhos(false);
        }
    };

    const fetchPecas = async () => {
        setLoadingPecas(true);
        try {
            const params = new URLSearchParams();
            if (pesqPecaCod) params.append('codigo', pesqPecaCod);
            if (pesqPecaDesc) params.append('descricao', pesqPecaDesc);
            
            const url = `${API_BASE}/pecas${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setPecas(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPecas(false);
        }
    };

    const fetchComposicao = async (idMaterialPeca: number) => {
        setLoadingComposicao(true);
        try {
            const res = await fetch(`${API_BASE}/composicao/${idMaterialPeca}`);
            const json = await res.json();
            if (json.success) setComposicao(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingComposicao(false);
        }
    };

    const fetchMateriais = async () => {
        setLoadingMateriais(true);
        try {
            const params = new URLSearchParams();
            if (pesqMaterialCod) params.append('codigo', pesqMaterialCod);
            if (pesqMaterialDesc) params.append('descricao', pesqMaterialDesc);
            
            const url = `${API_BASE}/materiais${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setMateriais(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMateriais(false);
        }
    };

    useEffect(() => {
        fetchDesenhos();
        fetchPecas();
        fetchMateriais();
    }, []);

    const handleSelectDesenho = (desenho: any) => {
        setSelectedDesenho(desenho);
        setActiveTab('composicao');
        setPesqComposicaoCod('');
        setPesqComposicaoDesc('');
        fetchComposicao(desenho.IdMaterial);
        // Sempre mostra painel de processos (Grid 2 ou após modal)
        setIsExistingProduct(true);
        fetchProcessosExistentes(desenho.CodMatFabricante);
    };

    const fetchProcessosExistentes = async (codmatFabricante: string) => {
        setLoadingProcessos(true);
        try {
            const res = await fetch(`${API_BASE}/processos-existentes/${encodeURIComponent(codmatFabricante)}`);
            const json = await res.json();
            if (json.success) setProcessosExistentes(json.data);
        } catch (e) { console.error(e); }
        finally { setLoadingProcessos(false); }
    };

    // Abre modal de processos ao clicar em Desenho (Grid 1)
    // Se já for produto manufaturado (tem composição), vai direto ao Grid 3
    const handleDesenhoClick = async (desenho: any) => {
        setCheckingProducto(true);
        try {
            const res = await fetch(`${API_BASE}/composicao/${desenho.IdMaterial}`);
            const json = await res.json();
            const jaEhProduto = json.success && json.data && json.data.length > 0;
            if (jaEhProduto) {
                // Já é peça manufaturada: vai direto ao Grid 3
                setIsExistingProduct(true);
                setSelectedDesenho(desenho);
                setActiveTab('composicao');
                setPesqComposicaoCod('');
                setPesqComposicaoDesc('');
                setComposicao(json.data);
                fetchProcessosExistentes(desenho.CodMatFabricante);
            } else {
                // Novo: abre modal de processos
                setIsExistingProduct(false);
                setProcessosExistentes([]);
                setProcessoModalDesenho(desenho);
            }
        } catch {
            setIsExistingProduct(false);
            setProcessoModalDesenho(desenho);
        } finally {
            setCheckingProducto(false);
        }
    };

    const handleProcessoModalConfirm = (desenho: any) => {
        setProcessoModalDesenho(null);
        handleSelectDesenho(desenho);
    };

    const handleProcessoModalCancel = () => {
        setProcessoModalDesenho(null);
    };

    // Manutenção de processos (abre sem mudar o produto selecionado)
    const handleManutencaoProcessos = () => {
        if (selectedDesenho) setProcessoMaintenanceDesenho(selectedDesenho);
    };

    const handleMaintenanceConfirm = () => {
        setProcessoMaintenanceDesenho(null);
        // Recarrega processos após manutenção
        if (selectedDesenho) fetchProcessosExistentes(selectedDesenho.CodMatFabricante);
    };

    const handleMaintenanceCancel = () => {
        setProcessoMaintenanceDesenho(null);
    };

    // Filtro local para composição (já que trazemos todos os itens da receita)
    const composicaoFiltrada = composicao.filter(c => {
        const matchCod = !pesqComposicaoCod || c.CodMatFabricante?.toLowerCase().includes(pesqComposicaoCod.toLowerCase());
        const matchDesc = !pesqComposicaoDesc || c.DescDetal?.toLowerCase().includes(pesqComposicaoDesc.toLowerCase());
        return matchCod && matchDesc;
    });

    const handleAddMaterial = async (idMaterial: number) => {
        if (!selectedDesenho) return;

        const jaExiste = composicao.some(c => c.IdMaterial === idMaterial);
        if (jaExiste) {
            alert('Este insumo já faz parte da composição desta peça.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/composicao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idMaterialPeca: selectedDesenho.IdMaterial,
                    idMaterial,
                    quantidade: 1,
                    usuario
                })
            });
            const json = await res.json();
            if (json.success) {
                fetchComposicao(selectedDesenho.IdMaterial);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveMaterial = async (idMontaPeca: number) => {
        if (!confirm('Deseja realmente excluir este item da composição?')) return;
        try {
            const res = await fetch(`${API_BASE}/composicao/${idMontaPeca}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario })
            });
            const json = await res.json();
            if (json.success) {
                fetchComposicao(selectedDesenho.IdMaterial);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="h-full flex flex-col min-h-0 bg-gray-50 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            {/* Modal de Processos de Fabricação */}
            {processoModalDesenho && (
                <ProcessoFabricacaoModal
                    desenho={processoModalDesenho}
                    onConfirm={handleProcessoModalConfirm}
                    onCancel={handleProcessoModalCancel}
                />
            )}
            {/* Modal de Manutenção de Processos (aberto a partir do Grid 3) */}
            {processoMaintenanceDesenho && (
                <ProcessoFabricacaoModal
                    desenho={processoMaintenanceDesenho}
                    onConfirm={handleMaintenanceConfirm}
                    onCancel={handleMaintenanceCancel}
                    processosIniciais={processosExistentes}
                />
            )}
            {/* Main Content — 3 columns side by side */}
            <div className="flex-1 flex min-h-0">
                {/* COLUMN 1: Desenhos */}
                <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col h-full min-w-0">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                            <Package size={16} /> Produtos (Desenhos)
                        </h3>
                        <div className="flex gap-1 mb-1">
                            <div className="relative w-1/3">
                                <input
                                    type="text"
                                    placeholder="Cód. Material..."
                                    value={pesqDesenhoCod}
                                    onChange={(e) => setPesqDesenhoCod(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchDesenhos()}
                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                />
                                {pesqDesenhoCod && (
                                    <button onClick={() => setPesqDesenhoCod('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Descrição..."
                                    value={pesqDesenhoDesc}
                                    onChange={(e) => setPesqDesenhoDesc(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchDesenhos()}
                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                />
                                {pesqDesenhoDesc && (
                                    <button onClick={() => setPesqDesenhoDesc('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <button onClick={fetchDesenhos} className="p-1.5 bg-[#32423D] text-white rounded hover:bg-[#25322e]" title="Buscar">
                                <Search size={14} />
                            </button>
                            <button 
                                onClick={() => { setPesqDesenhoCod(''); setPesqDesenhoDesc(''); setTimeout(fetchDesenhos, 50); }} 
                                className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                title="Limpar Filtros"
                            >
                                <Eraser size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {loadingDesenhos ? (
                            <div className="flex justify-center p-4 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
                        ) : desenhos.length === 0 ? (
                            <div className="p-4 text-center text-[11px] text-gray-400">Nenhum desenho encontrado.</div>
                        ) : (
                            <table className="w-full text-left text-[11px]">
                                <thead className="sticky top-0 bg-gray-100 text-gray-600 shadow-sm text-[10px] uppercase">
                                    <tr>
                                        <th className="p-1.5 px-2 font-bold">Cód. Material</th>
                                        <th className="p-1.5 px-2 font-bold">Descrição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {desenhos.map(d => (
                                        <tr 
                                            key={d.IdMaterial} 
                                            onClick={() => handleDesenhoClick(d)}
                                            className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedDesenho?.IdMaterial === d.IdMaterial ? 'bg-[#E0E800]/10 border-l-2 border-[#32423D]' : 'border-l-2 border-transparent'}`}
                                        >
                                            <td className="p-1.5 px-2 font-mono text-[#32423D] font-bold">{d.CodMatFabricante}</td>
                                            <td className="p-1.5 px-2 text-gray-600 truncate max-w-[150px]" title={d.DescResumo}>{d.DescResumo}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: Peças Manufaturadas */}
                <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col h-full min-w-0">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                                <Package size={16} /> Produtos
                            </h3>
                            <div className="flex gap-1">
                                <div className="relative w-1/3">
                                    <input
                                        type="text"
                                        placeholder="Cód. Material..."
                                        value={pesqPecaCod}
                                        onChange={(e) => setPesqPecaCod(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchPecas()}
                                        className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    {pesqPecaCod && (
                                        <button onClick={() => setPesqPecaCod('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                    )}
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Descrição..."
                                        value={pesqPecaDesc}
                                        onChange={(e) => setPesqPecaDesc(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchPecas()}
                                        className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    {pesqPecaDesc && (
                                        <button onClick={() => setPesqPecaDesc('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                                    )}
                                </div>
                                <button onClick={fetchPecas} className="p-1.5 bg-[#32423D] text-white rounded hover:bg-[#25322e]"><Search size={14} /></button>
                                <button onClick={() => { setPesqPecaCod(''); setPesqPecaDesc(''); setTimeout(fetchPecas, 50); }} className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"><Eraser size={14} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {loadingPecas ? (
                                <div className="flex justify-center p-4 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
                            ) : pecas.length === 0 ? (
                                <div className="p-4 text-center text-[11px] text-gray-400">Nenhuma peça manufaturada encontrada.</div>
                            ) : (
                                <table className="w-full text-left text-[11px]">
                                    <thead className="sticky top-0 bg-gray-100 text-gray-600 shadow-sm text-[10px] uppercase">
                                        <tr>
                                            <th className="p-1.5 px-2 font-bold w-1/3">Cód. Material</th>
                                            <th className="p-1.5 px-2 font-bold">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {pecas.map(p => (
                                            <tr 
                                                key={p.IdMaterial} 
                                                onClick={() => handleSelectDesenho(p)}
                                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedDesenho?.IdMaterial === p.IdMaterial ? 'bg-[#E0E800]/10 border-l-2 border-[#32423D]' : 'border-l-2 border-transparent'}`}
                                            >
                                                <td className="p-1.5 px-2 font-mono text-[#32423D] font-bold">{p.CodMatFabricante}</td>
                                                <td className="p-1.5 px-2 text-gray-600 truncate max-w-[300px]" title={p.DescResumo}>{p.DescResumo}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                </div>

                {/* COLUMN 3: Composição / Catálogo */}
                <div className="w-1/3 flex flex-col h-full min-w-0 bg-gray-50">
                    {selectedDesenho ? (
                        <>
                            {/* Header for selected item */}
                            <div className="p-2 px-4 bg-white border-b border-gray-200 shrink-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Produto Selecionado</div>
                                        <div className="text-sm font-bold text-[#32423D] leading-tight">{selectedDesenho.CodMatFabricante}</div>
                                        <div className="text-[11px] text-gray-600 leading-tight">{selectedDesenho.DescResumo}</div>
                                    </div>
                                    <button
                                        onClick={handleManutencaoProcessos}
                                        title="Manutenção de Processos de Fabricação"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition-colors shrink-0 mt-1"
                                    >
                                        <Wrench size={12} />
                                        Processos
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex bg-white border-b border-gray-200 shrink-0 px-2 pt-1">
                                <button 
                                    onClick={() => setActiveTab('composicao')}
                                    className={`px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === 'composicao' ? 'border-[#32423D] text-[#32423D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Composição Atual
                                </button>
                                <button 
                                    onClick={() => setActiveTab('materiais')}
                                    className={`px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === 'materiais' ? 'border-[#32423D] text-[#32423D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Catálogo de Insumos (Adicionar)
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-hidden relative">
                                
                                {/* COMPOSIÇÃO TAB */}
                                {activeTab === 'composicao' && (
                                    <div className="absolute inset-0 flex flex-col bg-white">
                                        <div className="p-2 border-b border-gray-100 flex gap-1 items-center bg-gray-50/50">
                                            <div className="relative w-48">
                                                <input
                                                    type="text"
                                                    placeholder="Código..."
                                                    value={pesqComposicaoCod}
                                                    onChange={(e) => setPesqComposicaoCod(e.target.value)}
                                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                                />
                                                {pesqComposicaoCod && (
                                                    <button onClick={() => setPesqComposicaoCod('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Descrição..."
                                                    value={pesqComposicaoDesc}
                                                    onChange={(e) => setPesqComposicaoDesc(e.target.value)}
                                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                                />
                                                {pesqComposicaoDesc && (
                                                    <button onClick={() => setPesqComposicaoDesc('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => { setPesqComposicaoCod(''); setPesqComposicaoDesc(''); }} 
                                                className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                                title="Limpar Filtros"
                                            >
                                                <Eraser size={14} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                                            {loadingComposicao ? (
                                                <div className="flex justify-center p-4 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
                                            ) : composicao.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                                                    <Layers size={32} strokeWidth={1} />
                                                    <p className="text-[11px]">Nenhum insumo associado a esta peça.</p>
                                                    <button 
                                                        onClick={() => setActiveTab('materiais')}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-[#32423D] text-white rounded-lg text-[11px] font-bold hover:bg-[#25322e]"
                                                    >
                                                        <Plus size={14} /> Adicionar Insumo
                                                    </button>
                                                </div>
                                            ) : composicaoFiltrada.length === 0 ? (
                                                <div className="p-4 text-center text-[11px] text-gray-400">Nenhum item corresponde à sua pesquisa.</div>
                                            ) : (
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full text-left text-[11px]">
                                                        <thead className="bg-gray-100 text-gray-600 text-[10px] uppercase sticky top-0">
                                                            <tr>
                                                                <th className="p-1.5 px-2 font-bold">Código Insumo</th>
                                                                <th className="p-1.5 px-2 font-bold">Descrição</th>
                                                                <th className="p-1.5 px-2 font-bold text-center">Estoque</th>
                                                                <th className="p-1.5 px-2 font-bold text-center">Qtde (Receita)</th>
                                                                <th className="p-1.5 px-2 font-bold text-center">Ação</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {composicaoFiltrada.map(c => (
                                                                <tr key={c.IdMontaPeca} className="hover:bg-gray-50">
                                                                <td className="p-1.5 px-2 font-mono font-bold">{c.CodMatFabricante}</td>
                                                                <td className="p-1.5 px-2 text-gray-600">{c.DescDetal}</td>
                                                                <td className="p-1.5 px-2 text-center">{c.txtItemEstoque || '-'}</td>
                                                                <td className="p-1.5 px-2 text-center font-bold text-[#32423D]">{c.PecaQtde || 1}</td>
                                                                <td className="p-1.5 px-2 text-center">
                                                                    <button 
                                                                        onClick={() => handleRemoveMaterial(c.IdMontaPeca)}
                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                                        title="Remover da composição"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* MATERIAIS TAB */}
                                {activeTab === 'materiais' && (
                                    <div className="absolute inset-0 flex flex-col bg-white">
                                        <div className="p-2 border-b border-gray-100 flex gap-1 items-center bg-gray-50/50">
                                            <div className="relative w-48">
                                                <input
                                                    type="text"
                                                    placeholder="Código..."
                                                    value={pesqMaterialCod}
                                                    onChange={(e) => setPesqMaterialCod(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
                                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                                />
                                                {pesqMaterialCod && (
                                                    <button onClick={() => setPesqMaterialCod('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Descrição ou RP..."
                                                    value={pesqMaterialDesc}
                                                    onChange={(e) => setPesqMaterialDesc(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
                                                    className="w-full px-2 py-1 pr-6 text-[11px] border border-gray-300 rounded focus:outline-none focus:border-[#32423D]"
                                                />
                                                {pesqMaterialDesc && (
                                                    <button onClick={() => setPesqMaterialDesc('')} className="absolute right-1 top-1.5 text-gray-400 hover:text-gray-600">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <button onClick={fetchMateriais} className="p-1.5 bg-[#32423D] text-white rounded hover:bg-[#25322e]" title="Buscar">
                                                <Search size={14} />
                                            </button>
                                            <button 
                                                onClick={() => { setPesqMaterialCod(''); setPesqMaterialDesc(''); setTimeout(fetchMateriais, 50); }} 
                                                className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                                title="Limpar Filtros"
                                            >
                                                <Eraser size={14} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                                            {loadingMateriais ? (
                                                <div className="flex justify-center p-4 text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
                                            ) : (
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full text-left text-[11px]">
                                                        <thead className="bg-gray-100 text-gray-600 text-[10px] uppercase sticky top-0">
                                                            <tr>
                                                                <th className="p-1.5 px-2 font-bold w-10 text-center">Ação</th>
                                                                <th className="p-1.5 px-2 font-bold">Código</th>
                                                                <th className="p-1.5 px-2 font-bold">Descrição</th>
                                                                <th className="p-1.5 px-2 font-bold">Família</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {materiais.map(m => (
                                                                <tr key={m.IdMaterial} className="hover:bg-gray-50">
                                                                    <td className="p-1 text-center">
                                                                        <button 
                                                                            onClick={() => handleAddMaterial(m.IdMaterial)}
                                                                            className="w-6 h-6 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                                                            title="Adicionar à Composição"
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </td>
                                                                    <td className="p-1.5 px-2 font-mono text-[#32423D] font-bold">{m.CodMatFabricante}</td>
                                                                    <td className="p-1.5 px-2 text-gray-600 truncate max-w-[250px]" title={m.DescDetal}>{m.DescDetal}</td>
                                                                    <td className="p-1.5 px-2 text-gray-500 text-[10px] truncate max-w-[100px]" title={m.Familia}>{m.Familia}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PAINEL INFERIOR: Processos Existentes (só para produto já manufaturado) */}
                            {isExistingProduct && (
                                <div className="shrink-0 border-t-2 border-amber-300 bg-amber-50/40 flex flex-col" style={{height: '200px'}}>
                                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-200 shrink-0">
                                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                                            Processos de Fabricação ({processosExistentes.length})
                                        </span>
                                        {loadingProcessos && <Loader2 size={12} className="animate-spin text-amber-600" />}
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        {processosExistentes.length === 0 && !loadingProcessos ? (
                                            <div className="p-3 text-center text-[11px] text-amber-600">Nenhum processo cadastrado para este produto.</div>
                                        ) : (
                                            <table className="w-full text-[10px]">
                                                <thead className="sticky top-0 bg-amber-100 text-amber-800 text-[9px] uppercase">
                                                    <tr>
                                                        <th className="p-1 px-2 font-bold text-center w-8">Seq.</th>
                                                        <th className="p-1 px-2 font-bold">Processo</th>
                                                        <th className="p-1 px-2 font-bold text-center">Tempo(min)</th>
                                                        <th className="p-1 px-2 font-bold text-center w-8">Ativo</th>
                                                        <th className="p-1 px-2 font-bold">Observação</th>
                                                        <th className="p-1 px-2 font-bold">Criação</th>
                                                        <th className="p-1 px-2 font-bold">Usuário</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-amber-100">
                                                    {processosExistentes.map((p, i) => (
                                                        <tr key={i} className="hover:bg-amber-50">
                                                            <td className="p-1 px-2 text-center">
                                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-[9px] font-bold">{p.SequenciaExecucao}</span>
                                                            </td>
                                                            <td className="p-1 px-2 font-semibold text-[#32423D]">{p.NomeProcesso}</td>
                                                            <td className="p-1 px-2 text-center">{p.TempoPadraoMin ?? '—'}</td>
                                                            <td className="p-1 px-2 text-center">
                                                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${p.Ativo === 'A' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                    {p.Ativo === 'A' ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </td>
                                                            <td className="p-1 px-2 text-gray-500 truncate max-w-[80px]" title={p.Observacao}>{p.Observacao || '—'}</td>
                                                            <td className="p-1 px-2 text-gray-400">{p.DataCriacao ? (() => { const d = new Date(p.DataCriacao); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })() : '—'}</td>
                                                            <td className="p-1 px-2 text-gray-500">{p.UsuarioCriacao}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <ArrowRight size={48} className="text-gray-300" strokeWidth={1} />
                            <p className="text-sm font-medium">Selecione um desenho ou uma peça manufaturada nas listas acima.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
