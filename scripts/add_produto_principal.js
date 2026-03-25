const fs = require('fs');
const filePath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace SELECT query
content = content.replace(
    /CodMatFabricante, MaterialSW, EnderecoArquivo,\s+OrdemServicoItemFinalizado as Finalizado,/,
    "CodMatFabricante, MaterialSW, EnderecoArquivo,\n                ProdutoPrincipal,\n                OrdemServicoItemFinalizado as Finalizado,"
);

const deleteRouteStr = `// --- Ícone 5: Excluir linha OS ---
app.delete('/api/ordemservicoitem/:id', async (req, res) => {`;

const newRoutes = `// --- Marcar/Desmarcar Conjunto Principal ---
app.post('/api/ordemservicoitem/:id/toggle-principal', async (req, res) => {
    let connection = null;
    try {
        const { id } = req.params;
        const { marcar, idOrdemServico, codMatFabricante, descResumo, descDetal } = req.body;
        
        connection = await (req.tenantDbPool || pool).getConnection();
        
        if (marcar) {
            // Check if already has a principal
            const [countRows] = await connection.execute("SELECT count(IdOrdemServicoItem) as count FROM ordemservicoitem WHERE IdOrdemServico = ? AND ProdutoPrincipal = 'SIM'", [idOrdemServico]);
            if (countRows[0].count > 0) {
                return res.status(400).json({ success: false, message: 'Produto Principal já especificado para esta Ordem Servico!' });
            }
            
            // Mark item as SIM
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
});

// --- Ícone 5: Excluir linha OS ---
app.delete('/api/ordemservicoitem/:id', async (req, res) => {`;

content = content.replace(deleteRouteStr, newRoutes);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed server.js endpoints');
