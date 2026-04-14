import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Search, Filter, X, Loader, Layers, ChevronRight, ArrowLeft,
    AlertTriangle, Calendar, Building2, MapPin, FileText, Eye,
    CheckCircle2, Clock, TrendingUp, BarChart3, Scissors, Wrench,
    Flame, Paintbrush, HardHat, Package, ChevronDown, ChevronUp,
    GanttChartSquare, List
} from 'lucide-react';

const API_BASE = '/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjetoAcomp {
    IdProjeto: number;
    Projeto: string;
    DescProjeto: string | null;
    DescEmpresa: string | null;
    Estado: string | null;
    Observacao: string | null;
    StatusProj: string;
    DescStatus: string | null;
    DataPrevisao: string | null;
    liberado: string | null;
    Finalizado: string | null;
    PlanejadoInicioAPROVACAO: string | null;
    PlanejadoFinalAPROVACAO: string | null;
    RealizadoInicioAPROVACAO: string | null;
    RealizadoFinalAPROVACAO: string | null;
    RealizadoInicioExpedicao: string | null;
    RealizadoFinalExpedicao: string | null;
    TotalCorte: number; ExecCorte: number; PctCorte: number;
    TotalDobra: number; ExecDobra: number; PctDobra: number;
    TotalSolda: number; ExecSolda: number; PctSolda: number;
    TotalPintura: number; ExecPintura: number; PctPintura: number;
    TotalMontagem: number; ExecMontagem: number; PctMontagem: number;
    QtdeTags: number;
    SumQtdeTag: number;
}

