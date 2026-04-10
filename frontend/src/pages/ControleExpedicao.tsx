import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, X, ChevronDown, ChevronUp, PackageCheck, Box, FileText, FileCode2, RefreshCw, ArrowLeft } from 'lucide-react';

const API_BASE = '/api';

interface ControleExpItem {
    IdProjeto: number;
    Projeto: string;
    DescEmpresa: string;
    Tag: string;
    DescTag: string;
    codmatfabricante: string;
    DataPrevisao: string;
    QtdeTotal: number;
    PesoUnitario: number;
    MontagemTotalExecutado: number;
    TotalExpedicao: number;
    Comprimento: number;
    Profundidade: number;
    Largura: number;
    descdetal: string;
    RealizadoInicioExpedicao: string;
    RealizadoFinalExpedicao: string;
    IdTag: number;
    Idordemservico: number;
    IdOrdemServicoItem: number;
    Finalizadotag: string;
    FinalizadoProjeto: string;
    OrdemServicoItemFinalizado: string;
    enderecoarquivo: string;
    ProdutoPrincipal: string;

    // Derived properties for UI search matching
    DescResumo?: string; 

    idordemservicoitem?: number;
    projeto?: string;
    QTDETOTAL?: number;
    descempresa?: string;
    descresumo?: string;
}

interface SecItem {
    idordemservicoitemControle: number;
    IdOrdemServicoITem: number;
    IdOrdemServico: number;
    Projeto: string;
    Tag: string;
    ESTATUS_OrdemServico: string;
    CriadoPor: string;
    DataCriacao: string;
    CodMatFabricante: string;
    QtdeTotal: number;
    TotalExpedicao: number;
    DescResumo: string;
    DescDetal: string;

    // Legacy DB mappings
    IDOrdemServicoITEM?: number;
}

