const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const startMarkerPut = "app.put('/api/projeto/:id', async (req, res) => {";
const endMarkerPut = "app.delete('/api/projeto/:id', async (req, res) => {";

const putReplacement = \`app.put('/api/projeto/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto é obrigatório' });
    }

    try {
        let idEmpresa = 7;
        let descEmpresa = 'ALFATEC SISTEMAS EXAUSTAO';
        
        if (data.ClienteProjeto) {
             const [empRows] = await pool.execute('SELECT IdEmpresa, Descricao FROM empresa WHERE Descricao = ? LIMIT 1', [data.ClienteProjeto]);
             if (empRows && empRows.length > 0) {
                 idEmpresa = empRows[0].IdEmpresa;
                 descEmpresa = empRows[0].Descricao;
             }
        }

        await pool.execute(
            \\\`UPDATE projetos SET
                Projeto = ?, DescProjeto = ?, ClienteProjeto = ?, Responsavel = ?,
                DataPrevisao = ?, PrazoEntrega = ?, StatusProj = ?, DescStatus = ?,
                IdEmpresa = ?, DescEmpresa = ?, PlanejadoFinanceiro = ?, EntradaPedido = ?
            WHERE IdProjeto = ?\\\`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao ? formatBR(data.DataPrevisao) : null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                idEmpresa,
                descEmpresa,
                data.PlanejadoFinanceiro ? formatBR(data.PlanejadoFinanceiro) : null,
                data.EntradaPedido ? formatBR(data.EntradaPedido) : null,
                id
            ]
        );
        res.json({ success: true, message: 'Projeto atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
\`;

const startIdxPut = code.indexOf(startMarkerPut);
const endIdxPut = code.indexOf(endMarkerPut);

if (startIdxPut !== -1 && endIdxPut !== -1) {
    code = code.substring(0, startIdxPut) + putReplacement + code.substring(endIdxPut + endMarkerPut.length);
    fs.writeFileSync(serverFile, code, 'utf8');
    console.log("PUT api/projeto atualizado.");
} else {
    console.log("Não localizou os marcadores do PUT.");
}