interface TagDetalhe {
    IdTag: number;
    Tag: string;
    DescTag: string | null;
    QtdeTag: number;
    Finalizado: string | null;
    CorteTotalExecutar: number; CorteTotalExecutado: number; CortePercentual: number;
    PlanejadoInicioCorte: string | null; PlanejadoFinalCorte: string | null;
    RealizadoInicioCorte: string | null; RealizadoFinalCorte: string | null;
    DobraTotalExecutar: number; DobraTotalExecutado: number; DobraPercentual: number;
    PlanejadoInicioDobra: string | null; PlanejadoFinalDobra: string | null;
    RealizadoInicioDobra: string | null; RealizadoFinalDobra: string | null;
    SoldaTotalExecutar: number; SoldaTotalExecutado: number; SoldaPercentual: number;
    PlanejadoInicioSolda: string | null; PlanejadoFinalSolda: string | null;
    RealizadoInicioSolda: string | null; RealizadoFinalSolda: string | null;
    PinturaTotalExecutar: number; PinturaTotalExecutado: number; PinturaPercentual: number;
    PlanejadoInicioPintura: string | null; PlanejadoFinalPintura: string | null;
    RealizadoInicioPintura: string | null; RealizadoFinalPintura: string | null;
    MontagemTotalExecutar: number; MontagemTotalExecutado: number; MontagemPercentual: number;
    PlanejadoInicioMontagem: string | null; PlanejadoFinalMontagem: string | null;
    RealizadoInicioMontagem: string | null; RealizadoFinalMontagem: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SETORES = [
    { key: 'Corte',    label: 'Corte',    icon: Scissors,   color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', solid: '#2563eb' },
    { key: 'Dobra',    label: 'Dobra',    icon: Wrench,     color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', solid: '#7c3aed' },
    { key: 'Solda',    label: 'Solda',    icon: Flame,      color: '#ef4444', bg: '#fef2f2', border: '#fecaca', solid: '#dc2626' },
    { key: 'Pintura',  label: 'Pintura',  icon: Paintbrush, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', solid: '#d97706' },
    { key: 'Montagem', label: 'Montagem', icon: HardHat,    color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', solid: '#059669' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseDate = (d: string | null): Date | null => {
    if (!d) return null;
    // Handle dd/mm/yyyy
    if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        const dt = new Date(Number(year), Number(month) - 1, Number(day));
        return isNaN(dt.getTime()) ? null : dt;
    }
    // ISO or other
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
};

const fmtDate = (d: string | null) => {
    if (!d) return '—';
    if (d.includes('/')) return d;
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
};

const fmtDateShort = (dt: Date | null) => {
    if (!dt) return '';
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status, desc, finalizado }: { status: string; desc: string | null; finalizado?: string | null }) => {
    if (finalizado === 'C') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase bg-slate-100 border-slate-300 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Finalizado
            </span>
        );
    }
    const map: Record<string, { bg: string; text: string; dot: string }> = {
        AT: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        PA: { bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-700',   dot: 'bg-amber-500' },
        CA: { bg: 'bg-red-50 border-red-200',        text: 'text-red-700',     dot: 'bg-red-500' },
        FI: { bg: 'bg-slate-50 border-slate-200',    text: 'text-slate-600',   dot: 'bg-slate-400' },
    };
    const s = map[status] ?? { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {desc || status}
        </span>
    );
};

const MiniBar = ({ pct, color }: { pct: number; color: string }) => (
    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
);

const SetorCell = ({ total, exec, pct, color }: { total: number; exec: number; pct: number; color: string }) => {
    const active = total > 0;
    return (
        <div className={`flex flex-col gap-0.5 px-1 ${!active ? 'opacity-30' : ''}`} style={{ minWidth: 68 }}>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold" style={{ color }}>{exec}</span>
                <span className="text-[10px] text-slate-400">/{total}</span>
            </div>
            <MiniBar pct={pct} color={color} />
            <span className="text-[9px] text-slate-500 text-center">{pct}%</span>
        </div>
    );
};

// ─── GANTT CHART ─────────────────────────────────────────────────────────────

interface GanttRow {
    tagId: number;
    tagLabel: string;
    tagDesc: string | null;
    finalizado: boolean;
    bars: {
        setor: string;
        color: string;
        solidColor: string;
        planStart: Date | null;
        planEnd: Date | null;
        realStart: Date | null;
        realEnd: Date | null;
        pct: number;
        total: number;
        exec: number;
        active: boolean;
    }[];
}

function GanttChart({ tags }: { tags: TagDetalhe[] }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Compute global date range from all tags
    const allDates: Date[] = [];
    tags.forEach(tag => {
        SETORES.forEach(s => {
            const pIni = parseDate((tag as any)[`PlanejadoInicio${s.key}`]);
            const pFin = parseDate((tag as any)[`PlanejadoFinal${s.key}`]);
            const rIni = parseDate((tag as any)[`RealizadoInicio${s.key}`]);
            const rFin = parseDate((tag as any)[`RealizadoFinal${s.key}`]);
            if (pIni) allDates.push(pIni);
            if (pFin) allDates.push(pFin);
            if (rIni) allDates.push(rIni);
            if (rFin) allDates.push(rFin);
        });
    });

    // Include today in range so the marker always fits
    allDates.push(today);

    if (allDates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <GanttChartSquare size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Sem datas planejadas ou realizadas para exibir o Gantt</p>
                <p className="text-xs mt-1 opacity-70">Cadastre datas nas OS & Tags para visualizar o cronograma</p>
            </div>
        );
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // Add padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 3);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    const dayPct = (d: Date) => {
        const days = Math.ceil((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        return (days / totalDays) * 100;
    };
    const spanPct = (s: Date, e: Date) => {
        const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return (days / totalDays) * 100;
    };

    // Build gantt rows
    const rows: GanttRow[] = tags.map(tag => ({
        tagId: tag.IdTag,
        tagLabel: tag.Tag,
        tagDesc: tag.DescTag,
        finalizado: tag.Finalizado === 'C',
        bars: SETORES.map(s => ({
            setor: s.label,
            color: s.color,
            solidColor: s.solid,
            planStart: parseDate((tag as any)[`PlanejadoInicio${s.key}`]),
            planEnd: parseDate((tag as any)[`PlanejadoFinal${s.key}`]),
            realStart: parseDate((tag as any)[`RealizadoInicio${s.key}`]),
            realEnd: parseDate((tag as any)[`RealizadoFinal${s.key}`]),
            pct: Number((tag as any)[`${s.key}Percentual`]) || 0,
            total: Number((tag as any)[`${s.key}TotalExecutar`]) || 0,
            exec: Number((tag as any)[`${s.key}TotalExecutado`]) || 0,
            active: (Number((tag as any)[`${s.key}TotalExecutar`]) || 0) > 0,
        }))
    }));

    // Generate month tick marks
    const months: { label: string; leftPct: number }[] = [];
    const cursor = new Date(minDate);
    cursor.setDate(1);
    while (cursor <= maxDate) {
        const pct = dayPct(cursor);
        if (pct >= 0 && pct <= 100) {
            months.push({
                label: cursor.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                leftPct: pct,
            });
        }
        cursor.setMonth(cursor.getMonth() + 1);
    }

    // Today line
    const todayPct = dayPct(today);

    const ROW_HEIGHT = 36; // px per setor row
    const LABEL_WIDTH = 160; // px

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Legend */}
            <div className="shrink-0 flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 flex-wrap">
                <div className="flex items-center gap-1.5">
                    <div className="w-8 h-3 rounded-sm bg-slate-300 opacity-60" style={{ border: '1px dashed #94a3b8' }} />
                    <span className="text-[10px] text-slate-500 font-semibold">Planejado</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-8 h-3 rounded-sm" style={{ background: 'linear-gradient(90deg, #3b82f6 60%, #93c5fd 60%)' }} />
                    <span className="text-[10px] text-slate-500 font-semibold">Realizado (% exec)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-px h-4 bg-red-500" />
                    <span className="text-[10px] text-slate-500 font-semibold">Hoje</span>
                </div>
                {SETORES.map(s => (
                    <div key={s.key} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <div style={{ minWidth: LABEL_WIDTH + 800 }}>
                    {/* Header: month ticks */}
                    <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
                        <div className="shrink-0 bg-slate-100 border-r border-slate-200 flex items-center px-3" style={{ width: LABEL_WIDTH }}>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tag / Setor</span>
                        </div>
                        <div className="flex-1 relative h-8">
                            {months.map((m, i) => (
                                <div key={i} className="absolute top-0 h-full flex items-center" style={{ left: `${m.leftPct}%` }}>
                                    <div className="absolute top-0 h-full w-px bg-slate-200" />
                                    <span className="pl-1 text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">{m.label}</span>
                                </div>
                            ))}
                            {/* Today marker in header */}
                            {todayPct >= 0 && todayPct <= 100 && (
                                <div className="absolute top-0 h-full flex items-center" style={{ left: `${todayPct}%` }}>
                                    <div className="absolute top-0 h-full w-0.5 bg-red-500 opacity-80" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rows */}
                    {rows.map((row) => {
                        const activeSetores = row.bars.filter(b => b.active);
                        return (
                            <div key={row.tagId} className={`border-b ${row.finalizado ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100'}`}>
                                {/* Tag label row */}
                                <div className="flex items-stretch" style={{ minHeight: 28 }}>
                                    <div
                                        className={`shrink-0 flex items-center gap-2 px-3 border-r ${row.finalizado ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`}
                                        style={{ width: LABEL_WIDTH }}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${row.finalizado ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                            <Package size={10} className="text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-black text-slate-800 truncate leading-tight">{row.tagLabel}</div>
                                            {row.tagDesc && <div className="text-[9px] text-slate-400 truncate leading-tight">{row.tagDesc}</div>}
                                        </div>
                                        {row.finalizado && (
                                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0 ml-auto" />
                                        )}
                                    </div>
                                    {/* No chart line at tag level - just filler */}
                                    <div className="flex-1 relative bg-white/50">
                                        {/* Grid lines */}
                                        {months.map((m, i) => (
                                            <div key={i} className="absolute top-0 h-full w-px bg-slate-100" style={{ left: `${m.leftPct}%` }} />
                                        ))}
                                        {todayPct >= 0 && todayPct <= 100 && (
                                            <div className="absolute top-0 h-full w-0.5 bg-red-400 opacity-30" style={{ left: `${todayPct}%` }} />
                                        )}
                                    </div>
                                </div>

                                {/* Setor bars */}
                                {activeSetores.map((bar) => {
                                    const hasPlan = bar.planStart && bar.planEnd;
                                    const hasReal = bar.realStart;
                                    const realEnd = bar.realEnd || (hasReal ? today : null);

                                    return (
                                        <div key={bar.setor} className="flex items-stretch" style={{ height: ROW_HEIGHT }}>
                                            {/* Setor label */}
                                            <div
                                                className="shrink-0 flex items-center gap-1.5 px-3 border-r border-slate-200 pl-8"
                                                style={{ width: LABEL_WIDTH, backgroundColor: `${bar.color}10` }}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bar.color }} />
                                                <span className="text-[9px] font-bold" style={{ color: bar.color }}>{bar.setor}</span>
                                                <span className="text-[9px] text-slate-400 ml-auto">{bar.exec}/{bar.total}</span>
                                            </div>

                                            {/* Bar area */}
                                            <div className="flex-1 relative" style={{ backgroundColor: `${bar.color}05` }}>
                                                {/* Grid lines */}
                                                {months.map((m, i) => (
                                                    <div key={i} className="absolute top-0 h-full w-px bg-slate-100" style={{ left: `${m.leftPct}%` }} />
                                                ))}
                                                {/* Today line */}
                                                {todayPct >= 0 && todayPct <= 100 && (
                                                    <div className="absolute top-0 h-full w-0.5 bg-red-400 opacity-25" style={{ left: `${todayPct}%`, zIndex: 2 }} />
                                                )}

                                                {/* Planned bar */}
                                                {hasPlan && (
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 rounded flex items-center overflow-hidden"
                                                        style={{
                                                            left: `${dayPct(bar.planStart!)}%`,
                                                            width: `${spanPct(bar.planStart!, bar.planEnd!)}%`,
                                                            height: 14,
                                                            backgroundColor: `${bar.color}25`,
                                                            border: `1.5px dashed ${bar.color}80`,
                                                            zIndex: 3,
                                                        }}
                                                        title={`Planejado: ${fmtDate((bar.planStart!).toISOString())} → ${fmtDate((bar.planEnd!).toISOString())}`}
                                                    >
                                                        <span className="px-1 text-[8px] font-bold truncate" style={{ color: bar.solidColor }}>
                                                            {fmtDateShort(bar.planStart)} → {fmtDateShort(bar.planEnd)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Realized bar */}
                                                {hasReal && realEnd && (
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 rounded overflow-hidden flex items-center"
                                                        style={{
                                                            left: `${dayPct(bar.realStart!)}%`,
                                                            width: `${spanPct(bar.realStart!, realEnd)}%`,
                                                            height: 20,
                                                            zIndex: 4,
                                                            backgroundColor: `${bar.color}30`,
                                                            border: `1.5px solid ${bar.color}`,
                                                        }}
                                                        title={`Realizado: ${fmtDate((bar.realStart!).toISOString())} → ${bar.realEnd ? fmtDate((bar.realEnd).toISOString()) : 'Em andamento'} (${bar.pct}%)`}
                                                    >
                                                        {/* Progress fill */}
                                                        <div
                                                            className="absolute top-0 left-0 h-full transition-all"
                                                            style={{
                                                                width: `${bar.pct}%`,
                                                                backgroundColor: bar.color,
                                                                opacity: 0.85,
                                                            }}
                                                        />
                                                        <span className="relative z-10 px-1.5 text-[9px] font-black text-white truncate leading-none drop-shadow">
                                                            {bar.pct}% · {bar.exec}/{bar.total}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* No dates fallback: just a progress indicator */}
                                                {!hasPlan && !hasReal && bar.pct > 0 && (
                                                    <div className="absolute top-1/2 -translate-y-1/2 left-2 right-2 h-4 rounded overflow-hidden bg-slate-100 border border-slate-200" style={{ zIndex: 3 }}>
                                                        <div className="h-full transition-all" style={{ width: `${bar.pct}%`, backgroundColor: bar.color, opacity: 0.7 }} />
                                                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600">{bar.pct}% (sem datas)</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── TAG DETAIL SECTION (List View) ──────────────────────────────────────────

function TagDetailSection({ tag }: { tag: TagDetalhe }) {
    const [expanded, setExpanded] = useState(false);
    const isFinished = tag.Finalizado === 'C';

    return (
        <div className={`border rounded-xl overflow-hidden transition-all ${isFinished ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
            {/* Tag Header Row */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors text-left"
            >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Package size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-800">{tag.Tag}</span>
                        {isFinished && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                                <CheckCircle2 size={8} /> FINALIZADA
                            </span>
                        )}
                    </div>
                    {tag.DescTag && <p className="text-xs text-slate-500 truncate">{tag.DescTag}</p>}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Mini setor bars inline */}
                    {SETORES.map(s => {
                        const total = Number((tag as any)[`${s.key}TotalExecutar`]) || 0;
                        const exec  = Number((tag as any)[`${s.key}TotalExecutado`]) || 0;
                        const pct   = Number((tag as any)[`${s.key}Percentual`]) || 0;
                        if (total === 0) return null;
                        return (
                            <div key={s.key} className="flex flex-col items-center gap-0.5" style={{ minWidth: 44 }}>
                                <span className="text-[8px] font-bold text-slate-500">{s.label.slice(0,5)}</span>
                                <MiniBar pct={pct} color={s.color} />
                                <span className="text-[8px] font-bold" style={{ color: s.color }}>{pct}%</span>
                            </div>
                        );
                    })}
                    <div className="ml-2">
                        {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                </div>
            </button>

            {/* Expanded Detail */}
            {expanded && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {SETORES.map(s => {
                            const total = Number((tag as any)[`${s.key}TotalExecutar`]) || 0;
                            const exec  = Number((tag as any)[`${s.key}TotalExecutado`]) || 0;
                            const pct   = Number((tag as any)[`${s.key}Percentual`]) || 0;
                            const plIni = (tag as any)[`PlanejadoInicio${s.key}`];
                            const plFin = (tag as any)[`PlanejadoFinal${s.key}`];
                            const reIni = (tag as any)[`RealizadoInicio${s.key}`];
                            const reFin = (tag as any)[`RealizadoFinal${s.key}`];
                            const IconComp = s.icon;
                            return (
                                <div key={s.key} className="rounded-xl p-3 border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <IconComp size={13} style={{ color: s.color }} />
                                        <span className="text-xs font-black" style={{ color: s.color }}>{s.label}</span>
                                    </div>
                                    <div className="flex items-end gap-1 mb-1.5">
                                        <span className="text-lg font-black" style={{ color: s.color }}>{exec}</span>
                                        <span className="text-xs text-slate-500 mb-0.5">/ {total}</span>
                                    </div>
                                    <MiniBar pct={pct} color={s.color} />
                                    <div className="mt-1.5 space-y-0.5">
                                        <div className="flex justify-between text-[9px] text-slate-500">
                                            <span className="font-semibold">Pl. Ini:</span>
                                            <span>{fmtDate(plIni)}</span>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-500">
                                            <span className="font-semibold">Pl. Fin:</span>
                                            <span>{fmtDate(plFin)}</span>
                                        </div>
                                        <div className="flex justify-between text-[9px]" style={{ color: s.color }}>
                                            <span className="font-semibold">Re. Ini:</span>
                                            <span>{fmtDate(reIni)}</span>
                                        </div>
                                        <div className="flex justify-between text-[9px]" style={{ color: s.color }}>
                                            <span className="font-semibold">Re. Fin:</span>
                                            <span>{fmtDate(reFin)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── DETAIL VIEW (Project → Tags) ────────────────────────────────────────────

function DetalheProjetoView({ projeto, onVoltar }: { projeto: ProjetoAcomp; onVoltar: () => void }) {
    const [tags, setTags] = useState<TagDetalhe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'lista' | 'gantt'>('gantt');

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`${API_BASE}/acompanhamento/projeto/${projeto.IdProjeto}/tags`)
            .then(r => r.json())
            .then(d => {
                if (d.success) setTags(d.data);
                else setError(d.message);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [projeto.IdProjeto]);

    // Totals
    const totais = useMemo(() => {
        const t = { Corte: [0,0], Dobra: [0,0], Solda: [0,0], Pintura: [0,0], Montagem: [0,0] };
        tags.forEach(tag => {
            t.Corte[0]    += Number(tag.CorteTotalExecutar) || 0;
            t.Corte[1]    += Number(tag.CorteTotalExecutado) || 0;
            t.Dobra[0]    += Number(tag.DobraTotalExecutar) || 0;
            t.Dobra[1]    += Number(tag.DobraTotalExecutado) || 0;
            t.Solda[0]    += Number(tag.SoldaTotalExecutar) || 0;
            t.Solda[1]    += Number(tag.SoldaTotalExecutado) || 0;
            t.Pintura[0]  += Number(tag.PinturaTotalExecutar) || 0;
            t.Pintura[1]  += Number(tag.PinturaTotalExecutado) || 0;
            t.Montagem[0] += Number(tag.MontagemTotalExecutar) || 0;
            t.Montagem[1] += Number(tag.MontagemTotalExecutado) || 0;
        });
        return t;
    }, [tags]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 font-sans overflow-hidden">
            {/* Header */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onVoltar}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                    >
                        <ArrowLeft size={15} /> Voltar
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
                                <Eye size={18} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 leading-tight">
                                    {projeto.Projeto}
                                    {projeto.DescProjeto && <span className="text-slate-500 font-medium ml-2">— {projeto.DescProjeto}</span>}
                                </h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {projeto.DescEmpresa && (
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Building2 size={10} /> {projeto.DescEmpresa}
                                        </span>
                                    )}
                                    <StatusBadge status={projeto.StatusProj} desc={projeto.DescStatus} />
                                    <span className="text-xs text-slate-400">#{projeto.IdProjeto}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-0.5 gap-0.5">
                        <button
                            onClick={() => setViewMode('lista')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'lista'
                                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <List size={13} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewMode === 'gantt'
                                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <GanttChartSquare size={13} /> Gantt
                        </button>
                    </div>

                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        {tags.length} Tag{tags.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Totals Bar */}
                <div className="mt-4 grid grid-cols-5 gap-3">
                    {SETORES.map(s => {
                        const tot = totais[s.key as keyof typeof totais];
                        const pct = tot[0] > 0 ? Math.round((tot[1] / tot[0]) * 100) : 0;
                        const IconComp = s.icon;
                        return (
                            <div key={s.key} className="flex flex-col gap-1.5 p-3 rounded-xl border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <IconComp size={12} style={{ color: s.color }} />
                                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: s.color }}>{s.label}</span>
                                    </div>
                                    <span className="text-xs font-black" style={{ color: s.color }}>{pct}%</span>
                                </div>
                                <MiniBar pct={pct} color={s.color} />
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-black text-slate-700">{tot[1]}</span>
                                    <span className="text-[10px] text-slate-400">/ {tot[0]}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {loading && (
                    <div className="flex justify-center py-16">
                        <Loader className="animate-spin text-blue-500" size={28} />
                    </div>
                )}
                {error && (
                    <div className="m-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}
                {!loading && !error && tags.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Layers size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Nenhuma tag encontrada para este projeto</p>
                    </div>
                )}

                {!loading && !error && tags.length > 0 && (
                    <>
                        {viewMode === 'lista' && (
                            <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                                <div className="flex flex-col gap-2">
                                    {tags.map(tag => <TagDetailSection key={tag.IdTag} tag={tag} />)}
                                </div>
                            </div>
                        )}
                        {viewMode === 'gantt' && (
                            <div className="h-full flex flex-col">
                                <GanttChart tags={tags} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── MAIN LIST VIEW ──────────────────────────────────────────────────────────

export default function AcompanhamentoGeralPage() {
    const [projetos, setProjetos] = useState<ProjetoAcomp[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ProjetoAcomp | null>(null);
    const [detalhe, setDetalhe] = useState<ProjetoAcomp | null>(null);

    const [fSearch, setFSearch] = useState('');
    const [fSearchInput, setFSearchInput] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [fModo, setFModo] = useState<'ativos' | 'finalizados' | 'todos'>('ativos');
    const [showObs, setShowObs] = useState<number | null>(null);
    const [fDataDe, setFDataDe] = useState('');
    const [fDataAte, setFDataAte] = useState('');

    // Inline edit: tracks which project's Observacao is being edited and the draft value
    const [obsEdit, setObsEdit] = useState<{ id: number; value: string } | null>(null);
    const obsInputRef = useRef<HTMLInputElement>(null);

    const saveObservacao = useCallback(async (idProjeto: number, value: string) => {
        // Optimistic local update
        setProjetos(prev => prev.map(p =>
            p.IdProjeto === idProjeto ? { ...p, Observacao: value || null } : p
        ));
        setObsEdit(null);
        try {
            const res = await fetch(`${API_BASE}/acompanhamento/projeto/${idProjeto}/observacao`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observacao: value || null }),
            });
            if (!res.ok) {
                const d = await res.json();
                console.error('Erro ao salvar observação:', d.message);
            }
        } catch (e: any) {
            console.error('Erro ao salvar observação:', e.message);
        }
    }, []);

    const fetchDados = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (fSearch) params.set('search', fSearch);
            if (fStatus) params.set('status', fStatus);
            if (fDataDe) params.set('dataFinalDe', fDataDe);
            if (fDataAte) params.set('dataFinalAte', fDataAte);
            if (fModo === 'finalizados') { params.set('finalizados', '1'); }
            else if (fModo === 'todos') { params.set('finalizados', '1'); params.set('liberados', '1'); }

            const res = await fetch(`${API_BASE}/acompanhamento/projetos?${params}`);
            if (!res.ok) throw new Error('Erro ao buscar projetos');
            const result = await res.json();
            if (result.success) setProjetos(result.data);
            else throw new Error(result.message);
        } catch (e: any) {
            setError(e.message || 'Erro na requisição');
        } finally {
            setLoading(false);
        }
    }, [fSearch, fStatus, fModo, fDataDe, fDataAte]);

    useEffect(() => { fetchDados(); }, [fetchDados]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setFSearch(fSearchInput);
    };

    // If detalhe mode, render the detail view
    if (detalhe) {
        return <DetalheProjetoView projeto={detalhe} onVoltar={() => { setDetalhe(null); }} />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 font-sans overflow-hidden">

            {/* ── Header ── */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-800 leading-tight">Acompanhamento Geral</h1>
                            <p className="text-[11px] text-slate-500">Visão consolidada por projeto · Gantt por Tag</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {selected && (
                            <button
                                id="btn-detalhar-projeto"
                                onClick={() => setDetalhe(selected)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg hover:opacity-90 transition-all"
                            >
                                <GanttChartSquare size={15} />
                                Ver Gantt
                                <ChevronRight size={14} />
                            </button>
                        )}
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projetos</div>
                            <div className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{projetos.length}</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {/* Busca textual */}
                    <form onSubmit={handleSearch} className="relative" style={{ minWidth: 200, maxWidth: 300 }}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            id="acomp-search"
                            type="text"
                            placeholder="Buscar projeto, cliente, estado..."
                            value={fSearchInput}
                            onChange={e => setFSearchInput(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                        />
                        {fSearchInput && (
                            <button type="button" onClick={() => { setFSearchInput(''); setFSearch(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                <X size={12} />
                            </button>
                        )}
                    </form>

                    {/* Status */}
                    <select
                        id="acomp-status"
                        value={fStatus}
                        onChange={e => setFStatus(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                    >
                        <option value="">Todos os Status</option>
                        <option value="AT">Ativo</option>
                        <option value="PA">Parado</option>
                        <option value="CA">Cancelado</option>
                    </select>

                    {/* Intervalo Data Final */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Data Final:</span>
                        <input
                            id="acomp-data-de"
                            type="date"
                            value={fDataDe}
                            onChange={e => setFDataDe(e.target.value)}
                            title="De"
                            className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer"
                        />
                        <span className="text-slate-300 text-xs">—</span>
                        <input
                            id="acomp-data-ate"
                            type="date"
                            value={fDataAte}
                            onChange={e => setFDataAte(e.target.value)}
                            title="Até"
                            className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer"
                        />
                        {(fDataDe || fDataAte) && (
                            <button
                                onClick={() => { setFDataDe(''); setFDataAte(''); }}
                                className="ml-1 text-slate-300 hover:text-red-400 transition-colors"
                                title="Limpar datas"
                            >
                                <X size={11} />
                            </button>
                        )}
                    </div>

                    {/* Modo Ativos/Finalizados/Todos */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
                        {(['ativos', 'finalizados', 'todos'] as const).map(m => (
                            <button key={m} onClick={() => setFModo(m)}
                                className={`px-3 py-2 font-semibold capitalize transition-colors ${fModo === m ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                {m === 'ativos' ? 'Ativos' : m === 'finalizados' ? 'Finalizados' : 'Todos'}
                            </button>
                        ))}
                    </div>

                    {/* Refresh */}
                    <button onClick={fetchDados} title="Atualizar"
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                        <Filter size={14} />
                    </button>
                </div>
            </div>

            {/* ── Selected Banner ── */}
            {selected && (
                <div className="shrink-0 bg-indigo-50 border-b border-indigo-200 px-5 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-indigo-800">
                        <CheckCircle2 size={14} className="text-indigo-500" />
                        <span className="text-xs font-bold">Selecionado:</span>
                        <span className="text-xs font-black">{selected.Projeto}</span>
                        {selected.DescEmpresa && <span className="text-xs text-indigo-500">— {selected.DescEmpresa}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setDetalhe(selected)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                            <GanttChartSquare size={12} /> Ver Gantt
                        </button>
                        <button onClick={() => setSelected(null)} className="text-indigo-400 hover:text-indigo-600">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {error && (
                    <div className="m-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {!loading && projetos.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Layers size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Nenhum projeto encontrado</p>
                    </div>
                )}

                {projetos.length > 0 && (
                    <table className="w-full text-xs border-collapse" style={{ minWidth: 1200 }}>
                        <thead>
                            <tr className="bg-slate-100 sticky top-0 z-10">
                                {/* Identificação */}
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">ID</th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">Projeto</th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">
                                    <span className="flex items-center gap-1"><Building2 size={10} />Cliente</span>
                                </th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">
                                    <span className="flex items-center gap-1"><MapPin size={10} />Estado</span>
                                </th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">
                                    <span className="flex items-center gap-1"><FileText size={10} />Observação</span>
                                </th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">Situação</th>
                                <th className="px-3 py-2.5 text-left font-black text-slate-600 border-b border-slate-200 whitespace-nowrap">
                                    <span className="flex items-center gap-1"><Calendar size={10} />Data Final</span>
                                </th>
                                {/* Aprovação */}
                                <th className="px-2 py-2.5 text-center font-black text-violet-600 border-b border-slate-200 bg-violet-50 whitespace-nowrap" colSpan={4}>
                                    Aprovação
                                </th>
                                {/* Setores */}
                                {SETORES.map(s => (
                                    <th key={s.key} className="px-2 py-2.5 text-center font-black border-b border-slate-200 whitespace-nowrap" style={{ color: s.color, backgroundColor: s.bg }}>
                                        {s.label}
                                    </th>
                                ))}
                                {/* Expedição */}
                                <th className="px-2 py-2.5 text-center font-black text-teal-600 border-b border-slate-200 bg-teal-50 whitespace-nowrap" colSpan={2}>
                                    Expedição (Realizado)
                                </th>
                            </tr>
                            <tr className="bg-slate-50 sticky top-[37px] z-10 border-b border-slate-200">
                                <th colSpan={7} className="px-3 py-1" />
                                {/* Approval sub-headers */}
                                <th className="px-2 py-1 text-[9px] font-semibold text-violet-500 bg-violet-50 whitespace-nowrap">Pl. Início</th>
                                <th className="px-2 py-1 text-[9px] font-semibold text-violet-500 bg-violet-50 whitespace-nowrap">Pl. Final</th>
                                <th className="px-2 py-1 text-[9px] font-semibold text-violet-700 bg-violet-50 whitespace-nowrap">Re. Início</th>
                                <th className="px-2 py-1 text-[9px] font-semibold text-violet-700 bg-violet-50 whitespace-nowrap">Re. Final</th>
                                {SETORES.map(s => <th key={s.key} className="px-2 py-1 text-[9px] font-semibold text-center" style={{ color: s.color, backgroundColor: s.bg }}>Exec/Total</th>)}
                                {/* Expedition sub-headers */}
                                <th className="px-2 py-1 text-[9px] font-semibold text-teal-600 bg-teal-50 whitespace-nowrap">Re. Início</th>
                                <th className="px-2 py-1 text-[9px] font-semibold text-teal-600 bg-teal-50 whitespace-nowrap">Re. Final</th>
                                <th className="px-3 py-1" />
                            </tr>
                        </thead>
                        <tbody>
                            {projetos.map(p => {
                                const isSelected = selected?.IdProjeto === p.IdProjeto;
                                return (
                                    <tr
                                        key={p.IdProjeto}
                                        id={`row-projeto-${p.IdProjeto}`}
                                        onClick={() => setSelected(isSelected ? null : p)}
                                        className={`cursor-pointer border-b transition-all ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-200 shadow-inner'
                                                : 'border-slate-100 hover:bg-blue-50/40'
                                        }`}
                                    >
                                        {/* ID */}
                                        <td className="px-3 py-2.5">
                                            <span className="font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">#{p.IdProjeto}</span>
                                        </td>
                                        {/* Projeto */}
                                        <td className="px-3 py-2.5">
                                            <div className="font-black text-slate-800">{p.Projeto}</div>
                                            {p.DescProjeto && <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{p.DescProjeto}</div>}
                                        </td>
                                        {/* Cliente */}
                                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{p.DescEmpresa || '—'}</td>
                                        {/* Estado */}
                                        <td className="px-3 py-2.5">
                                            {p.Estado
                                                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-[10px] font-bold">{p.Estado}</span>
                                                : <span className="text-slate-300">—</span>}
                                        </td>
                                        {/* Observação — inline editável */}
                                        <td
                                            className="px-2 py-1.5"
                                            onClick={e => e.stopPropagation()}
                                            style={{ minWidth: 160, maxWidth: 220 }}
                                        >
                                            {obsEdit?.id === p.IdProjeto ? (
                                                <input
                                                    ref={obsInputRef}
                                                    autoFocus
                                                    type="text"
                                                    value={obsEdit.value}
                                                    onChange={e => setObsEdit({ id: p.IdProjeto, value: e.target.value })}
                                                    onBlur={() => saveObservacao(p.IdProjeto, obsEdit.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveObservacao(p.IdProjeto, obsEdit.value);
                                                        if (e.key === 'Escape') setObsEdit(null);
                                                    }}
                                                    className="w-full px-2 py-1 text-xs border-2 border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-800 shadow-sm"
                                                    placeholder="Digite a observação..."
                                                />
                                            ) : (
                                                <button
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setObsEdit({ id: p.IdProjeto, value: p.Observacao ?? '' });
                                                    }}
                                                    title={p.Observacao ? `Clique para editar: ${p.Observacao}` : 'Clique para adicionar observação'}
                                                    className={`w-full text-left px-2 py-1 rounded-lg border text-xs transition-all hover:border-blue-300 hover:bg-blue-50 ${
                                                        p.Observacao
                                                            ? 'border-slate-200 bg-slate-50 text-slate-700'
                                                            : 'border-dashed border-slate-200 text-slate-300 hover:text-slate-400'
                                                    }`}
                                                >
                                                    <span className="block truncate">
                                                        {p.Observacao || '+ Adicionar...'}
                                                    </span>
                                                </button>
                                            )}
                                        </td>
                                        {/* Situação */}
                                        <td className="px-3 py-2.5">
                                            <StatusBadge status={p.StatusProj} desc={p.DescStatus} finalizado={p.Finalizado} />
                                        </td>
                                        {/* Data Final */}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <span className={`font-semibold ${p.DataPrevisao ? 'text-slate-700' : 'text-slate-300'}`}>
                                                {fmtDate(p.DataPrevisao)}
                                            </span>
                                        </td>
                                        {/* Aprovação */}
                                        <td className="px-2 py-2.5 text-slate-500 bg-violet-50/30 whitespace-nowrap">{fmtDate(p.PlanejadoInicioAPROVACAO)}</td>
                                        <td className="px-2 py-2.5 text-slate-500 bg-violet-50/30 whitespace-nowrap">{fmtDate(p.PlanejadoFinalAPROVACAO)}</td>
                                        <td className="px-2 py-2.5 font-semibold text-violet-700 bg-violet-50/30 whitespace-nowrap">{fmtDate(p.RealizadoInicioAPROVACAO)}</td>
                                        <td className="px-2 py-2.5 font-semibold text-violet-700 bg-violet-50/30 whitespace-nowrap">{fmtDate(p.RealizadoFinalAPROVACAO)}</td>
                                        {/* Setores */}
                                        {SETORES.map(s => (
                                            <td key={s.key} className="px-2 py-2.5" style={{ backgroundColor: `${s.bg}50` }}>
                                                <SetorCell
                                                    total={Number((p as any)[`Total${s.key}`]) || 0}
                                                    exec={Number((p as any)[`Exec${s.key}`]) || 0}
                                                    pct={Number((p as any)[`Pct${s.key}`]) || 0}
                                                    color={s.color}
                                                />
                                            </td>
                                        ))}
                                        {/* Expedição */}
                                        <td className="px-2 py-2.5 font-semibold text-teal-700 bg-teal-50/30 whitespace-nowrap">{fmtDate(p.RealizadoInicioExpedicao)}</td>
                                        <td className="px-2 py-2.5 font-semibold text-teal-700 bg-teal-50/30 whitespace-nowrap">{fmtDate(p.RealizadoFinalExpedicao)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {loading && (
                    <div className="flex justify-center p-10">
                        <Loader className="animate-spin text-blue-500" size={26} />
                    </div>
                )}
            </div>

            {/* Footer hint */}
            {!selected && projetos.length > 0 && (
                <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                    <GanttChartSquare size={11} /> Clique em uma linha para selecionar o projeto e visualizar o Gantt de produção por Tags.
                </div>
            )}
        </div>
    );
}
