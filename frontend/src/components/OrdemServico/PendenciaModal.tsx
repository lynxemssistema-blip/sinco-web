import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const API_BASE = '/api';

export interface OrdemServicoItem {
 IdOrdemServicoItem: number;
 IdOrdemServico?: string | number;
 DescResumo?: string;
 DescDetal?: string;
 Espessura?: string;
 CodMatFabricante?: string;
 MaterialSW?: string;
 Projeto?: string;
 Tag?: string;
 DescTag?: string;
}
export function PendenciaModal({ pendenciaModalOpen, setPendenciaModalOpen, selectedItemRnc, visibleSetores, onPendenciaSalva }: any) {
 const { addToast } = useToast();
 const [idRncEdicao, setIdRncEdicao] = useState<number | null>(null);
 const [descricaoPendencia, setDescricaoPendencia] = useState('');
 const [setorResponsavel, setSetorResponsavel] = useState('');
 const [usuarioResponsavel, setUsuarioResponsavel] = useState('');
 const [tituloRnc, setTituloRnc] = useState('');
 const [subTituloRnc, setSubTituloRnc] = useState('');
 const [dataExecucaoRnc, setDataExecucaoRnc] = useState('');
 const [finalizandoRnc, setFinalizandoRnc] = useState(false);
 const [setorFinalizacao, setSetorFinalizacao] = useState('');
 const [colaboradorFinalizacao, setColaboradorFinalizacao] = useState('');
 const [dataFinalizacao, setDataFinalizacao] = useState('');
 const [descricaoFinalizacao, setDescricaoFinalizacao] = useState('');
 const [tipoRnc, setTipoRnc] = useState('');
 const [espessuraRnc, setEspessuraRnc] = useState('');
 const [materialSWRnc, setMaterialSWRnc] = useState('');
 const [chkCorteRnc, setChkCorteRnc] = useState(false);
 const [chkDobraRnc, setChkDobraRnc] = useState(false);
 const [chkSoldaRnc, setChkSoldaRnc] = useState(false);
 const [chkPinturaRnc, setChkPinturaRnc] = useState(false);
 const [chkMontagemRnc, setChkMontagemRnc] = useState(false);
 const [submittingPendencia, setSubmittingPendencia] = useState(false);
 const [pendenciasHistorico, setPendenciasHistorico] = useState<any[]>([]);
 const [loadingPendencias, setLoadingPendencias] = useState(false);
 const [exibirFinalizadas, setExibirFinalizadas] = useState(false);
 const [searchQuery1, setSearchQuery1] = useState('');
 const [searchQuery2, setSearchQuery2] = useState('');
 // Config options for Pendencia
 const [setoresRncConfig, setSetoresRncConfig] = useState<string[]>([]);
 const [usuariosRncConfig, setUsuariosRncConfig] = useState<{ IdUsuario: number, NomeCompleto: string }[]>([]);
 const [espessurasRncConfig, setEspessurasRncConfig] = useState<{ idEspessura: number, Espessura: string }[]>([]);
 const [materiaisSWRncConfig, setMateriaisSWRncConfig] = useState<{ idMaterialSw: number, MaterialSw: string }[]>([]);
 
 useEffect(() => {
 fetch(`${API_BASE}/config/setores`)
 .then(res => res.json())
 .then(json => { if (json.success) setSetoresRncConfig(json.setores || json.data); })
 .catch(console.error);
 fetch(`${API_BASE}/config/usuarios`)
 .then(res => res.json())
 .then(json => { if (json.success) setUsuariosRncConfig(json.usuarios); })
 .catch(console.error);
 fetch(`${API_BASE}/config/espessuras`)
 .then(res => res.json())
 .then(json => { if (json.success) setEspessurasRncConfig(json.data); })
 .catch(console.error);
 fetch(`${API_BASE}/config/materiais`)
 .then(res => res.json())
 .then(json => { if (json.success) setMateriaisSWRncConfig(json.data); })
 .catch(console.error);
 }, []);

 useEffect(() => {
 if (pendenciaModalOpen && selectedItemRnc) {
 setIdRncEdicao(null);
 setDescricaoPendencia('');
 setSetorResponsavel('');
 setUsuarioResponsavel('');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setFinalizandoRnc(false);
 setSetorFinalizacao('');
 setColaboradorFinalizacao('');
 setDataFinalizacao('');
 setDescricaoFinalizacao('');
 setTipoRnc('RNC');
 setTituloRnc(selectedItemRnc.DescResumo || '');
 setSubTituloRnc(selectedItemRnc.DescDetal || '');
 setEspessuraRnc(selectedItemRnc.Espessura || '');
 setMaterialSWRnc(selectedItemRnc.MaterialSW || '');
 setChkCorteRnc(false);
 setChkDobraRnc(false);
 setChkSoldaRnc(false);
 setChkPinturaRnc(false);
 setChkMontagemRnc(false);
 setPendenciasHistorico([]);
 }
 }, [pendenciaModalOpen, selectedItemRnc]);

 const fetchHistoricoRNC = async (codMat: string) => {
 if (!codMat) return;
 setLoadingPendencias(true);
 let url = `${API_BASE}/producao/pendencias/historico?codMatFabricante=` + encodeURIComponent(codMat);
 if (searchQuery1) url += '&q1=' + encodeURIComponent(searchQuery1);
 if (searchQuery2) url += '&q2=' + encodeURIComponent(searchQuery2);
 try {
 const res = await fetch(url);
 const json = await res.json();
 if (json.success) setPendenciasHistorico(json.data);
 else setPendenciasHistorico([]);
 } catch { setPendenciasHistorico([]); }
 finally { setLoadingPendencias(false); }
 };

 useEffect(() => {
 if (selectedItemRnc?.CodMatFabricante && pendenciaModalOpen) {
 const id = setTimeout(() => fetchHistoricoRNC(selectedItemRnc.CodMatFabricante || ''), 500);
 return () => clearTimeout(id);
 }
 }, [searchQuery1, searchQuery2, pendenciaModalOpen]);

 const handleGerarRnc = (e: React.MouseEvent, item: OrdemServicoItem, osId: number) => {
 e.stopPropagation();
 const itemComOs = { ...item, IdOrdemServico: osId };
 setSelectedItemRnc(itemComOs);
 setIdRncEdicao(null);
 setDescricaoPendencia('');
 setSetorResponsavel('');
 setUsuarioResponsavel('');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setFinalizandoRnc(false);
 setSetorFinalizacao('');
 setColaboradorFinalizacao('');
 setDataFinalizacao('');
 setDescricaoFinalizacao('');
 setTipoRnc('RNC');
 setTituloRnc(item.DescResumo || '');
 setSubTituloRnc(item.DescDetal || '');
 setEspessuraRnc(item.Espessura || '');
 setMaterialSWRnc(item.MaterialSW || '');
 setChkCorteRnc(false);
 setChkDobraRnc(false);
 setChkSoldaRnc(false);
 setChkPinturaRnc(false);
 setChkMontagemRnc(false);
 setPendenciasHistorico([]);
 setPendenciaModalOpen(true);
 };

 const handleNovaPendenciaOS = () => {
 setIdRncEdicao(null);
 setDescricaoPendencia('');
 setSetorResponsavel('');
 setUsuarioResponsavel('');
 setDataExecucaoRnc(new Date().toISOString().split('T')[0]);
 setFinalizandoRnc(false);
 setSetorFinalizacao('');
 setColaboradorFinalizacao('');
 setDataFinalizacao('');
 setDescricaoFinalizacao('');
 setTipoRnc('RNC');
 setEspessuraRnc(selectedItemRnc?.Espessura || '');
 setMaterialSWRnc(selectedItemRnc?.MaterialSW || '');
 setChkCorteRnc(false);
 setChkDobraRnc(false);
 setChkSoldaRnc(false);
 setChkPinturaRnc(false);
 setChkMontagemRnc(false);
 };

 const loadPendenciaForEditOS = (p: any) => {
 setIdRncEdicao(p.IDRNC);
 setDescricaoPendencia(p.DescricaoPendencia || '');
 setTituloRnc(p.DescResumo || '');
 setSubTituloRnc(p.DescDetal || '');
 setEspessuraRnc(p.Espessura || '');
 setMaterialSWRnc(p.MaterialSW || '');
 if (p.DataExecucao) {
 const parts = p.DataExecucao.split(' ')[0].split('/');
 if (parts.length === 3) setDataExecucaoRnc(`${parts[2]}-${parts[1]}-${parts[0]}`);
 else setDataExecucaoRnc(p.DataExecucao);
 }
 if (p.Colaborador) setUsuarioResponsavel(p.Colaborador);
 if (p.SetorResponsavel) setSetorResponsavel(p.SetorResponsavel);
 if (p.ST === 'FINALIZADO') {
 setFinalizandoRnc(true);
 setSetorFinalizacao(p.SetorResponsavelFinalizacao || '');
 setColaboradorFinalizacao(p.FinalizadoPorUsuarioSetor || '');
 setDescricaoFinalizacao(p.DescricaoFinalizacao || '');
 if (p.DataFinalizacao) {
 const parts = p.DataFinalizacao.split(' ')[0].split('/');
 if (parts.length === 3) setDataFinalizacao(`${parts[2]}-${parts[1]}-${parts[0]}`);
 else setDataFinalizacao(p.DataFinalizacao);
 } else setDataFinalizacao('');
 } else {
 setFinalizandoRnc(false);
 setSetorFinalizacao(''); setColaboradorFinalizacao(''); setDataFinalizacao(''); setDescricaoFinalizacao('');
 }
 addToast({ type: 'info', title: 'Edição Ativada', message: `Carregando Pendência #${p.IDRNC}` });
 };

 const handleSubmitPendenciaOS = async () => {
 if (!selectedItemRnc) return;
 if (!setorResponsavel || !usuarioResponsavel || !descricaoPendencia) {
 addToast({ type: 'error', title: 'Campos Obrigatórios', message: 'Setor, Colaborador e Descrição são obrigatórios.' });
 return;
 }
 if (finalizandoRnc) {
 if (!setorFinalizacao || !colaboradorFinalizacao || !dataFinalizacao || !descricaoFinalizacao) {
 addToast({ type: 'error', title: 'Campos de Finalização', message: 'Para concluir a RNC, preencha todos os campos de finalização.' });
 return;
 }
 if (!window.confirm('Deseja realmente confirmar a finalização desta RNC?')) return;
 }
 setSubmittingPendencia(true);
 try {
 const payload = {
 idOrdemServicoItem: selectedItemRnc.IdOrdemServicoItem,
 idOrdemServico: selectedItemRnc.IdOrdemServico,
 idProjeto: '',
 projeto: selectedItemRnc.Projeto || '',
 idTag: '',
 tag: selectedItemRnc.Tag || '',
 descTag: selectedItemRnc.DescTag || '',
 descEmpresa: '',
 codMatFabricante: selectedItemRnc.CodMatFabricante || '',
 espessura: espessuraRnc,
 materialSW: materialSWRnc,
 txtCorte: chkCorteRnc ? '1' : '',
 txtDobra: chkDobraRnc ? '1' : '',
 txtSolda: chkSoldaRnc ? '1' : '',
 txtPintura: chkPinturaRnc ? '1' : '',
 txtMontagem: chkMontagemRnc ? '1' : '',
 descricaoPendencia,
 setorResponsavel,
 usuarioResponsavel,
 titulo: tituloRnc,
 subTitulo: subTituloRnc,
 tipoRnc,
 dataExecucao: dataExecucaoRnc,
 usuarioCriacao: 'Sistema',
 descProjeto: selectedItemRnc.Projeto || '',
 origemPendencia: 'PLANODECORTE',
 idOrdemServicoItemPendencia: idRncEdicao,
 acao: finalizandoRnc ? 'FINALIZAR' : 'SALVAR',
 setorResponsavelFinalizacao: finalizandoRnc ? setorFinalizacao : null,
 finalizadoPorUsuarioSetor: finalizandoRnc ? colaboradorFinalizacao : null,
 dataFinalizacao: finalizandoRnc ? dataFinalizacao : null,
 descricaoFinalizacao: finalizandoRnc && descricaoFinalizacao ? descricaoFinalizacao.toUpperCase() : null
 };
 const res = await fetch(`${API_BASE}/producao/pendencia`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload)
 });
 const json = await res.json();
 if (json.success) {
 setLoadingPendencias(true);
 try {
 const histRes = await fetch(`${API_BASE}/producao/pendencias/historico?codMatFabricante=${encodeURIComponent(selectedItemRnc.CodMatFabricante || '')}`);
 const histJson = await histRes.json();
 if (histJson.success) setPendenciasHistorico(histJson.data);
 } catch { } finally { setLoadingPendencias(false); }
 addToast({ type: 'success', title: 'Sucesso', message: json.message || 'Operação realizada com sucesso.' });
 } else {
 addToast({ type: 'error', title: 'Erro', message: json.message || 'Erro ao gerar pendência.' });
 }
 } catch {
 addToast({ type: 'error', title: 'Erro', message: 'Erro de conexão.' });
 } finally {
 setSubmittingPendencia(false);
 }
 };

 return (
 <AnimatePresence>
 {pendenciaModalOpen && selectedItemRnc && (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
 onClick={(e) => { if (e.target === e.currentTarget) setPendenciaModalOpen(false); }}
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 className="bg-white rounded-md w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
 >
 {/* Header */}
 <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0 rounded-t-xl">
 <div className="flex items-center gap-3">
 <ShieldAlert size={24} />
 <h2 className="text-lg font-bold">Gerar Pendência (RNC)</h2>
 </div>
 <button onClick={() => setPendenciaModalOpen(false)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* Body */}
 <div className="p-6 space-y-5 flex-1">
 {/* Campos somente leitura - contexto do item */}
 <div className="grid grid-cols-12 gap-3 bg-gray-50 p-3 rounded-md border border-gray-200">
 <div className="col-span-2">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">ID RNC</label>
 <div className={`text-sm font-bold px-3 py-2 border rounded ${idRncEdicao ? 'bg-[#E0E800]/20 border-blue-200 text-[#32423D]' : 'bg-red-50 border-red-200 text-red-600'}`}>
 {idRncEdicao ? `#${idRncEdicao}` : 'NOVA'}
 </div>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItemRnc.IdOrdemServico}</div>
 </div>
 <div className="col-span-2">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">O.S.I.</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded">{selectedItemRnc.IdOrdemServicoItem}</div>
 </div>
 <div className="col-span-3">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Cód. Mat. Fabric.</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.CodMatFabricante || '-'}</div>
 </div>
 <div className="col-span-3">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Projeto</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.Projeto || '-'}</div>
 </div>
 <div className="col-span-6">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Tag</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.Tag || '-'}</div>
 </div>
 <div className="col-span-6">
 <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Descrição</label>
 <div className="text-sm font-medium text-gray-700 bg-white px-3 py-2 border border-gray-200 rounded truncate">{selectedItemRnc.DescResumo || '-'}</div>
 </div>
 </div>

 {/* Inputs Editáveis */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Título</label>
 <input type="text" value={tituloRnc} onChange={e => setTituloRnc(e.target.value)}
 readOnly={idRncEdicao !== null}
 className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`} />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Sub Título</label>
 <input type="text" value={subTituloRnc} onChange={e => setSubTituloRnc(e.target.value)}
 readOnly={idRncEdicao !== null}
 className={`w-full px-3 py-2 text-sm rounded border focus:outline-none focus:border-red-500 bg-gray-50 uppercase ${idRncEdicao !== null ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
 placeholder="Sub-título da RNC" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Colaborador</label>
 <select value={usuarioResponsavel} onChange={e => setUsuarioResponsavel(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
 <option value="">Selecione...</option>
 {usuariosRncConfig.map(u => <option key={u.IdUsuario} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Setor</label>
 <select value={setorResponsavel} onChange={e => setSetorResponsavel(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
 <option value="">Selecione...</option>
 {setoresRncConfig.filter(s => {
 const lower = s.toLowerCase();
 const productionSectors = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
 if (productionSectors.includes(lower)) {
 return visibleSetores.includes(lower);
 }
 return true;
 }).map((s, i) => <option key={i} value={s}>{s}</option>)}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Espessura</label>
 <select value={espessuraRnc} onChange={e => setEspessuraRnc(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white">
 <option value="">Selecione...</option>
 {espessurasRncConfig.map(esp => <option key={esp.idEspessura} value={esp.Espessura}>{esp.Espessura}</option>)}
 {espessuraRnc && !espessurasRncConfig.some(e => e.Espessura === espessuraRnc) && <option value={espessuraRnc}>{espessuraRnc}</option>}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Material SW</label>
 <select value={materialSWRnc} onChange={e => setMaterialSWRnc(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500 bg-white truncate">
 <option value="">Selecione...</option>
 {materiaisSWRncConfig.map(mat => <option key={mat.idMaterialSw} value={mat.MaterialSw}>{mat.MaterialSw}</option>)}
 {materialSWRnc && !materiaisSWRncConfig.some(m => m.MaterialSw === materialSWRnc) && <option value={materialSWRnc}>{materialSWRnc}</option>}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Data Execução</label>
 <input type="date" value={dataExecucaoRnc} onChange={e => setDataExecucaoRnc(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo RNC</label>
 <select value={tipoRnc} onChange={e => setTipoRnc(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-red-500">
 <option value="RNC">RNC</option>
 <option value="TAREFA">TAREFA</option>
 <option value="RETRABALHO">RETRABALHO</option>
 <option value="OUTROS">OUTROS</option>
 </select>
 </div>
 </div>
 </div>

 {/* Descrição */}
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição da Pendência *</label>
 <textarea value={descricaoPendencia} onChange={e => setDescricaoPendencia(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
 placeholder="Descreva os detalhes da RNC/Pendência..." rows={4} />
 </div>

 {/* Processos */}
 <div className="p-4 bg-gray-50 border border-gray-200 rounded-md flex flex-wrap gap-6 justify-center">
 {visibleSetores.includes('corte') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkCorteRnc} onChange={e => setChkCorteRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkCorteRnc ? 'text-[#32423D] font-bold bg-blue-100' : 'text-gray-700 font-semibold'}`}><Scissors size={14} className={chkCorteRnc ? 'text-[#32423D]' : 'text-[#32423D]'} /> Corte</span>
 </label>
 )}
 {visibleSetores.includes('dobra') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkDobraRnc} onChange={e => setChkDobraRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkDobraRnc ? 'text-purple-700 font-bold bg-purple-100' : 'text-gray-700 font-semibold'}`}><Wrench size={14} className={chkDobraRnc ? 'text-purple-700' : 'text-purple-500'} /> Dobra</span>
 </label>
 )}
 {visibleSetores.includes('solda') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkSoldaRnc} onChange={e => setChkSoldaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkSoldaRnc ? 'text-orange-700 font-bold bg-orange-100' : 'text-gray-700 font-semibold'}`}><Flame size={14} className={chkSoldaRnc ? 'text-orange-700' : 'text-orange-500'} /> Solda</span>
 </label>
 )}
 {visibleSetores.includes('pintura') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkPinturaRnc} onChange={e => setChkPinturaRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkPinturaRnc ? 'text-green-700 font-bold bg-green-100' : 'text-gray-700 font-semibold'}`}><Paintbrush size={14} className={chkPinturaRnc ? 'text-green-700' : 'text-green-500'} /> Acabamento</span>
 </label>
 )}
 {visibleSetores.includes('montagem') && (
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={chkMontagemRnc} onChange={e => setChkMontagemRnc(e.target.checked)} className="rounded text-red-500 focus:ring-red-500" />
 <span className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${chkMontagemRnc ? 'text-red-700 font-bold bg-red-100' : 'text-gray-700 font-semibold'}`}><Settings2 size={14} className={chkMontagemRnc ? 'text-red-700' : 'text-red-500'} /> Montagem</span>
 </label>
 )}
 </div>

 {/* Seção Finalização - só exibida em edição */}
 {idRncEdicao && (
 <div className="mt-4 border border-green-200 rounded-md overflow-hidden bg-green-50/30">
 <div className="bg-green-100/80 px-3 py-1.5 border-b border-green-200 flex justify-between items-center cursor-pointer hover:bg-green-200 transition-colors"
 onClick={() => setFinalizandoRnc(!finalizandoRnc)}>
 <h3 className="text-sm font-bold text-green-800 flex items-center gap-2 uppercase tracking-wide">
 <CheckCircle size={16} className={finalizandoRnc ? 'text-green-600' : 'text-green-500 opacity-50'} />
 Finalizar RNC
 </h3>
 <div className="flex items-center gap-2">
 <span className="text-xs text-green-700 font-semibold">{finalizandoRnc ? 'Habilitado' : 'Desabilitado'}</span>
 <input type="checkbox" checked={finalizandoRnc} readOnly className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer" />
 </div>
 </div>
 <AnimatePresence>
 {finalizandoRnc && (
 <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
 <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-green-100 bg-white/60">
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Setor Finalização *</label>
 <select value={setorFinalizacao} onChange={e => setSetorFinalizacao(e.target.value)}
 className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
 <option value="">Selecione...</option>
 {setoresRncConfig.map(s => <option key={s} value={s}>{s}</option>)}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Colaborador Finalização *</label>
 <select value={colaboradorFinalizacao} onChange={e => setColaboradorFinalizacao(e.target.value)}
 className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full">
 <option value="">Selecione...</option>
 {usuariosRncConfig.map(u => <option key={u.NomeCompleto} value={u.NomeCompleto}>{u.NomeCompleto}</option>)}
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-bold text-green-800">Data Finalização *</label>
 <input type="date" value={dataFinalizacao} onChange={e => setDataFinalizacao(e.target.value)}
 className="p-1.5 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full" />
 </div>
 <div className="flex flex-col gap-1 md:col-span-3">
 <label className="text-xs font-bold text-green-800">Parecer Finalização *</label>
 <textarea value={descricaoFinalizacao} onChange={e => setDescricaoFinalizacao(e.target.value)} rows={2}
 className="p-2 border border-green-200 rounded text-sm bg-white focus:ring-1 focus:ring-green-500 outline-none w-full resize-none placeholder-green-300"
 placeholder="Insira o parecer de fechamento da RNC..." />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}

 {/* Histórico de Pendências */}
 {(() => {
 const pendenciasExibidas = exibirFinalizadas ? pendenciasHistorico : pendenciasHistorico.filter((p: any) => p.ST !== 'FINALIZADO');
 return (
 <div className="mt-4 border border-gray-200 rounded-md overflow-hidden bg-white">
 <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
 <div className="flex items-center gap-3">
 <h3 className="text-xs font-bold text-gray-700 uppercase">Histórico de Pendências deste Item</h3>
 <label className="flex items-center gap-1 cursor-pointer">
 <input type="checkbox" checked={exibirFinalizadas} onChange={e => setExibirFinalizadas(e.target.checked)} className="rounded text-[#32423D] focus:ring-[#32423D]/40 w-3 h-3" />
 <span className="text-[10px] text-gray-600 font-medium select-none">Exibir Finalizadas</span>
 </label>
 </div>
 <span className="text-xs text-gray-500">{pendenciasExibidas.length} registro(s)</span>
 </div>
 <div className="px-3 py-1.5 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-end">
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 1</label>
 <input type="text" value={searchQuery1} onChange={e => setSearchQuery1(e.target.value)}
 placeholder="Buscar na descrição..."
 className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-[#32423D] focus:outline-none" />
 </div>
 <div className="flex-1 min-w-[200px]">
 <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição Pendência 2</label>
 <input type="text" value={searchQuery2} onChange={e => setSearchQuery2(e.target.value)}
 placeholder="Buscar na descrição..."
 className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:border-[#32423D] focus:outline-none" />
 </div>
 <button type="button" onClick={() => { setSearchQuery1(''); setSearchQuery2(''); }}
 className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded border border-gray-300 flex items-center gap-1 transition-colors">
 <X size={14} /> Limpar Filtros
 </button>
 </div>
 <div className="max-h-60 overflow-y-auto">
 {loadingPendencias ? (
 <div className="p-4 flex justify-center text-gray-500"><Loader2 size={20} className="animate-spin" /></div>
 ) : pendenciasHistorico.length === 0 ? (
 <div className="p-4 text-center text-sm text-gray-500">Nenhuma pendência anterior encontrada para este item.</div>
 ) : (
 <table className="w-full text-left text-xs text-gray-600">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] sticky top-0 border-b border-white/20 shadow-sm text-white font-semibold">
 <tr>
 <th className="px-2 py-2 whitespace-nowrap">ST</th>
 <th className="px-2 py-2 whitespace-nowrap">IDRNC</th>
 <th className="px-2 py-2 whitespace-nowrap">Cód.Mat.Fabric</th>
 <th className="px-2 py-2 whitespace-nowrap">OS</th>
 <th className="px-2 py-2 whitespace-nowrap">OS Item</th>
 <th className="px-2 py-2 whitespace-nowrap">Projeto</th>
 <th className="px-2 py-2 whitespace-nowrap">Tag</th>
 <th className="px-2 py-2 whitespace-nowrap">Título</th>
 <th className="px-2 py-2 whitespace-nowrap min-w-[150px]">Sub Título</th>
 <th className="px-2 py-2 whitespace-nowrap">Espessura</th>
 <th className="px-2 py-2 whitespace-nowrap">Material SW</th>
 <th className="px-2 py-2 min-w-[200px]">Descrição Pendência</th>
 <th className="px-2 py-2 whitespace-nowrap">Setor</th>
 <th className="px-2 py-2 whitespace-nowrap">Colaborador</th>
 <th className="px-2 py-2 whitespace-nowrap">Dt. Criação</th>
 <th className="px-2 py-2 whitespace-nowrap">Dt. Execução</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {pendenciasExibidas.map((p: any) => (
 <tr key={p.IDRNC} onClick={() => loadPendenciaForEditOS(p)} className="hover:bg-amber-50/50 cursor-pointer transition-colors">
 <td className="px-2 py-1 flex items-center justify-center" title={p.ST === 'PENDENCIA' ? 'Pendente' : 'Finalizada'}>
 {p.ST === 'PENDENCIA' ? <AlertTriangle size={14} className="text-amber-500" /> : <CheckCircle size={14} className="text-green-500" />}
 </td>
 <td className="px-2 py-1 text-center font-medium bg-gray-50">{p.IDRNC}</td>
 <td className="px-2 py-1 font-bold truncate max-w-[120px]" title={p.CodMatFabricante}>{p.CodMatFabricante}</td>
 
 
 <td className="px-2 py-1 truncate max-w-[100px]" title={p.Projeto}>{p.Projeto}</td>
 <td className="px-2 py-1 truncate max-w-[100px]" title={p.Tag}>{p.Tag}</td>
 <td className="px-2 py-1 truncate max-w-[120px]" title={p.DescResumo}>{p.DescResumo}</td>
 <td className="px-2 py-1 truncate max-w-[150px]" title={p.DescDetal}>{p.DescDetal}</td>
 <td className="px-2 py-1 text-center bg-gray-50">{p.Espessura}</td>
 <td className="px-2 py-1 truncate max-w-[120px]" title={p.MaterialSW}>{p.MaterialSW}</td>
 <td className="px-2 py-1 text-gray-800 text-[11px] leading-tight">{p.DescricaoPendencia}</td>
 <td className="px-2 py-1 font-medium bg-gray-50">{p.SetorResponsavel || '-'}</td>
 <td className="px-2 py-1 font-medium">{p.Colaborador}</td>
 <td className="px-2 py-1">{p.DataCriacao}</td>
 <td className="px-2 py-1 bg-gray-50">{p.DataExecucao}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 );
 })()}
 </div>

 {/* Footer */}
 <div className="px-4 py-2 bg-gray-50 flex gap-3 flex-shrink-0 justify-end border-t border-gray-200 rounded-b-xl">
 <button onClick={handleNovaPendenciaOS}
 className="px-6 py-2 rounded text-red-600 bg-white border border-red-200 hover:bg-red-50 font-medium transition-colors">
 Novo
 </button>

 <button onClick={() => setPendenciaModalOpen(false)}
 className="px-6 py-2 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors">
 Fechar
 </button>
 <button onClick={handleSubmitPendenciaOS} disabled={submittingPendencia}
 className={`px-6 py-2 rounded font-bold text-white transition-colors flex items-center justify-center gap-2 ${
 submittingPendencia ? 'bg-red-400 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-700 shadow-sm'
 }`}>
 {submittingPendencia
 ? <><Loader2 size={16} className="animate-spin" /> Salvando...</>
 : <><AlertTriangle size={16} /> Salvar</>}
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}

