import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, Filter, X, Loader, TagIcon, Scissors, Wrench, 
    Flame, Paintbrush, HardHat, AlertTriangle, CalendarDays, ArrowRight
} from 'lucide-react';

const API_BASE = '/api';

interface GlobalTag {
    IdTag: number;
    Tag: string;
    DescTag: string | null;
    DataPrevisao: string | null;
    Projeto: string | null;
    ProjetoDescricao: string | null;
    ProjetoFinalizado: string | null;
    [key: string]: any;
}

const SECTORS = [
    { k: 'Corte', l: 'Corte', c: 'bg-blue-500' },
    { k: 'Dobra', l: 'Dobra', c: 'bg-purple-500' },
    { k: 'Solda', l: 'Solda', c: 'bg-red-500' },
    { k: 'Pintura', l: 'Pintura', c: 'bg-amber-500' },
    { k: 'Montagem', l: 'Montagem', c: 'bg-emerald-500' }
] as const;

export default function VisaoGeralTagsGlobais({ onVoltar }: { onVoltar?: () => void }) {
    const [tags, setTags] = useState<GlobalTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [fProjeto, setFProjeto] = useState('');
    const [fTag, setFTag] = useState('');
    const [fSetor, setFSetor] = useState('');
    const [fDataPrevIni, setFDataPrevIni] = useState('');
    const [fDataPrevFim, setFDataPrevFim] = useState('');
    const [fDataPlanIni, setFDataPlanIni] = useState('');
    const [fDataPlanFim, setFDataPlanFim] = useState('');
    const [fDataRealIni, setFDataRealIni] = useState('');
    const [fDataRealFim, setFDataRealFim] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE}/visao-geral/tags-globais`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setTags(d.data);
                else setError(d.message);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const titleEl = document.getElementById('main-page-title');
        let oldTitle = '';
        if (titleEl) {
            oldTitle = titleEl.innerText;
            titleEl.innerText = 'Visão Geral Tags';
        }
        return () => {
            if (titleEl && oldTitle) titleEl.innerText = oldTitle;
        };
    }, []);

    const brToIso = (d: string) => {
        if (!d) return '';
        if (d.includes('-')) return d;
        const [day, month, year] = d.split('/');
        return `${year}-${month}-${day}`;
    };

    const fmt = (d: string) => {
        if (!d) return '';
        if (d.includes('-')) {
            const [y,m,day] = d.split('-');
            return `${day.slice(0,2)}/${m}`;
        }
        if (d.includes('/')) return d.slice(0,5);
        return d;
    };

    const hasOverlappingDates = (
        tag: GlobalTag, sectorFields: string[], 
        filterIni: string, filterFim: string
    ) => {
        if (!filterIni && !filterFim) return true;
        const fIni = filterIni ? new Date(filterIni + 'T00:00:00').getTime() : 0;
        const fFim = filterFim ? new Date(filterFim + 'T23:59:59').getTime() : Infinity;

        // Se tem data informada no filtro, pelo menos UM setor deve cruzar com o periodo
        for (const s of SECTORS) {
            // Só verifica o setor se não houver filtro de setor específico, ou se bater com o filtro
            if (fSetor && fSetor !== s.k) continue;

            const dIniVal = tag[(`PlanejadoInicio${s.k}` as keyof GlobalTag)] as string;
            const dFimVal = tag[(`PlanejadoFinal${s.k}` as keyof GlobalTag)] as string;

            if (dIniVal || dFimVal) {
                const tIni = dIniVal ? new Date(brToIso(dIniVal) + 'T00:00:00').getTime() : 0;
                const tFim = dFimVal ? new Date(brToIso(dFimVal) + 'T23:59:59').getTime() : Infinity;
                if (Math.max(tIni, fIni) <= Math.min(tFim, fFim)) {
                    return true;
                }
            }
        }
        return false;
    };

    const hasOverlappingRealDates = (
        tag: GlobalTag, 
        filterIni: string, filterFim: string
    ) => {
        if (!filterIni && !filterFim) return true;
        const fIni = filterIni ? new Date(filterIni + 'T00:00:00').getTime() : 0;
        const fFim = filterFim ? new Date(filterFim + 'T23:59:59').getTime() : Infinity;

        for (const s of SECTORS) {
            if (fSetor && fSetor !== s.k) continue;
            const dIniVal = tag[(`RealizadoInicio${s.k}` as keyof GlobalTag)] as string;
            const dFimVal = tag[(`RealizadoFinal${s.k}` as keyof GlobalTag)] as string;

            if (dIniVal || dFimVal) {
                const tIni = dIniVal ? new Date(brToIso(dIniVal) + 'T00:00:00').getTime() : 0;
                const tFim = dFimVal ? new Date(brToIso(dFimVal) + 'T23:59:59').getTime() : Infinity;
                if (Math.max(tIni, fIni) <= Math.min(tFim, fFim)) {
                    return true;
                }
            }
        }
        return false;
    };


    const filtered = useMemo(() => {
        return tags.filter(t => {
            if (fProjeto && !(t.Projeto?.toLowerCase().includes(fProjeto.toLowerCase()) || t.ProjetoDescricao?.toLowerCase().includes(fProjeto.toLowerCase()))) return false;
            if (fTag && !(t.Tag?.toLowerCase().includes(fTag.toLowerCase()) || t.DescTag?.toLowerCase().includes(fTag.toLowerCase()))) return false;
            
            // Previsão
            if (fDataPrevIni || fDataPrevFim) {
                if (!t.DataPrevisao) return false;
                const tp = new Date(brToIso(t.DataPrevisao) + 'T00:00:00').getTime();
                if (fDataPrevIni && tp < new Date(fDataPrevIni + 'T00:00:00').getTime()) return false;
                if (fDataPrevFim && tp > new Date(fDataPrevFim + 'T23:59:59').getTime()) return false;
            }

            // Planejamento
            if (fDataPlanIni || fDataPlanFim) {
                if (!hasOverlappingDates(t, [], fDataPlanIni, fDataPlanFim)) return false;
            }

            // Realizado
            if (fDataRealIni || fDataRealFim) {
                if (!hasOverlappingRealDates(t, fDataRealIni, fDataRealFim)) return false;
            }

            // Setor (se filtrar só por setor, mas sem data, tem q ter qtde > 0 no setor)
            if (fSetor && !fDataPlanIni && !fDataPlanFim && !fDataRealIni && !fDataRealFim) {
                const totalSetor = Number(t[`${fSetor}TotalExecutar` as keyof GlobalTag]) || 0;
                if (totalSetor <= 0) return false;
            }

            return true;
        });
    }, [tags, fProjeto, fTag, fSetor, fDataPrevIni, fDataPrevFim, fDataPlanIni, fDataPlanFim, fDataRealIni, fDataRealFim]);

    const limparFiltros = () => {
        setFProjeto(''); setFTag(''); setFSetor('');
        setFDataPrevIni(''); setFDataPrevFim('');
        setFDataPlanIni(''); setFDataPlanFim('');
        setFDataRealIni(''); setFDataRealFim('');
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader className="animate-spin text-indigo-600" size={32} /></div>;
    if (error) return <div className="p-8 flex justify-center text-red-600 font-bold"><AlertTriangle size={24} className="mr-2"/> {error}</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-0 overflow-hidden rounded-xl border border-slate-200 mt-4">
            <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    {onVoltar && (
                        <button onClick={onVoltar} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 mr-2">
                            <ArrowRight className="rotate-180" size={14} /> Voltar
                        </button>
                    )}
                    <div className="bg-white border border-slate-200 rounded-lg flex items-center px-2 py-1.5 shadow-sm w-48">
                        <Search size={14} className="text-slate-400 mr-2" />
                        <div className="relative flex items-center w-full">
    <input type="text" placeholder="Buscar Projeto..." value={fProjeto} onChange={e => setFProjeto(e.target.value)} className="pr-6 bg-transparent border-none outline-none text-xs w-full text-slate-700" />
    {fProjeto && (
        <button onClick={() => setFProjeto('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg flex items-center px-2 py-1.5 shadow-sm w-48">
                        <Search size={14} className="text-slate-400 mr-2" />
                        <div className="relative flex items-center w-full">
    <input type="text" placeholder="Buscar Tag..." value={fTag} onChange={e => setFTag(e.target.value)} className="pr-6 bg-transparent border-none outline-none text-xs w-full text-slate-700" />
    {fTag && (
        <button onClick={() => setFTag('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg flex items-center px-2 py-1.5 shadow-sm">
                        <span className="text-[10px] font-black text-slate-500 uppercase mr-2">Setor:</span>
                        <select value={fSetor} onChange={e => setFSetor(e.target.value)} className="bg-transparent border-none outline-none text-xs text-slate-700 font-bold">
                            <option value="">TODOS</option>
                            <option value="Corte">CORTE</option>
                            <option value="Dobra">DOBRA</option>
                            <option value="Solda">SOLDA</option>
                            <option value="Pintura">PINTURA</option>
                            <option value="Montagem">MONTAGEM</option>
                        </select>
                    </div>
                    <button onClick={limparFiltros} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto border border-slate-200 shadow-sm flex items-center gap-1">
                        <X size={14} /> Limpar
                    </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Previsão:</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataPrevIni} onChange={e => setFDataPrevIni(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataPrevIni && (
        <button onClick={() => setFDataPrevIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                        <span className="text-[9px] text-slate-400 font-bold">até</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataPrevFim} onChange={e => setFDataPrevFim(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataPrevFim && (
        <button onClick={() => setFDataPrevFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Planejamento:</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataPlanIni} onChange={e => setFDataPlanIni(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataPlanIni && (
        <button onClick={() => setFDataPlanIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                        <span className="text-[9px] text-slate-400 font-bold">até</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataPlanFim} onChange={e => setFDataPlanFim(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataPlanFim && (
        <button onClick={() => setFDataPlanFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                        <span className="text-[9px] font-black text-slate-500 uppercase">Realizado:</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataRealIni} onChange={e => setFDataRealIni(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataRealIni && (
        <button onClick={() => setFDataRealIni('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                        <span className="text-[9px] text-slate-400 font-bold">até</span>
                        <div className="relative flex items-center w-full">
    <input type="date" value={fDataRealFim} onChange={e => setFDataRealFim(e.target.value)} className="pr-6 bg-white border border-slate-200 rounded outline-none text-[10px] px-1 py-0.5 shadow-sm" />
    {fDataRealFim && (
        <button onClick={() => setFDataRealFim('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
            <X size={14} />
        </button>
    )}
</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#567469] text-white bg-[#567469] text-white text-white bg-[#567469] sticky top-0 z-10 shadow-sm border-b border-white/20">
                        <tr>
                            <th className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider border-r border-white/20 min-w-[200px]">Tag / Descrição</th>
                            <th className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider border-r border-white/20 min-w-[200px]">Projeto (Segundo Plano)</th>
                            <th className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-wider border-r border-white/20">Previsão</th>
                            {SECTORS.map(s => {
                                if (fSetor && fSetor !== s.k) return null;
                                return (
                                    <th key={s.k} className="px-2 py-3 text-[10px] font-black text-white uppercase tracking-wider border-r border-white/20 text-center min-w-[120px]">
                                        <div className="flex items-center justify-center gap-1"><div className={`w-2 h-2 rounded-full ${s.c}`}></div> {s.l}</div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map(t => (
                            <tr key={t.IdTag} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border-r border-slate-100">
                                    <div className="font-black text-slate-800 text-[13px]">{t.Tag}</div>
                                    <div className="text-[11px] text-slate-500 line-clamp-1">{t.DescTag}</div>
                                </td>
                                <td className="px-4 py-3 border-r border-slate-100 bg-slate-50/50">
                                    <div className="font-bold text-slate-700 text-xs">{t.Projeto}</div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1">{t.ProjetoDescricao}</div>
                                </td>
                                <td className="px-4 py-3 border-r border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">{t.DataPrevisao || '—'}</span>
                                </td>
                                {SECTORS.map(s => {
                                    if (fSetor && fSetor !== s.k) return null;
                                    const pIni = t[`PlanejadoInicio${s.k}` as keyof GlobalTag] as string;
                                    const pFim = t[`PlanejadoFinal${s.k}` as keyof GlobalTag] as string;
                                    const rIni = t[`RealizadoInicio${s.k}` as keyof GlobalTag] as string;
                                    const rFim = t[`RealizadoFinal${s.k}` as keyof GlobalTag] as string;
                                    const total = Number(t[`${s.k}TotalExecutar` as keyof GlobalTag]) || 0;
                                    const pct = Number(t[`${s.k}Percentual` as keyof GlobalTag]) || 0;
                                    const exec = Number(t[`${s.k}TotalExecutado` as keyof GlobalTag]) || 0;
                                    
                                    if (total === 0) return <td key={s.k} className="px-2 py-3 border-r border-slate-100 bg-slate-50/30 text-center text-slate-300 text-xs">—</td>;
                                    
                                    return (
                                        <td key={s.k} className="px-2 py-2 border-r border-slate-100">
                                            <div className="flex flex-col gap-1 w-full text-[9px]">
                                                {fSetor && (
                                                    <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded border border-slate-100 mb-1">
                                                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[8px]">Executado: <span className="text-slate-800 text-[9px]">{exec}</span></span>
                                                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">Total: <span className="text-slate-600 text-[9px]">{total}</span></span>
                                                    </div>
                                                )}
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <div className={`h-full ${s.c}`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                                {(pIni || pFim) && (
                                                    <div className="flex justify-between items-center bg-blue-50/50 px-1 rounded border border-blue-100 mt-0.5">
                                                        <span className="font-bold text-slate-400 text-[8px]">P:</span>
                                                        <span className="font-bold text-slate-600 text-[8px]">{fmt(pIni)} <ArrowRight size={6} className="inline text-slate-400"/> {fmt(pFim)}</span>
                                                    </div>
                                                )}
                                                {(rIni || rFim) && (
                                                    <div className="flex justify-between items-center bg-emerald-50/50 px-1 rounded border border-emerald-100 mt-0.5">
                                                        <span className="font-bold text-slate-400 text-[8px]">R:</span>
                                                        <span className="font-bold text-emerald-700 text-[8px]">{fmt(rIni)} <ArrowRight size={6} className="inline text-emerald-400"/> {fmt(rFim)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={10} className="text-center py-12 text-slate-400 font-medium text-sm">
                                    Nenhuma tag encontrada para os filtros aplicados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 border-t border-slate-200 shrink-0 text-right">
                Exibindo {filtered.length} tags de {tags.length} totais.
            </div>
        </div>
    );
}
