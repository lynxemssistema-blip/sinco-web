import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Package, Layers, Plus, Trash2, ArrowRight } from 'lucide-react';

const API_BASE = '/api/peca-manufaturada';

interface MontaPecaManufaturadaModalProps {
    isOpen: boolean;
    onClose: () => void;
    usuario?: string;
}

export default function MontaPecaManufaturadaModal({ isOpen, onClose, usuario = 'Sistema' }: MontaPecaManufaturadaModalProps) {
    const [desenhos, setDesenhos] = useState<any[]>([]);
    const [composicao, setComposicao] = useState<any[]>([]);
    const [materiais, setMateriais] = useState<any[]>([]);
    
    const [selectedDesenho, setSelectedDesenho] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'composicao' | 'materiais'>('composicao');

    const [pesqDesenho, setPesqDesenho] = useState('');
    const [pesqMaterial, setPesqMaterial] = useState('');

    const [loadingDesenhos, setLoadingDesenhos] = useState(false);
    const [loadingComposicao, setLoadingComposicao] = useState(false);
    const [loadingMateriais, setLoadingMateriais] = useState(false);

    // Fetch Desenhos
    const fetchDesenhos = async () => {
        setLoadingDesenhos(true);
        try {
            const url = pesqDesenho ? `${API_BASE}/desenhos?pesq=${encodeURIComponent(pesqDesenho)}` : `${API_BASE}/desenhos`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setDesenhos(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDesenhos(false);
        }
    };

    // Fetch Composicao
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

    // Fetch Materiais
    const fetchMateriais = async () => {
        setLoadingMateriais(true);
        try {
            const url = pesqMaterial ? `${API_BASE}/materiais?pesq=${encodeURIComponent(pesqMaterial)}` : `${API_BASE}/materiais`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setMateriais(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMateriais(false);
        }
    };

    // Initial loads
    useEffect(() => {
        if (isOpen) {
            fetchDesenhos();
            fetchMateriais();
        }
    }, [isOpen]);

    // Handle Desenho Selection
    const handleSelectDesenho = (desenho: any) => {
        setSelectedDesenho(desenho);
        setActiveTab('composicao');
        fetchComposicao(desenho.IdMaterial);
    };

    // Add Material to Composicao
    const handleAddMaterial = async (idMaterial: number) => {
        if (!selectedDesenho) return;
        try {
            const res = await fetch(`${API_BASE}/composicao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idMaterialPeca: selectedDesenho.IdMaterial,
                    idMaterial,
                    quantidade: 1, // Fixado conforme solicitação do usuário
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

    // Remove Material from Composicao
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

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#32423D] flex items-center justify-center text-[#E0E800]">
                                <Layers size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#32423D]">Monta Peça Manufaturada</h2>
                                <p className="text-xs text-gray-500">Composição e Receita de Peças</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Main Content (70/30 Split roughly) */}
                    <div className="flex-1 flex min-h-0">
                        {/* LEFT PANEL: Desenhos */}
                        <div className="w-1/3 min-w-[300px] border-r border-gray-200 bg-white flex flex-col h-full">
                            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                                    <Package size={16} /> Peças Manufaturadas (Desenhos)
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Buscar peça..."
                                        value={pesqDesenho}
                                        onChange={(e) => setPesqDesenho(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchDesenhos()}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D]"
                                    />
                                    <button onClick={fetchDesenhos} className="p-2 bg-[#32423D] text-white rounded-lg hover:bg-[#25322e]">
                                        <Search size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {loadingDesenhos ? (
                                    <div className="flex justify-center p-8 text-gray-400"><Loader2 className="animate-spin" /></div>
                                ) : desenhos.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-400">Nenhum desenho encontrado.</div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-gray-100 text-gray-600 shadow-sm text-xs uppercase">
                                            <tr>
                                                <th className="p-2 font-bold">Cód. Material</th>
                                                <th className="p-2 font-bold">Descrição</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {desenhos.map(d => (
                                                <tr 
                                                    key={d.IdMaterial} 
                                                    onClick={() => handleSelectDesenho(d)}
                                                    className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedDesenho?.IdMaterial === d.IdMaterial ? 'bg-[#E0E800]/10 border-l-4 border-[#32423D]' : 'border-l-4 border-transparent'}`}
                                                >
                                                    <td className="p-2 font-mono text-[#32423D] font-bold">{d.CodMatFabricante}</td>
                                                    <td className="p-2 text-gray-600 truncate max-w-[150px]" title={d.DescResumo}>{d.DescResumo}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Composition & Materials */}
                        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
                            {selectedDesenho ? (
                                <>
                                    {/* Header for selected item */}
                                    <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Peça Selecionada</div>
                                            <div className="text-xl font-bold text-[#32423D]">{selectedDesenho.CodMatFabricante}</div>
                                            <div className="text-sm text-gray-600">{selectedDesenho.DescResumo}</div>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex bg-white border-b border-gray-200 shrink-0 px-4 pt-2">
                                        <button 
                                            onClick={() => setActiveTab('composicao')}
                                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'composicao' ? 'border-[#32423D] text-[#32423D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Composição Atual
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab('materiais')}
                                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'materiais' ? 'border-[#32423D] text-[#32423D]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Catálogo de Insumos (Adicionar)
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-hidden relative">
                                        
                                        {/* COMPOSIÇÃO TAB */}
                                        {activeTab === 'composicao' && (
                                            <div className="absolute inset-0 overflow-auto bg-white p-4">
                                                {loadingComposicao ? (
                                                    <div className="flex justify-center p-8 text-gray-400"><Loader2 className="animate-spin" /></div>
                                                ) : composicao.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                                        <Layers size={48} strokeWidth={1} />
                                                        <p>Nenhum insumo associado a esta peça.</p>
                                                        <button 
                                                            onClick={() => setActiveTab('materiais')}
                                                            className="flex items-center gap-2 px-4 py-2 bg-[#32423D] text-white rounded-lg text-sm font-bold hover:bg-[#25322e]"
                                                        >
                                                            <Plus size={16} /> Adicionar Insumo
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-left text-sm">
                                                            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                                                                <tr>
                                                                    <th className="p-3 font-bold">Código Insumo</th>
                                                                    <th className="p-3 font-bold">Descrição</th>
                                                                    <th className="p-3 font-bold text-center">Estoque</th>
                                                                    <th className="p-3 font-bold text-center">Qtde (Receita)</th>
                                                                    <th className="p-3 font-bold text-right">Ação</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {composicao.map(c => (
                                                                    <tr key={c.IdMontaPeca} className="hover:bg-gray-50">
                                                                        <td className="p-3 font-mono font-bold">{c.CodMatFabricante}</td>
                                                                        <td className="p-3 text-gray-600">{c.DescDetal}</td>
                                                                        <td className="p-3 text-center">{c.txtItemEstoque || '-'}</td>
                                                                        <td className="p-3 text-center font-bold text-[#32423D]">{c.PecaQtde || 1}</td>
                                                                        <td className="p-3 text-right">
                                                                            <button 
                                                                                onClick={() => handleRemoveMaterial(c.IdMontaPeca)}
                                                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                                                title="Remover da composição"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MATERIAIS TAB */}
                                        {activeTab === 'materiais' && (
                                            <div className="absolute inset-0 flex flex-col bg-white">
                                                <div className="p-3 border-b border-gray-100 flex gap-2 items-center bg-gray-50/50">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por código, descrição ou RP..."
                                                        value={pesqMaterial}
                                                        onChange={(e) => setPesqMaterial(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && fetchMateriais()}
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D]"
                                                    />
                                                    <button onClick={fetchMateriais} className="p-2 bg-[#32423D] text-white rounded-lg hover:bg-[#25322e]">
                                                        <Search size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                                    {loadingMateriais ? (
                                                        <div className="flex justify-center p-8 text-gray-400"><Loader2 className="animate-spin" /></div>
                                                    ) : (
                                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0">
                                                                    <tr>
                                                                        <th className="p-3 font-bold w-12 text-center">Ação</th>
                                                                        <th className="p-3 font-bold">Código</th>
                                                                        <th className="p-3 font-bold">Descrição</th>
                                                                        <th className="p-3 font-bold">Família</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {materiais.map(m => (
                                                                        <tr key={m.IdMaterial} className="hover:bg-gray-50">
                                                                            <td className="p-2 text-center">
                                                                                <button 
                                                                                    onClick={() => handleAddMaterial(m.IdMaterial)}
                                                                                    className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                                                                    title="Adicionar à Composição"
                                                                                >
                                                                                    <Plus size={16} />
                                                                                </button>
                                                                            </td>
                                                                            <td className="p-3 font-mono text-[#32423D] font-bold">{m.CodMatFabricante}</td>
                                                                            <td className="p-3 text-gray-600 truncate max-w-[300px]" title={m.DescDetal}>{m.DescDetal}</td>
                                                                            <td className="p-3 text-gray-500 text-xs">{m.Familia}</td>
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
                                    <ArrowRight size={48} className="text-gray-200" />
                                    <p className="text-lg">Selecione uma peça manufaturada na lista ao lado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
