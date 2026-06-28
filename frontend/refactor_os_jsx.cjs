const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'OrdemServico.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add imports at the top
const imports = `import { CloneOSModal } from '../components/OrdemServico/CloneOSModal';
import { IncluirItensModal } from '../components/OrdemServico/IncluirItensModal';
import { ExcluirItensModal } from '../components/OrdemServico/ExcluirItensModal';
import { PendenciaModal } from '../components/OrdemServico/PendenciaModal';
import { FatorOSModal } from '../components/OrdemServico/FatorOSModal';
import Swal from 'sweetalert2';`;

if (!code.includes('CloneOSModal')) {
    code = code.replace("import { useAuth } from '../contexts/AuthContext';", `import { useAuth } from '../contexts/AuthContext';\n${imports}`);
}

// 2. Remove states and functions that were moved (e.g. Pendencia states)
const statesToRemove = [
    'const [isGeneratingRNC, setIsGeneratingRNC] = useState(false);',
    'const [novaRnc, setNovaRnc] = useState',
    'const [showToast, setShowToast] = useState(false);',
    'const [toastMessage, setToastMessage] = useState',
    'const [showConfirmModal, setShowConfirmModal] = useState(false);',
    'const [selectedPendenciaToDelete, setSelectedPendenciaToDelete] = useState',
    'const [uploading, setUploading] = useState(false);',
    'const [uploadProgress, setUploadProgress] = useState(0);',
    'const [uploadingItemIndex, setUploadingItemIndex] = useState'
];

statesToRemove.forEach(state => {
    const regex = new RegExp(`^.*${state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$\\n`, 'gm');
    code = code.replace(regex, '');
});

// 3. Find the JSX Modals in the render method and replace them.
// We'll replace everything from "{/* Modal de Clonar OS */}" to the end of the div before "  );"
// Let's use string split and indexing.

const startMarker = "{/* Modal de Clonar OS */}";
const endMarker = "</div>\n    );\n}";

const startIndex = code.indexOf(startMarker);
const endIndex = code.lastIndexOf(endMarker);

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
    
    code = code.substring(0, startIndex) + newJSX + "\n      " + code.substring(endIndex);
}

fs.writeFileSync(filePath, code);
console.log('Modals substituted in JSX');
