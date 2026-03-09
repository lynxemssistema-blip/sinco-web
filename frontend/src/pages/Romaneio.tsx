import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Save, Loader2, Truck, ArrowLeft, FileText,
    FolderOpen, Trash2, Plus, Calendar, Building2, Search,
    CheckCircle, XCircle, FileCheck, FileX, RefreshCw, FileSpreadsheet,
    List, PlusSquare, Box, AlertTriangle, MessageSquare, Printer, Copy
} from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { formatToBRDate } from '../utils/dateUtils';

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
    const [searchTerm, setSearchTerm] = useState('');

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
        placa: '',
        cnh: '',
        categoria: '',
        telefone: '',
        tipoTransporte: ''
    });

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

    const insertedActions = [
        { id: 'pdf', label: 'Abrir desenho PDF', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
        { id: '3d', label: 'Abrir desenho 3D', icon: Box, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
        { id: 'excluir', label: 'Excluir item', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
        { id: 'rnc', label: 'Gerar RNC - Pendência', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
        { id: 'obs', label: 'Gerar Observação', icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50', hover: 'hover:bg-slate-100' },
    ];

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
        setShipmentData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const submitShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedId) return;

        if (!shipmentData.motorista || !shipmentData.placa || !shipmentData.tipoTransporte || !shipmentData.cnh || !shipmentData.categoria || !shipmentData.telefone) {
            showAlert("Preencha TODOS os campos obrigatórios: Motorista, Placa, CNH, Categoria, Telefone e Tipo Transporte.", "warning");
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
                setShipmentData({ motorista: '', placa: '', cnh: '', categoria: '', telefone: '', tipoTransporte: '' }); // Reset
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

        // Check status for 특정 actions
        if (actionId === 'cancelar_lib') {
            const romaneio = romaneios.find(r => Number(r.idRomaneio) === Number(selectedId));

            if (romaneio) {
                // Robust access to Liberado/Estatus/Any key
                const getVal = (obj: any, key: string) => {
                    if (!obj) return '';
                    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                    return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                };

                const estatus = getVal(romaneio, 'Estatus');
                const liberado = getVal(romaneio, 'Liberado');

                console.log(`[DEBUG] Action: ${actionId} | ID: ${selectedId} | Estatus: "${estatus}" | Liberado: "${liberado}"`, romaneio);

                if (estatus === 'F') {
                    showAlert(`O Romaneio #${selectedId} está FINALIZADO e não pode ter a liberação cancelada.`, "error");
                    return;
                }
                if (liberado !== 'S') {
                    showAlert(`Este romaneio (#${selectedId}) não está liberado (Status detectado: "${liberado}") e não pode ser cancelado. Por favor, verifique se o romaneio está marcado como 'Liberado' (Azul) na lista.`, "error");
                    return;
                }
            }
        }

        let finalConfirmMsg = `Confirma a ação "${actionName}" para o Romaneio #${selectedId}?`;
        if (actionId === 'cancelar_lib') {
            finalConfirmMsg = `Atenção: Você está prestes a cancelar a liberação do Romaneio - ${selectedId}. Isso removerá os documentos gerados e retornará o status para Registrado. Deseja proceder com esta atualização?`;
        }

        if (!confirm(finalConfirmMsg)) return;

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
        { id: 'abrir_pasta', label: 'Abrir Pasta', icon: FolderOpen, color: 'text-yellow-600', bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100' },
        { id: 'registrar', label: 'Registrar', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
        { id: 'liberar', label: 'Liberar', icon: FileCheck, color: 'text-green-600', bg: 'bg-green-50', hover: 'hover:bg-green-100' },
        { id: 'cancelar_lib', label: 'Cancelar Lib.', icon: FileX, color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
        { id: 'atualizar', label: 'Atualizar Docs', icon: RefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
        { id: 'excel', label: 'Gerar Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
        { id: 'finalizar', label: 'Finalizar', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50', hover: 'hover:bg-teal-100' },
        { id: 'cancelar_fin', label: 'Cancelar Fin.', icon: XCircle, color: 'text-orange-600', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
        { id: 'exibir_itens', label: 'Lista de Peças e Desenhos', icon: List, color: 'text-slate-600', bg: 'bg-slate-50', hover: 'hover:bg-slate-100' },
        { id: 'itens_inseridos', label: 'Itens Inseridos no Romaneio', icon: FileCheck, color: 'text-cyan-600', bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100' },
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

    const filteredRomaneios = (romaneios || []).filter(r => // Guard against null romaneios
        r && ( // Guard against null items
            (r.Descricao && r.Descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.EnviadoPara && r.EnviadoPara.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.idRomaneio && r.idRomaneio.toString().includes(searchTerm))
        )
    );

    const handleRowClick = (id: number) => {
        setSelectedId(id === selectedId ? null : id);
    };

    // --- RENDER ---

    if (view === 'list') {
        return (
            <div className="space-y-6">
                {/* Header & Main Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                            <Truck className="text-[#32423D]" />
                            Romaneios
                        </h1>
                        <p className="text-gray-500 mt-1">Selecione um romaneio abaixo para habilitar as ações.</p>
                    </div>
                </div>

                {/* COMMAND CENTER (Actions Dashboard) */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {/* Primary Creation Action */}
                    <button
                        onClick={handleCreateNew}
                        className="col-span-2 md:col-span-2 lg:col-span-2 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:bg-[#32423D] hover:text-white hover:border-[#32423D] transition-all group flex flex-col items-center justify-center gap-2"
                    >
                        <div className="p-2 bg-white rounded-full text-gray-400 group-hover:text-[#32423D]">
                            <Plus size={24} />
                        </div>
                        <span className="font-semibold text-sm">Criar Novo</span>
                    </button>

                    {/* Dynamic Actions */}
                    {actions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action.label, action.id)}
                            disabled={!selectedId}
                            className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${selectedId
                                ? `bg-white border-gray-100 cursor-pointer hover:shadow-md ${action.hover}`
                                : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed grayscale'
                                }`}
                        >
                            <action.icon size={20} className={selectedId ? action.color : 'text-gray-300'} />
                            <span className={`text-xs font-medium text-center ${selectedId ? 'text-gray-600' : 'text-gray-300'}`}>
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>

                {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={18} /> {successMsg}
                    </motion.div>
                )}

                {/* List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por Cliente, ID ou Descrição..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#32423D]/20 focus:border-[#32423D] transition-all"
                            />
                        </div>
                        {selectedId && (
                            <span className="text-sm text-blue-600 font-medium animate-pulse ml-auto">
                                Romaneio #{selectedId} Selecionado
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-gray-500 text-sm font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left w-20">ID</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Cliente</th>
                                    <th className="px-6 py-4 text-left hidden xl:table-cell">Motorista</th>
                                    <th className="px-6 py-4 text-left hidden md:table-cell">Descrição</th>
                                    <th className="px-6 py-4 text-left hidden xl:table-cell">Envio</th>
                                    <th className="px-6 py-4 text-left hidden lg:table-cell">Criado em</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
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
                                        <tr
                                            key={romaneio.idRomaneio}
                                            onClick={() => handleRowClick(romaneio.idRomaneio)}
                                            className={`transition-colors cursor-pointer group border-l-4 ${selectedId === romaneio.idRomaneio
                                                ? 'bg-blue-50/50 border-blue-500'
                                                : 'hover:bg-gray-50 border-transparent'
                                                }`}
                                        >
                                            <td className="px-6 py-4 text-gray-900 font-medium">#{romaneio.idRomaneio}</td>
                                            <td className="px-6 py-4">
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
                                                    else if (liberado === 'S') { badgeClass = 'bg-blue-100 text-blue-700'; label = 'Liberado'; }
                                                    else if (hasMotoristaOrData) {
                                                        badgeClass = 'bg-yellow-100 text-yellow-700';
                                                        label = 'Registrado';
                                                    }

                                                    return (
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                                                            title={`DB Status: Estatus="${estatus}", Liberado="${liberado}"`}
                                                        >
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-800 flex items-center gap-2">
                                                        <Building2 size={16} className="text-gray-400" />
                                                        {romaneio.EnviadoPara || 'Não informado'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 md:hidden mt-1 line-clamp-1">{romaneio.Descricao}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 hidden xl:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Truck size={16} className="text-gray-400" />
                                                    {romaneio.NomeMotorista || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 hidden md:table-cell max-w-xs truncate" title={romaneio.Descricao}>
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                                    {romaneio.Descricao}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm hidden xl:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-gray-400" />
                                                    {formatToBRDate(romaneio.DataEnvio)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-gray-400" />
                                                    {formatToBRDate(romaneio.DATACRIACAO)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenFolder(romaneio.idRomaneio, romaneio.ENDERECORomaneio)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="Abrir Pasta"
                                                    >
                                                        <FolderOpen size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(romaneio.idRomaneio || romaneio.id!)}
                                                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
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
                                            <input required type="text" name="motorista" value={shipmentData.motorista} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase" placeholder="NOME COMPLETO" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Placa Veículo *</label>
                                            <input required type="text" name="placa" value={shipmentData.placa} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase" placeholder="ABC-1234" />
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
                                            <select required name="tipoTransporte" value={shipmentData.tipoTransporte} onChange={handleShipmentInputChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 uppercase bg-white">
                                                <option value="">SELECIONE...</option>
                                                <option value="PROPRIO">PRÓPRIO</option>
                                                <option value="TERCEIROS">TERCEIROS / TRANSPORTADORA</option>
                                                <option value="CLIENTE">RETIRA CLIENTE</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowShipmentModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Confirmar Envio</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )
                }
                {/* ITEMS MANAGEMENT MODAL */}
                {
                    showItemsModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#32423D] flex items-center gap-2">
                                            <List size={20} />
                                            Lista de Peças e Desenhos
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">Busque e selecione itens para incluir no romaneio.</p>
                                    </div>
                                    <button onClick={() => setShowItemsModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                {/* SEARCH FILTERS */}
                                <div className="p-6 bg-white border-b border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Projeto</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#E0E800]/20 outline-none uppercase"
                                                placeholder="BUSCAR PROJETO..."
                                                value={itemFilters.projeto}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, projeto: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Tag</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#E0E800]/20 outline-none uppercase"
                                                placeholder="BUSCAR TAG..."
                                                value={itemFilters.tag}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição Resumo</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#E0E800]/20 outline-none uppercase"
                                                placeholder="BUSCAR RESUMO..."
                                                value={itemFilters.resumo}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, resumo: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Cod. FabricANTE</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#E0E800]/20 outline-none uppercase"
                                                placeholder="BUSCAR CÓDIGO..."
                                                value={itemFilters.codFabricante}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, codFabricante: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={fetchAvailableItems}
                                                disabled={loadingItems}
                                                className="w-full flex items-center justify-center gap-2 bg-[#32423D] text-[#E0E800] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#3d4f49] transition-all disabled:opacity-50"
                                            >
                                                {loadingItems ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                FILTRAR
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="chkMostrarEnviados"
                                                className="w-4 h-4 text-[#32423D]"
                                                checked={itemFilters.mostrarEnviados}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, mostrarEnviados: e.target.checked }))}
                                            />
                                            <label htmlFor="chkMostrarEnviados" className="text-xs text-gray-600 font-medium">Mostrar peças já enviadas</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="chkMostrarFinalizados"
                                                className="w-4 h-4 text-[#32423D]"
                                                checked={itemFilters.mostrarFinalizados}
                                                onChange={(e) => setItemFilters(prev => ({ ...prev, mostrarFinalizados: e.target.checked }))}
                                            />
                                            <label htmlFor="chkMostrarFinalizados" className="text-xs text-gray-600 font-medium">Mostrar itens finalizados</label>
                                        </div>
                                    </div>
                                </div>

                                {/* RESULTS TABLE */}
                                <div className="flex-1 overflow-auto p-6">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                                            <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                                <th className="px-4 py-3 text-left">Projeto</th>
                                                <th className="px-4 py-3 text-left">Tag</th>
                                                <th className="px-4 py-3 text-left">Descrição</th>
                                                <th className="px-4 py-3 text-center">Unidade</th>
                                                <th className="px-4 py-3 text-right">Qtde Total</th>
                                                <th className="px-4 py-3 text-right">Já Enviado</th>
                                                <th className="px-4 py-3 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingItems ? (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium">Buscando itens...</td></tr>
                                            ) : availableItems.length === 0 ? (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium">Nenhum item encontrado com os filtros aplicados.</td></tr>
                                            ) : (
                                                availableItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors border-l-2 border-transparent hover:border-[#E0E800]">
                                                        <td className="px-4 py-3 font-semibold text-gray-700">{item.Projeto}</td>
                                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.Tag}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-800">{item.DescResumo}</span>
                                                                <span className="text-[10px] text-gray-400 truncate max-w-xs">{item.DescDetal}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{item.Unidade}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-700">{item.QtdeTotal}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">{item.RomaneioTotalEnviado || 0}</td>
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

                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-medium">{availableItems.length} itens encontrados</span>
                                    <button
                                        onClick={() => setShowItemsModal(false)}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
                                    >
                                        FECHAR
                                    </button>
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
                                className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
                            >
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-cyan-50/50">
                                    <div>
                                        <h3 className="text-lg font-bold text-cyan-800 flex items-center gap-2">
                                            <FileCheck size={20} />
                                            Itens Inseridos no Romaneio #{selectedId}
                                        </h3>
                                        <p className="text-xs text-cyan-600 mt-1">Lista de itens que já foram adicionados a este romaneio.</p>
                                    </div>
                                    <button onClick={() => setShowInsertedModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-full transition-all">
                                        <XCircle size={24} />
                                    </button>
                                </div>

                                {/* SEARCH FILTERS */}
                                <div className="p-6 bg-white border-b border-gray-100">
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Projeto</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase"
                                                placeholder="PROJETO..."
                                                value={insertedFilters.projeto}
                                                onChange={(e) => setInsertedFilters(prev => ({ ...prev, projeto: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Tag</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase"
                                                placeholder="TAG..."
                                                value={insertedFilters.tag}
                                                onChange={(e) => setInsertedFilters(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição Resumo</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase"
                                                placeholder="RESUMO..."
                                                value={insertedFilters.resumo}
                                                onChange={(e) => setInsertedFilters(prev => ({ ...prev, resumo: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Cod. FabricANTE</label>
                                            <input
                                                type="text"
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none uppercase"
                                                placeholder="CÓDIGO..."
                                                value={insertedFilters.codFabricante}
                                                onChange={(e) => setInsertedFilters(prev => ({ ...prev, codFabricante: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={fetchInsertedItems}
                                                disabled={loadingInserted}
                                                className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-cyan-700 transition-all disabled:opacity-50"
                                            >
                                                {loadingInserted ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                FILTRAR
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* COMMAND CENTER (Dashboard Style) */}
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1 h-3 bg-cyan-500 rounded-full"></div>
                                                Centro de Comandos do Item
                                            </h3>
                                            {!selectedInsertedId && (
                                                <span className="text-[10px] text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded-full">
                                                    SELECIONE UM ITEM ABAIXO
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {insertedActions.map(action => (
                                                <button
                                                    key={action.id}
                                                    onClick={async () => {
                                                        if (action.id === 'pdf') {
                                                            window.open(`${API_BASE}/files/open-pdf/${selectedInsertedId}`, '_blank');
                                                        } else if (action.id === '3d') {
                                                            window.open(`${API_BASE}/files/open-3d/${selectedInsertedId}`, '_blank');
                                                        } else if (action.id === 'excluir') {
                                                            if (window.confirm('Deseja realmente excluir este item do romaneio? Esta ação irá estornar o saldo para a Ordem de Serviço.')) {
                                                                try {
                                                                    const response = await fetch(`${API_BASE}/romaneio/item/${selectedInsertedId}`, {
                                                                        method: 'DELETE'
                                                                    });
                                                                    const data = await response.json();
                                                                    if (data.success) {
                                                                        // Refresh list and clear selection
                                                                        fetchInsertedItems();
                                                                        setSelectedInsertedId(null);
                                                                    } else {
                                                                        showAlert(data.message || 'Erro ao excluir item.', "error");
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Error deleting item:', err);
                                                                    showAlert('Erro técnico ao processar exclusão.', "error");
                                                                }
                                                            }
                                                        } else if (action.id === 'rnc') {
                                                            if (onSetRncItem) {
                                                                onSetRncItem(selectedInsertedId);
                                                                onNavigate('pendencia-romaneio');
                                                            }
                                                        }
                                                    }}
                                                    disabled={!selectedInsertedId}
                                                    className={`
                                                        flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-2
                                                        ${selectedInsertedId
                                                            ? `${action.bg} ${action.hover} border-transparent shadow-sm hover:shadow-md cursor-pointer`
                                                            : 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'}
                                                    `}
                                                >
                                                    <action.icon className={`${action.color}`} size={20} />
                                                    <span className={`text-[10px] font-bold text-center leading-tight ${selectedInsertedId ? 'text-gray-700' : 'text-gray-400'}`}>
                                                        {action.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* RESULTS TABLE */}
                                <div className="flex-1 overflow-auto p-6">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                                            <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                                <th className="px-4 py-3 text-left">Projeto</th>
                                                <th className="px-4 py-3 text-left">Tag</th>
                                                <th className="px-4 py-3 text-left">Descrição</th>
                                                <th className="px-4 py-3 text-center">Unidade</th>
                                                <th className="px-4 py-3 text-right">Qtde Romaneio</th>
                                                <th className="px-4 py-3 text-right">Saldo</th>
                                                <th className="px-4 py-3 text-right">Peso Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loadingInserted ? (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium">Buscando itens...</td></tr>
                                            ) : insertedItems.length === 0 ? (
                                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 font-medium">Nenhum item encontrado no romaneio.</td></tr>
                                            ) : (
                                                insertedItems.map((item, idx) => (
                                                    <tr
                                                        key={idx}
                                                        onClick={() => setSelectedInsertedId(item.IdRomaneioItem)}
                                                        className={`
                                                            hover:bg-cyan-50/30 transition-colors border-l-2 cursor-pointer
                                                            ${selectedInsertedId === item.IdRomaneioItem
                                                                ? 'bg-cyan-50 border-cyan-500'
                                                                : 'border-transparent hover:border-cyan-200'}
                                                        `}
                                                    >
                                                        <td className="px-4 py-3 font-semibold text-gray-700">{item.Projeto}</td>
                                                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.Tag}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-800">{item.DescResumo}</span>
                                                                <span className="text-[10px] text-gray-400 truncate max-w-xs">{item.DescDetal}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{item.Unidade}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-cyan-700">{item.QtdeRomaneio}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">{item.SaldoRomaneio}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700 font-medium">{item.PesoTotal}kg</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <span className="text-xs text-gray-500 font-medium">{insertedItems.length} itens encontrados</span>
                                    <button
                                        onClick={() => setShowInsertedModal(false)}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition-all"
                                    >
                                        FECHAR
                                    </button>
                                </div>
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
                    <h1 className="text-3xl font-bold uppercase">Romaneio de Entrega</h1>
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
                    <div className="p-8 bg-gray-50/50 border-b border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Destinatário / Endereço de Entrega</label>
                                    <p className="text-lg font-extrabold text-[#32423D] leading-tight uppercase">
                                        {reportData.EnviadoPara}
                                    </p>
                                    <p className="text-sm text-gray-600 uppercase mt-1">
                                        {reportData.endereco}, {reportData.numero} - {reportData.bairro}<br />
                                        {reportData.cidade} / {reportData.estado} - {reportData.cep}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Descrição do Romaneio</label>
                                        <p className="text-sm font-medium text-gray-700 uppercase">{reportData.Descricao || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Caminho de Gravação</label>
                                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { navigator.clipboard.writeText(reportData.ENDERECORomaneio || ''); showAlert('Caminho copiado!', 'success'); }}>
                                            <p className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded break-all">
                                                {reportData.ENDERECORomaneio || 'Não configurado'}
                                            </p>
                                            <Copy size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Emissão</span>
                                    <span className="text-sm font-bold text-gray-700">{formatToBRDate(reportData.DATACRIACAO)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Motorista</span>
                                    <span className="text-sm font-bold text-blue-700 uppercase">{reportData.NomeMotorista || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Envio</span>
                                    <span className="text-sm font-bold text-gray-700">{reportData.DataEnvio ? formatToBRDate(reportData.DataEnvio) : 'PENDENTE'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${reportData.Liberado === 'S' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {reportData.Liberado === 'S' ? 'Liberado' : 'Registrado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#32423D] text-white text-[10px] uppercase tracking-widest font-bold">
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4">Projeto</th>
                                    <th className="px-6 py-4">Tag</th>
                                    <th className="px-6 py-4">Descrição Completa</th>
                                    <th className="px-6 py-4 text-center">Qtd</th>
                                    <th className="px-6 py-4 text-right">Peso Un.</th>
                                    <th className="px-6 py-4 text-right">Peso Tot.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reportItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-[#32423D]">{item.PROJETO}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-blue-600">{item.TAG}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-gray-800 uppercase">{item.DescResumo}</p>
                                            <p className="text-[10px] text-gray-500 uppercase mt-0.5">{item.DescDetal}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-black text-gray-700">{item.QtdeRomaneio}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-500">{item.PesoUnit}</td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-gray-800">{item.PesoTotal}kg</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={4} className="px-6 py-6 text-right uppercase text-xs text-gray-500">Total do Romaneio</td>
                                    <td className="px-6 py-6 text-center text-sm text-[#32423D]">
                                        {reportItems.reduce((acc, curr) => acc + (Number(curr.QtdeRomaneio) || 0), 0)}
                                    </td>
                                    <td></td>
                                    <td className="px-6 py-6 text-right text-sm text-[#32423D]">
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
                        <h1 className="text-2xl font-bold text-[#32423D]">
                            {view === 'create' ? 'Criar Novo Romaneio' : 'Editar Romaneio'}
                        </h1>
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
