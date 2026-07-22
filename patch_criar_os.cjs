const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'CriarOrdemServico.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('ModalIncluirMaterialOS')) {
    content = content.replace(
        "import { useAuth } from '../contexts/AuthContext';",
        "import { useAuth } from '../contexts/AuthContext';\nimport ModalIncluirMaterialOS from '../components/ModalIncluirMaterialOS';"
    );
}

// 2. Add states
if (!content.includes('const [showModal, setShowModal] = useState(false);')) {
    content = content.replace(
        "const [saving, setSaving] = useState(false);",
        "const [saving, setSaving] = useState(false);\n  const [showModal, setShowModal] = useState(false);\n  const [newOsId, setNewOsId] = useState<number>(0);\n  const [newOsContext, setNewOsContext] = useState<any>(null);"
    );
}

// 3. Update handleSubmit success logic
const oldSuccessLogic = `      if (json.success) {
        setMessage({ type: 'success', text: 'Ordem de Serviço criada com sucesso!' });
        setFormData({
          IdProjeto: '', Projeto: '', IdTag: '', Tag: '', DescTag: '', Descricao: '',
          IdEmpresa: '', DescEmpresa: '', EnderecoOrdemServico: '', DataPrevisao: '',
          ProdutoPadrao: '', CodDesenhoProduto: '', DescricaoProduto: '', ProdutoCriadoPor: '',
          DataCriacaoProduto: '', Fator: '1', TipoLiberacaoOrdemServico: 'Total'
        });
        setTags([]);
      } else {`;

const newSuccessLogic = `      if (json.success) {
        setNewOsId(json.id);
        setNewOsContext(payload);
        setShowModal(true);
      } else {`;

if (content.includes(oldSuccessLogic)) {
    content = content.replace(oldSuccessLogic, newSuccessLogic);
}

// 4. Add handleModalSuccess
if (!content.includes('const handleModalSuccess')) {
    const handleSuccessFn = `
  const handleModalSuccess = () => {
    setMessage({ type: 'success', text: 'Ordem de Serviço criada e itens incluídos com sucesso!' });
    setFormData({
      IdProjeto: '', Projeto: '', IdTag: '', Tag: '', DescTag: '', Descricao: '',
      IdEmpresa: '', DescEmpresa: '', EnderecoOrdemServico: '', DataPrevisao: '',
      ProdutoPadrao: '', CodDesenhoProduto: '', DescricaoProduto: '', ProdutoCriadoPor: '',
      DataCriacaoProduto: '', Fator: '1', TipoLiberacaoOrdemServico: 'Total'
    });
    setTags([]);
    setShowModal(false);
  };
`;
    content = content.replace(
        "const inputClass = \"w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#32423D] bg-white\";",
        handleSuccessFn + "\n  const inputClass = \"w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:outline-none focus:border-[#32423D] bg-white\";"
    );
}

// 5. Add Modal to JSX
if (!content.includes('<ModalIncluirMaterialOS')) {
    content = content.replace(
        "    </div>\n  );\n}",
        `      <ModalIncluirMaterialOS 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          // Opcional: Se o usuário fechar o modal sem incluir, limpa o form também.
          handleModalSuccess();
        }}
        osId={newOsId}
        osContext={newOsContext}
        onSuccess={handleModalSuccess}
        token={token}
      />
    </div>
  );
}`
    );
}

fs.writeFileSync(file, content, 'utf8');
console.log('CriarOrdemServico.tsx patched successfully');
