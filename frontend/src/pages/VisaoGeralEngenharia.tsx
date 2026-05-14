import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader, Edit3, Save, X, CalendarDays } from 'lucide-react';

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

const SECTOR_INFO: Record<SectorType, { label: string; icon: string; desc: string; steps: string[] }> = {
    Medicao: {
        label: 'Medição',
        icon: '📐',
        desc: 'Levantamento dimensional in loco do sistema de tubulação ou estrutura existente.',
        steps: [
            'Visita técnica ao campo para coleta de medidas',
            'Registro de cotas, diâmetros, elevações e interferências',
            'Elaboração de croqui de campo como base para o isométrico',
            'Validação das medidas com o responsável do cliente',
        ],
    },
    Isometrico: {
        label: 'Isométrico',
        icon: '📄',
        desc: 'Desenho técnico em vista isométrica representando o percurso e especificações da tubulação.',
        steps: [
            'Elaboração do desenho isométrico com base no croqui de medição',
            'Inclusão de lista de materiais (BOM) e especificações técnicas',
            'Revisão interna antes de envio para engenharia',
            'Geração de PDF/DXF para aprovação do cliente',
        ],
    },
    Engenharia: {
        label: 'Engenharia',
        icon: '⚙️',
        desc: 'Desenvolvimento do projeto de engenharia: cálculos, memoriais, especificações e documentação técnica.',
        steps: [
            'Análise das especificações técnicas do cliente (normas, pressão, temperatura)',
            'Desenvolvimento de memoriais de cálculo estrutural/hidráulico',
            'Elaboração de desenhos de fabricação (plantas, cortes, detalhes)',
            'Emissão do conjunto documental para aprovação',
        ],
    },
    Aprovacao: {
        label: 'Aprovação',
        icon: '✅',
        desc: 'Ciclo de revisão e aprovação formal dos documentos técnicos pelo cliente ou órgão competente.',
        steps: [
            'Envio do pacote de documentos ao cliente ou órgão certificador',
            'Registro de comentários e solicitações de revisão',
            'Emissão de revisão com incorporação dos comentários',
            'Aprovação final e liberação para fabricação/execução',
        ],
    },
};

