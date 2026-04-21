import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
    Projeto: string;
    Tag: string;
}

export default function ApontamentosParciaisPage() {
    const { user } = useAuth();
    const [parciais, setParciais] = useState<ParcialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletandoId, setDeletandoId] = useState<number | null>(null);

    const fetchParciais = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/apontamentos-parciais`);
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
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                alert('Apontamento excluído com sucesso.');
                fetchParciais();
            } else {
                alert(data.message || 'Erro ao excluir apontamento.');
            }
        } catch (err) {
            console.error(err);
            alert('Falha na comunicação com o servidor.');
        } finally {
            setDeletandoId(null);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return dateString.replace('T', ' ').substring(0, 16);
    };

    const filteredList = parciais.filter(p => 
        String(p.IdOrdemServico).includes(searchTerm) ||
        String(p.IdPlanodecorte || '').includes(searchTerm) ||
        (p.CodMatFabricante || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.Projeto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.Processo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6">
            <div className="flex items-center justify-between mb-6 shrink-0 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-[#567469] tracking-tight">Apontamentos Parciais</h1>
                        <p className="text-sm text-gray-500 font-medium">Controle de peças apontadas parcialmente</p>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <input 
                        type="text"
                        placeholder="Buscar OS, Peça, Projeto..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button onClick={fetchParciais} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-sm transition-colors">
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
                                <th className="px-4 py-3 font-bold w-28 border-b border-[#4d665d]">Responsável</th>
                                <th className="px-4 py-3 font-bold w-24 border-b border-[#4d665d] text-center">O.S.</th>
                                <th className="px-4 py-3 font-bold w-32 border-b border-[#4d665d] text-center">Setor</th>
                                <th className="px-4 py-3 font-bold border-b border-[#4d665d]">Peça / Projeto / Tag</th>
                                <th className="px-4 py-3 font-bold w-24 text-center border-b border-[#4d665d]">Qtde Parcial</th>
                                <th className="px-4 py-3 font-bold w-24 text-center border-b border-[#4d665d]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={24} className="animate-spin text-amber-500" />
                                            Carregando histórico...
                                        </div>
                                    </td>
                                </tr>
                            )}
                            
                            {!loading && filteredList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-medium bg-gray-50">
                                        Nenhum apontamento parcial registrado.
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredList.map(item => (
                                <tr key={item.IdOrdemServicoItemControle} className="hover:bg-amber-50/50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-gray-600 text-xs">
                                        {formatDate(item.DataCriacao)}
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
                                                {item.Projeto && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded truncate max-w-[100px]">{item.Projeto}</span>}
                                                {item.Tag && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded truncate max-w-[100px]">{item.Tag}</span>}
                                                {item.IdPlanodecorte && <span className="text-[9px] bg-sky-100 text-sky-700 font-bold px-1 rounded truncate max-w-[80px]">Pl. {item.IdPlanodecorte}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <span className="inline-block min-w-[40px] text-center font-black text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded">
                                            +{item.QtdeProduzida}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {(user?.role === 'admin' || user?.isSuperadmin) ? (
                                            <button 
                                                onClick={() => handleDelete(item.IdOrdemServicoItemControle)}
                                                disabled={deletandoId === item.IdOrdemServicoItemControle}
                                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors border border-transparent hover:border-red-200"
                                                title="Estornar Apontamento"
                                            >
                                                {deletandoId === item.IdOrdemServicoItemControle ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        ) : (
                                            <span className="text-gray-300 text-[10px] uppercase block leading-tight px-2">Sem permissão</span>
                                        )}
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
