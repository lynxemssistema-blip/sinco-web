import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAlert } from '../../contexts/AlertContext';

interface PlanilhaInfo {
    IdPlanilha: number;
    NomeArquivo: string;
    NomeProjeto: string;
    NomeTag: string;
    DataImportacao: string;
    Revisao: number;
}

interface BlockSetData {
    IdDadosBlockSet: number;
    Cubicle: string;
    Cubicle_type: string;
    FU: string;
    Info: string;
    Part_reference: string;
    Part_description: string;
    Part_total_qty: number;
    Mass_per_part_kg: number;
}

const BlockSet: React.FC = () => {
    const [searchParams] = useSearchParams();
    const idPlanilha = searchParams.get('id');
    const { showAlert } = useAlert();
    const [planilha, setPlanilha] = useState<PlanilhaInfo | null>(null);
    const [dados, setDados] = useState<BlockSetData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!idPlanilha) {
            showAlert('error', 'Erro', 'ID da Planilha não fornecido.');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await fetch(`/api/blockset/data/${idPlanilha}`);
                const data = await response.json();
                if (data.success) {
                    setPlanilha(data.planilha);
                    setDados(data.dados);
                } else {
                    showAlert('error', 'Erro', data.message || 'Erro ao carregar dados.');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                showAlert('error', 'Erro', 'Erro de conexão ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idPlanilha]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0B1120]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!planilha) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1120] text-white p-6">
                <h1 className="text-3xl font-bold mb-4">Nenhum Dado Encontrado</h1>
                <p className="text-gray-400">A planilha solicitada não existe ou não pôde ser carregada.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-200 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Card */}
                <div className="bg-[#111827] rounded-xl border border-gray-800 p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <span className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </span>
                        Visualização de Planilha BlockSet
                    </h1>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Projeto / Tag</p>
                            <p className="font-medium text-white">{planilha.NomeProjeto} / {planilha.NomeTag}</p>
                        </div>
                        <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Arquivo Original</p>
                            <p className="font-medium text-white truncate" title={planilha.NomeArquivo}>{planilha.NomeArquivo}</p>
                        </div>
                        <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Data de Importação</p>
                            <p className="font-medium text-white">{new Date(planilha.DataImportacao).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-[#1F2937] p-4 rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-400 mb-1">Revisão</p>
                            <p className="font-medium text-blue-400">Rev {planilha.Revisao}</p>
                        </div>
                    </div>
                </div>

                {/* Table Data */}
                <div className="bg-[#111827] rounded-xl border border-gray-800 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#1F2937] border-b border-gray-700">
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Cubicle</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Type</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">FU</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Referência</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Descrição</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Qtd</th>
                                    <th className="py-4 px-6 text-xs uppercase tracking-wider font-semibold text-gray-300">Massa (kg)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {dados.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-400">
                                            Nenhum dado importado nesta planilha.
                                        </td>
                                    </tr>
                                ) : (
                                    dados.map((row, idx) => (
                                        <tr key={row.IdDadosBlockSet} className={`hover:bg-[#1F2937]/50 transition-colors ${idx % 2 === 0 ? 'bg-[#111827]' : 'bg-[#151E2D]'}`}>
                                            <td className="py-3 px-6 whitespace-nowrap text-sm">{row.Cubicle || '-'}</td>
                                            <td className="py-3 px-6 whitespace-nowrap text-sm text-gray-400">{row.Cubicle_type || '-'}</td>
                                            <td className="py-3 px-6 whitespace-nowrap text-sm font-medium text-cyan-400">{row.FU || '-'}</td>
                                            <td className="py-3 px-6 text-sm font-mono text-blue-300">{row.Part_reference || '-'}</td>
                                            <td className="py-3 px-6 text-sm">{row.Part_description || '-'}</td>
                                            <td className="py-3 px-6 whitespace-nowrap text-sm font-semibold">{row.Part_total_qty || 0}</td>
                                            <td className="py-3 px-6 whitespace-nowrap text-sm text-gray-400">{row.Mass_per_part_kg || 0}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-gray-800 bg-[#151E2D] flex justify-between items-center">
                        <span className="text-sm text-gray-400">Total de itens processados: <strong className="text-white">{dados.length}</strong></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlockSet;