export default function ControleExpedicaoPage() {
    const [items, setItems] = useState<ControleExpItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state for Apontar Expedição
    const [apontarItem, setApontarItem] = useState<ControleExpItem | null>(null);
    const [apontarQtde, setApontarQtde] = useState('');
    const [isApontarSubmitting, setIsApontarSubmitting] = useState(false);


    // Filtros
    // Projeto,tag,descrição da tag,empresa,cod. mat . fabricante,descriçao do resumo,descrição detalhe,data previsão
    const [filProjeto, setFilProjeto] = useState('');
    const [filTag, setFilTag] = useState('');
    const [filDescTag, setFilDescTag] = useState('');
    const [filEmpresa, setFilEmpresa] = useState('');
    const [filCodMat, setFilCodMat] = useState('');
    const [filDescResumo, setFilDescResumo] = useState('');
    const [filDataPrevisaoInicio, setFilDataPrevisaoInicio] = useState('');
    const [filDataPrevisaoFim, setFilDataPrevisaoFim] = useState('');
    const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
    const [fromGlobal, setFromGlobal] = useState(false);
    const [visibleSetores, setVisibleSetores] = useState<string[]>(['corte', 'dobra', 'solda', 'pintura', 'montagem']);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openFrom = params.get('from');
        if (openFrom === 'visao-geral-pendencias') {
            setFromGlobal(true);
        }
        const openTag = params.get('tag');
        const openProj = params.get('projeto');
        if (openTag) setFilTag(openTag);
        if (openProj) setFilProjeto(openProj);

        // Fetch config
        fetch(`${API_BASE}/config`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.config.ProcessosVisiveis) {
                    try {
                        setVisibleSetores(JSON.parse(data.config.ProcessosVisiveis));
                    } catch (e) { /* fallback */ }
                }
            })
            .catch(() => {});
    }, []);

    // Expanded row memory
    const [expandedRow, setExpandedRow] = useState<string | null>(null); // e.g. `${idOS}_${idOSItem}`
    const [secItems, setSecItems] = useState<SecItem[]>([]);
    const [loadingSec, setLoadingSec] = useState(false);

    const hasFilters = filProjeto || filTag || filDescTag || filEmpresa || filCodMat || filDescResumo || filDataPrevisaoInicio || filDataPrevisaoFim;

    const fetchControle = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao`);
            if (filProjeto) url.searchParams.append('projeto', filProjeto);
            if (filTag) url.searchParams.append('tag', filTag);
            if (filDescTag) url.searchParams.append('descTag', filDescTag);
            if (filEmpresa) url.searchParams.append('empresa', filEmpresa);
            if (filCodMat) url.searchParams.append('codmat', filCodMat);
            if (filDescResumo) url.searchParams.append('descResumo', filDescResumo);
            if (filDataPrevisaoInicio) url.searchParams.append('dataPrevisaoInicio', filDataPrevisaoInicio);
            if (filDataPrevisaoFim) url.searchParams.append('dataPrevisaoFim', filDataPrevisaoFim);
            if (mostrarConcluidos) url.searchParams.append('concluidos', '1');

            const res = await fetch(url.toString());
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
            } else {
                setError(data.message || 'Erro ao carregar dados');
            }
        } catch (err: any) {
            setError(err.message || 'Erro de rede');
        } finally {
            setLoading(false);
        }
    }, [filProjeto, filTag, filDescTag, filEmpresa, filCodMat, filDescResumo, filDataPrevisaoInicio, filDataPrevisaoFim, mostrarConcluidos]);

    useEffect(() => {
        fetchControle();
    }, [fetchControle]);

    const limparFiltros = () => {
        setFilProjeto('');
        setFilTag('');
        setFilDescTag('');
        setFilEmpresa('');
        setFilCodMat('');
        setFilDescResumo('');
        setFilDataPrevisaoInicio('');
        setFilDataPrevisaoFim('');
    };

    const handleExpand = async (item: ControleExpItem) => {
        const key = `${item.Idordemservico}_${item.idordemservicoitem || item.IdOrdemServicoItem}`;
        if (expandedRow === key) {
            setExpandedRow(null);
            setSecItems([]);
            return;
        }

        setExpandedRow(key);
        setLoadingSec(true);
        setSecItems([]);

        try {
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao/ordem-item`);
            url.searchParams.append('idOrdemServico', item.Idordemservico.toString());
            url.searchParams.append('idOrdemServicoItem', (item.idordemservicoitem || item.IdOrdemServicoItem).toString());
            url.searchParams.append('tag', item.Tag);
            url.searchParams.append('projeto', item.projeto || item.Projeto);
            if (item.IdProjeto) url.searchParams.append('IdProjeto', item.IdProjeto.toString());

            const res = await fetch(url.toString());
            const data = await res.json();
            if (data.success) {
                setSecItems(data.data);
            }
        } catch (err) {
            console.error('Erro ao buscar dados secundários', err);
        } finally {
            setLoadingSec(false);
        }
    };

    const openApontarModal = (item: ControleExpItem) => {
        const totalExpedicao = item.TotalExpedicao || 0;
        const qtdeTotal = item.QtdeTotal || item.QTDETOTAL || 0;
        
        const limiteMaximo = qtdeTotal - totalExpedicao;
        
        if (totalExpedicao >= qtdeTotal || limiteMaximo <= 0) {
            alert(`Processo finalizado: O total de expedição (${totalExpedicao}) atingiu a quantidade total do item (${qtdeTotal}).`);
            return;
        }

        setApontarItem(item);
        setApontarQtde('');
    };

    const closeApontarModal = () => {
        setApontarItem(null);
        setApontarQtde('');
    };

    const submitApontar = async () => {
        if (!apontarItem) return;
        
        const qtdeInput = parseFloat(apontarQtde);
        // 3. quantidade entrada deverá ser um numero valido maior que zzeros
        if (isNaN(qtdeInput) || qtdeInput <= 0) {
            alert(`A quantidade precisará ser maior que zero (0).`);
            return;
        }

        const totalExpedicao = apontarItem.TotalExpedicao || 0;
        const qtdeTotal = apontarItem.QtdeTotal || apontarItem.QTDETOTAL || 0;
        const limiteMaximo = qtdeTotal - totalExpedicao;

        // Limite da quantidade 
        if (qtdeInput > limiteMaximo) {
            alert(`Quantidade inválida! A quantidade de entrada (${qtdeInput}) não pode ser maior que o limite permitido (${limiteMaximo}).`);
            return;
        }

        setIsApontarSubmitting(true);
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao/apontar`);
            const payload = {
                idOrdemServicoItem: apontarItem.idordemservicoitem || apontarItem.IdOrdemServicoItem,
                idOrdemServico: apontarItem.Idordemservico,
                idTag: apontarItem.IdTag,
                idProjeto: apontarItem.IdProjeto, // The view has IdProjeto (uppercase 'P')
                qtde: qtdeInput,
                qtdeTotalDaLinha: qtdeTotal
            };

            const res = await fetch(url.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert('Expedição apontada com sucesso!');
                closeApontarModal();
                fetchControle(); // refresh grid
            } else {
                alert(data.message || 'Erro ao apontar expedição.');
            }
        } catch (err: any) {
            alert('Erro ao se comunicar com o servidor.');
        } finally {
            setIsApontarSubmitting(false);
        }
    };

    const abrirArquivoLocal = async (caminho: string, tipo: '3d' | 'pdf') => {
        if (!caminho) {
            alert("Endereço do arquivo não encontrado no sistema ou não atrelado a este item.");
            return;
        }
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao/abrir-arquivo`);
            url.searchParams.append('caminho', String(caminho));
            url.searchParams.append('tipo', tipo);
            const res = await fetch(url.toString());
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Erro ao abrir arquivo.');
            }
        } catch (e) {
            alert('Erro de comunicação ao abrir arquivo.');
        }
    };

    const abrirIsoLocal = async (idTag: number) => {
        if (!idTag) return;
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/controle-expedicao/abrir-iso`);
            url.searchParams.append('idTag', idTag.toString());
            const res = await fetch(url.toString());
            const data = await res.json();
            if (!data.success) {
                alert(data.message || 'Erro ao abrir isométrico.');
            }
        } catch (e) {
            alert('Erro de comunicação ao abrir isométrico.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#fafbfc] animate-in fade-in zoom-in-95 duration-300">
            {/* Cabeçalho de Filtros */}
            <div className="bg-white p-3 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 mb-2 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        {fromGlobal && (
                            <button
                                onClick={() => window.location.href = '/visao-geral-pendencias'}
                                className="flex items-center justify-center p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                title="Voltar para Todas as Pendências"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            <PackageCheck className="text-blue-600" size={16} />
                            Filtros de Pesquisa
                        </h2>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                        <input type="checkbox" checked={mostrarConcluidos} onChange={e => setMostrarConcluidos(e.target.checked)} className="accent-blue-600 w-3 h-3" />
                        Exibir Concluídos
                    </label>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <input type="text" placeholder="Projeto" value={filProjeto} onChange={e => setFilProjeto(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Tag" value={filTag} onChange={e => setFilTag(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Desc. Tag (ex: Pipe Rack)" value={filDescTag} onChange={e => setFilDescTag(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Empresa (Cliente)" value={filEmpresa} onChange={e => setFilEmpresa(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Cód. Mat. Fabricante" value={filCodMat} onChange={e => setFilCodMat(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Desc. Resumo" value={filDescResumo} onChange={e => setFilDescResumo(e.target.value)} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <div className="flex gap-2 items-center lg:col-span-2 bg-white px-2 rounded border border-slate-300">
                        <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Data Previsão:</span>
                        <input title="Data Previsão Inicial" type="date" value={filDataPrevisaoInicio} onChange={e => setFilDataPrevisaoInicio(e.target.value)} className="w-full text-[11px] py-1 bg-transparent focus:outline-none" />
                        <span className="text-[11px] text-slate-500 font-medium">até</span>
                        <input title="Data Previsão Final" type="date" value={filDataPrevisaoFim} onChange={e => setFilDataPrevisaoFim(e.target.value)} className="w-full text-[11px] py-1 bg-transparent focus:outline-none" />
                    </div>

                    <div className="flex items-center justify-end">
                        {hasFilters && (
                            <button onClick={limparFiltros} className="px-3 py-1 flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 transition-colors" title="Limpar Filtros">
                                <X size={14} /> LIMPAR
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid Area */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col min-h-0 shadow-sm relative">
                {error && <div className="bg-red-50 text-red-700 p-3 text-xs font-bold border-b border-red-100">{error}</div>}
                
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                )}

                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                        <thead className="bg-[#f8fafc] text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="px-2 py-1.5 w-8"></th>
                                <th className="px-2 py-1.5">OS</th>
                                <th className="px-2 py-1.5">Item</th>
                                <th className="px-2 py-1.5">Projeto</th>
                                <th className="px-2 py-1.5">Cliente</th>
                                <th className="px-2 py-1.5">Tag</th>
                                <th className="px-2 py-1.5">Data Previsão</th>
                                <th className="px-2 py-1.5">Cód. Mat. Fab.</th>
                                <th className="px-2 py-1.5">Desc. Resumo</th>
                                <th className="px-2 py-1.5">Produto Principal</th>
                                <th className="px-2 py-1.5">Qtde Total</th>
                                {visibleSetores.includes('montagem') && <th className="px-2 py-1.5">Montagem (Exec)</th>}
                                <th className="px-2 py-1.5">Total Expedição</th>
                                <th className="px-2 py-1.5">Peso Unit.</th>
                                <th className="px-2 py-1.5">Comp x Prof x Larg</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={15} className="px-4 py-8 text-center text-slate-400 font-medium">
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                            {items.map(item => {
                                const rowKey = `${item.Idordemservico}_${item.idordemservicoitem || item.IdOrdemServicoItem}`;
                                const isExpanded = expandedRow === rowKey;
                                
                                return (
                                    <React.Fragment key={rowKey}>
                                        <tr 
                                            onClick={() => handleExpand(item)}
                                            className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                        >
                                            <td className="px-2 py-1 text-slate-400">
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </td>
                                            <td className="px-2 py-1 font-mono font-bold text-blue-700">{item.Idordemservico || ''}</td>
                                            <td className="px-2 py-1 font-mono text-slate-600">{item.idordemservicoitem || item.IdOrdemServicoItem || ''}</td>
                                            <td className="px-2 py-1 font-bold text-slate-700">{item.projeto || item.Projeto || ''}</td>
                                            <td className="px-2 py-1 text-slate-600 max-w-[120px] truncate" title={item.DescEmpresa}>{item.DescEmpresa || '-'}</td>
                                            <td className="px-2 py-1">
                                                <div className="font-bold text-blue-700">{item.Tag}</div>
                                                <div className="text-[9px] text-slate-500 max-w-[150px] truncate" title={item.DescTag}>{item.DescTag || ''}</div>
                                            </td>
                                            <td className="px-2 py-1 text-slate-600 font-mono whitespace-nowrap">{item.DataPrevisao || '-'}</td>
                                            <td className="px-2 py-1 font-mono text-slate-600 max-w-[100px] truncate" title={item.codmatfabricante}>{item.codmatfabricante || '-'}</td>
                                            <td className="px-2 py-1 text-[10px] text-slate-600 max-w-[150px] truncate" title={item.descresumo || item.DescResumo || ''}>{item.descresumo || item.DescResumo || '-'}</td>
                                            <td className="px-2 py-1 text-slate-600 truncate max-w-[120px]">{item.ProdutoPrincipal || '-'}</td>
                                            <td className="px-2 py-1 font-bold">{item.QTDETOTAL ?? item.QtdeTotal ?? 0}</td>
                                            {visibleSetores.includes('montagem') && <td className="px-2 py-1 text-emerald-600 font-bold">{item.MontagemTotalExecutado || 0}</td>}
                                            <td className="px-2 py-1 text-blue-600 font-bold">{item.TotalExpedicao || 0}</td>
                                            <td className="px-2 py-1">{Number(item.PesoUnitario || 0).toLocaleString('pt-BR')} kg</td>
                                            <td className="px-2 py-1 text-slate-500 text-[10px]">
                                                {item.Comprimento || 0} x {item.Profundidade || 0} x {item.Largura || 0}
                                            </td>
                                        </tr>
                                        {/* EXPANDED AREA */}
                                        {isExpanded && (
                                            <tr className="bg-[#fafbfc] border-b-2 border-slate-200">
                                                <td colSpan={15} className="p-0">
                                                    <div className="p-4 pl-12 bg-gradient-to-r from-blue-50/20 to-transparent border-t border-blue-100 shadow-inner">
                                                        
                                                        {/* Info complementar do Item principal */}
                                                        <div className="flex gap-4 mb-3 text-[10px] text-slate-600 p-2 bg-white rounded-lg border border-slate-200 inline-flex shadow-sm">
                                                            <div><strong className="text-slate-800">Previsão:</strong> {item.DataPrevisao}</div>
                                                            <div><strong className="text-slate-800">Início Exp.:</strong> {item.RealizadoInicioExpedicao || '-'}</div>
                                                            <div><strong className="text-slate-800">Fim Exp.:</strong> {item.RealizadoFinalExpedicao || '-'}</div>
                                                            <div><strong className="text-slate-800">Desc. Detalhe:</strong> <span className="text-slate-500" title={item.descdetal}>{item.descdetal ? item.descdetal.substring(0,60) + '...' : '-'}</span></div>
                                                        </div>

                                                        {/* AÇÕES (Desenhos e Atualizar) */}
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            <button onClick={(e) => { e.stopPropagation(); abrirArquivoLocal(item.enderecoarquivo, '3d') }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                                                                <Box size={14} /> Abrir Desenho 3D
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); abrirArquivoLocal(item.enderecoarquivo, 'pdf') }} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                                                                <FileText size={14} /> Abrir Desenho PDF
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); abrirIsoLocal(item.IdTag) }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                                                                <FileCode2 size={14} /> Abrir Isométrico
                                                            </button>
                                                            {(item.TotalExpedicao < (item.QtdeTotal || item.QTDETOTAL || 0)) && (
                                                                <button onClick={(e) => { e.stopPropagation(); openApontarModal(item); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                                                                    <RefreshCw size={14} /> Atualizar Expedição
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Grid Secundário (ordemservicoitemcontrole) */}
                                                        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
                                                            <div className="bg-slate-100 px-2 py-1 border-b border-slate-200 shrink-0">
                                                                <h4 className="text-[9px] font-bold text-slate-600 uppercase">Itens de Controle Expedição (View)</h4>
                                                            </div>
                                                            
                                                            {loadingSec ? (
                                                                <div className="p-4 flex items-center gap-2 text-slate-400 text-xs">
                                                                    <Loader2 className="animate-spin" size={14} /> Carregando detalhamento...
                                                                </div>
                                                            ) : secItems.length === 0 ? (
                                                                <div className="p-3 text-slate-400 text-xs">Nenhum detalhe associado.</div>
                                                            ) : (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left text-[11px] whitespace-nowrap">
                                                                        <thead className="bg-[#fcfdfd] text-slate-500 border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="px-3 py-2 font-bold">ID Item Control</th>
                                                                                <th className="px-3 py-2 font-bold">Criado Por</th>
                                                                                <th className="px-3 py-2 font-bold">Data Criação</th>
                                                                                <th className="px-3 py-2 font-bold">Cód. Mat.</th>
                                                                                <th className="px-3 py-2 font-bold">Qtde Total</th>
                                                                                <th className="px-3 py-2 font-bold">Total Expedição</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {secItems.map(sec => (
                                                                                <tr key={sec.idordemservicoitemControle} className="hover:bg-slate-50">
                                                                                    <td className="px-3 py-1.5 font-mono text-slate-500">#{sec.IDOrdemServicoITEM ?? sec.IdOrdemServicoITem}</td>
                                                                                    <td className="px-3 py-1.5 text-slate-700">{sec.CriadoPor}</td>
                                                                                    <td className="px-3 py-1.5 text-slate-500">{sec.DataCriacao}</td>
                                                                                    <td className="px-3 py-1.5 font-mono text-blue-700">{sec.CodMatFabricante || '-'}</td>
                                                                                    <td className="px-3 py-1.5 font-bold text-slate-700">{sec.QtdeTotal || 0}</td>
                                                                                    <td className="px-3 py-1.5 font-bold text-emerald-600">{sec.TotalExpedicao || 0}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Apontar Expedição */}
            {apontarItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-blue-600 px-4 py-3 flex justify-between items-center text-white">
                            <h3 className="font-bold flex items-center gap-2">
                                <Box size={18} /> Apontar Expedição
                            </h3>
                            <button onClick={closeApontarModal} className="text-white/80 hover:text-white transition-colors" disabled={isApontarSubmitting}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs text-slate-600">
                                <div><strong className="text-slate-700">OS:</strong> {apontarItem.Idordemservico}</div>
                                <div><strong className="text-slate-700">Item:</strong> {apontarItem.idordemservicoitem || apontarItem.IdOrdemServicoItem}</div>
                                <div><strong className="text-slate-700">Tag:</strong> {apontarItem.Tag}</div>
                                <div className="mt-2 text-blue-700 font-bold">
                                    Limite Perm.: {(apontarItem.QtdeTotal || apontarItem.QTDETOTAL || 0)} - {(apontarItem.TotalExpedicao || 0)} = {(apontarItem.QtdeTotal || apontarItem.QTDETOTAL || 0) - (apontarItem.TotalExpedicao || 0)}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Qtd. Expedição:</label>
                                <input
                                    type="number"
                                    autoFocus
                                    min="1"
                                    max={(apontarItem.QtdeTotal || apontarItem.QTDETOTAL || 0) - (apontarItem.TotalExpedicao || 0)}
                                    value={apontarQtde}
                                    onChange={(e) => setApontarQtde(e.target.value)}
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    placeholder="Digite a quantidade"
                                    disabled={isApontarSubmitting}
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={closeApontarModal} disabled={isApontarSubmitting} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded transition-colors disabled:opacity-50">
                                Cancelar
                            </button>
                            <button onClick={submitApontar} disabled={isApontarSubmitting} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded shadow-sm inline-flex items-center gap-2 transition-colors disabled:opacity-50">
                                {isApontarSubmitting && <Loader2 size={14} className="animate-spin" />}
                                Confirmar Apontamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
