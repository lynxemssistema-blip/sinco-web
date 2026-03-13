import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader, Edit3, Save } from 'lucide-react';

const API_BASE = '/api';

interface TagData {
    IdTag: number;
    Tag: string;
    DescTag: string;
    Projeto: string;
    DescEmpresa: string;
    TipoProduto: string;
    DataPrevisao: string;
    ProjetistaPlanejado: string;
    CaminhoIsometrico: string;

    PlanejadoInicioMedicao: string;
    PlanejadoFinalMedicao: string;
    RealizadoInicioMedicao: string;
    RealizadoFinalMedicao: string;

    PlanejadoInicioIsometrico: string;
    PlanejadoFinalIsometrico: string;
    RealizadoInicioIsometrico: string;
    RealizadoFinalIsometrico: string;

    PlanejadoInicioEngenharia: string;
    PlanejadoFinalEngenharia: string;
    RealizadoInicioEngenharia: string;
    RealizadoFinalEngenharia: string;

    PlanejadoInicioAprovacao: string;
    PlanejadoFinalAprovacao: string;
    RealizadoInicioAprovacao: string;
    RealizadoFinalAprovacao: string;
}

type SectorType = 'Medicao' | 'Isometrico' | 'Engenharia' | 'Aprovacao';
const SECTORS: SectorType[] = ['Medicao', 'Isometrico', 'Engenharia', 'Aprovacao'];

