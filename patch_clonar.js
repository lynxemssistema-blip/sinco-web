const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/server.js');
let content = fs.readFileSync(targetFile, 'utf8');

const routeCode = `
// ---------------------------------------------------------
// NOVA ROTA: Criar Cópia da Ordem de Serviço (Etapa 9)
// ---------------------------------------------------------
app.post('/api/ordemservico/clonar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, novoFator, usuarioNome } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico de origem é obrigatório' });
        
        const fator = isNaN(parseFloat(novoFator)) || parseFloat(novoFator) <= 0 ? 1 : parseFloat(novoFator);
        const criador = usuarioNome || 'Sistema Web';

        // 1. Obter a O.S Original
        const [origOS] = await connection.query('SELECT * FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S de origem não encontrada' });
        const os = origOS[0];

        // 2. Inserir Header (Mestre) Limpando Variáveis de Estado
        const queryInsertMestre = \`
            INSERT INTO ordemservico (
                IdProjeto, Projeto, IdTag, Tag, DescTag, Descricao, fator, EnderecoOrdemServico, 
                CriadoPor, DataCriacao, Estatus, D_E_L_E_T_E, Liberado_Engenharia, Data_Liberacao_Engenharia, 
                idOSReferencia, OrdemServicoFinalizado, DataPrevisao, 
                QtdeTotalItens, QtdeItensExecutados, PercentualItens, QtdeTotalPecas, QtdepecasExecutadas, Percentualpecas, 
                IdEmpresa, DescEmpresa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, '', '', '', ?, '', ?, '', '', '', '', '', '', ?, ?)
        \`;
        
        const [resultInsert] = await connection.query(queryInsertMestre, [
            os.IdProjeto, os.Projeto, os.IdTag, os.Tag, os.DescTag, os.Descricao, fator, os.EnderecoOrdemServico,
            criador, os.Estatus, IdOrdemServico, os.DataPrevisao, os.IdEmpresa, os.DescEmpresa
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

            // Atualiza DB e Tenta Criar Fisico
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
                console.log('[CloneOS] Pasta de rede inacessível localmente ou sem permissão:', e.message);
            }
        }

        // 3. Inserir Itens (Filhas) Baseados no Novo ID e Recalculando % (Área, Peso, etc)
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
                ?, IdProjeto, Projeto, IdTag, Tag, DescTag,
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
                PesoUnitario, txtItemEstoque, DataPrevisao, '', '',
                '', '', '', '', '', '',
                ProdutoPrincipal, EnderecoArquivoItemOrdemServico, IdEmpresa, DescEmpresa
            FROM ordemservicoitem 
            WHERE (IdOrdemServico = ?) AND (IdOrdemServicoReposicao IS NULL OR IdOrdemServicoReposicao = '')
        \`;

        await connection.query(queryInsertItens, [
            novoId, fator, fator, fator, criador, fator, IdOrdemServico
        ]);

        return res.json({ success: true, message: 'Nova Ordem de Serviço criada e herdada com êxito!', novoId });

    } catch (e) {
        console.error("Erro ao clonar O.S:", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});
`;

const anchor = "app.post('/api/ordemservico/numero-op'";
if (!content.includes('/api/ordemservico/clonar')) {
    if (content.includes(anchor)) {
        content = content.replace(anchor, routeCode + "\n" + anchor);
        console.log("Injected POST /api/ordemservico/clonar route successfully.");
    } else {
        console.error("Could not find anchor to inject clonar route!");
    }
} else {
    console.log("Clonar route already exists.");
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Patch backend complete.");
