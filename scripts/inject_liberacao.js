const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');

const routeCode = `
app.post('/api/ordemservico/liberar', async (req, res) => {
    const { IdOrdemServico, IdTag, IdProjeto, Fator, EnderecoOrdemServico, TipoLiberacao } = req.body;
    let connection;
    try {
        if (!IdOrdemServico || !Fator || !EnderecoOrdemServico || !TipoLiberacao) {
            return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios ausentes.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Validar Produto Principal
        const [produtoPrincipal] = await connection.execute(
            \`SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE IdOrdemServico = ? AND ProdutoPrincipal = 'sim' LIMIT 1\`,
            [IdOrdemServico]
        );
        if (produtoPrincipal.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Verifique se há um produto principal para a Ordem de Serviço cadastrado.' });
        }

        // 2. Limpar Diretórios e Copiar Arquivos
        const [items] = await connection.execute(
            \`SELECT EnderecoArquivo FROM ordemservicoitem WHERE IdOrdemServico = ? AND EnderecoArquivo IS NOT NULL AND EnderecoArquivo != ''\`,
            [IdOrdemServico]
        );

        const subDirs = ['PDF', 'DXF', 'DFT', 'LXDS'];
        // Garantir Base
        if (fs.existsSync(EnderecoOrdemServico)) {
            for (const dir of subDirs) {
                const fullPath = path.join(EnderecoOrdemServico, dir);
                if (fs.existsSync(fullPath)) {
                    fs.readdirSync(fullPath).forEach(file => {
                        try { fs.unlinkSync(path.join(fullPath, file)); } catch (e) {}
                    });
                } else {
                    fs.mkdirSync(fullPath, { recursive: true });
                }
            }

            // Copiar
            items.forEach(item => {
                let filePath = item.EnderecoArquivo;
                if (!filePath) return;
                // Ajustar barras pro fs nodejs tratar bem
                filePath = filePath.replace(/##/g, '\\\\');

                if (fs.existsSync(filePath)) {
                    const ext = path.extname(filePath).toLowerCase();
                    const basename = path.basename(filePath);
                    
                    const targetFolder = ext.replace('.', '').toUpperCase();
                    if (subDirs.includes(targetFolder)) {
                        try {
                            fs.copyFileSync(filePath, path.join(EnderecoOrdemServico, targetFolder, basename));
                        } catch (e) {}
                    }
                    
                    // Se for SLDPRT etc, tentamos pegar o PDF e o DXF correspondente
                    const nameNoExt = path.basename(filePath, path.extname(filePath));
                    const dirPath = path.dirname(filePath);
                    
                    ['.PDF', '.pdf', '.DXF', '.dxf'].forEach(otherExt => {
                        const otherPath = path.join(dirPath, nameNoExt + otherExt);
                        if (fs.existsSync(otherPath)) {
                            const subDirDest = otherExt.toLowerCase().includes('pdf') ? 'PDF' : 'DXF';
                            try { fs.copyFileSync(otherPath, path.join(EnderecoOrdemServico, subDirDest, nameNoExt + otherExt.toUpperCase())); } catch(e){}
                        }
                    });
                }
            });
        }

        // 3. Atualizar Tabelas ordemservico e ordemservicoitem
        const now = new Date();
        const dataatual = \`\${now.getFullYear()}-\${String(now.getMonth()+1).padStart(2,'0')}-\${String(now.getDate()).padStart(2,'0')} \${String(now.getHours()).padStart(2,'0')}:\${String(now.getMinutes()).padStart(2,'0')}:\${String(now.getSeconds()).padStart(2,'0')}\`;

        await connection.execute(
            \`UPDATE ordemservico SET Liberado_Engenharia = 'S', Data_Liberacao_Engenharia = ? WHERE IdOrdemServico = ?\`,
            [dataatual, IdOrdemServico]
        );
        await connection.execute(
            \`UPDATE ordemservicoitem SET Liberado_Engenharia = 'S', Data_Liberacao_Engenharia = ? WHERE IdOrdemServico = ?\`,
            [dataatual, IdOrdemServico]
        );

        // 4. Fluxo Parcial/Total
        if (TipoLiberacao === 'Total') {
            const [tagsResult] = await connection.execute(
                \`SELECT SaldoTag, QtdeLiberada FROM tags WHERE IdTag = ?\`,
                [IdTag]
            );
            
            let saldoTag = 1;
            let qtdeLiberada = 0;
            if (tagsResult.length > 0) {
                saldoTag = parseFloat(tagsResult[0].SaldoTag);
                if (isNaN(saldoTag)) saldoTag = 1;

                qtdeLiberada = parseFloat(tagsResult[0].QtdeLiberada);
                if (isNaN(qtdeLiberada)) qtdeLiberada = 0;
            }

            const novoQtdeLiberada = qtdeLiberada + parseFloat(Fator);
            let novoSaldoTag = saldoTag - parseFloat(Fator);
            if (novoSaldoTag < 0) novoSaldoTag = 0;

            await connection.execute(
                \`UPDATE tags SET QtdeLiberada = ?, SaldoTag = ? WHERE IdTag = ?\`,
                [novoQtdeLiberada, novoSaldoTag, IdTag]
            );

            await connection.execute(
                \`UPDATE ordemservico SET TipoLiberacaoOrdemServico = 'Total' WHERE IdOrdemServico = ?\`,
                [IdOrdemServico]
            );
        } else {
            await connection.execute(
                \`UPDATE ordemservico SET TipoLiberacaoOrdemServico = 'Parcial' WHERE IdOrdemServico = ?\`,
                [IdOrdemServico]
            );
        }

        // 5. Excel Export
        try {
            if (fs.existsSync(EnderecoOrdemServico)) {
                const ExcelJS = require('exceljs');
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('OrdemServico');
                
                worksheet.columns = [
                    { header: 'Cod Mat', key: 'cod', width: 20 },
                    { header: 'Descrição', key: 'desc', width: 50 },
                    { header: 'Qtde', key: 'qtde', width: 10 },
                    { header: 'Peso', key: 'peso', width: 15 },
                    { header: 'Liberado', key: 'lib', width: 10 }
                ];

                const [itensData] = await connection.execute(\`SELECT * FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')\`, [IdOrdemServico]);
                itensData.forEach((it) => {
                    worksheet.addRow({
                        cod: it.CodMatFabricante,
                        desc: it.DescResumo || it.DescDetal,
                        qtde: it.QtdeTotal,
                        peso: it.Peso,
                        lib: it.Liberado_Engenharia
                    });
                });

                const excelPath = path.join(EnderecoOrdemServico, \`Exportacao_Padrao_OS\${IdOrdemServico}.xlsx\`);
                await workbook.xlsx.writeFile(excelPath);
            }
        } catch (excelErr) {
            console.error('Erro ao gerar Excel de liberação:', excelErr);
        }

        await connection.commit();
        res.json({ success: true, message: 'Ordem de serviço liberada com sucesso.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao liberar OS:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao liberar Ordem de Serviço.' });
    } finally {
        if (connection) connection.release();
    }
});
`;

let endpointAnchor = "app.get('/api/ordemservico/:id/itens', async (req, res) => {";
if (code.includes(endpointAnchor)) {
    code = code.replace(endpointAnchor, routeCode + '\n' + endpointAnchor);
    fs.writeFileSync('src/server.js', code);
    console.log('Backend refactored successfully!');
} else {
    console.log('Could not find anchor point in server.js');
}
