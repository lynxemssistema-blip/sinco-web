const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/OrdemServico.tsx', 'utf8');

// Replace handleLiberarOS with the new behavior and add handleCancelarLiberacao
const oldHandleLiberarOS = \`
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
            const res = await fetch(\\\`\${API_BASE}/ordemservico/liberar\\\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \\\`Bearer \${token}\\\` },
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
                addToast({ type: 'success', title: 'Sucesso', message: \\\`Ordem de Serviço \${os.IdOrdemServico} liberada com sucesso (\${tipoLiberacao})!\\\` });
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
\`;

const newHandleLiberarOS = \`
    const handleLiberarOS = async (os: OrdemServico) => {
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
            const res = await fetch(\\\`\${API_BASE}/ordemservico/liberar\\\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \\\`Bearer \${token}\\\` },
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
                addToast({ type: 'success', title: 'Sucesso', message: \\\`Ordem de Serviço \${os.IdOrdemServico} liberada! (\${tipoLiberacao})\\\` });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: 'S', OrdemServicoFinalizado: 'C' } : o));
            } else {
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao liberar.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };

    const handleCancelarLiberacao = async (os: OrdemServico) => {
        if (!window.confirm(\\\`Ao cancelar a liberação da Ordem de Serviço nº \${os.IdOrdemServico}\\nCaso existam Planos de Corte vinculados aos itens desta OS e não haja execução, os respectivos itens serão automaticamente cancelados. Deseja prosseguir?\\\`)) {
            return;
        }

        setLiberandoOS(os.IdOrdemServico); // Reuse the loading state
        try {
            const token = localStorage.getItem('sinco_token');
            const res = await fetch(\\\`\${API_BASE}/ordemservico/cancelar-liberacao\\\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': \\\`Bearer \${token}\\\` },
                body: JSON.stringify({ IdOrdemServico: os.IdOrdemServico })
            });
            const json = await res.json();
            if (json.success) {
                addToast({ type: 'success', title: 'Sucesso', message: 'Liberação da Ordem de Serviço cancelada!' });
                setOrdens(prev => prev.map(o => o.IdOrdemServico === os.IdOrdemServico ? { ...o, Liberado_Engenharia: '', TipoLiberacaoOrdemServico: '' } : o));
            } else {
                // Keep newline characters in error message properly
                addToast({ type: 'error', title: 'Erro', message: json.message || 'Falha ao cancelar liberação.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Erro', message: 'Falha de comunicação com o servidor.' });
        } finally {
            setLiberandoOS(null);
        }
    };
\`;

if (code.includes('const handleLiberarOS = async (os: OrdemServico) => {')) {
    // We substring replace everything from the signature down to the end of the method
    // Because JS replace string may have indentation mismatch, we use index.
    const startIdx = code.indexOf('const handleLiberarOS = async (os: OrdemServico) => {');
    const endIdx = code.indexOf('const renderOSDetail = (os: OrdemServico) => {');
    
    if (startIdx !== -1 && endIdx !== -1) {
        code = code.substring(0, startIdx) + newHandleLiberarOS + '\\n\\n    ' + code.substring(endIdx);
    }
}

// Now replace the detail view buttons
const oldButtons = \`
                        <button 
                            onClick={() => handleLiberarOS(os)}
                            disabled={liberandoOS === os.IdOrdemServico}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 disabled:opacity-50 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-medium text-sm shadow-sm"
                        >
                            {liberandoOS === os.IdOrdemServico ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            {os.Liberado_Engenharia === 'S' ? 'Atualizar Liberação' : 'Liberar Ordem de Serviço'}
                        </button>\`;

const newButtons = \`
                        <div className="flex items-center gap-2">
                            {os.Liberado_Engenharia !== 'S' ? (
                                <button 
                                    onClick={() => handleLiberarOS(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Liberar Ordem de Serviço"
                                >
                                    {liberandoOS === os.IdOrdemServico ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        addToast({ type: 'info', title: 'Atenção', message: 'A OS já está liberada! Utilize o botão Cancelar Liberação se precisar reverter.' });
                                    }}
                                    className="p-2.5 bg-gray-50 text-green-500 border border-gray-200 rounded-lg cursor-not-allowed opacity-60"
                                    title="Ordem de Serviço já liberada"
                                >
                                    <CheckCircle size={18} />
                                </button>
                            )}

                            {os.Liberado_Engenharia === 'S' && (
                                <button 
                                    onClick={() => handleCancelarLiberacao(os)}
                                    disabled={liberandoOS === os.IdOrdemServico}
                                    className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                                    title="Cancelar Liberação Engenharia"
                                >
                                    {liberandoOS === os.IdOrdemServico ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                </button>
                            )}
                        </div>\`;

// Try to replace the button cluster. Since whitespace might differ, let's use a simpler regex or index finding.
if (code.includes('onClick={() => handleLiberarOS(os)}')) {
    const buttonStart = code.lastIndexOf('<button', code.indexOf('onClick={() => handleLiberarOS(os)}'));
    const buttonEnd = code.indexOf('</button>', buttonStart) + 9;
    
    if (buttonStart !== -1 && buttonEnd > buttonStart) {
        code = code.substring(0, buttonStart) + newButtons + code.substring(buttonEnd);
    }
}

fs.writeFileSync('frontend/src/pages/OrdemServico.tsx', code);
console.log('Frontend updated.');
