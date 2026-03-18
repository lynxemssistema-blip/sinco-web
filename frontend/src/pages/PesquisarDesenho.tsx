import { useState, useEffect } from 'react';
import { Search, Loader2, FileSearch, X, FileText, Box } from 'lucide-react';
const API_BASE = '/api';

interface SetorItem {
    idSetor: number;
    Setor: string;
    DataLiberada: string;
    NomeLimpo: string; // Ex: 'txtCorte' -> 'Corte'
    colTxt: string;
    colSt: string;
}

interface OSI {
    IdOrdemServicoItem: number | string;
    IdOrdemServico: number | string;
    Projeto: string;
    Tag: string;
    idplanodecorte?: string | null;
    QtdeTotal: number;
    CodMatFabricante: string;
    DescResumo: string;
    DescDetal: string;
    Espessura: string;
    MaterialSW: string;
    Liberado_Engenharia: string;
    Data_Liberacao_Engenharia: string;
    OrdemServicoItemFinalizado: string;
    EnderecoArquivo: string;
    // Dynamic Setor columns will be accessible dynamically via bracket notation
    [key: string]: any;
}

export default function PesquisarDesenho() {
    const [loading, setLoading] = useState(false);
    const [pesquisado, setPesquisado] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [items, setItems] = useState<OSI[]>([]);
    const [setoresAtivos, setSetoresAtivos] = useState<SetorItem[]>([]);

    // Filtros
    const [filProjeto, setFilProjeto] = useState('');
    const [filTag, setFilTag] = useState('');
    const [filCodMat, setFilCodMat] = useState('');
    const [filDescResumo, setFilDescResumo] = useState('');
    const [filDescDetal, setFilDescDetal] = useState('');
    const [filEspessura, setFilEspessura] = useState('');
    const [filMaterialSW, setFilMaterialSW] = useState('');

    const hasFilters = filProjeto || filTag || filCodMat || filDescResumo || filDescDetal || filEspessura || filMaterialSW;

    const limparFiltros = () => {
        setFilProjeto('');
        setFilTag('');
        setFilCodMat('');
        setFilDescResumo('');
        setFilDescDetal('');
        setFilEspessura('');
        setFilMaterialSW('');
        setItems([]);
        setPesquisado(false);
    };

    const fetchDesenhos = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = new URL(`${window.location.origin}${API_BASE}/pesquisar-desenho`);
            if (filProjeto) url.searchParams.append('projeto', filProjeto.trim());
            if (filTag) url.searchParams.append('tag', filTag.trim());
            if (filCodMat) url.searchParams.append('codMat', filCodMat.trim());
            if (filDescResumo) url.searchParams.append('descResumo', filDescResumo.trim());
            if (filDescDetal) url.searchParams.append('descDetal', filDescDetal.trim());
            if (filEspessura) url.searchParams.append('espessura', filEspessura.trim());
            if (filMaterialSW) url.searchParams.append('material', filMaterialSW.trim());

            const res = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('sinco_token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                setItems(data.data);
                setSetoresAtivos(data.setores);
                setPesquisado(true);
            } else {
                setError(data.message || 'Erro ao buscar dados.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Load initial data
    useEffect(() => {
        fetchDesenhos();
    }, []);

    // Helper para extrair a situação de cada setor
    const getSetorStatusClass = (valor: string | number) => {
        const strVal = String(valor).toUpperCase();
        if (strVal === 'S' || strVal === '1') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        if (strVal === 'N' || strVal === '0' || !valor || strVal.includes('NÃO')) return 'bg-slate-100 text-slate-500 border-slate-200';
        if (strVal.includes('%') || parseFloat(strVal) > 0) return 'bg-amber-100 text-amber-800 border-amber-300';
        
        // Default text fallback
        if (valor && strVal !== '') return 'bg-blue-50 text-blue-700 border-blue-200';

        return 'text-slate-400';
    };

    const abrirArquivoLocal = async (caminho: string, tipo: '3d' | 'pdf') => {
        if (!caminho || caminho.trim() === '') {
            alert("Endereço do arquivo não encontrado no sistema ou não atrelado a este item.");
            return;
        }
        try {
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

    return (
        <div className="flex flex-col h-full bg-[#fafbfc] animate-in fade-in zoom-in-95 duration-300">
            {/* Header / Filtros */}
            <div className="bg-white p-3 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 mb-2 shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <FileSearch className="text-blue-600" size={16} />
                        Pesquisar Desenho
                    </h2>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <input type="text" placeholder="Projeto" value={filProjeto} onChange={e => setFilProjeto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Tag" value={filTag} onChange={e => setFilTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Cód. Mat. Fabricante" value={filCodMat} onChange={e => setFilCodMat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Desc. Resumo" value={filDescResumo} onChange={e => setFilDescResumo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Desc. Detal" value={filDescDetal} onChange={e => setFilDescDetal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Espessura" value={filEspessura} onChange={e => setFilEspessura(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />
                    <input type="text" placeholder="Material SW" value={filMaterialSW} onChange={e => setFilMaterialSW(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchDesenhos(); }} className="w-full text-[11px] px-2 py-1 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white" />

                    <div className="flex gap-2 items-center lg:justify-end">
                        {hasFilters && (
                            <button onClick={limparFiltros} className="px-3 py-1 flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold hover:bg-red-100 transition-colors" title="Limpar Filtros">
                                <X size={14} /> LIMPAR
                            </button>
                        )}
                        <button onClick={fetchDesenhos} disabled={loading} className="px-4 py-1.5 flex items-center justify-center gap-2 bg-blue-600 text-white rounded shadow-sm text-[11px] font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex-1 lg:flex-none">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            PESQUISAR
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
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
                                <th className="px-2 py-1.5 bg-[#f8fafc] sticky left-0 z-30 shadow-[1px_0_0_rgba(0,0,0,0.05)]">Ações</th>
                                <th className="px-2 py-1.5">Projeto</th>
                                <th className="px-2 py-1.5">Tag</th>
                                <th className="px-2 py-1.5">OS</th>
                                <th className="px-2 py-1.5">Item</th>
                                <th className="px-2 py-1.5">Plano Corte</th>
                                <th className="px-2 py-1.5 text-center">Qtde Total</th>
                                <th className="px-2 py-1.5">Cód. Mat. Fab.</th>
                                <th className="px-2 py-1.5">Espessura</th>
                                <th className="px-2 py-1.5">Material SW</th>
                                <th className="px-2 py-1.5">Lib. Eng.</th>
                                <th className="px-2 py-1.5">Data Lib.</th>
                                <th className="px-2 py-1.5 text-center">Finalizado</th>
                                
                                {/* Dynamic Setores Columns */}
                                {setoresAtivos.map(setor => (
                                    <th key={setor.idSetor} className="px-2 py-1.5 text-center border-l border-slate-200 bg-slate-100 text-[#4c5561]" title={setor.Setor}>
                                        {setor.NomeLimpo}
                                    </th>
                                ))}

                                <th className="px-2 py-1.5">Desc. Resumo</th>
                                <th className="px-2 py-1.5 max-w-[200px]">Desc. Detalhe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 && !loading && pesquisado && (
                                <tr>
                                    <td colSpan={15 + setoresAtivos.length} className="px-4 py-8 text-center text-slate-400 font-medium">
                                        Nenhum registro encontrado para a pesquisa.
                                    </td>
                                </tr>
                            )}
                            {items.length === 0 && !pesquisado && (
                                <tr>
                                    <td colSpan={15 + setoresAtivos.length} className="px-4 py-8 text-center text-slate-400 font-medium flex-col items-center justify-center">
                                        <FileSearch size={32} className="mx-auto mb-2 opacity-30" />
                                        Utilize os filtros acima para pesquisar.
                                    </td>
                                </tr>
                            )}

                            {items.map(item => (
                                <tr key={`osi-${item.IdOrdemServicoItem}`} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-2 py-1 bg-white sticky left-0 z-10 shadow-[1px_0_0_rgba(0,0,0,0.05)] flex gap-1 items-center">
                                        <button onClick={() => abrirArquivoLocal(item.EnderecoArquivo, '3d')} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Abrir 3D">
                                            <Box size={14} />
                                        </button>
                                        <button onClick={() => abrirArquivoLocal(item.EnderecoArquivo, 'pdf')} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="Abrir PDF">
                                            <FileText size={14} />
                                        </button>
                                    </td>
                                    
                                    <td className="px-2 py-1 font-bold text-slate-700">{item.Projeto || ''}</td>
                                    <td className="px-2 py-1 font-bold text-blue-700">{item.Tag || ''}</td>
                                    <td className="px-2 py-1 font-mono text-slate-600">{item.IdOrdemServico || ''}</td>
                                    <td className="px-2 py-1 font-mono text-slate-600">{item.IdOrdemServicoItem || ''}</td>
                                    <td className="px-2 py-1 font-mono text-purple-700">{item.idplanodecorte || '-'}</td>
                                    <td className="px-2 py-1 text-center font-bold text-slate-800 bg-slate-50/50">{item.QtdeTotal || 0}</td>
                                    <td className="px-2 py-1 font-mono text-slate-600 truncate max-w-[100px]" title={item.CodMatFabricante}>{item.CodMatFabricante || '-'}</td>
                                    <td className="px-2 py-1 text-slate-600">{item.Espessura || '-'}</td>
                                    <td className="px-2 py-1 text-slate-600 max-w-[100px] truncate" title={item.MaterialSW}>{item.MaterialSW || '-'}</td>
                                    <td className="px-2 py-1">
                                        {item.Liberado_Engenharia === 'SIM' 
                                            ? <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">SIM</span> 
                                            : <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">NÃO</span>}
                                    </td>
                                    <td className="px-2 py-1 text-slate-500 font-mono text-[10px]">{item.Data_Liberacao_Engenharia || '-'}</td>
                                    <td className="px-2 py-1 text-center">
                                        {item.OrdemServicoItemFinalizado === 'SIM' 
                                            ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">SIM</span> 
                                            : <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">NÃO</span>}
                                    </td>

                                    {/* Mapeamento Dinâmico de Setores */}
                                    {setoresAtivos.map(setor => {
                                        const colNameLower = setor.colTxt.toLowerCase();
                                        const colStatusLower = setor.colSt.toLowerCase();
                                        
                                        // Busca case-insensitive
                                        const keyOriginal = Object.keys(item).find(k => k.toLowerCase() === colNameLower);
                                        const keyStatus = Object.keys(item).find(k => k.toLowerCase() === colStatusLower);

                                        const valOriginal = keyOriginal ? item[keyOriginal] : '';
                                        const valStatus = keyStatus ? item[keyStatus] : '';
                                        
                                        const displayVal = valStatus ? `${valOriginal} (${valStatus})` : valOriginal;

                                        return (
                                            <td key={setor.idSetor} className="px-2 py-1 text-center border-l border-slate-100">
                                                {displayVal ? (
                                                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold inline-block text-center min-w-[30px] ${getSetorStatusClass(valOriginal)}`}>
                                                        {displayVal}
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        )
                                    })}

                                    <td className="px-2 py-1 text-[10px] text-slate-600 truncate max-w-[150px]" title={item.DescResumo}>{item.DescResumo || '-'}</td>
                                    <td className="px-2 py-1 text-[10px] text-slate-500 truncate max-w-[200px]" title={item.DescDetal}>{item.DescDetal || '-'}</td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
