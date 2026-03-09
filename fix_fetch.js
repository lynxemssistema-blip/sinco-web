const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/ApontamentoProducao.tsx';
let txt = fs.readFileSync(file, 'utf8');

const regex = /fetch\(`\$\{API_BASE\}\/producao\/pendencias\/historico\?codMatFabricante=\$\{encodeURIComponent\(item\.CodMatFabricante \|\| ''\)\}`\)(.*?)\.finally\(\(\) => setLoadingPendencias\(false\)\);/s;

txt = txt.replace(regex, "fetchHistoricoRNC(item.CodMatFabricante || '');");

const replacementFunc = `const fetchHistoricoRNC = async (codMat: string) => {
        if (!codMat) return;
        setLoadingPendencias(true);
        let url = \`\${API_BASE}/producao/pendencias/historico?codMatFabricante=\` + encodeURIComponent(codMat);
        if (searchQuery1) url += '&q1=' + encodeURIComponent(searchQuery1);
        if (searchQuery2) url += '&q2=' + encodeURIComponent(searchQuery2);
        
        try {
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) setPendenciasHistorico(json.data);
            else setPendenciasHistorico([]);
        } catch (error) {
            setPendenciasHistorico([]);
        } finally {
            setLoadingPendencias(false);
        }
    };

    useEffect(() => {
        if (selectedItem?.CodMatFabricante && pendenciaModalOpen) {
            const timeoutId = setTimeout(() => {
                fetchHistoricoRNC(selectedItem.CodMatFabricante || '');
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery1, searchQuery2, pendenciaModalOpen]);

    const handleNovaPendencia = () => {`;

if (!txt.includes('fetchHistoricoRNC')) {
    txt = txt.replace('const handleNovaPendencia = () => {', replacementFunc);
}

fs.writeFileSync(file, txt, 'utf8');
console.log('Done replacement!');
