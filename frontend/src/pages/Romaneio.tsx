import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Save, Loader2, Truck, ArrowLeft, FileText,
    FolderOpen, Trash2, Plus, Calendar, Building2, Search, X,
    CheckCircle, XCircle, FileCheck, FileX, RefreshCw, FileSpreadsheet,
    List, PlusSquare, Box, AlertTriangle, MessageSquare, Printer, Copy, Edit3
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatToBRDate } from '../utils/dateUtils';
import PendenciaRomaneioPage from './PendenciaRomaneio';

interface RomaneioPageProps {
    onNavigate: (pageId: string) => void;
    onSetRncItem?: (id: number | null) => void;
}

const API_BASE = '/api';

interface PessoaJuridica {
    IdPessoa: number;
    Cnpj: string;
    RazaoSocial: string;
    Endereco: string;
    Numero: string;
    Bairro: string;
    Complemento: string;
    Cidade: string;
    Estado: string;
    Cep: string;
    Email: string;
}

interface Romaneio {
    idRomaneio: number;
    Descricao: string;
    EnviadoPara: string;
    DATACRIACAO: string;
    CriadoPor: string;
    ENDERECORomaneio: string;
    DataEnvio?: string;
    Estatus?: string;
    Liberado?: string;
    NomeMotorista?: string;

    // Legacy mapping from SavedRomaneio
    id?: number;
    email?: string;
    cidade?: string;
    estado?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    complemento?: string;
    cep?: string;
}

const initialForm = {
    descricao: '',
    enviarPara: '',
    endereco: '',
    numero: '',
    bairro: '',
    complemento: '',
    cidade: '',
    estado: '',
    cep: '',
    email: ''
};