export default function VisaoGeralEngenharia() {
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [activeSectors, setActiveSectors] = useState<Set<SectorType>>(new Set());
    
    // Filters
    const [fQuery, setFQuery] = useState('');
    const [fTipo, setFTipo] = useState('');
    const [fProjPlanejado, setFProjPlanejado] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Batch Edit
    const [batchEditing, setBatchEditing] = useState(false);
    const [batchForm, setBatchForm] = useState({ pi: '', pf: '', ri: '', rf: '', sector: 'Engenharia' as SectorType });
    const [batchSaving, setBatchSaving] = useState(false);

    useEffect(() => { fetchTags(); }, []);

    const fetchTags = async () => {
        setLoading(true); setError('');
        try {
            const res = await (await fetch(`${API_BASE}/visao-geral-engenharia/tags`)).json();
            if (res.success) setTags(res.data);
            else setError(res.message);
        } catch (e: any) {
            setError('Erro de rede.');
        } finally {
            setLoading(false);
        }
    };

    const isoToBr = (iso: string) => { 
        if (!iso) return '';
        const parts = iso.split('-'); 
        if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`; 
        return iso; 
    };

    const brToIso = (br: string) => {
        if (!br) return '';
        const parts = br.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return br;
    };

    const getUser = () => { try { const u = JSON.parse(localStorage.getItem('sinco_user') || '{}'); return u.username || u.name || 'Sistema'; } catch { return 'Sistema'; } };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };
    const toggleAll = () => {
        if (selectedIds.size === filteredTags.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredTags.map(t => t.IdTag)));
    };

    const toggleSector = (s: SectorType) => {
        const next = new Set(activeSectors);
        if (next.has(s)) next.delete(s); else next.add(s);
        setActiveSectors(next);
    };

    const toggleAllSectors = () => {
        if (activeSectors.size === SECTORS.length) setActiveSectors(new Set());
        else setActiveSectors(new Set(SECTORS));
    };

    const execBatchUpdate = async () => {
        setBatchSaving(true);
        try {
            const payload = {
                idTags: Array.from(selectedIds),
                setor: batchForm.sector,
                planejadoInicio: batchForm.pi ? isoToBr(batchForm.pi) : undefined,
                planejadoFinal: batchForm.pf ? isoToBr(batchForm.pf) : undefined,
                realizadoInicio: batchForm.ri ? isoToBr(batchForm.ri) : undefined,
                realizadoFinal: batchForm.rf ? isoToBr(batchForm.rf) : undefined,
                usuario: getUser()
            };
            const r = await (await fetch(`${API_BASE}/visao-geral-engenharia/tags/lote`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })).json();
            if (r.success) {
                await fetchTags();
                alert(r.message);
                setBatchEditing(false);
                setBatchForm({ pi: '', pf: '', ri: '', rf: '', sector: 'Engenharia' });
                setSelectedIds(new Set());
            } else alert(r.message);
        } catch (e) {
            alert('Erro de rede.');
        } finally {
            setBatchSaving(false);
        }
    };

    const handleInlineDateChange = async (idTag: number, sector: SectorType, field: 'PlanejadoInicio' | 'PlanejadoFinal', isoDate: string) => {
        const brDate = isoToBr(isoDate);
        
        // Optimistic update
        setTags(prev => prev.map(t => t.IdTag === idTag ? { ...t, [`${field}${sector}`]: brDate } : t));

        const payload: any = {
            idTags: [idTag],
            setor: sector,
            usuario: getUser()
        };
        if (field === 'PlanejadoInicio') payload.planejadoInicio = brDate;
        if (field === 'PlanejadoFinal') payload.planejadoFinal = brDate;

        try {
            const r = await (await fetch(`${API_BASE}/visao-geral-engenharia/tags/lote`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })).json();
            if (!r.success) {
                // Revert or show error if needed, for now just log
                console.error('Failed inline update:', r.message);
            }
        } catch (e) {
            console.error('Network error on inline update', e);
        }
    };

    const isFilled = (val: any) => val && String(val).trim() !== '';

    // Calculate Summary Grid logic based on filtered items
    const filteredTags = useMemo(() => {
        return tags.filter(t => 
            (!fTipo || (t.TipoProduto||'').toLowerCase().includes(fTipo.toLowerCase())) &&
            (!fProjPlanejado || (t.ProjetistaPlanejado||'').toLowerCase().includes(fProjPlanejado.toLowerCase())) &&
            (!fQuery || 
                (t.Projeto||'').toLowerCase().includes(fQuery.toLowerCase()) || 
                (t.Tag||'').toLowerCase().includes(fQuery.toLowerCase()) || 
                (t.DescEmpresa||'').toLowerCase().includes(fQuery.toLowerCase()) || 
                (t.DescTag||'').toLowerCase().includes(fQuery.toLowerCase())
            )
        );
    }, [tags, fTipo, fProjPlanejado, fQuery]);

    const summary = useMemo(() => {
        const buildSect = (sect: SectorType) => {
            let pIni = 0; let pFim = 0; let rIni = 0; let rFim = 0;
            filteredTags.forEach(t => {
                if (isFilled((t as any)[`PlanejadoInicio${sect}`])) pIni++;
                if (isFilled((t as any)[`PlanejadoFinal${sect}`])) pFim++;
                if (isFilled((t as any)[`RealizadoInicio${sect}`])) rIni++;
                if (isFilled((t as any)[`RealizadoFinal${sect}`])) rFim++;
            });
            return { pIni, pFim, rIni, rFim, t: filteredTags.length };
        };

        return {
            Medicao: buildSect('Medicao'),
            Isometrico: buildSect('Isometrico'),
            Engenharia: buildSect('Engenharia'),
            Aprovacao: buildSect('Aprovacao'),
        }
    }, [filteredTags]);

    return (
        <div className="h-full flex flex-col font-sans bg-gray-50 text-xs overflow-hidden pt-12">
            {/* Header / Filters Block */}
            <div className="border-b border-gray-300 bg-white p-2 shrink-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold text-gray-800 text-sm whitespace-nowrap">Visão Geral Engenharia ({tags.length} tags)</div>
                    <div className="relative flex-1 md:max-w-xs">
                        <input type="text" placeholder="Pesquisar Projeto, Tag, Desc... " value={fQuery} onChange={e => setFQuery(e.target.value)} className="w-full text-xs pl-7 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-blue-500" />
                        <Search size={14} className="absolute left-2 top-1.5 text-gray-400" />
                    </div>
                    <input type="text" placeholder="Tipo Produto" value={fTipo} onChange={e => setFTipo(e.target.value)} className="w-24 md:w-32 text-xs px-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-blue-500" />
                    <input type="text" placeholder="Projetista" value={fProjPlanejado} onChange={e => setFProjPlanejado(e.target.value)} className="w-24 md:w-32 text-xs px-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-blue-500" />
                </div>
                
                {/* Visual Options - Checkboxes for Sectors */}
                <div className="flex flex-wrap items-center gap-4 bg-gray-100 p-1 rounded border border-gray-200">
                    <span className="font-bold text-gray-700 ml-1">Exibir Setores:</span>
                    <label className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 px-1 rounded">
                        <input type="checkbox" checked={activeSectors.size === SECTORS.length} onChange={toggleAllSectors} className="w-3 h-3" /> <span className="text-gray-700">Todos</span>
                    </label>
                    {SECTORS.map(s => (
                        <label key={s} className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 px-1 rounded">
                            <input type="checkbox" checked={activeSectors.has(s)} onChange={() => toggleSector(s)} className="w-3 h-3" /> <span className="text-gray-700">{s}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Main Tags Grid Toolbar */}
            <div className="px-2 py-1 border-b border-gray-300 flex items-center justify-between bg-white shrink-0">
                <div className="text-gray-700 font-bold flex items-center gap-2">
                    {selectedIds.size > 0 && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{selectedIds.size} tags selecionadas</span>}
                </div>
                <div>
                    {!batchEditing ? (
                        <button disabled={selectedIds.size === 0} onClick={() => setBatchEditing(true)} className="px-3 py-1 bg-gray-100 border border-gray-300 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded flex items-center gap-1">
                            <Edit3 size={12} /> Editar Lote
                        </button>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2 bg-yellow-50 p-1 rounded border border-yellow-300">
                            <span className="font-bold text-yellow-800">Nova Data em Massa:</span>
                            <select value={batchForm.sector} onChange={e => setBatchForm(p => ({...p, sector: e.target.value as SectorType}))} className="border border-gray-300 rounded p-0.5 text-xs bg-white">
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="date" title="Planejado Início" value={batchForm.pi} onChange={e => setBatchForm({...batchForm, pi: e.target.value})} className="border border-gray-300 rounded p-0.5" />
                            <input type="date" title="Planejado Final" value={batchForm.pf} onChange={e => setBatchForm({...batchForm, pf: e.target.value})} className="border border-gray-300 rounded p-0.5" />
                            <input type="date" title="Realizado Início" value={batchForm.ri} onChange={e => setBatchForm({...batchForm, ri: e.target.value})} className="border border-gray-300 rounded p-0.5" />
                            <input type="date" title="Realizado Final" value={batchForm.rf} onChange={e => setBatchForm({...batchForm, rf: e.target.value})} className="border border-gray-300 rounded p-0.5" />
                            
                            <button onClick={execBatchUpdate} disabled={batchSaving || (!batchForm.pi && !batchForm.pf && !batchForm.ri && !batchForm.rf)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1 font-bold disabled:opacity-50">
                                {batchSaving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button onClick={() => setBatchEditing(false)} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold">Cancelar</button>
                        </div>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="flex-1 overflow-auto bg-white relative">
                {loading && <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center"><Loader className="animate-spin text-gray-400" /></div>}
                
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-[0_1px_0_#d1d5db]">
                        <tr>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 text-center w-8">
                                <input type="checkbox" checked={selectedIds.size === filteredTags.length && filteredTags.length > 0} onChange={toggleAll} className="w-3 h-3 cursor-pointer" />
                            </th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 min-w-[80px]">Projeto</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 min-w-[120px]">Empresa</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 min-w-[60px]">Tag</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 min-w-[150px]">Descrição Tag</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300">Produto</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300">Previsão</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300">Projetista</th>
                            <th className="px-2 py-1.5 border-r border-b border-gray-300">Isometrico Path</th>
                            
                            {/* Dynamic Sector Columns Header */}
                            {Array.from(activeSectors).map(s => (
                                <React.Fragment key={s}>
                                    <th className="px-2 py-1.5 border-r border-b border-gray-300 bg-blue-50 text-blue-800 text-center" colSpan={4}>{s} - Datas</th>
                                </React.Fragment>
                            ))}
                        </tr>
                        {activeSectors.size > 0 && (
                            <tr className="bg-gray-50 text-gray-600 text-[10px]">
                                <th className="border-r border-b border-gray-300" colSpan={9}></th>
                                {Array.from(activeSectors).map(s => (
                                    <React.Fragment key={`${s}-sub`}>
                                        <th className="px-1 py-1 border-r border-b border-gray-300 text-center font-normal">Plan. Início</th>
                                        <th className="px-1 py-1 border-r border-b border-gray-300 text-center font-normal">Plan. Final</th>
                                        <th className="px-1 py-1 border-r border-b border-gray-300 text-center font-normal">Real. Início</th>
                                        <th className="px-1 py-1 border-r border-b border-gray-300 text-center font-normal">Real. Final</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTags.map((t, idx) => (
                            <tr key={t.IdTag} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(t.IdTag) ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}`}>
                                <td className="px-2 py-1 border-r border-gray-200 text-center">
                                    <input type="checkbox" checked={selectedIds.has(t.IdTag)} onChange={() => toggleSelect(t.IdTag)} className="w-3 h-3 cursor-pointer" />
                                </td>
                                <td className="px-2 py-1 border-r border-gray-200">{t.Projeto}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[150px]" title={t.DescEmpresa}>{t.DescEmpresa}</td>
                                <td className="px-2 py-1 border-r border-gray-200 font-bold">{t.Tag}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[250px]" title={t.DescTag}>{t.DescTag}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[100px]" title={t.TipoProduto}>{t.TipoProduto}</td>
                                <td className="px-2 py-1 border-r border-gray-200">{t.DataPrevisao}</td>
                                <td className="px-2 py-1 border-r border-gray-200 max-w-[120px] overflow-hidden text-ellipsis text-blue-800" title={t.ProjetistaPlanejado}>{t.ProjetistaPlanejado}</td>
                                <td className="px-2 py-1 border-r border-gray-200 text-gray-500 overflow-hidden text-ellipsis max-w-[120px]" title={t.CaminhoIsometrico}>{t.CaminhoIsometrico}</td>

                                {/* Dynamic Sector Columns Body */}
                                {Array.from(activeSectors).map(s => {
                                    const pi = (t as any)[`PlanejadoInicio${s}`];
                                    const pf = (t as any)[`PlanejadoFinal${s}`];
                                    const ri = (t as any)[`RealizadoInicio${s}`];
                                    const rf = (t as any)[`RealizadoFinal${s}`];
                                    return (
                                        <React.Fragment key={`${t.IdTag}-${s}`}>
                                            <td className="px-0.5 py-1 border-r border-gray-200 text-center">
                                                <input 
                                                    type="date" 
                                                    value={brToIso(pi)} 
                                                    onChange={e => handleInlineDateChange(t.IdTag, s, 'PlanejadoInicio', e.target.value)}
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-gray-700"
                                                />
                                            </td>
                                            <td className="px-0.5 py-1 border-r border-gray-200 text-center">
                                                <input 
                                                    type="date" 
                                                    value={brToIso(pf)} 
                                                    onChange={e => handleInlineDateChange(t.IdTag, s, 'PlanejadoFinal', e.target.value)}
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-gray-700"
                                                />
                                            </td>
                                            <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-600 bg-gray-50">{ri}</td>
                                            <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-600 bg-gray-50">{rf}</td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                        {filteredTags.length === 0 && !loading && (
                            <tr><td colSpan={9 + (activeSectors.size * 4)} className="p-4 text-center text-gray-500">Nenhuma tag encontrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary Grid (Tela Numero 3 format) */}
            <div className="p-2 shrink-0 overflow-x-auto bg-gray-50 border-t border-gray-300">
                <table className="w-full max-w-4xl text-left bg-white border border-gray-300">
                    <thead className="bg-gray-200 text-gray-700 border-b border-gray-300">
                        <tr>
                            <th className="px-2 py-1 border-r border-gray-300 font-bold whitespace-nowrap">Setor</th>
                            <th className="px-2 py-1 border-r border-gray-300 font-bold whitespace-nowrap">Planejado Início</th>
                            <th className="px-2 py-1 border-r border-gray-300 font-bold whitespace-nowrap">Realizado Início</th>
                            <th className="px-2 py-1 border-r border-gray-300 font-bold whitespace-nowrap">Planejado Final</th>
                            <th className="px-2 py-1 border-r border-gray-300 font-bold whitespace-nowrap">Realizado Final</th>
                            <th className="px-2 py-1 font-bold whitespace-nowrap">Total Linhas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SECTORS.map(s => {
                            const data = summary[s];
                            return (
                                <tr key={s} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                    <td className="px-2 py-1 border-r border-gray-200 font-bold">{s}</td>
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">{data.pIni || 0}</td>
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">{data.rIni || 0}</td>
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">{data.pFim || 0}</td>
                                    <td className="px-2 py-1 border-r border-gray-200 text-center">{data.rFim || 0}</td>
                                    <td className="px-2 py-1 text-center bg-gray-100 font-bold">{data.t}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
