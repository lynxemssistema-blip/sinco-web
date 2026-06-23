import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Trash2, AlertTriangle, ChevronRight, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Processo {
    IdProcessoFabricacao: number;
    ProcessoFabricacao: string;
    CodigoProcessoFabricacao: string;
}

interface ProcessoSelecionado {
    seq: number;
    IdProcesso: number;
    nomeProcesso: string;
    TempoEstimadoMin: number | null;
    TempoPadraoMin: number | null;
    Observacao: string;
}

interface Props {
    desenho: { IdMaterial: number; CodMatFabricante: string; DescResumo: string } | null;
    onConfirm: (desenho: any, processos: ProcessoSelecionado[]) => void;
    onCancel: () => void;
    processosIniciais?: { IdProcesso: number; NomeProcesso: string; TempoEstimadoMin: number | null; TempoPadraoMin: number | null; Observacao: string; SequenciaExecucao: number }[];
}

function parseJwt(token: string): any {
    try { return JSON.parse(atob(token.split('.')[1])); }
    catch { return {}; }
}

export default function ProcessoFabricacaoModal({ desenho, onConfirm, onCancel, processosIniciais }: Props) {
    const { user } = useAuth();
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [selectedIdProcesso, setSelectedIdProcesso] = useState<number | ''>('');
    const [observacao, setObservacao] = useState('');
    const [processosAdicionados, setProcessosAdicionados] = useState<ProcessoSelecionado[]>([]);

    const [tempoHoras, setTempoHoras] = useState('0');
    const [tempoMinutos, setTempoMinutos] = useState('0');
    const [tempoPadraoHoras, setTempoPadraoHoras] = useState('0');
    const [tempoPadraoMinutos, setTempoPadraoMinutos] = useState('0');
    const [sequenciaInput, setSequenciaInput] = useState('10');
    const [editingSeq, setEditingSeq] = useState<number | null>(null);

    useEffect(() => { fetchProcessos(); }, []);

    useEffect(() => {
        if (processosIniciais && processosIniciais.length > 0) {
            setProcessosAdicionados(processosIniciais.map(p => ({
                seq: p.SequenciaExecucao,
                IdProcesso: p.IdProcesso,
                nomeProcesso: p.NomeProcesso,
                TempoEstimadoMin: p.TempoEstimadoMin != null ? Number(p.TempoEstimadoMin) : null,
                TempoPadraoMin: p.TempoPadraoMin != null ? Number(p.TempoPadraoMin) : null,
                Observacao: p.Observacao || '',
            })));
        }
    }, [processosIniciais]);

    const fetchProcessos = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/peca-manufaturada/processos');
            const json = await res.json();
            if (json.success) setProcessos(json.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const tempoEmMinutos = (): number | null => {
        const total = (parseInt(tempoHoras) || 0) * 60 + (parseInt(tempoMinutos) || 0);
        return total > 0 ? total : null;
    };

    const tempoPadraoEmMinutos = (): number | null => {
        const total = (parseInt(tempoPadraoHoras) || 0) * 60 + (parseInt(tempoPadraoMinutos) || 0);
        return total > 0 ? total : null;
    };

    const minutesToHHMM = (min: number | null): { h: string; m: string } => {
        if (!min || min <= 0) return { h: '0', m: '0' };
        return { h: String(Math.floor(min / 60)), m: String(Math.round(min % 60)) };
    };

    const handleEditRow = (p: ProcessoSelecionado) => {
        setEditingSeq(p.seq);
        setSelectedIdProcesso(p.IdProcesso);
        setSequenciaInput(String(p.seq));
        const est = minutesToHHMM(p.TempoEstimadoMin);
        setTempoHoras(est.h); setTempoMinutos(est.m);
        const pad = minutesToHHMM(p.TempoPadraoMin);
        setTempoPadraoHoras(pad.h); setTempoPadraoMinutos(pad.m);
        setObservacao(p.Observacao || '');
    };

    const handleCancelEdit = () => {
        setEditingSeq(null); setSelectedIdProcesso(''); setObservacao('');
        setTempoHoras('0'); setTempoMinutos('0');
        setTempoPadraoHoras('0'); setTempoPadraoMinutos('0');
        setSequenciaInput('10');
    };

    const handleAddProcesso = () => {
        if (editingSeq !== null) {
            const newSeq = parseInt(sequenciaInput) || editingSeq;
            if (newSeq !== editingSeq && processosAdicionados.some(p => p.seq === newSeq)) {
                alert(`Sequência ${newSeq} já está em uso.`); return;
            }
            setProcessosAdicionados(prev => prev.map(p =>
                p.seq === editingSeq
                    ? { ...p, seq: newSeq, TempoEstimadoMin: tempoEmMinutos(), TempoPadraoMin: tempoPadraoEmMinutos(), Observacao: observacao }
                    : p
            ));
            handleCancelEdit(); return;
        }
        if (!selectedIdProcesso) return;
        const proc = processos.find(p => p.IdProcessoFabricacao === selectedIdProcesso);
        if (!proc) return;
        const seq = parseInt(sequenciaInput) || (processosAdicionados.length + 1);
        if (processosAdicionados.some(p => p.seq === seq)) {
            alert(`Sequência ${seq} já está em uso.`); return;
        }
        if (processosAdicionados.some(p => p.IdProcesso === proc.IdProcessoFabricacao)) {
            alert(`O processo "${proc.ProcessoFabricacao}" já foi adicionado.`); return;
        }
        setProcessosAdicionados(prev => [...prev, {
            seq, IdProcesso: proc.IdProcessoFabricacao, nomeProcesso: proc.ProcessoFabricacao,
            TempoEstimadoMin: tempoEmMinutos(), TempoPadraoMin: tempoPadraoEmMinutos(), Observacao: observacao,
        }]);
        setSelectedIdProcesso(''); setObservacao('');
        setTempoHoras('0'); setTempoMinutos('0');
        setTempoPadraoHoras('0'); setTempoPadraoMinutos('0');
        setSequenciaInput(String(seq + 10));
    };

    const handleRemove = (seq: number) => {
        setProcessosAdicionados(prev => prev.filter(p => p.seq !== seq).map((p, i) => ({ ...p, seq: i + 1 })));
    };

    const handleSalvar = async () => {
        if (!desenho) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('sinco_token') || '';
            const payload = parseJwt(token);
            const idMatriz = payload.tenantId || null;
            const usuarioCriacao = user?.nome || 'Sistema';
            if (processosAdicionados.length > 0) {
                const body = {
                    processos: processosAdicionados.map(p => ({
                        IdProcesso: p.IdProcesso, SequenciaExecucao: p.seq,
                        TempoEstimadoMin: p.TempoEstimadoMin, TempoPadraoMin: p.TempoPadraoMin, Observacao: p.Observacao,
                    })),
                    codmatFabricante: desenho.CodMatFabricante, idMatriz, usuarioCriacao,
                    replace: !!(processosIniciais && processosIniciais.length > 0),
                };
                const res = await fetch('/api/peca-manufaturada/material-processo', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                });
                const json = await res.json();
                if (!json.success) { alert('Erro ao salvar processos: ' + json.message); return; }
            }
            onConfirm(desenho, processosAdicionados);
        } catch (e) { console.error(e); alert('Erro ao salvar processos.'); }
        finally { setSaving(false); }
    };

    const handleSkip = () => onConfirm(desenho!, []);

    if (!desenho) return null;

    const inputTime = "w-10 px-1 py-0.5 text-center text-[11px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D]";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#32423D] text-white shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] uppercase tracking-widest text-[#E0E800] font-bold">Processos de Fabricação</p>
                            {processosIniciais && processosIniciais.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[9px] font-bold rounded uppercase tracking-wide">
                                    Manutenção
                                </span>
                            )}
                        </div>
                        <h2 className="text-base font-bold leading-tight">{desenho.CodMatFabricante}</h2>
                        <p className="text-[11px] text-gray-300 leading-tight truncate max-w-[600px]">{desenho.DescResumo}</p>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X size={18} /></button>
                </div>



                {/* Body — dois grids verticais */}
                <div className="flex-1 overflow-hidden min-h-0 flex">

                    {/* COLUNA ESQUERDA — Formulário */}
                    <div className="w-[42%] flex flex-col gap-2 p-0 border-r border-gray-200 overflow-y-auto shrink-0">
                        {/* Header igual ao da coluna direita */}
                        <div className="flex items-center justify-between px-3 py-2 bg-[#32423D]/5 border-b border-gray-200 shrink-0">
                            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                                {editingSeq !== null ? `✏️ Editando Seq. ${editingSeq}` : 'Adicionar Processo'}
                            </p>
                            {editingSeq !== null && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-blue-500 hover:text-blue-700 underline">Cancelar</button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 p-3">

                            {/* Processo + Seq */}
                            <div className="flex gap-2 items-start">
                                {/* Combobox com label */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide mb-1">Processo</span>
                                    <select
                                        value={selectedIdProcesso}
                                        onChange={e => setSelectedIdProcesso(e.target.value ? Number(e.target.value) : '')}
                                        disabled={editingSeq !== null}
                                        className={`w-full px-2 py-1 text-[11px] border rounded-lg focus:outline-none bg-white ${editingSeq !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:border-[#32423D]'}`}
                                    >
                                        <option value="">— Selecione o processo —</option>
                                        {processos.map(p => (
                                            <option key={p.IdProcessoFabricacao} value={p.IdProcessoFabricacao}>
                                                {p.ProcessoFabricacao} {p.CodigoProcessoFabricacao ? `(${p.CodigoProcessoFabricacao})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* Sequência com label */}
                                <div className="flex flex-col items-center shrink-0">
                                    <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide mb-1 text-center whitespace-nowrap">Seq. Processo</span>
                                    <datalist id="seqOpcoes">
                                        {[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150].map(n => <option key={n} value={n} />)}
                                    </datalist>
                                    <input
                                        type="number" min="10" step="10" list="seqOpcoes"
                                        value={sequenciaInput} onChange={e => setSequenciaInput(e.target.value)}
                                        className="w-16 px-1 py-1 text-center text-[11px] font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D] bg-white"
                                        title="Sequência de execução"
                                    />
                                </div>
                            </div>

                            {/* TEMPOS COMPACTADOS — uma linha só, sem quebra */}
                            <div className="bg-white border border-[#32423D]/25 rounded-lg px-2 py-1.5">
                                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap overflow-hidden">
                                    <Clock size={11} className="text-[#32423D] shrink-0" />
                                    {/* Estimado */}
                                    <span className="text-[9.5px] text-gray-600 font-bold shrink-0">Est.<span className="text-red-500">*</span></span>
                                    <input type="number" min="0" max="99" value={tempoHoras} onChange={e => setTempoHoras(e.target.value)} className="w-9 px-0.5 py-0.5 text-center text-[10px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D] shrink-0" />
                                    <span className="text-gray-400 text-xs font-bold shrink-0">:</span>
                                    <input type="number" min="0" max="59" value={tempoMinutos} onChange={e => setTempoMinutos(e.target.value)} className="w-9 px-0.5 py-0.5 text-center text-[10px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D] shrink-0" />
                                    <span className="text-[8px] text-gray-400 shrink-0">h:m</span>
                                    {/* Divisor */}
                                    <div className="w-px h-3.5 bg-gray-200 mx-1 shrink-0" />
                                    {/* Padrão */}
                                    <span className="text-[9.5px] text-gray-600 font-bold shrink-0">Padrão<span className="text-red-500">*</span></span>
                                    <input type="number" min="0" max="99" value={tempoPadraoHoras} onChange={e => setTempoPadraoHoras(e.target.value)} className="w-9 px-0.5 py-0.5 text-center text-[10px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D] shrink-0" />
                                    <span className="text-gray-400 text-xs font-bold shrink-0">:</span>
                                    <input type="number" min="0" max="59" value={tempoPadraoMinutos} onChange={e => setTempoPadraoMinutos(e.target.value)} className="w-9 px-0.5 py-0.5 text-center text-[10px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D] shrink-0" />
                                    <span className="text-[8px] text-gray-400 shrink-0">h:m</span>
                                    {/* Status */}
                                    {tempoEmMinutos() != null && tempoPadraoEmMinutos() != null ? (
                                        <span className="ml-auto text-[8.5px] text-[#32423D] font-semibold bg-[#32423D]/10 px-1 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                            {tempoEmMinutos()}m/{tempoPadraoEmMinutos()}m
                                        </span>
                                    ) : (
                                        <span className="ml-auto text-[8.5px] text-red-400 font-semibold whitespace-nowrap shrink-0">Obrigatório</span>
                                    )}
                                </div>
                            </div>

                            {/* Observação */}
                            <input
                                type="text" placeholder="Observação (opcional)..."
                                value={observacao} onChange={e => setObservacao(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-[11px] border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D]"
                            />

                            <button
                                onClick={handleAddProcesso}
                                disabled={editingSeq !== null
                                    ? (tempoPadraoEmMinutos() === null || tempoEmMinutos() === null)
                                    : (!selectedIdProcesso || tempoPadraoEmMinutos() === null || tempoEmMinutos() === null || !sequenciaInput)
                                }
                                className="flex items-center justify-center gap-1.5 py-1.5 bg-[#32423D] text-white rounded-lg text-[11px] font-bold hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={13} />
                                {editingSeq !== null ? 'Atualizar Tempos' : 'Adicionar à Sequência'}
                            </button>
                            </div>
                        </div>

                    {/* COLUNA DIREITA — Histórico / Sequência */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="px-3 py-2 bg-[#32423D]/5 border-b border-gray-200 shrink-0 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                                Sequência de Fabricação
                            </p>
                            <span className="text-[10px] text-gray-500 font-medium">
                                {processosAdicionados.length} processo{processosAdicionados.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {processosAdicionados.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-300">
                                <Clock size={32} strokeWidth={1} />
                                <p className="text-[11px] text-center text-gray-400">
                                    Nenhum processo adicionado.<br />
                                    <span className="text-[10px] text-gray-300">Use o painel ao lado para adicionar.</span>
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto flex flex-col">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-gray-100 text-gray-600 text-[9.5px] uppercase sticky top-0">
                                        <tr>
                                            <th className="p-1.5 px-2 font-bold text-center w-8">Seq.</th>
                                            <th className="p-1.5 px-2 font-bold">Processo</th>
                                            <th className="p-1.5 px-2 font-bold text-center">Est.(min)</th>
                                            <th className="p-1.5 px-2 font-bold text-center">Padrão(min)</th>
                                            <th className="p-1.5 px-2 font-bold">Obs.</th>
                                            <th className="p-1.5 px-2 font-bold text-center w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {processosAdicionados.map((p) => (
                                            <tr
                                                key={p.seq}
                                                onClick={() => handleEditRow(p)}
                                                className={`cursor-pointer transition-colors ${editingSeq === p.seq ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : 'hover:bg-amber-50'}`}
                                                title="Clique para editar"
                                            >
                                                <td className="p-1.5 px-2 text-center">
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold ${editingSeq === p.seq ? 'bg-blue-600' : 'bg-[#32423D]'}`}>
                                                        {p.seq}
                                                    </span>
                                                </td>
                                                <td className="p-1.5 px-2 font-semibold text-[#32423D]">{p.nomeProcesso}</td>
                                                <td className="p-1.5 px-2 text-center text-gray-600">
                                                    {p.TempoEstimadoMin != null ? Number(p.TempoEstimadoMin).toFixed(0) : '—'}
                                                </td>
                                                <td className="p-1.5 px-2 text-center text-gray-600">
                                                    {p.TempoPadraoMin != null ? Number(p.TempoPadraoMin).toFixed(0) : '—'}
                                                </td>
                                                <td className="p-1.5 px-2 text-gray-500 truncate max-w-[80px]" title={p.Observacao}>{p.Observacao || '—'}</td>
                                                <td className="p-1.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleRemove(p.seq)} className="p-1 text-red-400 hover:text-red-600 rounded">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {processosAdicionados.length > 1 && (
                                    <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5 mt-auto shrink-0">
                                        <ChevronRight size={11} className="text-amber-500 shrink-0" />
                                        <span className="text-[10px] text-amber-700 truncate">
                                            {processosAdicionados.map(p => p.nomeProcesso).join(' → ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-200 bg-gray-50 shrink-0 gap-2">
                    <button onClick={onCancel} className="px-4 py-1.5 text-[11px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                        Cancelar
                    </button>
                    <div className="flex gap-2">
                        <button onClick={handleSkip} className="px-4 py-1.5 text-[11px] text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                            Continuar sem processos
                        </button>
                        <button
                            onClick={handleSalvar}
                            disabled={saving || processosAdicionados.length === 0}
                            className="flex items-center gap-2 px-4 py-1.5 text-[11px] bg-[#32423D] text-white rounded-lg font-bold hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save size={13} />
                            {saving ? 'Salvando...' : `Salvar ${processosAdicionados.length > 0 ? `(${processosAdicionados.length})` : ''} e Continuar`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
