import React, { useState, useEffect } from 'react';
import { 
 FilePlus, Upload, ShieldAlert, Clock, 
 Database, Tag as TagIcon, CheckCircle2, 
 AlertTriangle, Loader2, FileSpreadsheet,
 Layers, Trash2, Settings2
} from 'lucide-react';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

interface Projeto {
 IdProjeto: number;
 Projeto: string;
}

interface Tag {
 IdTag: number;
 Tag: string;
}

interface PlanilhaMaster {
 NomeArquivo: string;
}

const PowerBuildImport: React.FC = () => {
 const { showAlert } = useAlert();
 const { user } = useAuth();
 const [loading, setLoading] = useState(false);
 const [initializing, setInitializing] = useState(false);
 
 // Form States
 const [projetos, setProjetos] = useState<Projeto[]>([]);
 const [tags, setTags] = useState<Tag[]>([]);
 const [selectedProjeto, setSelectedProjeto] = useState<string>('');
 const [selectedTag, setSelectedTag] = useState<string>('');
 const [file, setFile] = useState<File | null>(null);
 const [isRevision, setIsRevision] = useState(false);
 const [masterPlanilhas, setMasterPlanilhas] = useState<PlanilhaMaster[]>([]);
 const [selectedMaster, setSelectedMaster] = useState('');
 const [showTruncate, setShowTruncate] = useState(false);

 useEffect(() => {
 fetchProjetos();
 // Check structure on mount
 handleInitDB();
 }, []);

 useEffect(() => {
 if (selectedProjeto) {
 fetchTags(parseInt(selectedProjeto));
 fetchMasterPlanilhas(parseInt(selectedProjeto));
 } else {
 setTags([]);
 setMasterPlanilhas([]);
 }
 }, [selectedProjeto]);

 const fetchProjetos = async () => {
 try {
 // Aplicar filtros: Liberado='S' e Não Finalizado
 const res = await fetch('/api/projeto?liberado=S&finalizado=N');
 const data = await res.json();
 if (data.success) setProjetos(data.data);
 } catch (e) {
 console.error('Erro ao buscar projetos:', e);
 showAlert('Erro ao carregar lista de projetos.', 'error');
 }
 };

 const fetchTags = async (idProj: number) => {
 try {
 const res = await fetch(`/api/projeto/${idProj}/tags`);
 const data = await res.json();
 if (data.success) setTags(data.data);
 } catch (e) {
 console.error('Erro ao buscar tags:', e);
 showAlert('Erro ao carregar lista de tags.', 'error');
 }
 };

 const fetchMasterPlanilhas = async (idProj: number) => {
 try {
 const res = await fetch('/api/blockset/files');
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
 const data = await res.json();
 if (data.success) {
 // Filter planilhas for this project
 const filtered = data.data
 .filter((p: any) => p.IdProjeto === idProj)
 .map((p: any) => ({ NomeArquivo: p.NomeArquivo }));
 
 // Unique file names
 const unique = Array.from(new Set(filtered.map((p: any) => p.NomeArquivo)))
 .map(name => ({ NomeArquivo: name as string }));
 
 setMasterPlanilhas(unique);
 }
 } catch (e) {
 console.error('Erro ao buscar planilhas mestre:', e);
 showAlert('Erro ao carregar histórico de planilhas.', 'error');
 }
 };

 const handleInitDB = async () => {
 setInitializing(true);
 try {
 const res = await fetch('/api/blockset/init-db', { method: 'POST' });
 
 if (res.status === 401) {
 showAlert('Sessão expirada. Por favor, faça login novamente.', 'error');
 return;
 }

 if (!res.ok) {
 const text = await res.text();
 console.error('Init DB Error:', text);
 showAlert(`Erro no servidor (${res.status}).`, 'error');
 return;
 }

 const data = await res.json();
 if (!data.success) {
 showAlert(data.message || 'Falha ao inicializar estrutura.', 'error');
 }
 } catch (e) {
 console.error('Connection Error:', e);
 showAlert('Erro de conexão ao servidor.', 'error');
 } finally {
 setInitializing(false);
 }
 };

 const handleTruncate = async () => {
 if (!window.confirm('ATENÇÃO: Isso apagará TODOS os dados de importação de planilhas. Deseja continuar?')) return;
 
 setLoading(true);
 try {
 const res = await fetch('/api/blockset/truncate', { method: 'POST' });
 const data = await res.json();
 if (data.success) {
 showAlert('Tabelas limpas com sucesso!', 'success');
 } else {
 showAlert(data.message, 'error');
 }
 } catch (e) {
 showAlert('Erro de conexão.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 setFile(e.target.files[0]);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedProjeto || !selectedTag || !file) {
 showAlert('Preencha todos os campos e selecione um arquivo.', 'warning');
 return;
 }

 if (isRevision && !selectedMaster) {
 showAlert('Selecione a planilha mestre para vincular a revisão.', 'warning');
 return;
 }

 setLoading(true);
 const formData = new FormData();
 formData.append('file', file);
 formData.append('idProjeto', selectedProjeto);
 formData.append('idTag', selectedTag);
 
 const projName = (Array.isArray(projetos) ? projetos : []).find(p => p.IdProjeto?.toString() === selectedProjeto)?.Projeto || '';
 const tagName = (Array.isArray(tags) ? tags : []).find(t => t.IdTag?.toString() === selectedTag)?.Tag || '';
 
 formData.append('nomeProjeto', projName);
 formData.append('nomeTag', tagName);
 formData.append('isRevision', isRevision.toString());
 formData.append('masterFileName', selectedMaster);

 try {
 const res = await fetch('/api/blockset/import', {
 method: 'POST',
 body: formData
 });
 const data = await res.json();
 if (data.success) {
 showAlert(data.message, 'success');
 // Reset file
 setFile(null);
 } else {
 showAlert(data.message, 'error');
 }
 } catch (error) {
 showAlert('Erro ao realizar importação.', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6 font-sans">
 
 {/* Header Section */}
 <div className="flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0 bg-white p-4 rounded-md shadow-sm border border-gray-200">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-[#32423D]">
 <FilePlus size={24} />
 </div>
 <div>
 <h1 className="text-2xl font-black text-[#567469] tracking-tight">Leitura de Dados (Power Build)</h1>
 <p className="text-sm text-gray-500 font-medium">Importe planilhas BlockSet (data) ou PixEasy (bom) para o sistema.</p>
 </div>
 </div>

 <div className="flex flex-wrap gap-2 items-center">
 {user?.dbName === 'lynxlocal' && (
 <button 
 onClick={handleTruncate}
 className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all text-sm font-bold shadow-sm"
 >
 <Trash2 className="w-4 h-4" />
 Limpar Base (Truncate)
 </button>
 )}
 </div>
 </div>

 <div className="flex-1 overflow-auto custom-scrollbar">
 <div className="max-w-4xl mx-auto space-y-6 pb-8">
 {initializing && (
 <div className="bg-[#E0E800]/20 border border-blue-200 p-4 rounded-md flex items-center gap-3 text-[#32423D]">
 <Loader2 className="w-5 h-5 animate-spin" />
 <span className="text-sm font-medium">Verificando estrutura do banco de dados...</span>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Form Card */}
 <div className="lg:col-span-2 space-y-6">
 <form onSubmit={handleSubmit} className="bg-white rounded-md border border-gray-200 p-8 shadow-sm space-y-6 relative overflow-hidden">

 {/* Step 1: Context Selection */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
 <Layers className="w-4 h-4" />
 1. Definir Contexto
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-xs font-bold text-gray-500 uppercase">Projeto</label>
 <select 
 value={selectedProjeto}
 onChange={e => setSelectedProjeto(e.target.value)}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800"
 >
 <option value="">Selecione o Projeto</option>
 {Array.isArray(projetos) && projetos.map(p => (
 <option key={p?.IdProjeto} value={p?.IdProjeto}>{p?.Projeto}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold text-gray-500 uppercase">Tag / OS</label>
 <select 
 value={selectedTag}
 onChange={e => setSelectedTag(e.target.value)}
 disabled={!selectedProjeto}
 className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-2.5 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800 disabled:opacity-50"
 >
 <option value="">Selecione a Tag</option>
 {Array.isArray(tags) && tags.map(t => (
 <option key={t?.IdTag} value={t?.IdTag}>{t?.Tag}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Step 2: Revision Logic */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest">
 <Settings2 className="w-4 h-4" />
 2. Opções de Importação
 </div>
 <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <p className="text-sm font-bold text-gray-800">Modo de Inclusão</p>
 <p className="text-[10px] text-gray-500">Defina se esta planilha é uma nova importação ou revisão.</p>
 </div>
 <div className="flex bg-gray-200 p-1 rounded-lg">
 <button 
 type="button"
 onClick={() => setIsRevision(false)}
 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isRevision ? 'bg-white text-[#32423D] shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
 >
 Nova (Rev 0)
 </button>
 <button 
 type="button"
 onClick={() => setIsRevision(true)}
 className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isRevision ? 'bg-white text-[#32423D] shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
 >
 Revisão
 </button>
 </div>
 </div>

 {isRevision && (
 <div className="animate-fade-in space-y-2 pt-2 border-t border-gray-200">
 <label className="text-[10px] font-bold text-gray-500 uppercase">Vincular à Planilha Mestre</label>
 {masterPlanilhas.length === 0 ? (
 <div className="text-xs text-amber-600 flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
 <AlertTriangle className="w-4 h-4" />
 Nenhuma planilha anterior encontrada para este Projeto/Tag.
 </div>
 ) : (
 <select 
 value={selectedMaster}
 onChange={e => setSelectedMaster(e.target.value)}
 className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 focus:border-[#32423D] outline-none transition-all text-sm text-gray-800"
 >
 <option value="">Selecione o arquivo mestre...</option>
 {masterPlanilhas.map(p => <option key={p.NomeArquivo} value={p.NomeArquivo}>{p.NomeArquivo}</option>)}
 </select>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Step 3: File Selection */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-widest">
 <Upload className="w-4 h-4" />
 3. Selecionar Arquivo
 </div>
 <div className="relative group cursor-pointer">
 <input 
 type="file" 
 accept=".xlsx,.xls"
 onChange={handleFileChange}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
 />
 <div className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center gap-4 transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 group-hover:border-[#32423D]/40 group-hover:bg-[#E0E800]/10'}`}>
 <div className={`p-4 rounded-md ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#32423D]'}`}>
 <FileSpreadsheet className="w-10 h-10" />
 </div>
 <div className="text-center w-full">
 <p className={`font-bold ${file ? 'text-emerald-600' : 'text-gray-700'} break-all max-w-full px-4`}>
 {file ? file.name : 'Clique ou arraste a planilha Excel'}
 </p>
 <p className="text-xs text-gray-500 mt-1">Formato suportado: .xlsx, .xls</p>
 </div>
 </div>
 </div>
 </div>

 <button 
 type="submit"
 disabled={loading}
 className="w-full bg-[#32423D] hover:bg-[#E0E800]/100 text-white py-4 rounded-md font-extrabold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <>
 <Loader2 className="w-6 h-6 animate-spin" />
 Processando Importação...
 </>
 ) : (
 <>
 <CheckCircle2 className="w-6 h-6" />
 Iniciar Processamento
 </>
 )}
 </button>
 </form>
 </div>

 {/* Info Column */}
 <div className="space-y-6">
 <div className="bg-white rounded-md border border-gray-200 p-6 shadow-sm space-y-4">
 <h2 className="text-gray-800 font-bold flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-500" />
 Importante
 </h2>
 <ul className="space-y-4">
 <li className="flex gap-3">
 <div className="w-1.5 h-1.5 bg-[#E0E800]/200 rounded-full mt-1.5 shrink-0"></div>
 <p className="text-xs text-gray-600 leading-relaxed">
 <strong className="text-gray-800">Aba "data":</strong> O sistema buscará automaticamente por esta aba para importar dados do tipo <strong className="text-[#32423D]">BlockSet</strong>.
 </p>
 </li>
 <li className="flex gap-3">
 <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0"></div>
 <p className="text-xs text-gray-600 leading-relaxed">
 <strong className="text-gray-800">Aba "bom":</strong> Use esta aba para importar listas de materiais do tipo <strong className="text-cyan-600">PixEasy</strong>.
 </p>
 </li>
 <li className="flex gap-3">
 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0"></div>
 <p className="text-xs text-gray-600 leading-relaxed">
 O sistema valida automaticamente as colunas obrigatórias antes de salvar os dados no banco.
 </p>
 </li>
 </ul>
 </div>

 <div className="bg-[#E0E800]/20 rounded-md border border-blue-200 p-6 shadow-sm">
 <h2 className="text-blue-900 font-bold mb-4">Resumo da Revisão</h2>
 <div className="space-y-4">
 <div className="flex items-center justify-between text-xs">
 <span className="text-[#32423D]">Próxima Revisão:</span>
 <span className="text-[#32423D] font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
 {isRevision ? 'Auto-calculado' : 'Rev 0 (Inicial)'}
 </span>
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-[#32423D]">Vínculo:</span>
 <span className="text-blue-800 font-bold truncate ml-4" title={selectedMaster || 'Nenhum'}>
 {selectedMaster || 'Nenhum'}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default PowerBuildImport;
