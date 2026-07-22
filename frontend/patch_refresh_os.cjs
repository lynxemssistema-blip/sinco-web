const fs = require('fs');

const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/OrdemServico.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add refreshOS function below fetchItens
const refreshOSCode = `
    const refreshOS = useCallback(async (osId: number) => {
        try {
            const res = await fetch(\`\${API_BASE}/ordemservico/\${osId}\`);
            const json = await res.json();
            if (json.success && json.data) {
                setOrdens(prev => prev.map(o => o.IdOrdemServico === osId ? { ...o, ...json.data } : o));
            }
        } catch (e) {
            console.error('Erro ao atualizar OS', e);
        }
    }, []);
`;

if (!content.includes('const refreshOS = useCallback')) {
    content = content.replace(
        /const fetchItens = useCallback\(async \(osId: number\) => \{/,
        refreshOSCode + '\n    const fetchItens = useCallback(async (osId: number) => {'
    );
}

// 2. Call refreshOS in ExcluirItensModal onSuccess
content = content.replace(
    /fetchItens\(showModalExcluirItens\.IdOrdemServico\);/g,
    `fetchItens(showModalExcluirItens.IdOrdemServico);\n                        refreshOS(showModalExcluirItens.IdOrdemServico);`
);

// 3. Call refreshOS in handleDeleteSelected
content = content.replace(
    /addToast\(\{ type: 'success', title: 'Concluído', message: 'Itens excluídos com sucesso!' \}\);/g,
    `addToast({ type: 'success', title: 'Concluído', message: 'Itens excluídos com sucesso!' });\n            refreshOS(osId);`
);

// 4. Call refreshOS in ModalIncluirMaterialOS onSuccess
content = content.replace(
    /fetchItens\(showModalIncluirItens\.IdOrdemServico\);/g,
    `fetchItens(showModalIncluirItens.IdOrdemServico);\n                        refreshOS(showModalIncluirItens.IdOrdemServico);`
);

fs.writeFileSync(file, content, 'utf8');
console.log('OrdemServico.tsx patched successfully');
