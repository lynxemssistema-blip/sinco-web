const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'frontend/src/pages/OrdemServico.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Hash to lucide-react and import Swal
if (!content.includes('Hash')) {
    content = content.replace('RotateCcw', 'RotateCcw, Hash');
}
if (!content.includes("import Swal from 'sweetalert2';")) {
    content = content.replace("import { useToast } from '../contexts/ToastContext';", "import { useToast } from '../contexts/ToastContext';\nimport Swal from 'sweetalert2';");
}

// 2. Add NumeroOPOmie to OrdemServico interface
const interfaceTarget = `    EnderecoOrdemServico?: string;
}`;
if (content.includes(interfaceTarget) && !content.includes('NumeroOPOmie?: string;')) {
    content = content.replace(interfaceTarget, "    EnderecoOrdemServico?: string;\n    NumeroOPOmie?: string;\n}");
}

// 3. Add handleInserirOpOmie function
const handlerTarget = "    const renderOSDetail = (os: OrdemServico) => {";
const handlerCode = `
    const handleInserirOpOmie = async (os: OrdemServico) => {
        const result = await Swal.fire({
            title: 'OMIE',
            text: 'Informe o número da Ordem de Produção do OMIE',
            input: 'text',
            inputValue: os.NumeroOPOmie || '',
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'O número da OP do OMIE não pode estar vazio!';
                }
            }
        });

        if (result.isConfirmed) {
            const numeroOp = result.value;
            setLiberandoOS(os.IdOrdemServico);
            try {
                const response = await fetch(\`\${API_BASE}/ordemservico/numero-op\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${localStorage.getItem('sinco_token')}\`
                    },
                    body: JSON.stringify({
                        IdOrdemServico: os.IdOrdemServico,
                        NumeroOPOmie: numeroOp.trim()
                    })
                });

                const data = await response.json();
                if (data.success) {
                    addToast({ type: 'success', title: 'Sucesso', message: \`Número OP \${numeroOp} associado com sucesso à OS \${os.IdOrdemServico}!\` });
                    fetchOrdens(1);
                } else {
                    addToast({ type: 'error', title: 'Erro', message: data.message || 'Erro ao atualizar número OP do OMIE.' });
                }
            } catch (error: any) {
                console.error('Erro ao atualizar OP do OMIE:', error);
                addToast({ type: 'error', title: 'Erro de Conexão', message: 'Não foi possível conectar ao servidor.' });
            } finally {
                setLiberandoOS(null);
            }
        } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            addToast({ type: 'info', title: 'Aviso', message: 'Operação cancelada pelo usuário.' });
        }
    };
`;
if (content.includes(handlerTarget) && !content.includes('const handleInserirOpOmie')) {
    content = content.replace(handlerTarget, handlerCode + "\n" + handlerTarget);
}

// 4. Add the frontend Button inside renderOSDetail
const btnTarget = `                            <button 
                                onClick={() => handleAlterarFator(os)}`;

const btnCode = `                            {os.Liberado_Engenharia === 'S' && os.OrdemServicoFinalizado !== 'C' && (
                                <button 
                                    onClick={() => handleInserirOpOmie(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Informar Ordem de Produção ERP (OMIE)"
                                >
                                    <Hash size={18} />
                                </button>
                            )}
`;
if (content.includes(btnTarget) && !content.includes('handleInserirOpOmie(os)')) {
    content = content.replace(btnTarget, btnCode + "\n" + btnTarget);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Frontend OrdemServico.tsx patched successfully.');
