import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, RefreshCw, Eye, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { useAppConfig } from '../contexts/AppConfigContext';

const API_BASE = '/api';

interface PendenciaGlobal {
 IdOrdemServicoItemPendencia: string;
 IdOrdemServico: string;
 IdOrdemServicoItem: string;
 IdPLanodeCorte: string;
 IdRomaneio: string;
 IdProjeto: string;
 IdTag: string;
 CodMatFabricante: string;
 Projeto: string;
 Tag: string;
 DescEmpresa: string;
 IdMaterial: string;
 DescResumo: string;
 DescDetal: string;
 Espessura: string;
 MaterialSW: string;
 EnderecoArquivo: string;
 DescricaoPendencia: string;
 Usuario: string;
 CriadoPorSetor: string;
 DataCriacao: string;
 Estatus: string;
 txtCorte: string;
 txtdobra: string;
 txtSolda: string;
 txtPintura: string;
 txtMontagem: string;
 DescricaoFinalizacao: string;
 UsuarioProjeto: string;
 FinalizadoPorUsuarioSetor: string;
 DataAcertoProjeto: string;
 RNCImagens: string;
 Situacao: string;
 SetorResponsavel: string;
 TipoCadastro: string;
 DataExecucao: string;
 ControleEnvioEmail: string;
 EmailResponsavelPelaTarefa: string;
 IdUsuarioResponsavel: string;
 UsuarioResponsavel: string;
 TipoTarefa: string;
 TipoRegistro: string;
 SetorResponsavelFinalizacao: string;
 OrigemPendencia: string;
}

