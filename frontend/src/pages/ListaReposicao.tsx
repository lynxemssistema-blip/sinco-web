import { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, XCircle, Trash2, Box, FileText, X, Target } from 'lucide-react';

const API_BASE = '/api';

interface ReposicaoItem {
    IdOrdemServicoItem: number;
    IdOrdemServico: string;
    IdMaterial: string | number;
    Projeto: string;
    DescEmpresa: string;
    Tag: string;
    CodMatFabricante: string;
    DescResumo: string;
    DescDetal: string;
    Espessura: string;
    MaterialSW: string;
    EnderecoArquivo: string;
    EnderecoArquivoItemOrdemServico: string;
    CriadoPor: string;
    DataCriacao: string;
    QtdeTotal: number;
    SetorReposicao: string;
    IdOrdemservicoReposicao: number;
    IdOrdemServicoItemReposicao: number;
    IdPendenciaReposicao: number;
    Reposicao: string;
    cortetotalexecutado: number;
    cortetotalexecutar: number;
    txtcorte: string;
    txtdobra: string;
    txtsolda: string;
    txtpintura: string;
    txtmontagem: string;
    // Status dos setores (Sttxt)
    sttxtCorte: string;
    sttxtDobra: string;
    sttxtSolda: string;
    sttxtPintura: string;
    sttxtMontagem: string;
    sttxtMEDICAO: string;
    sttxtISOMETRICO: string;
    sttxtENGENHARIA: string;
    sttxtACABAMENTO: string;
    sttxtAPROVACAO: string;
    [key: string]: any;
}



