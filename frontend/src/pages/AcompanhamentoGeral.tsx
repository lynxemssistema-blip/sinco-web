import { usePersistentState } from '../hooks/usePersistentState';
import React, { useState, useEffect, useCallback, useMemo, } from "react";
import {
 Search,  X, Loader, Layers, ChevronRight, ArrowLeft,
 AlertTriangle, Calendar, Building2,   Eye,
 CheckCircle2, Scissors, Wrench,
 Flame, Paintbrush, HardHat, Package, ChevronDown, ChevronUp,
 GanttChartSquare, List, LayoutList
} from 'lucide-react';

import { useAppConfig } from '../contexts/AppConfigContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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
 QtdeTags: number;
 DataPrevisao: string | null;
 liberado: string | null;
 Finalizado: string | null;
 DataFinalizado: string | null;
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
 // Setor Dates (Aggregated from tags)
 PlanejadoInicioCorte: string | null; PlanejadoFinalCorte: string | null;
 RealizadoInicioCorte: string | null; RealizadoFinalCorte: string | null;
 PlanejadoInicioDobra: string | null; PlanejadoFinalDobra: string | null;
 RealizadoInicioDobra: string | null; RealizadoFinalDobra: string | null;
 PlanejadoInicioSolda: string | null; PlanejadoFinalSolda: string | null;
 RealizadoInicioSolda: string | null; RealizadoFinalSolda: string | null;
 PlanejadoInicioPintura: string | null; PlanejadoFinalPintura: string | null;
 RealizadoInicioPintura: string | null; RealizadoFinalPintura: string | null;
 PlanejadoInicioMontagem: string | null; PlanejadoFinalMontagem: string | null;
 RealizadoInicioMontagem: string | null; RealizadoFinalMontagem: string | null;
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
 { key: 'Corte', label: 'Corte', icon: Scissors, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', solid: '#2563eb' },
 { key: 'CorteaLaser', label: 'Corte a Laser', icon: Scissors, color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', solid: '#db2777' },
 { key: 'Punsionadeira', label: 'Punsionadeira', icon: Package, color: '#14b8a6', bg: '#f0fdfa', border: '#ccfbf1', solid: '#0d9488' },
 { key: 'Dobra', label: 'Dobra', icon: Wrench, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', solid: '#7c3aed' },
 { key: 'Solda', label: 'Solda', icon: Flame, color: '#ef4444', bg: '#fef2f2', border: '#fecaca', solid: '#dc2626' },
 { key: 'Galvanizar', label: 'Galvanizar', icon: Package, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', solid: '#475569' },
 { key: 'Pintura', label: 'Pintura', icon: Paintbrush, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', solid: '#d97706' },
 { key: 'Montagem', label: 'Montagem', icon: HardHat, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', solid: '#059669' },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseDate = (d: string | Date | null): Date | null => {
 if (!d) return null;
 if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
 
 // Tratamento para strings (ex: "18/12/2025 14:59:21" ou "18/12/2025")
 if (typeof d === 'string' && d.includes('/')) {
 // Pega apenas a parte da data (antes do espaço do horário)
 const datePart = d.split(' ')[0];
 const [day, month, year] = datePart.split('/');
 
 // Garante que temos valores numéricos válidos
 const dayNum = Number(day);
 const monthNum = Number(month);
 const yearNum = Number(year);
 
 if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return null;
 
 const dt = new Date(yearNum, monthNum - 1, dayNum);
 return isNaN(dt.getTime()) ? null : dt;
 }
 
 // ISO ou outros formatos
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
 if (finalizado && finalizado.trim().toUpperCase() === 'C') {
 const ROW_HEIGHT = 42;
	return (
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase bg-slate-100 border-slate-300 text-slate-600">
 <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
 Finalizado
 </span>
 );
 }
 const map: Record<string, { bg: string; text: string; dot: string }> = {
 AT: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
 PA: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
 CA: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
 FI: { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
 };
 const s = map[status] ?? { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' };
 const ROW_HEIGHT = 42;
	return (
 <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
 {desc || status}
 </span>
 );
};

const MiniBar = ({ pct, color }: { pct: number; color: string }) => (
 <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
 <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
 </div>
);

const SetorCell = ({ total, exec, pct, color }: { total: number; exec: number; pct: number; color: string }) => {
 const active = total > 0;
 const ROW_HEIGHT = 42;
	return (
 <div className={`flex flex-col gap-0.5 px-0.5 ${!active ? 'opacity-30' : ''}`} style={{ minWidth: 60 }}>
 <div className="flex flex-col">
 <div className="flex justify-between items-center bg-slate-50 px-1 rounded-sm border border-slate-100 mb-0.5">
 <span className="text-[7.5px] font-bold text-slate-400 uppercase">Exec:</span>
 <div className="flex items-center gap-1"><span className="text-[8px] font-bold text-slate-500">({pct}%)</span>
 <span className="text-[9px] font-black" style={{ color }}>{exec}</span></div>
 </div>
 <div className="flex justify-between items-center bg-slate-50 px-1 rounded-sm border border-slate-100">
 <span className="text-[7.5px] font-bold text-slate-400 uppercase">A Exec:</span>
 <span className="text-[9px] font-bold text-slate-600">{total}</span>
 </div>
 </div>
 <div className="mt-1">
 <MiniBar pct={pct} color={color} />
 <span className="text-[8px] text-slate-100 font-bold block text-center mt-0.5">{pct}%</span>
 </div>
 </div>
 );
};

interface GanttRow {
 id: number;
 label: string;
 desc: string | null;
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
 show: boolean; // Control visibility of row
 }[];
}

interface GanttChartProps {
 data: unknown[]; // Can be TagDetalhe[] or ProjetoAcomp[]
 mode: 'tag' | 'projeto';
 setoresVisiveis: typeof SETORES;
 showResources?: boolean;
}

function GanttChart({ data, mode, setoresVisiveis, showResources = false }: GanttChartProps) {
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 // Compute global date range
 const allDates: Date[] = [];
 data.forEach(item => {
 setoresVisiveis.forEach(s => {
 const pIni = parseDate(item[`PlanejadoInicio${s.key}`]);
 const pFin = parseDate(item[`PlanejadoFinal${s.key}`]);
 const rIni = parseDate(item[`RealizadoInicio${s.key}`]);
 const rFin = parseDate(item[`RealizadoFinal${s.key}`]);
 if (pIni) allDates.push(pIni);
 if (pFin) allDates.push(pFin);
 if (rIni) allDates.push(rIni);
 if (rFin) allDates.push(rFin);
 });
 });

 // Include today in range so the marker always fits
 allDates.push(today);

 if (allDates.length === 0) {
 const ROW_HEIGHT = 42;
	return (
 <div className="flex flex-col items-center justify-center py-20 text-slate-400 h-full flex flex-col min-h-0">
 <GanttChartSquare size={48} className="mb-4 opacity-20" />
 <p className="text-xs font-medium">Sem datas planejadas ou realizadas para exibir o Gantt</p>
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
 const ROW_HEIGHT = 42;
	return (days / totalDays) * 100;
 };
 const spanPct = (s: Date, e: Date) => {
 const days = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
 const ROW_HEIGHT = 42;
	return (days / totalDays) * 100;
 };

 // Build gantt rows
 const rows: GanttRow[] = data.map(item => ({
 id: mode === 'tag' ? item.IdTag : item.IdProjeto,
 label: mode === 'tag' ? item.Tag : item.Projeto,
 desc: mode === 'tag' ? item.DescTag : item.DescProjeto,
 finalizado: item.Finalizado === 'C',
 bars: setoresVisiveis.map(s => {
 // Totals/exec/pct keys differ by mode
 let tk = `${s.key}TotalExecutar`;
 let ek = `${s.key}TotalExecutado`;
 let pk = `${s.key}Percentual`;

 // Date key prefix: tags use PUNSIONADEIRA/GALVANIZAR (uppercase),
 // projetos endpoint returns Punsionadeira/Galvanizar (camelCase)
 let dpk = s.key; // default: matches for Corte, Dobra, Solda, Pintura, Montagem, CorteaLaser

 if (s.key === 'Galvanizar') {
   tk = 'GALVANIZARTotalExecutar'; ek = 'GALVANIZARTotalExecutado'; pk = 'GALVANIZARPercentual';
   dpk = mode === 'tag' ? 'GALVANIZAR' : 'Galvanizar';
 }
 if (s.key === 'Punsionadeira') {
   tk = 'PUNSIONADEIRATotalExecutar'; ek = 'PUNSIONADEIRATotalExecutado'; pk = 'PUNSIONADEIRAPercentual';
   dpk = mode === 'tag' ? 'PUNSIONADEIRA' : 'Punsionadeira';
 }

 const total = Number(mode === 'tag' ? item[tk] : item[`Total${s.key}`]) || 0;
 const exec  = Number(mode === 'tag' ? item[ek] : item[`Exec${s.key}`])  || 0;
 const pct   = Number(mode === 'tag' ? item[pk] : item[`Pct${s.key}`])   || 0;

 // Dates: the backend merges material_processo dates with priority,
 // so item already has the correct PlanejadoInicio*/Realizado* fields.
 const planStart = parseDate(item[`PlanejadoInicio${dpk}`]);
 const planEnd   = parseDate(item[`PlanejadoFinal${dpk}`]);
 const realStart = parseDate(item[`RealizadoInicio${dpk}`]);
 const realEnd   = parseDate(item[`RealizadoFinal${dpk}`]);

 return {
 setor: s.label,
 color: s.color,
 solidColor: s.solid,
 planStart: parseDate(item[`PlanejadoInicio${dpk}`]),
 planEnd: parseDate(item[`PlanejadoFinal${dpk}`]),
 realStart: parseDate(item[`RealizadoInicio${dpk}`]),
 realEnd: parseDate(item[`RealizadoFinal${dpk}`]),
 pct,
 total,
 exec,
 active: total > 0 || exec > 0,
 show: true // Always show per user request
 };
 })
 }));

 const ROW_HEIGHT = 42;
	return (
 <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
 <div className="flex-1 overflow-auto custom-scrollbar">
 <div className="min-w-full">
 <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
 <div className="sticky left-0 z-30 bg-white shadow-sm flex items-center px-3 w-full py-1.5">
 <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tag / Setor</span>
 </div>
 </div>
 {rows.map((row) => (
 <div key={row.id} className={`border-b ${row.finalizado ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100'}`}>
 <div className="flex items-stretch" style={{ minHeight: 28 }}>
 <div className={`sticky left-0 z-10 shrink-0 flex items-center gap-2 px-2 w-full ${row.finalizado ? 'bg-emerald-50/40' : 'bg-white'}`}>
 <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${row.finalizado ? 'bg-emerald-600' : (mode === 'tag' ? 'bg-slate-700' : 'bg-indigo-700')}`}>
 {mode === 'tag' ? <Package size={8} className="text-white" /> : <Layers size={8} className="text-white" />}
 </div>
 <div className="min-w-0 flex-1">
 <div className="text-[10px] font-black text-slate-800 truncate leading-tight uppercase">{row.label}</div>
 </div>
 {row.finalizado && (
 <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
 )}
 </div>
 </div>
 {row.bars.map((bar) => (
 <div key={bar.setor} className="flex items-stretch" style={{ height: ROW_HEIGHT }}>
 <div className="sticky left-0 z-10 shrink-0 flex items-center gap-2 px-2 w-full border-b border-slate-100/50" style={{ backgroundColor: `${bar.color}05` }}>
 <div className="flex-1 min-w-0 grid grid-cols-[130px_90px_90px_1fr] items-center gap-2">
 <div className="flex items-center gap-1.5 min-w-0">
 <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bar.color }} />
 <span className="text-[10px] font-bold uppercase truncate" style={{ color: bar.color }}>{bar.setor}</span>
 </div>
                                                    {/* Col 2: RI */}
                                                    <div className="text-center flex gap-2 items-center justify-center">
                                                        <span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">INÍCIO:</span>
                                                        {bar.realStart ? (
                                                            <span className="text-[10px] font-black text-slate-700 leading-none">{fmtDateShort(bar.realStart)}</span>
                                                        ) : <span className="text-[10px] text-slate-300">-</span>}
                                                    </div>

                                                    {/* Col 3: RF */}
                                                    <div className="text-center flex gap-2 items-center justify-center">
                                                        <span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">FINAL:</span>
                                                        {bar.realEnd ? (
                                                            <span className="text-[10px] font-black text-slate-700 leading-none">{fmtDateShort(bar.realEnd)}</span>
                                                        ) : <span className="text-[10px] text-slate-300">-</span>}
                                                    </div>

                                                    {/* Col 4: Totals */}
                                                    <div className="flex justify-end gap-6 pr-4">
                                                        <span className="text-[10px] font-bold text-slate-600 tabular-nums">Exec: {bar.exec}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">A Exec: {bar.total}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
 </div>
 </div>
 </div>
 );
}

// ─── TAG DETAIL SECTION (List View) ──────────────────────────────────────────

function TagDetailSection({ tag, setoresVisiveis }: { tag: TagDetalhe; setoresVisiveis: typeof SETORES }) {
 const [expanded, setExpanded] = useState(false);
 const isFinished = tag.Finalizado === 'C';

 const ROW_HEIGHT = 42;
	return (
 <div className={`border rounded-md overflow-hidden transition-all ${isFinished ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
 {/* Tag Header Row */}
 <button
 onClick={() => setExpanded(v => !v)}
 className="w-full flex items-center gap-2 px-2 py-1 hover:bg-slate-50/80 transition-colors text-left"
 >
 <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
 <Package size={12} className="text-white" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-xs font-black text-slate-800">{tag.Tag}</span>
 {isFinished && (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold border border-emerald-200">
 <CheckCircle2 size={8} /> FINALIZADA
 </span>
 )}
 </div>
 {tag.DescTag && <p className="text-[10px] text-slate-100 truncate">{tag.DescTag}</p>}
 </div>
 <div className="flex items-center gap-4 flex-shrink-0">
 {/* Mini setor bars inline */}
 {setoresVisiveis.map(s => {
 const total = Number((tag as Record<string, unknown>)[`${s.key}TotalExecutar`]) || 0;
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
const exec = Number((tag as Record<string, unknown>)[`${s.key}TotalExecutado`]) || 0;
 const pct = Number((tag as Record<string, unknown>)[`${s.key}Percentual`]) || 0;
 if (total === 0) return null;
 const ROW_HEIGHT = 42;
	return (
 <div key={s.key} className="flex flex-col items-center gap-0.5" style={{ minWidth: 44 }}>
 <span className="text-[8px] font-bold text-slate-100">{s.label.slice(0,5)}</span>
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
 <div className="border-t border-slate-100 px-2 py-0.5 bg-slate-50/50">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
 {setoresVisiveis.map(s => {
 const total = Number((tag as Record<string, unknown>)[`${s.key}TotalExecutar`]) || 0;
  
const exec = Number((tag as Record<string, unknown>)[`${s.key}TotalExecutado`]) || 0;
 const pct = Number((tag as Record<string, unknown>)[`${s.key}Percentual`]) || 0;
 const plIni = (tag as Record<string, unknown>)[`PlanejadoInicio${s.key}`];
 const plFin = (tag as Record<string, unknown>)[`PlanejadoFinal${s.key}`];
 const reIni = (tag as Record<string, unknown>)[`RealizadoInicio${s.key}`];
 const reFin = (tag as Record<string, unknown>)[`RealizadoFinal${s.key}`];
 const IconComp = s.icon;
 const ROW_HEIGHT = 42;
	return (
 <div key={s.key} className="rounded-md p-3 border" style={{ backgroundColor: s.bg, borderColor: s.border }}>
 <div className="flex items-center gap-2 mb-2">
 <IconComp size={13} style={{ color: s.color }} />
 <span className="text-xs font-black" style={{ color: s.color }}>{s.label}</span>
 </div>
 <div className="flex items-end gap-1 mb-1.5">
 <span className="text-lg font-black" style={{ color: s.color }}>{exec}</span>
 <span className="text-xs text-slate-100 mb-0.5">/ {total}</span>
 </div>
 <MiniBar pct={pct} color={s.color} />
 <div className="mt-1.5 space-y-0.5">
 <div className="flex justify-between text-[9px] text-slate-100">
 <span className="font-semibold">Pl. Ini:</span>
 <span>{fmtDate(plIni)}</span>
 </div>
 <div className="flex justify-between text-[9px] text-slate-100">
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

// ─── Types: Recurso por Tag ───────────────────────────────────────────────────
interface RecursoDetalhe {
  IdTag: number;
  Tag: string;
  DescTag: string | null;
  Finalizado: string | null;
  IdProcessoFabricacao: number;
  DescRecurso: string;
  TotalExecutar: number;
  TotalExecutado: number;
  PlanejadoInicio: string | null;
  PlanejadoFinal: string | null;
  RealizadoInicio: string | null;
  RealizadoFinal: string | null;
}
// ─── Types: Recurso por OS ───────────────────────────────────────────────────
interface OsRecurso {
  IdOrdemServico: number;
  DescricaoOS: string;
  StatusOS: string | null;
  IdProcessoFabricacao: number;
  DescRecurso: string;
  TotalExecutar: number;
  TotalExecutado: number;
  PlanejadoInicio: string | null;
  PlanejadoFinal: string | null;
  RealizadoInicio: string | null;
  RealizadoFinal: string | null;
}


function GanttRecursos({ recursos, viewMode }: { recursos: RecursoDetalhe[]; viewMode: 'lista' | 'gantt' }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Expandable OS state ────────────────────────────────────────────────────
  const [expandedTags, setExpandedTags] = useState<Set<number>>(new Set());
  const [osCache, setOsCache] = useState<Map<number, OsRecurso[]>>(new Map());
  const [osLoading, setOsLoading] = useState<Set<number>>(new Set());
  const [fTag, setFTag] = useState('');
  const [fOs, setFOs] = useState('');

  const toggleTag = async (tagId: number) => {
    const next = new Set(expandedTags);
    if (next.has(tagId)) { next.delete(tagId); setExpandedTags(next); return; }
    next.add(tagId);
    setExpandedTags(next);
    if (!osCache.has(tagId)) {
      setOsLoading(prev => new Set(prev).add(tagId));
      try {
        const res = await fetch(`${API_BASE}/acompanhamento/tag/${tagId}/os-recursos`);
        const json = await res.json();
        if (json.success) setOsCache(prev => { const m = new Map(prev); m.set(tagId, json.data); return m; });
      } catch { /* ignore */ } finally {
        setOsLoading(prev => { const s = new Set(prev); s.delete(tagId); return s; });
      }
    }
  };

  // Collect all dates to compute global range
  const allDates: Date[] = [today];
  recursos.forEach(r => {
    const d = [r.PlanejadoInicio, r.PlanejadoFinal, r.RealizadoInicio, r.RealizadoFinal];
    d.forEach(s => { const dt = parseDate(s); if (dt) allDates.push(dt); });
  });

    if (recursos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <GanttChartSquare size={48} className="mb-4 opacity-20" />
        <p className="text-xs font-medium">Sem apontamentos ou recursos neste projeto</p>
      </div>
    );
  }

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  minDate.setDate(minDate.getDate() - 3);
  maxDate.setDate(maxDate.getDate() + 3);
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);

  const pct = (d: Date) => ((d.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;
  const span = (s: Date, e: Date) => (Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1) / totalDays * 100;

  // Group by tag
  const byTag = new Map<number, { tag: RecursoDetalhe; rows: RecursoDetalhe[] }>();
  recursos.forEach(r => {
    if (!byTag.has(r.IdTag)) byTag.set(r.IdTag, { tag: r, rows: [] });
    byTag.get(r.IdTag)!.rows.push(r);
  });

  // Month header ticks
  const months: { label: string; left: number }[] = [];
  const cur = new Date(minDate);
  cur.setDate(1);
  while (cur <= maxDate) {
    months.push({ label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), left: pct(cur < minDate ? minDate : cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const todayPct = pct(today);

  // ── Cards summary: group by resource across all tags ──────────────────────
  const byRecurso = new Map<string, {
    nome: string;
    totalExec: number; totalExecu: number;
    planInis: Date[]; planFins: Date[];
    realInis: Date[]; realFins: Date[];
    emAndamento: boolean;
  }>();
  recursos.forEach(r => {
    if (!byRecurso.has(r.DescRecurso)) {
      byRecurso.set(r.DescRecurso, { nome: r.DescRecurso, totalExec: 0, totalExecu: 0, planInis: [], planFins: [], realInis: [], realFins: [], emAndamento: false });
    }
    const g = byRecurso.get(r.DescRecurso)!;
    g.totalExec  += Number(r.TotalExecutar)  || 0;
    g.totalExecu += Number(r.TotalExecutado) || 0;
    const pi = parseDate(r.PlanejadoInicio); if (pi) g.planInis.push(pi);
    const pf = parseDate(r.PlanejadoFinal);  if (pf) g.planFins.push(pf);
    const ri = parseDate(r.RealizadoInicio); if (ri) g.realInis.push(ri);
    let rf = parseDate(r.RealizadoFinal);
    if (Number(r.TotalExecutar) > 0) rf = null;
    if (rf) g.realFins.push(rf);
    if (ri && !rf) g.emAndamento = true;
  });

  const cardList = Array.from(byRecurso.values());

  // Color palette per resource index
  const CARD_COLORS = [
    { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8' },
    { bg: '#f5f3ff', border: '#ddd6fe', accent: '#8b5cf6', text: '#6d28d9' },
    { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#dc2626' },
    { bg: '#ecfdf5', border: '#a7f3d0', accent: '#10b981', text: '#059669' },
    { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#d97706' },
    { bg: '#fdf2f8', border: '#fbcfe8', accent: '#ec4899', text: '#db2777' },
    { bg: '#f0fdfa', border: '#ccfbf1', accent: '#14b8a6', text: '#0d9488' },
    { bg: '#f8fafc', border: '#e2e8f0', accent: '#64748b', text: '#475569' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Cards de Resumo por Recurso ─────────────────────────────── */}
      {viewMode === 'lista' && (
      <div className="flex-1 overflow-auto custom-scrollbar bg-white">
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-2 border-b border-slate-100">
          <Calendar size={12} className="text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cronograma por Recurso</span>
        </div>
        <div className="flex flex-wrap gap-3 p-4">
          {cardList.map((g, idx) => {
            const c = CARD_COLORS[idx % CARD_COLORS.length];
            const planIni = g.planInis.length ? new Date(Math.min(...g.planInis.map(d => d.getTime()))) : null;
            const planFin = g.planFins.length ? new Date(Math.max(...g.planFins.map(d => d.getTime()))) : null;
            const realIni = g.realInis.length ? new Date(Math.min(...g.realInis.map(d => d.getTime()))) : null;
            const realFin = g.realFins.length ? new Date(Math.max(...g.realFins.map(d => d.getTime()))) : null;
            const totalPecas = g.totalExecu + g.totalExec; // total = executado + a executar
            const pct2 = totalPecas > 0 ? Math.min(Math.round((g.totalExecu / totalPecas) * 100), 100) : 0;
            const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
            const isLate = planFin && !realFin && today > planFin;
            const isDone = realFin && (!planFin || realFin <= planFin);
            return (
              <div
                key={g.nome}
                className="rounded-xl border shrink-0 overflow-hidden shadow-sm"
                style={{ backgroundColor: c.bg, borderColor: c.border, width: 220 }}
              >
                {/* Card header */}
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5" style={{ borderBottom: `1px solid ${c.border}` }}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: c.accent }}>
                    <Package size={9} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase truncate" style={{ color: c.text }}>{g.nome}</span>
                  {/* Status badge */}
                  {g.emAndamento && !realFin && (
                    <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">Em andamento</span>
                  )}
                  {realFin && (
                    <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                      <CheckCircle2 size={7} />Concluído
                    </span>
                  )}
                  {isLate && !realFin && (
                    <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0 flex items-center gap-1">
                      <AlertTriangle size={7} />Atrasado
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="px-3 pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Progresso</span>
                    <span className="text-[10px] font-black" style={{ color: c.accent }}>{pct2}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct2, 100)}%`, backgroundColor: c.accent }} />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[8px] text-slate-400">Exec: <b style={{ color: c.text }}>{g.totalExecu}</b></span>
                    <span className="text-[8px] text-slate-400">Total: <b className="text-slate-600">{totalPecas}</b></span>
                  </div>
                </div>

                {/* Date rows */}
                <div className="px-3 pt-2 pb-2.5 space-y-1">
                  {/* Planejado */}
                  <div className="rounded-lg px-2 py-1" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <span className="text-[8px] font-black uppercase text-indigo-400 block mb-0.5">Planejado</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-indigo-400 font-semibold w-5">Ini:</span>
                      <span className={`text-[10px] font-bold ${planIni ? 'text-indigo-700' : 'text-slate-300'}`}>{fmt(planIni)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-indigo-400 font-semibold w-5">Fim:</span>
                      <span className={`text-[10px] font-bold ${planFin ? 'text-indigo-700' : 'text-slate-300'}`}>{fmt(planFin)}</span>
                    </div>
                  </div>
                  {/* Realizado */}
                  <div className="rounded-lg px-2 py-1" style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                    <span className="text-[8px] font-black uppercase text-emerald-500 block mb-0.5">Realizado</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-emerald-500 font-semibold w-5">Ini:</span>
                      <span className={`text-[10px] font-bold ${realIni ? 'text-emerald-700' : 'text-slate-300'}`}>{fmt(realIni)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-emerald-500 font-semibold w-5">Fim:</span>
                      <span className={`text-[10px] font-bold ${realFin ? 'text-emerald-700' : (g.emAndamento ? 'text-amber-500' : 'text-slate-300')}`}>
                        {realFin ? fmt(realFin) : (g.emAndamento ? 'Em andamento' : '—')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Gantt Table ──────────────────────────────────────────────── */}
      {viewMode === 'gantt' && (
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="shrink-0 p-2 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="relative">
             <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
             <input value={fTag} onChange={e => setFTag(e.target.value)} type="text" placeholder="Filtrar Tag (ID, Descrição)..." className="pl-8 pr-8 py-1.5 text-[11px] font-semibold border border-slate-300 rounded-md w-60 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
             {fTag && <button onClick={() => setFTag('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"><X size={12}/></button>}
          </div>
          {expandedTags.size > 0 && (
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtro OS:</span>
               <div className="relative">
                 <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                 <input value={fOs} onChange={e => setFOs(e.target.value)} type="text" placeholder="Filtrar OS (ID, Descrição)..." className="pl-8 pr-8 py-1.5 text-[11px] font-semibold border border-slate-300 rounded-md w-60 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                 {fOs && <button onClick={() => setFOs('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"><X size={12}/></button>}
               </div>
            </div>
          )}
          {(fTag || fOs) && (
            <button onClick={() => { setFTag(''); setFOs(''); }} className="text-[10px] font-bold uppercase text-red-600 hover:text-red-800 px-2 py-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200 flex items-center gap-1"><X size={10}/> Limpar Filtros</button>
          )}
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
        <div style={{ minWidth: 1100 }}>

          {/* Header: month ticks */}
          <div className="sticky top-0 z-30 bg-[#0B3A2D] text-white border-b border-[#155A47] flex" style={{ height: 36 }}>
            <div className="w-72 shrink-0 flex items-center px-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Recurso</span>
            </div>
            <div className="w-24 shrink-0 flex items-center justify-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Exec / Total</span>
            </div>
            {/* Date columns header */}
            <div className="w-44 shrink-0 flex flex-col items-center justify-center border-l border-[#155A47] px-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-300">Planejado</span>
              <div className="flex gap-1 mt-0.5">
                <span className="text-[8px] text-white/50 font-semibold">Início</span>
                <span className="text-[8px] text-white/30">→</span>
                <span className="text-[8px] text-white/50 font-semibold">Fim</span>
              </div>
            </div>
            <div className="w-44 shrink-0 flex flex-col items-center justify-center border-l border-[#155A47] px-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-300">Realizado</span>
              <div className="flex gap-1 mt-0.5">
                <span className="text-[8px] text-white/50 font-semibold">Início</span>
                <span className="text-[8px] text-white/30">→</span>
                <span className="text-[8px] text-white/50 font-semibold">Fim</span>
              </div>
            </div>
            <div className="flex-1 relative border-l border-[#155A47]">
              {months.map((m, i) => (
                <span key={i} className="absolute text-[9px] font-bold text-white/50 uppercase" style={{ left: `${m.left}%`, transform: 'translateX(-50%)', top: 10 }}>{m.label}</span>
              ))}
            </div>
          </div>

          {/* Rows grouped by tag */}
          {Array.from(byTag.values()).filter(({ tag }) => {
            if (!fTag) return true;
            const q = fTag.toLowerCase();
            return String(tag.IdTag).includes(q) || (tag.Tag || '').toLowerCase().includes(q);
          }).map(({ tag, rows }) => (
            <div key={tag.IdTag}>
              {/* Tag header — clickable to expand OS */}
              <div
                className={`flex items-center border-b cursor-pointer select-none transition-colors ${
                  tag.Finalizado === 'C'
                    ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                }`}
                style={{ height: 28 }}
                onClick={() => toggleTag(tag.IdTag)}
              >
                <div className="w-72 shrink-0 flex items-center gap-1.5 px-3 overflow-hidden" title={tag.Tag}>
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${tag.Finalizado === 'C' ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <Package size={8} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 uppercase truncate">{tag.Tag}</span>
                  {tag.Finalizado === 'C' && <CheckCircle2 size={9} className="text-emerald-500 shrink-0" />}
                  <span className="shrink-0 flex items-center gap-0.5 ml-1">
                    {osLoading.has(tag.IdTag)
                      ? <Loader size={8} className="animate-spin text-slate-400" />
                      : <span className={`text-[7px] font-bold uppercase tracking-wide px-1 py-0.5 rounded ${
                          expandedTags.has(tag.IdTag)
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}>
                          {expandedTags.has(tag.IdTag) ? '▲ OS' : '▶ OS'}
                        </span>
                    }
                  </span>
                </div>
                {(() => {
                  const tExec = rows.reduce((acc, r) => acc + (Number(r.TotalExecutado) || 0), 0);
                  const tFalta = rows.reduce((acc, r) => acc + (Number(r.TotalExecutar) || 0), 0);
                  const tTot = tExec + tFalta;
                  const ep = tTot > 0 ? Math.min(Math.round((tExec / tTot) * 100), 100) : 0;
                  return tTot > 0 ? (
                    <div className="w-24 shrink-0 flex items-center justify-center border-l border-slate-200 px-1" title={`Executado: ${tExec} | Falta: ${tFalta} | Total: ${tTot}`}>
                      <div className="flex flex-col items-center w-full">
                        <div className="flex items-baseline gap-1">
<span className="text-[10px] font-bold text-slate-500 mr-1">({ep}%)</span>
<span className="text-[10px] font-black text-slate-700">{tExec}</span>
<span className="text-[8px] text-slate-400">/ {tTot}</span>
</div>
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-0.5">
                          <div className="h-full bg-slate-500 rounded-full" style={{ width: `${ep}%` }} />
                        </div>
                      </div>
                    </div>
                  ) : <div className="w-24 shrink-0" />;
                })()}
                <div className="w-44 shrink-0 border-l border-slate-200" />
                <div className="w-44 shrink-0 border-l border-slate-200" />
                <div className="flex-1 relative border-l border-slate-200" style={{ height: 28 }}>
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-400/50" style={{ left: `${todayPct}%` }} />
                  )}
                </div>
              </div>

              {/* OS expanded detail section */}
              {expandedTags.has(tag.IdTag) && (() => {
                const osRows = osCache.get(tag.IdTag) || [];
                // Group by OS
                const byOS = new Map<number, { desc: string; status: string | null; items: OsRecurso[] }>();
                osRows.forEach(o => {
                  if (!byOS.has(o.IdOrdemServico)) byOS.set(o.IdOrdemServico, { desc: o.DescricaoOS, status: o.StatusOS, items: [] });
                  byOS.get(o.IdOrdemServico)!.items.push(o);
                });

                if (viewMode === 'lista') {
                  // Cards view per OS
                  return (
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap gap-2.5">
                        {Array.from(byOS.entries()).filter(([osId, os]) => {
                          if (!fOs) return true;
                          const q = fOs.toLowerCase();
                          return String(osId).includes(q) || (os.desc || '').toLowerCase().includes(q);
                        }).map(([osId, os]) => {
                          const CARD_COLORS = [
                            { bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6', text: '#1d4ed8' },
                            { bg: '#f5f3ff', border: '#ddd6fe', accent: '#8b5cf6', text: '#6d28d9' },
                            { bg: '#fef2f2', border: '#fecaca', accent: '#ef4444', text: '#dc2626' },
                            { bg: '#ecfdf5', border: '#a7f3d0', accent: '#10b981', text: '#059669' },
                            { bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b', text: '#d97706' },
                          ];
                          return os.items.map((item, idx) => {
                            const c = CARD_COLORS[idx % CARD_COLORS.length];
                            const pi = parseDate(item.PlanejadoInicio);
                            const pf = parseDate(item.PlanejadoFinal);
                            const ri = parseDate(item.RealizadoInicio);
                            let rf = parseDate(item.RealizadoFinal);
                            if (Number(item.TotalExecutar) > 0) rf = null;
                            const totalQtd = Number(item.TotalExecutado) + Number(item.TotalExecutar);
                            const p2 = rf ? 100 : (totalQtd > 0 ? Math.min(Math.round((Number(item.TotalExecutado) / totalQtd) * 100), 100) : 0);
                            const fmt = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
                            const emAnd = ri && !rf;
                            return (
                              <div key={`${osId}-${item.IdProcessoFabricacao}`} className="rounded-xl border overflow-hidden shadow-sm shrink-0" style={{ backgroundColor: c.bg, borderColor: c.border, width: 200 }}>
                                <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5" style={{ borderBottom: `1px solid ${c.border}` }}>
                                  <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: c.accent }}>
                                    <Package size={7} className="text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[9px] font-black uppercase truncate" style={{ color: c.text }}>{item.DescRecurso}</div>
                                    <div className="text-[8px] text-slate-400 truncate">OS #{osId} — {os.desc}</div>
                                  </div>
                                  {rf && <span className="ml-auto shrink-0 text-[7px] font-bold px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-0.5"><CheckCircle2 size={6} />OK</span>}
                                  {emAnd && <span className="ml-auto shrink-0 text-[7px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Em and.</span>}
                                </div>
                                <div className="px-2.5 pt-1.5">
                                  <div className="flex justify-between mb-0.5">
                                    <span className="text-[8px] text-slate-400">Progresso</span>
                                    <span className="text-[9px] font-black" style={{ color: c.accent }}>{p2}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${p2}%`, backgroundColor: c.accent }} />
                                  </div>
                                  <div className="flex justify-between mt-0.5" title={`Falta: ${item.TotalExecutar}`}>
                                    <span className="text-[7px] text-slate-400">Exec: <b style={{ color: c.text }}>{item.TotalExecutado}</b></span>
                                    <span className="text-[7px] text-slate-400">Total: <b>{totalQtd}</b></span>
                                  </div>
                                </div>
                                <div className="px-2.5 pt-1 pb-2 space-y-1">
                                  <div className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                    <div className="text-[7px] font-black uppercase text-indigo-400 mb-0.5">Planejado</div>
                                    <div className="text-[9px] font-semibold text-indigo-700">{fmt(pi)} → {fmt(pf)}</div>
                                  </div>
                                  <div className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                    <div className="text-[7px] font-black uppercase text-emerald-500 mb-0.5">Realizado</div>
                                    <div className={`text-[9px] font-semibold ${rf ? 'text-emerald-700' : emAnd ? 'text-amber-600' : 'text-slate-300'}`}>
                                      {fmt(ri)} → {rf ? fmt(rf) : emAnd ? 'Em andamento' : '—'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                }

                // Gantt rows per OS
                return (
                  <div>
                    {Array.from(byOS.entries()).filter(([osId, os]) => {
                          if (!fOs) return true;
                          const q = fOs.toLowerCase();
                          return String(osId).includes(q) || (os.desc || '').toLowerCase().includes(q);
                    }).map(([osId, os]) => (
                      <div key={osId}>
                        {/* OS sub-header */}
                        <div className="flex items-center border-b border-indigo-100 bg-indigo-50" style={{ height: 24 }}>
                          <div className="w-72 shrink-0 flex items-center gap-1.5 pl-6 pr-2" title={`OS #${osId} - ${os.desc}`}>
                            <div className="w-3 h-3 rounded-sm bg-indigo-500 flex items-center justify-center shrink-0">
                              <Package size={6} className="text-white" />
                            </div>
                            <span className="text-[9px] font-bold text-indigo-700 shrink-0">OS #{osId}</span>
                            <span className="text-[8px] text-indigo-400 truncate">{os.desc}</span>
                          </div>
                          {(() => {
                            const tExec = os.items.reduce((acc, r) => acc + (Number(r.TotalExecutado) || 0), 0);
                            const tFalta = os.items.reduce((acc, r) => acc + (Number(r.TotalExecutar) || 0), 0);
                            const tTot = tExec + tFalta;
                            const ep = tTot > 0 ? Math.min(Math.round((tExec / tTot) * 100), 100) : 0;
                            return tTot > 0 ? (
                              <div className="w-24 shrink-0 flex items-center justify-center border-l border-indigo-100 px-1" title={`Executado: ${tExec} | Falta: ${tFalta} | Total: ${tTot}`}>
                                <div className="flex flex-col items-center w-full">
                                  <div className="flex items-baseline gap-1">
<span className="text-[10px] font-bold text-indigo-400 mr-1">({ep}%)</span>
<span className="text-[10px] font-black text-indigo-700">{tExec}</span>
<span className="text-[8px] text-indigo-300">/ {tTot}</span>
</div>
                                  <div className="w-full h-1 bg-indigo-100 rounded-full overflow-hidden mt-0.5">
                                    <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${ep}%` }} />
                                  </div>
                                </div>
                              </div>
                            ) : <div className="w-24 shrink-0 border-l border-indigo-100" />;
                          })()}
                          <div className="w-44 shrink-0 border-l border-indigo-100" />
                          <div className="w-44 shrink-0 border-l border-indigo-100" />
                          <div className="flex-1 border-l border-indigo-100" />
                        </div>
                        {/* OS recurso rows */}
                        {os.items.map(item => {
                          const pIni2 = parseDate(item.PlanejadoInicio);
                          const pFin2 = parseDate(item.PlanejadoFinal);
                          const rIni2 = parseDate(item.RealizadoInicio);
                          let rFin2 = parseDate(item.RealizadoFinal);
                          if (Number(item.TotalExecutar) > 0) rFin2 = null;
                          const totalQtd = Number(item.TotalExecutado) + Number(item.TotalExecutar);
                          const ep = rFin2 ? 100 : (totalQtd > 0 ? Math.min(Math.round((Number(item.TotalExecutado) / totalQtd) * 100), 100) : 0);
                          return (
                            <div key={`${osId}-${item.IdProcessoFabricacao}`} className="flex items-center border-b border-indigo-50 bg-white hover:bg-indigo-50/30" style={{ height: 36 }}>
                              <div className="w-72 shrink-0 flex items-center gap-2 pl-8 pr-3 border-r border-slate-100">
                                <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                <span className="text-[9px] font-semibold text-indigo-600 truncate">{item.DescRecurso}</span>
                              </div>
                              <div className="w-24 shrink-0 flex items-center justify-center border-r border-slate-100 px-1">
                                <div className="flex flex-col items-center w-full" title={`Executado: ${item.TotalExecutado} | Falta: ${item.TotalExecutar} | Total: ${totalQtd}`}>
                                  <div className="flex items-baseline gap-1">
<span className="text-[9px] font-bold text-slate-500 mr-1">({ep}%)</span>
<span className={`text-[10px] font-black ${rFin2 ? 'text-emerald-600' : 'text-indigo-700'}`}>{item.TotalExecutado}</span>
<span className="text-[8px] text-slate-400">/ {totalQtd}</span>
</div>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                                    <div className={`h-full rounded-full ${rFin2 ? 'bg-emerald-500' : 'bg-indigo-400'}`} style={{ width: `${ep}%` }} />
                                  </div>
                                </div>
                              </div>
                              {/* Planejado */}
                              <div className="w-44 shrink-0 flex flex-col justify-center px-2 border-r border-slate-100 gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-indigo-400 w-7">Ini:</span>
                                  <span className={`text-[9px] font-semibold ${pIni2 ? 'text-indigo-700' : 'text-slate-300'}`}>{item.PlanejadoInicio || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-indigo-400 w-7">Fim:</span>
                                  <span className={`text-[9px] font-semibold ${pFin2 ? 'text-indigo-700' : 'text-slate-300'}`}>{item.PlanejadoFinal || '—'}</span>
                                </div>
                              </div>
                              {/* Realizado */}
                              <div className="w-44 shrink-0 flex flex-col justify-center px-2 border-r border-slate-100 gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-emerald-500 w-7">Ini:</span>
                                  <span className={`text-[9px] font-semibold ${rIni2 ? 'text-emerald-700' : 'text-slate-300'}`}>{item.RealizadoInicio || '—'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-emerald-500 w-7">Fim:</span>
                                    <span className={`text-[9px] font-semibold ${rFin2 ? 'text-emerald-700' : (rIni2 ? 'text-amber-500' : 'text-slate-300')}`}>
                                      {rFin2 ? item.RealizadoFinal : (rIni2 ? 'Em and.' : '—')}
                                    </span>
                                </div>
                              </div>
                              {/* Mini Gantt bars */}
                              <div className="flex-1 relative" style={{ height: 36 }}>
                                {todayPct >= 0 && todayPct <= 100 && <div className="absolute top-0 bottom-0 w-px bg-red-400/30 z-10" style={{ left: `${todayPct}%` }} />}
                                {pIni2 && pFin2 && (
                                  <div className="absolute rounded-sm opacity-30" style={{ left: `${pct(pIni2)}%`, width: `${Math.max(span(pIni2, pFin2), 0.5)}%`, top: 10, height: 7, backgroundColor: '#6366f1' }} />
                                )}
                                {rIni2 && rFin2 && (
                                  <div className="absolute rounded-sm" style={{ left: `${pct(rIni2)}%`, width: `${Math.max(span(rIni2, rFin2), 0.5)}%`, top: 22, height: 7, backgroundColor: '#10b981' }} />
                                )}
                                {rIni2 && !rFin2 && (
                                  <div className="absolute rounded-sm opacity-60" style={{ left: `${pct(rIni2)}%`, width: `${Math.max(todayPct - pct(rIni2), 0.5)}%`, top: 22, height: 7, backgroundColor: '#f59e0b' }} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Resource rows — ocultos quando OS expandida */}
              {!expandedTags.has(tag.IdTag) && rows.map(r => {
                const pIni = parseDate(r.PlanejadoInicio);
                const pFin = parseDate(r.PlanejadoFinal);
                const rIni = parseDate(r.RealizadoInicio);
                let rFin = parseDate(r.RealizadoFinal);
                if (Number(r.TotalExecutar) > 0) rFin = null;
                const hasPlan = pIni && pFin;
                const hasReal = rIni && rFin;
                const totalQtd = Number(r.TotalExecutado) + Number(r.TotalExecutar);
                const execPct = rFin ? 100 : (totalQtd > 0 ? Math.min(Math.round((Number(r.TotalExecutado) / totalQtd) * 100), 100) : 0);

                return (
                  <div key={`${r.IdTag}-${r.IdProcessoFabricacao}`} className="flex items-center border-b border-slate-100 bg-white hover:bg-slate-50/30 transition-colors" style={{ height: 40 }}>
                    {/* Label */}
                    <div className="w-72 shrink-0 flex items-center gap-2 px-3 border-r border-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-slate-700 truncate" title={r.DescRecurso}>{r.DescRecurso}</span>
                    </div>
                    {/* Exec/Total */}
                    <div className="w-24 shrink-0 flex items-center justify-center gap-1 border-r border-slate-100 px-1">
                      <div className="flex flex-col items-center w-full" title={`Executado: ${r.TotalExecutado} | Falta: ${r.TotalExecutar} | Total: ${totalQtd}`}>
                        <div className="flex items-baseline gap-1">
<span className="text-[10px] font-bold text-slate-500 mr-1">({execPct}%)</span>
<span className={`text-[11px] font-black ${rFin ? 'text-emerald-600' : 'text-indigo-700'}`}>{r.TotalExecutado}</span>
<span className="text-[9px] text-slate-400">/ {totalQtd}</span>
</div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                          <div className={`h-full rounded-full ${rFin ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(execPct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    {/* Planejado dates column */}
                    <div className="w-44 shrink-0 flex flex-col justify-center px-2 border-r border-slate-100 gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-indigo-400 uppercase w-7 shrink-0">Ini:</span>
                        <span className={`text-[10px] font-semibold ${pIni ? 'text-indigo-700' : 'text-slate-300'}`}>
                          {r.PlanejadoInicio || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-indigo-400 uppercase w-7 shrink-0">Fim:</span>
                        <span className={`text-[10px] font-semibold ${pFin ? 'text-indigo-700' : 'text-slate-300'}`}>
                          {r.PlanejadoFinal || '—'}
                        </span>
                      </div>
                    </div>
                    {/* Realizado dates column */}
                    <div className="w-44 shrink-0 flex flex-col justify-center px-2 border-r border-slate-100 gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-emerald-500 uppercase w-7 shrink-0">Ini:</span>
                        <span className={`text-[10px] font-semibold ${rIni ? 'text-emerald-700' : 'text-slate-300'}`}>
                          {r.RealizadoInicio || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-bold text-emerald-500 uppercase w-7 shrink-0">Fim:</span>
                        <span className={`text-[10px] font-semibold ${rFin ? 'text-emerald-700' : (rIni ? 'text-amber-500' : 'text-slate-300')}`}>
                          {rFin ? r.RealizadoFinal : (rIni ? 'Em andamento' : '—')}
                        </span>
                      </div>
                    </div>
                    {/* Gantt bars */}
                    <div className="flex-1 relative" style={{ height: 40 }}>
                      {/* Today */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div className="absolute top-0 bottom-0 w-px bg-red-400/40 z-10" style={{ left: `${todayPct}%` }} />
                      )}
                      {/* Planned bar */}
                      {hasPlan && (
                        <div
                          className="absolute rounded-sm opacity-40"
                          style={{
                            left: `${pct(pIni!)}%`,
                            width: `${Math.max(span(pIni!, pFin!), 0.5)}%`,
                            top: 10, height: 8,
                            backgroundColor: '#6366f1'
                          }}
                          title={`Planejado: ${r.PlanejadoInicio} → ${r.PlanejadoFinal}`}
                        />
                      )}
                      {/* Realized bar */}
                      {hasReal && (
                        <div
                          className="absolute rounded-sm"
                          style={{
                            left: `${pct(rIni!)}%`,
                            width: `${Math.max(span(rIni!, rFin!), 0.5)}%`,
                            top: 24, height: 8,
                            backgroundColor: '#10b981'
                          }}
                          title={`Realizado: ${r.RealizadoInicio} → ${r.RealizadoFinal}`}
                        />
                      )}
                      {/* Only start (no end) - in progress */}
                      {rIni && !rFin && (
                        <div
                          className="absolute rounded-sm opacity-70"
                          style={{ left: `${pct(rIni)}%`, width: `${Math.max((todayPct - pct(rIni)), 0.5)}%`, top: 24, height: 8, backgroundColor: '#f59e0b' }}
                          title={`Em andamento desde: ${r.RealizadoInicio}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-4 px-3 py-2 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2 rounded-sm bg-indigo-400 opacity-40" />
              <span className="text-[9px] text-slate-500 font-semibold">Planejado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2 rounded-sm bg-emerald-500" />
              <span className="text-[9px] text-slate-500 font-semibold">Realizado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-2 rounded-sm bg-amber-400 opacity-70" />
              <span className="text-[9px] text-slate-500 font-semibold">Em andamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-px h-3 bg-red-400" />
              <span className="text-[9px] text-slate-500 font-semibold">Hoje</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

// ─── DETAIL VIEW (Project → Tags) ────────────────────────────────────────────

function DetalheProjetoView({ projeto, onVoltar, setoresVisiveis }: { projeto: ProjetoAcomp; onVoltar: () => void; setoresVisiveis: typeof SETORES }) {
 const [tags, setTags] = useState<TagDetalhe[]>([]);
 const [recursos, setRecursos] = useState<RecursoDetalhe[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [viewMode, setViewMode] = useState<'lista' | 'gantt'>('gantt');

 useEffect(() => {
   setLoading(true);
   setError(null);
   Promise.all([
      fetch(`${API_BASE}/acompanhamento/projeto/${projeto.IdProjeto}/tags`).then(r => r.json()),
      fetch(`${API_BASE}/acompanhamento/projeto/${projeto.IdProjeto}/recursos`).then(r => r.json()),
   ])
     .then(([tagsData, recursosData]) => {
       if (tagsData.success) setTags(tagsData.data);
       else setError(tagsData.message);
       if (recursosData.success) setRecursos(recursosData.data);
     })
     .catch(e => setError(e.message))
     .finally(() => setLoading(false));
  }, [projeto.IdProjeto]);

 // Totals
 const totais = useMemo(() => {
 const t: Record<string, [number, number]> = { 
    Corte: [0,0], Dobra: [0,0], Solda: [0,0], Pintura: [0,0], Montagem: [0,0],
    CorteaLaser: [0,0], Punsionadeira: [0,0], Galvanizar: [0,0]
 };
 tags.forEach(tag => {
 t.Corte[0] += Number(tag.CorteTotalExecutar) || 0;
 t.Corte[1] += Number(tag.CorteTotalExecutado) || 0;
 t.Dobra[0] += Number(tag.DobraTotalExecutar) || 0;
 t.Dobra[1] += Number(tag.DobraTotalExecutado) || 0;
 t.Solda[0] += Number(tag.SoldaTotalExecutar) || 0;
 t.Solda[1] += Number(tag.SoldaTotalExecutado) || 0;
 t.Pintura[0] += Number(tag.PinturaTotalExecutar) || 0;
 t.Pintura[1] += Number(tag.PinturaTotalExecutado) || 0;
 t.Montagem[0] += Number(tag.MontagemTotalExecutar) || 0;
 t.Montagem[1] += Number(tag.MontagemTotalExecutado) || 0;
 // Novos setores
 t.CorteaLaser[0] += Number((tag as any).CorteaLaserTotalExecutar) || 0;
 t.CorteaLaser[1] += Number((tag as any).CorteaLaserTotalExecutado) || 0;
 t.Punsionadeira[0] += Number((tag as any).PUNSIONADEIRATotalExecutar) || 0;
 t.Punsionadeira[1] += Number((tag as any).PUNSIONADEIRATotalExecutado) || 0;
 t.Galvanizar[0] += Number((tag as any).GALVANIZARTotalExecutar) || 0;
 t.Galvanizar[1] += Number((tag as any).GALVANIZARTotalExecutado) || 0;
 });
 return t;
 }, [tags]);

 const ROW_HEIGHT = 42;
	return (
 <div className="flex flex-col w-full bg-slate-50/50 font-sans border border-slate-200 rounded-md shadow-sm">
 {/* Header */}
 <div className="shrink-0 bg-white border-b border-slate-200 px-2 py-1 shadow-sm">
 <div className="flex items-center gap-4">
 <button
 onClick={onVoltar}
 className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
 >
 <ArrowLeft size={15} /> Voltar
 </button>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
 <Eye size={15} />
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
 <StatusBadge status={projeto.StatusProj} desc={projeto.DescStatus} finalizado={projeto.Finalizado} />
 <span className="text-xs text-slate-400">#{projeto.IdProjeto}</span>
 </div>
 </div>
 </div>
 </div>
 </div>{/* /shrink-0 header */}

 {/* View Mode Toggle */}
 <div className="flex rounded-md border border-slate-200 overflow-hidden bg-slate-50 p-0.5 gap-0.5">
 <button
 onClick={() => setViewMode('lista')}
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
 viewMode === 'lista'
 ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
 : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
 }`}
 style={{ color: viewMode === 'lista' ? '#4338ca' : '#334155' }}
 >
 <List size={13} /> Lista
 </button>
 <button
 onClick={() => setViewMode('gantt')}
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
 viewMode === 'gantt'
 ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
 : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
 }`}
 style={{ color: viewMode === 'gantt' ? '#4338ca' : '#334155' }}
 >
 <GanttChartSquare size={13} /> Ver Gantt
 </button>
 </div>

 <span className="text-xs text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
 {tags.length} Tag{tags.length !== 1 ? 's' : ''}
 </span>
 </div>


 <div className="flex-1 overflow-auto custom-scrollbar">
 {loading && (
 <div className="flex justify-center py-16">
 <Loader className="animate-spin text-[#32423D]" size={28} />
 </div>
 )}
 {error && (
 <div className="m-4 p-4 bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-2 text-xs">
 <AlertTriangle size={14} /> {error}
 </div>
 )}
 {!loading && !error && tags.length === 0 && (
 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
 <Layers size={48} className="mb-4 opacity-20" />
 <p className="text-xs font-medium">Nenhuma tag encontrada para este projeto</p>
 </div>
 )}

 {!loading && !error && (
  <GanttRecursos recursos={recursos} viewMode={viewMode} />
  )}
 </div>
 </div>
 );
}

// ─── MAIN LIST VIEW ──────────────────────────────────────────────────────────

export default function AcompanhamentoGeralPage() {
 const { processosVisiveis } = useAppConfig();
 const [projetos, setProjetos] = useState<ProjetoAcomp[]>([]);

 const setoresAtivos = useMemo(() => {
    if (!projetos || projetos.length === 0) {
      return SETORES.filter(s => processosVisiveis.includes(s.label.toLowerCase()) || processosVisiveis.includes(s.key.toLowerCase()));
    }
    return SETORES.filter(s => projetos.some(p => {
        const pObj = p as any;
        return Number(pObj[`Total${s.key}`]) > 0 || String(pObj[`flag${s.key}`]) === '1' || String(pObj[`txt${s.key}`]) === '1';
    }));
 }, [projetos, processosVisiveis]);

 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [selected, setSelected] = useState<ProjetoAcomp | null>(null);
 const [detalhe, setDetalhe] = useState<ProjetoAcomp | null>(null);
 const [mainViewMode, setMainViewMode] = usePersistentState<'lista' | 'gantt'>('AcompanhamentoGeral_mainViewMode', 'lista');
 const [showGridResources, setShowGridResources] = useState(false);

 const [fSearchProjeto, setFSearchProjeto] = usePersistentState('AcompanhamentoGeral_fSearchProjeto', '');
 const [fSearchDescricao, setFSearchDescricao] = usePersistentState('AcompanhamentoGeral_fSearchDescricao', '');
 const [fSearchInput, setFSearchInput] = usePersistentState('AcompanhamentoGeral_fSearchInput', '');
 const [fDescricaoInput, setFDescricaoInput] = usePersistentState('AcompanhamentoGeral_fDescricaoInput', '');
 const [fStatus, setFStatus] = usePersistentState('AcompanhamentoGeral_fStatus', '');
 const [fModo, setFModo] = usePersistentState<'liberados' | 'nao_liberados' | 'finalizados' | 'todos'>('AcompanhamentoGeral_fModo', 'liberados');
 // const [showObs, setShowObs] = useState<number | null>(null);
 const [fDataDe, setFDataDe] = usePersistentState('AcompanhamentoGeral_fDataDe', '');
 const [fDataAte, setFDataAte] = usePersistentState('AcompanhamentoGeral_fDataAte', '');
 // const [showFilters, setShowFilters] = usePersistentState('AcompanhamentoGeral_showFilters', false);

 // Inline edit: tracks which project's Observacao is being edited and the draft value
 // const [obsEdit, setObsEdit] = useState<{ id: number; value: string } | null>(null);
 // const obsInputRef = useRef<HTMLInputElement>(null);

 // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
 } catch {
 console.error('Erro ao salvar observação:', e.message);
 }
 }, []);  

 const fetchDados = useCallback(async () => {
  
      setLoading(true);
 setError(null);
 try {
 const params = new URLSearchParams();
 if (fSearchProjeto) params.set('projeto', fSearchProjeto);
 if (fSearchDescricao) params.set('descricao', fSearchDescricao);
 if (fStatus) params.set('status', fStatus);
 if (fDataDe) params.set('dataFinalDe', fDataDe);
 if (fDataAte) params.set('dataFinalAte', fDataAte);
 params.set('modo', fModo);
 

 const res = await fetch(`${API_BASE}/acompanhamento/projetos?${params}`);
 if (!res.ok) throw new Error('Erro ao buscar projetos');
 const result = await res.json();
 if (result.success) setProjetos(result.data);
 else throw new Error(result.message);
 } catch {
 setError(e.message || 'Erro na requisição');
 } finally {
 setLoading(false);
 }
 }, [fSearchProjeto, fSearchDescricao, fStatus, fModo, fDataDe, fDataAte]);

 useEffect(() => { fetchDados(); }, [fetchDados]);

 const handleSearch = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 setFSearchProjeto(fSearchInput);
 setFSearchDescricao(fDescricaoInput);
 };

 const handleRefresh = () => {
 if (fSearchInput === fSearchProjeto && fDescricaoInput === fSearchDescricao) {
 fetchDados();
 } else {
 setFSearchProjeto(fSearchInput);
 setFSearchDescricao(fDescricaoInput);
 }
 };

 // If detalhe mode, render the detail view
 if (detalhe) {
 return <DetalheProjetoView projeto={detalhe} onVoltar={() => { setDetalhe(null); }} setoresVisiveis={setoresAtivos} />;
 }

 const ROW_HEIGHT = 42;
	return (
 <div className="flex flex-col h-[calc(100vh-4rem)] w-full min-h-0 bg-slate-50/50 font-sans border border-slate-200 rounded-md shadow-sm">

 {/* ── Header (Sticky) ── */}
 <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
 <div className="px-5 py-2 flex items-center gap-2 flex-wrap">

 {/* Busca Projeto/Cliente */}
 <div className="relative flex items-center" style={{ minWidth: 170, maxWidth: 220 }}>
 <Search className="absolute left-2.5 text-slate-400 pointer-events-none" size={13} />
 <input id="acomp-search-projeto" type="text" placeholder="Projeto / cliente..."
 value={fSearchInput}
 onChange={e => setFSearchInput(e.target.value)}
 onKeyDown={e => { if(e.key === 'Enter') handleRefresh(); }}
 className="w-full pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] outline-none" />
 {fSearchInput && (
 <button onClick={() => { setFSearchInput(''); setFSearchProjeto(''); }}
 className="absolute right-1.5 text-slate-300 hover:text-red-500 transition-colors">
 <X size={12} />
 </button>
 )}
 </div>

 {/* Busca Descrição */}
 <div className="relative flex items-center" style={{ minWidth: 170, maxWidth: 220 }}>
 <Search className="absolute left-2.5 text-slate-400 pointer-events-none" size={13} />
 <input id="acomp-search-descricao" type="text" placeholder="Buscar descrição..."
 value={fDescricaoInput}
 onChange={e => setFDescricaoInput(e.target.value)}
 onKeyDown={e => { if(e.key === 'Enter') handleRefresh(); }}
 className="w-full pl-8 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] outline-none" />
 {fDescricaoInput && (
 <button onClick={() => { setFDescricaoInput(''); setFSearchDescricao(''); }}
 className="absolute right-1.5 text-slate-300 hover:text-red-500 transition-colors">
 <X size={12} />
 </button>
 )}
 </div>

 {/* Data Previsao: De — Até */}
 <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
 <Calendar size={12} className="text-slate-400 shrink-0" />
 <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">Data Previsao:</span>
 <span className="text-[10px] text-slate-400 whitespace-nowrap">De</span>
 <input id="acomp-data-de" type="date" value={fDataDe}
 onChange={e => setFDataDe(e.target.value)} title="Data inicial"
 className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer w-30" />
 {fDataDe && <button onClick={() => setFDataDe('')} className="text-slate-300 hover:text-red-500 transition-colors"><X size={11} /></button>}
 <span className="text-slate-300 text-xs">—</span>
 <span className="text-[10px] text-slate-400 whitespace-nowrap">Até</span>
 <input id="acomp-data-ate" type="date" value={fDataAte}
 onChange={e => setFDataAte(e.target.value)} title="Data final"
 className="text-xs border-0 outline-none bg-transparent text-slate-700 cursor-pointer w-30" />
 {fDataAte && <button onClick={() => setFDataAte('')} className="text-slate-300 hover:text-red-500 transition-colors"><X size={11} /></button>}
 </div>

 {/* Status do Projeto: Liberados / Não Liberados / Finalizados / Todos */}
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">Status do Projeto:</span>
 <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
 {(['liberados', 'nao_liberados', 'finalizados', 'todos'] as const).map(m => (
 <button key={m} onClick={() => setFModo(m)}
 className={`px-2 py-0.5 font-semibold transition-colors border-r border-slate-100 last:border-0 ${fModo === m ? 'bg-[#32423D] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
 {m === 'liberados' ? 'Liberados' : m === 'nao_liberados' ? 'Não Liberados' : m === 'finalizados' ? 'Finalizados' : 'Todos'}
 </button>
 ))}
 </div>
 </div>

 {/* Limpar */}
 <button
 onClick={() => { setFSearchInput(''); setFSearchProjeto(''); setFDescricaoInput(''); setFSearchDescricao(''); setFStatus(''); setFDataDe(''); setFDataAte(''); setFModo('liberados'); }}
 title="Limpar todos os filtros"
 className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors">
 <X size={12} /> Limpar
 </button>

 {/* Pesquisar */}
 <button onClick={handleRefresh}
 className="px-4 py-1.5 font-bold text-xs rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 hover:bg-emerald-200 transition-colors shadow-sm">
 Pesquisar
 </button>

 {/* Separador */}
 <div className="w-px h-5 bg-slate-200 mx-1" />

 {/* View Switcher */}
 <div className="flex bg-slate-100 p-0.5 rounded-lg">
 <button onClick={() => setMainViewMode('lista')}
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold transition-all ${mainViewMode === 'lista' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <LayoutList size={13} /> Lista
 </button>
 <button onClick={() => setMainViewMode('gantt')}
 className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold transition-all ${mainViewMode === 'gantt' ? 'bg-white text-[#32423D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
 <GanttChartSquare size={13} /> Ver Gantt Geral
 </button>
 </div>

 {/* Mostrar Recursos (visível só no Gantt Geral) */}
 {mainViewMode === 'gantt' && (
 <button
 onClick={() => setShowGridResources(v => !v)}
 className={`flex items-center gap-1.5 px-2 py-0.5 ml-2 text-xs font-bold rounded-lg border transition-colors ${
 showGridResources
 ? 'bg-blue-100 border-blue-300 text-blue-700'
 : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
 }`}
 >
 <Package size={12} /> Mostrar Recursos
 </button>
 )}

 {/* Detalhar Tags (condicional) */}
 {selected && (
 <button id="btn-detalhar-projeto" onClick={() => setDetalhe(selected)}
 className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold rounded-lg shadow hover:opacity-90 transition-all">
 <ChevronRight size={13} /> Detalhar Tags
 </button>
 )}

 {/* Total Projetos */}
 <div className="border-l border-slate-200 pl-3 ml-1 text-right">
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total Projetos</div>
 <div className="text-base font-black text-[#32423D] leading-tight">{projetos.length}</div>
 </div>

 </div>
 </div>


 {/* ── Table ── */}
 <div className="flex-1 overflow-auto custom-scrollbar relative">
 {error && (
 <div className="m-4 p-4 bg-red-50 text-red-600 rounded-md border border-red-200 flex items-center gap-2 text-xs">
 <AlertTriangle size={14} /> {error}
 </div>
 )}

 {!loading && projetos.length === 0 && !error && (
 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
 <Layers size={48} className="mb-4 opacity-20" />
 <p className="text-xs font-medium">Nenhum projeto encontrado</p>
 </div>
 )}

 {projetos.length > 0 && (
 mainViewMode === 'lista' ? (
 <table className="w-full text-[11px] border-collapse table-fixed">
 <thead className="bg-[#567469] text-white sticky top-0 z-20 shadow-sm">
 <tr className="bg-[#0B3A2D] text-white border-b border-[#0B3A2D]">
 <th className="px-2 py-2 text-left font-black tracking-wider uppercase border-r border-[#155A47]" style={{ width: '30%' }}>Projeto / Cliente</th>
 <th className="px-2 py-2 text-center font-black tracking-wider uppercase border-r border-[#155A47]" style={{ width: '10%' }}>Data Previsão</th>
 <th className="px-2 py-2 text-center font-black tracking-wider uppercase border-r border-[#155A47]" style={{ width: '6%' }}>Tags</th>
 {setoresAtivos.map(s => (
 <th key={s.key} className="px-1 py-2 text-center font-black tracking-wider uppercase border-r border-[#155A47]"
   style={{ width: `${Math.floor(46 / Math.max(setoresAtivos.length, 1))}%` }}>
   <span className="text-[9px]">{s.label}</span>
 </th>
 ))}
 <th className="px-2 py-2 text-center font-black tracking-wider uppercase" style={{ width: '8%' }}>Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 bg-white">
 {projetos.map(p => {
 const isSelected = selected?.IdProjeto === p.IdProjeto;
 const finalizado = p.Finalizado === 'C';
 
 const firstSectorKey = setoresAtivos.length > 0 ? setoresAtivos[0].key : null;
 let isAtrasado = false;
 
 const parseDateSafe = (dStr: string) => {
 if (!dStr) return null;
 if (/^\d{2}\/\d{2}\/\d{4}/.test(dStr)) {
 const parts = dStr.split(/[\s/:]+/);
 if (parts.length >= 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
 }
 const d = new Date(dStr);
 if (!isNaN(d.getTime())) return d;
 return null;
 };

 if (firstSectorKey && p.DataPrevisao) {
 const dataRealizado = (p as Record<string, unknown>)[`RealizadoInicio${firstSectorKey}`];
 const dtPrevisao = parseDateSafe(p.DataPrevisao);
 if (dtPrevisao) {
 dtPrevisao.setHours(0,0,0,0);
 if (dataRealizado) {
 const dtRealizado = parseDateSafe(dataRealizado);
 if (dtRealizado) { dtRealizado.setHours(0,0,0,0); if (dtRealizado > dtPrevisao) isAtrasado = true; }
 } else {
 const hoje = new Date(); hoje.setHours(0,0,0,0);
 if (hoje > dtPrevisao) isAtrasado = true;
 }
 }
 }

 return (
 <tr
 key={p.IdProjeto}
 onClick={() => setSelected(isSelected ? null : p)}
 className={`cursor-pointer transition-all ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'} ${finalizado ? 'bg-emerald-50/30' : ''}`}
 >
 {/* Projeto / Cliente */}
 <td className="px-2 py-1.5 border-r border-slate-100 overflow-hidden">
 <div className="flex items-center gap-1.5 min-w-0">
   <div className="font-black text-slate-800 leading-tight truncate">{p.Projeto}</div>
   {p.DescEmpresa && <div className="text-[9px] text-slate-500 truncate uppercase shrink-0 bg-slate-100 px-1 rounded-sm max-w-[40%]">{p.DescEmpresa}</div>}
 </div>
 </td>
 {/* Data Previsão */}
 <td className={`px-1 py-1.5 text-center border-r border-slate-100 font-bold whitespace-nowrap text-[10px] ${isAtrasado && !finalizado ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}>
 <div className="flex flex-col items-center gap-0.5">
   <span>{fmtDate(p.DataPrevisao)}</span>
   {finalizado && p.DataFinalizado && (
   <span className="text-[8px] text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded border border-emerald-200">✓ {fmtDate(p.DataFinalizado)}</span>
   )}
 </div>
 </td>
 {/* Tags */}
 <td className="px-1 py-1.5 text-center border-r border-slate-100 font-black text-slate-700">
 {p.QtdeTags || 0}
 </td>
 {/* Setores */}
 {setoresAtivos.map(s => (
 <td key={s.key} className="px-0.5 py-1">
 <SetorCell
   total={Number((p as Record<string, unknown>)[`Total${s.key}`]) || 0}
   exec={Number((p as Record<string, unknown>)[`Exec${s.key}`]) || 0}
   pct={Number((p as Record<string, unknown>)[`Pct${s.key}`]) || 0}
   color={s.color}
 />
 </td>
 ))}
 {/* Ações */}
 <td className="px-1 py-1.5 text-center">
 <button
   onClick={(e) => { e.stopPropagation(); setDetalhe(p); }}
   className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-[9px] font-bold shadow-sm whitespace-nowrap"
 >
   <GanttChartSquare size={10} /> Ver Gantt
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 ) : (
 <GanttChart data={projetos} mode="projeto" setoresVisiveis={setoresAtivos} showResources={showGridResources} />
 )
 )}

 {loading && (
 <div className="flex justify-center p-10">
 <Loader className="animate-spin text-[#32423D]" size={24} />
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