export default function VisaoGeralPendenciasPage() {
 const { processosVisiveis } = useAppConfig();
 const sv = (setor: string) => processosVisiveis.includes(setor);
 const [items, setItems] = useState<PendenciaGlobal[]>([]);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [exibirFinalizadas, setExibirFinalizadas] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');

 // Filtros Avançados
 const [filterProjeto, setFilterProjeto] = useState('');
 const [filterTag, setFilterTag] = useState('');
 const [filterCodMatFabricante, setFilterCodMatFabricante] = useState('');
 const [filterDescResumo, setFilterDescResumo] = useState('');
 const [filterDescDetal, setFilterDescDetal] = useState('');
 const [filterDescricaoPendencia, setFilterDescricaoPendencia] = useState('');
 const [filterOrigemPendencia, setFilterOrigemPendencia] = useState('');
 const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
 
 const clearAdvancedFilters = () => {
 setFilterProjeto('');
 setFilterTag('');
 setFilterCodMatFabricante('');
 setFilterDescResumo('');
 setFilterDescDetal('');
 setFilterDescricaoPendencia('');
 setFilterOrigemPendencia('');
 setSearchTerm('');
 };

 const hasActiveAdvancedFilters = filterProjeto || filterTag || filterCodMatFabricante || filterDescResumo || filterDescDetal || filterDescricaoPendencia || filterOrigemPendencia;

 const fetchPendencias = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_BASE}/todas-pendencias?exibirFinalizadas=${exibirFinalizadas}`);
 const json = await res.json();
 if (json.success) {
 setItems(json.data);
 } else {
 setError(json.message);
 }
 } catch (err: unknown) {
 setError(err.message || 'Erro ao carregar pendências');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchPendencias();
 }, [exibirFinalizadas]);

 const filteredItems = useMemo(() => {
 let result = items;
 
 // Advanced Filters
 if (filterProjeto) result = result.filter(i => i.Projeto?.toLowerCase().includes(filterProjeto.toLowerCase()) || i.IdProjeto?.toString().includes(filterProjeto));
 if (filterTag) result = result.filter(i => i.Tag?.toLowerCase().includes(filterTag.toLowerCase()) || i.IdTag?.toString().includes(filterTag));
 if (filterCodMatFabricante) result = result.filter(i => i.CodMatFabricante?.toLowerCase().includes(filterCodMatFabricante.toLowerCase()));
 if (filterDescResumo) result = result.filter(i => i.DescResumo?.toLowerCase().includes(filterDescResumo.toLowerCase()));
 if (filterDescDetal) result = result.filter(i => i.DescDetal?.toLowerCase().includes(filterDescDetal.toLowerCase()));
 if (filterDescricaoPendencia) result = result.filter(i => i.DescricaoPendencia?.toLowerCase().includes(filterDescricaoPendencia.toLowerCase()));
 if (filterOrigemPendencia) result = result.filter(i => i.OrigemPendencia?.toLowerCase().includes(filterOrigemPendencia.toLowerCase()));

 // Global Search
 if (searchTerm) {
 const q = searchTerm.toLowerCase();
 result = result.filter(i => 
 (i.IdOrdemServicoItemPendencia && i.IdOrdemServicoItemPendencia.toString().includes(q)) ||
 (i.Projeto && i.Projeto.toLowerCase().includes(q)) ||
 (i.DescEmpresa && i.DescEmpresa.toLowerCase().includes(q)) ||
 (i.Tag && i.Tag.toLowerCase().includes(q)) ||
 (i.CodMatFabricante && i.CodMatFabricante.toLowerCase().includes(q)) ||
 (i.DescricaoPendencia && i.DescricaoPendencia.toLowerCase().includes(q))
 );
 }
 
 return result;
 }, [items, searchTerm, filterProjeto, filterTag, filterCodMatFabricante, filterDescResumo, filterDescDetal, filterDescricaoPendencia, filterOrigemPendencia]);

 const handleRowClick = (item: PendenciaGlobal) => {
 const origem = (item.OrigemPendencia || '').toUpperCase();
 
 if (origem.includes('MAPAPRODUCAO')) {
 window.location.href = `/apontamento?os=${item.IdOrdemServico}&item=${item.IdOrdemServicoItem}&openRnc=${item.IdOrdemServicoItemPendencia}&from=visao-geral-pendencias`;
 } else if (origem.includes('VISAOGERALPROJ') || origem.includes('VISAOGERALTAG')) {
 window.location.href = `/visao-geral-producao?projetoId=${item.IdProjeto}&openRnc=${item.IdOrdemServicoItemPendencia}&origem=${origem}&from=visao-geral-pendencias`;
 } else if (origem.includes('PENDENCIAROMANEIO')) {
 window.location.href = `/pendencia-romaneio?romaneio=${item.IdRomaneio}&from=visao-geral-pendencias`;
 } else if (origem.includes('ROMANEIO')) {
 window.location.href = `/romaneio-envio?romaneio=${item.IdRomaneio}&from=visao-geral-pendencias`;
 } else if (origem.includes('ACAOPCP')) {
 window.location.href = `/tarefas?id=${item.IdOrdemServicoItemPendencia}&from=visao-geral-pendencias`;
 } else if (origem.includes('EXPEDICAO') || origem.includes('EXPEDIÇÃO')) {
 window.location.href = `/controle-expedicao?projeto=${item.Projeto}&tag=${item.Tag}&from=visao-geral-pendencias`;
 } else {
 alert(`Ação não mapeada para origem: ${origem || 'Não definida'}`);
 }
 };

 return (
 <div className="flex flex-col flex-1 min-h-0 bg-[#fafbfc] animate-in fade-in zoom-in-95 duration-300 p-4 xl:p-6 overflow-auto custom-scrollbar h-full flex flex-col min-h-0">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
 <div>
 
 <p className="text-slate-500 text-xs mt-1">Exibição unificada de todas as pendências e tarefas do sistema.</p>
 </div>
 
 <div className="flex items-center gap-3">
 <div className="relative">
 <input 
 type="text"
 placeholder="Buscar..."
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 className="w-72 pl-4 pr-24 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#32423D] focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700"
 />
 <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1 rounded text-xs font-bold hover:bg-emerald-200 transition-colors">
 Pesquisar
 </button>
 </div>

 <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
 <input 
 type="checkbox" 
 checked={exibirFinalizadas} 
 onChange={(e) => setExibirFinalizadas(e.target.checked)}
 className="w-4 h-4 text-[#32423D] rounded border-slate-300 focus:ring-[#32423D]/40"
 />
 <span className="text-xs font-bold text-slate-600">Exibir Finalizadas</span>
 </label>

 <button onClick={fetchPendencias} className="bg-white p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-[#32423D] hover:bg-[#E0E800]/10 transition-colors shadow-sm" title="Atualizar dados">
 <RefreshCw size={20} className={loading ? 'animate-spin text-[#32423D]' : ''} />
 </button>
 </div>
 </div>

 {/* Advanced Filters Toggle */}
 <div className="mb-4 flex items-center justify-between">
 <button 
 onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
 className="flex items-center gap-2 text-xs font-bold text-[#32423D] hover:text-[#32423D]/70 transition-colors bg-[#E0E800]/20 hover:bg-[#E0E800]/20 px-2 py-1 rounded-lg border border-blue-200"
 >
 {showAdvancedFilters ? 'Ocultar Filtros Avançados' : 'Mostrar Filtros Avançados'}
 {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </button>
 {(hasActiveAdvancedFilters || searchTerm) && (
 <button 
 onClick={clearAdvancedFilters}
 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
 >
 <XCircle size={14} /> Limpar Todos os Filtros
 </button>
 )}
 </div>

 {/* Advanced Filters Panel */}
 {showAdvancedFilters && (
 <div className="bg-white border border-slate-200 rounded-md p-4 mb-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Projeto</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterProjeto} onChange={e => setFilterProjeto(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterProjeto && (
 <button onClick={() => setFilterProjeto('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tag</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterTag} onChange={e => setFilterTag(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterTag && (
 <button onClick={() => setFilterTag('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cód. Mat. Fabr.</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterCodMatFabricante} onChange={e => setFilterCodMatFabricante(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterCodMatFabricante && (
 <button onClick={() => setFilterCodMatFabricante('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desc. Resumo</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterDescResumo} onChange={e => setFilterDescResumo(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterDescResumo && (
 <button onClick={() => setFilterDescResumo('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desc. Detalhe</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterDescDetal} onChange={e => setFilterDescDetal(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterDescDetal && (
 <button onClick={() => setFilterDescDetal('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Desc. Pendência</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterDescricaoPendencia} onChange={e => setFilterDescricaoPendencia(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterDescricaoPendencia && (
 <button onClick={() => setFilterDescricaoPendencia('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 <div>
 <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Origem Pendência</label>
 <div className="relative flex items-center w-full">
 <input type="text" value={filterOrigemPendencia} onChange={e => setFilterOrigemPendencia(e.target.value)} placeholder="Filtrar..." className="pr-6 w-full border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium text-slate-700 outline-none focus:border-[#32423D] bg-slate-50 focus:bg-white transition-all overflow-hidden text-ellipsis" />
 {filterOrigemPendencia && (
 <button onClick={() => setFilterOrigemPendencia('')} className="absolute right-1.5 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none" title="Limpar">
 <X size={14} />
 </button>
 )}
</div>
 </div>
 </div>
 </div>
 )}

 {/* Grid */}
 <div className="flex-1 bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
 {error && <div className="bg-red-50 text-red-700 p-3 text-xs font-bold border-b border-red-100 truncate">{error}</div>}
 {loading && (
 <div className="absolute inset-0 bg-white/60 z-10 flex flex-col gap-3 items-center justify-center">
 <Loader2 className="animate-spin text-[#32423D]" size={40} />
 <span className="text-blue-800 font-bold text-xs tracking-wide">Carregando dados...</span>
 </div>
 )}
 
 <div className="flex-1 overflow-auto custom-scrollbar">
 <table className="w-full text-left text-[12px] whitespace-nowrap">
 <thead className="bg-[#567469] text-white bg-[#567469] text-white bg-[#567469] text-white font-bold uppercase tracking-wider text-[10px] sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
 <tr>
 <th className="px-2 py-0.5">ID / Origem</th>
 <th className="px-2 py-0.5">Situação</th>
 <th className="px-2 py-0.5">OS</th>
 <th className="px-2 py-0.5">Item</th>
 <th className="px-2 py-0.5">Romaneio</th>
 <th className="px-2 py-0.5">Projeto</th>
 <th className="px-2 py-0.5">Tag</th>
 <th className="px-2 py-0.5">Empresa</th>
 <th className="px-2 py-0.5">Cód Mat Fab</th>
 <th className="px-2 py-0.5">Desc Detalhe</th>
 <th className="px-2 py-0.5">Espessura / Plano de Corte</th>
 <th className="px-2 py-0.5">Material SW</th>
 <th className="px-2 py-0.5 min-w-[200px]">Desc Pendência</th>
 <th className="px-2 py-0.5">Usuário</th>
 <th className="px-2 py-0.5">Criado Por</th>
 <th className="px-2 py-0.5">Data Criação</th>
 <th className="px-2 py-0.5">Setor Resp.</th>
 <th className="px-2 py-0.5">Tp Cadastro</th>
 <th className="px-2 py-0.5">Data Exec.</th>
 <th className="px-2 py-0.5">Email Resp.</th>
 <th className="px-2 py-0.5">Usuário Resp. (Final)</th>
 <th className="px-2 py-0.5">Tipo Tarefa / Registro</th>
 <th className="px-2 py-0.5">Desc. Finalização</th>
 <th className="px-2 py-0.5">Setor Fin.</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {filteredItems.length === 0 && !loading && (
 <tr>
 <td colSpan={36} className="px-4 py-12 text-center text-slate-400 font-medium">
 {searchTerm ? 'Nenhuma pendência encontrada para a busca.' : 'Nenhuma pendência para exibir.'}
 </td>
 </tr>
 )}
 {filteredItems.map(item => (
 <tr 
 key={item.IdOrdemServicoItemPendencia} 
 onClick={() => handleRowClick(item)} 
 className={`cursor-pointer group hover:bg-[#E0E800]/10 transition-colors ${item.Estatus === 'FINALIZADA' ? 'bg-[#fafcfd] opacity-75' : 'bg-white'}`}
 >
 <td className="px-2 py-0.5">
 <div className="font-mono text-slate-700 font-bold">#{item.IdOrdemServicoItemPendencia}</div>
 <div className="text-[10px] font-bold text-indigo-500 truncate max-w-[120px]" title={item.OrigemPendencia}>{item.OrigemPendencia || 'N/A'}</div>
 </td>
 <td className="px-2 py-0.5">
 <div className="mb-1">
 {item.Estatus === 'FINALIZADA' ? (
 <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">FINALIZADA</span>
 ) : item.Estatus === 'PENDENCIA' ? (
 <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold">PENDÊNCIA</span>
 ) : (
 <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">{item.Estatus || 'ABERTA'}</span>
 )}
 </div>
 <div className="text-[10px] text-slate-500 uppercase font-bold">{item.Situacao || ''}</div>
 </td>
 <td className="px-2 py-0.5 font-mono font-bold text-slate-700">{item.IdOrdemServico || '—'}</td>
 <td className="px-2 py-0.5 font-mono text-slate-600">{item.IdOrdemServicoItem || '—'}</td>
 <td className="px-2 py-0.5 font-mono text-slate-600">{item.IdRomaneio || '—'}</td>
 <td className="px-2 py-0.5 font-bold text-slate-700 truncate max-w-[150px]" title={item.Projeto}>{item.Projeto || item.IdProjeto || '—'}</td>
 <td className="px-2 py-0.5 font-bold text-[#32423D] truncate max-w-[150px]" title={item.Tag}>{item.Tag || item.IdTag || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-500 truncate max-w-[150px]" title={item.DescEmpresa}>{item.DescEmpresa || '—'}</td>
 <td className="px-2 py-0.5 font-mono text-[10px] text-slate-500 truncate max-w-[150px]" title={item.CodMatFabricante}>{item.CodMatFabricante || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-500 truncate max-w-[150px]" title={item.DescDetal}>{item.DescDetal || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">
 Esp: {item.Espessura || '—'}<br/>
 Plano: {item.IdPLanodeCorte || '—'}
 </td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">{item.MaterialSW || '—'}</td>
 <td className="px-2 py-0.5 font-medium text-slate-800 truncate max-w-[200px]" title={item.DescricaoPendencia}>{item.DescricaoPendencia || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600 truncate max-w-[100px]" title={item.Usuario}>{item.Usuario || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">{item.CriadoPorSetor || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-500 font-mono">{item.DataCriacao || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] font-bold text-slate-700">{item.SetorResponsavel || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">{item.TipoCadastro || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-500 font-mono">{item.DataExecucao || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">{item.EmailResponsavelPelaTarefa || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-700">
 Atu: {item.UsuarioResponsavel || '—'}<br/>
 Fin: {item.FinalizadoPorUsuarioSetor || '—'}
 </td>
 <td className="px-2 py-0.5 text-[10px] text-slate-600">
 Tar: {item.TipoTarefa || '—'}<br/>
 Reg: {item.TipoRegistro || '—'}
 </td>
 <td className="px-2 py-0.5 text-[10px] text-slate-500 truncate max-w-[150px]" title={item.DescricaoFinalizacao}>{item.DescricaoFinalizacao || '—'}</td>
 <td className="px-2 py-0.5 text-[10px] text-slate-700">{item.SetorResponsavelFinalizacao || '—'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <div className="bg-slate-50 border-t border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-500 text-right">
 Total: {filteredItems.length} registros
 </div>
 </div>
 </div>
 );
}
