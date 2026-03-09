const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Projeto.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace interface Projeto
const interfaceTarget = `interface Projeto {
    IdProjeto?: number;
    Projeto: string;
    DescProjeto?: string;
    ClienteProjeto?: string;
    Responsavel?: string;
    DataPrevisao?: string;
    PrazoEntrega?: string;
    StatusProj?: string;
    DescStatus?: string;
    Descricao?: string;
}`;
const interfaceReplacement = `interface Projeto {
    IdProjeto?: number;
    Projeto: string;
    DescProjeto?: string;
    ClienteProjeto?: string;
    Responsavel?: string;
    DataPrevisao?: string;
    PrazoEntrega?: string;
    StatusProj?: string;
    DescStatus?: string;
    Descricao?: string;
    UF?: string;
    EntradaPedido?: string;
    PlanejadoFinanceiro?: string;
}`;
content = content.replace(interfaceTarget, interfaceReplacement);

// 2. Replace emptyProjetoForm
const emptyFormTarget = `const emptyProjetoForm: Projeto = {
    Projeto: '',
    DescProjeto: '',
    ClienteProjeto: '',
    Responsavel: '',
    DataPrevisao: '',
    PrazoEntrega: '',
    StatusProj: 'AT',
    DescStatus: 'Ativo',
    Descricao: '',
};`;
const emptyFormReplacement = `const emptyProjetoForm: Projeto = {
    Projeto: '',
    DescProjeto: '',
    ClienteProjeto: '',
    Responsavel: '',
    DataPrevisao: '',
    PrazoEntrega: '',
    StatusProj: 'AT',
    DescStatus: 'Ativo',
    Descricao: '',
    UF: '',
    EntradaPedido: '',
    PlanejadoFinanceiro: '',
};`;
content = content.replace(emptyFormTarget, emptyFormReplacement);

// 3. Replace Modal content
const modalMatch = content.match(/\{\/\* Projeto Form Modal \*\/\}[\s\S]*?(?=\{\/\* Tag Form Modal \*\/})/);

if (modalMatch) {
    const modalReplacement = `{/* Projeto Form Modal */}
            <AnimatePresence>
                {showProjetoForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
                        onClick={(e) => e.target === e.currentTarget && resetProjetoForm()}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden border border-gray-100"
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

                                {/* Main Body: 70/30 Split Layout */}
                                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                    
                                    {/* Left Side: Form (70%) */}
                                    <div className="flex-[2] p-6 space-y-5">
                                        <div className="flex items-start gap-4">
                                            {isEditingProjeto && (
                                                <div className="w-24 shrink-0">
                                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">ID</label>
                                                    <input type="text" value={projetoFormData.IdProjeto || ''} readOnly className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm font-mono text-gray-500 cursor-not-allowed focus:outline-none rounded-none" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Nome Projeto <span className="text-red-500">*</span></label>
                                                <input type="text" name="Projeto" value={projetoFormData.Projeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D] transition-all rounded-none" required />
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-[3]">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Cliente</label>
                                                <select name="ClienteProjeto" value={projetoFormData.ClienteProjeto || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] transition-all appearance-none rounded-none">
                                                    <option value="">Selecione...</option>
                                                    {clienteOptions.map(opt => <option key={opt.id} value={opt.label}>{opt.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">UF</label>
                                                <select name="UF" value={projetoFormData.UF || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] transition-all appearance-none rounded-none">
                                                    <option value="">-</option>
                                                    <option value="SP">SP</option><option value="RJ">RJ</option><option value="MG">MG</option>
                                                    <option value="RS">RS</option><option value="PR">PR</option><option value="SC">SC</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Responsável Técnico</label>
                                            <input type="text" name="Responsavel" value={projetoFormData.Responsavel || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] transition-all rounded-none" />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-700 mb-1.5">Descrição</label>
                                            <textarea name="Descricao" value={projetoFormData.Descricao || ''} onChange={handleProjetoInputChange} rows={4} className="w-full px-3 py-2 bg-white border border-gray-200 text-sm focus:outline-none focus:border-[#32423D] transition-all resize-none rounded-none" placeholder="Detalhes do projeto..."></textarea>
                                        </div>
                                    </div>

                                    {/* Right Side: Reserved Space (30%) */}
                                    <div className="flex-1 bg-gray-50/50 p-6 flex flex-col min-h-[300px]">
                                        <div className="flex-1 border-2 border-dashed border-gray-300 bg-gray-50/80 flex flex-col items-center justify-center text-gray-400 p-6 text-center space-y-3">
                                            <TagIcon size={32} className="text-gray-300 opacity-60" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-gray-500">Área de Tags</p>
                                                <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed">Este espaço será utilizado para listar e gerenciar as tags atreladas ao projeto.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Prazos e Datas */}
                                <div className="bg-white border-t border-gray-200 p-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Previsão Entrega */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#E0E800] bg-[#32423D] inline-block px-2 py-0.5 rounded-sm">Cronograma</h3>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Data Prev. Entrega</label>
                                                    <input type="date" name="DataPrevisao" value={projetoFormData.DataPrevisao || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-1.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                                </div>
                                                <div className="w-24 shrink-0">
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Dias (Prazo)</label>
                                                    <input type="text" name="PrazoEntrega" value={projetoFormData.PrazoEntrega || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-1.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] text-center rounded-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dados do Comercial */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200 pb-1">Dados do Comercial</h3>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Entrada Pedido</label>
                                                <input type="date" name="EntradaPedido" value={projetoFormData.EntradaPedido || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-1.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                            </div>
                                        </div>

                                        {/* Dados do Financeiro */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 border-b border-gray-200 pb-1">Dados do Financeiro</h3>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">Planejado Financeiro</label>
                                                <input type="date" name="PlanejadoFinanceiro" value={projetoFormData.PlanejadoFinanceiro || ''} onChange={handleProjetoInputChange} className="w-full px-3 py-1.5 bg-white border border-gray-300 text-sm focus:outline-none focus:border-[#32423D] rounded-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            `;
    content = content.replace(modalMatch[0], modalReplacement);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced standard modal with new 70/30 extended layout.');
} else {
    console.error('Could not find modal section!');
}
