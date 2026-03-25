const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, 'frontend/src/pages/OrdemServico.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Copy to lucide-react
if (!content.includes('Copy,')) {
    content = content.replace('RotateCcw, Hash', 'RotateCcw, Hash, Copy');
}

// 2. Add handleClonarOS function
const handlerTarget = "    const renderOSDetail = (os: OrdemServico) => {";
const handlerCode = `
    const handleClonarOS = async (os: OrdemServico) => {
        const result = await Swal.fire({
            title: 'Criando Cópia da OS Corrente',
            html: \`Deseja criar uma nova OS baseada na <b>OS: \${os.IdOrdemServico}</b>?<br/><br/>Informe o Fator Multiplicador (Padrão informando 1) para escalar \${os.Tag || 'esta OP'}:\`,
            input: 'number',
            inputValue: 1,
            showCancelButton: true,
            confirmButtonText: 'Sim, Criar Cópia',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            inputValidator: (value) => {
                if (!value || isNaN(Number(value)) || Number(value) <= 0) {
                    return 'Informe um Fator Multiplicador válido (maior que 0)!';
                }
            }
        });

        if (result.isConfirmed) {
            const fator = result.value;
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
                        novoFator: fator,
                        usuarioNome: localStorage.getItem('user_name') || 'Usuario Web'
                    })
                });

                const data = await response.json();
                if (data.success) {
                    addToast({ type: 'success', title: 'Sucesso', message: \`Ordem de Serviço clonada com sucesso! Nova OS ID: \${data.novoId}\` });
                    fetchOrdens(1);
                } else {
                    addToast({ type: 'error', title: 'Erro na Clonagem', message: data.message || 'Erro ao duplicar a OS.' });
                }
            } catch (error: any) {
                console.error('Erro ao clonar O.S:', error);
                addToast({ type: 'error', title: 'Erro de Conexão', message: 'Falha ao se comunicar com o Servidor.' });
            } finally {
                setLiberandoOS(null);
            }
        }
    };
`;
if (content.includes(handlerTarget) && !content.includes('const handleClonarOS')) {
    content = content.replace(handlerTarget, handlerCode + "\n" + handlerTarget);
}

// 3. Add the frontend Button inside renderOSDetail
const btnTarget = `                            {os.OrdemServicoFinalizado !== 'C' && (
                                <button 
                                    onClick={() => handleFinalizarOS(os)}`;

const btnCode = `                            <button 
                                onClick={() => handleClonarOS(os)}
                                disabled={liberandoOS === os.IdOrdemServico}
                                className="p-2.5 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors shadow-sm disabled:opacity-50"
                                title="Criar Cópia (Duplicar) desta Ordem de Serviço"
                            >
                                <Copy size={18} />
                            </button>

`;
if (content.includes(btnTarget) && !content.includes('handleClonarOS(os)')) {
    content = content.replace(btnTarget, btnCode + btnTarget);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Frontend OrdemServico.tsx patched for Clonagem successfully.');
