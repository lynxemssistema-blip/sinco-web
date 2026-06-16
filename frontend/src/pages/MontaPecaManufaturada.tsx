import React, { useState, useEffect } from 'react';
import { Search, Loader2, Package, Layers, Plus, Trash2, ArrowRight, X, Eraser } from 'lucide-react';

const API_BASE = '/api/peca-manufaturada';

export default function MontaPecaManufaturadaPage({ usuario = 'Sistema' }: { usuario?: string }) {
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
            {/* Header */}
            <div className="flex items-center justify-between p-2 px-4 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#32423D] flex items-center justify-center text-[#E0E800]">
                        <Layers size={16} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[#32423D] leading-tight">Monta Peça Manufaturada</h2>
                        <p className="text-[10px] text-gray-500 leading-tight">Composição e Receita de Peças</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex min-h-0">
                {/* LEFT PANEL: Desenhos */}
                <div className="w-1/3 min-w-[300px] border-r border-gray-200 bg-white flex flex-col h-full">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                            <Package size={16} /> Peças Manufaturadas (Desenhos)
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
                                            onClick={() => handleSelectDesenho(d)}
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

                {/* RIGHT PANEL: Peças Manufaturadas & Composition */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-50 border-l border-gray-200">
                    
                    {/* TOP RIGHT PANEL: Peças Manufaturadas */}
                    <div className="h-1/2 border-b border-gray-200 bg-white flex flex-col">
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                                <Package size={16} /> Peças Manufaturadas
                            </h3>
                            <div className="flex gap-1">
                                <div className="relative w-32">
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
                                <div className="relative w-48">
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

                    {/* BOTTOM RIGHT PANEL: Composition Details */}
                    <div className="h-1/2 flex flex-col relative bg-gray-50">
                    {selectedDesenho ? (
                        <>
                            {/* Header for selected item */}
                            <div className="p-2 px-4 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Peça Selecionada</div>
                                    <div className="text-sm font-bold text-[#32423D] leading-tight">{selectedDesenho.CodMatFabricante}</div>
                                    <div className="text-[11px] text-gray-600 leading-tight">{selectedDesenho.DescResumo}</div>
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
        </div>
    );
}
