const fs = require('fs');
const filePath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldEndpoint = /app\.post\('\/api\/ordemservicoitem\/:id\/toggle-principal', async \(req, res\) => {[\s\S]*?\}\);/g;

const newEndpoint = `app.post('/api/ordemservicoitem/:id/toggle-principal', async (req, res) => {
    let connection = null;
    try {
        const { id } = req.params;
        const { marcar, idOrdemServico, codMatFabricante, descResumo, descDetal } = req.body;
        
        connection = await (req.tenantDbPool || pool).getConnection();
        
        if (marcar) {
            // Unmark any existing principal for this OS
            const [oldPrincipalRows] = await connection.execute("SELECT CodMatFabricante FROM ordemservicoitem WHERE IdOrdemServico = ? AND ProdutoPrincipal = 'SIM'", [idOrdemServico]);
            
            if (oldPrincipalRows.length > 0) {
                const oldCodMat = oldPrincipalRows[0].CodMatFabricante;
                await connection.execute("UPDATE ordemservicoitem SET ProdutoPrincipal = NULL WHERE IdOrdemServico = ? AND ProdutoPrincipal = 'SIM'", [idOrdemServico]);
                if (oldCodMat) {
                    await connection.execute("UPDATE material SET ProdutoPrincipal = NULL WHERE CodMatFabricante = ?", [oldCodMat]);
                }
            }
            
            // Mark new item as SIM
            await connection.execute("UPDATE ordemservicoitem SET ProdutoPrincipal = 'SIM' WHERE IdOrdemServicoItem = ?", [id]);
            
            // Get material background
            const [matRows] = await connection.execute("SELECT EnderecoImagem FROM material WHERE CodMatFabricante = ?", [codMatFabricante]);
            const enderecoImagem = matRows.length > 0 ? matRows[0].EnderecoImagem : null;
            
            // Update OS and Material
            await connection.execute("UPDATE ordemservico SET EnderecoImagem = ?, CodDesenhoProduto = ?, DescricaoProduto = ? WHERE IdOrdemServico = ?", [enderecoImagem, codMatFabricante, \`\${descResumo || ''}-\${descDetal || ''}\`, idOrdemServico]);
            await connection.execute("UPDATE material SET ProdutoPrincipal = 'SIM' WHERE CodMatFabricante = ?", [codMatFabricante]);
            
            res.json({ success: true, message: 'Item marcado como Conjunto Principal.' });
            
        } else {
            // Unmark
            await connection.execute("UPDATE ordemservicoitem SET ProdutoPrincipal = NULL WHERE IdOrdemServicoItem = ?", [id]);
            await connection.execute("UPDATE ordemservico SET EnderecoImagem = NULL, CodDesenhoProduto = NULL, DescricaoProduto = NULL WHERE IdOrdemServico = ?", [idOrdemServico]);
            await connection.execute("UPDATE material SET ProdutoPrincipal = NULL WHERE CodMatFabricante = ?", [codMatFabricante]);
            
            res.json({ success: true, message: 'Item desmarcado como Conjunto Principal.' });
        }
    } catch (err) {
        console.error('Erro no toggle ProdutoPrincipal:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});`;

content = content.replace(oldEndpoint, newEndpoint);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed toggle-principal endpoint to allow seamless swapping.');
