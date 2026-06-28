import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus, Search, Edit2, Trash2, X, FolderKanban, Save,
 Loader2, RefreshCw, Calendar, Tag as TagIcon, FolderOpen, CheckCircle2, RotateCcw,
 Building2, Truck, Banknote, Ban, Pause, Play
, Filter} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { useAuth } from '../contexts/AuthContext';

import { formatToBRDate, isDateInPast } from '../utils/dateUtils';

const API_BASE = '/api';

interface Projeto {
 IdProjeto?: number;
 Projeto: string;
 DescProjeto?: string;
 DescEmpresa?: string;
 ClienteProjeto?: string;
 Responsavel?: string;
 DataPrevisao?: string;
 PrazoEntrega?: string;
 StatusProj?: string;
 DescStatus?: string;
 liberado?: string;
 DataLiberacao?: string;
 temApontamento?: number;
 PlanejadoFinanceiro?: string;
 DataEntradaPedido?: string;
 UF?: string;
 // Alfatec-specific
 GerenteProjeto?: string;
 Segmento?: string;
 Cnpj?: string;
 NomeFantasia?: string;
 InscEst?: string;
 EnderecoCliente?: string;
 ContatoComercial?: string;
 FoneContatoComercial?: string;
 EmailComercial?: string;
 ContatoTecnico?: string;
 FoneContatoTecnico?: string;
 EmailTecnico?: string;
 // Entrega
 ClienteEntrega?: string;
 CnpjEntrega?: string;
 ContatoEntrega?: string;
 TelefoneEntrega?: string;
 HrEntrega?: string;
 EnderecoEntrega?: string;
 // Cobranca
 ClienteCobranca?: string;
 CnpjCobranca?: string;
 ContatoCobranca?: string;
 TelefoneCobranca?: string;
 EmailCobranca?: string;
 EnderecoCobranca?: string;
 // Fornecimento
 Pagamento?: string;
 ObservacaoFornec?: string;
 Transferencia?: string;
 Pix?: string;
 Cartao?: string;
 Empenho?: string;
 Boleto?: string;
 Dinheiro?: string;
 HrComercial?: string;
 HrNoturno?: string;
 HrCombinar?: string;
 Frete?: string;
 Embalagem?: string;
 FabricacaoEmpresa?: string;
 ValorFabricacao?: string;
 RevendaEmpresa?: string;
 ValorRevenda?: string;
 FreteEmpresa?: string;
 ValorFrete?: string;
 InstalacaoEmpresa?: string;
 ValorInstalacao?: string;
 EmbalagemEmpresa?: string;
 ValorEmbalagem?: string;
 TotalFinal?: string;
 ObservacaoFinal?: string;
}

interface Tag {
 IdTag?: number;
 Tag: string;
 DescTag?: string;
 IdProjeto?: number;
 Projeto?: string;
 DataPrevisao?: string;
 TipoProduto?: string;
 UnidadeProduto?: string;
 QtdeTag?: string;
 QtdeLiberada?: string;
 SaldoTag?: string;
 ValorTag?: string;
 StatusTag?: number;
 DescStatus?: string;
}

interface Option {
 id: number | string;
 label: string;
}

const emptyProjetoForm: Projeto = {
 Projeto: '',
 DescProjeto: '',
 ClienteProjeto: '',
 Responsavel: '',
 DataPrevisao: '',
 PrazoEntrega: '',
 StatusProj: 'AT',
 DescStatus: 'Ativo',
 PlanejadoFinanceiro: '',
 DataEntradaPedido: ''
};

const emptyTagForm: Tag = {
 Tag: '',
 DescTag: '',
 DataPrevisao: '',
 TipoProduto: '',
 UnidadeProduto: '',
 QtdeTag: '',
 QtdeLiberada: '',
 SaldoTag: '',
};

