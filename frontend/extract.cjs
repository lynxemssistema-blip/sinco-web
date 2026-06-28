const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'OrdemServico.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// The JSX Replacement
const startMarker = "{/* Modal de Clonar OS */}";
const endMarker = "</div>\n        );\n}";

const startIndex = code.indexOf(startMarker);
const endIndex = code.lastIndexOf("</div>\n        );\n}");

if (startIndex !== -1 && endIndex !== -1) {
    const newJSX = `{/* Modal de Clonar OS */}
            <AnimatePresence>
                {showModalClonar && (
                    <CloneOSModal
                        os={showModalClonar}
                        onClose={() => setShowModalClonar(null)}
                        projetosClonagem={projetosClonagem}
                        onSuccess={() => fetchOrdens(1)}
                        userNome={user?.nome}
                    />
                )}
            </AnimatePresence>

            {/* Modal Excluir Itens da OS */}
            <ExcluirItensModal
                os={showModalExcluirItens}
                itensOS={showModalExcluirItens ? ordensItens[showModalExcluirItens.IdOrdemServico] || [] : []}
                isLoadingOS={showModalExcluirItens ? loadingItens.has(showModalExcluirItens.IdOrdemServico) : false}
                onClose={() => setShowModalExcluirItens(null)}
                onSuccess={() => fetchOrdens(true)}
            />

            {/* Incluir Itens Modal */}
            <IncluirItensModal
                os={showModalIncluirItens}
                onClose={() => setShowModalIncluirItens(null)}
                onSuccess={(osId) => {
                    setOrdensItens(prev => { const n = { ...prev }; delete n[osId]; return n; });
                    setLoadingItens(prev => { const n = new Set(prev); n.add(osId); return n; });
                    fetch(\`\${API_BASE}/ordemservico/\${osId}/itens\`).then(r => r.json()).then(d => {
                        if (d.success) setOrdensItens(prev => ({ ...prev, [osId]: d.data }));
                        setLoadingItens(prev => { const n = new Set(prev); n.delete(osId); return n; });
                    });
                }}
            />

            {/* Fator Modal */}
            {liberacaoFatorModal && (
                <FatorOSModal
                    os={liberacaoFatorModal}
                    onClose={() => setLiberacaoFatorModal(null)}
                    onConfirm={(fator) => {
                        setLiberacaoFatorModal(null);
                        proceedWithLiberacao(liberacaoFatorModal, fator);
                    }}
                />
            )}

            {/* Pendencia Modal */}
            <PendenciaModal 
                pendenciaModalOpen={pendenciaModalOpen} 
                setPendenciaModalOpen={setPendenciaModalOpen} 
                selectedItemRnc={selectedItemRnc} 
                visibleSetores={visibleSetores} 
            />
        `;
    
    code = code.substring(0, startIndex) + newJSX + "\n" + code.substring(endIndex);
}

// Write the fix back
fs.writeFileSync(filePath, code);
console.log('Modals substituted in JSX successfully');