const getSectorColors = (sector: SectorType) => {
    switch (sector) {
        case 'Medicao': return { head: 'bg-blue-100 text-blue-900 border-blue-200', sub: 'bg-blue-50 text-blue-800 border-blue-200' };
        case 'Isometrico': return { head: 'bg-purple-100 text-purple-900 border-purple-200', sub: 'bg-purple-50 text-purple-800 border-purple-200' };
        case 'Engenharia': return { head: 'bg-amber-100 text-amber-900 border-amber-200', sub: 'bg-amber-50 text-amber-800 border-amber-200' };
        case 'Aprovacao': return { head: 'bg-emerald-100 text-emerald-900 border-emerald-200', sub: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
        default: return { head: 'bg-gray-100 text-gray-900 border-gray-300', sub: 'bg-gray-50 text-gray-800 border-gray-200' };
    }
};

export default function VisaoGeralEngenharia() {
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(false);
    const [, setError] = useState<string | null>(null);

    const [activeSectors, setActiveSectors] = useState<Set<SectorType>>(new Set());
    
    // Filters — individual
    const [fProjeto, setFProjeto] = useState('');
    const [fEmpresa, setFEmpresa] = useState('');
    const [fTag, setFTag] = useState('');
    const [fDescTag, setFDescTag] = useState('');
    const [fProjetista, setFProjetista] = useState('');
    const [fTipo, setFTipo] = useState('');
    // Date range
    const [fPrevIni, setFPrevIni] = useState('');
    const [fPrevFim, setFPrevFim] = useState('');

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

    const handleInlineDateChange = async (idTag: number, sector: SectorType, field: 'PlanejadoInicio' | 'PlanejadoFinal' | 'RealizadoInicio' | 'RealizadoFinal', isoDate: string) => {
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
        if (field === 'RealizadoInicio') payload.realizadoInicio = brDate;
        if (field === 'RealizadoFinal') payload.realizadoFinal = brDate;

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

    const handleUploadIso = async (e: React.ChangeEvent<HTMLInputElement>, idTag: number, tagNum: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm(`Você está associando um desenho ISOMÉTRICO para a Tag '${tagNum}'. Confirma?`)) {
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('isometricoPdf', file);

        try {
            const r = await (await fetch(`${API_BASE}/visao-geral-engenharia/tags/${idTag}/isometrico`, {
                method: 'POST', body: formData
            })).json();
            if (r.success) {
                setTags(prev => prev.map(t => t.IdTag === idTag ? { ...t, CaminhoIsometrico: r.data.CaminhoIsometrico } : t));
            } else {
                alert(r.message);
            }
        } catch (err) {
            alert('Erro de rede.');
        } finally {
            e.target.value = '';
        }
    };

    const confirmClearIso = async (idTag: number, tagNum: string) => {
        if (!window.confirm(`Limpar o desenho associado à Tag '${tagNum}'?`)) return;
        try {
            const r = await (await fetch(`${API_BASE}/visao-geral-engenharia/tags/${idTag}/isometrico`, {
                method: 'DELETE'
            })).json();
            if (r.success) {
                setTags(prev => prev.map(t => t.IdTag === idTag ? { ...t, CaminhoIsometrico: '' } : t));
            } else {
                alert(r.message);
            }
        } catch (err) {
            alert('Erro de rede.');
        }
    };

    const isFilled = (val: any) => val && String(val).trim() !== '';

    // Calculate Summary Grid logic based on filtered items
    const brToIsoDate = (br: string): Date | null => {
        if (!br) return null;
        const [d, m, y] = br.split('/');
        if (!d || !m || !y) return null;
        return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    };

    const filteredTags = useMemo(() => {
        return tags.filter(t => {
            if (fProjeto && !(t.Projeto||'').toLowerCase().includes(fProjeto.toLowerCase())) return false;
            if (fEmpresa && !(t.DescEmpresa||'').toLowerCase().includes(fEmpresa.toLowerCase())) return false;
            if (fTag && !(t.Tag||'').toLowerCase().includes(fTag.toLowerCase())) return false;
            if (fDescTag && !(t.DescTag||'').toLowerCase().includes(fDescTag.toLowerCase())) return false;
            if (fProjetista && !(t.ProjetistaPlanejado||'').toLowerCase().includes(fProjetista.toLowerCase())) return false;
            if (fTipo && !(t.TipoProduto||'').toLowerCase().includes(fTipo.toLowerCase())) return false;
            if (fPrevIni || fPrevFim) {
                const tagDate = brToIsoDate(t.DataPrevisao);
                if (!tagDate) return false;
                if (fPrevIni) {
                    const ini = new Date(fPrevIni);
                    if (tagDate < ini) return false;
                }
                if (fPrevFim) {
                    const fim = new Date(fPrevFim);
                    fim.setHours(23,59,59);
                    if (tagDate > fim) return false;
                }
            }
            return true;
        });
    }, [tags, fProjeto, fEmpresa, fTag, fDescTag, fProjetista, fTipo, fPrevIni, fPrevFim]);

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
            <div className="border-b border-gray-300 bg-white px-3 py-2 shrink-0 flex flex-col gap-2">

                {/* Title bar */}
                <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-800 text-sm">
                        Visão Geral Engenharia
                        <span className="ml-2 text-gray-500 font-normal text-xs">({filteredTags.length} de {tags.length} tags)</span>
                    </div>
                    {(fProjeto || fEmpresa || fTag || fDescTag || fProjetista || fTipo || fPrevIni || fPrevFim) && (
                        <button
                            onClick={() => { setFProjeto(''); setFEmpresa(''); setFTag(''); setFDescTag(''); setFProjetista(''); setFTipo(''); setFPrevIni(''); setFPrevFim(''); }}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition-colors font-bold"
                        >
                            <X size={11} /> Limpar Filtros
                        </button>
                    )}
                </div>

                {/* Row 1 — Text Filters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Projeto</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Ex: 010469"
                                value={fProjeto} onChange={e => setFProjeto(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Empresa / Cliente</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Ex: Eletrocentro"
                                value={fEmpresa} onChange={e => setFEmpresa(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tag</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Ex: T-001"
                                value={fTag} onChange={e => setFTag(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Descrição da Tag</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Palavras-chave"
                                value={fDescTag} onChange={e => setFDescTag(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Projetista</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Nome do projetista"
                                value={fProjetista} onChange={e => setFProjetista(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tipo Produto</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                type="text" placeholder="Ex: Painel"
                                value={fTipo} onChange={e => setFTipo(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-1 bg-white border border-gray-300 rounded outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20"
                            />
                        </div>
                    </div>
                </div>

                {/* Row 2 — Date range + sectors */}
                <div className="flex flex-wrap items-end gap-3">
                    {/* Date range Previsão */}
                    <div className="flex items-center gap-2">
                        <CalendarDays size={13} className="text-[#32423D] shrink-0" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">Previsão de Entrega:</span>
                        <div className="flex items-center gap-1">
                            <input
                                type="date" value={fPrevIni} onChange={e => setFPrevIni(e.target.value)}
                                className="text-[10px] border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 bg-white"
                                title="Data início"
                            />
                            <span className="text-gray-400 font-bold">—</span>
                            <input
                                type="date" value={fPrevFim} onChange={e => setFPrevFim(e.target.value)}
                                className="text-[10px] border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20 bg-white"
                                title="Data fim"
                            />
                        </div>
                    </div>

                    {/* Sector checkboxes */}
                    <div className="flex flex-wrap items-center gap-3 bg-gray-100 px-2 py-1 rounded border border-gray-200 flex-1">
                        <span className="font-bold text-gray-700 text-[10px] uppercase">Exibir Setores:</span>
                        <label className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 px-1 rounded transition-colors">
                            <input type="checkbox" checked={activeSectors.size === SECTORS.length} onChange={toggleAllSectors} className="w-3 h-3 cursor-pointer" />
                            <span className="text-gray-700 font-medium text-[11px]">Todos</span>
                        </label>
                        {SECTORS.map(s => {
                            let colorClass = 'text-gray-700 hover:bg-gray-200';
                            let tooltipBg = 'bg-gray-800';
                            if (s === 'Medicao')    { colorClass = 'text-blue-800 hover:bg-blue-100/50';     tooltipBg = 'bg-blue-900'; }
                            if (s === 'Isometrico') { colorClass = 'text-purple-800 hover:bg-purple-100/50'; tooltipBg = 'bg-purple-900'; }
                            if (s === 'Engenharia') { colorClass = 'text-amber-800 hover:bg-amber-100/50';   tooltipBg = 'bg-amber-900'; }
                            if (s === 'Aprovacao')  { colorClass = 'text-emerald-800 hover:bg-emerald-100/50'; tooltipBg = 'bg-emerald-900'; }
                            const info = SECTOR_INFO[s];
                            return (
                                <div key={s} className="relative group">
                                    <label className={`flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded transition-colors ${colorClass} ${activeSectors.has(s) ? 'bg-white shadow-sm border border-gray-200/50' : ''}`}>
                                        <input type="checkbox" checked={activeSectors.has(s)} onChange={() => toggleSector(s)} className="w-3 h-3 cursor-pointer" />
                                        <span className="font-bold text-[11px] uppercase tracking-wide">{s}</span>
                                    </label>
                                    {/* Tooltip */}
                                    <div className={`absolute bottom-full left-0 mb-2 z-50 w-72 ${tooltipBg} text-white rounded-xl shadow-2xl p-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-left`}>
                                        <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-2">
                                            <span className="text-lg">{info.icon}</span>
                                            <div>
                                                <div className="font-black text-sm uppercase tracking-wide">{info.label}</div>
                                                <div className="text-[10px] text-white/70 font-medium">Setor de Engenharia</div>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-white/90 leading-relaxed mb-2">{info.desc}</p>
                                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">Etapas do processo:</div>
                                        <ol className="space-y-1">
                                            {info.steps.map((step, i) => (
                                                <li key={i} className="flex items-start gap-1.5 text-[10px] text-white/80">
                                                    <span className="shrink-0 font-black text-white/50">{i + 1}.</span>
                                                    <span>{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                        {/* Arrow */}
                                        <div className={`absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${tooltipBg.replace('bg-', 'border-t-')}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Tags Grid Toolbar */}
            <div className="px-2 py-1 border-b border-gray-300 flex items-center justify-between bg-white shrink-0">
                <div className="text-gray-700 font-bold flex items-center gap-2">
                    {selectedIds.size > 0 && <span className="font-bold text-[#32423D] bg-[#E0E800]/40 px-2 py-0.5 rounded border border-[#E0E800]">{selectedIds.size} tags selecionadas</span>}
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
                            <th className="px-2 py-1.5 border-r border-b border-gray-300 w-24">Des. Isométrico</th>
                            
                            {/* Dynamic Sector Columns Header */}
                            {Array.from(activeSectors).map(s => {
                                const colors = getSectorColors(s);
                                return (
                                    <React.Fragment key={s}>
                                        <th className={`px-2 py-1.5 border-r border-b ${colors.head} text-center`} colSpan={4}>{s} - Datas</th>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        {activeSectors.size > 0 && (
                            <tr className="bg-gray-50 text-gray-600 text-[10px]">
                                <th className="border-r border-b border-gray-300" colSpan={9}></th>
                                {Array.from(activeSectors).map(s => {
                                    const colors = getSectorColors(s);
                                    return (
                                        <React.Fragment key={`${s}-sub`}>
                                            <th className={`px-1 py-1 border-r border-b ${colors.sub} text-center font-normal`}>Plan. Início</th>
                                            <th className={`px-1 py-1 border-r border-b ${colors.sub} text-center font-normal`}>Plan. Final</th>
                                            <th className={`px-1 py-1 border-r border-b ${colors.sub} text-center font-normal`}>Real. Início</th>
                                            <th className={`px-1 py-1 border-r border-b ${colors.sub} text-center font-normal`}>Real. Final</th>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTags.map((t, idx) => (
                            <tr key={t.IdTag} className={`hover:bg-[#E0E800]/10 transition-colors ${selectedIds.has(t.IdTag) ? 'bg-[#E0E800]/20' : idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}`}>
                                <td className="px-2 py-1 border-r border-gray-200 text-center">
                                    <input type="checkbox" checked={selectedIds.has(t.IdTag)} onChange={() => toggleSelect(t.IdTag)} className="w-3 h-3 cursor-pointer" />
                                </td>
                                <td className="px-2 py-1 border-r border-gray-200">{t.Projeto}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[150px]" title={t.DescEmpresa}>{t.DescEmpresa}</td>
                                <td className="px-2 py-1 border-r border-gray-200 font-bold">{t.Tag}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[250px]" title={t.DescTag}>{t.DescTag}</td>
                                <td className="px-2 py-1 border-r border-gray-200 overflow-hidden text-ellipsis max-w-[100px]" title={t.TipoProduto}>{t.TipoProduto}</td>
                                <td className="px-2 py-1 border-r border-gray-200">{t.DataPrevisao}</td>
                                <td className="px-2 py-1 border-r border-gray-200 max-w-[120px] overflow-hidden text-ellipsis text-[#32423D] font-semibold" title={t.ProjetistaPlanejado}>{t.ProjetistaPlanejado}</td>
                                <td className="px-2 py-1 border-r border-gray-200 text-center text-xs">
                                    {t.CaminhoIsometrico ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <a href={t.CaminhoIsometrico} target="_blank" rel="noreferrer" className="text-[#32423D] hover:text-[#32423D]/70 hover:underline flex-1 truncate font-medium" title={t.CaminhoIsometrico}>Baixar PDF</a>
                                            <button onClick={() => confirmClearIso(t.IdTag, t.Tag)} className="text-red-500 hover:text-red-700 bg-red-50 px-1 rounded border border-red-200" title="Remover Associação">✖</button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer text-[#32423D] hover:text-[#32423D]/70 flex items-center justify-center gap-1 font-medium bg-[#E0E800]/20 px-1 py-0.5 rounded border border-[#E0E800]/50">
                                            <Edit3 size={12} /> Associar
                                            <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleUploadIso(e, t.IdTag, t.Tag)} />
                                        </label>
                                    )}
                                </td>

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
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#32423D]/40 rounded px-1 text-gray-700"
                                                />
                                            </td>
                                            <td className="px-0.5 py-1 border-r border-gray-200 text-center">
                                                <input 
                                                    type="date" 
                                                    value={brToIso(pf)} 
                                                    onChange={e => handleInlineDateChange(t.IdTag, s, 'PlanejadoFinal', e.target.value)}
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#32423D]/40 rounded px-1 text-gray-700"
                                                />
                                            </td>
                                            <td className="px-0.5 py-1 border-r border-gray-200 text-center">
                                                <input 
                                                    type="date" 
                                                    value={brToIso(ri)} 
                                                    onChange={e => handleInlineDateChange(t.IdTag, s, 'RealizadoInicio', e.target.value)}
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#32423D]/40 rounded px-1 text-gray-700 font-bold"
                                                />
                                            </td>
                                            <td className="px-0.5 py-1 border-r border-gray-200 text-center">
                                                <input 
                                                    type="date" 
                                                    value={brToIso(rf)} 
                                                    onChange={e => handleInlineDateChange(t.IdTag, s, 'RealizadoFinal', e.target.value)}
                                                    className="w-[110px] text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-[#32423D]/40 rounded px-1 text-gray-700 font-bold"
                                                />
                                            </td>
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
