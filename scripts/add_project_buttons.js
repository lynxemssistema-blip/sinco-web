const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Projeto.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add icons to lucide-react import
content = content.replace(
    /Loader2, RefreshCw, Calendar, Tag as TagIcon, ChevronRight, ChevronDown/g,
    'Loader2, RefreshCw, Calendar, Tag as TagIcon, ChevronRight, ChevronDown, FolderOpen, CheckCircle2'
);

// 2. Add liberado field to Projeto interface
content = content.replace(
    /PlanejadoFinanceiro\?: string;/g,
    'PlanejadoFinanceiro?: string;\n    liberado?: string;'
);

// 3. Add handler functions for open-folder and liberar
const handlers = `
    const handleOpenFolder = async (id: number) => {
        try {
            const res = await fetch(\`\${API_BASE}/projeto/\${id}/open-folder\`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                showAlert('Pasta aberta no servidor.', "success");
            } else {
                showAlert(json.message || 'Erro ao abrir pasta.', "error");
            }
        } catch (err) {
            showAlert('Erro de conexão ao tentar abrir pasta.', "error");
        }
    };

    const handleLiberar = async (id: number) => {
        if (!confirm('Deseja realmente liberar este projeto?')) return;
        try {
            const res = await fetch(\`\${API_BASE}/projeto/\${id}/liberar\`, { 
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
        } catch (err) {
            showAlert('Erro de conexão ao liberar.', "error");
        }
    };

    const resetProjetoForm = () => {`;

content = content.replace('    const resetProjetoForm = () => {', handlers);

// 4. Add the buttons to the Action div
const actionsOld = `{/* Actions */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => openTagForm(projeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                title="Nova Tag"
                                            >
                                                <Plus size={16} />
                                            </button>`;

const actionsNew = `{/* Actions */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => projeto.IdProjeto && handleOpenFolder(projeto.IdProjeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                title="Abrir Pasta Projeto"
                                            >
                                                <FolderOpen size={16} />
                                            </button>
                                            {projeto.liberado !== 'S' && (
                                                <button
                                                    onClick={() => projeto.IdProjeto && handleLiberar(projeto.IdProjeto)}
                                                    className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                                    title="Liberar Projeto"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                            <button
                                                onClick={() => openTagForm(projeto)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-[#32423D] hover:bg-[#E0E800]/20 transition-colors"
                                                title="Nova Tag"
                                            >
                                                <Plus size={16} />
                                            </button>`;

content = content.replace(actionsOld, actionsNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Botões e handlers inseridos no Projeto.tsx');
