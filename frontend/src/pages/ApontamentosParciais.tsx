import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Search, X, Box, FileText, Layers, FileCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const API_BASE = '/api';

interface ParcialItem {
    IdOrdemServicoItemControle: number;
    IdOrdemServicoItem: number;
    IdOrdemServico: number;
    Processo: string;
    QtdeTotal: number;
    QtdeProduzida: number;
    CriadoPor: string;
    DataCriacao: string;
    CodMatFabricante: string;
    IdPlanodecorte?: number;
    EnderecoArquivo?: string;
    EnderecoArquivoItemOrdemServico?: string;
    Projeto: string;
    Tag: string;
}

export default function ApontamentosParciaisPage() {
    const { token, user } = useAuth();
    const { addToast } = useToast();
    
    const [parciais, setParciais] = useState<ParcialItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [fOS, setFOS] = useState('');
    const [fProj, setFProj] = useState('');
    const [fTag, setFTag] = useState('');
    const [fPC, setFPC] = useState('');
    const [dataInicial, setDataInicial] = useState('');
    const [dataFinal, setDataFinal] = useState('');

    const [deletandoId, setDeletandoId] = useState<number | null>(null);

    const fetchParciais = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/apontamentos-parciais`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });
            const data = await res.json();
            if (data.success && data.parciais) {
                setParciais(data.parciais);
            }
        } catch (error) {
            console.error('Erro ao buscar parciais', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParciais();
    }, []);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja estornar este apontamento parcial? A quantidade executada será subtraída do setor!')) return;
        
        setDeletandoId(id);
        try {
            const res = await fetch(`${API_BASE}/apontamentos-parciais/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
            });
            const data = await res.json();
            if (data.success) {
                if (addToast) addToast({ type: 'success', title: 'Sucesso', message: 'Apontamento excluído com sucesso.' });
                else alert('Apontamento excluído com sucesso.');
                fetchParciais();
            } else {
                if (addToast) addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao excluir apontamento.' });
                else alert(data.message || 'Erro ao excluir apontamento.');
            }
        } catch (err) {
            console.error(err);
            if (addToast) addToast({ type: 'error', title: 'Falha', message: 'Falha na comunicação com o servidor.' });
            else alert('Falha na comunicação com o servidor.');
        } finally {
            setDeletandoId(null);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return dateString.replace('T', ' ').substring(0, 16);
    };

    const handleAbrirDesenho = async (it: ParcialItem, tipo: '3D' | 'PDF' | 'DXF' | 'PDF_ITEM') => {
        let path = '';
        switch (tipo) {
            case '3D': path = it.EnderecoArquivo || ''; break;
            case 'PDF': path = it.EnderecoArquivo || ''; break;
            case 'PDF_ITEM': path = it.EnderecoArquivoItemOrdemServico || ''; break;
            case 'DXF': path = it.EnderecoArquivo || ''; break;
        }

        if (!path) {
            if (addToast) addToast({ type: 'warning', title: 'Aviso', message: 'Caminho do arquivo não localizado para este item.' });
            else alert('Caminho do arquivo não localizado para este item.');
            return;
        }

        try {
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/plano-corte/abrir-desenho', {
                method: 'POST',
                headers,
                body: JSON.stringify({ filePath: path, tipo, it })
            });
            const result = await res.json();
            if (!result.success) {
                if (addToast) addToast({ type: 'error', title: 'Erro ao Abrir', message: result.message });
                else alert(result.message);
            } else {
                 if (addToast) addToast({ type: 'success', title: 'Sucesso', message: 'Desenho aberto.' });
            }
        } catch (e: any) {
            if (addToast) addToast({ type: 'error', title: 'Erro', message: 'Falha na rede: ' + e.message });
            else alert('Falha na rede: ' + e.message);
        }
    };

    const limparFiltros = () => {
        setFOS('');
        setFProj('');
        setFTag('');
        setFPC('');
        setDataInicial('');
        setDataFinal('');
    };

    const filteredList = parciais.filter(p => {
        const matchOS = fOS ? String(p.IdOrdemServico).includes(fOS) : true;
        const matchProj = fProj ? (p.Projeto || '').toLowerCase().includes(fProj.toLowerCase()) : true;
        const matchTag = fTag ? (p.Tag || '').toLowerCase().includes(fTag.toLowerCase()) : true;
        const matchPC = fPC ? String(p.IdPlanodecorte || '').includes(fPC) : true;
        
        let matchDataIni = true;
        let matchDataFim = true;
        if (dataInicial || dataFinal) {
            let dataP = '';
            if (p.DataCriacao) {
                // p.DataCriacao vem em formato "DD/MM/YYYY HH:MM" do banco
                const dataPart = String(p.DataCriacao).substring(0, 10);
                if (dataPart.includes('/')) {
                    const parts = dataPart.split('/');
                    dataP = `${parts[2]}-${parts[1]}-${parts[0]}`; // Formata como YYYY-MM-DD
                } else {
                    dataP = dataPart; // Se por acaso ja vier YYYY-MM-DD
                }
            }
            
            if (dataInicial && dataP) {
                matchDataIni = dataP >= dataInicial;
            }
            if (dataFinal && dataP) {
                matchDataFim = dataP <= dataFinal;
            }
        }

        return matchOS && matchProj && matchTag && matchPC && matchDataIni && matchDataFim;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#567469] tracking-tight">Apontamentos Parciais</h1>
                        <p className="text-sm text-gray-500 font-medium">Controle de peças apontadas parcialmente</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 shadow-sm focus-within:border-amber-400">
                        <Search size={14} className="text-gray-400" />
                        <input type="text" placeholder="O.S." value={fOS} onChange={e=>setFOS(e.target.value)} className="w-16 bg-transparent text-xs outline-none font-bold text-gray-700" />
                        <input type="text" placeholder="Projeto" value={fProj} onChange={e=>setFProj(e.target.value)} className="w-24 bg-transparent text-xs outline-none border-l border-gray-200 pl-1.5" />
                        <input type="text" placeholder="Tag" value={fTag} onChange={e=>setFTag(e.target.value)} className="w-20 bg-transparent text-xs outline-none border-l border-gray-200 pl-1.5" />
                        <input type="text" placeholder="Plano Corte" value={fPC} onChange={e=>setFPC(e.target.value)} className="w-24 bg-transparent text-xs outline-none border-l border-gray-200 pl-1.5" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1.5 shadow-sm focus-within:border-amber-400">
                        <input type="date" value={dataInicial} onChange={e=>setDataInicial(e.target.value)} className="w-[105px] bg-transparent text-xs outline-none text-gray-500" title="Data Inicial" />
                        <span className="text-gray-400 text-xs">até</span>
                        <input type="date" value={dataFinal} onChange={e=>setDataFinal(e.target.value)} className="w-[105px] bg-transparent text-xs outline-none border-l border-gray-200 pl-1.5 text-gray-500" title="Data Final" />
                        
                        {(fOS || fProj || fTag || fPC || dataInicial || dataFinal) && (
                            <button onClick={limparFiltros} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors border-l border-gray-200 pl-1.5" title="Limpar Filtros"><X size={14}/></button>
                        )}
                    </div>

                    <button onClick={fetchParciais} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-sm transition-colors text-sm h-full self-stretch flex items-center">
                        Atualizar
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-[#567469] text-white text-xs uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 font-bold w-32 border-b border-[#4d665d]">Data / Hora</th>
                                <th className="px-4 py-3 font-bold w-24 border-b border-[#4d665d] text-center">Plano de Corte</th>
                                <th className="px-4 py-3 font-bold w-28 border-b border-[#4d665d]">Responsável</th>
                                <th className="px-4 py-3 font-bold w-24 border-b border-[#4d665d] text-center">O.S.</th>
                                <th className="px-4 py-3 font-bold w-32 border-b border-[#4d665d] text-center">Setor</th>
                                <th className="px-4 py-3 font-bold border-b border-[#4d665d]">Peça / Projeto / Tag</th>
                                <th className="px-4 py-3 font-bold w-24 text-center border-b border-[#4d665d]">Qtde Parcial</th>
                                <th className="px-4 py-3 font-bold w-40 text-center border-b border-[#4d665d]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={24} className="animate-spin text-amber-500" />
                                            Carregando histórico...
                                        </div>
                                    </td>
                                </tr>
                            )}
                            
                            {!loading && filteredList.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 font-medium bg-gray-50">
                                        Nenhum apontamento parcial registrado que corresponda aos filtros.
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredList.map(item => (
                                <tr key={item.IdOrdemServicoItemControle} className="hover:bg-amber-50/50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-gray-600 text-xs">
                                        {formatDate(item.DataCriacao)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs">
                                        {item.IdPlanodecorte ? (
                                            <span className="bg-sky-100 text-sky-700 font-black px-2 py-1 rounded shadow-sm text-xs border border-sky-200">
                                                Pl. {item.IdPlanodecorte}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 font-bold truncate max-w-[120px]" title={item.CriadoPor}>
                                        {item.CriadoPor}
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs">
                                        <span className="bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded shadow-sm">
                                            OS {item.IdOrdemServico}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="uppercase text-[10px] font-black border border-gray-300 bg-gray-100 px-2 py-1 rounded">
                                            {item.Processo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-[#32423D] text-xs">{(item.CodMatFabricante || '').substring(0,25)}</span>
                                            <div className="flex gap-1 flex-wrap">
                                                {item.Projeto && <span className="text-[9px] bg-purple-100 text-purple-700 font-medium px-1 rounded truncate max-w-[100px]">{item.Projeto}</span>}
                                                {item.Tag && <span className="text-[9px] bg-green-100 text-green-700 font-medium px-1 rounded truncate max-w-[100px]">{item.Tag}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="inline-block min-w-[40px] text-center font-black text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded">
                                            +{item.QtdeProduzida}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleAbrirDesenho(item, '3D')} className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors" title="Abrir 3D (SolidWorks)"><Box size={14}/></button>
                                            <button onClick={() => handleAbrirDesenho(item, 'PDF')} className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors" title="Abrir Desenho PDF"><FileText size={14}/></button>
                                            <button onClick={() => handleAbrirDesenho(item, 'DXF')} className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-colors" title="Abrir Desenho DXF"><Layers size={14}/></button>
                                            <button onClick={() => handleAbrirDesenho(item, 'PDF_ITEM')} className="p-1 hover:bg-amber-100 text-amber-600 rounded transition-colors" title="Abrir PDF do Item"><FileCode size={14}/></button>
                                            
                                            <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                            
                                            {(user?.role === 'admin' || user?.isSuperadmin) ? (
                                                <button 
                                                    onClick={() => handleDelete(item.IdOrdemServicoItemControle)}
                                                    disabled={deletandoId === item.IdOrdemServicoItemControle}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 text-[10px] uppercase font-bold hover:text-red-700 rounded transition-colors border border-transparent hover:border-red-200"
                                                    title="Estornar Apontamento"
                                                >
                                                    {deletandoId === item.IdOrdemServicoItemControle ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 text-[10px] uppercase block px-1">—</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

