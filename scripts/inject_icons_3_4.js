const fs = require('fs');

let serverCode = fs.readFileSync('src/server.js', 'utf8');

const routes = `
// ---------------------------------------------------------
// NOVA ROTA: Atualizar arquivos na pasta da OS (Icone 3)
// ---------------------------------------------------------
app.post('/api/ordemservico/atualizar-arquivos', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const tenantConnection = await req.tenantDbPromise;
        connection = await tenantConnection.getConnection();
        const { IdOrdemServico } = req.body;

        const [osRows] = await connection.query('SELECT EnderecoOrdemServico, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS não encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de Serviço já Liberada para Produção, não pode mais ser modificada!' });
        }

        const diretorio = os.EnderecoOrdemServico;
        if (diretorio) {
            const pastasLimpar = ['PDF', 'DXF', 'DFT', 'LXDS'];
            for (const pasta of pastasLimpar) {
                const alvo = path.join(diretorio, pasta);
                try {
                    limparDiretorio(alvo);
                } catch (e) {
                    console.error('Erro limpar:', alvo);
                }
            }
        }

        // ImportarArquivos stub - Node translation depends on server access, but for now we confirm clearance
        res.json({ success: true, message: 'Arquivos locais/pastas preparados com sucesso.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ---------------------------------------------------------
// NOVA ROTA: Alterar Fator Multiplicador (Icone 4)
// ---------------------------------------------------------
app.post('/api/ordemservico/alterar-fator', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const tenantConnection = await req.tenantDbPromise;
        connection = await tenantConnection.getConnection();
        const { IdOrdemServico, FatorMultiplicador } = req.body;

        const fator = parseFloat(FatorMultiplicador);
        if (isNaN(fator) || fator <= 0) {
            return res.status(400).json({ success: false, message: 'Fator inválido' });
        }

        const [osRows] = await connection.query('SELECT IdTag, EnderecoOrdemServico, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS não encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de Serviço já Liberada para Produção, não pode mais ser modificada!' });
        }

        // Verifica ITENS
        const [itemRows] = await connection.query('SELECT IdOrdemServicoItem, Qtde, AreaPintura, Peso FROM ordemservicoitem WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (itemRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Não há itens a serem alterados!' });
        }

        for (const item of itemRows) {
            let qtdeNum = parseFloat(item.Qtde) || 0;
            if (qtdeNum === 0) qtdeNum = 1; // avoid division by zero if Data was bad

            const areaUnit = (parseFloat(item.AreaPintura) || 0) / qtdeNum;
            const pesoUnit = (parseFloat(item.Peso) || 0) / qtdeNum;

            const newQtdeTotal = qtdeNum * fator;
            const newArea = areaUnit * fator;
            const newPeso = pesoUnit * fator;

            await connection.query(\`
                UPDATE ordemservicoitem 
                SET QtdeTotal = ?, AreaPintura = ?, Peso = ?, Fator = ?
                WHERE IdOrdemServicoItem = ?
            \`, [newQtdeTotal, newArea, newPeso, fator, item.IdOrdemServicoItem]);
        }

        // UPDATE OS Fator
        await connection.query('UPDATE ordemservico SET Fator = ? WHERE IdOrdemServico = ?', [fator, IdOrdemServico]);

        const diretorio = os.EnderecoOrdemServico;
        if (diretorio) {
            const pastasLimpar = ['PDF', 'DXF', 'DFT', 'LXDS'];
            for (const pasta of pastasLimpar) {
                const alvo = path.join(diretorio, pasta);
                try {
                    limparDiretorio(alvo);
                } catch (e) { }
            }
        }

        res.json({ success: true, message: 'Fator alterado com sucesso! Saldo dos Itens e Pastas atualizados.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});
`;

if (!serverCode.includes('/api/ordemservico/alterar-fator')) {
    serverCode = serverCode.replace(
        "app.post('/api/ordemservico/liberar'",
        routes + "\napp.post('/api/ordemservico/liberar'"
    );
    fs.writeFileSync('src/server.js', serverCode);
    console.log('Routes added!');
} else {
    console.log('Routes already exist.');
}
