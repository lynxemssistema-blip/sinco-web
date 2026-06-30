import React, { useEffect, useState } from 'react';
import { 
 FileSpreadsheet, Loader2, ArrowLeft, Download
} from 'lucide-react';
import { useAlert } from '../../contexts/AlertContext';
import * as XLSX from 'xlsx';

interface ProcessableItem {
 Part_Reference: string;
 Revisao: number;
 Part_total_qty: number;
 DescricaoOS: string;
}

interface PivotRow {
 Part_Reference: string;
 revisions: {
 [rev: number]: {
 qty: number;
 osDesc: string;
 }
 };
 deltaTotal: number;
}

interface PowerBuildAgglutinationProps {
 onNavigate?: (pageId: string) => void;
}

const PowerBuildAgglutination: React.FC<PowerBuildAgglutinationProps> = ({ onNavigate }) => {
 const { showAlert } = useAlert();
 
 // Data states
 const [pivotData, setPivotData] = useState<PivotRow[]>([]);
 const [maxRev, setMaxRev] = useState<number>(0);
 const [loading, setLoading] = useState(true);

 const [contextInfo, setContextInfo] = useState({
 projeto: '',
 tag: '',
 planilha: ''
 });

 useEffect(() => {
 const fetchPivotData = async () => {
 setLoading(true);
 try {
 const idProjeto = localStorage.getItem('agglutination_filter_projeto') || '';
 const idTag = localStorage.getItem('agglutination_filter_tag') || '';
 const nomePlanilha = localStorage.getItem('agglutination_filter_planilha') || '';

 if (!idProjeto || !idTag || !nomePlanilha) {
 setLoading(false);
 showAlert('Filtros não encontrados. Volte à Lista de Itens e selecione Projeto, Tag e Planilha primeiro.', 'warning');
 return;
 }

 setContextInfo({ projeto: idProjeto, tag: idTag, planilha: nomePlanilha });

 const res = await fetch('/api/blockset/processable-items', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 idProjeto,
 idTag,
 nomePlanilha,
 revisao: -1 // GET ALL REVISIONS!
 })
 });

 const data = await res.json();
 if (data.success) {
 const rawItems: ProcessableItem[] = data.data;
 
 // Transform into Pivot Table
 const pivotMap: { [codMat: string]: PivotRow } = {};
 let highestRev = 0;

 rawItems.forEach(item => {
 if (item.Revisao > highestRev) highestRev = item.Revisao;
 
 if (!pivotMap[item.Part_Reference]) {
 pivotMap[item.Part_Reference] = {
 Part_Reference: item.Part_Reference,
 revisions: {},
 deltaTotal: 0
 };
 }

 pivotMap[item.Part_Reference].revisions[item.Revisao] = {
 qty: item.Part_total_qty,
 osDesc: item.DescricaoOS || ''
 };
 });

 // Calculate Delta based on user rule:
 // se a quantidade da ultima revisao for maior que a maior quantidade das revisoes anteriores:
 // delta = ultima_revisao - maior_das_anteriores
 // caso contrario: 0
 const pivotArray = Object.values(pivotMap).sort((a, b) => a.Part_Reference.localeCompare(b.Part_Reference));
 
 pivotArray.forEach(row => {
 const revs = Object.keys(row.revisions).map(Number).sort((a, b) => a - b);
 if (revs.length === 0) return;
 
 const lastRev = revs[revs.length - 1];
 const lastRevQty = row.revisions[lastRev].qty;
 
 let maxPrevQty = 0;
 for (let i = 0; i < revs.length - 1; i++) {
 const qty = row.revisions[revs[i]].qty;
 if (qty > maxPrevQty) {
 maxPrevQty = qty;
 }
 }
 
 if (lastRevQty > maxPrevQty) {
 row.deltaTotal = lastRevQty - maxPrevQty;
 } else {
 row.deltaTotal = 0;
 }
 });

 setPivotData(pivotArray);
 setMaxRev(highestRev);
 } else {
 showAlert('Erro ao buscar dados: ' + data.message, 'error');
 }
 } catch (error) {
 showAlert('Erro de conexão ao buscar dados', 'error');
 } finally {
 setLoading(false);
 }
 };

 fetchPivotData();
 }, [showAlert]);

 const handleExportExcel = () => {
 if (pivotData.length === 0) {
 showAlert('Não há dados para exportar.', 'warning');
 return;
 }

 const dataToExport = pivotData.map(row => {
 const obj: any = {
 'Referência P': row.Part_Reference,
 };
 
 for (let i = 0; i <= maxRev; i++) {
 const revData = row.revisions[i] || { qty: '', osDesc: '' };
 obj[`Rev ${i} / Qtde`] = revData.qty;
 obj[`OS Rev ${i}`] = revData.osDesc;
 }
 
 obj['Δ Total Inserido'] = row.deltaTotal;
 return obj;
 });

 const ws = XLSX.utils.json_to_sheet(dataToExport);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Resumo Fabricacao");
 XLSX.writeFile(wb, `Resumo_Fabricacao_${contextInfo.planilha.replace('.xlsx', '')}.xlsx`);
 };

 return (
 <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-gray-50 p-6 font-sans">
 
 {/* Header */}
 <div className="flex items-center justify-between mb-6 shrink-0">
 <div className="flex items-center gap-4">
 {onNavigate && (
 <button 
 onClick={() => onNavigate('powerbuild-list')}
 className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-white border border-gray-200 shadow-sm"
 title="Voltar para Lista"
 >
 <ArrowLeft className="w-5 h-5 text-gray-600" />
 </button>
 )}
 <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
 <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
 </div>
 <div>
 <h1 className="text-2xl font-black text-gray-800 tracking-tight">Resumo de Fabricação por Referência P</h1>
 <p className="text-xs text-gray-500 font-medium mt-0.5">
 Planilha: <strong className="text-gray-700">{contextInfo.planilha || 'Nenhuma selecionada'}</strong>
 </p>
 </div>
 </div>
 
 <button 
 onClick={handleExportExcel}
 disabled={pivotData.length === 0}
 className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
 pivotData.length > 0 
 ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' 
 : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
 }`}
 >
 <Download className="w-4 h-4" />
 Exportar Excel
 </button>
 </div>

 <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-md border border-gray-200 shadow-sm">
 {loading ? (
 <div className="flex flex-col items-center justify-center h-full space-y-4">
 <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
 <p className="text-gray-500 font-medium">Carregando matriz de revisões...</p>
 </div>
 ) : pivotData.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full space-y-4">
 <FileSpreadsheet className="w-16 h-16 text-gray-200" />
 <p className="text-gray-500 font-medium">Nenhum dado encontrado ou planilha não selecionada na tela anterior.</p>
 <button 
 onClick={() => onNavigate && onNavigate('powerbuild-list')}
 className="text-indigo-600 font-bold hover:underline"
 >
 Voltar e selecionar uma planilha
 </button>
 </div>
 ) : (
 <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
 <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 shadow-sm">
 <tr>
 <th className="py-4 px-6 text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 bg-gray-100">
 Referência P
 </th>
 {Array.from({ length: maxRev + 1 }).map((_, i) => (
 <React.Fragment key={i}>
 <th className="py-4 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider text-center border-r border-gray-200">
 Rev {i} / Qtde
 </th>
 <th className="py-4 px-6 text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 bg-white">
 OS Rev {i}
 </th>
 </React.Fragment>
 ))}
 <th className="py-4 px-6 text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50">
 Δ Total Inserido
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {pivotData.map((row, idx) => (
 <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
 <td className="py-3 px-6 border-r border-gray-100 bg-gray-50/50">
 <span className="font-bold text-gray-800 text-xs">{row.Part_Reference}</span>
 </td>
 
 {Array.from({ length: maxRev + 1 }).map((_, i) => {
 const rev = row.revisions[i];
 return (
 <React.Fragment key={i}>
 <td className="py-3 px-4 text-center border-r border-gray-100">
 <span className="font-medium text-gray-700">{rev?.qty ?? ''}</span>
 </td>
 <td className="py-3 px-6 border-r border-gray-100 text-xs text-gray-600">
 {rev?.osDesc ?? ''}
 </td>
 </React.Fragment>
 );
 })}
 
 <td className="py-3 px-6 bg-indigo-50/30">
 <span className={`font-bold text-xs ${row.deltaTotal > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
 {row.deltaTotal}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 
 {/* Footer Info */}
 {pivotData.length > 0 && (
 <div className="flex items-center justify-between text-xs text-gray-500 px-2 mt-4 shrink-0">
 <span>Total de Referências: <strong className="text-gray-800">{pivotData.length}</strong></span>
 <span>Revisão Máxima Encontrada: <strong className="text-gray-800">Rev {maxRev}</strong></span>
 </div>
 )}
 </div>
 );
};

export default PowerBuildAgglutination;
