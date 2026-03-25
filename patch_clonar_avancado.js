const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/server.js');
let content = fs.readFileSync(targetFile, 'utf8');

const routeTargetStart = "app.post('/api/ordemservico/clonar', tenantMiddleware, async (req, res) => {";

// Encontrar fim da rota clonar para substituirmos (é logo antes de numero-op)
const startIdx = content.indexOf(routeTargetStart);
const endAnchor = "app.post('/api/ordemservico/numero-op'";
const endIdx = content.indexOf(endAnchor, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.log("Erro: não foi possivel achar a rota clonar para substituicao");
    process.exit(1);
}

const replacement = `app.post('/api/ordemservico/clonar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, novoFator, usuarioNome, novoIdProjeto, novoIdTag, novaDescricao } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico de origem é obrigatório' });
        if (!novoIdProjeto || !novoIdTag) return res.status(400).json({ success: false, message: 'Projeto e Tag de destino são obrigatórios' });
        
        const fator = isNaN(parseFloat(novoFator)) || parseFloat(novoFator) <= 0 ? 1 : parseFloat(novoFator);
        const criador = usuarioNome || 'Sistema Web';

        // 1. Obter a O.S Original
        const [origOS] = await connection.query('SELECT * FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S de origem não encontrada' });
        const os = origOS[0];

        // 2. Obter Dados do Novo Projeto e Nova Tag
        const [rowProjeto] = await connection.query('SELECT Projeto, DescEmpresa, IdEmpresa FROM projetos WHERE IdProjeto = ?', [novoIdProjeto]);
        if (rowProjeto.length === 0) return res.status(404).json({ success: false, message: 'Projeto de destino não encontrado' });
        const { Projeto: nomeProjeto, DescEmpresa: descEmpresaPrj, IdEmpresa: idEmpresaPrj } = rowProjeto[0];

        const [rowTag] = await connection.query('SELECT Tag, DescTag, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag FROM tags WHERE IdTag = ?', [novoIdTag]);
        if (rowTag.length === 0) return res.status(404).json({ success: false, message: 'Tag de destino não encontrada' });
        const { Tag: nomeTag, DescTag: descTagDestino, DataPrevisao: dataPrevTag } = rowTag[0];

        // 3. Inserir Header (Mestre) Limpando Variáveis de Estado
        const queryInsertMestre = \`
            INSERT INTO ordemservico (
                IdProjeto, Projeto, IdTag, Tag, DescTag, Descricao, fator, EnderecoOrdemServico, 
                CriadoPor, DataCriacao, Estatus, D_E_L_E_T_E, Liberado_Engenharia, Data_Liberacao_Engenharia, 
                idOSReferencia, OrdemServicoFinalizado, DataPrevisao, 
                QtdeTotalItens, QtdeItensExecutados, PercentualItens, QtdeTotalPecas, QtdepecasExecutadas, Percentualpecas, 
                IdEmpresa, DescEmpresa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'A', '', '', '', ?, '', ?, '', '', '', '', '', '', ?, ?)
        \`;
        
        const descUsada = novaDescricao || os.Descricao;
        const prevUsada = dataPrevTag || os.DataPrevisao;

        const [resultInsert] = await connection.query(queryInsertMestre, [
            novoIdProjeto, nomeProjeto, novoIdTag, nomeTag, descTagDestino, descUsada, fator, os.EnderecoOrdemServico,
            criador, IdOrdemServico, prevUsada, idEmpresaPrj, descEmpresaPrj
        ]);

        const novoId = resultInsert.insertId;

        // Tentar formatar Diretório fisíco
        let newEndereco = os.EnderecoOrdemServico;
        if (newEndereco) {
            const format5 = (num) => String(num).padStart(5, '0');
            const oldPref1 = \`OS_\${format5(IdOrdemServico)}\`;
            const oldPref2 = \`OS_\${IdOrdemServico}\`;
            const newPref = \`OS_\${format5(novoId)}\`;
            
            if (newEndereco.includes(oldPref1)) newEndereco = newEndereco.replace(oldPref1, newPref);
            else if (newEndereco.includes(oldPref2)) newEndereco = newEndereco.replace(oldPref2, newPref);
            else newEndereco += \`_COPIA_\${novoId}\`;

            await connection.query('UPDATE ordemservico SET EnderecoOrdemServico = ? WHERE IdOrdemServico = ?', [newEndereco, novoId]);

            try {
                const fsp = require('fs/promises');
                const p = require('path');
                await fsp.mkdir(newEndereco, { recursive: true });
                const subdirs = ['DXF', 'PDF', 'DFT', 'PUNC', 'LASER', 'Projeto', 'PEÇAS DE ESTOQUE', 'LXDS'];
                for (const sd of subdirs) {
                    await fsp.mkdir(p.join(newEndereco, sd), { recursive: true }).catch(() => {});
                }
            } catch (e) {
                console.log('[CloneOS] Pasta de rede inacesível:', e.message);
            }
        }

        // 4. Inserir Itens (Filhas)
        const queryInsertItens = \`
            INSERT INTO ordemservicoitem (
                IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag,
                ESTATUS_OrdemServico, IdMaterial, DescResumo, DescDetal,
                Autor, Palavrachave, Notas, Espessura, AreaPintura,
                NumeroDobras, Peso, Unidade, UnidadeSW, ValorSW, Altura,
                Largura, CodMatFabricante, DtCad, UsuarioCriacao,
                UsuarioAlteracao, DtAlteracao, EnderecoArquivo, MaterialSW,
                QtdeTotal, CriadoPor, DataCriacao, Estatus, Acabamento, D_E_L_E_T_E, Fator, qtde,
                txtSoldagem, txtTipoDesenho, txtCorte, txtDobra, txtSolda,
                txtPintura, txtMontagem, CorteTotalExecutar, DobraTotalExecutar, SoldaTotalExecutar,
                PinturaTotalExecutar, MontagemTotalExecutar, Comprimentocaixadelimitadora,
                Larguracaixadelimitadora, Espessuracaixadelimitadora, AreaPinturaUnitario,
                PesoUnitario, txtItemEstoque, DataPrevisao, Liberado_Engenharia, DATA_LIBERACAO_ENGENHARIA,
                OrdemServicoItemFinalizado, sttxtCorte, sttxtDobra, sttxtSolda, sttxtPintura, sttxtMontagem,
                ProdutoPrincipal, EnderecoArquivoItemOrdemServico, IdEmpresa, DescEmpresa
            )
            SELECT
                ?, ?, ?, ?, ?, ?,
                ESTATUS_OrdemServico, IdMaterial, DescResumo, DescDetal,
                Autor, Palavrachave, Notas, Espessura, 
                IF(EnderecoArquivo IS NOT NULL AND EnderecoArquivo != '', AreaPinturaUnitario * qtde * ?, 0),
                NumeroDobras, 
                IF(EnderecoArquivo IS NOT NULL AND EnderecoArquivo != '', PesoUnitario * qtde * ?, 0),
                Unidade, UnidadeSW, ValorSW, Altura,
                Largura, CodMatFabricante, DtCad, UsuarioCriacao,
                UsuarioAlteracao, DtAlteracao, EnderecoArquivo, MaterialSW,
                IF(EnderecoArquivo IS NOT NULL AND EnderecoArquivo != '', ? * qtde, 0),
                ?, NOW(), Estatus, Acabamento, D_E_L_E_T_E, ?, qtde,
                txtSoldagem, txtTipoDesenho, txtCorte, txtDobra, txtSolda,
                txtPintura, txtMontagem, CorteTotalExecutar, DobraTotalExecutar, SoldaTotalExecutar,
                PinturaTotalExecutar, MontagemTotalExecutar, Comprimentocaixadelimitadora,
                Larguracaixadelimitadora, Espessuracaixadelimitadora, AreaPinturaUnitario,
                PesoUnitario, txtItemEstoque, ?, '', '',
                '', '', '', '', '', '',
                ProdutoPrincipal, EnderecoArquivoItemOrdemServico, ?, ?
            FROM ordemservicoitem 
            WHERE (IdOrdemServico = ?) AND (IdOrdemServicoReposicao IS NULL OR IdOrdemServicoReposicao = '')
        \`;

        await connection.query(queryInsertItens, [
            novoId, novoIdProjeto, nomeProjeto, novoIdTag, nomeTag, descTagDestino,
            fator, fator, fator, criador, fator, prevUsada, idEmpresaPrj, descEmpresaPrj, IdOrdemServico
        ]);

        return res.json({ success: true, message: 'Nova Cópia da Ordem de Serviço inserida!', novoId });

    } catch (e) {
        console.error("Erro ao clonar O.S (Inter-Projetos):", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Backend Clone Inter-Projetos injetado!');
