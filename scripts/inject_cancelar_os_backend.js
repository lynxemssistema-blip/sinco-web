const fs = require('fs');

let serverCode = fs.readFileSync('src/server.js', 'utf8');

const routeCode = `
// ---------------------------------------------------------
// NOVA ROTA: Cancelar Liberação Ordem Servico
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-liberacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const tenantConnection = await req.tenantDbPromise;
        connection = await tenantConnection.getConnection();
        const { IdOrdemServico } = req.body;

        if (!IdOrdemServico) {
            return res.status(400).json({ success: false, message: 'IdOrdemServico não informado.' });
        }

        const [osRows] = await connection.query(
            \`SELECT EnderecoOrdemServico, Fator, IdTag, IdProjeto, Liberado_Engenharia, TipoLiberacaoOrdemServico 
             FROM ordemservico WHERE IdOrdemServico = ?\`, 
            [IdOrdemServico]
        );

        if (osRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ordem de serviço não encontrada.' });
        }

        const os = osRows[0];

        if (os.Liberado_Engenharia !== 'S') {
            return res.status(400).json({ success: false, message: 'Procedimento inválido, Ordem Serviço ainda não liberada para produção.' });
        }

        // Verifica total executado (soma de contagens/somatórios definidos no código original VB)
        const [execRows] = await connection.query(\`
            SELECT 
                COALESCE(SUM(CASE WHEN idplanodecorte > 0 THEN 1 ELSE 0 END), 0) + 
                COALESCE(SUM(CAST(CorteTotalExecutado AS SIGNED)), 0) + 
                COALESCE(SUM(CAST(DobraTotalExecutado AS SIGNED)), 0) + 
                COALESCE(SUM(CAST(SoldaTotalExecutado AS SIGNED)), 0) + 
                COALESCE(SUM(CAST(PinturaTotalExecutado AS SIGNED)), 0) +  
                COALESCE(SUM(CAST(MontagemTotalExecutado AS SIGNED)), 0) as totalExecutado
            FROM ordemservicoitem 
            WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        \`, [IdOrdemServico]);

        const totalExecutado = parseInt(execRows[0].totalExecutado) || 0;

        if (totalExecutado > 0) {
            const [pcRows] = await connection.query(\`
                SELECT idplanodecorte, CodMatFabricante
                FROM ordemservicoitem 
                WHERE IdOrdemServico = ? AND idplanodecorte > 0 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            \`, [IdOrdemServico]);

            let MessagemItens = pcRows.map(r => \`PlanoCorte = \${r.idplanodecorte}  Numero Desenho: = \${r.CodMatFabricante || 'N/A'}\`).join('\\n');
            
            return res.status(400).json({ 
                success: false, 
                message: \`A OS Numero: \${IdOrdemServico} contém processos em andamento, por este motivo não pode ser cancelada, ver plano de corte's/OS : \\n\${MessagemItens}\` 
            });
        }

        const diretorio = os.EnderecoOrdemServico;
        
        // Limpar diretórios
        if (diretorio) {
            const pastasLimpar = ['PDF', 'DXF', 'DFT', 'LXDS'];
            for (const pasta of pastasLimpar) {
                const alvo = path.join(diretorio, pasta);
                try {
                    limparDiretorio(alvo);
                } catch (e) {
                    console.error(\`Erro ao limpar diretório \${alvo}\`, e);
                }
            }
        }

        await connection.query(\`UPDATE ordemservico set Liberado_Engenharia = '', Data_Liberacao_Engenharia = NULL where IdOrdemServico = ?\`, [IdOrdemServico]);
        await connection.query(\`UPDATE ordemservicoitem set Liberado_Engenharia = '', Data_Liberacao_Engenharia = NULL where IdOrdemServico = ?\`, [IdOrdemServico]);

        if (os.TipoLiberacaoOrdemServico === 'Total') {
            // Em VB: ClasseProjeto.QtdeLiberada = ClasseProjeto.QtdeLiberada - ClasseclOrdemServico.Fator
            // Atualiza saldo na Tag
            await connection.query(\`
                UPDATE tags 
                SET QtdeLiberada = CAST(COALESCE(QtdeLiberada, 0) AS DECIMAL(10,2)) - ?, 
                    SaldoTag = CAST(COALESCE(SaldoTag, 0) AS DECIMAL(10,2)) + ?
                WHERE Idtag = ?
            \`, [os.Fator, os.Fator, os.IdTag]);
        }

        await connection.query(\`UPDATE ordemservico set TipoLiberacaoOrdemServico = '' where IdOrdemServico = ?\`, [IdOrdemServico]);

        res.json({ success: true, message: 'Liberação da Ordem de Serviço cancelada com sucesso.' });

    } catch (error) {
        console.error('Erro ao cancelar liberação da OS:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
});
`;

if (!serverCode.includes('/api/ordemservico/cancelar-liberacao')) {
    serverCode = serverCode.replace(
        "app.post('/api/ordemservico/liberar'",
        routeCode + "\napp.post('/api/ordemservico/liberar'"
    );
    fs.writeFileSync('src/server.js', serverCode);
    console.log('Backend /cancelar-liberacao route added.');
} else {
    console.log('Route already exists!');
}
