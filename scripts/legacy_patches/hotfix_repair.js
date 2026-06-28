const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/server.js');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Repair the corrupted block
const badBlockOrdem = `            qtde,                    await pool.execute(historicoSql, historicoParams);tion.release();
    }
});

// -----------------------------------------------------------------------------------------

        res.json({ success: true, message: 'Item includo com sucesso no romaneio.' });
    } catch (error) {`;

const badBlockRegex = /            qtde,                    await pool\.execute\(historicoSql, historicoParams\);tion\.release\(\);\r?\n    }\r?\n\}\);\r?\n\r?\n\/\/ -----------------------------------------------------------------------------------------\r?\n\r?\n        res\.json\({ success: true, message: '.+' }\);\r?\n    } catch \(error\) \{/m;

const goodBlock = `            qtde,                   // QtdeProduzida
            usuario || 'Sistema',
            getCurrentDateTimeBR()
        ];

        await pool.execute(historicoSql, historicoParams);

        res.json({ success: true, message: 'Item adicionado ao romaneio com sucesso e controle logado!' });
    } catch (error) {`;

if (badBlockRegex.test(content)) {
    content = content.replace(badBlockRegex, goodBlock);
    console.log("Repaired corrupted romaneio block!");
} else {
    // try exact match
    if (content.includes(badBlockOrdem)) {
        content = content.replace(badBlockOrdem, goodBlock);
        console.log("Repaired corrupted exactly!");
    } else {
        console.error("Could not find the corrupted block to repair!");
        // fallback regex searching for the word 'tion.release'
        const wildbad = /            qtde,[\\s\\S]*?\} catch \(error\) \{/m;
        content = content.replace(wildbad, goodBlock);
        console.log("Replaced using wildcard regex.");
    }
}

// 2. Inject Cancelar Finalizacao OR check if it exists
if (!content.includes('/api/ordemservico/cancelar-finalizacao')) {
    const routeCode = `
// ---------------------------------------------------------
// NOVA ROTA: Cancelar Finalizacao Ordem Servico (Etapa 7)
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico é obrigatório' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });

        if (rows[0].OrdemServicoFinalizado !== 'C') {
            return res.status(400).json({ success: false, message: 'Não Há itens para continuar processo (OS não finalizada).' });
        }

        try {
            await connection.query('UPDATE planocorte SET Concluido = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);
        } catch(e) {
            console.log("Aviso: tabela planocorte possivelmente ignorada/vazia para UPDATE:", e.message);
        }

        await connection.query('UPDATE ordemservico SET ORDEMSERVICOFINALIZADO = "", DataFinalizado = NULL WHERE IdOrdemServico = ?', [IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET ORDEMSERVICOITEMFINALIZADO = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);

        return res.json({ success: true, message: 'Processo de cancelamento da Finalização Executado' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});
`;
    // Insert before Excluir
    const targetAnchor = "app.post('/api/ordemservico/excluir'";
    if (content.includes(targetAnchor)) {
        content = content.replace(targetAnchor, routeCode + "\n" + targetAnchor);
        console.log("Injected Cancelar Finalizacao route!");
    } else {
        console.error("Could not find Excluir route to anchor!");
    }
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Repair finished.");
