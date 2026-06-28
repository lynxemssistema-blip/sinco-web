const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
let txt = fs.readFileSync(file, 'utf8');

const targetFetch = "// Fetch history for RNC grid
                                                                    setLoadingPendencias(true);
                                                                    fetch(\${API_BASE}/producao/pendencias/historico?codMatFabricante=$\{encodeURIComponent(item.CodMatFabricante || '')}\)\n                                                                        .then(res => res.json())\n                                                                        .then(json => {\n                                                                            if (json.success) setPendenciasHistorico(json.data);\n                                                                            else setPendenciasHistorico([]);\n                                                                        })\n                                                                        .catch(() => setPendenciasHistorico([]))\n                                                                        .finally(() => setLoadingPendencias(false));";

const targetFunc = "const handleNovaPendencia = () => {";

const replacementFunc = "const fetchHistoricoRNC = async (codMat: string) => {\n        if (!codMat) return;\n        setLoadingPendencias(true);\n        let url = \${API_BASE}/producao/pendencias/historico?codMatFabricante=\ + encodeURIComponent(codMat);\n        if (searchQuery1) url += '&q1=' + encodeURIComponent(searchQuery1);\n        if (searchQuery2) url += '&q2=' + encodeURIComponent(searchQuery2);\n        \n        try {\n            const res = await fetch(url);\n            const json = await res.json();\n            if (json.success) setPendenciasHistorico(json.data);\n            else setPendenciasHistorico([]);\n        } catch (error) {\n            setPendenciasHistorico([]);\n        } finally {\n            setLoadingPendencias(false);\n        }\n    };\n\n    useEffect(() => {\n        if (selectedItem?.CodMatFabricante && pendenciaModalOpen) {\n            const timeoutId = setTimeout(() => {\n                fetchHistoricoRNC(selectedItem.CodMatFabricante || '');\n            }, 500);\n            return () => clearTimeout(timeoutId);\n        }\n    }, [searchQuery1, searchQuery2, pendenciaModalOpen]);\n\n    const handleNovaPendencia = () => {";

if(txt.includes('fetch(${API_BASE}/producao/pendencias/historico?codMatFabricante=')){
    txt = txt.replace(/fetch\([\s\S]*?historico[\s\S]*?finally\([\s\S]*?\);/g, match => {
        if(match.includes('producao/pendencias/historico')) {
            return "fetchHistoricoRNC(item.CodMatFabricante || '');";
        }
        return match;
    });
}

if(!txt.includes('fetchHistoricoRNC')) {
   txt = txt.replace('const handleNovaPendencia = () => {', replacementFunc);
}

fs.writeFileSync(file, txt, 'utf8');
console.log('Done!');