export default function RomaneioPage({ onNavigate, onSetRncItem }: RomaneioPageProps) {
    const { showAlert } = useAlert();
    const [view, setView] = useState<'list' | 'create' | 'edit' | 'report'>('list');
    const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
    const [reportData, setReportData] = useState<Romaneio | null>(null);
    const [reportItems, setReportItems] = useState<any[]>([]);
    const [companies, setCompanies] = useState<PessoaJuridica[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchId, setSearchId] = useState('');
    const [searchCliente, setSearchCliente] = useState('');
    const [searchDescricao, setSearchDescricao] = useState('');
    const [fromGlobal, setFromGlobal] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const romaneioOpen = params.get('romaneio');
        if (romaneioOpen) {
            setSearchId(romaneioOpen);
        }
        const openFrom = params.get('from');
        if (openFrom === 'visao-geral-pendencias') {
            setFromGlobal(true);
        }
    }, []);

    // Selection State for Actions
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Shipment Registration State
    const [showShipmentModal, setShowShipmentModal] = useState(false);
    const [shipmentData, setShipmentData] = useState({
        motorista: '',
        cnh: '',
        categoria: '',
        telefone: '',
        tipoTransporte: ''
    });

    // Motoristas list for combobox
    const [motoristas, setMotoristas] = useState<any[]>([]);

    const fetchMotoristas = async () => {
        try {
            const res = await fetch(`${API_BASE}/motoristas`);
            const json = await res.json();
            if (json.success) setMotoristas(json.data);
        } catch (err) {
            console.error('Error fetching motoristas:', err);
        }
    };

    // Tipos de Transporte list for combobox
    const [tiposTransporte, setTiposTransporte] = useState<any[]>([]);
    const [showTipoModal, setShowTipoModal] = useState(false);
    const [tipoForm, setTipoForm] = useState({ TipoVeiculo: '', Placa: '' });
    const [tipoEditId, setTipoEditId] = useState<number | null>(null);
    const [tipoSaving, setTipoSaving] = useState(false);

    const fetchTiposTransporte = async () => {
        try {
            const res = await fetch(`${API_BASE}/tipotransporte`);
            const json = await res.json();
            if (json.success) setTiposTransporte(json.data);
        } catch (err) {
            console.error('Error fetching tipotransporte:', err);
        }
    };

    const saveTipoTransporte = async () => {
        if (!tipoForm.TipoVeiculo.trim()) {
            showAlert('Informe o Tipo de Veículo.', 'warning');
            return;
        }
        setTipoSaving(true);
        try {
            const url = tipoEditId
                ? `${API_BASE}/tipotransporte/${tipoEditId}`
                : `${API_BASE}/tipotransporte`;
            const method = tipoEditId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tipoForm)
            });
            const json = await res.json();
            if (json.success) {
                setTipoForm({ TipoVeiculo: '', Placa: '' });
                setTipoEditId(null);
                fetchTiposTransporte();
            } else {
                showAlert(json.message || 'Erro ao salvar.', 'error');
            }
        } catch {
            showAlert('Erro de conexão.', 'error');
        } finally {
            setTipoSaving(false);
        }
    };

    const deleteTipoTransporte = async (id: number) => {
        if (!confirm('Confirma exclusão deste tipo de transporte?')) return;
        try {
            const res = await fetch(`${API_BASE}/tipotransporte/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchTiposTransporte();
                if (shipmentData.tipoTransporte === String(id)) {
                    setShipmentData(prev => ({ ...prev, tipoTransporte: '' }));
                }
            } else {
                showAlert(json.message || 'Erro ao excluir.', 'error');
            }
        } catch {
            showAlert('Erro de conexão.', 'error');
        }
    };

    // Items Management State
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [availableItems, setAvailableItems] = useState<any[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [itemFilters, setItemFilters] = useState({
        projeto: '',
        tag: '',
        resumo: '',
        detalhe: '',
        codFabricante: '',
        mostrarEnviados: false,
        mostrarFinalizados: false
    });
    const [itemInclusion, setItemInclusion] = useState<{ idx: number, qty: string } | null>(null);

    // Inserted Items State
    const [showInsertedModal, setShowInsertedModal] = useState(false);
    const [insertedItems, setInsertedItems] = useState<any[]>([]);
    const [loadingInserted, setLoadingInserted] = useState(false);
    const [insertedFilters, setInsertedFilters] = useState({
        projeto: '',
        tag: '',
        resumo: '',
        detalhe: '',
        codFabricante: ''
    });
    const [selectedInsertedId, setSelectedInsertedId] = useState<number | null>(null);
    // Sub-view dentro do modal de itens inseridos
    const [insertedView, setInsertedView] = useState<'list' | 'rnc'>('list');
    // Observação inline
    const [obsOpenId, setObsOpenId] = useState<number | null>(null);
    const [obsText, setObsText] = useState('');
    const [obsSaving, setObsSaving] = useState(false);
    const [alterarQtdeId, setAlterarQtdeId] = useState<number | null>(null);
    const [alterarQtdeVal, setAlterarQtdeVal] = useState('');

    const insertedActions = [
        { id: 'pdf', label: 'Abrir desenho PDF', icon: FileText, color: 'text-[#32423D]', bg: 'bg-[#E0E800]/20', hover: 'hover:bg-[#E0E800]/20' },
        { id: '3d', label: 'Abrir desenho 3D', icon: Box, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
        { id: 'excluir', label: 'Excluir item', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
        { id: 'rnc', label: 'Gerar RNC - Pendência', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
        { id: 'obs', label: 'Gerar Observação', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50', hover: 'hover:bg-slate-100' },
        { id: 'alterar_qtde', label: 'Desfazer Qtde Envio', icon: Edit3, color: 'text-violet-600', bg: 'bg-violet-50', hover: 'hover:bg-violet-100' },
    ];

    const saveObservacao = async (idRomaneioItem: number, text: string) => {
        if (obsSaving) return;
        if (!text.trim()) return; // ignorar se nada foi digitado
        setObsSaving(true);
        try {
            const res = await fetch(`${API_BASE}/romaneio/item/${idRomaneioItem}/observacao`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observacao: text })
            });
            const data = await res.json();
            if (data.success) showAlert('Observação salva!', 'success');
            else showAlert(data.message || 'Erro ao salvar observação.', 'error');
        } catch {
            showAlert('Erro de conexão ao salvar observação.', 'error');
        } finally {
            setObsSaving(false);
        }
    };

    const handleIncludeItem = async (item: any, qty: string) => {
        if (!selectedId) return;
        const q = parseFloat(qty);
        if (isNaN(q) || q <= 0) {
            showAlert("Digite uma quantidade válida.", "error");
            return;
        }

        const saldo = (item.QtdeTotal || 0) - (item.RomaneioTotalEnviado || 0);
        if (q > saldo) {
            showAlert(`Quantidade (${q}) não pode ser maior que o saldo disponível (${saldo}).`, "error");
            return;
        }

        try {
            // Verifica se o item já existe no romaneio — se sim, soma a quantidade
            const resCheck = await fetch(`${API_BASE}/romaneio/${selectedId}/inserted-items`);
            const jsonCheck = await resCheck.json();
            const jaInserido = jsonCheck.success
                ? (jsonCheck.data || []).find((r: any) => r.IdOrdemServicoItem === item.IdOrdemServicoItem)
                : null;

            if (jaInserido) {
                // Atualiza somando a quantidade
                const novaQtde = (parseFloat(jaInserido.QtdeRomaneio) || 0) + q;
                const resUpd = await fetch(`${API_BASE}/romaneio/${selectedId}/items/${jaInserido.idRomaneioItem}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qtde: novaQtde, usuario: 'Edson' })
                });
                const jsonUpd = await resUpd.json();
                if (jsonUpd.success) {
                    showAlert(`Quantidade somada: ${novaQtde} no romaneio.`, 'success');
                    setItemInclusion(null);
                    fetchAvailableItems();
                } else {
                    showAlert("Erro ao atualizar quantidade: " + jsonUpd.message, "error");
                }
            } else {
                // Insere novo registro
                const res = await fetch(`${API_BASE}/romaneio/${selectedId}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        IdOrdemServicoItem: item.IdOrdemServicoItem,
                        qtde: q,
                        usuario: 'Edson'
                    })
                });
                const json = await res.json();
                if (json.success) {
                    setItemInclusion(null);
                    fetchAvailableItems();
                } else {
                    showAlert("Erro ao incluir item: " + json.message, "error");
                }
            }
        } catch (error) {
            console.error("Error including item:", error);
            showAlert("Erro de conexão ao incluir item.", "error");
        }
    };

    const fetchAvailableItems = async () => {
        setLoadingItems(true);
        try {
            const params = new URLSearchParams(itemFilters as any);
            const res = await fetch(`${API_BASE}/romaneio/v-itens-projeto-aberto?${params}`);
            const json = await res.json();
            if (json.success) {
                setAvailableItems(json.data);
            } else {
                showAlert("Erro ao buscar itens: " + json.message, "error");
            }
        } catch (error) {
            console.error("Error fetching items:", error);
            showAlert("Erro de conexão ao buscar itens.", "error");
        } finally {
            setLoadingItems(false);
        }
    };

    const fetchInsertedItems = async () => {
        if (!selectedId) return;
        setLoadingInserted(true);
        try {
            const params = new URLSearchParams(insertedFilters as any);
            const res = await fetch(`${API_BASE}/romaneio/${selectedId}/inserted-items?${params}`);
            const json = await res.json();
            if (json.success) {
                setInsertedItems(json.data);
            } else {
                showAlert("Erro ao buscar itens inseridos: " + json.message, "error");
            }
        } catch (error) {
            console.error("Error fetching inserted items:", error);
            showAlert("Erro de conexão ao buscar itens inseridos.", "error");
        } finally {
            setLoadingInserted(false);
        }
    };

    const handleShipmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            // Aplica máscara (XX) XXXXX-XXXX
            const digits = value.replace(/\D/g, '').slice(0, 11);
            let formatted = '';
            if (digits.length === 0) {
                formatted = '';
            } else if (digits.length <= 2) {
                formatted = `(${digits}`;
            } else if (digits.length <= 7) {
                formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
            } else {
                formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
            }
            setShipmentData(prev => ({ ...prev, telefone: formatted }));
        } else {
            setShipmentData(prev => ({ ...prev, [name]: value.toUpperCase() }));
        }
    };

    const submitShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;

        if (!shipmentData.motorista || !shipmentData.tipoTransporte || !shipmentData.cnh || !shipmentData.categoria || !shipmentData.telefone) {
            showAlert("Preencha TODOS os campos obrigatórios: Motorista, CNH, Categoria, Telefone e Tipo Transporte.", "warning");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/romaneio/${selectedId}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'registrar',
                    usuario: 'Sistema',
                    dadosEnvio: shipmentData
                })
            });
            const json = await res.json();

            if (json.success) {
                setSuccessMsg("Registro efetuado com sucesso!");
                setShowShipmentModal(false);
                setShipmentData({ motorista: '', cnh: '', categoria: '', telefone: '', tipoTransporte: '' }); // Reset
                setSelectedId(null); // Force re-selection as requested
                setTimeout(() => setSuccessMsg(null), 3000);
                fetchRomaneios();
            } else {
                showAlert(`Erro: ${json.message}`, "error");
            }
        } catch (error) {
            console.error("Action error:", error);
            showAlert("Erro de conexão ao realizar ação.", "error");
        }
    };

    useEffect(() => {
        if (view === 'list') {
            fetchRomaneios();
        } else {
            fetchCompanies();
        }
        document.title = "Romaneio - SincoWeb";
    }, [view]);

    const fetchRomaneios = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/romaneio`);
            const json = await res.json();
            if (json.success) {
                console.log("[DEBUG] Romaneios fetched:", json.data);
                setRomaneios(json.data);
            }
        } catch (err) {
            console.error("Error fetching romaneios", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await fetch(`${API_BASE}/pj`);
            const json = await res.json();
            if (json.success) {
                setCompanies(json.data);
            }
        } catch (err) {
            console.error("Error fetching companies", err);
        }
    };

    const handleOpenFolder = async (id: number, path: string) => {
        if (!path) {
            showAlert('Este romaneio não possui caminho definido.', "warning");
            return;
        }
        try {
            await fetch('/api/romaneio/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
        } catch (error) {
            showAlert('Erro de conexão com o servidor.', "error");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este romaneio?")) return;

        try {
            const res = await fetch(`${API_BASE}/romaneio/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMsg("Romaneio excluído com sucesso!");
                fetchRomaneios();
                setSelectedId(null);
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                showAlert("Erro ao excluir: " + json.message, "error");
            }
        } catch (err) {
            console.error("Error deleting romaneio", err);
        }
    };

    // --- ACTION HANDLERS ---
    const handleAction = async (actionName: string, actionId: string) => {
        if (!selectedId) {
            showAlert(`Selecione um romaneio na lista para realizar a ação: ${actionName}`, "warning");
            return;
        }

        // ── Validações por estado ─────────────────────────────────────────────
        const _gv = (obj: any, key: string) => {
            if (!obj) return '';
            const fk = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
            return fk ? String((obj as any)[fk] || '').trim().toUpperCase() : '';
        };
        const _rom = romaneios.find(r => Number(r.idRomaneio) === Number(selectedId));
        if (_rom) {
            const _estatus  = _gv(_rom, 'Estatus');
            const _liberado = _gv(_rom, 'Liberado');
            const _enviado  = !!(_rom.NomeMotorista || _rom.DataEnvio);
            const _registrado = _enviado && _liberado !== 'S' && _estatus !== 'F';

            if (actionId === 'registrar' && (_registrado || _liberado === 'S' || _estatus === 'F')) {
                const st = _estatus === 'F' ? 'FINALIZADO' : _liberado === 'S' ? 'LIBERADO' : 'REGISTRADO';
                showAlert(`Romaneio #${selectedId} já está ${st}. Cancele o estado atual primeiro.`, "warning");
                return;
            }
            if (actionId === 'cancelar_registro' && !_registrado) {
                const st = _estatus === 'F' ? 'FINALIZADO' : _liberado === 'S' ? 'LIBERADO' : 'NOVO';
                showAlert(`Romaneio #${selectedId} está ${st} e não possui registro para cancelar.`, "warning");
                return;
            }
            if (actionId === 'liberar' && (_liberado === 'S' || _estatus === 'F')) {
                showAlert(`Romaneio #${selectedId} já está ${_estatus === 'F' ? 'FINALIZADO' : 'LIBERADO'}.`, "warning");
                return;
            }
            if (actionId === 'cancelar_lib' && _liberado !== 'S') {
                const st = _estatus === 'F' ? 'FINALIZADO' : _registrado ? 'REGISTRADO' : 'NOVO';
                showAlert(`Romaneio #${selectedId} não está Liberado (estado: ${st}). Não há liberação a cancelar.`, "warning");
                return;
            }
            if (actionId === 'finalizar' && (_liberado === 'S' || _estatus === 'F')) {
                const st = _estatus === 'F' ? 'FINALIZADO' : 'LIBERADO';
                showAlert(`Romaneio #${selectedId} está ${st}. Para finalizar, cancele a liberação primeiro.`, "warning");
                return;
            }
            if (actionId === 'cancelar_fin' && _estatus !== 'F') {
                showAlert(`Romaneio #${selectedId} não está Finalizado. Ação não aplicável.`, "warning");
                return;
            }
            if (actionId === 'exibir_itens' && (_liberado === 'S' || _estatus === 'F')) {
                showAlert(`Romaneio #${selectedId} está ${_estatus === 'F' ? 'FINALIZADO' : 'LIBERADO'}. "Lista de Peças" não disponível neste estado.`, "warning");
                return;
            }
            if (actionId === 'itens_inseridos' && (_liberado === 'S' || _estatus === 'F')) {
                showAlert(`Romaneio #${selectedId} está ${_estatus === 'F' ? 'FINALIZADO' : 'LIBERADO'}. Manutenção de itens não permitida neste estado.`, "warning");
                return;
            }
        }

        // Modais de itens: abre diretamente sem confirmação
        if (actionId === 'exibir_itens') {
            fetchAvailableItems();
            setShowItemsModal(true);
            return;
        }

        if (actionId === 'itens_inseridos') {
            fetchInsertedItems();
            setShowInsertedModal(true);
            return;
        }

        // Ações que não precisam de confirmação: registrar, liberar
        // cancelar_lib, cancelar_registro e demais confirmam
        if (actionId !== 'registrar' && actionId !== 'liberar') {
            let finalConfirmMsg = `Confirma a ação "${actionName}" para o Romaneio #${selectedId}?`;
            if (actionId === 'cancelar_lib') {
                finalConfirmMsg = `Atenção: Você está prestes a cancelar a liberação do Romaneio - ${selectedId}. Isso removerá os documentos gerados e retornará o status para Registrado. Deseja proceder com esta atualização?`;
            }
            if (actionId === 'cancelar_registro') {
                finalConfirmMsg = `Atenção: Isso irá DESFAZER o registro do Romaneio #${selectedId}, limpando motorista, veículo, datas e cancelando também a liberação. O romaneio voltara ao status NOVO. Confirma?`;
            }
            if (!confirm(finalConfirmMsg)) return;
        }


        if (actionId === 'abrir_pasta') {
            try {
                const res = await fetch(`${API_BASE}/romaneio/open-folder/${selectedId}`, { method: 'POST' });
                const json = await res.json();
                if (json.success) {
                    showAlert(json.message, "success");
                } else {
                    showAlert(`Erro: ${json.message}`, "error");
                    // Fallback to local path display if possible
                    const romaneio = romaneios.find(r => r.idRomaneio === selectedId);
                    if (romaneio?.ENDERECORomaneio) {
                        prompt("Não foi possível abrir automaticamente. Caminho para cópia:", romaneio.ENDERECORomaneio);
                    }
                }
            } catch (error) {
                showAlert("Erro ao tentar abrir pasta no servidor.", "error");
            }
            return;
        }

        if (actionId === 'report') {
            await fetchReportData(selectedId);
            return;
        }

        if (actionId === 'registrar') {
            const romaneio = romaneios.find(r => Number(r.idRomaneio) === Number(selectedId));
            if (!romaneio) {
                showAlert(`Erro: Não foi possível localizar os dados do Romaneio #${selectedId}.`, "error");
                return;
            }

            const r = romaneio as any;
            const motorista = String(r.NomeMotorista || r.nomemotorista || '').trim();
            const dataEnvio = String(r.DataEnvio || r.dataenvio || '').trim();

            if (motorista !== '' || dataEnvio !== '') {
                showAlert(`O Romaneio #${selectedId} já possui registro de envio e não pode ser alterado.`, "error");
                return;
            }

            fetchMotoristas(); // carrega lista antes de abrir
            fetchTiposTransporte(); // carrega tipos de transporte
            setShowShipmentModal(true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/romaneio/${selectedId}/action`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionId, usuario: 'Sistema' }) // Replace 'Sistema' with actual user if available
            });
            const json = await res.json();

            if (json.success) {
                setSuccessMsg(json.message);

                // --- NEW: Go to Report View immediately after Liberation ---
                if (actionId === 'liberar' && json.excel?.success) {
                    // Start download in background
                    window.open(`${API_BASE}/romaneio/download-excel/${selectedId}`, '_blank');
                    // Show report on screen
                    await fetchReportData(selectedId);
                } else {
                    setTimeout(() => setSuccessMsg(null), 3000);
                    setSelectedId(null); // Force re-selection
                    fetchRomaneios(); // Refresh list
                }
            } else {
                showAlert(`Erro: ${json.message}`, "error");
            }
        } catch (error) {
            console.error("Action error:", error);
            showAlert("Erro de conexão ao realizar ação.", "error");
        }
    };

    const fetchReportData = async (id: number) => {
        setLoading(true);
        try {
            // 1. Fetch Header
            const resRom = await fetch(`${API_BASE}/romaneio/${id}`);
            const jsonRom = await resRom.json();

            // 2. Fetch Items
            const resItems = await fetch(`${API_BASE}/romaneio/${id}/inserted-items`);
            const jsonItems = await resItems.json();

            if (jsonRom.success && jsonItems.success) {
                setReportData(jsonRom.data);
                setReportItems(jsonItems.data);
                setView('report');
            } else {
                showAlert("Erro ao carregar dados do relatório.", "error");
            }
        } catch (error) {
            showAlert("Erro de conexão ao buscar dados do relatório.", "error");
        } finally {
            setLoading(false);
        }
    };

    const actions = [
        { id: 'registrar', label: 'Registrar', icon: FileText, color: 'text-[#32423D]', bg: 'bg-[#E0E800]/20', hover: 'hover:bg-[#E0E800]/20' },
        { id: 'cancelar_registro', label: 'Cancelar Reg.', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', hover: 'hover:bg-rose-100' },
        { id: 'liberar', label: 'Liberar', icon: FileCheck, color: 'text-green-600', bg: 'bg-green-50', hover: 'hover:bg-green-100' },
        { id: 'cancelar_lib', label: 'Cancelar Lib.', icon: FileX, color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
        { id: 'atualizar', label: 'Atualizar Docs', icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
        { id: 'excel', label: 'Gerar Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
        { id: 'finalizar', label: 'Finalizar', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100' },
        { id: 'cancelar_fin', label: 'Cancelar Fin.', icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
        { id: 'exibir_itens', label: 'Lista de Peças e Desenhos', icon: List, color: 'text-slate-600', bg: 'bg-slate-50', hover: 'hover:bg-slate-100' },
        { id: 'itens_inseridos', label: 'Manutenção de Itens no Romaneio', icon: FileCheck, color: 'text-cyan-600', bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100' },
        { id: 'report', label: 'Ver Relatório', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', hover: 'hover:bg-purple-100' },
    ];

    // --- FORM HANDLERS ---

    const handleCreateNew = () => {
        setFormData(initialForm);
        setEditingId(null);
        setView('create');
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = parseInt(e.target.value);
        const company = companies.find(c => c.IdPessoa === selectedId);

        if (company) {
            setFormData(prev => ({
                ...prev,
                enviarPara: company.RazaoSocial,
                endereco: company.Endereco || '',
                numero: company.Numero || '',
                bairro: company.Bairro || '',
                complemento: company.Complemento || '',
                cidade: company.Cidade || '',
                estado: company.Estado || '',
                cep: company.Cep || '',
                email: company.Email || ''
            }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let url = `${API_BASE}/romaneio`;
            let method = 'POST';

            if (editingId) {
                url = `${API_BASE}/romaneio/${editingId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, usuario: 'Sistema' })
            });

            const json = await res.json();

            if (json.success) {
                setSuccessMsg(editingId ? "Romaneio atualizado!" : "Romaneio criado!");
                setTimeout(() => setSuccessMsg(null), 3000);
                setView('list');
                fetchRomaneios(); // Refresh list to show new item
            } else {
                showAlert("Erro ao salvar: " + json.message, "error");
            }
        } catch (error) {
            showAlert("Erro de conexão ao salvar.", "error");
        } finally {
            setSaving(false);
        }
    };

    const filteredRomaneios = (romaneios || []).filter(r =>
        r &&
        (!searchId || r.idRomaneio?.toString().includes(searchId)) &&
        (!searchCliente || (r.EnviadoPara && r.EnviadoPara.toLowerCase().includes(searchCliente.toLowerCase()))) &&
        (!searchDescricao || (r.Descricao && r.Descricao.toLowerCase().includes(searchDescricao.toLowerCase())))
    );

    const handleRowClick = (id: number) => {
        setSelectedId(id === selectedId ? null : id);
    };

    // --- ACCESS CONTROL FOR INLINE ACTIONS ---
    // Returns { disabled: boolean, reason: string } for each action given a romaneio record
    const getActionDisabledInfo = (actionId: string, romaneio: Romaneio): { disabled: boolean; reason: string } => {
        const getVal = (obj: any, key: string) => {
            if (!obj) return '';
            const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
            return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
        };
        const estatus  = getVal(romaneio, 'Estatus');   // 'F' = Finalizado
        const liberado = getVal(romaneio, 'Liberado');  // 'S' = Liberado
        const enviado  = !!(romaneio.NomeMotorista || romaneio.DataEnvio); // Registrado
        const registrado = enviado && liberado !== 'S' && estatus !== 'F';

        // Regra global — cancelar_lib: somente quando Liberado
        if (actionId === 'cancelar_lib' && liberado !== 'S') {
            return { disabled: true, reason: 'Dispon\u00edvel somente quando o romaneio estiver Liberado.' };
        }

        // Regra global — cancelar_fin: somente quando Finalizado
        if (actionId === 'cancelar_fin' && estatus !== 'F') {
            return { disabled: true, reason: 'Dispon\u00edvel somente quando o romaneio estiver Finalizado.' };
        }

        // Regra global — cancelar_registro: somente quando Registrado (tem motorista, n\u00e3o liberado, n\u00e3o finalizado)
        if (actionId === 'cancelar_registro' && !registrado) {
            return { disabled: true, reason: 'Dispon\u00edvel somente quando o romaneio estiver Registrado.' };
        }

        // Finalizado: bloqueia tudo (cancelar_fin, abrir_pasta e report j\u00e1 tratados acima)
        if (estatus === 'F') {
            if (actionId === 'abrir_pasta' || actionId === 'report') {
                return { disabled: false, reason: '' };
            }
            return { disabled: true, reason: 'Romaneio finalizado \u2014 a\u00e7\u00e3o bloqueada.' };
        }

        // Todos os outros estados e a\u00e7\u00f5es: habilitado
        return { disabled: false, reason: '' };
    };


    if (view === 'list') {
        return (
        <div className="flex-1 flex flex-col min-h-0" style={{gap:'6px'}}>
                {/* Header compacto */}
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                    {fromGlobal && (
                        <button
                            onClick={() => window.location.href = '/visao-geral-pendencias'}
                            className="flex items-center justify-center p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            title="Voltar para Todas as Pendências"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <p className="text-gray-400 text-xs flex-1">
                        {selectedId
                            ? <span className="text-[#32423D] font-semibold">Romaneio #{selectedId} selecionado — clique nas ações abaixo da linha</span>
                            : 'Clique em uma linha para selecionar e exibir as ações disponíveis.'}
                    </p>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#32423D] text-white text-xs font-semibold hover:bg-[#2a3632] transition-colors shrink-0"
                    >
                        <Plus size={14} />
                        Criar Novo
                    </button>
                </div>

                {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={18} /> {successMsg}
                    </motion.div>
                )}

                {/* List */}
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-3">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-2 items-center">
                        {/* Campo ID */}
                        <div className="relative min-w-[100px] max-w-[120px]">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold uppercase pointer-events-none">ID</span>
                            <input
                                type="search"
                                placeholder="Ex: 15"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                className="w-full pl-7 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] transition-all"
                            />
                            {searchId && (
                                <button onClick={() => setSearchId('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {/* Campo Cliente */}
                        <div className="relative flex-1 min-w-[150px]">
                            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="search"
                                placeholder="Cliente..."
                                value={searchCliente}
                                onChange={(e) => setSearchCliente(e.target.value)}
                                className="w-full pl-7 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] transition-all"
                            />
                            {searchCliente && (
                                <button onClick={() => setSearchCliente('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {/* Campo Descrição */}
                        <div className="relative flex-1 min-w-[180px] max-w-md">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                            <input
                                type="search"
                                placeholder="Descrição..."
                                value={searchDescricao}
                                onChange={(e) => setSearchDescricao(e.target.value)}
                                className="w-full pl-7 pr-7 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] transition-all"
                            />
                            {searchDescricao && (
                                <button onClick={() => setSearchDescricao('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        {/* Limpar tudo */}
                        {(searchId || searchCliente || searchDescricao) && (
                            <button
                                onClick={() => { setSearchId(''); setSearchCliente(''); setSearchDescricao(''); }}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-semibold shrink-0"
                                title="Limpar todos os filtros"
                            >
                                <X size={13} /> Limpar
                            </button>
                        )}
                        {selectedId && (
                            <span className="text-sm text-[#32423D] font-medium ml-auto shrink-0">
                                Romaneio #{selectedId} Selecionado
                            </span>
                        )}
                    </div>

                    <div className="overflow-auto flex-1">
                        <table className="w-full">
                            <thead className="bg-[#567469] text-white text-[11px] font-medium uppercase tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left">ID</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-left">Cliente</th>
                                    <th className="px-3 py-2 text-left hidden xl:table-cell">Motorista</th>
                                    <th className="px-3 py-2 text-left hidden md:table-cell">Descrição</th>
                                    <th className="px-3 py-2 text-left hidden xl:table-cell">Envio</th>
                                    <th className="px-3 py-2 text-left hidden lg:table-cell">Criado em</th>
                                    <th className="px-3 py-2 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 size={24} className="animate-spin text-[#32423D]" />
                                                Carregando...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredRomaneios.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                            Nenhum romaneio encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRomaneios.map((romaneio) => (
                                        <React.Fragment key={romaneio.idRomaneio}>
                                        <tr
                                            onClick={() => handleRowClick(romaneio.idRomaneio)}
                                            className={`transition-colors cursor-pointer group border-l-4 ${selectedId === romaneio.idRomaneio
                                                ? 'bg-[#E0E800]/10 border-[#32423D]'
                                                : 'hover:bg-gray-50 border-transparent'
                                                }`}
                                        >
                                            <td className="px-3 py-1.5 text-gray-900 font-medium text-[13px]">#{romaneio.idRomaneio}</td>
                                            <td className="px-3 py-1.5">
                                                {(() => {
                                                    const getVal = (obj: any, key: string) => {
                                                        if (!obj) return '';
                                                        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                                                        return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                                                    };
                                                    const estatus = getVal(romaneio, 'Estatus');
                                                    const liberado = getVal(romaneio, 'Liberado');
                                                    const hasMotoristaOrData = romaneio.NomeMotorista || romaneio.DataEnvio;

                                                    let badgeClass = 'bg-gray-100 text-gray-700';
                                                    let label = 'Novo';

                                                    if (estatus === 'F') { badgeClass = 'bg-green-100 text-green-700'; label = 'Finalizado'; }
                                                    else if (liberado === 'S') { badgeClass = 'bg-[#E0E800]/40 text-[#32423D]'; label = 'Liberado'; }
                                                    else if (hasMotoristaOrData) {
                                                        badgeClass = 'bg-yellow-100 text-yellow-700';
                                                        label = 'Registrado';
                                                    }

                                                    return (
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}
                                                            title={`DB Status: Estatus="${estatus}", Liberado="${liberado}"`}
                                                        >
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-1.5">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-[13px] text-gray-800 flex items-center gap-1.5 leading-tight">
                                                        <Building2 size={13} className="text-gray-400 shrink-0" />
                                                        {romaneio.EnviadoPara || 'Não informado'}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 md:hidden mt-0.5 line-clamp-1">{romaneio.Descricao}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-600 hidden xl:table-cell">
                                                <div className="flex items-center gap-1.5 text-[12px]">
                                                    <Truck size={13} className="text-gray-400 shrink-0" />
                                                    <span className="line-clamp-1 leading-tight">{romaneio.NomeMotorista || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-600 hidden md:table-cell max-w-xs truncate" title={romaneio.Descricao}>
                                                <div className="flex items-center gap-1.5 text-[12px]">
                                                    <FileText size={13} className="text-gray-400 shrink-0" />
                                                    {romaneio.Descricao}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-500 text-sm hidden xl:table-cell">
                                                <div className="flex items-center gap-1.5 text-[12px]">
                                                    <Calendar size={13} className="text-gray-400 shrink-0" />
                                                    {formatToBRDate(romaneio.DataEnvio)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-500 text-sm hidden lg:table-cell">
                                                <div className="flex items-center gap-1.5 text-[12px]">
                                                    <Calendar size={13} className="text-gray-400 shrink-0" />
                                                    {formatToBRDate(romaneio.DATACRIACAO)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenFolder(romaneio.idRomaneio, romaneio.ENDERECORomaneio)}
                                                        className="p-1 bg-[#E0E800]/30 text-[#32423D] rounded-md hover:bg-[#E0E800]/50 transition-colors"
                                                        title="Abrir Pasta"
                                                    >
                                                        <FolderOpen size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(romaneio.idRomaneio || romaneio.id!)}
                                                        className="p-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Linha de ações inline — aparece apenas quando a linha está selecionada */}
                                        {selectedId === romaneio.idRomaneio && (() => {
                                            const getVal = (obj: any, key: string) => {
                                                if (!obj) return '';
                                                const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                                                return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                                            };
                                            const estatus  = getVal(romaneio, 'Estatus');
                                            const liberado = getVal(romaneio, 'Liberado');
                                            const enviado  = !!(romaneio.NomeMotorista || romaneio.DataEnvio);

                                            // Label de contexto do status atual
                                            let statusLabel = 'Novo';
                                            let statusColor = 'text-gray-400';
                                            if (estatus === 'F')      { statusLabel = 'FINALIZADO'; statusColor = 'text-green-600'; }
                                            else if (liberado === 'S' && enviado) { statusLabel = 'LIBERADO + ENVIADO'; statusColor = 'text-[#32423D]'; }
                                            else if (liberado === 'S') { statusLabel = 'LIBERADO'; statusColor = 'text-[#32423D]'; }
                                            else if (enviado)          { statusLabel = 'ENVIADO/REGISTRADO'; statusColor = 'text-yellow-600'; }

                                            return (
                                                <tr className="bg-[#32423D]/5 border-l-4 border-[#32423D]">
                                                    <td colSpan={8} className="px-3 py-1.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${statusColor}`}>
                                                                {statusLabel} · Ações:
                                                            </span>
                                                            {actions.map(action => {
                                                                const { disabled, reason } = getActionDisabledInfo(action.id, romaneio);
                                                                return (
                                                                     <button
                                                                        key={action.id}
                                                                        onClick={(e) => { e.stopPropagation(); if (!disabled) handleAction(action.label, action.id); }}
                                                                        disabled={disabled}
                                                                        title={disabled ? reason : action.label}
                                                                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                                                            disabled
                                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                                : `${action.bg} ${action.color} border-transparent hover:shadow-sm hover:border-gray-200 cursor-pointer`
                                                                        }`}
                                                                    >
                                                                        <action.icon size={13} />
                                                                        <span>{action.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* SHIPMENT MODAL */}
                {
                    showShipmentModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-[#32423D] flex items-center gap-2">
                                        <Truck size={20} />
                                        Registrar Envio
                                    </h3>
                                    <button onClick={() => setShowShipmentModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                <form onSubmit={submitShipment} className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Motorista *</label>
                                            <select
                                                required
                                                name="motorista"
                                                value={shipmentData.motorista}
                                                onChange={(e) => {
                                                    const selected = motoristas.find(m => m.Motorista === e.target.value);
                                                    if (selected) {
                                                        setShipmentData(prev => ({
                                                            ...prev,
                                                            motorista: selected.Motorista,
                                                            cnh: selected.CNH || '',
                                                            categoria: selected.Categoria || '',
                                                            telefone: selected.Telefone || ''
                                                        }));
                                                    } else {
                                                        setShipmentData(prev => ({ ...prev, motorista: e.target.value }));
                                                    }
                                                }}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white uppercase"
                                            >
                                                <option value="">SELECIONE O MOTORISTA...</option>
                                                {motoristas.map(m => (
                                                    <option key={m.IdMotorista} value={m.Motorista}>
                                                        {m.Motorista}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Telefone *</label>
                                            <input required type="text" name="telefone" value={shipmentData.telefone} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase" placeholder="(00) 00000-0000" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">CNH *</label>
                                            <input required type="text" name="cnh" value={shipmentData.cnh} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                                            <input required type="text" name="categoria" value={shipmentData.categoria} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase" maxLength={2} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Transporte *</label>
                                            <div className="flex gap-2 items-center">
                                                <select
                                                    required
                                                    name="tipoTransporte"
                                                    value={shipmentData.tipoTransporte}
                                                    onChange={handleShipmentInputChange}
                                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 uppercase bg-white"
                                                >
                                                    <option value="">SELECIONE...</option>
                                                    {tiposTransporte.map(t => (
                                                        <option key={t.IdTipoTransporte} value={t.TipoVeiculo}>
                                                            {t.TipoVeiculo}{t.Placa ? ` — ${t.Placa}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowTipoModal(true); setTipoForm({ TipoVeiculo: '', Placa: '' }); setTipoEditId(null); }}
                                                    title="Gerenciar tipos de transporte"
                                                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#32423D] bg-[#32423D]/5 text-[#32423D] hover:bg-[#32423D]/15 transition-colors text-xs font-bold shrink-0"
                                                >
                                                    <Plus size={14} /> Gerenciar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowShipmentModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                                        <button type="submit" className="px-6 py-2 bg-[#32423D] text-white rounded-lg hover:bg-[#32423D]/80 font-medium">Confirmar Envio</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )
                }
                {/* TIPO DE TRANSPORTE MANAGEMENT MODAL */}
                {showTipoModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-[#32423D]">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Truck size={16} /> Tipos de Transporte
                                </h3>
                                <button
                                    onClick={() => { setShowTipoModal(false); setTipoForm({ TipoVeiculo: '', Placa: '' }); setTipoEditId(null); }}
                                    className="px-3 py-1 rounded-lg bg-white/15 text-white hover:bg-white/25 text-xs font-bold transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                    {tipoEditId ? `Editando ID #${tipoEditId}` : 'Novo Tipo de Transporte'}
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tipo de Veículo *"
                                        value={tipoForm.TipoVeiculo}
                                        onChange={e => setTipoForm(prev => ({ ...prev, TipoVeiculo: e.target.value.toUpperCase() }))}
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#32423D]/20"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Placa"
                                        maxLength={10}
                                        value={tipoForm.Placa}
                                        onChange={e => setTipoForm(prev => ({ ...prev, Placa: e.target.value.toUpperCase() }))}
                                        className="w-28 px-3 py-1.5 rounded-lg border border-gray-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#32423D]/20"
                                    />
                                    <button
                                        onClick={saveTipoTransporte}
                                        disabled={tipoSaving}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#32423D] text-white text-xs font-bold hover:bg-[#2a3632] disabled:opacity-50 transition-colors shrink-0"
                                    >
                                        {tipoSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                        {tipoEditId ? 'Atualizar' : 'Incluir'}
                                    </button>
                                    {tipoEditId && (
                                        <button
                                            onClick={() => { setTipoForm({ TipoVeiculo: '', Placa: '' }); setTipoEditId(null); }}
                                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs transition-colors"
                                            title="Cancelar edição"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* List */}
                            <div className="overflow-auto max-h-72">
                                {tiposTransporte.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-8">Nenhum tipo cadastrado.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr className="text-[10px] font-bold uppercase text-gray-500 border-b border-gray-100">
                                                <th className="px-4 py-2 text-left">Tipo de Veículo</th>
                                                <th className="px-4 py-2 text-left">Placa</th>
                                                <th className="px-2 py-2 text-center w-20">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {tiposTransporte.map(t => (
                                                <tr key={t.IdTipoTransporte} className={`hover:bg-gray-50 transition-colors ${tipoEditId === t.IdTipoTransporte ? 'bg-[#E0E800]/10 border-l-2 border-[#32423D]' : ''}`}>
                                                    <td className="px-4 py-2 font-medium text-gray-800 text-xs">{t.TipoVeiculo}</td>
                                                    <td className="px-4 py-2 text-gray-500 text-xs font-mono">{t.Placa || '—'}</td>
                                                    <td className="px-2 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => { setTipoEditId(t.IdTipoTransporte); setTipoForm({ TipoVeiculo: t.TipoVeiculo, Placa: t.Placa || '' }); }}
                                                                className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <RefreshCw size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteTipoTransporte(t.IdTipoTransporte)}
                                                                className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
                {/* ITEMS MANAGEMENT MODAL */}
                {
                    showItemsModal && (

                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                            >
                                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-[#32423D] flex items-center gap-2">
                                        <List size={16} />
                                        Lista de Peças e Desenhos
                                        <span className="text-[10px] text-gray-400 font-normal ml-1">Busque e selecione itens para incluir no romaneio.</span>
                                    </h3>
                                    <button
                                        onClick={() => setShowItemsModal(false)}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all text-xs font-bold"
                                    >
                                        <X size={13} /> Fechar
                                    </button>
                                </div>

                                {/* SEARCH FILTERS — COMPACTO */}
                                <div className="px-4 py-2 bg-white border-b border-gray-100">
                                    <div className="flex flex-wrap gap-2 items-end">
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Projeto</label>
                                            <input
                                                type="search"
                                                className="w-28 px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-[#E0E800]/30 outline-none uppercase"
                                                placeholder="BUSCAR PROJETO..."
                                                value={itemFilters.projeto}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, projeto: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Tag</label>
                                            <input
                                                type="search"
                                                className="w-28 px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-[#E0E800]/30 outline-none uppercase"
                                                placeholder="BUSCAR TAG..."
                                                value={itemFilters.tag}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5 flex-1 min-w-[140px]">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Descrição Resumo</label>
                                            <input
                                                type="search"
                                                className="w-full px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-[#E0E800]/30 outline-none uppercase"
                                                placeholder="BUSCAR RESUMO..."
                                                value={itemFilters.resumo}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, resumo: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase">Cod. Fabricante</label>
                                            <input
                                                type="search"
                                                className="w-32 px-2 py-1 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-[#E0E800]/30 outline-none uppercase"
                                                placeholder="BUSCAR CÓDIGO..."
                                                value={itemFilters.codFabricante}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, codFabricante: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <button
                                            onClick={fetchAvailableItems}
                                            disabled={loadingItems}
                                            className="flex items-center gap-1 bg-[#32423D] text-[#E0E800] px-3 py-1 rounded font-bold text-xs hover:bg-[#3d4f49] transition-all disabled:opacity-50"
                                        >
                                            {loadingItems ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                            FILTRAR
                                        </button>
                                        {(itemFilters.projeto || itemFilters.tag || itemFilters.resumo || itemFilters.codFabricante) && (
                                            <button
                                                onClick={() => setItemFilters(prev => ({ ...prev, projeto: '', tag: '', resumo: '', codFabricante: '' }))}
                                                className="flex items-center gap-1 px-2 py-1 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium"
                                            >
                                                <X size={12} /> Limpar
                                            </button>
                                        )}
                                        <div className="flex items-center gap-3 ml-auto">
                                            <label className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer">
                                                <input type="checkbox" className="w-3 h-3" checked={itemFilters.mostrarEnviados}
                                                    onChange={(e) => setItemFilters(prev => ({ ...prev, mostrarEnviados: e.target.checked }))} />
                                                Mostrar peças já enviadas
                                            </label>
                                            <label className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer">
                                                <input type="checkbox" className="w-3 h-3" checked={itemFilters.mostrarFinalizados}
                                                    onChange={(e) => setItemFilters(prev => ({ ...prev, mostrarFinalizados: e.target.checked }))} />
                                                Mostrar itens finalizados
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* RESULTS TABLE */}
                                <div className="flex-1 overflow-auto p-6">
                                    <table className="w-full text-sm">
                                        <thead className="bg-[#567469] text-white bg-[#567469] text-white text-white sticky top-0 bg-[#567469] border-b border-white/20 z-10">
                                            <tr className="text-white font-bold uppercase text-[10px] tracking-wider">
                                                <th className="px-3 py-2 text-left">Projeto</th>
                                                <th className="px-3 py-2 text-left">Tag</th>
                                                <th className="px-3 py-2 text-left">Cod.Fabricante</th>
                                                <th className="px-3 py-2 text-left">Descrição</th>
                                                <th className="px-3 py-2 text-center">Unidade</th>
                                                <th className="px-3 py-2 text-right">Qtde Total</th>
                                                <th className="px-3 py-2 text-right">Já Enviado</th>
                                                <th className="px-3 py-2 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingItems ? (
                                                <tr><td colSpan={8} className="py-20 text-center text-gray-400 font-medium">Buscando itens...</td></tr>
                                            ) : availableItems.length === 0 ? (
                                                <tr><td colSpan={8} className="py-20 text-center text-gray-400 font-medium">Nenhum item encontrado com os filtros aplicados.</td></tr>
                                            ) : (
                                                availableItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors border-l-2 border-transparent hover:border-[#E0E800]">
                                                        <td className="px-3 py-2 font-semibold text-gray-700 text-xs">{item.Projeto}</td>
                                                        <td className="px-3 py-2 text-gray-600 font-mono text-[10px]">{item.Tag}</td>
                                                        <td className="px-3 py-2">
                                                            <span className="font-mono text-[10px] text-[#32423D] font-bold">
                                                                {item.CodMatFabricante || '—'}
                                                                <span className="text-gray-400 font-normal ml-1"># {item.IdOrdemServicoItem}</span>
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className="text-xs text-gray-800">
                                                                <span className="font-medium">{item.DescResumo}</span>
                                                                {item.DescDetal && <span className="text-gray-400 ml-1">{item.DescDetal}</span>}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-gray-500 text-xs">{item.Unidade}</td>
                                                        <td className="px-3 py-2 text-right font-bold text-gray-700 text-xs">{item.QtdeTotal}</td>
                                                        <td className="px-3 py-2 text-right text-gray-500 text-xs">{item.RomaneioTotalEnviado || 0}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {itemInclusion?.idx === idx ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 px-2 py-1 border border-[#E0E800] rounded text-xs focus:ring-1 focus:ring-[#E0E800] outline-none"
                                                                        value={itemInclusion.qty}
                                                                        autoFocus
                                                                        onChange={(e) => setItemInclusion({ ...itemInclusion, idx, qty: e.target.value })}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleIncludeItem(item, itemInclusion.qty);
                                                                            if (e.key === 'Escape') setItemInclusion(null);
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleIncludeItem(item, itemInclusion.qty)}
                                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                        title="Confirmar"
                                                                    >
                                                                        <CheckCircle size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setItemInclusion(null)}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                        title="Cancelar"
                                                                    >
                                                                        <XCircle size={16} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setItemInclusion({ idx, qty: String((item.QtdeTotal || 0) - (item.RomaneioTotalEnviado || 0)) })}
                                                                    className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                                    title="Selecionar para Incluir"
                                                                >
                                                                    <PlusSquare size={18} />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50">
                                    <span className="text-[10px] text-gray-400 font-medium">{availableItems.length} itens encontrados</span>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
                {/* INSERTED ITEMS VIEW MODAL */}
                {
                    showInsertedModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden"
                            >
                                {/* ── Sub-view: RNC/Pendência embarcada ─────────────────────── */}
                                {insertedView === 'rnc' ? (
                                    <>
                                        {/* Cabeçalho da sub-view */}
                                        <div className="px-4 py-2.5 bg-[#32423D] flex items-center gap-3 border-b border-white/10">
                                            <button
                                                onClick={() => setInsertedView('list')}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
                                            >
                                                <ArrowLeft size={14} /> Voltar para itens
                                            </button>
                                            <AlertTriangle size={15} className="text-orange-400" />
                                            <span className="text-sm font-bold text-white">RNC / Pendência — Item #{selectedInsertedId}</span>
                                            <button
                                                onClick={() => { setShowInsertedModal(false); setInsertedView('list'); setSelectedInsertedId(null); }}
                                                className="ml-auto p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        {/* Conteúdo da pendência */}
                                        <div className="flex-1 overflow-auto p-4">
                                            <PendenciaRomaneioPage
                                                idRomaneioItem={selectedInsertedId}
                                                onNavigate={() => setInsertedView('list')}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* ── Vista de lista ───────────────────────────────────── */}
                                        {/* Cabeçalho — linha 1: título + fechar */}
                                        <div className="px-4 py-2.5 border-b border-gray-100 bg-[#32423D] flex items-center gap-3">
                                            <FileCheck size={16} className="text-[#E0E800] shrink-0" />
                                            <span className="text-sm font-bold text-white">Manutenção de Itens — Romaneio #{selectedId}</span>
                                            {selectedInsertedId && (
                                                <span className="text-[11px] text-[#E0E800] font-semibold ml-2 shrink-0">
                                                    Item #{selectedInsertedId} selecionado
                                                </span>
                                            )}
                                            <button
                                                onClick={() => { setShowInsertedModal(false); setSelectedInsertedId(null); setInsertedView('list'); }}
                                                className="ml-auto p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Linha 2: filtros + total de peso */}
                                        <div className="px-4 py-2 bg-[#3d4f49] border-b border-white/10 flex items-center gap-2">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                <input
                                                    type="search"
                                                    placeholder="Filtrar descrição..."
                                                    className="pl-6 pr-6 py-1 text-xs rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-[#E0E800] w-56"
                                                    value={insertedFilters.resumo}
                                                    onChange={(e) => setInsertedFilters(prev => ({ ...prev, resumo: e.target.value.toUpperCase() }))}
                                                />
                                                {insertedFilters.resumo && (
                                                    <button onClick={() => setInsertedFilters(prev => ({ ...prev, resumo: '' }))} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                onClick={fetchInsertedItems}
                                                disabled={loadingInserted}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E0E800] text-[#32423D] text-xs font-bold hover:bg-[#d4dc00] transition-colors disabled:opacity-50"
                                            >
                                                {loadingInserted ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                                                Filtrar
                                            </button>
                                            <div className="ml-auto flex items-center gap-3 text-[11px] text-white/60">
                                                <span>{insertedItems.length} itens</span>
                                                {insertedItems.length > 0 && (
                                                    <span className="text-[#E0E800] font-bold">
                                                        Peso total: {insertedItems.reduce((acc, it) => acc + Number(String(it.PesoTotal || '0').replace(/[^\d.]/g, '')), 0).toFixed(2)} kg
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tabela — ocupa todo o espaço restante */}
                                        <div className="flex-1 overflow-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-[#567469] text-white text-[11px] uppercase sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-3 py-2 text-right w-12">#ID</th>
                                                        <th className="px-3 py-2">Descrição</th>
                                                        <th className="px-3 py-2 text-center">Unidade</th>
                                                        <th className="px-3 py-2 text-right">Qtde Romaneio</th>
                                                        <th className="px-3 py-2 text-right">Saldo</th>
                                                        <th className="px-3 py-2 text-right">Peso Total</th>
                                                        <th className="px-3 py-2 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-[12px]">
                                                    {loadingInserted ? (
                                                        <tr><td colSpan={7} className="py-16 text-center text-gray-400">
                                                            <Loader2 size={20} className="animate-spin mx-auto text-[#32423D]" />
                                                        </td></tr>
                                                    ) : insertedItems.length === 0 ? (
                                                        <tr><td colSpan={7} className="py-16 text-center text-gray-400 italic">Nenhum item encontrado no romaneio.</td></tr>
                                                    ) : insertedItems.map((item, idx) => (
                                                        <React.Fragment key={idx}>
                                                            {/* Linha principal */}
                                                            <tr
                                                                onClick={() => {
                                                                    const newId = selectedInsertedId === item.IdRomaneioItem ? null : item.IdRomaneioItem;
                                                                    setSelectedInsertedId(newId);
                                                                    if (!newId) { setObsOpenId(null); setObsText(''); }
                                                                }}
                                                                className={`hover:bg-cyan-50/30 transition-colors cursor-pointer border-l-4 ${selectedInsertedId === item.IdRomaneioItem ? 'bg-cyan-50 border-cyan-500' : 'border-transparent'}`}
                                                            >
                                                                <td className="px-3 py-1.5 text-right text-gray-400 text-[10px] font-mono">{item.IdRomaneioItem || '—'}</td>
                                                                <td className="px-3 py-1.5">
                                                                    {item.DescResumo && (
                                                                        <span className="font-medium text-gray-800">{item.DescResumo}</span>
                                                                    )}
                                                                    {item.DescDetal && (
                                                                        <span className="text-gray-400 ml-2">· {item.DescDetal}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-1.5 text-center text-gray-500">{item.Unidade || ''}</td>
                                                                <td className="px-3 py-1.5 text-right font-bold text-cyan-700">{item.QtdeRomaneio ?? '—'}</td>
                                                                <td className="px-3 py-1.5 text-right text-gray-500">{item.SaldoRomaneio ?? '—'}</td>
                                                                <td className="px-3 py-1.5 text-right text-gray-700 font-medium">{item.PesoTotal != null ? `${item.PesoTotal}kg` : '—'}</td>
                                                                <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (!window.confirm(`Excluir item #${item.IdRomaneioItem} do romaneio? A quantidade será estornada para o saldo da OS.`)) return;
                                                                            try {
                                                                                const r = await fetch(`${API_BASE}/romaneio/item/${item.IdRomaneioItem}`, { method: 'DELETE' });
                                                                                const d = await r.json();
                                                                                if (d.success) { fetchInsertedItems(); if (selectedInsertedId === item.IdRomaneioItem) setSelectedInsertedId(null); }
                                                                                else showAlert(d.message || 'Erro ao excluir item.', 'error');
                                                                            } catch { showAlert('Erro ao excluir.', 'error'); }
                                                                        }}
                                                                        className="p-1 rounded-md text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
                                                                        title="Excluir item do romaneio"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {/* Linha de ações inline */}
                                                            {selectedInsertedId === item.IdRomaneioItem && (
                                                                <tr className="bg-cyan-50 border-l-4 border-cyan-500">
                                                                    <td colSpan={7} className="px-3 py-1.5">
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mr-1">Ações:</span>
                                                                            {insertedActions.map(action => (
                                                                                <button
                                                                                    key={action.id}
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        if (action.id === 'pdf') {
                                                                                            window.open(`${API_BASE}/files/open-pdf/${selectedInsertedId}`, '_blank');
                                                                                        } else if (action.id === '3d') {
                                                                                            window.open(`${API_BASE}/files/open-3d/${selectedInsertedId}`, '_blank');
                                                                                        } else if (action.id === 'excluir') {
                                                                                            if (window.confirm('Deseja excluir este item do romaneio? O saldo será estornado para a OS.')) {
                                                                                                try {
                                                                                                    const response = await fetch(`${API_BASE}/romaneio/item/${selectedInsertedId}`, { method: 'DELETE' });
                                                                                                    const data = await response.json();
                                                                                                    if (data.success) { fetchInsertedItems(); setSelectedInsertedId(null); }
                                                                                                    else showAlert(data.message || 'Erro ao excluir item.', 'error');
                                                                                                } catch { showAlert('Erro ao excluir.', 'error'); }
                                                                                            }
                                                                                        } else if (action.id === 'rnc') {
                                                                                            // Abre sub-view RNC embarcada
                                                                                            setInsertedView('rnc');
                                                                                        } else if (action.id === 'obs') {
                                                                                            if (obsOpenId === item.IdRomaneioItem) {
                                                                                                setObsOpenId(null); setObsText('');
                                                                                            } else {
                                                                                                setObsOpenId(item.IdRomaneioItem); setObsText(item.Observacao || '');
                                                                                            }
                                                                                        } else if (action.id === 'alterar_qtde') {
                                                                                            if (alterarQtdeId === item.IdRomaneioItem) {
                                                                                                setAlterarQtdeId(null); setAlterarQtdeVal('');
                                                                                            } else {
                                                                                                setAlterarQtdeId(item.IdRomaneioItem); setAlterarQtdeVal('');
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all hover:shadow-sm ${action.bg} ${action.color} border-transparent hover:border-gray-200 ${action.id === 'obs' && obsOpenId === item.IdRomaneioItem ? 'ring-1 ring-slate-400' : ''}`}
                                                                                    title={action.label}
                                                                                >
                                                                                    <action.icon size={13} />
                                                                                    <span>{action.label}</span>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}

                                                            {/* Linha de observação inline */}
                                                            {obsOpenId === item.IdRomaneioItem && (
                                                                <tr className="bg-slate-50 border-l-4 border-slate-400">
                                                                    <td colSpan={6} className="px-3 py-2">
                                                                        <div className="flex items-start gap-2">
                                                                            <MessageSquare size={14} className="text-slate-500 mt-1 shrink-0" />
                                                                            <textarea
                                                                                autoFocus
                                                                                rows={2}
                                                                                placeholder="Digite a observação sobre este item..."
                                                                                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white resize-none"
                                                                                value={obsText}
                                                                                onChange={(e) => setObsText(e.target.value)}
                                                                                onBlur={() => saveObservacao(item.IdRomaneioItem, obsText)}
                                                                            />
                                                                            <button
                                                                                onClick={() => saveObservacao(item.IdRomaneioItem, obsText)}
                                                                                disabled={obsSaving}
                                                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#32423D] text-white text-xs font-bold hover:bg-[#26312D] disabled:opacity-50 transition-colors"
                                                                            >
                                                                                {obsSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                                Salvar
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        

                                                                             {/* Linha inline — Desfazer Qtde Envio */}
                                                                             {alterarQtdeId === item.IdRomaneioItem && (
                                                                                 <tr className="bg-violet-50 border-l-4 border-violet-500">
                                                                                     <td colSpan={7} className="px-3 py-2">
                                                                                         <div className="flex items-center gap-2 flex-wrap">
                                                                                             <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider whitespace-nowrap">
                                                                                                 Desfazer Qtde Envio (atual: {item.QtdeRomaneio ?? item.qtdeUsuario ?? '?'}):
                                                                                             </span>
                                                                                             <input
                                                                                                 type="number"
                                                                                                 min={1}
                                                                                                 max={Number(item.QtdeRomaneio ?? item.qtdeUsuario ?? 0)}
                                                                                                 value={alterarQtdeVal}
                                                                                                 onChange={(e) => setAlterarQtdeVal(e.target.value)}
                                                                                                 onClick={(e) => e.stopPropagation()}
                                                                                                 placeholder="Qtde a subtrair"
                                                                                                 className="w-36 px-2 py-1 text-[11px] border border-violet-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                                                                                             />
                                                                                             <button
                                                                                                 onClick={async (e) => {
                                                                                                     e.stopPropagation();
                                                                                                     const qtde = Number(alterarQtdeVal);
                                                                                                     const maxQ = Number(item.QtdeRomaneio ?? item.qtdeUsuario ?? 0);
                                                                                                     if (!qtde || qtde <= 0) { showAlert('Informe uma quantidade válida.', 'warning'); return; }
                                                                                                     if (qtde > maxQ) { showAlert(`Quantidade (${qtde}) maior que a qtde atual (${maxQ}).`, 'warning'); return; }
                                                                                                     try {
                                                                                                         const r = await fetch(`${API_BASE}/romaneio/item/${item.IdRomaneioItem}/alterar-qtde`, {
                                                                                                             method: 'POST',
                                                                                                             headers: { 'Content-Type': 'application/json' },
                                                                                                             body: JSON.stringify({ qtdeAlterar: qtde, usuario: 'Sistema' })
                                                                                                         });
                                                                                                         const d = await r.json();
                                                                                                         if (d.success) {
                                                                                                             showAlert(d.message, 'success');
                                                                                                             setAlterarQtdeId(null); setAlterarQtdeVal('');
                                                                                                             fetchInsertedItems();
                                                                                                         } else { showAlert(d.message || 'Erro ao alterar quantidade.', 'error'); }
                                                                                                     } catch { showAlert('Erro de conexão.', 'error'); }
                                                                                                 }}
                                                                                                 className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                                                                                             >
                                                                                                 Confirmar
                                                                                             </button>
                                                                                             <button
                                                                                                 onClick={(e) => { e.stopPropagation(); setAlterarQtdeId(null); setAlterarQtdeVal(''); }}
                                                                                                 className="px-2 py-1 text-[11px] font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                                                             >
                                                                                                 Cancelar
                                                                                             </button>
                                                                                         </div>
                                                                                     </td>
                                                                                 </tr>
                                                                             )}
                                                                         </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Rodapé */}
                                        <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50">
                                            <span className="text-xs text-gray-400">Clique em uma linha para ver as ações disponíveis.</span>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    )
                }

            </div>
        );
    }

    if (view === 'report' && reportData) {
        return (
            <div className="space-y-6 w-full max-w-[1920px] mx-auto">
                {/* Print Header - Hidden on screen */}
                <div className="hidden print:block mb-8 text-center border-b-2 border-gray-800 pb-4">
                    
                    <p className="text-sm">Controle de Saída de Materiais</p>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setView('list'); setSelectedId(null); fetchRomaneios(); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all font-medium"
                        >
                            <ArrowLeft size={18} /> Voltar
                        </button>
                        <div className="h-6 w-px bg-gray-200 mx-2" />
                        <span className="text-gray-800 font-bold">Relatório do Romaneio #{reportData.idRomaneio.toString().padStart(5, '0')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAction('Abrir Pasta', 'abrir_pasta')}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-all text-sm font-bold"
                            title="Abrir pasta no servidor (Explorer)"
                        >
                            <FolderOpen size={18} /> Abrir Pasta
                        </button>
                        <button
                            onClick={() => window.open(`${API_BASE}/romaneio/download-excel/${reportData.idRomaneio}`, '_blank')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all text-sm font-bold"
                        >
                            <FileSpreadsheet size={18} /> Excel
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-[#32423D] text-white rounded-lg hover:opacity-90 transition-all text-sm font-bold shadow-sm"
                        >
                            <Printer size={18} /> Imprimir
                        </button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden print:shadow-none print:border-none">
                    {/* Header Info */}
                    <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <div>
                                    <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Destinatário / Endereço de Entrega</label>
                                    <p className="text-sm font-extrabold text-[#32423D] leading-tight uppercase">
                                        {reportData.EnviadoPara}
                                    </p>
                                    <p className="text-xs text-gray-600 uppercase mt-0.5">
                                        {reportData.endereco}, {reportData.numero} - {reportData.bairro}<br />
                                        {reportData.cidade} / {reportData.estado} - {reportData.cep}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Descrição do Romaneio</label>
                                    <p className="text-xs font-medium text-gray-700 uppercase">{reportData.Descricao || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                                    <span className="text-[9px] uppercase font-bold text-gray-400">Emissão</span>
                                    <span className="text-xs font-bold text-gray-700">{formatToBRDate(reportData.DATACRIACAO)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                                    <span className="text-[9px] uppercase font-bold text-gray-400">Motorista</span>
                                    <span className="text-xs font-bold text-[#32423D] uppercase">{reportData.NomeMotorista || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                                    <span className="text-[9px] uppercase font-bold text-gray-400">Envio</span>
                                    <span className="text-xs font-bold text-gray-700">{reportData.DataEnvio ? formatToBRDate(reportData.DataEnvio) : 'PENDENTE'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] uppercase font-bold text-gray-400">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${reportData.Liberado === 'S' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {reportData.Liberado === 'S' ? 'Liberado' : 'Registrado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#567469] text-white bg-[#567469] text-white">
                                <tr className="bg-[#32423D] text-white text-[10px] uppercase tracking-widest font-bold">
                                    <th className="px-3 py-2">Item</th>
                                    <th className="px-3 py-2">Projeto</th>
                                    <th className="px-3 py-2">Tag</th>
                                    <th className="px-3 py-2">Descrição Completa</th>
                                    <th className="px-3 py-2 text-center">Qtd</th>
                                    <th className="px-3 py-2 text-right">Peso Un.</th>
                                    <th className="px-3 py-2 text-right">Peso Tot.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2 text-xs font-bold text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 text-xs font-bold text-[#32423D]">{item.PROJETO}</td>
                                        <td className="px-3 py-2 text-xs font-medium text-[#32423D]">{item.TAG}</td>
                                        <td className="px-3 py-2">
                                            <p className="text-xs font-bold text-gray-800 uppercase">{item.DescResumo}</p>
                                            <p className="text-[10px] text-gray-500 uppercase mt-0.5">{item.DescDetal}</p>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-black text-gray-700">{item.QtdeRomaneio}</span>
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs text-gray-500">{item.PesoUnit}</td>
                                        <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{item.PesoTotal}kg</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={4} className="px-3 py-3 text-right uppercase text-xs text-gray-500">Total do Romaneio</td>
                                    <td className="px-3 py-3 text-center text-sm text-[#32423D]">
                                        {reportItems.reduce((acc, curr) => acc + (Number(curr.QtdeRomaneio) || 0), 0)}
                                    </td>
                                    <td></td>
                                    <td className="px-3 py-3 text-right text-sm text-[#32423D]">
                                        {reportItems.reduce((acc, curr) => acc + (Number(curr.PesoTotal) || 0), 0).toFixed(2)}kg
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="p-12 bg-gray-50/30 grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 print:mt-16 print:bg-white">
                        <div className="border-t border-gray-300 pt-4 text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-8 tracking-widest">Responsável pela Carga (Expedição)</p>
                            <div className="w-48 h-px bg-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-medium italic text-gray-600">{reportData.CriadoPor}</p>
                        </div>
                        <div className="border-t border-gray-300 pt-4 text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-8 tracking-widest">Conferência Recebimento (Cliente)</p>
                            <div className="w-48 h-px bg-gray-300 mx-auto mb-2" />
                            <p className="text-xs font-medium italic text-gray-600">Assinatura / Carimbo</p>
                        </div>
                    </div>
                </div>

                <div className="text-center pb-12 print:hidden">
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        <CheckCircle size={14} /> Relatório verificado e pronto para impressão.
                    </p>
                </div>
            </div>
        );
    }

    // --- FORM VIEW (CREATE/EDIT) ---
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('list')}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-gray-100 transition-colors"
                        title="Voltar para Lista"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        
                        <p className="text-gray-500 text-sm">Preencha os dados do romaneio.</p>
                    </div>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Descrição */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Descrição do Romaneio
                        </label>
                        <textarea
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all uppercase"
                            placeholder="DESCREVA O CONTEÚDO..."
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Seleção de Empresa */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Enviar Para (Pessoa Jurídica)
                            </label>
                            <div className="relative">
                                <select
                                    onChange={handleCompanyChange}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 focus:border-[#E0E800] transition-all appearance-none"
                                >
                                    <option value="">Selecione um Destinatário...</option>
                                    {companies.map(c => (
                                        <option key={c.IdPessoa} value={c.IdPessoa}>
                                            {c.RazaoSocial}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Email de Contato
                            </label>
                            <input
                                type="text"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E800]/50 transition-all uppercase"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Dados de Entrega</h3>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-9">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                                <input type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                                <input type="text" name="numero" value={formData.numero} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Bairro</label>
                                <input type="text" name="bairro" value={formData.bairro} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                            <div className="col-span-12 md:col-span-7">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Complemento</label>
                                <input type="text" name="complemento" value={formData.complemento} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                                <input type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                            <div className="col-span-6 md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">UF</label>
                                <input type="text" name="estado" value={formData.estado} onChange={handleInputChange} maxLength={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase text-center" />
                            </div>
                            <div className="col-span-6 md:col-span-5">
                                <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                                <input type="text" name="cep" value={formData.cep} onChange={handleInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setView('list')} // Cancel -> Back to list
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-[#32423D] text-white font-medium text-sm hover:bg-[#3d4f49] transition-colors disabled:opacity-70 shadow-sm"
                            disabled={saving}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? 'Salvando...' : 'Salvar Romaneio'}
                        </button>
                    </div>
                </form>
            </motion.div>

        </div>
    );
}


