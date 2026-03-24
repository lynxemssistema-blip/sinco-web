const fs = require('fs');

let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

// 1. Add selectedOSId state
code = code.replace(
    /const \[expandedOrdens, setExpandedOrdens\] = useState<Set<number>>\(new Set\(\)\);/,
    `const [expandedOrdens, setExpandedOrdens] = useState<Set<number>>(new Set());\n    const [selectedOSId, setSelectedOSId] = useState<number | null>(null);`
);

// 2. Add liberation state
code = code.replace(
    /const \[loadingItens, setLoadingItens\] = useState<Set<number>>\(new Set\(\)\);/,
    `const [loadingItens, setLoadingItens] = useState<Set<number>>(new Set());\n    const [liberandoOS, setLiberandoOS] = useState<number | null>(null);\n    const { addToast } = useApplication();`
);

// 3. Extract the detail content and create renderOSDetail
let startExpanded = code.indexOf('{/* Expanded Content */}');
let endExpanded = code.indexOf('</AnimatePresence>');
if (startExpanded !== -1 && endExpanded !== -1) {
    let expandedBlock = code.substring(startExpanded, endExpanded + '</AnimatePresence>'.length);
    
    code = code.replace(expandedBlock, '');
    
    let detailContent = expandedBlock
        .replace(/<AnimatePresence>[\s\S]*?\{isExpanded && \([\s\S]*?<motion\.div[\s\S]*?className="overflow-hidden bg-gray-50\/50"[\s\S]*?>/, 
            `<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-4">
                {/* Voltar and Actions Bar */}
                <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-100 bg-gray-50 gap-4">
                    <button onClick={() => setSelectedOSId(null)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                        <ArrowLeft size={16} />
                        Voltar para Lista
                    </button>
                    
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <div className="text-right sm:mr-4">
                            <div className="text-xs text-gray-400">Ordem de Serviço</div>
                            <div className="text-lg font-bold text-primary">OS {os.IdOrdemServico}</div>
                        </div>
                        <button 
                            onClick={() => handleLiberarOS(os)}
                            disabled={liberandoOS === os.IdOrdemServico}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 disabled:opacity-50 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium text-sm shadow-sm"
                        >
                            {liberandoOS === os.IdOrdemServico ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            {os.Liberado_Engenharia === 'S' ? 'Atualizar Liberação' : 'Liberar Ordem de Serviço'}
                        </button>
                    </div>
                </div>`)
        .replace(/<\/motion\.div>[\s\S]*?<\/AnimatePresence>/, '</div>');

    let renderDetailFunc = `
    const handleLiberarOS = async (os: OrdemServico) => {
        if (os.Liberado_Engenharia === 'S') {
            if (!window.confirm('Esta OS já foi liberada pela engenharia. Deseja re-liberar?')) {
                return;
            }
        }
        
        if (os.Fator === 0 || os.Fator === '0' || os.Fator == null) {
            addToast({ type: 'error', title: 'Erro', message: 'O fator da Ordem de Serviço não pode ser 0 ou nulo para liberação.' });
            return;
        }

        const tipoLiberacao = window.prompt("Digite 'Total' ou 'Parcial' para confirmar o tipo de liberação:");
        if (!tipoLiberacao || (tipoLiberacao.toLowerCase() !== 'total' && tipoLiberacao.toLowerCase() !== 'parcial')) {
            addToast({ type: 'error', title: 'Atenção', message: 'Liberação cancelada. É necessário informar Total ou Parcial.' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(\`\${API_BASE}/ordemservico/liberar\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
                body: JSON.stringify({
                    IdOrdemServico: os.IdOrdemServico,
                    IdTag: os.IdTag,
                    IdProjeto: os.IdProjeto,
                    Fator: os.Fator,
                    EnderecoOrdemServico: os.EnderecoOrdemServico,
                    TipoLiberacao: tipoLiberacao.toLowerCase() === 'total' ? 'Total' : 'Parcial'
                })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: \`Ordem de Serviço \${os.IdOrdemServico} liberada com sucesso (\${tipoLiberacao})!\` });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: 'S', OrdemServicoFinalizado: 'C' } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao liberar Ordem de Serviço.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const renderOSDetail = (os: OrdemServico) => {
        const itens = ordensItens[os.IdOrdemServico] || [];
        const isLoadingItens = loadingItens.has(os.IdOrdemServico);
        return (
            ${detailContent}
        );
    };
`;

    code = code.replace('const renderOSCard = (os: OrdemServico, idx: number) => {', renderDetailFunc + '\n    const renderOSCard = (os: OrdemServico, idx: number) => {');
}

let imports = `import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Box, Layers, RefreshCw, X, ChevronRight, FileText, Factory, Loader2, ArrowLeft, FolderOpen, Eye, CheckCircle, ClipboardList, PackageCheck, AlertCircle, TrendingUp, DollarSign, Calendar, Clock, Settings2, User, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApplication } from '../../context/ApplicationContext';
import Topbar from '../common/Topbar';
`;
code = code.replace(/import React[\s\S]*?from 'react';[\s\S]*?from 'lucide-react';/s, imports);

code = code.replace(/const toggleOS = useCallback[\s\S]*?\}, \[ordensItens, fetchItens\]\);/m, 
`    const toggleOS = useCallback(async (osId: number) => {
        setSelectedOSId(osId);
        if (!ordensItens[osId]) {
            fetchItens(osId);
        }
    }, [ordensItens, fetchItens]);`);

code = code.replace(/\{searchMode === 'os' && \(/g, `{searchMode === 'os' && selectedOSId ? renderOSDetail(ordens.find(o => o.IdOrdemServico === selectedOSId)!) : searchMode === 'os' && (`);

// Remove the condition 'isExpanded' dependencies inside renderOSCard
code = code.replace(/const isExpanded = expandedOrdens\.has\(os\.IdOrdemServico\);/g, `const isExpanded = false;`);

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Done refactoring!');
