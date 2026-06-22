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
    processosIniciais?: { IdProcesso: number; NomeProcesso: string; TempoPadraoMin: number | null; Observacao: string; SequenciaExecucao: number }[];
}

// Decodifica o JWT sem lib externa
function parseJwt(token: string): any {
    try { return JSON.parse(atob(token.split('.')[1])); }
    catch { return {}; }
}

export default function ProcessoFabricacaoModal({ desenho, onConfirm, onCancel, processosIniciais }: Props) {
    const { user } = useAuth();
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Formulário de adição
    const [selectedIdProcesso, setSelectedIdProcesso] = useState<number | ''>('');
    const [observacao, setObservacao] = useState('');
    const [processosAdicionados, setProcessosAdicionados] = useState<ProcessoSelecionado[]>([]);

    // Tempo estimado (HH:MM)
    const [tempoHoras, setTempoHoras] = useState('0');
    const [tempoMinutos, setTempoMinutos] = useState('0');

    // Tempo padrão (HH:MM) — salvo em TempoPadraoMin
    const [tempoPadraoHoras, setTempoPadraoHoras] = useState('0');
    const [tempoPadraoMinutos, setTempoPadraoMinutos] = useState('0');

    // Sequência de execução (datalist 10-150 ou livre)
    const [sequenciaInput, setSequenciaInput] = useState('10');

    // Modo edição de linha existente
    const [editingSeq, setEditingSeq] = useState<number | null>(null);

    useEffect(() => {
        fetchProcessos();
    }, []);

    // Pré-carrega processos existentes quando em modo manutenção
    useEffect(() => {
        if (processosIniciais && processosIniciais.length > 0) {
            setProcessosAdicionados(processosIniciais.map(p => ({
                seq: p.SequenciaExecucao,
                IdProcesso: p.IdProcesso,
                nomeProcesso: p.NomeProcesso,
                TempoPadraoMin: p.TempoPadraoMin !== null ? Number(p.TempoPadraoMin) : null,
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

    // Converte HH:MM para minutos decimais
    const tempoEmMinutos = (): number | null => {
        const h = parseInt(tempoHoras) || 0;
        const m = parseInt(tempoMinutos) || 0;
        const total = h * 60 + m;
        return total > 0 ? total : null;
    };

    const tempoPadraoEmMinutos = (): number | null => {
        const h = parseInt(tempoPadraoHoras) || 0;
        const m = parseInt(tempoPadraoMinutos) || 0;
        const total = h * 60 + m;
        return total > 0 ? total : null;
    };

    // Converte minutos de volta para HH e MM (para popular o form ao editar)
    const minutesToHHMM = (min: number | null): { h: string; m: string } => {
        if (!min || min <= 0) return { h: '0', m: '0' };
        return { h: String(Math.floor(min / 60)), m: String(Math.round(min % 60)) };
    };

    const handleEditRow = (p: ProcessoSelecionado) => {
        setEditingSeq(p.seq);
        setSelectedIdProcesso(p.IdProcesso);
        setSequenciaInput(String(p.seq));
        const est = minutesToHHMM(p.TempoEstimadoMin);
        setTempoHoras(est.h);
        setTempoMinutos(est.m);
        const pad = minutesToHHMM(p.TempoPadraoMin);
        setTempoPadraoHoras(pad.h);
        setTempoPadraoMinutos(pad.m);
        setObservacao(p.Observacao || '');
    };

    const handleCancelEdit = () => {
        setEditingSeq(null);
        setSelectedIdProcesso('');
        setObservacao('');
        setTempoHoras('0');
        setTempoMinutos('0');
        setTempoPadraoHoras('0');
        setTempoPadraoMinutos('0');
        setSequenciaInput('10');
    };

    const handleAddProcesso = () => {
        // --- MODO ATUALIZAÇÃO ---
        if (editingSeq !== null) {
            // Se o usuário mudou a sequência, verifica unicidade contra as demais linhas
            const newSeq = parseInt(sequenciaInput) || editingSeq;
            if (newSeq !== editingSeq) {
                const seqDuplicada = processosAdicionados.some(p => p.seq === newSeq);
                if (seqDuplicada) {
                    alert(`Sequência ${newSeq} já está em uso. A SequenciaExecucao deve ser única por produto.`);
                    return;
                }
            }
            setProcessosAdicionados(prev => prev.map(p =>
                p.seq === editingSeq
                    ? { ...p, seq: newSeq, TempoEstimadoMin: tempoEmMinutos(), TempoPadraoMin: tempoPadraoEmMinutos(), Observacao: observacao }
                    : p
            ));
            handleCancelEdit();
            return;
        }
        // --- MODO INCLUSÃO ---
        if (!selectedIdProcesso) return;
        const proc = processos.find(p => p.IdProcessoFabricacao === selectedIdProcesso);
        if (!proc) return;
        const seq = parseInt(sequenciaInput) || (processosAdicionados.length + 1);
        // Valida unicidade da sequência
        if (processosAdicionados.some(p => p.seq === seq)) {
            alert(`Sequência ${seq} já está em uso. Escolha outro número ou altere a sequência existente.`);
            return;
        }
        // Valida processo único por peça
        if (processosAdicionados.some(p => p.IdProcesso === proc.IdProcessoFabricacao)) {
            alert(`O processo "${proc.ProcessoFabricacao}" já foi adicionado a esta peça. Cada processo pode aparecer apenas uma vez.`);
            return;
        }
        setProcessosAdicionados(prev => [...prev, {
            seq,
            IdProcesso: proc.IdProcessoFabricacao,
            nomeProcesso: proc.ProcessoFabricacao,
            TempoEstimadoMin: tempoEmMinutos(),
            TempoPadraoMin: tempoPadraoEmMinutos(),
            Observacao: observacao,
        }]);
        setSelectedIdProcesso('');
        setObservacao('');
        setTempoHoras('0');
        setTempoMinutos('0');
        setTempoPadraoHoras('0');
        setTempoPadraoMinutos('0');
        setSequenciaInput(String(seq + 10));
    };

    const handleRemove = (seq: number) => {
        setProcessosAdicionados(prev =>
            prev.filter(p => p.seq !== seq).map((p, i) => ({ ...p, seq: i + 1 }))
        );
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
                        IdProcesso: p.IdProcesso,
                        SequenciaExecucao: p.seq,
                        TempoEstimadoMin: p.TempoEstimadoMin,
                        TempoPadraoMin: p.TempoPadraoMin,
                        Observacao: p.Observacao,
                    })),
                    codmatFabricante: desenho.CodMatFabricante,
                    idMatriz,
                    usuarioCriacao,
                    replace: !!(processosIniciais && processosIniciais.length > 0), // substitui registros existentes
                };
                const res = await fetch('/api/peca-manufaturada/material-processo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                const json = await res.json();
                if (!json.success) { alert('Erro ao salvar processos: ' + json.message); return; }
            }
            onConfirm(desenho, processosAdicionados);
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar processos.');
        } finally { setSaving(false); }
    };

    const handleSkip = () => onConfirm(desenho!, []);

    if (!desenho) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">
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
                        <p className="text-[11px] text-gray-300 leading-tight truncate max-w-[500px]">{desenho.DescResumo}</p>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Warning banner */}
                <div className="flex items-start gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 shrink-0">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-800 leading-snug">
                        <strong>Atenção:</strong> A ordem de produção deste produto respeitará a sequência de seleção dos processos.
                        O <strong>primeiro processo adicionado</strong> será executado primeiro (Sequência 1), e assim por diante.
                        Exemplo: Corte → Dobra → Pintura.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4">
                    {/* Form de adição / edição */}
                    <div className={`border rounded-xl p-3 flex flex-col gap-3 ${editingSeq !== null ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                                {editingSeq !== null ? `✏️ Editando Sequência ${editingSeq}` : 'Adicionar Processo'}
                            </p>
                            {editingSeq !== null && (
                                <button onClick={handleCancelEdit} className="text-[10px] text-blue-500 hover:text-blue-700 underline">
                                    Cancelar edição
                                </button>
                            )}
                        </div>

                        {/* Combobox processo + Sequência */}
                        <div className="flex gap-2 items-center">
                            <select
                                value={selectedIdProcesso}
                                onChange={e => setSelectedIdProcesso(e.target.value ? Number(e.target.value) : '')}
                                disabled={editingSeq !== null}
                                className={`flex-1 min-w-0 px-2 py-1.5 text-[12px] border rounded-lg focus:outline-none bg-white ${
                                    editingSeq !== null
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 focus:border-[#32423D]'
                                }`}
                            >
                                <option value="">— Selecione o processo —</option>
                                {processos.map(p => (
                                    <option key={p.IdProcessoFabricacao} value={p.IdProcessoFabricacao}>
                                        {p.ProcessoFabricacao} {p.CodigoProcessoFabricacao ? `(${p.CodigoProcessoFabricacao})` : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Sequência de execução */}
                            <div className="flex flex-col items-center shrink-0">
                                <datalist id="seqOpcoes">
                                    {[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150].map(n => (
                                        <option key={n} value={n} />
                                    ))}
                                </datalist>
                                <input
                                    type="number"
                                    min="10"
                                    step="10"
                                    list="seqOpcoes"
                                    value={sequenciaInput}
                                    onChange={e => setSequenciaInput(e.target.value)}
                                    className="w-20 px-2 py-1.5 text-center text-[12px] font-mono font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D] bg-white"
                                    title="Sequência de execução"
                                />
                                <span className="text-[9px] text-gray-400 mt-0.5">Seq. exec.</span>
                            </div>
                        </div>

                        {/* Tempo estimado (HH:MM) — obrigatório */}
                        <div className="flex items-center gap-2 bg-white border border-[#32423D]/30 rounded-lg px-3 py-2">
                            <Clock size={15} className="text-[#32423D] shrink-0" />
                            <span className="text-[11px] text-gray-700 font-bold shrink-0 w-28">
                                Tempo Estimado: <span className="text-red-500">*</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <div className="flex flex-col items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        value={tempoHoras}
                                        onChange={e => setTempoHoras(e.target.value)}
                                        className="w-14 px-2 py-1 text-center text-[13px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    <span className="text-[9px] text-gray-400 mt-0.5">horas</span>
                                </div>
                                <span className="text-lg font-bold text-gray-500 pb-3">:</span>
                                <div className="flex flex-col items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={tempoMinutos}
                                        onChange={e => setTempoMinutos(e.target.value)}
                                        className="w-14 px-2 py-1 text-center text-[13px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    <span className="text-[9px] text-gray-400 mt-0.5">minutos</span>
                                </div>
                            </div>
                            {tempoEmMinutos() != null ? (
                                <span className="ml-auto text-[10px] text-[#32423D] font-semibold bg-[#32423D]/10 px-2 py-0.5 rounded-full">
                                    {tempoEmMinutos()} min
                                </span>
                            ) : (
                                <span className="ml-auto text-[10px] text-red-400 font-semibold">Obrigatório</span>
                            )}
                        </div>

                        {/* Tempo padrão (HH:MM) — obrigatório, salvo em TempoPadraoMin */}
                        <div className="flex items-center gap-2 bg-white border border-[#32423D]/30 rounded-lg px-3 py-2">
                            <Clock size={15} className="text-[#32423D] shrink-0" />
                            <span className="text-[11px] text-gray-700 font-bold shrink-0 w-28">
                                Tempo Padrão: <span className="text-red-500">*</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                                <div className="flex flex-col items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        value={tempoPadraoHoras}
                                        onChange={e => setTempoPadraoHoras(e.target.value)}
                                        className="w-14 px-2 py-1 text-center text-[13px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    <span className="text-[9px] text-gray-400 mt-0.5">horas</span>
                                </div>
                                <span className="text-lg font-bold text-gray-500 pb-3">:</span>
                                <div className="flex flex-col items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={tempoPadraoMinutos}
                                        onChange={e => setTempoPadraoMinutos(e.target.value)}
                                        className="w-14 px-2 py-1 text-center text-[13px] font-mono font-bold border border-[#32423D]/40 rounded focus:outline-none focus:border-[#32423D]"
                                    />
                                    <span className="text-[9px] text-gray-400 mt-0.5">minutos</span>
                                </div>
                            </div>
                            {tempoPadraoEmMinutos() != null ? (
                                <span className="ml-auto text-[10px] text-[#32423D] font-semibold bg-[#32423D]/10 px-2 py-0.5 rounded-full">
                                    {tempoPadraoEmMinutos()} min padrão
                                </span>
                            ) : (
                                <span className="ml-auto text-[10px] text-red-400 font-semibold">Obrigatório</span>
                            )}
                        </div>

                        {/* Observação */}
                        <input
                            type="text"
                            placeholder="Observação (opcional)..."
                            value={observacao}
                            onChange={e => setObservacao(e.target.value)}
                            className="w-full px-3 py-1.5 text-[12px] border border-gray-300 rounded-lg focus:outline-none focus:border-[#32423D]"
                        />

                        <button
                            onClick={handleAddProcesso}
                            disabled={editingSeq !== null
                                ? (tempoPadraoEmMinutos() === null || tempoEmMinutos() === null)
                                : (!selectedIdProcesso || tempoPadraoEmMinutos() === null || tempoEmMinutos() === null || !sequenciaInput)
                            }
                            title={
                                !selectedIdProcesso && editingSeq === null ? 'Selecione um processo'
                                : tempoEmMinutos() === null ? 'Informe o Tempo Estimado (obrigatório)'
                                : tempoPadraoEmMinutos() === null ? 'Informe o Tempo Padrão (obrigatório)'
                                : ''
                            }
                            className="flex items-center justify-center gap-2 py-2 bg-[#32423D] text-white rounded-lg text-[12px] font-bold hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={14} />
                            {editingSeq !== null ? 'Atualizar Tempos' : 'Adicionar à Sequência'}
                        </button>
                    </div>

                    {/* Lista de processos adicionados */}
                    {processosAdicionados.length > 0 && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shrink-0">
                            <div className="px-3 py-2 bg-[#32423D]/5 border-b border-gray-200">
                                <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                                    Sequência de Fabricação ({processosAdicionados.length} processo{processosAdicionados.length > 1 ? 's' : ''})
                                </p>
                            </div>
                            <table className="w-full text-[11px]">
                                <thead className="bg-gray-100 text-gray-600 text-[10px] uppercase">
                                    <tr>
                                        <th className="p-1.5 px-3 font-bold text-center w-10">Seq.</th>
                                        <th className="p-1.5 px-3 font-bold">Processo</th>
                                        <th className="p-1.5 px-3 font-bold text-center">Tempo (min)</th>
                                        <th className="p-1.5 px-3 font-bold">Observação</th>
                                        <th className="p-1.5 px-3 font-bold text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {processosAdicionados.map((p) => (
                                        <tr
                                            key={p.seq}
                                            onClick={() => handleEditRow(p)}
                                            className={`cursor-pointer transition-colors ${
                                                editingSeq === p.seq
                                                    ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                                                    : 'hover:bg-amber-50'
                                            }`}
                                            title="Clique para editar os tempos deste processo"
                                        >
                                            <td className="p-1.5 px-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${
                                                    editingSeq === p.seq ? 'bg-blue-600' : 'bg-[#32423D]'
                                                }`}>{p.seq}</span>
                                            </td>
                                            <td className="p-1.5 px-3 font-semibold text-[#32423D]">{p.nomeProcesso}</td>
                                            <td className="p-1.5 px-3 text-center text-gray-600">
                                                {p.TempoPadraoMin != null ? Number(p.TempoPadraoMin).toFixed(2) : '—'}
                                            </td>
                                            <td className="p-1.5 px-3 text-gray-500 truncate max-w-[150px]" title={p.Observacao}>{p.Observacao || '—'}</td>
                                            <td className="p-1.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleRemove(p.seq)} className="p-1 text-red-400 hover:text-red-600 rounded">
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {processosAdicionados.length > 1 && (
                                <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
                                    <ChevronRight size={12} className="text-amber-500" />
                                    <span className="text-[10px] text-amber-700">
                                        Ordem: {processosAdicionados.map(p => p.nomeProcesso).join(' → ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0 gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                        Cancelar
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSkip}
                            className="px-4 py-2 text-[12px] text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Continuar sem processos
                        </button>
                        <button
                            onClick={handleSalvar}
                            disabled={saving || processosAdicionados.length === 0}
                            className="flex items-center gap-2 px-4 py-2 text-[12px] bg-[#32423D] text-white rounded-lg font-bold hover:bg-[#25322e] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save size={14} />
                            {saving ? 'Salvando...' : `Salvar ${processosAdicionados.length > 0 ? `(${processosAdicionados.length})` : ''} e Continuar`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