export default function ProjetoPage() {
 const { showAlert } = useAlert();


 const [activeTab, setActiveTab] = useState<0 | 1 | 2 | 3>(0);
 const [showFilters, setShowFilters] = useState(true);
 // Projetos state
 const [projetos, setProjetos] = useState<Projeto[]>([]);
 const [projetoFormData, setProjetoFormData] = useState<Projeto>(emptyProjetoForm);
 const [isEditingProjeto, setIsEditingProjeto] = useState(false);
 const [showProjetoForm, setShowProjetoForm] = useState(false);

 // Expanded projects and their tags
 const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
 const [projectTags, setProjectTags] = useState<Record<number, Tag[]>>({});
 const [loadingTags, setLoadingTags] = useState<Set<number>>(new Set());

 // Tag form state
 const [tagFormData, setTagFormData] = useState<Tag>(emptyTagForm);
 const [isEditingTag, setIsEditingTag] = useState(false);
 const [showTagForm, setShowTagForm] = useState(false);
 const [selectedProjetoForTag, setSelectedProjetoForTag] = useState<Projeto | null>(null);

 // Common state
 const [searchFilters, setSearchFilters] = useState({
 projeto: '',
 descProjeto: '',
 cliente: '',
 cnpj: '',
 criacaoInicio: '',
 criacaoFim: '',
 previsaoInicio: '',
 previsaoFim: '',
 finalizado: 'N',
 statusProj: '',
 });
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [loadingMore, setLoadingMore] = useState(false);
 const [currentPage, setCurrentPage] = useState(1);
 const [totalCount, setTotalCount] = useState(0);
 const PAGE_LIMIT = 80;

 // Options for dropdowns
 const [clienteOptions, setClienteOptions] = useState<Option[]>([]);
 const [medidaOptions, setMedidaOptions] = useState<Option[]>([]);
 const [tipoProdutoOptions, setTipoProdutoOptions] = useState<Option[]>([]);

 // Modal de confirmação para Parar/Cancelar projeto
 const [confirmModal, setConfirmModal] = useState<{
 open: boolean;
 projetoId: number | null;
 status: 'PA' | 'CA' | 'AT' | null;
 message: string;
 requiresConfirmation: boolean;
 }>({ open: false, projetoId: null, status: null, message: '', requiresConfirmation: false });
 const [confirmUsuario, setConfirmUsuario] = useState<string>('');

 // Fetch dropdown options
 const fetchOptions = async () => {
 try {
 const [pjRes, medRes, tipoRes] = await Promise.all([
 fetch(`${API_BASE}/pj/options`),
 fetch(`${API_BASE}/medida/options`),
 fetch(`${API_BASE}/tipoproduto/options`)
 ]);
 const [pjJson, medJson, tipoJson] = await Promise.all([pjRes.json(), medRes.json(), tipoRes.json()]);
 if (pjJson.success) setClienteOptions(pjJson.data);
 if (medJson.success) setMedidaOptions(medJson.data);
 if (tipoJson.success) setTipoProdutoOptions(tipoJson.data);
 } catch {
 console.error('Error fetching options:', err);
 }
 };

 // Fetch Projetos
 const fetchProjetos = async (overrideFilters?: Record<string, unknown>, page = 1, append = false) => {
 if (append) setLoadingMore(true);
 else { setLoading(true); setCurrentPage(1); }
 setError(null);
 try {
 const activeFilters = overrideFilters || searchFilters;
 const params = new URLSearchParams();
 if (activeFilters.projeto) params.append('projeto', activeFilters.projeto);
 if (activeFilters.descProjeto) params.append('descProjeto', activeFilters.descProjeto);
 if (activeFilters.cliente) params.append('descEmpresa', activeFilters.cliente);
 if (activeFilters.cnpj) params.append('cnpj', activeFilters.cnpj);
 if (activeFilters.previsaoInicio) {
 const [y, m, d] = activeFilters.previsaoInicio.split('-');
 params.append('previsaoInicio', `${d}/${m}/${y}`);
 }
 if (activeFilters.previsaoFim) {
 const [y, m, d] = activeFilters.previsaoFim.split('-');
 params.append('previsaoFim', `${d}/${m}/${y}`);
 }
 if (activeFilters.criacaoInicio) {
 const [y, m, d] = activeFilters.criacaoInicio.split('-');
 params.append('criacaoInicio', `${d}/${m}/${y}`);
 }
 if (activeFilters.criacaoFim) {
 const [y, m, d] = activeFilters.criacaoFim.split('-');
 params.append('criacaoFim', `${d}/${m}/${y}`);
 }
 // Sempre envia finalizado: '' = todos, 'N' = não finalizados, 'C' = finalizados
 params.append('finalizado', activeFilters.finalizado ?? 'N');
 if (activeFilters.statusProj) params.append('statusProj', activeFilters.statusProj);

 params.append('page', String(page));
 params.append('limit', String(PAGE_LIMIT));
 const qs = params.toString();
 const res = await fetch(`${API_BASE}/projeto${qs ? `?${qs}` : ''}`);
 const json = await res.json();
 if (json.success) {
 setProjetos(prev => append ? [...prev, ...json.data] : json.data);
 setTotalCount(json.total ?? json.data.length);
 setCurrentPage(page);
 } else {
 showAlert(json.message || 'Erro ao carregar dados', "error");
 }
 } catch {
 showAlert('Erro de conexão com o servidor.', "error");
 } finally {
 setLoading(false);
 setLoadingMore(false);
 }
 };

 // Fetch Tags for a project
 const fetchTags = async (projetoId: number) => {
 setLoadingTags(prev => new Set(prev).add(projetoId));
 try {
 const res = await fetch(`${API_BASE}/projeto/${projetoId}/tags`);
 const json = await res.json();
 if (json.success) {
 setProjectTags(prev => ({ ...prev, [projetoId]: json.data }));
 }
 } catch {
 console.error('Error fetching tags:', err);
 } finally {
 setLoadingTags(prev => {
 const next = new Set(prev);
 next.delete(projetoId);
 return next;
 });
 }
 };

 useEffect(() => {
 fetchProjetos();
 fetchOptions();
 }, []);

 // Auto-calculate TotalFinal (sum of composition table values)
 useEffect(() => {
 const toNum = (v: string | undefined) => parseFloat(v || '0') || 0;
 const total =
 toNum(projetoFormData.ValorFabricacao) +
 toNum(projetoFormData.ValorRevenda) +
 toNum(projetoFormData.ValorFrete) +
 toNum(projetoFormData.ValorInstalacao) +
 toNum(projetoFormData.ValorEmbalagem);
 if (total > 0) {
 setProjetoFormData(prev => ({ ...prev, TotalValor: String(total) }));
 }
 }, [
 projetoFormData.ValorFabricacao,
 projetoFormData.ValorRevenda,
 projetoFormData.ValorFrete,
 projetoFormData.ValorInstalacao,
 projetoFormData.ValorEmbalagem,
 ]);

 // Auto-calculate payment Valor Total (sum of payment method values)
 // stored as a computed display value - shown in the Valor Total field in the payment section
 const calcPaymentTotal = () => {
 const toNum = (v: string | undefined) => parseFloat(v || '0') || 0;
 const sum =
 toNum(projetoFormData.Transferencia) +
 toNum(projetoFormData.Pix) +
 toNum(projetoFormData.Cartao) +
 toNum(projetoFormData.Empenho) +
 toNum(projetoFormData.Boleto) +
 toNum(projetoFormData.Dinheiro);
 return sum > 0 ? String(sum) : '';
 };


 const inputBaseClass = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all";
 const inputRequired = `${inputBaseClass} border-gray-300 bg-amber-50/30`;
 const inputOptional = `${inputBaseClass} border-gray-200`;
 const selectClass = `${inputOptional} appearance-none bg-white`;

 // Toggle project expansion
 const toggleProject = async (projetoId: number) => {
 const newExpanded = new Set(expandedProjects);
 if (newExpanded.has(projetoId)) {
 newExpanded.delete(projetoId);
 } else {
 newExpanded.add(projetoId);
 // Fetch tags if not already loaded
 if (!projectTags[projetoId]) {
 await fetchTags(projetoId);
 }
 }
 setExpandedProjects(newExpanded);
 };

 // Projetos exibidos (não precisa filtrar client-side, o backend já filtra)
 const filteredProjetos = projetos;

 // === PROJETO HANDLERS ===
 const handleProjetoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const target = e.target;
 const name = target.name;
 let value = target.value;
 const type = target.type;

 // Forçar caixa alta em todos os campos de texto/textarea
 if (type === 'text' || target.tagName === 'TEXTAREA') {
 value = value.toUpperCase();
 }

 setProjetoFormData(prev => {
 const nextData = { ...prev, [name]: value };

 // Cálculo automático de 'Dias (Prazo)'
 if (name === 'DataPrevisao') {
 if (value) {
 const parts = value.split('-');
 if (parts.length === 3) {
 const prevDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 const diffTime = prevDate.getTime() - today.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 nextData.PrazoEntrega = diffDays.toString();
 }
 } else {
 nextData.PrazoEntrega = '';
 }
 }

 return nextData;
 });
 };

 const handleProjetoSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setError(null);

 try {
 const url = isEditingProjeto ? `${API_BASE}/projeto/${projetoFormData.IdProjeto}` : `${API_BASE}/projeto`;
 const method = isEditingProjeto ? 'PUT' : 'POST';

 const payload: Record<string, unknown> = { ...projetoFormData };
 delete payload.IE;
 delete payload.Ie;

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });

 const json = await res.json();
 if (json.success) {
 await fetchProjetos();
 resetProjetoForm();
 showAlert(isEditingProjeto ? 'Projeto atualizado!' : 'Projeto criado!', "success");
 } else {
 showAlert(json.message || 'Erro ao salvar', "error");
 }
 } catch {
 showAlert('Erro ao salvar. Verifique a conexão.', "error");
 } finally {
 setSaving(false);
 }
 };

 const parseToInputDate = (val: string | undefined): string => {
 if (!val) return '';
 if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
 const brMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
 if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
 try {
 const d = new Date(val);
 if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
 } catch { /* ignore */ }
 return '';
 };

 const handleProjetoEdit = async (id: number) => {
 try {
 const res = await fetch(`${API_BASE}/projeto/${id}`);
 const json = await res.json();
 if (json.success) {
 const data = json.data;
 
 const valEntrada = data.DataEntradaPedido || data.dataentradapedido || data.DataEntrada;
 if (valEntrada) data.DataEntradaPedido = parseToInputDate(valEntrada);
 
 const valPlanejado = data.PlanejadoFinanceiro || data.planejadofinanceiro || data.DataPlanejadoFinanceiro;
 if (valPlanejado) data.PlanejadoFinanceiro = parseToInputDate(valPlanejado);
 
 const valPrevisao = data.DataPrevisao || data.dataprevisao;
 if (valPrevisao) data.DataPrevisao = parseToInputDate(valPrevisao);
 
 // Unified mapping for IE/InscEst
 const valIE = data.InscEst || data.IE || data.Ie || data.inscest;
 data.InscEst = valIE || '';
 delete data.IE;
 delete data.Ie;
 delete data.inscest;

 setProjetoFormData(data);
 setIsEditingProjeto(true);
 setShowProjetoForm(true);
 }
 } catch {
 console.error('Fetch error:', err);
 }
 };

 const handleProjetoDelete = async (id: number) => {
 if (!confirm('Deseja realmente excluir este projeto?')) return;

 try {
 const res = await fetch(`${API_BASE}/projeto/${id}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: 'Edson' }),
 });
 const json = await res.json();
 if (json.success) {
 await fetchProjetos();
 showAlert('Projeto excluído com sucesso.', "success");
 } else {
 showAlert(json.message || 'Erro ao excluir', "error");
 }
 } catch {
 showAlert('Erro ao excluir. Verifique a conexão.', "error");
 }
 };


 const handleOpenFolder = async (id: number) => {
 try {
 const res = await fetch(`${API_BASE}/projeto/${id}/open-folder`, { method: 'POST' });
 const json = await res.json();
 if (json.success) {
 showAlert('Pasta aberta no servidor.', "success");
 } else {
 showAlert(json.message || 'Erro ao abrir pasta.', "error");
 }
 } catch {
 showAlert('Erro de conexão ao tentar abrir pasta.', "error");
 }
 };

 const handleLiberar = async (id: number) => {
 if (!confirm('Deseja realmente liberar este projeto?')) return;
 try {
 const res = await fetch(`${API_BASE}/projeto/${id}/liberar`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: 'Sistema' })
 });
 const json = await res.json();
 if (json.success) {
 showAlert('Projeto liberado com sucesso!', "success");
 fetchProjetos(); // Recarrega
 } else {
 showAlert(json.message || 'Erro ao liberar.', "error");
 }
 } catch {
 showAlert('Erro de conexão ao liberar.', "error");
 }
 };

 const handleCancelarLiberacao = async (id: number) => {
 if (!confirm('Deseja realmente CANCELAR a liberação deste projeto?')) return;
 try {
 const res = await fetch(`${API_BASE}/projeto/${id}/cancelar-liberacao`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' }
 });
 const json = await res.json();
 if (json.success) {
 showAlert('Liberação cancelada com sucesso!', "success");
 fetchProjetos(); // Recarrega
 } else {
 showAlert(json.message || 'Erro ao cancelar liberação.', "error");
 }
 } catch {
 showAlert('Erro de conexão ao cancelar liberação.', "error");
 }
 };

 const resetProjetoForm = () => {
 setProjetoFormData(emptyProjetoForm);
 setIsEditingProjeto(false);
 setShowProjetoForm(false);
 };

 // === PARAR / CANCELAR / REATIVAR PROJETO ===
 const { user } = useAuth();

 // Abre o modal de confirmação SEMPRE antes de alterar o status
 const handleAlterarStatus = async (projetoId: number, status: 'PA' | 'CA' | 'AT', confirmar = false, usuario?: string) => {
 // Se ainda não confirmou → abre o modal de confirmação
 if (!confirmar) {
 const msgMap: Record<string, string> = {
 CA: 'Tem certeza que deseja CANCELAR este projeto? Toda a cadeia (Tags e Ordens de Serviço) também será cancelada.',
 PA: 'Tem certeza que deseja PARAR este projeto? Toda a cadeia (Tags e Ordens de Serviço) também será atualizada.',
 AT: 'Tem certeza que deseja REATIVAR este projeto? Toda a cadeia abaixo (Tags e Ordens de Serviço) também será reativada.',
 };
 setConfirmUsuario(user?.nome || '');
 setConfirmModal({
 open: true,
 projetoId,
 status,
 message: msgMap[status] ?? 'Confirme a operação.',
 requiresConfirmation: false,
 });
 return;
 }

 // Confirmado → executa no backend
 try {
 const res = await fetch(`${API_BASE}/projeto/${projetoId}/status`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status, confirmar: true, usuario: usuario || user?.nome || '' }),
 });
 const json = await res.json();

 if (json.success) {
 showAlert(json.message, 'success');
 setConfirmModal({ open: false, projetoId: null, status: null, message: '', requiresConfirmation: false });
 setConfirmUsuario('');
 fetchProjetos();
 } else {
 showAlert(json.message || 'Erro ao alterar status.', 'error');
 }
 } catch {
 showAlert('Erro de conexão ao alterar status.', 'error');
 }
 };

 const handleConfirmarStatusModal = () => {
 if (confirmModal.projetoId && confirmModal.status) {
 if (!confirmUsuario.trim()) {
 showAlert('Informe seu nome para autorizar esta operação.', 'error');
 return;
 }
 handleAlterarStatus(confirmModal.projetoId, confirmModal.status as 'PA' | 'CA' | 'AT', true, confirmUsuario);
 }
 };

 // === TAG HANDLERS ===
 const openTagForm = (projeto: Projeto) => {
 setSelectedProjetoForTag(projeto);
 // Ensure the date is in YYYY-MM-DD for the input
 const defaultDate = parseToInputDate(projeto.DataPrevisao);
 setTagFormData({
 ...emptyTagForm,
 DataPrevisao: defaultDate
 });
 setIsEditingTag(false);
 setShowTagForm(true);
 };

 const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const target = e.target;
 const name = target.name;
 let value = target.value;
 const type = target.type;

 if (type === 'text' || target.tagName === 'TEXTAREA') {
 value = value.toUpperCase();
 }

 setTagFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleTagSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 setError(null);

 try {
 const payload = {
 ...tagFormData,
 IdProjeto: selectedProjetoForTag?.IdProjeto,
 Projeto: selectedProjetoForTag?.Projeto
 };

 const url = isEditingTag ? `${API_BASE}/tag/${tagFormData.IdTag}` : `${API_BASE}/tag`;
 const method = isEditingTag ? 'PUT' : 'POST';

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });

 const json = await res.json();
 if (json.success) {
 if (selectedProjetoForTag?.IdProjeto) {
 await fetchTags(selectedProjetoForTag.IdProjeto);
 }
 resetTagForm();
 showAlert('Tag salva com sucesso!', "success");
 } else {
 showAlert(json.message || 'Erro ao salvar', "error");
 }
 } catch {
 showAlert('Erro ao salvar. Verifique a conexão.', "error");
 } finally {
 setSaving(false);
 }
 };

 const handleTagEdit = async (tag: Tag, projeto: Projeto) => {
 setSelectedProjetoForTag(projeto);
 try {
 const res = await fetch(`${API_BASE}/tag/${tag.IdTag}`);
 const json = await res.json();
 if (json.success) {
 setTagFormData(json.data);
 setIsEditingTag(true);
 setShowTagForm(true);
 }
 } catch {
 console.error('Fetch error:', err);
 }
 };

 const handleTagDelete = async (tagId: number, projetoId: number) => {
 if (!confirm('Deseja realmente excluir esta tag?')) return;

 try {
 const res = await fetch(`${API_BASE}/tag/${tagId}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ usuario: 'Edson' }),
 });
 const json = await res.json();
 if (json.success) {
 await fetchTags(projetoId);
 showAlert('Tag excluída.', "success");
 } else {
 showAlert(json.message || 'Erro ao excluir', "error");
 }
 } catch {
 showAlert('Erro ao excluir. Verifique a conexão.', "error");
 }
 };

 const resetTagForm = () => {
 setTagFormData(emptyTagForm);
 setIsEditingTag(false);
 setShowTagForm(false);
 setSelectedProjetoForTag(null);
 };

 const getStatusColor = (status?: string) => {
 const s = (status ?? '').trim();
 switch (s) {
 case 'FN': return 'bg-green-100 text-green-700';
 case 'CA': return 'bg-red-100 text-red-700';
 case 'PA': return 'bg-yellow-100 text-yellow-700';
 case 'AT': return 'bg-emerald-100 text-emerald-700';
 default: return 'bg-gray-100 text-gray-500'; // Inicial — sem status definido
 }
 };

 const getStatusLabel = (status?: string, descStatus?: string) => {
 const s = (status ?? '').trim();
 // Se não há status definido → 'Inicial'
 if (!s) return 'Inicial';
 // Se há descrição customizada (DescStatus) e o status é conhecido, usa a desc apenas para AT/PA/CA
 switch (s) {
 case 'AT': return 'Ativo';
 case 'PA': return 'Parado';
 case 'CA': return 'Cancelado';
 case 'FN': return 'Finalizado';
 default: return descStatus || 'Inicial';
 }
 };

 return (
 <div className="space-y-6 h-full flex flex-col min-h-0">
 {/* Error Alert */}
 {error && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
 >
 {error}
 </motion.div>
 )}

 {/* Modal de Confirmação — Cancelar / Parar / Reativar Projeto */}
 {confirmModal.open && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
 <motion.div
 initial={{ opacity: 0, scale: 0.92 }}
 animate={{ opacity: 1, scale: 1 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-md mx-4 overflow-hidden"
 >
 {/* Header */}
 {(() => {
 const cfg = {
 CA: { bg: 'bg-red-50 border-red-100', icon: 'bg-red-100 text-red-600', Icon: Ban, label: 'Cancelar Projeto', btnCls: 'bg-red-600 hover:bg-red-700' },
 PA: { bg: 'bg-yellow-50 border-yellow-100', icon: 'bg-yellow-100 text-yellow-600', Icon: Pause, label: 'Parar Projeto', btnCls: 'bg-yellow-500 hover:bg-yellow-600' },
 AT: { bg: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', Icon: Play, label: 'Reativar Projeto', btnCls: 'bg-emerald-600 hover:bg-emerald-700' },
 }[confirmModal.status ?? 'CA'] ?? { bg: 'bg-gray-50 border-gray-100', icon: 'bg-gray-100 text-gray-600', Icon: Pause, label: 'Confirmar', btnCls: 'bg-gray-600' };
 return (
 <>
 <div className={`px-4 py-2 flex items-center gap-3 border-b ${cfg.bg}`}>
 <div className={`w-10 h-10 rounded-md flex items-center justify-center ${cfg.icon}`}>
 <cfg.Icon size={20} />
 </div>
 <div>
 <h3 className="font-bold text-gray-800 text-sm">{cfg.label}</h3>
 <p className="text-xs text-gray-500">Esta ação afetará toda a cadeia do projeto</p>
 </div>
 </div>

 {/* Body */}
 <div className="px-6 py-5">
 <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
 <p className="text-sm text-amber-800 font-medium leading-relaxed">
 {confirmModal.message}
 </p>
 </div>
 <p className="text-sm text-gray-600 leading-relaxed">Os seguintes registros também serão atualizados:</p>
 <ul className="mt-2 space-y-1">
 <li className="text-xs text-gray-500 flex items-center gap-1.5">
 <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
 Todas as <strong>Tags</strong> vinculadas ao projeto
 </li>
 <li className="text-xs text-gray-500 flex items-center gap-1.5">
 <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
 Todas as <strong>Ordens de Serviço</strong> vinculadas ao projeto
 </li>
 </ul>
 {/* Campo obrigatório: nome do usuário autorizador */}
 <div className="mt-4">
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 👤 Seu nome <span className="text-red-500">*</span>
 <span className="text-gray-400 font-normal ml-1">(obrigatório para registrar a operação)</span>
 </label>
 <input
 type="text"
 value={confirmUsuario}
 onChange={e => setConfirmUsuario(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && confirmUsuario.trim() && handleConfirmarStatusModal()}
 placeholder="Digite seu nome completo..."
 className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 border-gray-200 focus:border-amber-400 focus:ring-amber-100"
 autoFocus
 />
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 pb-5 flex justify-end gap-3">
 <button
 onClick={() => { setConfirmModal({ open: false, projetoId: null, status: null, message: '', requiresConfirmation: false }); setConfirmUsuario(''); }}
 className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
 >
 Cancelar
 </button>
 <button
 onClick={handleConfirmarStatusModal}
 disabled={!confirmUsuario.trim()}
 className={`px-5 py-2 rounded-lg text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${cfg.btnCls}`}
 >
 ✓ Confirmar — {cfg.label}
 </button>
 </div>
 </>
 );
 })()}
 </motion.div>
 </div>,
 document.body
 )}

 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 
 <p className="text-gray-500 text-sm">Clique em um projeto para expandir e ver suas tags</p>
 </div>
 <div className="flex gap-2">

 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => { resetProjetoForm(); setShowProjetoForm(true); }}
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#32423D] text-white font-medium hover:bg-[#3d4f49] transition-colors shadow-sm"
 >
 <Plus size={18} />
 Novo Projeto
 </motion.button>
 </div>
 </div>

 {/* Search Filters Section */}
 <div className="bg-white rounded-md shadow-sm border border-gray-100 mb-2 shrink-0">
 <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 flex items-center gap-2 m-0">
 <Search size={12} /> Dados para Pesquisa
 </h3>
 <button
 type="button"
 onClick={() => setShowFilters(!showFilters)}
 className="text-[10px] flex items-center gap-1.5 text-gray-500 hover:text-[#32423D] hover:bg-gray-50 px-2 py-1 rounded transition-colors border border-gray-200 uppercase font-bold"
 >
 <Filter size={11} /> {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
 </button>
 </div>
 {showFilters && (
 <div className="px-4 pb-2 pt-2">

 {/* Linha 1: Projeto | Descrição | Cliente | Finalizado */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-1.5 mb-1.5">
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Projeto:</label>
 <input
 type="search"
 value={searchFilters.projeto}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, projeto: e.target.value.toUpperCase() }))}
 onKeyDown={(e) => e.key === 'Enter' && fetchProjetos()}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 placeholder="PROJ-00X"
 />
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Descrição:</label>
 <input
 type="search"
 value={searchFilters.descProjeto}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, descProjeto: e.target.value.toUpperCase() }))}
 onKeyDown={(e) => e.key === 'Enter' && fetchProjetos()}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 placeholder="Detalhes..."
 />
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Cliente:</label>
 <input
 type="search"
 value={searchFilters.cliente}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, cliente: e.target.value.toUpperCase() }))}
 onKeyDown={(e) => e.key === 'Enter' && fetchProjetos()}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 placeholder="ALFATEC, SIEMENS..."
 />
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">CNPJ:</label>
 <input
 type="search"
 value={searchFilters.cnpj}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, cnpj: e.target.value }))}
 onKeyDown={(e) => e.key === 'Enter' && fetchProjetos()}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 placeholder="00.000.000/0001-00"
 />
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Condição do Projeto:</label>
 <select
 value={searchFilters.finalizado}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, finalizado: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm appearance-none"
 >
 <option value="">— Todos —</option>
 <option value="N">Não Finalizados</option>
 <option value="C">Finalizados</option>
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Status do Projeto:</label>
 <select
 value={searchFilters.statusProj}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, statusProj: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm appearance-none"
 >
 <option value="">— Todos —</option>
 <option value="AT">Ativo</option>
 <option value="PA">Parado</option>
 <option value="CA">Cancelado</option>
 </select>
 </div>
 </div>

 {/* Linha 2: Datas */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
 {/* Data Previsão */}
 <div className="flex items-center gap-1.5">
 <div className="flex-1">
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Dt Prev. de:</label>
 <input
 type="date"
 value={searchFilters.previsaoInicio}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, previsaoInicio: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 />
 </div>
 <span className="text-gray-400 text-xs italic pt-4">a</span>
 <div className="flex-1">
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 invisible">até</label>
 <input
 type="date"
 value={searchFilters.previsaoFim}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, previsaoFim: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 />
 </div>
 </div>

 {/* Data Criação */}
 <div className="flex items-center gap-1.5">
 <div className="flex-1">
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Dt Criação de:</label>
 <input
 type="date"
 value={searchFilters.criacaoInicio}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, criacaoInicio: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 />
 </div>
 <span className="text-gray-400 text-xs italic pt-4">a</span>
 <div className="flex-1">
 <label className="block text-[10px] font-semibold text-gray-500 mb-0.5 invisible">até</label>
 <input
 type="date"
 value={searchFilters.criacaoFim}
 onChange={(e) => setSearchFilters(prev => ({ ...prev, criacaoFim: e.target.value }))}
 className="w-full px-2 py-1 border border-gray-300 bg-white text-xs focus:outline-none focus:border-[#32423D] rounded-sm"
 />
 </div>
 </div>
 </div>

 {/* Botões de ação */}
 <div className="flex justify-end gap-2">
 <button
 onClick={() => {
 const emptyFilters = { projeto: '', descProjeto: '', cliente: '', cnpj: '', previsaoInicio: '', previsaoFim: '', criacaoInicio: '', criacaoFim: '', finalizado: '' };
 setSearchFilters(emptyFilters);
 fetchProjetos(emptyFilters);
 }}
 className="px-3 py-1.5 text-gray-500 font-semibold text-xs tracking-wide rounded border border-gray-200 hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-1.5"
 >
 <X size={13} />
 Limpar
 </button>
 <button
 onClick={() => fetchProjetos()}
 disabled={loading}
 className="px-5 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs tracking-wide rounded hover:bg-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
 >
 <Search size={13} />
 {loading ? 'Buscando...' : 'Pesquisar'}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Tree View */}
 <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
 {loading ? (
 <div className="divide-y divide-gray-100">
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="flex items-center gap-3 px-3 py-1.5 animate-pulse">
 <div className="w-6 h-6 rounded bg-gray-100" />
 <div className="w-9 h-9 rounded-lg bg-gray-100" />
 <div className="flex-1 min-w-0 space-y-1.5">
 <div className="h-3 bg-gray-100 rounded w-2/3" />
 <div className="h-2.5 bg-gray-100 rounded w-1/3" />
 </div>
 <div className="hidden sm:block w-24 h-3 bg-gray-100 rounded" />
 <div className="hidden sm:block w-16 h-3 bg-gray-100 rounded" />
 <div className="hidden sm:block w-14 h-5 bg-gray-100 rounded-full" />
 <div className="w-28 h-7 bg-gray-100 rounded-lg" />
 </div>
 ))}
 </div>
 ) : filteredProjetos.length === 0 ? (
 <div className="p-12 flex flex-col items-center justify-center gap-3 text-gray-400">
 <FolderKanban size={40} strokeWidth={1.5} />
 <p className="text-sm">Nenhum projeto encontrado</p>
 </div>
 ) : (
 <div className="flex flex-col h-full min-h-0">
 {/* Headers */}
 <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a3830] bg-[#32423D] text-[10px] font-bold text-white uppercase tracking-wider sticky top-0 z-10">
 <div className="flex-1 min-w-0 max-w-[360px] flex items-center gap-2">
 Projeto / Cliente
 <span className="ml-1 text-[9px] font-normal text-white/50 normal-case tracking-normal">
 {projetos.length} de {totalCount} registros
 </span>
 </div>
 <div className="hidden sm:block w-32 shrink-0 text-center">Dt. Previsão</div>
 <div className="hidden sm:block w-20 shrink-0">Prazo</div>
 <div className="hidden sm:block w-28 shrink-0">Finalizado</div>
 <div className="hidden sm:block w-[72px] shrink-0 text-center">Status</div>
 <div className="flex items-center justify-end w-[280px] shrink-0">Ações</div>
 </div>
 <div className="divide-y divide-gray-100 overflow-y-auto min-h-0">
 {filteredProjetos.map((projeto) => {
 const isExpanded = expandedProjects.has(projeto.IdProjeto!);
 const tags = projectTags[projeto.IdProjeto!] || [];
 const isLoadingTags = loadingTags.has(projeto.IdProjeto!);
 const isFinalizado = projeto.Finalizado === 'C';
 const isPausedOrCanceled = projeto.StatusProj === 'PA' || projeto.StatusProj === 'CA';
 const isDisabledStatus = isPausedOrCanceled || isFinalizado;

 return (
 <div key={projeto.IdProjeto}>
 {/* Project Row */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.15 }}
 className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-[#E0E800]/5' : ''}`}
 onClick={() => projeto.IdProjeto && toggleProject(projeto.IdProjeto)}
 >
 {/* Project Info */}
 <div className="flex-1 min-w-0 max-w-[360px]">
 <div className="flex items-center gap-1.5 overflow-hidden">
 <span className="text-xs text-gray-400 font-mono shrink-0">{projeto.IdProjeto}</span>
 <span className="text-sm font-medium text-gray-900 truncate">{projeto.Projeto}</span>
 <span className="text-xs text-gray-500 truncate ml-1 border-l border-gray-200 pl-1.5">
 {(projeto.DescEmpresa && !projeto.DescEmpresa.toLowerCase().includes('sem cliente') && projeto.DescEmpresa !== 'SEM CLIENTE DEFINIDO') ? projeto.DescEmpresa : (projeto.ClienteProjeto || 'Sem cliente')}
 </span>
 </div>
 </div>

 {/* Data Previsão */}
 <div className={`hidden sm:flex items-center gap-1 text-xs w-32 shrink-0 ${isDateInPast(projeto.DataPrevisao) ? 'text-red-500 font-semibold' : 'text-gray-500'}`} title="Previsão de Entrega">
 <Calendar size={12} className={isDateInPast(projeto.DataPrevisao) ? 'text-red-400' : 'text-gray-400'} />
 {formatToBRDate(projeto.DataPrevisao)}
 </div>

 {/* Prazo */}
 <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 w-20 shrink-0" title="Prazo em dias">
 <TagIcon size={12} className="text-gray-400" />
 {projeto.PrazoEntrega ? `${projeto.PrazoEntrega}d` : '-'}
 </div>

 {/* Finalizado */}
 <div className="hidden sm:flex flex-col text-[11px] w-28 shrink-0 justify-center">
 {projeto.Finalizado === 'C' ? (
 <>
 <span className="font-semibold text-emerald-600">Finalizado</span>
 {projeto.DataFinalizado && (
 <span className="text-gray-500">{formatToBRDate(projeto.DataFinalizado)}</span>
 )}
 </>
 ) : (
 <span className="text-gray-400">Não Finalizado</span>
 )}
 </div>

 {/* Status */}
 <span className={`hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full w-[72px] shrink-0 justify-center ${getStatusColor(projeto.StatusProj)}`}>
 {getStatusLabel(projeto.StatusProj, projeto.DescStatus)}
 </span>



 {/* Actions */}
 <div className="flex items-center justify-end w-[280px] shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
 <button
 onClick={() => !isDisabledStatus && projeto.IdProjeto && handleOpenFolder(projeto.IdProjeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/10'}`}
 title="Abrir Pasta Projeto"
 disabled={isDisabledStatus}
 >
 <FolderOpen size={14} />
 </button>
 {(!projeto.liberado || projeto.liberado.trim() === '') ? (
 <button
 onClick={() => !isDisabledStatus && projeto.IdProjeto && handleLiberar(projeto.IdProjeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
 title="Liberar Projeto"
 disabled={isDisabledStatus}
 >
 <CheckCircle2 size={14} />
 </button>
 ) : (
 <button
 onClick={() => !isDisabledStatus && projeto.IdProjeto && handleCancelarLiberacao(projeto.IdProjeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus || Number(projeto.temApontamento) > 0 ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'}`}
 title={Number(projeto.temApontamento) > 0 ? 'Não é possível cancelar: projeto possui apontamentos de produção' : 'Cancelar Liberação'}
 disabled={isDisabledStatus || Number(projeto.temApontamento) > 0}
 >
 <RotateCcw size={14} />
 </button>
 )}
 <div className="w-px h-3 bg-gray-200 mx-0.5"></div>
 {/* Reativar (aparece se parado ou cancelado) */}
 {isPausedOrCanceled && (
 <button
 onClick={() => projeto.IdProjeto && handleAlterarStatus(projeto.IdProjeto, 'AT')}
 className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
 title="Reativar Projeto (Ativo)"
 >
 <Play size={14} />
 </button>
 )}
 {/* Parar Projeto (oculto se já parado ou cancelado) */}
 {!isDisabledStatus && (
 <button
 onClick={() => projeto.IdProjeto && handleAlterarStatus(projeto.IdProjeto, 'PA')}
 className="p-1.5 rounded-md text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
 title="Parar Projeto"
 >
 <Pause size={14} />
 </button>
 )}
 {/* Cancelar Projeto (oculto se já cancelado ou parado) */}
 {!isDisabledStatus && (
 <button
 onClick={() => projeto.IdProjeto && handleAlterarStatus(projeto.IdProjeto, 'CA')}
 className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
 title="Cancelar Projeto"
 >
 <Ban size={14} />
 </button>
 )}
 <div className="w-px h-3 bg-gray-200 mx-0.5"></div>
 <button
 onClick={() => !isDisabledStatus && openTagForm(projeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20'}`}
 title="Nova Tag"
 disabled={isDisabledStatus}
 >
 <Plus size={14} />
 </button>
 <button
 onClick={() => !isDisabledStatus && projeto.IdProjeto && handleProjetoEdit(projeto.IdProjeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20'}`}
 title="Editar Projeto"
 disabled={isDisabledStatus}
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => !isDisabledStatus && projeto.IdProjeto && handleProjetoDelete(projeto.IdProjeto)}
 className={`p-1.5 rounded-md transition-colors ${isDisabledStatus ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
 title="Excluir Projeto"
 disabled={isDisabledStatus}
 >
 <Trash2 size={14} />
 </button>
 </div>
 </motion.div>

 {/* Tags (Expanded) */}
 <AnimatePresence>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden bg-gray-50/50"
 >
 {isLoadingTags ? (
 <div className="pl-16 py-4 text-sm text-gray-400 flex items-center gap-2">
 <Loader2 size={14} className="animate-spin" />
 Carregando tags...
 </div>
 ) : tags.length === 0 ? (
 <div className="pl-16 py-4 text-sm text-gray-400 flex items-center gap-2">
 <TagIcon size={14} />
 Nenhuma tag cadastrada
 <button
 onClick={() => openTagForm(projeto)}
 className="text-[#32423D] font-medium hover:underline ml-2"
 >
 Adicionar
 </button>
 </div>
 ) : (
 <div className="pl-10 pr-4 py-2 space-y-1">
 {/* Tags Header */}
 <div className="flex items-center gap-3 pl-6 py-1 text-xs font-medium text-gray-400 uppercase">
 <div className="w-4 shrink-0"></div>
 <div className="w-7 shrink-0"></div>
 
 <span className="flex-1 min-w-0">Tag</span>
 <span className="hidden sm:block shrink-0 text-center" style={{width:'96px'}}>Prev. Entrega</span>
 <span className="hidden sm:block shrink-0" style={{width:'128px'}}>Tipo</span>
 <span className="shrink-0 text-center" style={{width:'64px'}}>Qtde</span>
 <span className="shrink-0 text-center" style={{width:'64px'}}>Lib.</span>
 <span className="shrink-0 text-center" style={{width:'64px'}}>Saldo</span>
 <span className="shrink-0" style={{width:'80px'}}></span>
 </div>

 {/* Tag Rows */}
 {tags.map((tag) => (
 <motion.div
 key={tag.IdTag}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 className="flex items-center gap-3 pl-6 py-2 rounded-lg hover:bg-white transition-colors group"
 >
 {/* Tree line connector */}
 <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 rounded-bl-lg -ml-2"></div>

 {/* Tag Icon */}
 <div className="w-7 h-7 rounded-lg bg-[#E0E800]/20 text-[#32423D] flex items-center justify-center">
 <TagIcon size={12} />
 </div>

 <span className="shrink-0 text-xs text-gray-400 font-mono" style={{width:'40px'}}>{tag.IdTag}</span>
 <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{tag.Tag}</span>
 <span className="hidden sm:block shrink-0 text-xs text-gray-500 truncate text-center" style={{width:'96px'}}>
 {formatToBRDate(tag.DataPrevisao)}
 </span>
 <span className="hidden sm:block shrink-0 text-xs text-gray-500 truncate" style={{width:'128px'}}>{tag.TipoProduto || '-'}</span>
 <span className="shrink-0 text-sm text-gray-600 text-center" style={{width:'64px'}}>{tag.QtdeTag || '-'}</span>
 <span className="shrink-0 text-sm text-gray-600 text-center" style={{width:'64px'}}>{tag.QtdeLiberada || '-'}</span>
 <span className="shrink-0 text-sm text-gray-600 text-center" style={{width:'64px'}}>{tag.SaldoTag || '-'}</span>

 {/* Tag Actions */}
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => handleTagEdit(tag, projeto)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
 title="Editar Tag"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => tag.IdTag && projeto.IdProjeto && handleTagDelete(tag.IdTag, projeto.IdProjeto)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
 title="Excluir Tag"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </motion.div>
 ))}
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>
 </div>
 )
 }

 {/* Footer — Paginação / Carregar mais */}
 {!loading && filteredProjetos.length > 0 && (
 <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
 <p className="text-xs text-gray-500">
 <span className="font-medium">{projetos.length}</span> de{" "}
 <span className="font-medium">{totalCount}</span> projetos
 {expandedProjects.size > 0 && (
 <> · <span className="font-medium">{expandedProjects.size}</span> expandidos</>
 )}
 </p>
 {projetos.length < totalCount && (
 <button
 onClick={() => fetchProjetos(searchFilters, currentPage + 1, true)}
 disabled={loadingMore}
 className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#32423D] border border-[#32423D]/30 rounded-lg hover:bg-[#32423D]/5 transition-colors disabled:opacity-50"
 >
 {loadingMore ? (
 <><Loader2 size={13} className="animate-spin" /> Carregando...</>
 ) : (
 <><RefreshCw size={13} /> Carregar mais ({totalCount - projetos.length} restantes)</>
 )}
 </button>
 )}
 </div>
 )}
 </div >

 {/* Projeto Form Modal */}
 <AnimatePresence>
 {
 showProjetoForm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
 onClick={(e) => e.target === e.currentTarget && resetProjetoForm()}
 >
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="bg-white rounded-md shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-gray-100"
 >
 <form onSubmit={handleProjetoSubmit}>
 {/* Header / Toolbar */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded bg-[#32423D] text-white flex items-center justify-center">
 <FolderKanban size={20} />
 </div>
 <div>
 <h2 className="text-lg font-bold text-[#32423D] tracking-tight">
 {isEditingProjeto ? 'Editar Projeto' : 'Novo Projeto'}
 </h2>
 <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5 font-medium">Gestão de Projetos</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button type="button" onClick={() => resetProjetoForm()} className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm rounded">
 <Plus size={16} /> Novo
 </button>
 <button type="submit" disabled={saving} className="px-4 py-2 bg-[#32423D] text-white text-sm font-semibold hover:bg-[#3d4f49] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm rounded">
 {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 Salvar
 </button>
 {isEditingProjeto && projetoFormData.liberado === 'S' && (
 <button type="button" onClick={() => projetoFormData.IdProjeto && handleCancelarLiberacao(projetoFormData.IdProjeto)} 
 disabled={Number(projetoFormData.temApontamento) > 0}
 className={`px-4 py-2 border text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm rounded ${Number(projetoFormData.temApontamento) > 0 ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed' : 'border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100'}`}
 title={Number(projetoFormData.temApontamento) > 0 ? 'Não é possível cancelar: projeto possui apontamentos de produção' : 'Cancelar Liberação'}
 >
 <RotateCcw size={16} /> Cancelar Liberação
 </button>
 )}
 {isEditingProjeto && (
 <button type="button" onClick={() => { setShowProjetoForm(false); setIsEditingTag(false); openTagForm(projetoFormData); }} className="px-4 py-2 border border-[#32423D]/20 text-[#32423D] bg-[#E0E800]/20 text-sm font-semibold hover:bg-[#E0E800]/40 transition-colors flex items-center gap-2 shadow-sm rounded">
 <TagIcon size={16} /> Inserir Tag
 </button>
 )}
 <div className="w-px h-6 bg-gray-200 mx-1"></div>
 <button type="button" onClick={resetProjetoForm} className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center gap-2 shadow-sm rounded">
 Fechar <X size={16} />
 </button>
 </div>
 </div>

 {/* 4-tab form – same for all matrices */}
 <div className="flex flex-col">
 {/* Tab bar */}
 <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
 {([
 { icon: <FolderKanban size={14} />, label: 'Projeto' },
 { icon: <Building2 size={14} />, label: 'Faturamento' },
 { icon: <Truck size={14} />, label: 'Entrega / Cobrança' },
 { icon: <Banknote size={14} />, label: 'Fornecimento' },
 ] as { icon: React.ReactNode; label: string }[]).map((tab, i) => {
 const isDisabled = i > 0;
 return (
 <button 
 key={i} 
 type="button"
 disabled={isDisabled}
 onClick={() => !isDisabled && setActiveTab(i as 0 | 1 | 2 | 3)}
 className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors 
 ${activeTab === i 
 ? 'border-[#32423D] text-[#32423D] bg-white' 
 : isDisabled 
 ? 'border-transparent text-gray-300 cursor-not-allowed opacity-50' 
 : 'border-transparent text-gray-500 hover:text-gray-700'}`}
 title={isDisabled ? "Em breve" : ""}
 >
 {tab.icon}{tab.label}
 </button>
 );
 })}
 </div>
 <div className="p-6">
 {/* TAB 0 – PROJETO */}
 {activeTab === 0 && (
 <div className="space-y-6">
 {/* Section: Identificação */}
 <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-lg">
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4 flex items-center gap-2">
 <FolderKanban size={12} /> Identificação do Projeto
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
 
 <div className={isEditingProjeto ? "md:col-span-5" : "md:col-span-6"}>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Nome Projeto <span className="text-red-500">*</span></label>
 <input type="text" name="Projeto" value={projetoFormData.Projeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" required />
 </div>
 <div className="md:col-span-6">
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Descrição Projeto</label>
 <textarea name="DescProjeto" value={projetoFormData.DescProjeto || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded shadow-sm" />
 </div>
 </div>
 </div>

 {/* Section: Cliente & Responsáveis */}
 <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-lg">
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4 flex items-center gap-2">
 <Plus size={12} /> Cliente e Responsáveis
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="md:col-span-1">
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Cliente</label>
 <select name="ClienteProjeto" value={projetoFormData.ClienteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded shadow-sm">
 <option value="">Selecione...</option>
 {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">CNPJ</label>
 <input type="text" name="Cnpj" value={projetoFormData.Cnpj || ''} onChange={handleProjetoInputChange} placeholder="00.000.000/0000-00" className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" />
 </div>
 <div className="md:col-span-2">
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Responsável Técnico</label>
 <input type="text" name="Responsavel" value={projetoFormData.Responsavel || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" />
 </div>
 </div>
 </div>

 {/* Section: Cronograma */}
 <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-lg">
 <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-4 flex items-center gap-2">
 <Calendar size={12} /> Cronograma e Datas
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Entrada Pedido</label>
 <input type="date" name="DataEntradaPedido" value={projetoFormData.DataEntradaPedido || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" />
 </div>
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Planejado Financeiro</label>
 <input type="date" name="PlanejadoFinanceiro" value={projetoFormData.PlanejadoFinanceiro || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" />
 </div>
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Data Prev. Entrega</label>
 <input type="date" name="DataPrevisao" value={projetoFormData.DataPrevisao || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm" />
 </div>
 <div>
 <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1">Dias (Prazo)</label>
 <input type="text" name="PrazoEntrega" value={projetoFormData.PrazoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded shadow-sm font-semibold text-[#32423D]" />
 </div>
 </div>
 </div>
 </div>
 )}
 {/* TAB 1 – FATURAMENTO */}
 {activeTab === 1 && (
 <div className="space-y-4">
 {/* Cliente / Faturamento */}
 <div className="p-4 border border-gray-200 bg-gray-50/50">
 <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3 flex items-center gap-1"><Building2 size={12} />Dados do Cliente (Faturamento)</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
 <select name="ClienteProjeto" value={projetoFormData.ClienteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
 <option value="">Selecione...</option>
 {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Nome Fantasia</label>
 <input type="text" name="NomeFantasia" value={projetoFormData.NomeFantasia || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div></div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
 <input type="text" name="Cnpj" value={projetoFormData.Cnpj || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" placeholder="__.___.___/____-__" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">IE (Insc. Estadual)</label>
 <input type="text" name="InscEst" value={projetoFormData.InscEst || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
 <textarea name="EnderecoCliente" value={projetoFormData.EnderecoCliente || ''} onChange={handleProjetoInputChange} rows={3} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" placeholder="Endereço, Número, Bairro, Cidade, Estado, CEP, Telefone" />
 </div>
 </div>
 </div>
 {/* Contato Comercial */}
 <div className="p-4 border border-gray-200 bg-gray-50/50">
 <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Contato Comercial</h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="md:col-span-3">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
 <input type="text" name="ContatoComercial" value={projetoFormData.ContatoComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
 <input type="text" name="FoneContatoComercial" value={projetoFormData.FoneContatoComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
 <input type="text" name="EmailComercial" value={projetoFormData.EmailComercial || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 </div>
 </div>
 {/* Contato Técnico */}
 <div className="p-4 border border-gray-200 bg-gray-50/50">
 <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Contato Técnico</h4>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="md:col-span-3">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Nome</label>
 <input type="text" name="ContatoTecnico" value={projetoFormData.ContatoTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
 <input type="text" name="FoneContatoTecnico" value={projetoFormData.FoneContatoTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
 <input type="text" name="EmailTecnico" value={projetoFormData.EmailTecnico || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 </div>
 </div>
 </div>
 )}
 {/* TAB 2 – ENTREGA / COBRANÇA */}
 {activeTab === 2 && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="p-4 border border-gray-200 bg-gray-50/50 space-y-3">
 <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1"><Truck size={12} />Entrega</h4>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente Entrega</label>
 <select name="ClienteEntrega" value={projetoFormData.ClienteEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
 <option value="">Selecione...</option>
 {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
 <input type="text" name="CnpjEntrega" value={projetoFormData.CnpjEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Contato</label>
 <input type="text" name="ContatoEntrega" value={projetoFormData.ContatoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
 <input type="text" name="TelefoneEntrega" value={projetoFormData.TelefoneEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Hr/Entrega</label>
 <input type="text" name="HrEntrega" value={projetoFormData.HrEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
 <textarea name="EnderecoEntrega" value={projetoFormData.EnderecoEntrega || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
 </div>
 </div>
 <div className="p-4 border border-gray-200 bg-gray-50/50 space-y-3">
 <h4 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 flex items-center gap-1"><Banknote size={12} />Cobrança</h4>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente Cobrança</label>
 <select name="ClienteCobranca" value={projetoFormData.ClienteCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] appearance-none rounded-none">
 <option value="">Selecione...</option>
 {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">CNPJ</label>
 <input type="text" name="CnpjCobranca" value={projetoFormData.CnpjCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Contato</label>
 <input type="text" name="ContatoCobranca" value={projetoFormData.ContatoCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone</label>
 <input type="text" name="TelefoneCobranca" value={projetoFormData.TelefoneCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
 <input type="text" name="EmailCobranca" value={projetoFormData.EmailCobranca || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Endereço</label>
 <textarea name="EnderecoCobranca" value={projetoFormData.EnderecoCobranca || ''} onChange={handleProjetoInputChange} rows={2} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
 </div>
 </div>
 </div>
 )}
 {/* TAB 3 – FORNECIMENTO */}
 {activeTab === 3 && (
 <div className="space-y-4">
 {/* Row 1: Prazo + Forma de Pagto */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex items-center gap-3">
 <div className="w-32 shrink-0">
 <label className="block text-xs font-semibold text-gray-600 mb-1">Prazo Entrega</label>
 <input type="text" name="PrazoEntrega" value={projetoFormData.PrazoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 <span className="text-xs text-gray-500 mt-5">Dias</span>
 </div>
 <fieldset className="border border-gray-200 px-3 py-2">
 <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Forma de Pagto</legend>
 <div className="flex gap-5 mt-1">
 {['Antecipado', 'Parcelado'].map(v => (
 <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
 <input type="radio" name="Pagamento" value={v} checked={(projetoFormData.Pagamento || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
 </label>
 ))}

 </div>
 </fieldset>
 </div>
 {/* Observação */}
 <div>
 <label className="block text-xs font-semibold text-gray-600 mb-1">Observação</label>
 <textarea name="ObservacaoFornec" value={projetoFormData.ObservacaoFornec || ''} onChange={handleProjetoInputChange} rows={3} className="w-full px-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] resize-none rounded-none" />
 </div>
 {/* Payment values grid + Valor Total */}
 <div className="flex gap-4 items-start">
 <div className="flex-1 grid grid-cols-2 gap-2">
 {[
 ['Transferencia', 'Transferência'],
 ['Pix', 'Pix'],
 ['Cartao', 'C.Crédito'],
 ['Empenho', 'Empenho'],
 ['Boleto', 'Boleto'],
 ['Dinheiro', 'Dinheiro'],
 ].map(([n, l]) => (
 <div key={n} className="flex items-center gap-2">
 <label className="w-24 text-xs font-semibold text-gray-600 shrink-0">{l}</label>
 <input type="text" name={n} value={(projetoFormData[n as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1.5 border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
 </div>
 ))}
 </div>
 <div className="w-40 shrink-0">
 <label className="block text-xs font-bold text-gray-700 mb-1">Valor Total (R$)</label>
 <input type="text" readOnly value={calcPaymentTotal()} className="w-full px-3 py-2 border border-[#32423D] bg-[#E0E800]/20 text-sm font-bold focus:outline-none rounded-none text-right cursor-default" />
 </div>

 </div>
 {/* Frete + Turno da Entrega + Embalagem */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <fieldset className="border border-gray-200 px-3 py-2">
 <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Frete</legend>
 <div className="flex gap-4 mt-1">
 {['Empresa', 'Cliente'].map(v => (
 <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
 <input type="radio" name="Frete" value={v} checked={(projetoFormData.Frete || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
 </label>
 ))}
 </div>
 </fieldset>
 <fieldset className="border border-gray-200 px-3 py-2">
 <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Turno da Entrega</legend>
 <div className="flex gap-3 mt-1 flex-wrap">
 {[['HrComercial', 'Comercial'], ['HrNoturno', 'Noturno'], ['HrCombinar', 'Combinar']].map(([n, l]) => (
 <label key={n} className="flex items-center gap-1.5 text-sm cursor-pointer">
 <input type="checkbox" checked={!!projetoFormData[n as keyof Projeto] && String(projetoFormData[n as keyof Projeto]).trim() !== ''} onChange={e => setProjetoFormData(prev => ({ ...prev, [n]: e.target.checked ? 'S' : '' }))} className="accent-[#32423D]" />{l}
 </label>
 ))}
 </div>
 </fieldset>
 <fieldset className="border border-gray-200 px-3 py-2">
 <legend className="text-[10px] uppercase font-bold text-gray-500 px-1">Embalagem</legend>
 <div className="flex gap-4 mt-1">
 {['Inclusa', 'Não Inclusa'].map(v => (
 <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
 <input type="radio" name="Embalagem" value={v} checked={(projetoFormData.Embalagem || '').trim().toLowerCase() === v.toLowerCase()} onChange={handleProjetoInputChange} className="accent-[#32423D]" />{v}
 </label>
 ))}
 </div>
 </fieldset>
 </div>
 {/* PRODUTO / EMPRESA / VALOR table */}
 <div className="border border-gray-200">
 <div className="grid grid-cols-3 bg-[#32423D] text-white text-[10px] uppercase font-bold tracking-wider">
 <div className="px-3 py-2">Produto</div>
 <div className="px-3 py-2">Empresa</div>
 <div className="px-3 py-2">Valor (R$)</div>
 </div>
 {[
 ['FabricacaoEmpresa', 'ValorFabricacao', 'Fabricação'],
 ['RevendaEmpresa', 'ValorRevenda', 'Revenda'],
 ['FreteEmpresa', 'ValorFrete', 'Frete'],
 ['InstalacaoEmpresa', 'ValorInstalacao', 'Instalação'],
 ['EmbalagemEmpresa', 'ValorEmbalagem', 'Embalagem'],
 ].map(([ne, nv, l], idx) => (
 <div key={ne} className={`grid grid-cols-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
 <div className="px-3 py-1.5 text-sm font-semibold text-gray-700 border-r border-b border-gray-200">{l}</div>
 <div className="px-2 py-1 border-r border-b border-gray-200">
 <input type="text" name={ne} value={(projetoFormData[ne as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 text-sm focus:outline-none focus:border-[#32423D] border border-transparent focus:border rounded-none" />
 </div>
 <div className="px-2 py-1 border-b border-gray-200">
 <input type="text" name={nv} value={(projetoFormData[nv as keyof Projeto] as string) || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 text-sm focus:outline-none focus:border-[#32423D] border border-transparent focus:border rounded-none" />
 </div>
 </div>
 ))}
 <div className="grid grid-cols-3 bg-[#32423D]/10 border-t border-gray-200">
 <div className="px-3 py-2 text-xs font-bold text-gray-700 md:col-span-2 col-span-2">Total</div>
 <div className="px-2 py-1">
 <input type="text" name="TotalFinal" value={projetoFormData.TotalFinal || ''} onChange={handleProjetoInputChange} className="w-full px-2 py-1 font-bold text-sm text-right focus:outline-none border border-transparent focus:border-[#32423D] focus:border rounded-none" />
 </div>
 </div>
 </div>
 </div>
 )}





 </div>{/* closes <div className="p-6"> */}
 </div>{/* closes <div className="flex flex-col"> */}
 </form>

 </motion.div>
 </motion.div >
 )
 }
 </AnimatePresence >

 {/* Tag Form Modal */}
 <AnimatePresence>
 {
 showTagForm && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto"
 onClick={(e) => e.target === e.currentTarget && resetTagForm()}
 >
 <motion.div
 initial={{ opacity: 0, y: -20, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -20, scale: 0.95 }}
 className="bg-white rounded-md shadow-xl w-full max-w-2xl my-8"
 >
 <div className="flex items-center justify-between p-5 border-b border-gray-100">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-[#32423D] text-white flex items-center justify-center">
 <TagIcon size={20} />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-[#32423D]">
 {isEditingTag ? 'Editar Tag' : 'Nova Tag'}
 </h2>
 <p className="text-xs text-gray-500">Projeto: {selectedProjetoForTag?.Projeto}</p>
 </div>
 </div>
 <button onClick={resetTagForm} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
 <X size={20} />
 </button>
 </div>

 <form onSubmit={handleTagSubmit} className="p-5 space-y-4">
 
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">Descrição Tag <span className="text-red-500">*</span></label>
 <input type="text" name="Tag" value={tagFormData.Tag || ''} onChange={handleTagInputChange} className={inputRequired} required />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Data Prev. Entrega</label>
 <input
 type="date"
 name="DataPrevisao"
 value={(() => {
 const v = tagFormData.DataPrevisao || '';
 const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
 })()}
 onChange={e => {
 const [y, m, d] = (e.target.value || '').split('-');
 const br = y && m && d ? `${d}/${m}/${y}` : '';
 setTagFormData(prev => ({ ...prev, DataPrevisao: br }));
 }}
 className={inputOptional}
 />
 {(() => {
 const v = tagFormData.DataPrevisao || '';
 const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if (!match) return null;
 const target = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
 const today = new Date(); today.setHours(0, 0, 0, 0);
 let count = 0;
 const cur = new Date(today);
 if (target <= today) {
 return (
 <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
 ⚠ Prazo vencido
 </span>
 );
 }
 while (cur < target) {
 cur.setDate(cur.getDate() + 1);
 const dow = cur.getDay();
 if (dow !== 0 && dow !== 6) count++;
 }
 const color = count >= 5
 ? 'bg-green-100 text-green-700'
 : count >= 1
 ? 'bg-yellow-100 text-yellow-700'
 : 'bg-red-100 text-red-700';
 return (
 <span className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${color}`}>
 📅 {count} dia{count !== 1 ? 's' : ''} útil{count !== 1 ? 'eis' : ''} restante{count !== 1 ? 's' : ''}
 </span>
 );
 })()}
 </div>

 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Tipo Produto</label>
 <select name="TipoProduto" value={tagFormData.TipoProduto || ''} onChange={handleTagInputChange} className={selectClass}>
 <option value="">Selecione...</option>
 {tipoProdutoOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
 </select>
 </div>
 <div className="grid grid-cols-4 gap-3">
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade</label>
 <input type="text" name="QtdeTag" value={tagFormData.QtdeTag || ''} onChange={handleTagInputChange} className={inputOptional} />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Qt. Liberada</label>
 <input type="text" name="QtdeLiberada" value={tagFormData.QtdeLiberada || ''} onChange={handleTagInputChange} className={inputOptional} />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Saldo</label>
 <input type="text" name="SaldoTag" value={tagFormData.SaldoTag || ''} onChange={handleTagInputChange} className={inputOptional} />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Medida</label>
 <select name="UnidadeProduto" value={tagFormData.UnidadeProduto || ''} onChange={handleTagInputChange} className={selectClass}>
 <option value="">-</option>
 {medidaOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.id}</option>)}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
 <textarea name="DescTag" value={tagFormData.DescTag || ''} onChange={handleTagInputChange} rows={3} className={inputOptional} />
 </div>
 <div className="pt-2 flex justify-end w-full">
<motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#32423D] text-white font-medium disabled:opacity-50" disabled={saving}>
 {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 {isEditingTag ? 'Atualizar' : 'Salvar'}
 </motion.button>
</div>
 </form>
 </motion.div>
 </motion.div>
 )
 }
 </AnimatePresence >
 </div >
 );
}