export default function ListaReposicaoPage() {
    const [items, setItems] = useState<ReposicaoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [filProjeto, setFilProjeto] = useState('');
    const [filTag, setFilTag] = useState('');
    const [filEspessura, setFilEspessura] = useState('');
    const [filDescResumo, setFilDescResumo] = useState('');
    const [filDescDetal, setFilDescDetal] = useState('');
    const [filCodMat, setFilCodMat] = useState('');
    
    // Novos campos de filtro solicitados
    const [filIdOS, setFilIdOS] = useState('');
    const [filIdItem, setFilIdItem] = useState('');
    const [filSetorReposicao, setFilSetorReposicao] = useState('');

    // Filtro de Status
    const [exibirConcluidos, setExibirConcluidos] = useState(false);

    // Linha selecionada para painel Solicitante
    const [selectedItem, setSelectedItem] = useState<ReposicaoItem | null>(null);

    // Modal de Apontamento
    const [apontamentoModalOpen, setApontamentoModalOpen] = useState(false);
    const [itemParaApontar, setItemParaApontar] = useState<ReposicaoItem | null>(null);
    const [quantidadeApontada, setQuantidadeApontada] = useState<number | ''>('');
    const [apontando, setApontando] = useState(false);

    const hasFilters = filProjeto || filTag || filEspessura || filDescResumo || filDescDetal || filCodMat || filIdOS || filIdItem || filSetorReposicao;

    const fetchItens = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/reposicao/itens`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
            });
            const json = await res.json();
            if (json.success) {
                setItems(json.data);
            } else {
                setError(json.message);
            }
        } catch (err: any) {
            setError('Erro ao carregar peças de reposição.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItens();
    }, []);

    const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.username || u.NomeCompleto || 'Sistema'; } catch { return 'Sistema'; } };

    const getCaminho = (item: ReposicaoItem) =>
        (item.EnderecoArquivo || '').trim() || (item.EnderecoArquivoItemOrdemServico || '').trim();

    const excluirItem = async (item: ReposicaoItem) => {
        const confirmMsg = `Deseja excluir Desenho - ${item.CodMatFabricante} da OS - ${item.IdOrdemServico} Item - ${item.IdOrdemServicoItem}?`;
        if (!confirm(confirmMsg)) return;
        try {
            const usuario = encodeURIComponent(getUser());
            const res = await fetch(`${API_BASE}/reposicao/itens/${item.IdOrdemServicoItem}?usuario=${usuario}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedItem(null);
                fetchItens();
            } else {
                alert(data.message || 'Erro ao excluir item.');
            }
        } catch (err) {
            alert('Erro de comunicação ao excluir.');
        }
    };

    const abrirArquivoLocal = async (caminho: string, tipo: '3d' | 'pdf' | 'dxf') => {
        if (!caminho || caminho.trim() === '') {
            alert("Endereço do arquivo não encontrado para este item.");
            return;
        }
        try {
            // Reutilizando endpoint do Controle Expedição para abrir arquivos no Servidor
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao/abrir-arquivo`);
            url.searchParams.append('caminho', String(caminho));
            url.searchParams.append('tipo', tipo);
            const res = await fetch(url.toString(), {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('sinco_token')}` }
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Erro ao abrir arquivo.');
            }
        } catch (e) {
            alert('Erro de comunicação ao abrir arquivo.');
        }
    };

    const handleAbrirApontamento = (item: ReposicaoItem) => {
        setItemParaApontar(item);
        setQuantidadeApontada('');
        setApontamentoModalOpen(true);
    };

    const confirmarApontamento = async () => {
        if (!itemParaApontar || quantidadeApontada === '' || Number(quantidadeApontada) <= 0) return;
        
        const qtdeTotal = Number(itemParaApontar.QtdeTotal) || 0;
        const executado = Number(itemParaApontar.cortetotalexecutado) || 0;
        const limite = qtdeTotal - executado;

        if (Number(quantidadeApontada) > limite) {
            alert(`A quantidade não pode exceder o limite restante de ${limite}`);
            return;
        }

        if (!confirm(`Confirma o apontamento de ${quantidadeApontada} peças de reposição?`)) return;

        setApontando(true);
        try {
            const res = await fetch(`${API_BASE}/reposicao/apontamento`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('sinco_token')}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    IdOrdemServicoItem: itemParaApontar.IdOrdemServicoItem,
                    quantidadeApontada: Number(quantidadeApontada)
                })
            });
            const data = await res.json();
            if (data.success) {
                setApontamentoModalOpen(false);
                fetchItens(); // Reload da grid para atualizar totais
                if (selectedItem?.IdOrdemServicoItem === itemParaApontar.IdOrdemServicoItem) {
                    setSelectedItem(null); // Reseta a barra lateral pra não bugar infos desatualizadas
                }
            } else {
                alert(data.message || 'Erro ao apontar reposição.');
            }
        } catch (err) {
            alert('Erro de comunicação.');
        } finally {
            setApontando(false);
        }
    };

    const clearFilters = () => {
        setFilProjeto('');
        setFilTag('');
        setFilEspessura('');
        setFilDescResumo('');
        setFilDescDetal('');
        setFilCodMat('');
        setFilIdOS('');
        setFilIdItem('');
        setFilSetorReposicao('');
        setSelectedItem(null);
    };

    const filteredItems = useMemo(() => {
        return items.filter(i => {
            // Filtros de texto blindados com String() e safe fallbacks
            if (filProjeto && !String(i.Projeto || '').toLowerCase().includes(filProjeto.toLowerCase())) return false;
            if (filTag && !String(i.Tag || '').toLowerCase().includes(filTag.toLowerCase())) return false;
            if (filEspessura && !String(i.Espessura || '').toLowerCase().includes(filEspessura.toLowerCase())) return false;
            if (filDescResumo && !String(i.DescResumo || '').toLowerCase().includes(filDescResumo.toLowerCase())) return false;
            if (filDescDetal && !String(i.DescDetal || '').toLowerCase().includes(filDescDetal.toLowerCase())) return false;
            if (filCodMat && !String(i.CodMatFabricante || '').toLowerCase().includes(filCodMat.toLowerCase())) return false;
            
            if (filIdOS && !String(i.IdOrdemServico || '').toLowerCase().includes(filIdOS.toLowerCase())) return false;
            if (filIdItem && !String(i.IdOrdemServicoItem || '').toLowerCase().includes(filIdItem.toLowerCase())) return false;
            if (filSetorReposicao && !String(i.SetorReposicao || '').toLowerCase().includes(filSetorReposicao.toLowerCase())) return false;

            // Filtro de Status fixado em sttxtCorte, conforme solicitado pelo usuário
            const statusSetor = i.sttxtCorte;

            // Se NÃO exibe concluídos, então Oculta os concluídos ('C')
            if (!exibirConcluidos) {
                if (statusSetor === 'C') return false; 
            }
            // Se exibirConcluidos === true, traz tudo

            return true;
        });
    }, [items, filProjeto, filTag, filEspessura, filDescResumo, filDescDetal, filCodMat, filIdOS, filIdItem, filSetorReposicao, exibirConcluidos]);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-[#fafbfc] animate-in fade-in zoom-in-95 duration-300 p-4 relative">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-4 shrink-0">
                <Box className="text-orange-500" size={28} />
                Lista Peças de Reposição
                <span className="text-xs ml-4 px-2 py-1 bg-slate-200 text-slate-600 rounded-lg">Items DB: {items.length} | Filtrados: {filteredItems.length}</span>
            </h1>

            {/* Header Filtros */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4 shrink-0 shadow-sm flex flex-col gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2">
                    <input type="text" placeholder="Id. OS" value={filIdOS} onChange={e => setFilIdOS(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Id. Item" value={filIdItem} onChange={e => setFilIdItem(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Projeto" value={filProjeto} onChange={e => setFilProjeto(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Tag" value={filTag} onChange={e => setFilTag(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Espessura" value={filEspessura} onChange={e => setFilEspessura(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Setor Reposição" value={filSetorReposicao} onChange={e => setFilSetorReposicao(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Desc. Resumo" value={filDescResumo} onChange={e => setFilDescResumo(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Desc. Detalhe" value={filDescDetal} onChange={e => setFilDescDetal(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                    <input type="text" placeholder="Cód. Mat. Fabr." value={filCodMat} onChange={e => setFilCodMat(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-orange-500 bg-slate-50" />
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={exibirConcluidos} onChange={e => setExibirConcluidos(e.target.checked)} className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" />
                            Exibir Registros Concluídos
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasFilters && (
                            <button onClick={clearFilters} className="text-xs font-bold flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors">
                                <XCircle size={14} /> Limpar Filtros
                            </button>
                        )}
                        <button onClick={fetchItens} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-colors">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            Pesquisar
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Principal Pós Filtro (Grid vs Detalhes) */}
            <div className="flex-1 flex gap-4 min-h-0 relative overflow-hidden">
                
                {/* Tabela Esquerda */}
                <div className={`flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm transition-all duration-300 ${selectedItem ? 'lg:w-[65%]' : 'w-full'}`}>
                    {error && <div className="bg-red-50 text-red-700 p-3 text-xs font-bold border-b border-red-100">{error}</div>}
                    <div className="table-container">
                        <table className="w-full text-left text-[11px] whitespace-nowrap">
                            <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                                <tr>
                                    <th className="px-3 py-2">Situação (Sttxt)</th>
                                    <th className="px-3 py-2">Id. OS</th>
                                    <th className="px-3 py-2">Id. Item</th>
                                    <th className="px-3 py-2">Desc. Empresa</th>
                                    <th className="px-3 py-2">Projeto</th>
                                    <th className="px-3 py-2">Tag</th>
                                    <th className="px-3 py-2 text-center">Qtde Total</th>
                                    <th className="px-3 py-2">Espessura</th>
                                    <th className="px-3 py-2">Material SW</th>
                                    <th className="px-3 py-2">Cód. Mat. Fabr.</th>
                                    <th className="px-3 py-2">Desc. Resumo</th>
                                    <th className="px-3 py-2">Corte Total Ex.</th>
                                    <th className="px-3 py-2">Corte Tot. Executar</th>
                                    <th className="px-3 py-2 text-center w-32">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={14} className="px-4 py-8 text-center text-slate-400 font-medium">
                                            Nenhuma peça de reposição localizada para os filtros atuantes.
                                        </td>
                                    </tr>
                                )}
                                {filteredItems.map(item => {
                                    const sttxt = item.sttxtCorte;
                                    return (
                                        <tr 
                                            key={item.IdOrdemServicoItem} 
                                            onClick={() => setSelectedItem(item)}
                                            className={`cursor-pointer transition-colors ${selectedItem?.IdOrdemServicoItem === item.IdOrdemServicoItem ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-3 py-2">
                                                {sttxt === 'C' ? <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">CONCLUÍDO</span> : <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">PENDENTE</span>}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.IdOrdemServico}</td>
                                            <td className="px-3 py-2 font-mono text-slate-600">{item.IdOrdemServicoItem}</td>
                                            <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate" title={item.DescEmpresa}>{item.DescEmpresa}</td>
                                            <td className="px-3 py-2 font-bold text-slate-700">{item.Projeto}</td>
                                            <td className="px-3 py-2 font-bold text-blue-700">{item.Tag}</td>
                                            <td className="px-3 py-2 text-center font-bold text-slate-800">{item.QtdeTotal}</td>
                                            <td className="px-3 py-2 text-slate-600">{item.Espessura}</td>
                                            <td className="px-3 py-2 text-slate-600">{item.MaterialSW}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500">{item.CodMatFabricante}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]" title={item.DescResumo}>{item.DescResumo}</td>
                                            <td className="px-3 py-2 font-bold text-green-700">{item.cortetotalexecutado ?? '-'}</td>
                                            <td className="px-3 py-2 font-bold text-blue-700">{item.cortetotalexecutar ?? '-'}</td>
                                            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* 1 - Abrir Desenho 3D */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), '3d')}
                                                        title="1 - Abrir Desenho 3D"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-colors border border-blue-200 hover:border-blue-600 shadow-sm"
                                                    >
                                                        <Box size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">3D</span>
                                                    </button>
                                                    {/* 2 - Abrir Desenho PDF */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), 'pdf')}
                                                        title="2 - Abrir Desenho PDF"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors border border-red-200 hover:border-red-600 shadow-sm"
                                                    >
                                                        <FileText size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">PDF</span>
                                                    </button>
                                                    {/* 3 - Abrir Desenho DXF */}
                                                    <button
                                                        onClick={() => abrirArquivoLocal(getCaminho(item), 'dxf')}
                                                        title="3 - Abrir Desenho DXF"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white rounded transition-colors border border-cyan-200 hover:border-cyan-600 shadow-sm"
                                                    >
                                                        <span className="font-mono text-[9px] font-bold leading-none">DXF</span>
                                                        <span className="text-[8px] leading-none mt-0.5 opacity-60">CAD</span>
                                                    </button>
                                                    {/* Apontar (condicional) */}
                                                    {item.sttxtCorte !== 'C' && Number(item.cortetotalexecutar) > 0 && (
                                                        <button
                                                            onClick={() => handleAbrirApontamento(item)}
                                                            title="Apontar Reposição"
                                                            className="flex flex-col items-center justify-center p-1 w-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition-colors border border-emerald-200 hover:border-emerald-600 shadow-sm"
                                                        >
                                                            <Target size={12} />
                                                            <span className="text-[8px] font-bold leading-none mt-0.5">Apt</span>
                                                        </button>
                                                    )}
                                                    {/* 4 - Excluir linha */}
                                                    <button
                                                        onClick={() => excluirItem(item)}
                                                        title="4 - Excluir linha selecionada"
                                                        className="flex flex-col items-center justify-center p-1 w-9 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded transition-colors border border-rose-200 hover:border-rose-600 shadow-sm"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span className="text-[8px] font-bold leading-none mt-0.5">Del</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Painel Solicitante Expandível (Direita) */}
                {selectedItem && (
                    <div className="w-full lg:w-[35%] bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col p-4 animate-in slide-in-from-right-4 duration-300 absolute lg:relative inset-y-0 right-0 z-30 lg:z-10">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-lg">
                                    <Box size={20} className="text-orange-500"/>
                                    Dados do Solicitante
                                </h3>
                                <p className="text-xs text-slate-500 flex gap-2 font-mono mt-1">OSI: <strong className="text-slate-700">{selectedItem.IdOrdemServicoItem}</strong></p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"><X size={18} /></button>
                        </div>

                        <div className="table-container flex flex-col gap-4">
                            {/* Grid de Atributos do Solicitante */}
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solicitado Por</label>
                                    <div className="text-xs font-bold text-slate-800 truncate" title={selectedItem.CriadoPor}>{selectedItem.CriadoPor || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Solicitação</label>
                                    <div className="text-xs font-bold text-slate-800">{selectedItem.DataCriacao || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Setor Solicitante</label>
                                    <div className="text-xs font-bold text-slate-800 truncate" title={selectedItem.SetorReposicao}>{selectedItem.SetorReposicao || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RNC Número</label>
                                    <div className="text-xs font-mono font-bold text-purple-700 bg-purple-100 px-1 inline-block rounded">{selectedItem.IdPendenciaReposicao || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID Material</label>
                                    <div className="text-xs font-mono text-slate-600">{selectedItem.IdMaterial || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OS Reposição</label>
                                    <div className="text-xs font-mono text-slate-600">{selectedItem.IdOrdemservicoReposicao || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item OS Repos.</label>
                                    <div className="text-xs font-mono text-slate-600">{selectedItem.IdOrdemServicoItemReposicao || '-'}</div>
                                </div>
                            </div>

                            {/* Informações Extensas (Setores & Descrições) */}
                            <div className="grid grid-cols-5 gap-2 border border-slate-200 bg-white rounded p-2 text-center mt-2">
                                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">txtCorte</span><span className="text-xs font-bold">{selectedItem.txtcorte || '-'}</span></div>
                                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">txtDobra</span><span className="text-xs font-bold">{selectedItem.txtdobra || '-'}</span></div>
                                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">txtSolda</span><span className="text-xs font-bold">{selectedItem.txtsolda || '-'}</span></div>
                                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">txtPintura</span><span className="text-xs font-bold">{selectedItem.txtpintura || '-'}</span></div>
                                <div className="flex flex-col"><span className="text-[9px] text-slate-400 font-bold uppercase">txtMontagem</span><span className="text-xs font-bold">{selectedItem.txtmontagem || '-'}</span></div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 block">Desc. Detalhe</label>
                                <div className="text-xs font-serif italic text-slate-700 bg-slate-50 p-2 rounded break-words border border-slate-100">
                                    {selectedItem.DescDetal || 'Nenhum detalhe.'}
                                </div>
                            </div>

                            {/* Informações do Arquivo */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Caminho Arquivo (usado nos botões)</label>
                                {getCaminho(selectedItem) ? (
                                    <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 p-2 rounded break-all border border-emerald-200">
                                        ✓ {getCaminho(selectedItem)}
                                    </div>
                                ) : (
                                    <div className="text-[10px] font-mono text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                        ✗ Nenhum caminho de arquivo atribuído a este item.
                                    </div>
                                )}
                                {selectedItem.EnderecoArquivo && selectedItem.EnderecoArquivoItemOrdemServico && selectedItem.EnderecoArquivo !== selectedItem.EnderecoArquivoItemOrdemServico && (
                                    <div className="text-[9px] text-slate-400 font-mono bg-slate-50 p-1.5 rounded border border-slate-100 break-all">
                                        Alt: {selectedItem.EnderecoArquivoItemOrdemServico}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Loading Overlay Global */}
            {loading && items.length === 0 && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-orange-600" size={40} />
                </div>
            )}

            {/* Modal de Apontamento de Qtde */}
            {apontamentoModalOpen && itemParaApontar && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200">
                        <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-emerald-50 to-transparent pointer-events-none" />
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 relative z-10">
                                <Target className="text-emerald-500" size={20} />
                                Apontar Reposição
                            </h3>
                            <button onClick={() => setApontamentoModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors relative z-10">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                                <p><strong>OS:</strong> {itemParaApontar.IdOrdemServico} | <strong>Item:</strong> {itemParaApontar.IdOrdemServicoItem}</p>
                                <p className="mt-1">Limite Máximo Restante: <strong className="text-emerald-700 font-mono text-sm">{(Number(itemParaApontar.QtdeTotal) || 0) - (Number(itemParaApontar.cortetotalexecutado) || 0)}</strong></p>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Qtd. Fabricada Inteiramente</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max={(Number(itemParaApontar.QtdeTotal) || 0) - (Number(itemParaApontar.cortetotalexecutado) || 0)}
                                    placeholder="Digite a quantidade..."
                                    value={quantidadeApontada}
                                    onChange={e => setQuantidadeApontada(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full text-sm font-bold p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2">
                            <button 
                                onClick={() => setApontamentoModalOpen(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmarApontamento}
                                disabled={apontando}
                                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {apontando ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
                                Confirmar Baixa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

