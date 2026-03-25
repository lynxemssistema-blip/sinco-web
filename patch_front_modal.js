const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'frontend/src/pages/OrdemServico.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add states
const statesTarget = "const [liberandoOS, setLiberandoOS] = useState<number | null>(null);";
const statesCode = `const [liberandoOS, setLiberandoOS] = useState<number | null>(null);

    // Modal Clone Inter-Projetos
    const [showModalClonar, setShowModalClonar] = useState<OrdemServico | null>(null);
    const [cloneDescricao, setCloneDescricao] = useState('');
    const [cloneFator, setCloneFator] = useState(1);
    const [cloneProjetoId, setCloneProjetoId] = useState<number | string>('');
    const [cloneTagId, setCloneTagId] = useState<number | string>('');`;

if (content.includes(statesTarget) && !content.includes('showModalClonar')) {
    content = content.replace(statesTarget, statesCode);
}

// 2. Remove old handleClonarOS
const oldFuncRegex = /const handleClonarOS = async \(os: OrdemServico\) => \{[\s\S]*?\}\;\n/m;
content = content.replace(oldFuncRegex, '');

// 3. Add new handleOpenClonarOS and executeClone before renderOSDetail
const handlerTarget = "const renderOSDetail = (os: OrdemServico) => {";
const newFunctions = `
    const handleOpenClonarOS = (os: OrdemServico) => {
        setCloneDescricao(os.Descricao || '');
        setCloneFator(1);
        setCloneProjetoId(os.IdProjeto || '');
        setCloneTagId(os.IdTag || '');
        setShowModalClonar(os);
    };

    const executeClone = async (os: OrdemServico) => {
        if (!cloneProjetoId || !cloneTagId) {
            addToast({ type: 'warning', title: 'Atenção', message: 'Selecione um Projeto e uma Tag destino!' });
            return;
        }

        setLiberandoOS(os.IdOrdemServico);
        try {
            const response = await fetch(\`\${API_BASE}/ordemservico/clonar\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${localStorage.getItem('sinco_token')}\`
                },
                body: JSON.stringify({
                    IdOrdemServico: os.IdOrdemServico,
                    novoIdProjeto: cloneProjetoId,
                    novoIdTag: cloneTagId,
                    novaDescricao: cloneDescricao,
                    novoFator: cloneFator,
                    usuarioNome: localStorage.getItem('user_name') || 'Usuario Web'
                })
            });

            const data = await response.json();
            if (data.success) {
                setShowModalClonar(null);
                addToast({ type: 'success', title: 'Sucesso', message: \`OS clonada perfeitamente! Nova OS ID: \${data.novoId}\` });
                fetchOrdens(1);
            } else {
                addToast({ type: 'error', title: 'Erro na Clonagem', message: data.message || 'Erro ao duplicar a OS.' });
            }
        } catch (error: any) {
            console.error('Erro ao clonar O.S:', error);
            addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha ao se comunicar com a API de Clonagem.' });
        } finally {
            setLiberandoOS(null);
        }
    };
`;
if (content.includes(handlerTarget) && !content.includes('const handleOpenClonarOS')) {
    content = content.replace(handlerTarget, newFunctions + "\n    " + handlerTarget);
}

// 4. Update the Button to use handleOpenClonarOS instead of handleClonarOS
content = content.replace(/handleClonarOS\(/g, 'handleOpenClonarOS(');

// 5. Inject the JSX Modal right before the closing </div> of return (
// Wait, the main return of OrdemServico terminates with:
//            </AnimatePresence>
//        </div>
//    );
const modalJSX = `
            {/* Modal Clonar O.S Inter-Projetos */}
            <AnimatePresence>
            {showModalClonar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Clonar O.S {showModalClonar.IdOrdemServico}</h3>
                            <button onClick={() => setShowModalClonar(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Novo Projeto Destino</label>
                                <select
                                    value={cloneProjetoId}
                                    onChange={(e) => { setCloneProjetoId(e.target.value); setCloneTagId(''); }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-accent focus:border-accent"
                                >
                                    <option value="">Selecione um Projeto...</option>
                                    {projetos.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Tag Destino</label>
                                <select
                                    value={cloneTagId}
                                    onChange={(e) => setCloneTagId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-accent focus:border-accent"
                                >
                                    <option value="">Selecione uma Tag...</option>
                                    {tags.filter(t => !cloneProjetoId || String(t.projetoId) === String(cloneProjetoId)).map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Descrição</label>
                                <input
                                    type="text"
                                    value={cloneDescricao}
                                    onChange={(e) => setCloneDescricao(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-accent focus:border-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fator Multiplicador</label>
                                <input
                                    type="number"
                                    min="0.1" step="0.1"
                                    value={cloneFator}
                                    onChange={(e) => setCloneFator(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-accent focus:border-accent"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button
                                onClick={() => setShowModalClonar(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border rounded-lg bg-white"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => executeClone(showModalClonar)}
                                disabled={!cloneProjetoId || !cloneTagId || liberandoOS === showModalClonar.IdOrdemServico}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow flex items-center gap-2 rounded-lg disabled:opacity-50"
                            >
                                {liberandoOS === showModalClonar.IdOrdemServico ? 'Processando...' : 'Confirmar Cópia'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
`;

const rootEnd = `            </AnimatePresence>
        </div>
    );`;

if (content.includes(rootEnd) && !content.includes('Modal Clonar O.S Inter-Projetos')) {
    content = content.replace(rootEnd, modalJSX + "\n" + rootEnd);
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Frontend Modal Injectado!');
