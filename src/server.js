const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const pool = require('./config/db');
const tenantMiddleware = require('./middleware/tenant');
const matrizRoutes = require('./routes/matrizRoutes');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'SincoWebSecret2026!KeySecure';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// LOGGING MIDDLEWARE (Development)
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`\n[API] =5 ${req.method} ${req.url}`);

    if (Object.keys(req.query).length > 0) {
        console.log(`[API]    QUERY: ${JSON.stringify(req.query)}`);
    }

    if (req.body && Object.keys(req.body).length > 0) {
        // Avoid logging massive base64 strings if listing many items
        const safeBody = { ...req.body };
        // Truncate long strings for logs
        Object.keys(safeBody).forEach(key => {
            if (typeof safeBody[key] === 'string' && safeBody[key].length > 200) {
                safeBody[key] = safeBody[key].substring(0, 50) + '... [TRUNCATED]';
            }
        });
        console.log(`[API]    BODY: ${JSON.stringify(safeBody)}`);
    }

    // Capture response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        let color = '=�';
        if (res.statusCode >= 400) color = 'F09F9F88'; // Yellow/Orange
        if (res.statusCode >= 500) color = '=4'; // Red

        console.log(`[API] ${color} ${res.statusCode} (${duration}ms)`);
    });

    next();
});

// CORS - Allow React frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Apply Tenant Middleware to all API routes
app.use('/api', tenantMiddleware);

// Admin Routes
app.use('/api/matriz', matrizRoutes);

// Reposição Routes
app.get('/api/reposicao/itens', async (req, res) => {
    try {
        const query = `
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, IdMaterial, Projeto, DescEmpresa, Tag, DescTag, 
                CodMatFabricante, DescResumo, DescDetal, Espessura, 
                MaterialSW, EnderecoArquivo, EnderecoArquivoItemOrdemServico,
                CriadoPor, DataCriacao, QtdeTotal, SetorReposicao, 
                IdOrdemservicoReposicao, IdOrdemServicoItemReposicao, IdPendenciaReposicao, 
                Reposicao, D_E_L_E_T_E,
                cortetotalexecutado, cortetotalexecutar,
                txtcorte, txtdobra, txtsolda, txtpintura, txtmontagem,
                sttxtCorte, sttxtDobra, sttxtSolda, sttxtPintura, sttxtMontagem, 
                sttxtMEDICAO, sttxtISOMETRICO, sttxtENGENHARIA, sttxtACABAMENTO, sttxtAPROVACAO
            FROM ordemservicoitem
            WHERE Reposicao = 'S' 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `;
        const [rows] = await pool.query(query);
        console.log(`[DEBUG REPOSICAO] tenantId was unused | rows.length: ${rows.length}`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar itens de reposição:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor ao buscar reposição.' });
    }
});

app.delete('/api/reposicao/itens/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            UPDATE ordemservicoitem 
            SET 
                D_E_L_E_T_E = '*', 
                DataD_E_L_E_T_E = ?, 
                UsuarioD_E_L_E_T_E = ? 
            WHERE IdOrdemServicoItem = ?
        `;
        const d = new Date();
        const dateBR = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        
        const [result] = await pool.query(query, [dateBR, 'Sistema', id]);
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Item excluído com sucesso (reposição).' });
        } else {
            res.status(404).json({ success: false, message: 'Item não encontrado ou já excluído.' });
        }
    } catch (error) {
        console.error('Erro ao excluir item de reposição:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor ao excluir reposição.' });
    }
});

app.post('/api/reposicao/apontamento', async (req, res) => {
    let connection;
    try {
        const { IdOrdemServicoItem, quantidadeApontada } = req.body;
        
        if (!IdOrdemServicoItem || !quantidadeApontada || quantidadeApontada <= 0) {
            return res.status(400).json({ success: false, message: 'Dados inválidos para o apontamento.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Validar e capturar o Item
        const [items] = await connection.query(`
            SELECT IdOrdemServicoItem, IdOrdemServico, IdMaterial, QtdeTotal, cortetotalexecutado, cortetotalexecutar, 
                   sttxtCorte, IdOrdemservicoReposicao, IdOrdemServicoItemReposicao, IdPendenciaReposicao
            FROM ordemservicoitem 
            WHERE IdOrdemServicoItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') FOR UPDATE
        `, [IdOrdemServicoItem]);

        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Peça de reposição não localizada.' });
        }

        const item = items[0];
        
        if (item.sttxtCorte === 'C') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este item de reposição já está concluído.' });
        }

        const atualExecutado = Number(item.cortetotalexecutado) || 0;
        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const limiteMaximo = qtdeTotal - atualExecutado;

        if (quantidadeApontada > limiteMaximo) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `A quantidade informada excede o limite restante de reposição (${limiteMaximo}).` });
        }

        const novoCorteExecutado = atualExecutado + Number(quantidadeApontada);
        const novoCorteExecutar = Math.max(0, qtdeTotal - novoCorteExecutado);
        const novoSttxtCorte = novoCorteExecutado === qtdeTotal ? 'C' : item.sttxtCorte;

        // 2. Atualizar ordemservicoitem
        await connection.query(`
            UPDATE ordemservicoitem 
            SET cortetotalexecutado = ?, cortetotalexecutar = ?, sttxtCorte = ?
            WHERE IdOrdemServicoItem = ?
        `, [novoCorteExecutado, novoCorteExecutar, novoSttxtCorte, IdOrdemServicoItem]);

        // 3. Inserir Log em ordemservicoitemcontrole
        const d = new Date();
        const dataAtual = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        const usuarioLogado = req.user?.nome || req.user?.login || 'Sistema';

        await connection.query(`
            INSERT INTO ordemservicoitemcontrole (
                IdOrdemServico, IdOrdemServicoItem, IdOSItemProcesso, Processo, CodigoJuridicoMat,
                QtdeTotal, IdMaterial, QtdeProduzida, QtdeFaltante, CriadoPor, DataCriacao,
                D_E_L_E_T_E, UsuarioD_E_L_E_T_E, DataD_E_L_E_T_E, Situacao, DescricaoEstorno,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, 
                txtMEDICAO, txtISOMETRICO, txtENGENHARIA, txtACABAMENTO, Origem
            ) VALUES (
                ?, ?, 0, '', '',
                ?, ?, ?, ?, ?, ?,
                '', '', '', '', '',
                '', '', '', '', '',
                '', '', '', '', ''
            )
        `, [
            item.IdOrdemServico, IdOrdemServicoItem, 
            qtdeTotal, item.IdMaterial || '', novoCorteExecutado, novoCorteExecutar, usuarioLogado, dataAtual
        ]);

        // 4. Fechar RNC automaticamente caso 100% reposto
        if (novoCorteExecutado === qtdeTotal && item.IdPendenciaReposicao) {
            const descFinalizacao = `RNC Automática  - Encerramento do Pedido de Reposição de Peça da OS: ${item.IdOrdemServico} Item: ${item.IdOrdemServicoItemReposicao || ''} Concluido , Excluindo da Lista de Pendência`;
            
            await connection.query(`
                UPDATE ordemservicoitempendencia
                SET UsuarioProjeto = ?, 
                    DataAcertoProjeto = ?,
                    DescricaoFinalizacao = ?,
                    FinalizadoPorUsuarioSetor = ?,
                    SetorResponsavelFinalizacao = ?,
                    Estatus = 'FINALIZADA'
                WHERE IdOrdemServicoItemPendencia = ?
            `, [
                usuarioLogado, dataAtual, descFinalizacao, usuarioLogado, 'Produção', item.IdPendenciaReposicao
            ]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Peças repostas apontadas com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro na transaction do Apontamento de Reposição:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar apontamento.' });
    } finally {
        if (connection) connection.release();
    }
});

// Configure Multer (Uploads)
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + uniqueSuffix + ext)
    }
});

const upload = multer({ storage: storage });

// Helpers for Date Formatting (Brazilian Format)
const getCurrentDateBR = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getCurrentDateTimeBR = () => {
    const d = new Date();
    const date = getCurrentDateBR();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return `${date} ${time}`;
};

const formatDateToBR = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput; // Return as is if invalid
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper: Clear directory contents (files only)
const limparDiretorio = (diretorio) => {
    try {
        if (!fs.existsSync(diretorio)) return;
        const files = fs.readdirSync(diretorio);
        for (const file of files) {
            const filePath = path.join(diretorio, file);
            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            } else if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            }
        }
        console.log(`[File] Diret�rio limpo: ${diretorio}`);
    } catch (err) {
        console.error(`[File] Erro ao limpar diret�rio ${diretorio}:`, err);
    }
};

const ExportarRomaneioExcelPadrao = async (idRomaneio) => {
    try {
        console.log(`[Excel] Iniciando exporta��o padr�o do Romaneio #${idRomaneio}`);

        // 1. Buscar Caminhos e Template
        const [configRows] = await pool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelRomaneio'"
        );
        const templatePath = configRows.length > 0 ? configRows[0].valor : null;

        const [romRows] = await pool.execute(
            `SELECT * FROM romaneio WHERE idRomaneio = ?`,
            [idRomaneio]
        );
        if (romRows.length === 0) throw new Error('Romaneio n�o encontrado');
        const romData = romRows[0];

        // 2. Buscar Itens
        const [items] = await pool.execute(
            "SELECT * FROM viewromaneioitem WHERE IdRomaneio = ?",
            [idRomaneio]
        );

        // 3. Gerar Excel
        const workbook = new ExcelJS.Workbook();
        let worksheet;

        if (templatePath && fs.existsSync(templatePath)) {
            console.log(`[Excel] Usando template: ${templatePath}`);
            await workbook.xlsx.readFile(templatePath);
            worksheet = workbook.getWorksheet(1);
        } else {
            console.warn(`[Excel] Template n�o encontrado em ${templatePath}. Criando novo.`);
            worksheet = workbook.addWorksheet('Romaneio');
        }

        // 4. Preencher Cabe�alho (Padr�o Legado)
        const paddedId = idRomaneio.toString().padStart(5, '0');
        const fullAddress = [
            romData.EnviadoPara,
            `RUA: ${romData.endereco || ''}`,
            `N�: ${romData.numero || ''}`,
            `BAIRRO: ${romData.bairro || ''}`,
            `COMPLEMENTO: ${romData.complemento || ''}`,
            `CIDADE: ${romData.cidade || ''}`,
            `UF: ${romData.estado || ''}`,
            `CEP: ${romData.cep || ''}`
        ].filter(v => v).join(' ').toUpperCase();

        worksheet.getCell('S2').value = paddedId;
        worksheet.getCell('C8').value = fullAddress;
        worksheet.getCell('C10').value = romData.CriadoPor || '';
        worksheet.getCell('C11').value = romData.DATACRIACAO ? new Date(romData.DATACRIACAO).toLocaleDateString('pt-BR') : '';
        worksheet.getCell('Q9').value = romData.ENDERECORomaneio || '';
        worksheet.getCell('B12').value = romData.Descricao || '';

        // Dados transporte
        worksheet.getCell('J11').value = romData.DataEnvio ? new Date(romData.DataEnvio).toLocaleDateString('pt-BR') : '';
        worksheet.getCell('J10').value = romData.TipoTransporte || '';
        worksheet.getCell('M10').value = romData.PlacaVeiculo || '';
        worksheet.getCell('O12').value = romData.ObservacaoTransporte || '';

        // 5. Preencher Itens (Come�a na linha 18)
        items.forEach((item, idx) => {
            const rowIdx = 18 + idx;

            // Format dimensions
            const dim = `${item.Espessuracaixadelimitadora || 0} x ${item.Larguracaixadelimitadora || 0} x ${item.Comprimentocaixadelimitadora || 0}`;

            worksheet.getCell(`A${rowIdx}`).value = item.IdRomaneioItem;
            worksheet.getCell(`B${rowIdx}`).value = item.QtdeRomaneio;
            worksheet.getCell(`C${rowIdx}`).value = item.PROJETO;
            worksheet.getCell(`D${rowIdx}`).value = item.TAG;
            worksheet.getCell(`E${rowIdx}`).value = item.DescResumo;
            worksheet.getCell(`K${rowIdx}`).value = item.DescDetal;
            worksheet.getCell(`P${rowIdx}`).value = item.CodMatFabricante || '';
            worksheet.getCell(`Q${rowIdx}`).value = item.ACABAMENTO || '';
            worksheet.getCell(`R${rowIdx}`).value = item.txtTipoDesenho || '';
            worksheet.getCell(`S${rowIdx}`).value = dim;
            worksheet.getCell(`T${rowIdx}`).value = item.AreaPinturaTotal || 0;
            worksheet.getCell(`U${rowIdx}`).value = item.SaldoRomaneio || 0;
            worksheet.getCell(`W${rowIdx}`).value = item.Situacao || '';

            // Se quisermos copiar o estilo da linha 17 (como no VB.NET)
            // No ExcelJS n�o existe um "CopyRange" direto t�o simples, 
            // mas podemos tentar manter os estilos se o template j� tiver a linha formatada.
        });

        // 6. Salvar
        if (!romData.ENDERECORomaneio) {
            throw new Error('Diret�rio do Romaneio n�o configurado no banco de dados.');
        }

        const fileName = `Romaneio_${paddedId}_${new Date().getTime()}.xlsx`;
        const savePath = path.join(romData.ENDERECORomaneio, fileName);

        if (!fs.existsSync(romData.ENDERECORomaneio)) {
            fs.mkdirSync(romData.ENDERECORomaneio, { recursive: true });
        }

        await workbook.xlsx.writeFile(savePath);
        console.log(`[Excel] Arquivo gerado com sucesso: ${savePath}`);
        return { success: true, path: savePath, fileName, paddedId };

    } catch (error) {
        console.error(`[Excel] Erro ao exportar romaneio #${idRomaneio}:`, error);
        return { success: false, error: error.message };
    }
};

// Route to Download Excel
app.get('/api/romaneio/download-excel/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            "SELECT ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
            [id]
        );

        if (rows.length === 0) return res.status(404).send('Romaneio n�o encontrado');
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).send('Diret�rio de arquivos n�o encontrado');
        }

        // Find the most recent xlsx file in that directory starting with Romaneio_
        const files = fs.readdirSync(dir)
            .filter(f => f.startsWith(`Romaneio_`) && f.endsWith('.xlsx'))
            .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length === 0) {
            return res.status(404).send('Nenhum arquivo Excel encontrado para este romaneio');
        }

        const filePath = path.join(dir, files[0].name);
        res.download(filePath, files[0].name);

    } catch (error) {
        console.error('[DOWNLOAD] Erro:', error);
        res.status(500).send('Erro ao baixar arquivo');
    }
});

// Route to Open Folder in Explorer
app.post('/api/romaneio/open-folder/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            "SELECT ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Romaneio n�o encontrado' });
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).json({ success: false, message: 'Diret�rio n�o existe no servidor' });
        }

        // Open Explorer on Windows using 'start' which is more robust
        exec(`start "" "${dir}"`, (error) => {
            if (error) {
                console.error(`[EXPLORER] Erro ao abrir com 'start':`, error);
                // Fallback to explorer if start fails
                exec(`explorer "${dir}"`, (error2) => {
                    if (error2) {
                        console.error(`[EXPLORER] Erro ao abrir com 'explorer':`, error2);
                        return res.status(500).json({ success: false, message: 'Erro ao abrir a pasta no servidor' });
                    }
                    res.json({ success: true, message: 'Pasta aberta no servidor (via explorer)' });
                });
                return;
            }
            res.json({ success: true, message: 'Pasta aberta no servidor' });
        });

    } catch (error) {
        console.error('[EXPLORER] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao tentar abrir pasta' });
    }
});

// --- ROUTES ---

// GET /api/tarefas - List tarefas
app.get('/api/tarefas', async (req, res) => {
    try {
        const { showFinalized } = req.query;
        let estatusCondition = "Estatus = 'TarefaAberta'";
        if (showFinalized === 'true') {
            estatusCondition = "(Estatus = 'TarefaAberta' OR Estatus = 'Finalizada')";
        }

        const query = `
            SELECT 
                IdOrdemServicoItemPendencia,
                IdProjeto, Projeto,
                DescEmpresa,
                IdTag, Tag, descTag AS DescTag,
                IdOrdemServico, IdOrdemServicoItem,
                CodMatFabricante,
                DescricaoPendencia,
                Usuario,
                DataCriacao,
                TipoTarefa,
                SetorResponsavel, UsuarioResponsavel,
                IdUsuarioResponsavel,
                EmailResponsavelPelaTarefa, DataExecucao,
                SetorResponsavelFinalizacao,
                FinalizadoPorUsuarioSetor,
                DescricaoFinalizacao,
                DataAcertoProjeto AS Data_Correcao,
                UsuarioProjeto,
                Estatus AS Status,
                TipoCadastro, ControleEnvioEmail,
                TipoRegistro
            FROM viewordemservicoitempendencia
            WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
              AND TipoRegistro = 'TAREFA'
              AND OrigemPendencia = 'ACAOPCP'
              AND ${estatusCondition}
            ORDER BY DataCriacao DESC
        `;
        const [rows] = await pool.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tarefas' });
    }
});


// GET /api/romaneio - List all
app.get('/api/romaneio', async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT idRomaneio AS idRomaneio, Descricao AS Descricao, EnviadoPara AS EnviadoPara, DATACRIACAO AS DATACRIACAO, CriadoPor AS CriadoPor, ENDERECORomaneio AS ENDERECORomaneio, Estatus AS Estatus, Liberado AS Liberado, DataEnvio AS DataEnvio, NomeMotorista AS NomeMotorista FROM romaneio WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') ORDER BY idRomaneio DESC"
        );


        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching romaneios:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar romaneios' });
    }
});

// GET /api/romaneio/:id - Get single romaneio details
app.get('/api/romaneio/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM romaneio WHERE idRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Romaneio n�o encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(`Error fetching romaneio #${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do romaneio' });
    }
});

// GET /api/romaneio/v-itens-projeto-aberto - Search available items from project
app.get('/api/romaneio/v-itens-projeto-aberto', async (req, res) => {
    const { projeto, tag, resumo, detalhe, codFabricante, mostrarEnviados, mostrarFinalizados } = req.query;

    try {
        let conditionFinalizado = "(OrdemServicoItemFinalizado = '' OR OrdemServicoItemFinalizado IS NULL)";
        if (mostrarFinalizados === 'true') {
            conditionFinalizado = "(OrdemServicoItemFinalizado = '' OR OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = 'C')";
        }

        let sql = `SELECT * FROM viewitensprojetoemaberto WHERE 
            ${conditionFinalizado} AND 
            (Liberado_Engenharia = 'S')`;

        const params = [];

        if (mostrarEnviados !== 'true') {
            sql += ` AND (QtdeTotal <> RomaneioTotalEnviado OR RomaneioTotalEnviado IS NULL OR RomaneioTotalEnviado = '')`;
        }

        if (projeto) {
            sql += ` AND Projeto LIKE ?`;
            params.push(`%${projeto}%`);
        }
        if (tag) {
            sql += ` AND Tag LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (resumo) {
            sql += ` AND DescResumo LIKE ?`;
            params.push(`%${resumo}%`);
        }
        if (detalhe) {
            sql += ` AND DescDetal LIKE ?`;
            params.push(`%${detalhe}%`);
        }
        if (codFabricante) {
            sql += ` AND CodMatFabricante LIKE ?`;
            params.push(`%${codFabricante}%`);
        }

        sql += ` LIMIT 100`;

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching v-itens-projeto-aberto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens dispon�veis.' });
    }
});

// POST /api/romaneio/:id/items - Add items to a Romaneio
app.post('/api/romaneio/:id/items', async (req, res) => {
    const { id } = req.params;
    const { IdOrdemServicoItem, qtde, usuario } = req.body;

    if (!IdOrdemServicoItem || !qtde || qtde <= 0) {
        return res.status(400).json({ success: false, message: 'Dados inv�lidos para inclus�o.' });
    }

    try {
        // 1. Fetch item details and check balance from view
        const [viewRows] = await pool.execute(
            "SELECT * FROM viewitensprojetoemaberto WHERE IdOrdemServicoItem = ?",
            [IdOrdemServicoItem]
        );

        if (viewRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item n�o encontrado ou j� finalizado.' });
        }

        const item = viewRows[0];
        const saldoDisponivel = (item.QtdeTotal || 0) - (item.RomaneioTotalEnviado || 0);

        if (qtde > saldoDisponivel) {
            return res.status(400).json({
                success: false,
                message: `Quantidade solicitada (${qtde}) � maior que o saldo dispon�vel (${saldoDisponivel}).`
            });
        }

        // 2. Insert into romaneioitem
        // Note: Field names based on DESCRIBE results. 
        // We populate Unit values from view and calculate Totals.
        const pesoUnit = item.PesoUnitario || 0;
        const areaUnit = item.AreaPinturaUnitario || 0;
        const pesoTotal = pesoUnit * qtde;
        const areaTotal = areaUnit * qtde;

        const sql = `
            INSERT INTO romaneioitem (
                IdRomaneio, IDOrdemServicoITEM, Usuario, DataCriacao, 
                qtdeUsuario, qtdeGrid, QtdeRomaneio,
                PesoUnitario, PesoTotal, 
                AreaPintura, AreaPinturaTotal,
                CodMatFabricante, Situacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ITEM LOCALIZADO')
        `;

        const params = [
            id, IdOrdemServicoItem, usuario || 'Sistema', getCurrentDateTimeBR(),
            qtde, qtde, qtde,
            pesoUnit, pesoTotal,
            areaUnit, areaTotal,
            item.CodMatFabricante || '',
        ];

        await pool.execute(sql, params);

        // --- ATUALIZA��O REQUISITADA: SalvarDados em ordemservicoitemcontrole para 'Expedicao' ---
        // Mapeando os par�metros do VB.NET para a inser��o:
        // ClasseordemservicoitemControle.SalvarDados(..., "Expedicao", ...)
        const historicoSql = `
            INSERT INTO ordemservicoitemcontrole (
                IdOrdemServico,
                IdOrdemServicoItem,
                Processo,
                QtdeTotal,
                QtdeProduzida,
                Origem,
                CriadoPor,
                DataCriacao,
                D_E_L_E_T_E
            ) VALUES (?, ?, 'Expedicao', ?, ?, 'Expedicao', ?, ?, '')
        `;
        const historicoParams = [
            item.IdOrdemServico,
            IdOrdemServicoItem,
            item.QtdeTotal || qtde, // QtdeTotal
            qtde,                   // QtdeProduzida
            usuario || 'Sistema',
            getCurrentDateTimeBR()
        ];

        await pool.execute(historicoSql, historicoParams);
        // -----------------------------------------------------------------------------------------

        res.json({ success: true, message: 'Item inclu�do com sucesso no romaneio.' });
    } catch (error) {
        console.error('Error adding item to romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao incluir item no romaneio.' });
    }
});

// GET /api/romaneio/:id/inserted-items - List items already in the Romaneio
app.get('/api/romaneio/:id/inserted-items', async (req, res) => {
    const { id } = req.params;
    const { projeto, tag, resumo, detalhe, codFabricante } = req.query;

    try {
        let sql = `SELECT * FROM viewromaneioitem WHERE IdRomaneio = ?`;
        const params = [id];

        if (projeto) {
            sql += ` AND Projeto LIKE ?`;
            params.push(`%${projeto}%`);
        }
        if (tag) {
            sql += ` AND Tag LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (resumo) {
            sql += ` AND DescResumo LIKE ?`;
            params.push(`%${resumo}%`);
        }
        if (detalhe) {
            sql += ` AND DescDetal LIKE ?`;
            params.push(`%${detalhe}%`);
        }
        if (codFabricante) {
            sql += ` AND CodMatFabricante LIKE ?`;
            params.push(`%${codFabricante}%`);
        }

        sql += ` LIMIT 200`;

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching inserted items:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens do romaneio.' });
    }
});

// GET /api/files/open-pdf/:idRomaneioItem - Open PDF drawing for a romaneio item
app.get('/api/files/open-pdf/:idRomaneioItem', async (req, res) => {
    const { idRomaneioItem } = req.params;
    const fs = require('fs');
    const path = require('path');

    console.log(`[FILES] Request to open PDF for Item: ${idRomaneioItem}`);

    try {
        const [rows] = await pool.execute(
            "SELECT EnderecoArquivo FROM viewromaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (rows.length === 0 || !rows[0].EnderecoArquivo) {
            console.warn(`[FILES] No EnderecoArquivo found for Item: ${idRomaneioItem}`);
            return res.status(404).json({ success: false, message: 'Arquivo n�o associado a este item.' });
        }

        const originalEndereco = rows[0].EnderecoArquivo;
        let endereco = originalEndereco;

        // Normaliza��o baseada na l�gica VB.NET original
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            if (endereco.toLowerCase().endsWith(ext.toLowerCase())) {
                endereco = endereco.substring(0, endereco.length - ext.length) + ".PDF";
            }
        });

        console.log(`[FILES] Mapping: "${originalEndereco}" -> "${endereco}"`);

        if (fs.existsSync(endereco)) {
            console.log(`[FILES] File exists. Serving: ${endereco}`);
            res.sendFile(path.resolve(endereco), (err) => {
                if (err) {
                    console.error(`[FILES] Error sending file:`, err);
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: `Erro ao enviar arquivo: ${err.message}. Caminho: ${endereco}`,
                            path: endereco
                        });
                    }
                }
            });
        } else {
            console.error(`[FILES] File NOT found: ${endereco}`);
            res.status(404).json({
                success: false,
                message: `Arquivo PDF n�o encontrado. Favor verificar se o caminho est� acess�vel: ${endereco}`,
                path: endereco
            });
        }
    } catch (error) {
        console.error('[FILES] Fatal error opening PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar solicita��o do desenho.' });
    }
});

// GET /api/files/open-3d/:idRomaneioItem - Open original 3D drawing
app.get('/api/files/open-3d/:idRomaneioItem', async (req, res) => {
    const { idRomaneioItem } = req.params;
    const fs = require('fs');
    const path = require('path');

    console.log(`[FILES] Request to open 3D for Item: ${idRomaneioItem}`);

    try {
        const [rows] = await pool.execute(
            "SELECT EnderecoArquivo FROM viewromaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (rows.length === 0 || !rows[0].EnderecoArquivo) {
            console.warn(`[FILES] No EnderecoArquivo found for Item: ${idRomaneioItem}`);
            return res.status(404).json({ success: false, message: 'Arquivo n�o associado a este item.' });
        }

        const endereco = rows[0].EnderecoArquivo;
        console.log(`[FILES] Serving 3D: "${endereco}"`);

        if (fs.existsSync(endereco)) {
            res.sendFile(path.resolve(endereco), (err) => {
                if (err && !res.headersSent) {
                    console.error(`[FILES] Error sending 3D file:`, err);
                    res.status(500).json({
                        success: false,
                        message: `Erro ao enviar arquivo 3D: ${err.message}.`,
                        path: endereco
                    });
                }
            });
        } else {
            console.error(`[FILES] 3D File NOT found: ${endereco}`);
            res.status(404).json({
                success: false,
                message: `Arquivo original n�o encontrado no servidor: ${endereco}`,
                path: endereco
            });
        }
    } catch (error) {
        console.error('[FILES] Fatal error opening 3D:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar desenho 3D.' });
    }
});

// DELETE /api/romaneio/item/:idRomaneioItem - Delete item from romaneio with balance updates
app.delete('/api/romaneio/item/:idRomaneioItem', async (req, res) => {
    const { idRomaneioItem } = req.params;
    const { usuario } = req.query; // Pega o usu�rio da query string ou header se dispon�vel
    const connection = await pool.getConnection();

    console.log(`[DELETE] Request to delete Item: ${idRomaneioItem} by User: ${usuario}`);

    try {
        await connection.beginTransaction();

        // 1. Validar se o item existe e obter dados b�sicos
        const [itemRows] = await connection.execute(
            "SELECT IdRomaneio, IDOrdemServicoITEM, qtdeUsuario FROM romaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (itemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Item n�o encontrado.' });
        }

        const item = itemRows[0];
        const idRomaneio = item.IdRomaneio;
        const idOSItem = item.IDOrdemServicoITEM;
        const qtdeRemover = item.qtdeUsuario;

        // 2. Validar Bloqueio (Controle - RNC/Retornos)
        const [controleRows] = await connection.execute(
            "SELECT COUNT(idromaneioitemcontrole) as total FROM romaneioitemcontrole WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (controleRows[0].total > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'J� existe retorno deste Item, n�o pode ser exclu�do.' });
        }

        // 3. Validar Bloqueio (Status do Romaneio - Liberado)
        const [romaneioRows] = await connection.execute(
            "SELECT Liberado FROM romaneio WHERE idRomaneio = ?",
            [idRomaneio]
        );

        if (romaneioRows.length > 0 && romaneioRows[0].Liberado === 'S') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este Romaneio j� est� Liberado e n�o permite exclus�o de itens.' });
        }

        // 4. Soft Delete do Item
        await connection.execute(
            "UPDATE romaneioitem SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = NOW(), UsuarioD_E_L_E_T_E = ? WHERE IdRomaneioItem = ?",
            [usuario || 'Sistema', idRomaneioItem]
        );

        // 5. Atualizar Saldo na Ordem de Servi�o (ordemservicoitem)
        const [osItemRows] = await connection.execute(
            "SELECT RomaneioTotalEnviado, RomaneioSaldoEnviar FROM ordemservicoitem WHERE IdOrdemServicoItem = ?",
            [idOSItem]
        );

        if (osItemRows.length > 0) {
            let totalEnviado = (osItemRows[0].RomaneioTotalEnviado || 0) - qtdeRemover;
            let saldoEnviar = (osItemRows[0].RomaneioSaldoEnviar || 0) + qtdeRemover;

            // Garantir que n�o fiquem negativos por erro de arredondamento ou dados pr�vios
            totalEnviado = Math.max(0, totalEnviado);

            const liberadoStatus = totalEnviado === 0 ? '' : 'S';

            await connection.execute(
                "UPDATE ordemservicoitem SET RomaneioTotalEnviado = ?, RomaneioSaldoEnviar = ?, EnviadoParaRomaneio = ? WHERE IdOrdemServicoItem = ?",
                [totalEnviado, saldoEnviar, liberadoStatus, idOSItem]
            );
        }

        // 6. Recalcular Totais do Romaneio
        const [totaisRows] = await connection.execute(
            "SELECT SUM(qtdeUsuario) as totalQtde, SUM(PesoTotal) as totalPeso, SUM(AreaPinturaTotal) as totalArea FROM romaneioitem WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND IdRomaneio = ?",
            [idRomaneio]
        );

        const totais = totaisRows[0];
        await connection.execute(
            "UPDATE romaneio SET QtdeTotalEnviada = ?, PesoTotalEnviado = ?, AreaTotalEnviada = ? WHERE IdRomaneio = ?",
            [totais.totalQtde || 0, totais.totalPeso || 0, totais.totalArea || 0, idRomaneio]
        );

        await connection.commit();
        console.log(`[DELETE] Item ${idRomaneioItem} deleted successfully.`);
        res.json({ success: true, message: 'Item exclu�do com sucesso e saldos atualizados.' });

    } catch (error) {
        await connection.rollback();
        console.error('[DELETE] Error deleting romaneio item:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao excluir item do romaneio.' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/shutdown - Shut down background processes
app.post('/api/admin/shutdown', async (req, res) => {
    console.log('[SYSTEM] =4 Shutdown requested by admin.');
    res.json({ success: true, message: 'Encerrando servidores...' });

    setTimeout(() => {
        const { exec } = require('child_process');

        if (process.platform === 'win32') {
            // Kill Vite on port 5173
            exec('netstat -ano | findstr :5173', (err, stdout) => {
                if (stdout) {
                    const lines = stdout.trim().split('\n');
                    lines.forEach(line => {
                        const parts = line.trim().split(/\s+/);
                        const pid = parts[parts.length - 1];
                        if (pid && pid !== '0' && pid !== process.pid.toString()) {
                            console.log(`[SYSTEM] Killing Vite process (PID: ${pid})`);
                            exec(`taskkill /F /PID ${pid}`);
                        }
                    });
                }
                console.log('[SYSTEM] Server self-destructing in 500ms...');
                setTimeout(() => process.exit(0), 500);
            });
        } else {
            exec('lsof -t -i:5173 | xargs kill -9', () => process.exit(0));
        }
    }, 1000);
});

// POST /api/romaneio/open - Open Folder on Server
app.post('/api/romaneio/open', async (req, res) => {
    const { id } = req.body;
    try {
        // 1. Get Root Path Config
        const [configRows] = await pool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoPastaRaizRomaneio' LIMIT 1"
        );

        if (configRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Configura��o EnderecoPastaRaizRomaneio n�o encontrada.' });
        }

        const rootPath = configRows[0].valor;

        // 2. Construct Folder Path (RO_paddedId)
        const paddedId = String(id).padStart(4, '0');
        const folderPath = `${rootPath}\\RO_${paddedId}`;

        console.log(`[Action] Attempting to open Romaneio folder: ${folderPath}`);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ success: false, message: `Pasta n�o encontrada no servidor: ${folderPath}` });
        }

        // Execute command to open folder (Windows)
        require('child_process').exec(`start "" "${folderPath}"`, (err) => {
            if (err) {
                console.error('Error opening folder:', err);
            }
        });

        res.json({ success: true, message: `Abrindo pasta: ${folderPath}` });

    } catch (error) {
        console.error('Error opening romaneio folder:', error);
        res.status(500).json({ success: false, message: 'Erro ao abrir pasta' });
    }
});

// POST /api/romaneio - Create New
app.post('/api/romaneio', async (req, res) => {
    const data = req.body;
    let conn;
    try {
        conn = await pool.getConnection();

        // 1. Get Root Path Config BEFORE Transaction
        const [configRows] = await conn.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoPastaRaizRomaneio' LIMIT 1"
        );

        let rootPath = 'C:\\Romaneios'; // Fallback
        if (configRows.length > 0 && configRows[0].valor) {
            rootPath = configRows[0].valor;
        }

        // Validate Root Path
        if (!fs.existsSync(rootPath)) {
            conn.release(); // Important to release before returning
            return res.status(400).json({
                success: false,
                message: `Caminho raiz n�o encontrado: ${rootPath}. Verifique a configura��o do sistema.`
            });
        }

        await conn.beginTransaction();

        // 2. Insert basic data
        const [result] = await conn.execute(
            `INSERT INTO romaneio (
                Descricao, EnviadoPara, endereco, numero, bairro, complemento, 
                cidade, estado, cep, email, DATACRIACAO, CriadoPor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.descricao || '',
                data.enviarPara || '',
                data.endereco || '',
                data.numero || '',
                data.bairro || '',
                data.complemento || '',
                data.cidade || '',
                data.estado || '',
                data.cep || '',
                data.email || '',
                getCurrentDateTimeBR(),
                data.usuario || 'Sistema'
            ]
        );

        const newId = result.insertId;

        // 3. Generate Folder Path
        // Formula: 'EnderecoPastaRaizRomaneio & "\RO_" & NovoIdRomaneio'
        // Example: G:\Meu Drive\01-Romaneio\RO\0001 -> Implies RO_ prefix or folder?
        // User text: "Ficando assim como exemplo: ...\RO\0001".
        // But formula text: "& "\RO_" & NovoIdRomaneio". this literally means \RO_10
        // I will follow the visual example slightly better but respecting the ID:
        // Let's interpret "\RO_" as a prefix for the folder name.
        // If ID=10, Path = Root\RO_0010 (padded).

        const paddedId = String(newId).padStart(4, '0'); // User example '0001' implies 4 digits
        // Using straight backslashes for Windows path
        const folderPath = `${rootPath}\\RO_${paddedId}`;

        // Note: User said "exemplo: ...\RO\0001". If they meant a subfolder "RO", the formula would be "\RO\" & ID.
        // But they wrote "\RO_" & ID. I'm checking the previous code...
        // Previous code was `RO_${paddedId}\PDF`.
        // I will stick to `RO_${paddedId}` as the main folder for the Romaneio.

        // 4. Update with Path
        await conn.execute(
            "UPDATE romaneio SET ENDERECORomaneio = ? WHERE idRomaneio = ?",
            [folderPath, newId]
        );

        await conn.commit();
        res.json({ success: true, message: 'Romaneio criado com sucesso', id: newId, path: folderPath });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Error creating romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar romaneio: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

// PUT /api/romaneio/:id - Update
app.put('/api/romaneio/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        await pool.execute(
            `UPDATE romaneio SET 
                Descricao = ?, EnviadoPara = ?, endereco = ?, numero = ?, 
                bairro = ?, complemento = ?, cidade = ?, estado = ?, 
                cep = ?, email = ?
             WHERE idRomaneio = ?`,
            [
                data.descricao || '',
                data.enviarPara || '',
                data.endereco || '',
                data.numero || '',
                data.bairro || '',
                data.complemento || '',
                data.cidade || '',
                data.estado || '',
                data.cep || '',
                data.email || '',
                id
            ]
        );
        res.json({ success: true, message: 'Romaneio atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar romaneio' });
    }
});

// DELETE /api/romaneio/:id - Soft Delete romaneio
app.delete('/api/romaneio/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            "UPDATE romaneio SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ? WHERE idRomaneio = ?",
            [getCurrentDateTimeBR(), id]
        );
        res.json({ success: true, message: 'Romaneio exclu�do com sucesso' });
    } catch (error) {
        console.error('Error deleting romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir romaneio' });
    }
});

// PUT /api/romaneio/:id/action - Perform specific actions (Status Workflow)
app.put('/api/romaneio/:id/action', async (req, res) => {
    const { id } = req.params;
    const { action, usuario } = req.body;
    if (!action) {
        return res.status(400).json({ success: false, message: 'A��o n�o especificada.' });
    }

    let updateQuery = "";
    let params = [];
    const now = getCurrentDateTimeBR();

    // Map actions to DB updates
    try {
        switch (action) {
            case 'registrar':
                const { dadosEnvio } = req.body;

                // Pre-check: Verify if already registered or sent
                const [checkRows] = await pool.execute(
                    "SELECT idRomaneio, NomeMotorista, DataEnvio FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );

                if (checkRows.length > 0) {
                    const r = checkRows[0];
                    const hasMotorista = r.NomeMotorista && String(r.NomeMotorista).trim() !== '';
                    const hasData = r.DataEnvio && String(r.DataEnvio).trim() !== '';

                    if (hasMotorista || hasData) {
                        console.log(`[Validation] Bloqueio registrar ID ${id}: Motorista=${r.NomeMotorista}, Data=${r.DataEnvio}`);
                        return res.status(400).json({
                            success: false,
                            message: `Este Romaneio j� possui registro de envio e n�o pode ser alterado. (Motorista: ${r.NomeMotorista || 'N/A'} | Data: ${r.DataEnvio || 'N/A'}). O processo foi finalizado.`
                        });
                    }
                }

                // Validate mandatory fields if this is a registration with data
                if (dadosEnvio) {
                    if (!dadosEnvio.motorista || !dadosEnvio.placa || !dadosEnvio.tipoTransporte || !dadosEnvio.cnh || !dadosEnvio.categoria || !dadosEnvio.telefone) {
                        // Strict validation as requested
                        return res.status(400).json({ success: false, message: 'Dados de envio incompletos. Preencha todos os campos obrigat�rios.' });
                    }

                    const dataEnvio = getCurrentDateBR();
                    const horaEnvio = new Date().toLocaleTimeString('pt-BR', { hour12: false });

                    updateQuery = `UPDATE romaneio SET 
                        Estatus = '', 
                        DataEnvio = ?, 
                        HoraEnvio = ?,
                        NomeMotorista = ?, 
                        PlacaVeiculo = ?, 
                        Cnh = ?, 
                        Categoria = ?, 
                        Telefone = ?, 
                        TipoTransporte = ?
                        WHERE idRomaneio = ?`;

                    params = [
                        dataEnvio,
                        horaEnvio,
                        dadosEnvio.motorista.toUpperCase(),
                        dadosEnvio.placa.toUpperCase(),
                        dadosEnvio.cnh ? dadosEnvio.cnh.toUpperCase() : '',
                        dadosEnvio.categoria ? dadosEnvio.categoria.toUpperCase() : '',
                        dadosEnvio.telefone || '',
                        dadosEnvio.tipoTransporte.toUpperCase(),
                        id
                    ];
                } else {
                    // Legacy/Fallback (though user said mandatory, keeping basic switch just in case of simple call, but forcing update)
                    // Actually, user said mandatory. So if no data, we should probably fail or assume it's a pre-check.
                    // But for safety, I'll keep the old one OR duplicate. 
                    // Let's assume frontend WILL send data. If not, it might be a simple status change? 
                    // No, "os novos campos tambem ser�o obrigatorios".
                    if (!req.body.dadosEnvio) {
                        return res.status(400).json({ success: false, message: 'Dados do transporte s�o obrigat�rios para registrar.' });
                    }
                }
                break;

            case 'liberar':
                // 1. Check current status
                const [currentRows] = await pool.execute(
                    "SELECT Estatus, Liberado, D_E_L_E_T_E, NomeMotorista, DataEnvio FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );

                if (currentRows.length === 0) {
                    return res.status(404).json({ success: false, message: 'Romaneio n�o encontrado.' });
                }

                const current = currentRows[0];

                // Validation 1: Check if soft deleted
                if (current.D_E_L_E_T_E === '*') {
                    return res.status(400).json({ success: false, message: 'N�o � poss�vel liberar um romaneio exclu�do.' });
                }

                // Validation 2: Check if already finalized
                if (current.Estatus === 'F') {
                    return res.status(400).json({ success: false, message: 'Romaneio j� finalizado. N�o � poss�vel liberar.' });
                }

                // Validation 3: Check if registered (Motorista and Date)
                if (!current.NomeMotorista || !current.DataEnvio) {
                    return res.status(400).json({ success: false, message: 'O romaneio deve ser registrado (motorista e data) antes de ser liberado.' });
                }

                // Validation 4: Check if already released (Condition 1)
                if (current.Liberado === 'S') {
                    return res.status(400).json({ success: false, message: 'O romaneio j� consta como Liberado. O processo n�o pode ser repetido.' });
                }

                // Validation 5: Check if there are items (Condition 2)
                const [itemRows] = await pool.execute(
                    "SELECT COUNT(*) as count FROM romaneioitem WHERE IdRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
                    [id]
                );

                if (itemRows[0].count === 0) {
                    return res.status(400).json({ success: false, message: 'O romaneio n�o possui itens vinculados. Libera��o interrompida. Por favor, adicione itens antes de prosseguir.' });
                }

                // Proceed with update
                updateQuery = "UPDATE romaneio SET Estatus = '', Liberado = 'S', DataLiberacao = ?, UsuarioLiberacao = ? WHERE idRomaneio = ?";
                params = [now, usuario || 'Sistema', id];
                break;

            case 'cancelar_lib':
                // 1. Fetch current details
                const [abortRows] = await pool.execute(
                    "SELECT Estatus, Liberado, ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );

                if (abortRows.length === 0) {
                    console.log(`[Action] ERRO: Romaneio #${id} n�o localizado no banco de dados para cancelar libera��o.`);
                    return res.status(404).json({ success: false, message: `Romaneio #${id} n�o encontrado no banco de dados.` });
                }

                const abort = abortRows[0];
                // Helper for case-insensitive access in JS object
                const getAbortVal = (obj, key) => {
                    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                    return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                };

                const abortLiberado = getAbortVal(abort, 'Liberado');
                const abortEstatus = getAbortVal(abort, 'Estatus');

                console.log(`[Action] Cancelar Libera��o ID: ${id} | Estatus: "${abortEstatus}" | Liberado: "${abortLiberado}"`);

                // STRICT VALIDATION
                if (abortEstatus === 'F') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} j� est� FINALIZADO e n�o pode ser cancelado.` });
                }

                if (abortLiberado !== 'S') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} n�o consta como liberado (Status DB: "${abortLiberado}"). Libera��o n�o pode ser cancelada.` });
                }

                // 2. Perform cleanup if released
                if (abort.ENDERECORomaneio) {
                    const pdfPath = path.join(abort.ENDERECORomaneio, 'PDF');
                    console.log(`[Action] Limpando diret�rio de PDFs: ${pdfPath}`);
                    limparDiretorio(pdfPath);
                }

                // 3. Update database (Matching Legacy VB.NET exact fields and values)
                console.log(`[Action] Executando SQL de Cancelamento para Romaneio #${id}`);
                updateQuery = "UPDATE romaneio SET Estatus = '', Liberado = '', UsuarioLiberacao = '', DataLiberacao = '' WHERE idRomaneio = ?";
                params = [id];
                break;

            case 'atualizar':
                // For now, maybe just update status to 'Atualizado'? Or just a touch? 
                // "Atualizar Docs" might imply checking files on disk. For now, let's just log it.
                // Keeping status as is or setting to 'Docs Atualizados' if desired.
                // Let's keep it simple: just return success for now or update a timestamp.
                return res.json({ success: true, message: 'Documentos atualizados (simulado).' });

            case 'finalizar':
                updateQuery = "UPDATE romaneio SET Estatus = 'F', DataFinalizacao = ?, UsuarioFinalizacao = ? WHERE idRomaneio = ?";
                params = [now, usuario || 'Sistema', id];
                break;

            case 'cancelar_fin':
                // Revert to Liberado (Estatus = '', Liberado is already 'S')
                updateQuery = "UPDATE romaneio SET Estatus = '', DataFinalizacao = NULL, UsuarioFinalizacao = NULL WHERE idRomaneio = ?";
                params = [id];
                break;

            case 'excel':
                const manualExcel = await ExportarRomaneioExcelPadrao(id);
                if (manualExcel.success) {
                    return res.json({ success: true, message: `Excel gerado com sucesso: ${manualExcel.fileName}`, excel: manualExcel });
                } else {
                    return res.status(500).json({ success: false, message: `Erro ao gerar Excel: ${manualExcel.error}` });
                }

            default:
                return res.status(400).json({ success: false, message: 'A��o inv�lida.' });
        }

        const [result] = await pool.execute(updateQuery, params);

        // --- Post-Action Logic: Excel Export for 'liberar' ---
        let excelResult = null;
        if (action === 'liberar' && result.affectedRows > 0) {
            excelResult = await ExportarRomaneioExcelPadrao(id);
        }

        if (result.affectedRows > 0) {
            let successMessage = `A��o '${action}' realizada com sucesso!`;
            if (action === 'liberar') {
                successMessage = excelResult?.success
                    ? `Romaneio liberado e Excel gerado com sucesso: ${excelResult.fileName}`
                    : `Romaneio liberado, mas houve um erro ao gerar o Excel: ${excelResult?.error || 'Erro desconhecido'}`;
            }
            res.json({
                success: true,
                message: successMessage,
                excel: excelResult
            });
        } else {
            res.status(404).json({ success: false, message: 'Romaneio n�o encontrado.' });
        }

    } catch (error) {
        console.error(`Error performing action ${action} on romaneio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao processar a��o.' });
    }
});

// --- ROMANEIO-RETORNO ROUTES ---

// GET /api/romaneio-retorno/items - List items for return control
app.get('/api/romaneio-retorno/items', async (req, res) => {
    const { romaneio, projeto, tag, numDoc, mostrarConcluidos } = req.query;
    try {
        let sql = `SELECT * FROM viewromaneioitem WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`;
        const params = [];

        if (romaneio) {
            sql += ` AND IdRomaneio = ?`;
            params.push(romaneio);
        }
        if (projeto) {
            sql += ` AND PROJETO LIKE ?`;
            params.push(`%${projeto}%`);
        }
        if (tag) {
            sql += ` AND TAG LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (numDoc) {
            sql += ` AND CodMatFabricante LIKE ?`;
            params.push(`%${numDoc}%`);
        }

        // Se 'mostrarConcluidos' n�o for true, filtra apenas os que n�o foram finalizados
        if (mostrarConcluidos !== 'true') {
            sql += ` AND (MarcarComoFinalizado IS NULL OR MarcarComoFinalizado != 'S')`;
        }

        sql += ` ORDER BY IdRomaneio DESC, IdRomaneioItem ASC LIMIT 500`;

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[RETORNO] Erro ao buscar itens:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens para retorno.' });
    }
});

// GET /api/romaneio-retorno/history/:idRomaneioItem - List movement history for an item
app.get('/api/romaneio-retorno/history/:idRomaneioItem', async (req, res) => {
    const { idRomaneioItem } = req.params;
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM romaneioitemcontrole 
             WHERE IdRomaneioItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
             ORDER BY DataCriacao DESC`,
            [idRomaneioItem]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[RETORNO] Erro ao buscar hist�rico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar hist�rico do item.' });
    }
});

// POST /api/romaneio-retorno/process - Mark item as returned/processed
app.post('/api/romaneio-retorno/process', async (req, res) => {
    const { idRomaneioItem, qtdeRetorno, observacao, usuario, tipoRetorno } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obter dados do item original
        const [itemRows] = await connection.execute(
            "SELECT QtdeRomaneio, QtdeTotalRetorno, IDOrdemServicoITEM FROM romaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (itemRows.length === 0) {
            throw new Error('Item do romaneio n�o encontrado.');
        }

        const item = itemRows[0];
        const novaQtdeRetorno = (Number(item.QtdeTotalRetorno) || 0) + Number(qtdeRetorno);

        // 2. Inserir no hist�rico (romaneioitemcontrole)
        await connection.execute(
            `INSERT INTO romaneioitemcontrole (
                IdRomaneioItem, IDOrdemServicoITEM, QtdeIdentificadores, DataCriacao, 
                UsuarioLogado, Observacao, Situacao
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
            [idRomaneioItem, item.IDOrdemServicoITEM, qtdeRetorno, usuario || 'Sistema', observacao || '', tipoRetorno || 'ENTRADA/RETORNO']
        );

        // 3. Atualizar item do romaneio
        await connection.execute(
            "UPDATE romaneioitem SET QtdeTotalRetorno = ?, Situacao = ? WHERE IdRomaneioItem = ?",
            [novaQtdeRetorno, tipoRetorno || 'ITEM COM RETORNO', idRomaneioItem]
        );

        await connection.commit();
        res.json({ success: true, message: 'Retorno processado com sucesso.' });
    } catch (error) {
        await connection.rollback();
        console.error('[RETORNO] Erro ao processar:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao processar retorno.' });
    } finally {
        connection.release();
    }
});

// DELETE /api/romaneio-retorno/history/:idControle - Cancel a return entry
app.delete('/api/romaneio-retorno/history/:idControle', async (req, res) => {
    const { idControle } = req.params;
    const { usuario } = req.query;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obter dados do controle
        const [ctrlRows] = await connection.execute(
            "SELECT IdRomaneioItem, QtdeIdentificadores FROM romaneioitemcontrole WHERE idromaneioitemcontrole = ?",
            [idControle]
        );

        if (ctrlRows.length === 0) {
            throw new Error('Registro de hist�rico n�o encontrado.');
        }

        const ctrl = ctrlRows[0];
        const idItem = ctrl.IdRomaneioItem;
        const qtdeSubtrair = Number(ctrl.QtdeIdentificadores);

        // 2. Soft delete do controle
        await connection.execute(
            "UPDATE romaneioitemcontrole SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = NOW(), UsuarioD_E_L_E_T_E = ? WHERE idromaneioitemcontrole = ?",
            [usuario || 'Sistema', idControle]
        );

        // 3. Reverter saldo no item do romaneio
        const [itemRows] = await connection.execute(
            "SELECT QtdeTotalRetorno FROM romaneioitem WHERE IdRomaneioItem = ?",
            [idItem]
        );

        if (itemRows.length > 0) {
            const novoSaldo = Math.max(0, (Number(itemRows[0].QtdeTotalRetorno) || 0) - qtdeSubtrair);
            await connection.execute(
                "UPDATE romaneioitem SET QtdeTotalRetorno = ? WHERE IdRomaneioItem = ?",
                [novoSaldo, idItem]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Entrada cancelada com sucesso.' });
    } catch (error) {
        await connection.rollback();
        console.error('[RETORNO] Erro ao cancelar retorno:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao cancelar retorno.' });
    } finally {
        connection.release();
    }
});

// Configura��o do Sistema (Admin only)
const configuracaoSistemaRouter = require('./routes/configuracao-sistema');
app.use('/api/configuracao-sistema', configuracaoSistemaRouter);

// Login
// --- CENTRAL AUTHENTICATION ---

const CENTRAL_DB_CONFIG = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal',
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

// Helper: Check if user is Superadmin in Central DB
async function isUserSuperadmin(login) {
    let conn;
    try {
        conn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [rows] = await conn.execute(
            "SELECT superadmin FROM usuarios_central WHERE login = ? AND superadmin = 'S'",
            [login]
        );
        return rows.length > 0;
    } catch (err) {
        console.error('Error checking superadmin:', err);
        return false;
    } finally {
        if (conn) await conn.end();
    }
}

// Helper: Authenticate against central DB and return tenant DB config
async function authenticateCentralUser(login, password) {
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        // Use LEFT JOIN to allow users without tenant (global) - though logic below assumes tenantConfig.
        const [rows] = await connection.execute(
            `SELECT u.id, u.login, u.id_usuario_origem, u.superadmin,
                    c.nome_cliente, c.db_host, c.db_user, c.db_pass, c.db_name, c.db_port 
             FROM usuarios_central u
             LEFT JOIN conexoes_bancos c ON u.id_conexao_banco = c.id
             WHERE u.login = ? AND u.senha = ? AND (c.ativo = 1 OR c.id IS NULL)`,
            [login, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            return {
                found: true,
                tenantConfig: user.db_host ? {
                    host: user.db_host,
                    user: user.db_user,
                    password: user.db_pass,
                    database: user.db_name,
                    port: user.db_port || 3306
                } : null,
                originalUserId: user.id_usuario_origem,
                isSuperadmin: user.superadmin === 'S',
                superadmin: user.superadmin, // Raw value 'S' or 'N'
                clientName: user.nome_cliente
            };
        }
        return { found: false };

    } catch (error) {
        console.error('Central Auth Error:', error);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

// Login Modified for Central Auth
app.post('/api/login', async (req, res) => {
    const { login, senha, password } = req.body;
    const pwd = senha || password;

    if (!login || !pwd) {
        return res.status(400).json({ success: false, message: 'Usu�rio e senha s�o obrigat�rios' });
    }

    try {
        // 1. Try Central Auth First
        console.log(`[AUTH] Attempting central login for user: ${login}`);
        try {
            const centralAuth = await authenticateCentralUser(login, pwd);

            if (centralAuth.found) {
                if (centralAuth.tenantConfig) {
                    console.log(`[AUTH] Central user found. Switching to tenant DB: ${centralAuth.tenantConfig.database}`);

                    pool.initPool(centralAuth.tenantConfig);

                    const [userRows] = await pool.execute('SELECT * FROM usuario WHERE Login = ?', [login]);

                    if (userRows.length > 0) {
                        const user = userRows[0];
                        const role = (user.TipoUsuario === 'A' || user.TipoUsuario === 'Admin') ? 'admin' : 'user';

                        // Generate JWT
                        const token = jwt.sign({
                            id: user.idUsuario,
                            login: login,
                            role: role,
                            dbName: centralAuth.tenantConfig.database,
                            isSuperadmin: centralAuth.isSuperadmin
                        }, JWT_SECRET, { expiresIn: '12h' });

                        return res.json({
                            success: true,
                            token,
                            user: {
                                id: user.idUsuario,
                                nome: user.NomeCompleto,
                                role,
                                setor: user.Setor,
                                isSuperadmin: centralAuth.isSuperadmin,
                                superadmin: centralAuth.superadmin,
                                clientName: centralAuth.clientName,
                                dbName: centralAuth.tenantConfig.database
                            }
                        });
                    } else {
                        // User synced but not found locally, still Issue token if needed
                        const token = jwt.sign({
                            id: centralAuth.originalUserId,
                            login: login,
                            role: 'user',
                            dbName: centralAuth.tenantConfig.database,
                            isSuperadmin: centralAuth.isSuperadmin
                        }, JWT_SECRET, { expiresIn: '12h' });

                        return res.json({
                            success: true,
                            token,
                            user: {
                                id: centralAuth.originalUserId,
                                nome: login,
                                role: 'user',
                                isSuperadmin: centralAuth.isSuperadmin,
                                superadmin: centralAuth.superadmin,
                                clientName: centralAuth.clientName,
                                dbName: centralAuth.tenantConfig.database
                            },
                            warning: 'User synced but not found locally'
                        });
                    }
                } else if (centralAuth.isSuperadmin) {
                    // Global Superadmin Login (No Tenant)
                    console.log(`[AUTH] Global Superadmin login (no tenant).`);

                    const token = jwt.sign({
                        id: centralAuth.originalUserId || 999999,
                        login: login,
                        role: 'admin',
                        dbName: 'lynxlocal', // Default central
                        isSuperadmin: true
                    }, JWT_SECRET, { expiresIn: '12h' });

                    return res.json({
                        success: true,
                        token,
                        user: {
                            id: centralAuth.originalUserId || 999999,
                            nome: login,
                            role: 'admin',
                            isSuperadmin: true,
                            superadmin: 'S',
                            clientName: 'Global System',
                            dbName: 'N/A'
                        }
                    });
                }
            }
        } catch (centralErr) {
            console.warn('[AUTH] Central auth failed/unavailable, falling back to local.', centralErr.message);
        }

        // 2. Fallback to Local Auth (Legacy behavior)
        console.log('[AUTH] Falling back to local DB auth');
        const [rows] = await pool.execute('SELECT * FROM usuario WHERE Login = ? AND Senha = ?', [login, pwd]);

        if (rows.length > 0) {
            const user = rows[0];
            const role = (user.TipoUsuario === 'A' || user.TipoUsuario === 'Admin') ? 'admin' : 'user';

            // Check if Superadmin in central even if logging in locally
            const isSuper = await isUserSuperadmin(login);

            const token = jwt.sign({
                id: user.idUsuario,
                login: login,
                role: role,
                dbName: 'lynxlocal', // Local fallback assumed central or current
                isSuperadmin: isSuper
            }, JWT_SECRET, { expiresIn: '12h' });

            return res.json({
                success: true,
                token,
                user: {
                    id: user.idUsuario,
                    nome: user.NomeCompleto,
                    role,
                    isSuperadmin: isSuper
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inv�lidas' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Erro no login' });
    }
});

// --- CENTRAL MANAGEMENT (Superadmin) ---

// Mock Auth Middleware (TODO: Implement JWT)
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return next();
    }
    console.warn(`[AUTH MIDDLEWARE] Blocked access to ${req.method} ${req.url} - Missing/Invalid Token`);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Admin Login
// Admin Login
app.post('/api/admin/login', async (req, res) => {
    console.log('[ADMIN AUTH] Raw Body:', req.body);

    let { username, password } = req.body;
    username = (username || '').toString().trim();
    password = (password || '').toString().trim();

    console.log(`[ADMIN AUTH] Check: '${username}' (len=${username.length}) vs 'superadmin'`);
    console.log(`[ADMIN AUTH] Password Len: ${password.length}`);

    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [rows] = await connection.execute(
            'SELECT id, login, senha FROM usuarios_central WHERE login = ? AND superadmin = \'S\'',
            [username]
        );

        if (rows.length > 0) {
            const user = rows[0];
            if (user.senha === password) {
                console.log(`[ADMIN AUTH] Database Success: ${username}`);
                const token = jwt.sign({
                    id: user.id,
                    login: user.login,
                    role: 'admin',
                    dbName: 'lynxlocal', // Superadmin can access local db by default
                    isSuperadmin: true
                }, JWT_SECRET, { expiresIn: '12h' });

                return res.json({ success: true, token: token, userId: user.id });
            }
        }

        console.warn(`[ADMIN AUTH] Invalid credentials for: ${username}`);
        res.status(401).json({ success: false, message: 'Credenciais inv�lidas' });
    } catch (error) {
        console.error('[ADMIN AUTH] Database Error:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    } finally {
        if (connection) await connection.end();
    }
});

// Admin Impersonate (Get token for specific DB)
app.post('/api/admin/impersonate', authenticateAdmin, async (req, res) => {
    const { dbName } = req.body;
    if (!dbName) {
        return res.status(400).json({ success: false, message: 'dbName é obrigatório' });
    }

    const authHeader = req.headers['authorization'];
    const superToken = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(superToken, JWT_SECRET);
        if (!decoded.isSuperadmin) {
            return res.status(403).json({ success: false, message: 'Apenas superadmins podem usar esta rota' });
        }

        const token = jwt.sign({
            id: decoded.id,
            nome: decoded.nome || 'Superadmin',
            login: decoded.login,
            role: 'admin',
            superadmin: 'S',
            dbName: dbName,
            clientName: req.body.cliente || dbName,
            isSuperadmin: true
        }, JWT_SECRET, { expiresIn: '12h' });

        return res.json({ success: true, token });
    } catch (err) {
        console.error('[ADMIN IMPERSONATE] Token error:', err);
        return res.status(401).json({ success: false, message: 'Token de superadmin inválido' });
    }
});

// List Tenant Databases
app.get('/api/admin/databases', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [rows] = await connection.execute('SELECT * FROM conexoes_bancos ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching databases: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Add/Update Tenant Database
app.post('/api/admin/databases', authenticateAdmin, async (req, res) => {
    const { nome_cliente, db_host, db_user, db_pass, db_name, db_port } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        await connection.execute(
            `INSERT INTO conexoes_bancos (nome_cliente, db_host, db_user, db_pass, db_name, db_port) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome_cliente, db_host, db_user, db_pass, db_name, db_port || 3306]
        );
        res.json({ success: true, message: 'Banco cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving database: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Sync Users from a Tenant Database
app.post('/api/admin/sync-users/:dbId', authenticateAdmin, async (req, res) => {
    const dbId = req.params.dbId;
    let centralConn;
    let tenantConn;

    try {
        // 1. Get Tenant Config
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [dbRows] = await centralConn.execute('SELECT * FROM conexoes_bancos WHERE id = ?', [dbId]);

        if (dbRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Database not found' });
        }
        const dbConfig = dbRows[0];

        // 2. Connect to Tenant DB
        tenantConn = await mysql.createConnection({
            host: dbConfig.db_host,
            user: dbConfig.db_user,
            password: dbConfig.db_pass,
            database: dbConfig.db_name,
            port: dbConfig.db_port
        });

        // 3. Fetch Users
        const [users] = await tenantConn.execute('SELECT * FROM usuario');

        // 4. Sync to Central
        let syncedCount = 0;
        for (const user of users) {
            // Check if exists
            const [existing] = await centralConn.execute(
                'SELECT id FROM usuarios_central WHERE login = ?',
                [user.Login]
            );

            if (existing.length === 0) {
                await centralConn.execute(
                    `INSERT INTO usuarios_central (login, senha, id_conexao_banco, id_usuario_origem) 
                     VALUES (?, ?, ?, ?)`,
                    [user.Login, user.Senha, dbId, user.idUsuario]
                );
                syncedCount++;
            } else {
                // Update link if needed
                await centralConn.execute(
                    `UPDATE usuarios_central SET senha = ?, id_conexao_banco = ?, id_usuario_origem = ? 
                     WHERE id = ?`,
                    [user.Senha, dbId, user.idUsuario, existing[0].id]
                );
            }
        }

        res.json({ success: true, message: `Sincroniza��o conclu�da. ${syncedCount} novos usu�rios importados.` });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ success: false, message: 'Erro na sincroniza��o: ' + error.message });
    } finally {
        if (centralConn) await centralConn.end();
        if (tenantConn) await tenantConn.end();
    }
});

// List Central Users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [rows] = await connection.execute(`
            SELECT u.id, u.login, u.superadmin, u.created_at, u.id_conexao_banco, 
                   c.nome_cliente, c.db_name 
            FROM usuarios_central u
            LEFT JOIN conexoes_bancos c ON u.id_conexao_banco = c.id
            ORDER BY u.superadmin DESC, u.login ASC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching users: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// Update Central User (Toggle Superadmin, etc.)
app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    const userId = req.params.id;
    const { superadmin, password, id_conexao_banco } = req.body;

    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);

        let updates = [];
        let params = [];

        if (superadmin !== undefined) {
            updates.push('superadmin = ?');
            params.push(superadmin);
        }
        if (password) {
            updates.push('senha = ?');
            params.push(password);
        }
        if (id_conexao_banco !== undefined) {
            updates.push('id_conexao_banco = ?');
            params.push((id_conexao_banco === '' || id_conexao_banco === null) ? null : id_conexao_banco);
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            const sql = `UPDATE usuarios_central SET ${updates.join(', ')} WHERE id = ?`;
            params.push(userId);

            await connection.execute(sql, params);

            // Sync to Central DB (async)
            if (userRows.length > 0) {
                syncUserToCentral(userRows[0]).catch(err => {
                    console.error('[SYNC] Failed to sync updated user to central:', err);
                });
            }
            // Logic restored to match original flow before accidental insert
            res.json({ success: true, message: 'Usu�rio atualizado com sucesso' });

        }

        res.json({ success: true, message: 'Usu�rio atualizado com sucesso' });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: 'Error updating user: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- HELPER: Sync Single User to Central DB ---
async function syncUserToCentral(userData) {
    let centralConn;
    try {
        // Get current tenant DB config
        const currentConfig = pool.getConfig();
        if (!currentConfig || !currentConfig.host || !currentConfig.database) {
            console.warn('[SYNC] Cannot sync user: current DB config not available');
            return { success: false, message: 'Current DB config unavailable' };
        }

        // Connect to central
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);

        // Find the conexao_banco ID for this tenant
        const [dbRows] = await centralConn.execute(
            'SELECT id FROM conexoes_bancos WHERE db_host = ? AND db_name = ? AND ativo = 1',
            [currentConfig.host, currentConfig.database]
        );

        if (dbRows.length === 0) {
            console.warn(`[SYNC] Tenant database not registered in central: ${currentConfig.host}/${currentConfig.database}`);
            return { success: false, message: 'Tenant DB not registered in central' };
        }

        const idConexaoBanco = dbRows[0].id;

        // Check if user already exists in central
        const [existingUser] = await centralConn.execute(
            'SELECT id FROM usuarios_central WHERE login = ?',
            [userData.Login]
        );

        if (existingUser.length > 0) {
            // Update existing
            await centralConn.execute(
                `UPDATE usuarios_central 
                 SET senha = ?, id_conexao_banco = ?, id_usuario_origem = ?, updated_at = NOW()
                 WHERE id = ?`,
                [userData.Senha, idConexaoBanco, userData.idUsuario, existingUser[0].id]
            );
            console.log(`[SYNC] Updated user in central: ${userData.Login}`);
        } else {
            // Insert new
            await centralConn.execute(
                `INSERT INTO usuarios_central (login, senha, id_conexao_banco, id_usuario_origem)
                 VALUES (?, ?, ?, ?)`,
                [userData.Login, userData.Senha, idConexaoBanco, userData.idUsuario]
            );
            console.log(`[SYNC] Inserted new user to central: ${userData.Login}`);
        }

        return { success: true };

    } catch (error) {
        console.error('[SYNC] Error syncing user to central:', error);
        return { success: false, message: error.message };
    } finally {
        if (centralConn) await centralConn.end();
    }
}

// --- CRUD: Usu�rio (with Central Sync) ---

// LIST All Users
app.get('/api/usuario', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status 
             FROM usuario 
             WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
             ORDER BY NomeCompleto`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usu�rios' });
    }
});

// GET One User
app.get('/api/usuario/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status FROM usuario WHERE idUsuario = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usu�rio n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usu�rio' });
    }
});

// CREATE User (with Central Sync)
app.post('/api/usuario', async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario, email, status } = req.body;

    if (!NomeCompleto || !Login || !Senha) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Senha s�o obrigat�rios' });
    }

    try {
        // Insert into local DB
        const [result] = await pool.execute(
            `INSERT INTO usuario (NomeCompleto, Login, Senha, TipoUsuario, email, status, DataCriacao) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [NomeCompleto, Login, Senha, TipoUsuario || 'C', email || null, status || 'A']
        );

        const newUserId = result.insertId;

        // Sync to Central DB (async, non-blocking)
        const userData = {
            idUsuario: newUserId,
            Login,
            Senha,
            NomeCompleto
        };

        syncUserToCentral(userData).catch(err => {
            console.error('[SYNC] Failed to sync new user to central:', err);
        });

        res.json({ success: true, message: 'Usu�rio criado com sucesso', id: newUserId });
    } catch (error) {
        console.error('Error creating usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Login j� existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao criar usu�rio' });
        }
    }
});

// UPDATE User (with Central Sync)
app.put('/api/usuario/:id', async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario, email, status } = req.body;
    const userId = req.params.id;

    try {
        // Build dynamic update
        let updateFields = [];
        let updateValues = [];

        if (NomeCompleto) {
            updateFields.push('NomeCompleto = ?');
            updateValues.push(NomeCompleto);
        }
        if (Login) {
            updateFields.push('Login = ?');
            updateValues.push(Login);
        }
        if (Senha && Senha.trim() !== '') {
            updateFields.push('Senha = ?');
            updateValues.push(Senha);
        }
        if (TipoUsuario) {
            updateFields.push('TipoUsuario = ?');
            updateValues.push(TipoUsuario);
        }
        if (email !== undefined) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        updateValues.push(userId);

        await pool.execute(
            `UPDATE usuario SET ${updateFields.join(', ')} WHERE idUsuario = ?`,
            updateValues
        );

        // Fetch updated user for sync
        const [userRows] = await pool.execute(
            'SELECT idUsuario, Login, Senha, NomeCompleto FROM usuario WHERE idUsuario = ?',
            [userId]
        );

        if (userRows.length > 0) {
            // Sync to Central DB (async)
            syncUserToCentral(userRows[0]).catch(err => {
                console.error('[SYNC] Failed to sync updated user to central:', err);
            });
        }

        res.json({ success: true, message: 'Usu�rio atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Login j� existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao atualizar usu�rio' });
        }
    }
});

// DELETE User (Soft Delete)
app.delete('/api/usuario/:id', async (req, res) => {
    try {
        await pool.execute(
            `UPDATE usuario SET D_E_L_E_T_E = '*' WHERE idUsuario = ?`,
            [req.params.id]
        );

        // Note: We don't delete from central DB, just mark as inactive locally
        // The central DB will still have the user for historical login tracking

        res.json({ success: true, message: 'Usu�rio exclu�do com sucesso' });
    } catch (error) {
        console.error('Error deleting usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usu�rio' });
    }
});


// --- SCHEMA COMPARISON & SYNC (Superadmin) ---

// Helper: Get DB Connection Config from Central ID
async function getDbConfigById(dbId) {
    let connection;
    try {
        connection = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [rows] = await connection.execute('SELECT * FROM conexoes_bancos WHERE id = ?', [dbId]);
        if (rows.length > 0) return rows[0];
        return null;
    } finally {
        if (connection) await connection.end();
    }
}

// Helper: Get Database Schema (Tables & Columns)
async function getDatabaseSchema(dbConfig) {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: dbConfig.db_host,
            user: dbConfig.db_user,
            password: dbConfig.db_pass,
            database: dbConfig.db_name,
            port: dbConfig.db_port
        });

        const schema = { tables: {}, tableDefinitions: {} };

        // 1. Get Base Tables Only (No Views)
        const [tables] = await conn.execute(
            `SELECT TABLE_NAME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
            [dbConfig.db_name]
        );

        for (const t of tables) {
            const tableName = t.TABLE_NAME;
            schema.tables[tableName] = [];

            // 2. Get Columns
            const [columns] = await conn.execute(
                `SELECT COLUMN_NAME 
                 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                 ORDER BY ORDINAL_POSITION`,
                [dbConfig.db_name, tableName]
            );
            schema.tables[tableName] = columns.map(c => c.COLUMN_NAME);

            // 3. Get Full Create Statement (for accurate replication)
            const [createRows] = await conn.execute(`SHOW CREATE TABLE \`${tableName}\``);
            if (createRows.length > 0) {
                schema.tableDefinitions[tableName] = createRows[0]['Create Table'];
            }
        }

        return schema;
    } finally {
        if (conn) await conn.end();
    }
}

// COMPARE Schemas
app.post('/api/admin/schema/compare', authenticateAdmin, async (req, res) => {
    const { sourceDbId, destDbId } = req.body;

    if (!sourceDbId || !destDbId) {
        return res.status(400).json({ success: false, message: 'Source and Destination DBs are required' });
    }

    try {
        const sourceConfig = await getDbConfigById(sourceDbId);
        const destConfig = await getDbConfigById(destDbId);

        if (!sourceConfig || !destConfig) {
            return res.status(404).json({ success: false, message: 'Database config not found' });
        }

        const sourceSchema = await getDatabaseSchema(sourceConfig);
        const destSchema = await getDatabaseSchema(destConfig);

        const actions = [];

        for (const tableName of Object.keys(sourceSchema.tables)) {
            // 1. Check Missing Tables
            if (!destSchema.tables[tableName]) {
                actions.push({
                    type: 'create_table',
                    table: tableName,
                    description: `Create Missing Table: ${tableName}`,
                    sql: sourceSchema.tableDefinitions[tableName]
                });
            } else {
                // 2. Check Missing Columns
                const sourceCols = sourceSchema.tables[tableName];
                const destCols = destSchema.tables[tableName];

                for (const col of sourceCols) {
                    if (!destCols.includes(col)) {
                        // Extract column definition from SHOW CREATE TABLE using Regex
                        const createStmt = sourceSchema.tableDefinitions[tableName];
                        const lines = createStmt.split('\n');
                        let colDef = '';

                        // Validates line starts with `colName` (quoted)
                        const colRegex = new RegExp(`^\\s*\`${col}\`\\s+(.*?),?$`, 'i');

                        for (const line of lines) {
                            const match = line.match(colRegex);
                            if (match) {
                                colDef = line.trim();
                                if (colDef.endsWith(',')) colDef = colDef.slice(0, -1);
                                break;
                            }
                        }

                        if (colDef) {
                            actions.push({
                                type: 'add_column',
                                table: tableName,
                                column: col,
                                description: `Add Missing Column: ${tableName}.${col}`,
                                sql: `ALTER TABLE \`${tableName}\` ADD COLUMN ${colDef}`
                            });
                        }
                    }
                }
            }
        }

        res.json({ success: true, actions });

    } catch (error) {
        console.error('Schema Compare Error:', error);
        res.status(500).json({ success: false, message: 'Error comparing schemas: ' + error.message });
    }
});

// SYNC (Execute SQL)
app.post('/api/admin/schema/sync', authenticateAdmin, async (req, res) => {
    const { destDbId, sqlStatements } = req.body;

    if (!destDbId || !Array.isArray(sqlStatements) || sqlStatements.length === 0) {
        return res.status(400).json({ success: false, message: 'Destination DB and SQL statements are required' });
    }

    let conn;
    try {
        const destConfig = await getDbConfigById(destDbId);
        if (!destConfig) {
            return res.status(404).json({ success: false, message: 'Destination DB not found' });
        }

        conn = await mysql.createConnection({
            host: destConfig.db_host,
            user: destConfig.db_user,
            password: destConfig.db_pass,
            database: destConfig.db_name,
            port: destConfig.db_port
        });

        let executedCount = 0;
        for (const sql of sqlStatements) {
            await conn.execute(sql);
            executedCount++;
        }

        res.json({ success: true, message: `Successfully executed ${executedCount} statements.` });

    } catch (error) {
        console.error('Schema Sync Error:', error);
        res.status(500).json({ success: false, message: 'Error executing sync: ' + error.message });
    } finally {
        if (conn) await conn.end();
    }
});

// --- CRUD: Pessoa Jur�dica ---

// LIST (Read All)
app.get('/api/pj', async (req, res) => {
    try {
        // FIXED: Used EnderecoLogo instead of LogoUrl
        const [rows] = await pool.execute(
            "SELECT IdPessoa, RazaoSocial, NomeFantasia, Cnpj, Cidade, Estado, Telefone, EnderecoLogo FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*' ORDER BY IdPessoa DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching PJ list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar registros' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/pj/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdPessoa as id, RazaoSocial as label FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*' ORDER BY RazaoSocial"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching pj options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op��es de fornecedor' });
    }
});

// GET ONE (Read Single)
app.get('/api/pj/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM pessoajuridica WHERE IdPessoa = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Registro n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar registro' });
    }
});

// CREATE (Insert) with File Upload
app.post('/api/pj', upload.single('Logo'), async (req, res) => {
    const data = req.body;

    if (!data.RazaoSocial) {
        return res.status(400).json({ success: false, message: 'Raz�o Social � obrigat�ria' });
    }

    // Basic Server-Side Validation
    // Validate CNPJ simply by length (stripped)
    if (data.Cnpj) {
        const cnpjClean = data.Cnpj.replace(/[^\d]+/g, '');
        if (cnpjClean.length !== 14) {
            return res.status(400).json({ success: false, message: 'CNPJ deve conter 14 d�gitos.' });
        }
    }
    // Validate Email regex
    if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
        return res.status(400).json({ success: false, message: 'Formato de e-mail inv�lido.' });
    }

    try {
        // Safe allowed columns
        const allowedColumns = [
            'RazaoSocial', 'NomeFantasia', 'Segmento',
            'Endereco', 'Numero', 'Bairro', 'Complemento', 'Cidade', 'Estado', 'Cep',
            'CodPais', 'CodArea', 'Telefone', 'CodArea2', 'Celular',
            'Cnpj', 'InscMunicipal', 'InscEst', 'Email', 'Responsavel'
        ];

        const columns = [];
        const values = [];
        const placeholders = [];

        allowedColumns.forEach(col => {
            if (data[col] !== undefined) {
                // Sanitize/Trim strings
                let val = data[col];
                if (typeof val === 'string') val = val.trim();

                columns.push(col);
                values.push(val);
                placeholders.push('?');
            }
        });

        // Handle File
        if (req.file) {
            columns.push('EnderecoLogo');
            values.push('/uploads/' + req.file.filename);
            placeholders.push('?');
        }

        // Metadata
        const now = getCurrentDateTimeBR();
        columns.push('DtCad'); values.push(now); placeholders.push('?');

        const sql = `INSERT INTO pessoajuridica (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

        const [result] = await pool.execute(sql, values);
        res.json({ success: true, message: 'Cadastrado com sucesso', id: result.insertId });

    } catch (error) {
        console.error('Error creating PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put) with File Upload
app.put('/api/pj/:id', upload.single('Logo'), async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    try {
        const allowedColumns = [
            'RazaoSocial', 'NomeFantasia', 'Segmento',
            'Endereco', 'Numero', 'Bairro', 'Complemento', 'Cidade', 'Estado', 'Cep',
            'CodPais', 'CodArea', 'Telefone', 'CodArea2', 'Celular',
            'Cnpj', 'InscMunicipal', 'InscEst', 'Email', 'Responsavel'
        ];

        const updates = [];
        const values = [];

        allowedColumns.forEach(col => {
            if (data[col] !== undefined) {
                updates.push(`${col} = ?`);
                values.push(data[col]);
            }
        });

        // Handle File
        if (req.file) {
            // FIXED: Used EnderecoLogo instead of LogoUrl
            updates.push('EnderecoLogo = ?');
            values.push('/uploads/' + req.file.filename);
        }

        // Metadata
        const now = getCurrentDateTimeBR();
        updates.push(`DtAlteracao = ?`); values.push(now);

        if (updates.length === 0) {
            return res.json({ success: true, message: 'Nada para atualizar' });
        }

        values.push(id); // For WHERE clause

        const sql = `UPDATE pessoajuridica SET ${updates.join(', ')} WHERE IdPessoa = ?`;

        await pool.execute(sql, values);
        res.json({ success: true, message: 'Atualizado com sucesso' });

    } catch (error) {
        console.error('Error updating PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/pj/:id', async (req, res) => {
    try {
        const { usuario } = req.body; // Expect user from body
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE pessoajuridica SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdPessoa = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Registro exclu�do' });
    } catch (error) {
        console.error('Error deleting PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Unidade de Medida ---

// LIST (Read All)
app.get('/api/medida', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdMedida, TipoMedida, DescMedida, IdEmpresa, DataCriacao, CriadoPor FROM medida WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdMedida DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching medida list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar unidades de medida' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/medida/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT TipoMedida as id, CONCAT(TipoMedida, ' - ', COALESCE(DescMedida, '')) as label FROM medida WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY TipoMedida"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching medida options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op��es de unidade' });
    }
});

// GET ONE (Read Single)
app.get('/api/medida/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM medida WHERE IdMedida = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Unidade de medida n�o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar unidade de medida' });
    }
});

// CREATE (Insert)
app.post('/api/medida', async (req, res) => {
    const { TipoMedida, DescMedida, IdEmpresa } = req.body;

    if (!TipoMedida) {
        return res.status(400).json({ success: false, message: 'Tipo da medida � obrigat�rio' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no m�ximo 3 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO medida (TipoMedida, DescMedida, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [TipoMedida.toUpperCase().trim(), DescMedida?.trim() || null, IdEmpresa || null, now, 'Sistema']
        );
        res.json({ success: true, message: 'Unidade de medida cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/medida/:id', async (req, res) => {
    const id = req.params.id;
    const { TipoMedida, DescMedida, IdEmpresa } = req.body;

    if (!TipoMedida) {
        return res.status(400).json({ success: false, message: 'Tipo da medida � obrigat�rio' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no m�ximo 3 caracteres' });
    }

    try {
        await pool.execute(
            'UPDATE medida SET TipoMedida = ?, DescMedida = ?, IdEmpresa = ? WHERE IdMedida = ?',
            [TipoMedida.toUpperCase().trim(), DescMedida?.trim() || null, IdEmpresa || null, id]
        );
        res.json({ success: true, message: 'Unidade de medida atualizada com sucesso' });
    } catch (error) {
        console.error('Error updating medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/medida/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE medida SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdMedida = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Unidade de medida exclu�da' });
    } catch (error) {
        console.error('Error deleting medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Fam�lia ---

// LIST (Read All)
app.get('/api/familia', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdFamilia, DescFamilia, IdEmpresa, DataCriacao, CriadoPor FROM familia WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdFamilia DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching familia list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar fam�lias' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/familia/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdFamilia as id, DescFamilia as label FROM familia WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY DescFamilia"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching familia options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op��es de fam�lia' });
    }
});

// GET ONE (Read Single)
app.get('/api/familia/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM familia WHERE IdFamilia = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Fam�lia n�o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar fam�lia' });
    }
});

// CREATE (Insert)
app.post('/api/familia', async (req, res) => {
    const { DescFamilia, IdEmpresa } = req.body;

    if (!DescFamilia) {
        return res.status(400).json({ success: false, message: 'Descri��o da fam�lia � obrigat�ria' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'Descri��o deve ter no m�ximo 50 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO familia (DescFamilia, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?)',
            [DescFamilia.trim(), IdEmpresa || null, now, 'Sistema']
        );
        res.json({ success: true, message: 'Fam�lia cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/familia/:id', async (req, res) => {
    const id = req.params.id;
    const { DescFamilia, IdEmpresa } = req.body;

    if (!DescFamilia) {
        return res.status(400).json({ success: false, message: 'Descri��o da fam�lia � obrigat�ria' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'Descri��o deve ter no m�ximo 50 caracteres' });
    }

    try {
        await pool.execute(
            'UPDATE familia SET DescFamilia = ?, IdEmpresa = ? WHERE IdFamilia = ?',
            [DescFamilia.trim(), IdEmpresa || null, id]
        );
        res.json({ success: true, message: 'Fam�lia atualizada com sucesso' });
    } catch (error) {
        console.error('Error updating familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/familia/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE familia SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdFamilia = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Fam�lia exclu�da' });
    } catch (error) {
        console.error('Error deleting familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Acabamento ---

// LIST (Read All)
app.get('/api/acabamento', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IDAcabamento, DescAcabamento, Status, IdEmpresa, DataCriacao, CriadoPor FROM acabamento WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IDAcabamento DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching acabamento list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar acabamentos' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/acabamento/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IDAcabamento as id, DescAcabamento as label FROM acabamento WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY DescAcabamento"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching acabamento options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op��es de acabamento' });
    }
});

// GET ONE (Read Single)
app.get('/api/acabamento/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM acabamento WHERE IDAcabamento = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Acabamento n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar acabamento' });
    }
});

// CREATE (Insert)
app.post('/api/acabamento', async (req, res) => {
    const { DescAcabamento, IdEmpresa } = req.body;

    if (!DescAcabamento) {
        return res.status(400).json({ success: false, message: 'Descri��o do acabamento � obrigat�ria' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'Descri��o deve ter no m�ximo 200 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO acabamento (DescAcabamento, Status, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [DescAcabamento.trim(), 'A', IdEmpresa || null, now, 'Sistema']
        );
        res.json({ success: true, message: 'Acabamento cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/acabamento/:id', async (req, res) => {
    const id = req.params.id;
    const { DescAcabamento, IdEmpresa } = req.body;

    if (!DescAcabamento) {
        return res.status(400).json({ success: false, message: 'Descri��o do acabamento � obrigat�ria' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'Descri��o deve ter no m�ximo 200 caracteres' });
    }

    try {
        await pool.execute(
            'UPDATE acabamento SET DescAcabamento = ?, IdEmpresa = ? WHERE IDAcabamento = ?',
            [DescAcabamento.trim(), IdEmpresa || null, id]
        );
        res.json({ success: true, message: 'Acabamento atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/acabamento/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE acabamento SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IDAcabamento = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Acabamento exclu�do' });
    } catch (error) {
        console.error('Error deleting acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Material ---

// LIST (Read All) with JOINs
app.get('/api/material', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                m.IdMaterial, m.CodMatFabricante, m.DescResumo, m.DescDetal, m.NumeroRP,
                m.FamiliaMat, f.DescFamilia,
                m.CodigoJuridicoMat, pj.RazaoSocial as Fornecedor,
                m.Peso, m.Unidade, m.Altura, m.Largura, m.Profundidade,
                m.Valor, m.PercICMS, m.vICMS, m.PercIPI, m.vIPI, m.vLiquido,
                m.acabamento, m.DtCad, m.ImagemProduto
            FROM material m
            LEFT JOIN familia f ON m.FamiliaMat = f.IdFamilia
            LEFT JOIN pessoajuridica pj ON m.CodigoJuridicoMat = pj.IdPessoa
            WHERE m.D_E_L_E_T_E IS NULL OR m.D_E_L_E_T_E = ''
            ORDER BY m.IdMaterial DESC
            LIMIT 200
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching material list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar materiais' });
    }
});

// GET ONE (Read Single)
app.get('/api/material/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM material WHERE IdMaterial = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Material n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar material' });
    }
});

// CREATE (Insert)
app.post('/api/material', async (req, res) => {
    const data = req.body;

    if (!data.CodMatFabricante) {
        return res.status(400).json({ success: false, message: 'C�digo do material � obrigat�rio' });
    }

    try {
        const now = getCurrentDateTimeBR();

        const [result] = await pool.execute(
            `INSERT INTO material (
                CodMatFabricante, DescResumo, DescDetal, NumeroRP,
                FamiliaMat, CodigoJuridicoMat, 
                Peso, Unidade, Altura, Largura, Profundidade,
                Valor, PercICMS, vICMS, PercIPI, vIPI, vLiquido,
                acabamento, ImagemProduto, DtCad, UsuarioCriacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.CodMatFabricante?.trim(),
                data.DescResumo?.trim() || null,
                data.DescDetal?.trim() || null,
                data.NumeroRP?.trim() || null,
                data.FamiliaMat || null,
                data.CodigoJuridicoMat || null,
                data.Peso || null,
                data.Unidade || null,
                data.Altura || null,
                data.Largura || null,
                data.Profundidade || null,
                data.Valor || null,
                data.PercICMS || null,
                data.vICMS || null,
                data.PercIPI || null,
                data.vIPI || null,
                data.vLiquido || null,
                data.acabamento || null,
                data.ImagemProduto || null,
                now,
                'Sistema'
            ]
        );
        res.json({ success: true, message: 'Material cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'C�digo do material j� existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
        }
    }
});

// UPDATE (Put)
app.put('/api/material/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.CodMatFabricante) {
        return res.status(400).json({ success: false, message: 'C�digo do material � obrigat�rio' });
    }

    try {
        const now = getCurrentDateTimeBR();

        await pool.execute(
            `UPDATE material SET
                CodMatFabricante = ?, DescResumo = ?, DescDetal = ?, NumeroRP = ?,
                FamiliaMat = ?, CodigoJuridicoMat = ?,
                Peso = ?, Unidade = ?, Altura = ?, Largura = ?, Profundidade = ?,
                Valor = ?, PercICMS = ?, vICMS = ?, PercIPI = ?, vIPI = ?, vLiquido = ?,
                acabamento = ?, ImagemProduto = ?, DtAlteracao = ?, UsuarioAlteracao = ?
            WHERE IdMaterial = ?`,
            [
                data.CodMatFabricante?.trim(),
                data.DescResumo?.trim() || null,
                data.DescDetal?.trim() || null,
                data.NumeroRP?.trim() || null,
                data.FamiliaMat || null,
                data.CodigoJuridicoMat || null,
                data.Peso || null,
                data.Unidade || null,
                data.Altura || null,
                data.Largura || null,
                data.Profundidade || null,
                data.Valor || null,
                data.PercICMS || null,
                data.vICMS || null,
                data.PercIPI || null,
                data.vIPI || null,
                data.vLiquido || null,
                data.acabamento || null,
                data.ImagemProduto || null,
                now,
                'Sistema',
                id
            ]
        );
        res.json({ success: true, message: 'Material atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'C�digo do material j� existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
        }
    }
});

// DELETE (Soft Delete)
app.delete('/api/material/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE material SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdMaterial = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Material exclu�do' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Projetos ---

// LIST (Read All) 
app.get('/api/projeto', async (req, res) => {
    try {
        const { dataInicio, dataFim, projeto, descProjeto, descEmpresa } = req.query;

        let queryParams = [];
        let whereClause = "WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND (Finalizado = '' OR Finalizado IS NULL)";

        if (dataInicio) {
            whereClause += " AND STR_TO_DATE(DataPrevisao, '%d/%m/%Y') >= STR_TO_DATE(?, '%d/%m/%Y')";
            queryParams.push(dataInicio);
        }
        if (dataFim) {
            whereClause += " AND STR_TO_DATE(DataPrevisao, '%d/%m/%Y') <= STR_TO_DATE(?, '%d/%m/%Y')";
            queryParams.push(dataFim);
        }
        if (projeto) {
            whereClause += " AND Projeto LIKE ?";
            queryParams.push(`%${projeto}%`);
        }
        if (descProjeto) {
            whereClause += " AND DescProjeto LIKE ?";
            queryParams.push(`%${descProjeto}%`);
        }
        if (descEmpresa) {
            whereClause += " AND DescEmpresa LIKE ?";
            queryParams.push(`%${descEmpresa}%`);
        }

        const sql = `
            SELECT *
            FROM projetos 
            ${whereClause}
            ORDER BY IdProjeto DESC
            LIMIT 200
        `;

        const [rows] = await pool.execute(sql, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching projetos list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar projetos' });
    }
});

// GET ONE (Read Single)
app.get('/api/projeto/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM projetos WHERE IdProjeto = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Projeto n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar projeto' });
    }
});

// CREATE (Insert)
app.post('/api/projeto', async (req, res) => {
    const data = req.body;
    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto é obrigatório' });
    }

    try {
        const now = getCurrentDateTimeBR();

        let idEmpresa = null;
        let descEmpresa = null;
        if (data.ClienteProjeto) {
            const [empRows] = await pool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE RazaoSocial = ? LIMIT 1', [data.ClienteProjeto]);
            if (empRows && empRows.length > 0) {
                idEmpresa = empRows[0].IdPessoa;
                descEmpresa = empRows[0].NomeFantasia;
            }
        }

        const path = require('path');
        const fs = require('fs');
        const projetoName = data.Projeto ? data.Projeto.trim() : 'PROJETO_SEM_NOME';
        const baseDrive = process.env.ENDERECO_PROJETO || 'G:\\\\MEU DRIVE\\\\ESTRUTURA PADRÃO LYNX\\\\004-PROJETOS';
        const EnderecoProjeto = path.join(baseDrive, projetoName);

        try {
            if (!fs.existsSync(EnderecoProjeto)) {
                fs.mkdirSync(EnderecoProjeto, { recursive: true });
                fs.mkdirSync(path.join(EnderecoProjeto, '00-Projeto'));
                fs.mkdirSync(path.join(EnderecoProjeto, '01-Tags'));
                fs.mkdirSync(path.join(EnderecoProjeto, '02-Isometrico'));
                fs.mkdirSync(path.join(EnderecoProjeto, '03-Medição'));
                fs.mkdirSync(path.join(EnderecoProjeto, '04-Qualidade'));
            }
        } catch (dirError) {
            console.error('Erro ao criar diretorio de projeto:', dirError);
        }

        const [result] = await pool.execute(
            `INSERT INTO projetos (
                Projeto, DescProjeto, ClienteProjeto, Responsavel,
                DataPrevisao, PrazoEntrega, StatusProj, DescStatus,
                DataCriacao, CriadoPor, IdEmpresa, DescEmpresa,
                PlanejadoFinanceiro, DataEntradaPedido, EnderecoProjeto
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao ? formatDateToBR(data.DataPrevisao) : null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                now,
                'Sistema',
                idEmpresa,
                descEmpresa,
                data.PlanejadoFinanceiro ? formatDateToBR(data.PlanejadoFinanceiro) : null,
                data.DataEntradaPedido ? formatDateToBR(data.DataEntradaPedido) : null,
                EnderecoProjeto
            ]
        );
        res.json({ success: true, message: 'Projeto cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/projeto/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto é obrigatório' });
    }

    try {
        let idEmpresa = null;
        let descEmpresa = null;
        if (data.ClienteProjeto) {
            const [empRows] = await pool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE RazaoSocial = ? LIMIT 1', [data.ClienteProjeto]);
            if (empRows && empRows.length > 0) {
                idEmpresa = empRows[0].IdPessoa;
                descEmpresa = empRows[0].NomeFantasia;
            }
        }

        await pool.execute(
            `UPDATE projetos SET
                Projeto = ?, DescProjeto = ?, ClienteProjeto = ?, Responsavel = ?,
                DataPrevisao = ?, PrazoEntrega = ?, StatusProj = ?, DescStatus = ?,
                IdEmpresa = ?, DescEmpresa = ?, PlanejadoFinanceiro = ?, DataEntradaPedido = ?,
                Estado = ?,
                /* Faturamento */
                Cnpj = ?, NomeFantasia = ?, IE = ?, EnderecoCliente = ?,
                GerenteProjeto = ?, Segmento = ?,
                ContatoComercial = ?, FoneContatoComercial = ?, EmailComercial = ?,
                ContatoTecnico = ?, FoneContatoTecnico = ?, EmailTecnico = ?,
                /* Entrega */
                ClienteEntrega = ?, CnpjEntrega = ?, ContatoEntrega = ?, TelefoneEntrega = ?,
                HrEntrega = ?, EnderecoEntrega = ?,
                /* Cobrança */
                ClienteCobranca = ?, CnpjCobranca = ?, ContatoCobranca = ?,
                TelefoneCobranca = ?, EmailCobranca = ?, EnderecoCobranca = ?,
                /* Fornecimento */
                Pagamento = ?, ObservacaoFornec = ?,
                Transferencia = ?, Pix = ?, Cartao = ?, Empenho = ?, Boleto = ?, Dinheiro = ?,
                HrComercial = ?, HrNoturno = ?, HrCombinar = ?,
                Frete = ?, Embalagem = ?,
                FabricacaoEmpresa = ?, ValorFabricacao = ?,
                RevendaEmpresa = ?, ValorRevenda = ?,
                FreteEmpresa = ?, ValorFrete = ?,
                InstalacaoEmpresa = ?, ValorInstalacao = ?,
                EmbalagemEmpresa = ?, ValorEmbalagem = ?,
                TotalFinal = ?, ObservacaoFinal = ?
            WHERE IdProjeto = ?`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao ? formatDateToBR(data.DataPrevisao) : null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                idEmpresa,
                descEmpresa,
                data.PlanejadoFinanceiro ? formatDateToBR(data.PlanejadoFinanceiro) : null,
                data.DataEntradaPedido ? formatDateToBR(data.DataEntradaPedido) : null,
                data.Estado || null,
                // Faturamento
                data.Cnpj || null,
                data.NomeFantasia || null,
                data.IE || null,
                data.EnderecoCliente || null,
                data.GerenteProjeto || null,
                data.Segmento || null,
                data.ContatoComercial || null,
                data.FoneContatoComercial || null,
                data.EmailComercial || null,
                data.ContatoTecnico || null,
                data.FoneContatoTecnico || null,
                data.EmailTecnico || null,
                // Entrega
                data.ClienteEntrega || null,
                data.CnpjEntrega || null,
                data.ContatoEntrega || null,
                data.TelefoneEntrega || null,
                data.HrEntrega || null,
                data.EnderecoEntrega || null,
                // Cobrança
                data.ClienteCobranca || null,
                data.CnpjCobranca || null,
                data.ContatoCobranca || null,
                data.TelefoneCobranca || null,
                data.EmailCobranca || null,
                data.EnderecoCobranca || null,
                // Fornecimento
                data.Pagamento || null,
                data.ObservacaoFornec || null,
                data.Transferencia || null,
                data.Pix || null,
                data.Cartao || null,
                data.Empenho || null,
                data.Boleto || null,
                data.Dinheiro || null,
                data.HrComercial || null,
                data.HrNoturno || null,
                data.HrCombinar || null,
                data.Frete || null,
                data.Embalagem || null,
                data.FabricacaoEmpresa || null,
                data.ValorFabricacao || null,
                data.RevendaEmpresa || null,
                data.ValorRevenda || null,
                data.FreteEmpresa || null,
                data.ValorFrete || null,
                data.InstalacaoEmpresa || null,
                data.ValorInstalacao || null,
                data.EmbalagemEmpresa || null,
                data.ValorEmbalagem || null,
                data.TotalFinal || null,
                data.ObservacaoFinal || null,
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
app.delete('/api/projeto/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE projetos SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdProjeto = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Projeto exclu�do' });
    } catch (error) {
        console.error('Error deleting projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// VISÃO GERAL PRODUÇÃO
// ─────────────────────────────────────────────────────────────────────────────

// GET projetos for production overview
app.get('/api/visao-geral/projetos', async (req, res) => {
    try {
        const mostrarFinalizados = req.query.finalizados === '1';
        const mostrarLiberados = req.query.liberados === '1';

        // Condições base de exclusão
        const condicoes = [`COALESCE(p.D_E_L_E_T_E,'') = ''`];

        if (mostrarFinalizados && mostrarLiberados) {
            // Caso as duas opções primeiras sejam selecionadas exibir todos os registros
            // nenhums condição extra
        } else if (mostrarFinalizados && !mostrarLiberados) {
            // 1- opção 'Mostrar Finalizados' são todos os registros onde 'Finalizado' é diferente de vazio e que não foram liberados
            condicoes.push(`COALESCE(p.Finalizado,'') != ''`);
            condicoes.push(`COALESCE(p.liberado,'') = ''`);
        } else if (!mostrarFinalizados && mostrarLiberados) {
            // 2 - opção 'Mostrar Liberado' são todos os registros que tenham o campo 'Liberado' diferente de vazio
            condicoes.push(`COALESCE(p.liberado,'') != ''`);
        } else {
            // Se nenhuma das opçoes ou 'Limpar' , apenas os registros com campos 'Finalizado' e 'Liberado' vazios
            condicoes.push(`COALESCE(p.Finalizado,'') = ''`);
            condicoes.push(`COALESCE(p.liberado,'') = ''`);
        }

        const where = condicoes.join(' AND ');

        // Get projects with aggregated sector totals from their tags + RNC count
        const [rows] = await pool.execute(`
            SELECT
                p.IdProjeto, p.Projeto, p.DescProjeto, p.DataPrevisao, p.DataCriacao,
                p.Finalizado, p.liberado, p.StatusProj, p.DescStatus,

                /* ── Tags / Peças nativos da tabela Projetos ── */
                COUNT(t.IdTag) AS QtdeTags,
                COALESCE(p.QtdeTagsExecutadas, 0) AS QtdeTagsExecutadas,
                COALESCE(p.QtdePecasTags, 0) AS QtdePecasTags,
                COALESCE(p.QtdePecasExecutadas, 0) AS QtdePecasExecutadas,

                /* ── RNC ── */
                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND r.Estatus = 'PENDENCIA'), 0) AS TotalRnc,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')), 0) AS qtdernc,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND (r.Estatus = 'PENDENCIA' OR r.Estatus IS NULL OR r.Estatus = '')), 0) AS qtderncPendente,

                COALESCE((SELECT COUNT(*) FROM ordemservicoitempendencia r
                           WHERE r.IdProjeto = p.IdProjeto
                             AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
                             AND (r.Estatus LIKE '%FIN%' OR r.Estatus = 'FINALIZADA')), 0) AS qtderncFinalizada,
                             
                /* ── Novas req ── */
                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,'') AS DECIMAL(10,2))), 0) AS qtdetotalpecas,

                /* ── Setor Corte ── */
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,

                /* ── Setor Dobra ── */
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,

                /* ── Setor Solda ── */
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,

                /* ── Setor Pintura ── */
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,

                /* ── Setor Montagem ── */
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalMontagem,
                COALESCE(SUM(CAST(NULLIF(t.MontagemTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecMontagem

            FROM projetos p
            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto
                AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE ${where}
            GROUP BY p.IdProjeto
            ORDER BY p.IdProjeto DESC
            LIMIT 300
        `);

        console.log(`[Visão Geral Produção] Query executada para tenant: ${req.tenantDb}. Rows found: ${rows.length}`);

        /* Compute percentages in JS to avoid division-by-zero in SQL */
        const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
        const enriched = rows.map(r => ({
            ...r,
            PercentualTags: pct(Number(r.QtdeTagsExecutadas), Number(r.QtdeTags)),
            PercentualPecas: pct(Number(r.QtdePecasExecutadas), Number(r.QtdePecasTags)),
            PctCorte: pct(Number(r.ExecCorte), Number(r.TotalCorte)),
            PctDobra: pct(Number(r.ExecDobra), Number(r.TotalDobra)),
            PctSolda: pct(Number(r.ExecSolda), Number(r.TotalSolda)),
            PctPintura: pct(Number(r.ExecPintura), Number(r.TotalPintura)),
            PctMontagem: pct(Number(r.ExecMontagem), Number(r.TotalMontagem)),
        }));



        res.json({ success: true, data: enriched });

    } catch (error) {
        console.error('Error fetching visao-geral projetos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar projetos: ' + error.message });
    }
});

// GET tags for a project in production overview
app.get('/api/visao-geral/tags/:projetoId', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                IdTag, Tag, DescTag, DataEntrada, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag, ValorTag, StatusTag,
                QtdeOS, QtdeOSExecutadas, QtdePecasOS, QtdePecasExecutadas, PercentualPecas, PercentualOS, QtdeTotalPecas,
                qtdetotal, Finalizado, qtdernc, PesoTotal, ProjetistaPlanejado, PlanejadoInicioEngenharia, PlanejadoFinalEngenharia,
                PlanejadoInicioCorte, PlanejadoFinalCorte, RealizadoInicioCorte, RealizadoFinalCorte,
                CorteTotalExecutado, CorteTotalExecutar, CortePercentual,
                PlanejadoInicioDobra, PlanejadoFinalDobra, RealizadoInicioDobra, RealizadoFinalDobra,
                DobraTotalExecutado, DobraTotalExecutar, DobraPercentual,
                PlanejadoInicioSolda, PlanejadoFinalSolda, RealizadoInicioSolda, RealizadoFinalSolda,
                SoldaTotalExecutado, SoldaTotalExecutar, SoldaPercentual,
                PlanejadoInicioPintura, PlanejadoFinalPintura, RealizadoInicioPintura, RealizadoFinalPintura,
                PinturaTotalExecutado, PinturaTotalExecutar, PinturaPercentual,
                PlanejadoInicioMontagem, PlanejadoFinalMontagem, RealizadoInicioMontagem, RealizadoFinalMontagem,
                MontagemTotalExecutado, MontagemTotalExecutar, MontagemPercentual
            FROM tags
            WHERE IdProjeto = ?
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdTag ASC
        `, [req.params.projetoId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching visao-geral tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags: ' + error.message });
    }
});

// PUT planejar-projetista for a tag
app.put('/api/visao-geral/tags/:idTag/planejar-projetista', async (req, res) => {
    try {
        const { projetistaPlanejado, planejadoInicioEngenharia, planejadoFinalEngenharia, usuario } = req.body;
        
        if (!projetistaPlanejado || !planejadoInicioEngenharia || !planejadoFinalEngenharia) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios: Projetista, Início e Fim.' });
        }

        const [result] = await pool.execute(`
            UPDATE tags 
            SET ProjetistaPlanejado = ?, 
                PlanejadoInicioEngenharia = ?, 
                PlanejadoFinalEngenharia = ?
            WHERE IdTag = ?
        `, [projetistaPlanejado, planejadoInicioEngenharia, planejadoFinalEngenharia, req.params.idTag]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        }

        res.json({ success: true, message: 'Projetista e datas de engenharia atualizados com sucesso.' });
    } catch (error) {
        console.error('Error updating tag planejar projetista:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar tag: ' + error.message });
    }
});

// PUT alterar qtde liberada for a tag
app.put('/api/visao-geral/tags/:idTag/qtde', async (req, res) => {
    try {
        const { qtdeLiberada, usuario } = req.body;
        
        if (qtdeLiberada === undefined || qtdeLiberada === null) {
            return res.status(400).json({ success: false, message: 'A Quantidade Liberada é obrigatória.' });
        }

        // Fetch current tag to calculate balance
        const [tagRows] = await pool.execute('SELECT QtdeTag FROM tags WHERE IdTag = ?', [req.params.idTag]);
        if (tagRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        }
        
        const qtdeTag = parseFloat(tagRows[0].QtdeTag) || 0;
        const liberada = parseFloat(qtdeLiberada) || 0;
        
        if (liberada > qtdeTag) {
            return res.status(400).json({ success: false, message: `Quantidade liberada (${liberada}) não pode ser maior que a Quantidade da Tag (${qtdeTag}).` });
        }

        const saldo = qtdeTag - liberada;

        const [result] = await pool.execute(`
            UPDATE tags 
            SET QtdeLiberada = ?, 
                SaldoTag = ?
            WHERE IdTag = ?
        `, [liberada, saldo, req.params.idTag]);

        res.json({ success: true, message: 'Quantidade liberada atualizada com sucesso.', data: { qtdeLiberada: liberada, saldoTag: saldo } });
    } catch (error) {
        console.error('Error updating tag qtde liberada:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar quantidade liberada: ' + error.message });
    }
});

// PUT finalizar tag(s)
app.put('/api/visao-geral/tags/finalizar', async (req, res) => {
    try {
        const { idProjeto, idTag, finalizarTodas, usuario } = req.body;
        
        if (!idProjeto || !usuario) {
            return res.status(400).json({ success: false, message: 'Projeto e Usuário são obrigatórios.' });
        }

        const dataLocal = new Date().toLocaleDateString('pt-BR');
        
        if (finalizarTodas) {
            await pool.execute(`
                UPDATE tags 
                SET Finalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdProjeto = ? AND (Finalizado IS NULL OR Finalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, usuario, idProjeto]);

            await pool.execute(`
                UPDATE ordemservicoitem 
                SET OrdemServicoItemFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE idProjeto = ? AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, usuario, idProjeto]);

            await pool.execute(`
                UPDATE ordemservico 
                SET OrdemServicoFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdProjeto = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, usuario, idProjeto]);
        } else {
            if (!idTag) return res.status(400).json({ success: false, message: 'ID da Tag é obrigatório para finalizar apenas uma.' });
            
            await pool.execute(`
                UPDATE tags 
                SET Finalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, usuario, idTag]);

            await pool.execute(`
                UPDATE ordemservicoitem 
                SET OrdemServicoItemFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, usuario, idTag]);

            await pool.execute(`
                UPDATE ordemservico 
                SET OrdemServicoFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, usuario, idTag]);
        }

        res.json({ success: true, message: finalizarTodas ? 'Todas as tags e OS pendentes foram finalizadas.' : 'Tag e suas respectivas OS finalizadas com sucesso.' });
    } catch (error) {
        console.error('Error finalizando tag(s):', error);
        res.status(500).json({ success: false, message: 'Erro ao finalizar tag(s): ' + error.message });
    }
});


// =========================================================================
// VISÃO GERAL DE ENGENHARIA API
// =========================================================================

// GET Tags for Visao Geral Engenharia
app.get('/api/visao-geral-engenharia/tags', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                IdTag, Tag, DescTag, Projeto, DescEmpresa, TipoProduto, DataPrevisao, ProjetistaPlanejado, CaminhoIsometrico,
                PlanejadoInicioMedicao, PlanejadoFinalMedicao, RealizadoInicioMedicao, RealizadoFinalMedicao,
                PlanejadoInicioIsometrico, PlanejadoFinalIsometrico, RealizadoInicioIsometrico, RealizadoFinalIsometrico,
                PlanejadoInicioEngenharia, PlanejadoFinalEngenharia, RealizadoInicioEngenharia, RealizadoFinalEngenharia,
                PlanejadoInicioAprovacao, PlanejadoFinalAprovacao, RealizadoInicioAprovacao, RealizadoFinalAprovacao
            FROM tags
            WHERE (Finalizado IS NULL OR Finalizado = '') 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
            ORDER BY IdProjeto DESC, IdTag DESC
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching visao-geral-engenharia tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags da engenharia: ' + error.message });
    }
});

// PUT lote update dates for Visao Geral Engenharia
app.put('/api/visao-geral-engenharia/tags/lote', async (req, res) => {
    try {
        const { idTags, setor, planejadoInicio, planejadoFinal, realizadoInicio, realizadoFinal, usuario } = req.body;
        
        if (!idTags || !Array.isArray(idTags) || idTags.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhuma tag selecionada.' });
        }
        if (!setor || !['Medicao', 'Isometrico', 'Engenharia', 'Aprovacao'].includes(setor)) {
            return res.status(400).json({ success: false, message: 'Setor inválido.' });
        }
        if (!usuario) {
            return res.status(400).json({ success: false, message: 'Usuário obrigatório.' });
        }

        const updates = [];
        const params = [];
        
        if (planejadoInicio !== undefined) {
            updates.push(`PlanejadoInicio${setor} = ?`, `UsuarioPlanejadoInicio${setor} = ?`);
            params.push(planejadoInicio, usuario);
        }
        if (planejadoFinal !== undefined) {
            updates.push(`PlanejadoFinal${setor} = ?`, `UsuarioPlanejadoFinal${setor} = ?`);
            params.push(planejadoFinal, usuario);
        }
        if (realizadoInicio !== undefined) {
            updates.push(`RealizadoInicio${setor} = ?`, `UsuarioRealizadoInicio${setor} = ?`);
            params.push(realizadoInicio, usuario);
        }
        if (realizadoFinal !== undefined) {
            updates.push(`RealizadoFinal${setor} = ?`, `UsuarioRealizadoFinal${setor} = ?`);
            params.push(realizadoFinal, usuario);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum dado fornecido para atualização.' });
        }

        // Create placeholders for the IN clause
        const placeholders = idTags.map(() => '?').join(',');
        params.push(...idTags);

        const query = `
            UPDATE tags 
            SET ${updates.join(', ')}
            WHERE IdTag IN (${placeholders})
        `;

        const [result] = await pool.execute(query, params);

        res.json({ success: true, message: `${result.affectedRows} tags atualizadas com sucesso.` });
    } catch (error) {
        console.error('Error batch updating tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar tags em lote: ' + error.message });
    }
});

// Upload configurations for Isometricos
const storageIsometrico = multer.diskStorage({
    destination: function (req, file, cb) {
        const isoDir = path.join(__dirname, '../public/uploads/isometricos');
        if (!fs.existsSync(isoDir)) {
            fs.mkdirSync(isoDir, { recursive: true });
        }
        cb(null, isoDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'iso-' + req.params.idTag + '-' + uniqueSuffix + ext)
    }
});
const uploadIso = multer({ storage: storageIsometrico });

// POST upload isometrico
app.post('/api/visao-geral-engenharia/tags/:idTag/isometrico', uploadIso.single('isometricoPdf'), async (req, res) => {
    try {
        const file = req.file;
        const { idTag } = req.params;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
        }

        const [rows] = await pool.execute("SELECT Finalizado FROM tags WHERE IdTag = ?", [idTag]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag já Finalizado!' });

        const filePath = `/uploads/isometricos/${file.filename}`;

        await pool.execute("UPDATE tags SET CaminhoIsometrico = ? WHERE IdTag = ?", [filePath, idTag]);

        res.json({ success: true, message: 'Desenho Isométrico associado com sucesso.', data: { CaminhoIsometrico: filePath } });
    } catch (error) {
        console.error('Error uploading isometrico:', error);
        res.status(500).json({ success: false, message: 'Erro ao associar desenho: ' + error.message });
    }
});

// DELETE limpar isometrico
app.delete('/api/visao-geral-engenharia/tags/:idTag/isometrico', async (req, res) => {
    try {
        const { idTag } = req.params;
        
        const [rows] = await pool.execute("SELECT Finalizado FROM tags WHERE IdTag = ?", [idTag]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag já Finalizado!' });

        const [tagRow] = await pool.execute("SELECT CaminhoIsometrico FROM tags WHERE IdTag = ?", [idTag]);
        const caminho = tagRow[0].CaminhoIsometrico;

        if (caminho) {
            const absolutePath = path.join(__dirname, '../public', caminho);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await pool.execute("UPDATE tags SET CaminhoIsometrico = NULL WHERE IdTag = ?", [idTag]);

        res.json({ success: true, message: 'Desenho Isométrico removido com sucesso.', data: { CaminhoIsometrico: null } });
    } catch (error) {
        console.error('Error clearing isometrico:', error);
        res.status(500).json({ success: false, message: 'Erro ao limpar desenho: ' + error.message });
    }
});


// GET RNCs for a project in production overview
app.get('/api/visao-geral/rncs/:projetoId', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                IdOrdemServicoItemPendencia AS IdRnc,
                Estatus,
                CodMatFabricante,
                IdOrdemServico,
                Projeto,
                Tag,
                DescResumo,
                DescDetal,
                DescricaoPendencia,
                SetorResponsavel,
                UsuarioResponsavel,
                DataCriacao,
                DataExecucao,
                DataFinalizacao,
                DescricaoFinalizacao,
                SetorResponsavelFinalizacao,
                TipoRegistro
            FROM ordemservicoitempendencia
            WHERE IdProjeto = ?
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')
              AND Estatus = 'PENDENCIA'
            ORDER BY IdOrdemServicoItemPendencia DESC
        `, [req.params.projetoId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching visao-geral rncs:', error);
        res.status(500).json({ success: false, message: 'Erro: ' + error.message });
    }
});

// GET Todas as Pendencias globais do sistema
app.get('/api/todas-pendencias', async (req, res) => {
    try {
        const { exibirFinalizadas } = req.query; // 'true' or 'false'
        
        // Regra de filtragem de status solicitada
        let statusFilter = "AND (Estatus IS NULL OR Estatus <> 'FINALIZADA')";
        if (exibirFinalizadas === 'true') {
            statusFilter = "AND Estatus = 'FINALIZADA'";
        }

        const [rows] = await pool.execute(`
            SELECT 
                IdOrdemServicoItemPendencia, IdOrdemServico, IdOrdemServicoItem, IdPLanodeCorte, IdRomaneio, IdProjeto, IdTag, CodMatFabricante,
                Projeto, Tag, DescEmpresa, IdMaterial, DescResumo, DescDetal, Espessura,
                MaterialSW, EnderecoArquivo, DescricaoPendencia, Usuario, CriadoPorSetor, DataCriacao, Estatus,
                txtCorte, txtdobra, txtSolda, txtPintura, txtMontagem, DescricaoFinalizacao, UsuarioProjeto, FinalizadoPorUsuarioSetor,
                DataAcertoProjeto, RNCImagens, Situacao, SetorResponsavel, TipoCadastro, DataExecucao, ControleEnvioEmail,
                EmailResponsavelPelaTarefa, IdUsuarioResponsavel, UsuarioResponsavel, TipoTarefa, TipoRegistro, SetorResponsavelFinalizacao, OrigemPendencia
            FROM viewordemservicoitempendencia
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')
            ${statusFilter}
            ORDER BY IdOrdemServicoItemPendencia DESC
            LIMIT 3000
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching todas-pendencias:', error);
        res.status(500).json({ success: false, message: 'Erro: ' + error.message });
    }
});

// GET Pendencias (Origem: VISAOGERALPROJ) for a project
app.get('/api/visao-geral/pendencias/:projetoId', async (req, res) => {
    try {
        const origem = req.query.origem || 'VISAOGERALPROJ';
        
        let tipoCadastro = 'RNC';
        let statusList = "'PENDENCIA', 'FINALIZADO'";
        if (origem === 'ACAOPCP') {
            tipoCadastro = 'TAREFA';
            statusList = "'TarefaAberta', 'TarefaFinalizada'";
        }

        const [rows] = await pool.execute(`
            SELECT
                IdOrdemServicoItemPendencia AS IdRnc,
                IdProjeto, Projeto, IdTag, Tag, DescricaoPendencia,
                SetorResponsavel, UsuarioResponsavel, TipoTarefa, DataCriacao, Estatus,
                DataExecucao, DataAcertoProjeto AS DataFinalizacao, SetorResponsavelFinalizacao, FinalizadoPorUsuarioSetor AS UsuarioResponsavelFinalizacao, DescricaoFinalizacao
            FROM ordemservicoitempendencia
            WHERE IdProjeto = ?
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')
              AND Estatus IN (${statusList})
              AND TipoCadastro = ?
              AND OrigemPendencia = ?
            ORDER BY IdOrdemServicoItemPendencia DESC
        `, [req.params.projetoId, tipoCadastro, origem]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching visao-geral pendencias:', error);
        res.status(500).json({ success: false, message: 'Erro: ' + error.message });
    }
});

// POST: Salvar ou Atualizar Pendencia da Visao Geral
app.post('/api/visao-geral/pendencias', async (req, res) => {
    try {
        const data = req.body;
        const now = getCurrentDateTimeBR();

        let idRnc = data.idRnc;

        if (idRnc) {
            // UPDATE EXISITNG
            await pool.execute(`
                UPDATE ordemservicoitempendencia SET
                    DescricaoPendencia = ?,
                    SetorResponsavel = ?,
                    TipoTarefa = ?,
                    UsuarioResponsavel = ?,
                    DataCriacao = ?,
                    DataAcertoProjeto = ?,
                    SetorResponsavelFinalizacao = ?,
                    FinalizadoPorUsuarioSetor = ?,
                    DescricaoFinalizacao = ?,
                    TipoRegistro = ?,
                    DataFinalizacao = ?
                WHERE IdOrdemServicoItemPendencia = ?
            `, [
                data.descricao || '', data.setor || '', data.tipoTarefa || '', data.usuario || '', data.dataExec || '',
                data.dataFin || '', data.setorFin || '', data.usuarioFin || '', data.descFin || '', data.tipoRegistro || 'RNC', data.dataFin || '',
                idRnc
            ]);
        } else {
            // INSERT NEW
            const origemPendencia = data.origemPendencia || (data.idTag ? 'VISAOGERALTAG' : 'VISAOGERALPROJ');
            const tipoCadastro = data.tipoCadastro || 'RNC';
            const tipoRegistro = data.tipoRegistro || 'RNC';
            const estatus = data.estatus || 'PENDENCIA';
            
            const [result] = await pool.execute(`
                INSERT INTO ordemservicoitempendencia (
                    IdProjeto, Projeto, IdTag, Tag, TipoCadastro, OrigemPendencia, Estatus, DataCriacao,
                    DescricaoPendencia, SetorResponsavel, TipoTarefa, UsuarioResponsavel, DataExecucao,
                    DataAcertoProjeto, SetorResponsavelFinalizacao, FinalizadoPorUsuarioSetor, DescricaoFinalizacao,
                    TipoRegistro, DataFinalizacao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                data.idProjeto || null, data.projeto || null, data.idTag || null, data.tag || null, tipoCadastro, origemPendencia, estatus, now,
                data.descricao || '', data.setor || '', data.tipoTarefa || '', data.usuario || '', data.dataExec || '',
                data.dataFin || '', data.setorFin || '', data.usuarioFin || '', data.descFin || '',
                tipoRegistro, data.dataFin || ''
            ]);

            idRnc = result.insertId;

            // Increment totals (qtdernc, qtderncPendente) on projetos, tags, ordemservico
            // Only increment legacy RNC counters if it's a legacy RNC
            if (data.idProjeto && tipoCadastro === 'RNC') {
                await pool.execute(`UPDATE projetos SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ?`, [data.idProjeto]);
                await pool.execute(`UPDATE tags SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`, [data.idProjeto]);
                await pool.execute(`UPDATE ordemservico SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`, [data.idProjeto]);
            }
        }

        res.json({ success: true, message: idRnc ? 'Pendência salva com sucesso!' : 'Pendência criada com sucesso!' });
    } catch (error) {
        console.error('Error saving visao-geral pendencia:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar: ' + error.message });
    }
});

// PUT /api/visao-geral/pendencias/:id/finalizar
app.put('/api/visao-geral/pendencias/:id/finalizar', async (req, res) => {
    const id = req.params.id;
    const { usuarioFin, dataFin, setorFin, descFin, idProjeto } = req.body;
    
    // idProjeto não é mais obrigatório pois Tarefas podem ser genéricas (sem vinculo de projeto)
    if (!usuarioFin || !dataFin || !setorFin) {
        return res.status(400).json({ success: false, message: 'Faltam dados de finalização' });
    }

    let dtFinFormatada = '';
    if (dataFin) {
        // Checando se a data enviada pelo frontend tem tracinhos
        if (dataFin.includes('-')) {
            const parts = dataFin.split('-');
            if (parts.length === 3) {
                dtFinFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                dtFinFormatada = dataFin;
            }
        } else {
            // Provavelmente já veio formatada (ex: 19/03/2026) da função isoToBr do frontend
            dtFinFormatada = dataFin;
        }
    }

    try {
        await pool.execute(`
            UPDATE ordemservicoitempendencia SET
                Estatus = 'Finalizada',
                DataAcertoProjeto = ?,
                SetorResponsavelFinalizacao = ?,
                FinalizadoPorUsuarioSetor = ?,
                DescricaoFinalizacao = ?,
                DataFinalizacao = ?
            WHERE IdOrdemServicoItemPendencia = ?
        `, [dtFinFormatada, setorFin, usuarioFin, descFin || '', dtFinFormatada, id]);

        // Specific legacy counters just for RNC (avoiding count pollution by Tarefas)
        const [pendencyInfo] = await pool.execute(`SELECT TipoCadastro, IdTag, IdOrdemServico FROM ordemservicoitempendencia WHERE IdOrdemServicoItemPendencia = ?`, [id]);
        
        if (idProjeto && pendencyInfo.length > 0 && pendencyInfo[0].TipoCadastro === 'RNC') {
            await pool.execute(`UPDATE projetos SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdProjeto = ?`, [idProjeto]);
            
            // Get specific Tag and OS for this pendency to update them correctly
            const pendency = pendencyInfo;
            if (pendency.length > 0) {
                const { IdTag, IdOrdemServico } = pendency[0];
                if (IdTag) await pool.execute(`UPDATE tags SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdTag = ?`, [IdTag]);
                if (IdOrdemServico) await pool.execute(`UPDATE ordemservico SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdOrdemServico = ?`, [IdOrdemServico]);
            }
        }

        res.json({ success: true, message: 'Pendência finalizada' });
    } catch (e) {
        console.error('Finalizar erro:', e);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// PUT: Atualizar DataPrevisao do projeto (e opcionalmente das tags)
app.put('/api/visao-geral/projeto/:id/data-previsao', async (req, res) => {
    try {
        const { id } = req.params;
        const { dataPrevisao, atualizarTags } = req.body;

        if (!dataPrevisao) {
            return res.status(400).json({ success: false, message: 'Data de previsão é obrigatória.' });
        }

        await pool.executeOnDefault(
            `UPDATE projetos SET DataPrevisao = ? WHERE IdProjeto = ?`,
            [dataPrevisao, id]
        );

        if (atualizarTags) {
            await pool.executeOnDefault(
                `UPDATE tags SET DataPrevisao = ? WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [dataPrevisao, id]
            );
        }

        res.json({ success: true, message: 'Data de previsão atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data: ' + error.message });
    }
});

// PUT: Atualizar DataPrevisao de uma Tag específica
app.put('/api/visao-geral/tag/:idTag/data-previsao', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { dataPrevisao } = req.body;

        if (!dataPrevisao) {
            return res.status(400).json({ success: false, message: 'Data de previsão é obrigatória.' });
        }

        await pool.executeOnDefault(
            `UPDATE tags SET DataPrevisao = ? WHERE IdTag = ?`,
            [dataPrevisao, idTag]
        );

        res.json({ success: true, message: 'Data de previsão da tag atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data da tag: ' + error.message });
    }
});

// PUT: Atualizar data planejada de um setor de uma Tag específica
app.put('/api/visao-geral/tag/:idTag/setor-data', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { field, value } = req.body;

        const allowedFields = [
            'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
            'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
            'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
            'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
            'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem'
        ];

        if (!allowedFields.includes(field)) {
            return res.status(400).json({ success: false, message: 'Campo inválido.' });
        }

        await pool.executeOnDefault(
            `UPDATE tags SET ${field} = ? WHERE IdTag = ?`,
            [value, idTag]
        );

        res.json({ success: true, message: 'Data do setor atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag sector date:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data do setor: ' + error.message });
    }
});

// POST: Finalizar Projeto em cascata (projetos → tags → OS → OS itens)
app.post('/api/visao-geral/projeto/:id/finalizar', async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userFinal = usuario || 'Sistema';

    try {
        // 1. Verificar se já está finalizado
        const [check] = await pool.executeOnDefault(
            `SELECT Finalizado FROM projetos WHERE IdProjeto = ?`,
            [id]
        );
        if (!check.length) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
        }
        if (check[0].Finalizado && check[0].Finalizado.trim() !== '') {
            return res.status(400).json({
                success: false,
                message: `Este projeto já está finalizado (status: "${check[0].Finalizado}"). Nenhuma alteração foi realizada.`
            });
        }

        const now = getCurrentDateTimeBR();

        // 2. Finalizar em transação
        const conn = await pool.executeOnDefault.__proto__ ? null : null; // use executeOnDefault directly
        // projetos: DataFinalizado
        await pool.executeOnDefault(
            `UPDATE projetos SET Finalizado='C', UsuarioFinalizado=?, DataFinalizado=? WHERE IdProjeto=?`,
            [userFinal, now, id]
        );
        // tags: DataFinalizado
        await pool.executeOnDefault(
            `UPDATE tags SET Finalizado='C', UsuarioFinalizado=?, DataFinalizado=? WHERE IdProjeto=? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E='')`,
            [userFinal, now, id]
        );
        // ordemservico: DataFinalizacao (diferente!)
        await pool.executeOnDefault(
            `UPDATE ordemservico SET OrdemServicoFinalizado='C', UsuarioFinalizado=?, DataFinalizacao=? WHERE IdProjeto=?`,
            [userFinal, now, id]
        );
        // ordemservicoitem: DataFinalizado
        await pool.executeOnDefault(
            `UPDATE ordemservicoitem SET OrdemServicoItemFinalizado='C', UsuarioFinalizado=?, DataFinalizado=?
             WHERE IdOrdemServico IN (SELECT IdOrdemServico FROM ordemservico WHERE IdProjeto=?)`,
            [userFinal, now, id]
        );

        res.json({ success: true, message: `Projeto finalizado com sucesso por ${userFinal} em ${now}.` });
    } catch (error) {
        console.error('Error finalizing project:', error);
        res.status(500).json({ success: false, message: 'Erro ao finalizar projeto: ' + error.message });
    }
});

// POST: Cancelar Finalização do Projeto (desfaz cascata em projetos/tags/OS/OSitens)
app.post('/api/visao-geral/projeto/:id/cancelar-finalizacao', async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userCancel = usuario || 'Sistema';

    try {
        // 1. Verificar se está finalizado (condição para cancelar)
        const [check] = await pool.executeOnDefault(
            `SELECT Finalizado, Projeto FROM projetos WHERE IdProjeto = ?`,
            [id]
        );
        if (!check.length) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
        }
        if (!check[0].Finalizado || check[0].Finalizado.trim() === '') {
            return res.status(400).json({
                success: false,
                message: `O projeto "${check[0].Projeto}" não está finalizado. Nenhuma alteração foi realizada.`
            });
        }

        // 2. Desfazer finalização em cascata (limpar campos)
        // projetos
        await pool.executeOnDefault(
            `UPDATE projetos SET Finalizado='', UsuarioFinalizado='', DataFinalizado='' WHERE IdProjeto=?`,
            [id]
        );
        // tags
        await pool.executeOnDefault(
            `UPDATE tags SET Finalizado='', UsuarioFinalizado='', DataFinalizado='' WHERE IdProjeto=? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E='')`,
            [id]
        );
        // ordemservico
        await pool.executeOnDefault(
            `UPDATE ordemservico SET OrdemServicoFinalizado='', UsuarioFinalizado='', DataFinalizacao='' WHERE IdProjeto=?`,
            [id]
        );
        // ordemservicoitem
        await pool.executeOnDefault(
            `UPDATE ordemservicoitem SET OrdemServicoItemFinalizado='', UsuarioFinalizado='', DataFinalizado=''
             WHERE IdOrdemServico IN (SELECT IdOrdemServico FROM ordemservico WHERE IdProjeto=?)`,
            [id]
        );

        res.json({ success: true, message: `Finalização cancelada com sucesso por ${userCancel}.` });
    } catch (error) {
        console.error('Error cancelling finalization:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar finalização: ' + error.message });
    }
});

// ABRIR PASTA DO PROJETO NO SERVIDOR

app.post('/api/projeto/:id/open-folder', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT EnderecoProjeto FROM projetos WHERE IdProjeto = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
        }

        const endereco = rows[0].EnderecoProjeto;

        if (!endereco) {
            return res.status(400).json({ success: false, message: 'Projeto não possui um endereço de pasta configurado.' });
        }

        const { exec } = require('child_process');

        // Usa o Windows Explorer para abrir a pasta no servidor
        exec(`explorer "${endereco}"`, (error) => {
            if (error) {
                console.error(`Erro ao abrir pasta: ${error}`);
                return res.status(500).json({ success: false, message: 'Erro ao tentar abrir a pasta no servidor.', error: error.message });
            }
            res.json({ success: true, message: 'Pasta do projeto aberta no servidor com sucesso.' });
        });

    } catch (error) {
        console.error('Error opening project folder:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar a abertura de pasta.' });
    }
});

// LIBERAR PROJETO
app.post('/api/projeto/:id/liberar', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        const [rows] = await pool.execute('SELECT liberado FROM projetos WHERE IdProjeto = ?', [req.params.id]);
        if (rows.length > 0 && rows[0].liberado && rows[0].liberado.trim() !== '') {
            return res.status(400).json({ success: false, message: 'O projeto não pode ser liberado pois o status de liberação não está vazio.' });
        }

        // Lógica Não-Alfatec padrão (liberado = 'S', DataLiberacao)
        await pool.execute(
            `UPDATE projetos SET 
                liberado = 'S', 
                DataLiberacao = ?
            WHERE IdProjeto = ?`,
            [now, req.params.id]
        );

        res.json({ success: true, message: 'Projeto liberado com sucesso.' });
    } catch (error) {
        console.error('Error liberating project:', error);
        res.status(500).json({ success: false, message: 'Erro ao liberar o projeto.' });
    }
});

// --- CRUD: Tags (associadas a Projetos) ---

// LIST by Project ID
app.get('/api/projeto/:projetoId/tags', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                IdTag, Tag, DescTag, IdProjeto, Projeto,
                DataPrevisao, TipoProduto, UnidadeProduto,
                QtdeTag, QtdeLiberada, SaldoTag, ValorTag,
                StatusTag, DescStatus, Finalizado
            FROM tags 
            WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdTag DESC
        `, [req.params.projetoId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar tags' });
    }
});

// GET ONE Tag
app.get('/api/tag/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM tags WHERE IdTag = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Tag n�o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tag' });
    }
});

// CREATE Tag
app.post('/api/tag', async (req, res) => {
    const data = req.body;

    if (!data.Tag || !data.IdProjeto) {
        return res.status(400).json({ success: false, message: 'Tag e Projeto s�o obrigat�rios' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO tags (
                Tag, DescTag, IdProjeto, Projeto, DataPrevisao,
                TipoProduto, UnidadeProduto, QtdeTag, QtdeLiberada, 
                SaldoTag, ValorTag, StatusTag, DescStatus, CriadoPor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.Tag?.trim(),
                data.DescTag?.trim() || null,
                data.IdProjeto,
                data.Projeto || null,
                data.DataPrevisao || null,
                data.TipoProduto || null,
                data.UnidadeProduto || null,
                data.QtdeTag || null,
                data.QtdeLiberada || null,
                data.SaldoTag || null,
                data.ValorTag || null,
                data.StatusTag || 1,
                data.DescStatus || 'Ativo',
                'Sistema'
            ]
        );
        res.json({ success: true, message: 'Tag cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE Tag
app.put('/api/tag/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Tag) {
        return res.status(400).json({ success: false, message: 'Tag � obrigat�ria' });
    }

    try {
        await pool.execute(
            `UPDATE tags SET
                Tag = ?, DescTag = ?, DataPrevisao = ?,
                TipoProduto = ?, UnidadeProduto = ?, QtdeTag = ?, 
                QtdeLiberada = ?, SaldoTag = ?, ValorTag = ?,
                StatusTag = ?, DescStatus = ?
            WHERE IdTag = ?`,
            [
                data.Tag?.trim(),
                data.DescTag?.trim() || null,
                data.DataPrevisao || null,
                data.TipoProduto || null,
                data.UnidadeProduto || null,
                data.QtdeTag || null,
                data.QtdeLiberada || null,
                data.SaldoTag || null,
                data.ValorTag || null,
                data.StatusTag || 1,
                data.DescStatus || 'Ativo',
                id
            ]
        );
        res.json({ success: true, message: 'Tag atualizada com sucesso' });
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE Tag (Soft Delete)
app.delete('/api/tag/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE tags SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdTag = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Tag exclu�da' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: TipoProduto ---

// OPTIONS for dropdown
app.get('/api/tipoproduto/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdTipoProduto as id, TipoProduto as label FROM tipoproduto WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY TipoProduto"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tipoproduto options:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar op��es' });
    }
});

// LIST
app.get('/api/tipoproduto', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT IdTipoProduto, TipoProduto, Unidade, Descricao, DataCriacao
            FROM tipoproduto 
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''
            ORDER BY TipoProduto
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar' });
    }
});

// GET ONE
app.get('/api/tipoproduto/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM tipoproduto WHERE IdTipoProduto = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'N�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar' });
    }
});

// CREATE
app.post('/api/tipoproduto', async (req, res) => {
    const { TipoProduto, Unidade, Descricao } = req.body;

    if (!TipoProduto) {
        return res.status(400).json({ success: false, message: 'Tipo Produto � obrigat�rio' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO tipoproduto (TipoProduto, Unidade, Descricao, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [TipoProduto.trim(), Unidade || null, Descricao || null, now, 'Sistema']
        );
        res.json({ success: true, message: 'Tipo cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE
app.put('/api/tipoproduto/:id', async (req, res) => {
    const { TipoProduto, Unidade, Descricao } = req.body;

    if (!TipoProduto) {
        return res.status(400).json({ success: false, message: 'Tipo Produto � obrigat�rio' });
    }

    try {
        await pool.execute(
            'UPDATE tipoproduto SET TipoProduto = ?, Unidade = ?, Descricao = ? WHERE IdTipoProduto = ?',
            [TipoProduto.trim(), Unidade || null, Descricao || null, req.params.id]
        );
        res.json({ success: true, message: 'Tipo atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft)
app.delete('/api/tipoproduto/:id', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await pool.execute(
            "UPDATE tipoproduto SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdTipoProduto = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Tipo exclu�do' });
    } catch (error) {
        console.error('Error deleting tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- Rota para servir PDFs de caminhos locais ---
// Esta rota permite abrir PDFs que est�o em pastas do sistema de arquivos
app.get('/api/pdf', async (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Caminho do arquivo n�o informado' });
    }

    try {
        // Normaliza o caminho (trata barras e formato)
        let normalizedPath = filePath.replace(/\\/g, '/');

        // Remove prefixo file:/// se existir
        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extens�o para .pdf se necess�rio
        normalizedPath = normalizedPath.replace(/\.[^.]+$/, '.pdf');

        // Verifica se o arquivo existe
        if (!fs.existsSync(normalizedPath)) {
            console.error('Arquivo n�o encontrado:', normalizedPath);
            return res.status(404).json({ success: false, message: 'Arquivo n�o encontrado: ' + normalizedPath });
        }

        // Verifica se � realmente um PDF
        if (!normalizedPath.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ success: false, message: 'Apenas arquivos PDF s�o permitidos' });
        }

        // Define headers e envia o arquivo
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(normalizedPath) + '"');

        const fileStream = fs.createReadStream(normalizedPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Erro ao servir PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao abrir arquivo: ' + error.message });
    }
});

// --- Rota para download de DXF e arquivos 3D (SLDPRT) ---
app.get('/api/download', async (req, res) => {
    const filePath = req.query.path;
    const type = req.query.type; // 'dxf' or 'sldprt'

    if (!filePath || !type) {
        return res.status(400).json({ success: false, message: 'Caminho do arquivo ou tipo n�o informado' });
    }

    try {
        let normalizedPath = filePath.replace(/\\/g, '/');

        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extens�o para o tipo solicitado
        const targetExt = type.toLowerCase() === 'sldprt' ? '.SLDPRT' : '.DXF';
        normalizedPath = normalizedPath.replace(/\.[^.]+$/, targetExt);

        if (!fs.existsSync(normalizedPath)) {
            // Tenta com extens�o em min�scula como fallback
            const lowerExt = targetExt.toLowerCase();
            const altPath = normalizedPath.replace(/\.[^.]+$/, lowerExt);

            if (fs.existsSync(altPath)) {
                normalizedPath = altPath;
            } else {
                console.error('Arquivo para download n�o encontrado:', normalizedPath);
                return res.status(404).json({ success: false, message: 'Arquivo n�o encontrado: ' + normalizedPath });
            }
        }

        // Mime types
        const contentType = type.toLowerCase() === 'sldprt'
            ? 'application/octet-stream'
            : 'image/vnd.dxf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(normalizedPath) + '"');

        const fileStream = fs.createReadStream(normalizedPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Erro ao servir arquivo para download:', error);
        res.status(500).json({ success: false, message: 'Erro ao baixar arquivo: ' + error.message });
    }
});

// --- Ordens de Servi�o (Somente Leitura) ---

// OPTIONS: Lista de Projetos �nicos para dropdown
app.get('/api/ordemservico/projetos', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT Projeto as value, Projeto as label 
            FROM ordemservico 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND Projeto IS NOT NULL AND Projeto != ''
            ORDER BY Projeto
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching projetos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar projetos' });
    }
});

// OPTIONS: Lista de Tags �nicas para dropdown
app.get('/api/ordemservico/tags', async (req, res) => {
    try {
        const projeto = req.query.projeto;
        let sql = `
            SELECT DISTINCT Tag as value, Tag as label 
            FROM ordemservico 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND Tag IS NOT NULL AND Tag != ''
        `;
        const params = [];
        if (projeto) {
            sql += ' AND Projeto = ?';
            params.push(projeto);
        }
        sql += ' ORDER BY Tag';
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar tags' });
    }
});

// SEARCH: Busca global em itens por c�digo do documento/desenho
app.get('/api/ordemservico/busca-item', async (req, res) => {
    try {
        const search = req.query.q;
        if (!search || search.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const [rows] = await pool.execute(`
            SELECT 
                osi.IdOrdemServicoItem, osi.IdOrdemServico, osi.CodMatFabricante, 
                osi.DescResumo, osi.QtdeTotal, osi.Peso, osi.EnderecoArquivo,
                os.Projeto, os.Tag, os.DescTag
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            WHERE (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
              AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
              AND (osi.CodMatFabricante LIKE ? OR osi.DescResumo LIKE ?)
            ORDER BY osi.CodMatFabricante
            LIMIT 100
        `, [`%${search}%`, `%${search}%`]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({ success: false, message: 'Erro na busca' });
    }
});

// LIST Ordens de Servi�o com pagina��o e filtros
app.get('/api/ordemservico', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const projeto = req.query.projeto;
        const tag = req.query.tag;
        const search = req.query.search;

        // Construir WHERE din�mico
        let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";
        const params = [];

        if (projeto) {
            whereClause += " AND Projeto = ?";
            params.push(projeto);
        }
        if (tag) {
            whereClause += " AND Tag LIKE ?";
            params.push(`%${tag}%`);
        }
        if (search) {
            whereClause += " AND (CAST(IdOrdemServico AS CHAR) LIKE ? OR Tag LIKE ? OR DescTag LIKE ? OR Projeto LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Count total
        const [countResult] = await pool.execute(
            `SELECT COUNT(*) as total FROM ordemservico WHERE ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Query com pagina��o
        const [rows] = await pool.execute(`
            SELECT 
                IdOrdemServico, Projeto, Tag, DescTag, Descricao,
                Estatus, DataPrevisao, DataCriacao, CriadoPor,
                Liberado_Engenharia, Data_Liberacao_Engenharia,
                QtdeTotalItens, QtdeItensExecutados, PercentualItens,
                QtdeTotalPecas, QtdePecasExecutadas, PercentualPecas,
                PesoTotal, AreaPinturaTotal,
                OrdemServicoFinalizado, DataFinalizado,
                IdProjeto, IdTag, DescEmpresa,
                PlanejadoInicioCorte, PlanejadoFinalCorte, RealizadoInicioCorte, RealizadoFinalCorte,
                PlanejadoInicioDobra, PlanejadoFinalDobra, RealizadoInicioDobra, RealizadoFinalDobra,
                PlanejadoInicioSolda, PlanejadoFinalSolda, RealizadoInicioSolda, RealizadoFinalSolda,
                PlanejadoInicioPintura, PlanejadoFinalPintura, RealizadoInicioPintura, RealizadoFinalPintura,
                PlanejadoInicioMontagem, PlanejadoFinalMontagem, RealizadoInicioMontagem, RealizadoFinalMontagem,
                PlanejadoInicioENGENHARIA, PlanejadoFinalENGENHARIA, RealizadoInicioENGENHARIA, RealizadoFinalENGENHARIA,
                PlanejadoInicioACABAMENTO, PlanejadoFinalACABAMENTO, RealizadoInicioACABAMENTO, RealizadoFinalACABAMENTO,
                EnderecoOrdemServico
            FROM ordemservico 
            WHERE ${whereClause}
            ORDER BY IdOrdemServico DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching ordemservico:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar OS' });
    }
});

// GET ONE Ordem de Servi�o
app.get('/api/ordemservico/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM ordemservico WHERE IdOrdemServico = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'OS n�o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching ordemservico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar OS' });
    }
});

// LIST Itens de uma Ordem de Servi�o
app.get('/api/ordemservico/:id/itens', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, DescResumo, DescDetal,
                QtdeTotal, Peso, AreaPintura, Acabamento, Unidade,
                Espessura, Altura, Largura,
                CodMatFabricante, MaterialSW, EnderecoArquivo,
                OrdemServicoItemFinalizado as Finalizado,
                txtCorte, sttxtCorte, CortePercentual,
                txtDobra, sttxtDobra, DobraPercentual,
                txtSolda, sttxtSolda, SoldaPercentual,
                txtPintura, sttxtPintura, PinturaPercentual,
                TxtMontagem, sttxtMontagem, MontagemPercentual
            FROM ordemservicoitem 
            WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdOrdemServicoItem
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ordemservicoitem:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar itens OS' });
    }
});

// --- Apontamento de Produ��o ---

// Mapeamento de setores para colunas
const setorColumns = {
    corte: { txt: 'txtCorte', percentual: 'CortePercentual', status: 'sttxtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' },
    dobra: { txt: 'txtDobra', percentual: 'DobraPercentual', status: 'sttxtDobra', total: 'DobraTotalExecutado', executar: 'DobraTotalExecutar' },
    solda: { txt: 'txtSolda', percentual: 'SoldaPercentual', status: 'sttxtSolda', total: 'SoldaTotalExecutado', executar: 'SoldaTotalExecutar' },
    pintura: { txt: 'txtPintura', percentual: 'PinturaPercentual', status: 'sttxtPintura', total: 'PinturaTotalExecutado', executar: 'PinturaTotalExecutar' },
    montagem: { txt: 'TxtMontagem', percentual: 'MontagemPercentual', status: 'sttxtMontagem', total: 'MontagemTotalExecutado', executar: 'MontagemTotalExecutar' },
    mapa: { txt: 'txtCorte', percentual: 'CortePercentual', status: 'sttxtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' }
};

// GET: Mapa da Produ��o - vis�o geral de todos os processos
app.get('/api/apontamento/mapa/producao', async (req, res) => {
    const { projeto, tag, os, item, search, status } = req.query;

    try {
        let whereClause = `
            (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            AND (
                NULLIF(TRIM(osi.txtCorte), '') = '1' OR 
                NULLIF(TRIM(osi.txtDobra), '') = '1' OR 
                NULLIF(TRIM(osi.txtSolda), '') = '1' OR 
                NULLIF(TRIM(osi.txtPintura), '') = '1'
            )
        `;
        const params = [];

        if (projeto) {
            whereClause += ' AND os.Projeto = ?';
            params.push(projeto);
        }

        if (tag) {
            whereClause += ' AND os.Tag = ?';
            params.push(tag);
        }

        if (os) {
            whereClause += ' AND os.IdOrdemServico = ?';
            params.push(os);
        }

        if (item) {
            whereClause += ' AND osi.IdOrdemServicoItem = ?';
            params.push(item);
        }

        if (search) {
            whereClause += ` AND (
                osi.CodMatFabricante LIKE ? OR 
                osi.DescResumo LIKE ? OR 
                osi.MaterialSW LIKE ? OR 
                osi.Espessura LIKE ? OR
                CAST(os.IdOrdemServico AS CHAR) LIKE ? OR
                CAST(osi.IdOrdemServicoItem AS CHAR) LIKE ? OR
                os.DescEmpresa LIKE ?
            )`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        // Filter by cliente
        if (req.query.cliente) {
            whereClause += ' AND os.DescEmpresa = ?';
            params.push(req.query.cliente);
        }

        // Filter by overall status
        if (status === 'pendente') {
            whereClause += ` AND (
                (NULLIF(TRIM(osi.txtCorte), '') = '1' AND (osi.CorteTotalExecutado IS NULL OR osi.CorteTotalExecutado < osi.QtdeTotal)) OR
                (NULLIF(TRIM(osi.txtDobra), '') = '1' AND (osi.DobraTotalExecutado IS NULL OR osi.DobraTotalExecutado < osi.QtdeTotal)) OR
                (NULLIF(TRIM(osi.txtSolda), '') = '1' AND (osi.SoldaTotalExecutado IS NULL OR osi.SoldaTotalExecutado < osi.QtdeTotal)) OR
                (NULLIF(TRIM(osi.txtPintura), '') = '1' AND (osi.PinturaTotalExecutado IS NULL OR osi.PinturaTotalExecutado < osi.QtdeTotal))
            )`;
        }

        const [rows] = await pool.execute(`
            SELECT 
                osi.IdOrdemServicoItem,
                osi.IdOrdemServico,
                osi.CodMatFabricante,
                osi.DescResumo,
                osi.QtdeTotal,
                osi.EnderecoArquivo,
                osi.EnderecoArquivoItemOrdemServico,
                osi.IdPlanodecorte as PlanoCorte,
                osi.MaterialSW,
                osi.Espessura,
                osi.txtCorte,
                osi.txtDobra,
                osi.txtSolda,
                osi.txtPintura,
                osi.TxtMontagem,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.CorteTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as CortePercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.DobraTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as DobraPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.SoldaTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as SoldaPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.PinturaTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as PinturaPercentual,
                CASE WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.MontagemTotalExecutado, 0) / osi.QtdeTotal) * 100) ELSE 0 END as MontagemPercentual,
                osi.CorteTotalExecutado,
                osi.DobraTotalExecutado,
                osi.SoldaTotalExecutado,
                osi.PinturaTotalExecutado,
                osi.MontagemTotalExecutado,
                os.Projeto,
                os.IdProjeto,
                p.DescProjeto,
                os.Tag,
                os.IdTag,
                os.DescTag,
                os.DescEmpresa as Cliente,
                osi.ProdutoPrincipal as IsProdutoPrincipal,
                (SELECT DescResumo FROM ordemservicoitem WHERE IdOrdemServico = osi.IdOrdemServico AND ProdutoPrincipal = 'sim' LIMIT 1) as NomeProdutoPrincipal
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
            ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem
        `, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching mapa producao:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar mapa de produ��o' });
    }
});

// LIST: Itens por setor para apontamento
app.get('/api/apontamento/:setor', async (req, res) => {
    const setor = req.params.setor.toLowerCase();
    const setorConfig = setorColumns[setor];

    if (!setorConfig) {
        return res.status(400).json({
            success: false,
            message: 'Setor inv�lido. Use: corte, dobra, solda, pintura ou montagem'
        });
    }

    const { projeto, tag, os, item, search, status } = req.query;

    try {
        // D_E_L_E_T_E = '*' means deleted, Liberado_engenharia = 'S' required
        let whereClause = `osi.${setorConfig.txt} = '1' 
            AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')`;
        const params = [];

        if (projeto) {
            whereClause += ' AND os.Projeto = ?';
            params.push(projeto);
        }

        if (item) {
            whereClause += ' AND osi.IdOrdemServicoItem = ?';
            params.push(item);
        }

        // Expanded search across multiple columns
        if (search) {
            whereClause += ` AND(
            osi.CodMatFabricante LIKE ? OR 
                osi.DescResumo LIKE ? OR 
                osi.MaterialSW LIKE ? OR 
                osi.Espessura LIKE ? OR
                CAST(os.IdOrdemServico AS CHAR) LIKE ? OR
                CAST(osi.IdOrdemServicoItem AS CHAR) LIKE ?
            )`;
            const searchPattern = `% ${search} % `;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (status === 'pendente') {
            whereClause += ` AND(osi.${setorConfig.status} IS NULL OR osi.${setorConfig.status} != 'C')`;
        } else if (status === 'concluido') {
            whereClause += ` AND osi.${setorConfig.status} = 'C'`;
        }

        // Filter by Tag
        if (req.query.tag) {
            whereClause += ' AND os.Tag = ?';
            params.push(req.query.tag);
        }

        // Filter by OS number
        if (req.query.os) {
            whereClause += ' AND os.IdOrdemServico = ?';
            params.push(req.query.os);
        }

        // Filter by Cliente
        if (req.query.cliente) {
            whereClause += ' AND os.DescEmpresa = ?';
            params.push(req.query.cliente);
        }

        const [rows] = await pool.execute(`
            SELECT 
                osi.IdOrdemServicoItem,
            osi.IdOrdemServico,
            osi.CodMatFabricante,
            osi.DescResumo,
            osi.DescDetal,
            osi.QtdeTotal,
            osi.Peso,
            osi.EnderecoArquivo,
            osi.EnderecoArquivoItemOrdemServico,
            osi.IdPlanodecorte as PlanoCorte,
            osi.MaterialSW,
            osi.Espessura,
            CASE 
                    WHEN osi.QtdeTotal > 0 THEN ROUND((COALESCE(osi.${setorConfig.total}, 0) / osi.QtdeTotal) * 100)
                    ELSE 0 
                END as PercentualSetor,
            osi.${setorConfig.status} as Status,
            osi.${setorConfig.total} as QtdeProduzidaSetor,
            os.Projeto,
            os.IdProjeto,
            p.DescProjeto,
            os.Tag,
            os.IdTag,
            os.DescTag,
            os.DescEmpresa as Cliente,
            osi.txtcorte as txtCorte,
            osi.txtdobra as txtDobra,
            osi.txtsolda as txtSolda,
            osi.txtpintura as txtPintura,
            osi.txtmontagem as TxtMontagem,
            osi.ProdutoPrincipal as IsProdutoPrincipal,
            (SELECT DescResumo FROM ordemservicoitem WHERE IdOrdemServico = osi.IdOrdemServico AND ProdutoPrincipal = 'sim' LIMIT 1) as NomeProdutoPrincipal,
        (SELECT COALESCE(SUM(CAST(QtdeProduzida AS UNSIGNED)), 0) 
                 FROM ordemservicoitemcontrole 
                 WHERE IdOrdemServicoItem = osi.IdOrdemServicoItem 
                   AND Processo = ?
            AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')) as QtdeProduzidaHistory
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
            ORDER BY os.IdOrdemServico DESC, osi.IdOrdemServicoItem
            LIMIT 300
    `, [setor, ...params]);

        res.json({ success: true, data: rows, setor });
    } catch (error) {
        console.error('Error fetching apontamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar itens para apontamento' });
    }
});

// GET: Projetos para dropdown de apontamento
app.get('/api/apontamento/projetos/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT os.Projeto as value, os.Projeto as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
              AND os.Projeto IS NOT NULL AND os.Projeto != ''
            ORDER BY os.Projeto
    `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching projetos:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar projetos' });
    }
});

// GET: Tags para dropdown de apontamento
app.get('/api/apontamento/tags/options', async (req, res) => {
    try {
        let query = `
            SELECT DISTINCT os.Tag as value, CONCAT(os.Tag, ' - ', os.DescTag) as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
              AND os.Tag IS NOT NULL AND os.Tag != ''
    `;
        const params = [];

        if (req.query.projeto) {
            query += ' AND os.Projeto = ?';
            params.push(req.query.projeto);
        }

        query += ' ORDER BY os.Tag';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar tags' });
    }
});

// GET: Ordens de Servi�o para dropdown de apontamento
app.get('/api/apontamento/os/options', async (req, res) => {
    try {
        let query = `
            SELECT DISTINCT os.IdOrdemServico as value,
    CONCAT('OS ', os.IdOrdemServico, ' - ', os.Tag) as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '')
AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
    `;
        const params = [];

        if (req.query.projeto) {
            query += ' AND os.Projeto = ?';
            params.push(req.query.projeto);
        }

        if (req.query.tag) {
            query += ' AND os.Tag = ?';
            params.push(req.query.tag);
        }

        query += ' ORDER BY os.IdOrdemServico DESC';

        const [rows] = await pool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ordens:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar ordens' });
    }
});

// GET: Clientes para dropdown de apontamento
app.get('/api/apontamento/clientes/options', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT DISTINCT os.DescEmpresa as value, os.DescEmpresa as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
              AND os.DescEmpresa IS NOT NULL AND os.DescEmpresa != ''
            ORDER BY os.DescEmpresa
    `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching clientes:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar clientes' });
    }
});

// GET: Detalhes de um item + hist�rico de apontamentos
app.get('/api/apontamento/item/:id/:processo', async (req, res) => {
    const { id, processo } = req.params;
    const isAll = processo.toLowerCase() === 'all';
    const setorConfig = setorColumns[processo.toLowerCase()] || setorColumns['mapa']; // Default to mapa if all

    try {
        console.log(`[API] Fetching item details for ID: ${id}, Processo: ${processo} `);
        // Buscar item
        const [itemRows] = await pool.execute(`
SELECT
    osi.IdOrdemServicoItem,
    osi.IdOrdemServico,
    osi.CodMatFabricante,
    osi.DescResumo,
    osi.DescDetal,
    osi.EnderecoArquivo,
    osi.QtdeTotal,
    osi.Peso,
    osi.txtCorte,
    osi.txtDobra,
    osi.txtSolda,
    osi.txtPintura,
    osi.TxtMontagem,
    osi.${setorConfig.percentual} as PercentualSetor,
    osi.${setorConfig.total} as TotalExecutado,
    osi.${setorConfig.executar} as TotalExecutar,
    (osi.QtdeTotal - COALESCE(osi.${setorConfig.total}, 0)) as QtdeFaltanteCalculada,
    os.Projeto,
    os.Tag,
    os.DescTag
FROM ordemservicoitem osi
INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
WHERE osi.IdOrdemServicoItem = ?
    `, [id]);

        if (itemRows.length === 0) {
            console.log(`[API] Item ${id} not found`);
            return res.status(404).json({ success: false, message: 'Item n�o encontrado' });
        }

        const item = itemRows[0];

        // Buscar hist�rico de apontamentos baseando-se na viewordemservicoitemcontrole conforme sistema legado (VB.NET)
        // Ignoramos a filtragem por processo aqui para manter a compatibilidade com a visualiza��o completa
        const historicoQuery = `
            SELECT
                idordemservicoitemControle,
                CriadoPor,
                DataCriacao,
                Codmatfabricante,
                QtdeTotal,
                QtdeProduzida,
                QtdeFaltante,
                txtCorte,
                txtDobra,
                txtSolda,
                txtPintura,
                txtMontagem
            FROM viewordemservicoitemcontrole
            WHERE IdOrdemServicoItem = ?
            ORDER BY DataCriacao DESC, idordemservicoitemControle DESC
        `;
        const queryParams = [id];
        const [historicoRows] = await pool.execute(historicoQuery, queryParams);

        // Legacy missing quantity logic
        const totalExecutado = parseFloat(item.TotalExecutado) || 0;
        const totalExecutar = (item.TotalExecutar === null || parseFloat(item.TotalExecutar) === 0)
            ? item.QtdeTotal - totalExecutado
            : parseFloat(item.TotalExecutar);

        const responseData = {
            item: item,
            historico: historicoRows,
            totalProduzido: totalExecutado,
            qtdeFaltante: Math.max(0, totalExecutar)
        };
        console.log(`[API] Sending details for item ${id}`);
        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching item details:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do item' });
    }
});

// POST: Registrar apontamento de produ��o
app.post('/api/apontamento', async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({
            success: false,
            message: 'IdOrdemServicoItem, Processo e QtdeProduzida s�o obrigat�rios'
        });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const isMapa = Processo.toLowerCase() === 'mapa';
    const setorAtivo = !isMapa ? Processo.toLowerCase() : null;

    if (!isMapa && !setorColumns[setorAtivo]) {
        return res.status(400).json({ success: false, message: 'Processo inv�lido' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const now = getCurrentDateTimeBR();
        const dateNow = getCurrentDateBR();

        // 1. Fetch item and details
        const [itemRows] = await conn.execute(`
            SELECT
osi.*,
    os.IdProjeto, os.Projeto, os.IdTag, os.Tag, os.IdOrdemServico
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            WHERE osi.IdOrdemServicoItem = ?
    `, [IdOrdemServicoItem]);

        if (itemRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item n�o encontrado' });
        }

        const item = itemRows[0];
        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;

        // Sectors to process: If Mapa, process ALL 5 sectors. If individual, only the active one.
        const setoresParaProcessar = isMapa
            ? ['corte', 'dobra', 'solda', 'pintura', 'montagem']
            : [setorAtivo];

        if (setoresParaProcessar.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Este item n�o possui setores ativos para apontar' });
        }

        let someSectorFinalized = false;
        let lastNovoTotalExecutado = 0;
        let lastNovoPercentual = 0;
        let lastFinalizado = false;

        for (const sName of setoresParaProcessar) {
            const sConfig = setorColumns[sName];
            const totalExecutadoDb = parseFloat(item[sConfig.total]) || 0;
            const statusAtual = item[sConfig.status];

            // If it's already finished in this sector AND NOT in Mapa mode, we skip
            if (statusAtual === 'C' && !isMapa) continue;

            const currentInputQty = isMapa ? Math.max(0, qtdeTotal - totalExecutadoDb) : inputQty;

            // If not Mapa and no quantity to process, skip
            if (!isMapa && currentInputQty <= 0) continue;

            const totalExecutarLimit = (parseFloat(item[sConfig.executar]) === 0 || item[sConfig.executar] === null)
                ? qtdeTotal - totalExecutadoDb
                : parseFloat(item[sConfig.executar]);

            if (!isMapa) {
                if (totalExecutarLimit <= 0) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: `N�o h� saldo a executar para o setor ${sName}.` });
                }

                if (currentInputQty > totalExecutarLimit) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Quantidade informada(${currentInputQty}) excede o saldo a executar(${totalExecutarLimit}) no setor ${sName} !`
                    });
                }
            }

            const novoTotalExecutado = isMapa ? qtdeTotal : totalExecutadoDb + currentInputQty;
            const novoTotalExecutar = isMapa ? 0 : Math.max(0, totalExecutarLimit - currentInputQty);
            const novoPercentual = isMapa ? 100 : (qtdeTotal > 0 ? Math.min(100, Math.round((novoTotalExecutado / qtdeTotal) * 100)) : 0);
            const finalizado = novoTotalExecutado >= qtdeTotal;

            if (finalizado || isMapa) someSectorFinalized = true;

            lastNovoTotalExecutado = novoTotalExecutado;
            lastNovoPercentual = novoPercentual;
            lastFinalizado = finalizado || isMapa;

            // 5. Update ordemservicoitem
            let updateItemQuery = `
                UPDATE ordemservicoitem 
                SET ${sConfig.total} = ?, 
                    ${sConfig.executar} = ?, 
                    ${sConfig.percentual} = ?,
                    ${sConfig.status} = ?
`;
            const updateItemParams = [novoTotalExecutado, novoTotalExecutar, novoPercentual, (finalizado || isMapa) ? 'C' : ''];

            if (finalizado || isMapa) {
                const setorCapitalized = sName.charAt(0).toUpperCase() + sName.slice(1).toLowerCase();
                const dateField = `RealizadoFinal${setorCapitalized} `;
                const userField = `UsuarioRealizadoFinal${setorCapitalized} `;
                updateItemQuery += `, ${dateField} = ?, ${userField} = ?`;
                updateItemParams.push(dateNow, CriadoPor || 'Sistema');

                if (sName === 'montagem') {
                    updateItemQuery += `, DataFinalMontagem = ? `;
                    updateItemParams.push(dateNow);
                }
            }

            updateItemQuery += ` WHERE IdOrdemServicoItem = ? `;
            updateItemParams.push(IdOrdemServicoItem);
            await conn.execute(updateItemQuery, updateItemParams);

            // 6. Cascading Totals (only if there was an actual increase)
            if (currentInputQty > 0) {
                await conn.execute(`UPDATE ordemservico SET ${sConfig.total} = COALESCE(${sConfig.total}, 0) + ? WHERE IdOrdemServico = ? `, [currentInputQty, item.IdOrdemServico]);
                if (item.IdTag) await conn.execute(`UPDATE tags SET ${sConfig.total} = COALESCE(${sConfig.total}, 0) + ? WHERE IdTag = ? `, [currentInputQty, item.IdTag]);
                if (item.IdProjeto) await conn.execute(`UPDATE projetos SET ${sConfig.total} = COALESCE(${sConfig.total}, 0) + ? WHERE IdProjeto = ? `, [currentInputQty, item.IdProjeto]);
            }

            // 7. Success log
            // Note: We log the actual sName process here, but if isMapa we log as 'mapa' in the final audit if desired.
            // Following legacy, we will log a record for 'mapa' at the end, and for individual ones here.
            const txtSetor = `txt${sName.charAt(0).toUpperCase() + sName.slice(1).toLowerCase()}`;
            await conn.execute(`
                INSERT INTO ordemservicoitemcontrole(
                    IdOrdemServicoItem, IdOrdemServico, Processo, QtdeTotal, QtdeProduzida, ${txtSetor}, CriadoPor, DataCriacao, D_E_L_E_T_E
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, '')
            `, [IdOrdemServicoItem, item.IdOrdemServico, sName.toLowerCase(), item.QtdeTotal, currentInputQty, currentInputQty, CriadoPor || 'Sistema', now]);

            // 8. Update tagcontrole
            if (item.IdTag) {
                const setorCap = sName.charAt(0).toUpperCase() + sName.slice(1).toLowerCase();
                const dateCol = `RealizadoFinal${setorCap}Controle`;
                const userCol = `UsuarioRealizadoFinal${setorCap}Controle`;

                const [tcRows] = await conn.execute('SELECT IdTagControle FROM tagcontrole WHERE IdTag = ? LIMIT 1', [item.IdTag]);
                if (tcRows.length > 0) {
                    await conn.execute(`UPDATE tagcontrole SET ${dateCol} = ?, ${userCol} = ? WHERE IdTagControle = ? `, [dateNow, CriadoPor || 'Sistema', tcRows[0].IdTagControle]);
                } else {
                    await conn.execute(`INSERT INTO tagcontrole(IdTag, Tag, IdProjeto, Projeto, ${dateCol}, ${userCol}, DataControle) VALUES(?, ?, ?, ?, ?, ?, ?)`,
                        [item.IdTag, item.Tag, item.IdProjeto, item.Projeto, dateNow, CriadoPor || 'Sistema', dateNow]);
                }
            }
        }

        // 9. Item Finalization Check (Cascading to OS/Tag/Project)
        // Reference: VB.NET BancoDados.AtualizaSetoresAnteriores() logic
        if (someSectorFinalized || isMapa) {
            // Equivalent to checking viewordemservicoitemstatussetor.Resultado = 0
            const [checkSectors] = await conn.execute(`
SELECT
    (COALESCE(CASE WHEN NULLIF(txtCorte, '') = '1' AND COALESCE(sttxtCorte, '') != 'C' THEN 1 ELSE 0 END, 0) +
        COALESCE(CASE WHEN NULLIF(txtDobra, '') = '1' AND COALESCE(sttxtDobra, '') != 'C' THEN 1 ELSE 0 END, 0) +
        COALESCE(CASE WHEN NULLIF(txtSolda, '') = '1' AND COALESCE(sttxtSolda, '') != 'C' THEN 1 ELSE 0 END, 0) +
        COALESCE(CASE WHEN NULLIF(txtPintura, '') = '1' AND COALESCE(sttxtPintura, '') != 'C' THEN 1 ELSE 0 END, 0) +
        COALESCE(CASE WHEN NULLIF(TxtMontagem, '') = '1' AND COALESCE(sttxtMontagem, '') != 'C' THEN 1 ELSE 0 END, 0)) as Pendentes
                FROM ordemservicoitem 
                WHERE IdOrdemServicoItem = ?
    `, [IdOrdemServicoItem]);

            const itemIsComplete = (checkSectors.length > 0 && parseInt(checkSectors[0].Pendentes) === 0);

            if (itemIsComplete || isMapa) {
                // Mark current item as finalized
                await conn.execute("UPDATE ordemservicoitem SET OrdemServicoItemFinalizado = 'C' WHERE IdOrdemServicoItem = ?", [IdOrdemServicoItem]);

                // IF PRODUTO PRINCIPAL = "SIM" THEN FINALIZA TODOS OS ITENS DA OS
                if (item.ProdutoPrincipal?.toUpperCase() === 'SIM') {
                    await conn.execute("UPDATE ordemservicoitem SET OrdemServicoItemFinalizado = 'C' WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')", [item.IdOrdemServico]);
                }

                // CASCADING: OS > TAG > PROJETO (FinalizadatasdaOS)
                const [pendingItems] = await conn.execute(`
                    SELECT COUNT(IdOrdemServicoItem) as count 
                    FROM ordemservicoitem
WHERE(OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C') 
                      AND IdOrdemServico = ?
    AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `, [item.IdOrdemServico]);

                if (parseInt(pendingItems[0].count) === 0) {
                    // Update OS Status
                    await conn.execute(`
                        UPDATE ordemservico 
                        SET OrdemServicoFinalizado = 'C',
    DataFinalizado = ?,
    UsuarioFinalizado = ?,
    DataFinalizacao = ?
        WHERE IdOrdemServico = ?
            `, [dateNow, CriadoPor || 'Sistema', dateNow, item.IdOrdemServico]);

                    // Update Tag Status
                    if (item.IdTag) {
                        const [pendingOSs] = await conn.execute(`
                            SELECT COUNT(IdOrdemServico) as count 
                            FROM ordemservico
WHERE(OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C') 
                              AND IdTag = ?
    AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `, [item.IdTag]);

                        if (parseInt(pendingOSs[0].count) === 0) {
                            await conn.execute(`
                                UPDATE tags 
                                SET Finalizado = 'C',
    DataFinalizado = ?,
    UsuarioFinalizado = ?
        WHERE IdTag = ?
            `, [dateNow, CriadoPor || 'Sistema', item.IdTag]);

                            // Update Project Status
                            if (item.IdProjeto) {
                                const [pendingTags] = await conn.execute(`
                                    SELECT COUNT(IdTag) as count 
                                    FROM tags
WHERE(Finalizado IS NULL OR Finalizado != 'C') 
                                      AND IdProjeto = ?
    AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `, [item.IdProjeto]);

                                if (parseInt(pendingTags[0].count) === 0) {
                                    await conn.execute(`
                                        UPDATE projetos 
                                        SET Finalizado = 'C',
    DataFinalizado = ?,
    UsuarioFinalizado = ?
        WHERE IdProjeto = ?
            `, [dateNow, CriadoPor || 'Sistema', item.IdProjeto]);
                                }
                            }
                        }
                    }
                }
            }
        }

        await conn.commit();
        res.json({ success: true, message: 'Apontamento registrado com sucesso', data: { totalProduzido: lastNovoTotalExecutado, percentual: lastNovoPercentual, finalizado: lastFinalizado } });

    } catch (error) {
        await conn.rollback();
        console.error('Error creating apontamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar apontamento: ' + error.message });
    } finally {
        conn.release();
    }
});

// DELETE: Estornar apontamento
app.delete('/api/apontamento/:id', async (req, res) => {
    const { usuario, descricao } = req.body;
    const now = getCurrentDateTimeBR();

    try {
        // Buscar dados do apontamento antes de deletar
        const [rows] = await pool.execute(
            'SELECT IdOrdemServicoItem, Processo, QtdeProduzida FROM ordemservicoitemcontrole WHERE IdOrdemServicoItemControle = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Apontamento n�o encontrado' });
        }

        const { IdOrdemServicoItem, Processo, QtdeProduzida } = rows[0];
        const setorConfig = setorColumns[Processo.toLowerCase()];

        // Soft delete
        await pool.execute(
            `UPDATE ordemservicoitemcontrole 
             SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = ?, DescricaoEstorno = ?
    WHERE IdOrdemServicoItemControle = ? `,
            [usuario || 'Sistema', now, descricao || 'Estorno', req.params.id]
        );

        // Recalcular percentual
        const [sumRows] = await pool.execute(`
            SELECT COALESCE(SUM(CAST(QtdeProduzida AS UNSIGNED)), 0) as totalProduzido
            FROM ordemservicoitemcontrole
            WHERE IdOrdemServicoItem = ? AND Processo = ? AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
    `, [IdOrdemServicoItem, Processo]);

        const [itemRows] = await pool.execute(
            'SELECT QtdeTotal FROM ordemservicoitem WHERE IdOrdemServicoItem = ?',
            [IdOrdemServicoItem]
        );

        const qtdeTotal = parseInt(itemRows[0]?.QtdeTotal) || 0;
        const totalProduzido = parseInt(sumRows[0].totalProduzido) || 0;
        const novoPercentual = qtdeTotal > 0 ? Math.min(100, Math.round((totalProduzido / qtdeTotal) * 100)) : 0;

        // Atualizar percentual
        if (setorConfig) {
            await pool.execute(
                `UPDATE ordemservicoitem SET ${setorConfig.percentual} = ? WHERE IdOrdemServicoItem = ? `,
                [novoPercentual, IdOrdemServicoItem]
            );
        }

        res.json({ success: true, message: 'Apontamento estornado com sucesso' });
    } catch (error) {
        console.error('Error deleting apontamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao estornar apontamento' });
    }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        // Query companies count (active only)
        // Using pool from context (tenant) or default pool
        const [rows] = await pool.execute("SELECT COUNT(*) as total FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*'");

        // Mock other stats for now as user only requested companies count fix
        const stats = {
            companies: rows[0].total,
            pendingDocs: 12, // Placeholder
            compliance: 98   // Placeholder
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estat�sticas' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Root Redirect
app.get('/', (req, res) => {
    res.redirect('/landing.html');
});

// Test DB
app.get('/test-db', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        res.send('Successfully connected to the database!');
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).send(`Database connection failed: ${error.message} `);
    }
});

// Login


// Configura��o - GET
app.get('/api/config', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1');
        if (rows.length > 0) {
            res.json({ success: true, config: rows[0] });
        } else {
            // Default config if table empty
            res.json({ success: true, config: { RestringirApontamentoSemSaldoAnterior: 'N�o', ProcessosVisiveis: '["corte","dobra","solda","pintura","montagem"]' } });
        }
    } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar configura��es' });
    }
});

// GET /api/config/setores - Retornar Setores
app.get('/api/config/setores', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT Setor FROM setor WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY Setor");
        res.json({ success: true, setores: rows.map(r => r.Setor) });
    } catch (error) {
        console.error('Error fetching setores:', error);
        res.status(500).json({ success: false });
    }
});

// GET /api/config/usuarios - Retornar Usu�rios (Colaboradores)
app.get('/api/config/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT IdUsuario, NomeCompleto FROM usuario WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY NomeCompleto");
        res.json({ success: true, usuarios: rows });
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ success: false });
    }
});

// GET /api/config/tipostarefa - Retornar Tipos de Tarefa
app.get('/api/config/tipostarefa', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT IdTipoTarefa, TipoTarefa FROM tipotarefa WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY TipoTarefa");
        res.json({ success: true, tipostarefa: rows });
    } catch (error) {
        console.error('Error fetching tipos tarefa:', error);
        res.status(500).json({ success: false });
    }
});

// POST /api/producao/pendencia - Gerar Pend�ncia (A��o 2)
app.post('/api/producao/pendencia', async (req, res) => {
    const data = req.body;

    if (!data.idOrdemServicoItem || !data.descricaoPendencia) {
        return res.status(400).json({ success: false, message: 'ID do item e descri��o s�o obrigat�rios.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();
        const nowFormat = getCurrentDateTimeBR();

        let dtExecFormatada = '';
        if (data.dataExecucao) {
            const parts = data.dataExecucao.split('-');
            if (parts.length === 3) {
                dtExecFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                dtExecFormatada = data.dataExecucao;
            }
        }

        let dtFinFormatada = '';
        if (data.dataFinalizacao) {
            const parts = data.dataFinalizacao.split('-');
            if (parts.length === 3) {
                dtFinFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                dtFinFormatada = data.dataFinalizacao;
            }
        }

        if (data.idOrdemServicoItemPendencia && data.acao === 'FINALIZAR') {
            const sqlUpdateFinalizar = `
                UPDATE ordemservicoitempendencia
                SET
                    Estatus = 'FINALIZADO',
                    SetorResponsavelFinalizacao = ?,
                    FinalizadoPorUsuarioSetor = ?,
                    DataFinalizacao = ?,
                    DescricaoFinalizacao = ?,
                    DataExecucao = ?
                WHERE IdOrdemServicoItemPendencia = ?
            `;
            const paramsFinalizar = [
                data.setorResponsavelFinalizacao || '',
                data.finalizadoPorUsuarioSetor || '',
                dtFinFormatada || dtExecFormatada || '',
                data.descricaoFinalizacao || '',
                dtExecFormatada || '',
                data.idOrdemServicoItemPendencia
            ];
            await conn.execute(sqlUpdateFinalizar, paramsFinalizar);
            await conn.commit();
            return res.json({ success: true, message: 'Pend�ncia finalizada com sucesso!' });
        } else if (data.idOrdemServicoItemPendencia) {
            const sqlUpdate = `
                UPDATE ordemservicoitempendencia
                SET 
                    Espessura = ?,
                    MaterialSW = ?,
                    txtCorte = ?, txtDobra = ?, txtSolda = ?, txtPintura = ?, txtMontagem = ?,
                    DescricaoPendencia = ?,
                    SetorResponsavel = ?,
                    usuarioresponsavel = ?,
                    DataExecucao = ?,
                    TipoCadastro = ?
                WHERE IdOrdemServicoItemPendencia = ?
            `;
            const paramsUpdate = [
                data.espessura, data.materialSW,
                data.txtCorte || '', data.txtDobra || '', data.txtSolda || '', data.txtPintura || '', data.txtMontagem || '',
                data.descricaoPendencia ? data.descricaoPendencia.toUpperCase() : '',
                data.setorResponsavel, data.usuarioResponsavel,
                dtExecFormatada || '',
                data.tipoRnc || 'RNC',
                data.idOrdemServicoItemPendencia
            ];
            await conn.execute(sqlUpdate, paramsUpdate);
            await conn.commit();
            return res.json({ success: true, message: 'Pend�ncia atualizada com sucesso!' });
        }

        const sqlInsert = `
            INSERT INTO ordemservicoitempendencia (
                IdOrdemservicoItem, IdOrdemServico, IdProjeto, Projeto,
                IdTag, Tag, DescTag, DescEmpresa,
                CodMatFabricante, Espessura, MaterialSW,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem,
                DescricaoPendencia, SetorResponsavel, usuarioresponsavel,
                Usuario, DataCriacao, Estatus, TipoRegistro,
                TipoCadastro, dataexecucao, DescResumo, DescDetal,
                DescProjeto, OrigemPendencia
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, 'PENDENCIA', 'RNC',
                ?, ?, ?, ?,
                ?, ?
            )
        `;

        const params = [
            data.idOrdemServicoItem, data.idOrdemServico, data.idProjeto, data.projeto,
            data.idTag, data.tag, data.descTag, data.descEmpresa,
            data.codMatFabricante, data.espessura, data.materialSW,
            data.txtCorte || '', data.txtDobra || '', data.txtSolda || '', data.txtPintura || '', data.txtMontagem || '',
            data.descricaoPendencia ? data.descricaoPendencia.toUpperCase() : '', data.setorResponsavel, data.usuarioResponsavel,
            data.usuarioCriacao || 'Sistema', nowFormat,
            data.tipoRnc || 'RNC', dtExecFormatada || '', data.titulo || '', data.subTitulo || '',
            data.descProjeto || '', data.origemPendencia || ''
        ].map(p => p === undefined || p === null ? '' : p);

        await conn.execute(sqlInsert, params);

        await conn.commit();
        res.json({ success: true, message: 'Pend�ncia gerada com sucesso!' });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[POST /api/producao/pendencia] Error:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar pend�ncia.' });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/producao/pendencias/historico - Listar pend�ncias vinculadas a um item (por CodMatFabricante)
app.get('/api/producao/pendencias/historico', async (req, res) => {
    console.log('[DEBUG] GET /historico - REACHED ROUTE!');
    try {
        const codMat = req.query.codMatFabricante;
        const q1 = req.query.q1;
        const q2 = req.query.q2;

        let sql = `
            SELECT 
                IdOrdemServicoItemPendencia as IDRNC,
                Estatus as ST,
                CodMatFabricante,
                IdOrdemServico,
                IdOrdemservicoItem as IdOrdemServicoItem,
                Projeto,
                Tag,
                DescResumo,
                DescDetal,
                Espessura,
                MaterialSW,
                DescricaoPendencia,
                UsuarioResponsavel,
                UsuarioResponsavel as Colaborador,
                SetorResponsavel,
                SetorResponsavelFinalizacao,
                FinalizadoPorUsuarioSetor,
                DataFinalizacao,
                DescricaoFinalizacao,
                DataCriacao as DataCriacao,
                DataExecucao as DataExecucao
            FROM ordemservicoitempendencia
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
              AND TipoRegistro = 'RNC'
        `;

        const params = [];

        if (codMat) {
            sql += ` AND CodMatFabricante = ? `;
            params.push(codMat);
        } else {
            return res.json({ success: true, data: [] });
        }

        if (q1) {
            sql += ` AND DescricaoPendencia LIKE ? `;
            params.push(`%${q1}%`);
        }

        if (q2) {
            sql += ` AND DescricaoPendencia LIKE ? `;
            params.push(`%${q2}%`);
        }

        sql += ` ORDER BY IdOrdemServicoItemPendencia DESC `;

        console.log('[DEBUG] GET /historico - sql:', sql);
        console.log('[DEBUG] GET /historico - params:', params);

        const [rows] = await pool.execute(sql, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching RNC history:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar hist�rico' });
    }
});

// POST /api/producao/reposicao - Gerar Reposi��o
app.post('/api/producao/reposicao', async (req, res) => {
    console.log('[POST /api/producao/reposicao] req.body chamado com:', req.body);
    const { idOrdemServicoItem, qtdeReposicao, motivo, usuario } = req.body;

    if (!idOrdemServicoItem || !qtdeReposicao || qtdeReposicao <= 0) {
        return res.status(400).json({ success: false, message: 'ID do item e quantidade v�lida s�o obrigat�rios.' });
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const nowFormat = getCurrentDateTimeBR();

        // 1. Obter dados do item pai original
        const [itemRows] = await conn.execute(
            `SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`,
            [idOrdemServicoItem]
        );

        if (itemRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item original n�o encontrado.' });
        }

        const itemPai = itemRows[0];
        const qtdeAtualReposicao = Number(itemPai.QtdeReposicao) || 0;
        const novaQtdeReposicao = qtdeAtualReposicao + Number(qtdeReposicao);

        // 2. Atualizar quantidade de reposi��o no item pai original
        await conn.execute(
            `UPDATE ordemservicoitem SET QtdeReposicao = ? WHERE IdOrdemServicoItem = ?`,
            [novaQtdeReposicao, idOrdemServicoItem].map(p => p === undefined ? '' : p)
        );

        // 3. Preparar inser��o do Item de Reposi��o Pai
        // Clonar dados do pai ajustando QtdeTotal, Reposicao e campos de status
        const pesoOriginal = parseFloat(itemPai.Peso?.toString().replace(',', '.') || '0');
        // Peso original da pe�a ou proporcional - VB.NET usa PesoUnitario * entrada. Mas QtdeTotal original do BD j� armazena Qtde do pai.
        // Vamos usar o PesoUnitario calculado se existir ou proporcional.

        let pesoUnitario = parseFloat(itemPai.PesoUnitario?.toString().replace(',', '.') || '0');
        if (pesoUnitario === 0 && Number(itemPai.QtdeTotal) > 0) {
            pesoUnitario = pesoOriginal / Number(itemPai.QtdeTotal);
        }

        const novoQtdeTotal = Number(qtdeReposicao);
        const novoPesoTotal = pesoUnitario * novoQtdeTotal;
        const novoAreaPinturaUnitario = parseFloat(itemPai.AreaPinturaUnitario?.toString().replace(',', '.') || '0');
        const novaAreaPinturaTotal = novoAreaPinturaUnitario * novoQtdeTotal;

        // Limpar status de execu��o dos diversos setores conforme o VB
        const sqlInsertPai = `
            INSERT INTO ordemservicoitem (
                IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag,
                IdMaterial, DescResumo, DescDetal, Autor, Palavrachave, Notas,
                Espessura, AreaPintura, NumeroDobras, Peso, Unidade, UnidadeSW, ValorSW,
                Altura, Largura, CodMatFabricante, UsuarioCriacao, EnderecoArquivo, MaterialSW,
                QtdeTotal, CriadoPor, DataCriacao, Fator, qtde, txtSoldagem, txtTipoDesenho,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem,
                CorteTotalExecutar, DobraTotalExecutar, SoldaTotalExecutar, PinturaTotalExecutar, MontagemTotalExecutar,
                Comprimentocaixadelimitadora, Larguracaixadelimitadora, Espessuracaixadelimitadora,
                AreaPinturaUnitario, PesoUnitario, txtItemEstoque, DataPrevisao,
                Liberado_Engenharia, DATA_LIBERACAO_ENGENHARIA, ProdutoPrincipal,
                IdEmpresa, DescEmpresa, NumeroOpOmie,
                Reposicao, IdOrdemservicoReposicao, IdOrdemservicoItemReposicao, MotivoReposicao
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                0, 0, 0, 0, 0,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                'S', ?, ?, ?
            )
        `;

        const paramsInsertPai = [
            itemPai.IdOrdemServico, itemPai.IdProjeto, itemPai.Projeto, itemPai.IdTag, itemPai.Tag, itemPai.DescTag,
            itemPai.IdMaterial, itemPai.DescResumo, itemPai.DescDetal, itemPai.Autor, itemPai.Palavrachave, itemPai.Notas,
            itemPai.Espessura, novaAreaPinturaTotal, itemPai.NumeroDobras, novoPesoTotal, itemPai.Unidade, itemPai.UnidadeSW, itemPai.ValorSW,
            itemPai.Altura, itemPai.Largura, itemPai.CodMatFabricante, usuario || 'Sistema', itemPai.EnderecoArquivo, itemPai.MaterialSW,
            novoQtdeTotal, usuario || 'Sistema', nowFormat, itemPai.Fator, novoQtdeTotal, itemPai.txtSoldagem, itemPai.txtTipoDesenho,
            itemPai.txtCorte, itemPai.txtDobra, itemPai.txtSolda, itemPai.txtPintura, itemPai.TxtMontagem,
            itemPai.Comprimentocaixadelimitadora, itemPai.Larguracaixadelimitadora, itemPai.Espessuracaixadelimitadora,
            itemPai.AreaPinturaUnitario, itemPai.PesoUnitario, itemPai.txtItemEstoque, itemPai.DataPrevisao,
            itemPai.Liberado_Engenharia, itemPai.DATA_LIBERACAO_ENGENHARIA, itemPai.ProdutoPrincipal,
            itemPai.IdEmpresa, itemPai.DescEmpresa, itemPai.NumeroOpOmie,
            itemPai.IdOrdemServico, idOrdemServicoItem, motivo || ''
        ].map(p => p === undefined ? '' : p);

        const [resultInsertPai] = await conn.execute(sqlInsertPai, paramsInsertPai);
        const novoIdPai = resultInsertPai.insertId;

        console.log(`[Reposicao] Cadastrado Novo Item Pai ${novoIdPai} para OS ${itemPai.IdOrdemServico}`);

        // 4. Se for conjunto (ex: .SLDASM), processar os itens filhos a partir de viewmontapeca
        const arquivoPaiCaps = (itemPai.EnderecoArquivo || '').toUpperCase();
        if (arquivoPaiCaps.includes('.SLDASM') || itemPai.Unidade === 'CONJ') {
            const codMat = itemPai.CodMatFabricante;

            if (codMat) {
                const [filhosRows] = await conn.execute(
                    `SELECT * FROM viewmontapeca WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND NomeArquivoSemExtensao = ?`,
                    [codMat]
                );

                console.log(`[Reposicao] Encontrados ${filhosRows.length} itens filhos(viewmontapeca) para o pai ${codMat}`);

                for (const filho of filhosRows) {
                    const pecaQtde = parseFloat(filho.PecaQtde?.toString().replace(',', '.') || '0');
                    const filhoQtdeTotal = novoQtdeTotal * pecaQtde;

                    let filhoPesoUnitario = parseFloat(filho.Peso?.toString().replace(',', '.') || '0');
                    const filhoPesoTotal = filhoPesoUnitario * filhoQtdeTotal;

                    const sqlInsertFilho = `
                        INSERT INTO ordemservicoitem (
                            IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag,
                            DescDetal, Peso, Unidade, CodMatFabricante, UsuarioCriacao, 
                            QtdeTotal, CriadoPor, DataCriacao, Fator, qtde, txtTipoDesenho,
                            PesoUnitario, DataPrevisao, Liberado_Engenharia, DATA_LIBERACAO_ENGENHARIA,
                            IdEmpresa, DescEmpresa, NumeroOpOmie
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?
                        )
                    `;

                    const paramsFilho = [
                        itemPai.IdOrdemServico, itemPai.IdProjeto, itemPai.Projeto, itemPai.IdTag, itemPai.Tag, itemPai.DescTag,
                        filho.DescDetal, filhoPesoTotal, filho.Unidade, filho.CodMatFabricante, usuario || 'Sistema',
                        filhoQtdeTotal, usuario || 'Sistema', nowFormat, itemPai.Fator, pecaQtde, 'MATERIAL',
                        filhoPesoUnitario, itemPai.DataPrevisao, itemPai.Liberado_Engenharia, itemPai.DATA_LIBERACAO_ENGENHARIA,
                        itemPai.IdEmpresa, itemPai.DescEmpresa, itemPai.NumeroOpOmie
                    ].map(p => p === undefined ? '' : p);

                    await conn.execute(sqlInsertFilho, paramsFilho);
                }
            }
        }

        // Criar a pendencia para o item na rotina do VB.NET 
        // MontarPendenciaReposicao(dgvItemOrdemservico)
        // Optamos por simular o log m�nimo na ordemservicoitempendencia ou ordemservicoitemcontrole
        await conn.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor, DataCriacao, D_E_L_E_T_E, DescricaoEstorno
            ) VALUES (?, ?, 'Reposicao', ?, ?, ?, '', 'GEROU REPOSICAO')`,
            [idOrdemServicoItem, itemPai.IdOrdemServico, novoQtdeTotal, usuario || 'Sistema', nowFormat].map(p => p === undefined ? '' : p)
        );

        await conn.commit();
        res.json({ success: true, message: `Reposi��o gerada com sucesso! ${novoQtdeTotal} itens clonados para a nova reposi��o.` });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[API] Error in POST /api/producao/reposicao:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar reposi��o: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

// Configura��o - UPDATE
app.put('/api/config', async (req, res) => {
    const { restringirApontamento, processosVisiveis } = req.body; // processosVisiveis as JSON string
    try {
        // Check if row exists
        const [rows] = await pool.execute('SELECT id FROM configuracaosistema LIMIT 1');

        if (rows.length > 0) {
            await pool.execute('UPDATE configuracaosistema SET RestringirApontamentoSemSaldoAnterior = ?, ProcessosVisiveis = ? WHERE id = ?', [restringirApontamento, processosVisiveis, rows[0].id]);
        } else {
            await pool.execute('INSERT INTO configuracaosistema (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis) VALUES (?, ?)', [restringirApontamento, processosVisiveis]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar configura��es' });
    }
});

// MENU CONFIGURATION
// GET Menu Structure
app.get('/api/config/menu', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT MenuStructure FROM configuracaosistema LIMIT 1');
        if (rows.length > 0 && rows[0].MenuStructure) {
            // Check if string is valid JSON
            try {
                const menu = JSON.parse(rows[0].MenuStructure);
                res.json({ success: true, menu });
            } catch (e) {
                res.json({ success: true, menu: null });
            }
        } else {
            res.json({ success: true, menu: null }); // Frontend uses default
        }
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar menu' });
    }
});


// SAVE Menu Structure
app.post('/api/config/menu', async (req, res) => {
    const { menu } = req.body;
    try {
        const menuJson = JSON.stringify(menu);
        const [rows] = await pool.execute('SELECT id FROM configuracaosistema LIMIT 1');
        if (rows.length > 0) {
            await pool.execute('UPDATE configuracaosistema SET MenuStructure = ? WHERE id = ?', [menuJson, rows[0].id]);
        } else {
            await pool.execute('INSERT INTO configuracaosistema (MenuStructure) VALUES (?)', [menuJson]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Menu save error:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar menu' });
    }
});

// --- CRUD: Usu�rios ---

// LIST Users
app.get('/api/usuario', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status 
            FROM usuario 
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' 
            ORDER BY NomeCompleto
            `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usu�rios' });
    }
});

// GET ONE User
app.get('/api/usuario/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT idUsuario, NomeCompleto, Login, Senha, TipoUsuario, email, status FROM usuario WHERE idUsuario = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usu�rio n�o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usu�rio' });
    }
});

// CREATE User
app.post('/api/usuario', async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario } = req.body;

    if (!NomeCompleto || !Login || !Senha || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login, Senha e Tipo s�o obrigat�rios' });
    }

    try {
        // Check if login exists
        const [existing] = await pool.execute('SELECT idUsuario FROM usuario WHERE Login = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = "")', [Login]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Login j� existe' });
        }

        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO usuario (NomeCompleto, Login, Senha, TipoUsuario, DataCadastro, CriadoPor, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [NomeCompleto.trim(), Login.trim(), Senha, TipoUsuario, now, 'Sistema', 'A']
        );
        res.json({ success: true, message: 'Usu�rio cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar usu�rio' });
    }
});

// UPDATE User
app.put('/api/usuario/:id', async (req, res) => {
    const id = req.params.id;
    const { NomeCompleto, Login, Senha, TipoUsuario } = req.body;

    if (!NomeCompleto || !Login || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Tipo s�o obrigat�rios' });
    }

    try {
        const updates = [
            'NomeCompleto = ?',
            'Login = ?',
            'TipoUsuario = ?'
        ];
        const values = [NomeCompleto.trim(), Login.trim(), TipoUsuario];

        // Only update password if provided
        if (Senha && Senha.trim() !== '') {
            updates.push('Senha = ?');
            values.push(Senha);
        }

        values.push(id);

        await pool.execute(
            `UPDATE usuario SET ${updates.join(', ')} WHERE idUsuario = ? `,
            values
        );
        res.json({ success: true, message: 'Usu�rio atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usu�rio' });
    }
});

// DELETE User (Soft)
app.delete('/api/usuario/:id', async (req, res) => {
    try {
        const now = getCurrentDateTimeBR();
        await pool.execute(
            "UPDATE usuario SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = 'Sistema' WHERE idUsuario = ?",
            [now, req.params.id]
        );
        res.json({ success: true, message: 'Usu�rio exclu�do' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usu�rio' });
    }
});

// --- RNC / PEND�NCIA ROMANEIO ---

// GET /api/rnc/sectors - List all sectors from dedicated table
app.get('/api/rnc/sectors', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT DISTINCT Setor FROM setor WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY Setor"
        );
        res.json({ success: true, data: rows.map(r => r.Setor) });
    } catch (error) {
        console.error('Error fetching RNC sectors:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar setores' });
    }
});

// GET /api/config/espessuras - List all espessuras
app.get('/api/config/espessuras', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT idEspessura, Espessura FROM espessura ORDER BY Espessura ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching espessuras:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar espessuras' });
    }
});

// GET /api/config/materiais - List all materialsw
app.get('/api/config/materiais', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT idMaterialSw, MaterialSw FROM materialsw ORDER BY MaterialSw ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching materiais:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar materiais' });
    }
});

// GET /api/rnc/collaborators - List active collaborators
app.get('/api/rnc/collaborators', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT idUsuario, NomeCompleto, Setor FROM usuario WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY NomeCompleto"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching RNC collaborators:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar colaboradores' });
    }
});

// GET /api/rnc/task-types - List task types from dedicated table
app.get('/api/rnc/task-types', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT DISTINCT TipoTarefa FROM tipotarefa WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND TipoTarefa IS NOT NULL AND TipoTarefa != '' ORDER BY TipoTarefa"
        );
        res.json({ success: true, data: rows.map(r => r.TipoTarefa) });
    } catch (error) {
        console.error('Error fetching RNC task types:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tipos de tarefa' });
    }
});

// GET /api/rnc/item-data/:idRomaneioItem - Get header data for initial load
app.get('/api/rnc/item-data/:idRomaneioItem', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
v.IdRomaneioItem,
            v.IDOrdemServicoITEM as IdOrdemServicoItem,
            v.IDOrdemServico as IdOrdemServico,
            v.IdRomaneio as IdRomaneio,
            v.IdMaterial as IdMaterial,
            v.DescResumo as DescResumo,
            v.DescDetal as DescDetal,
            v.CodMatFabricante as CodMatFabricante,
            v.Espessura as Espessura,
            v.MaterialSW as MaterialSW,
            v.idProjeto as IdProjeto,
            v.PROJETO as Projeto,
            v.IdTag as IdTag,
            v.TAG as Tag,
            v.DescTag as DescTag,
            v.IdEmpresa as IdEmpresa,
            v.DescEmpresa as DescEmpresa,
            r.Descricao as DescricaoRomaneio,
            p.DescProjeto as DescProjeto,
            'PENDENCIA' as Estatus,
            '' as DescricaoPendencia,
            'ROMANEIO' as OrigemPendencia
            FROM viewromaneioitem v
            LEFT JOIN romaneio r ON v.IdRomaneio = r.idRomaneio
            LEFT JOIN projetos p ON v.idProjeto = p.IdProjeto
            WHERE v.IdRomaneioItem = ?
            `, [req.params.idRomaneioItem]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item do romaneio n�o encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching RNC item context:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contexto do item' });
    }
});

// GET /api/rnc/list/:idRomaneioItem - List existing pendencies (Global or specific)
app.get('/api/rnc/list/:idRomaneioItem', async (req, res) => {
    const { showFinalized, q1, q2 } = req.query;

    // GLOBAL QUERY as requested by user - removing join with viewromaneioitem
    let sql = `
        SELECT v.* FROM viewordemservicoitempendencia v
WHERE(v.D_E_L_E_T_E IS NULL OR v.D_E_L_E_T_E = '') 
        AND v.OrigemPendencia = 'ROMANEIO' 
        AND v.TipoRegistro = 'RNC'
            `;
    const params = [];

    if (showFinalized !== 'true') {
        sql += " AND v.Estatus = 'PENDENCIA' ";
    }

    if (q1) {
        sql += " AND v.DescricaoPendencia LIKE ? ";
        params.push(`%${q1}%`);
    }
    if (q2) {
        sql += " AND v.DescricaoPendencia LIKE ? ";
        params.push(`%${q2}%`);
    }

    sql += " ORDER BY v.IdOrdemServicoItemPendencia DESC ";

    try {
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error listing RNCs:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar pend�ncias' });
    }
});

// POST /api/rnc - Save Pendency (RNC) with complex logic from VB.NET
app.post('/api/rnc', async (req, res) => {
    const data = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Check if finalized (if ID provided)
        if (data.idOrdemServicoItemPendencia) {
            const [check] = await connection.execute(
                "SELECT Estatus FROM ordemservicoitempendencia WHERE idOrdemServicoItemPendencia = ?",
                [data.idOrdemServicoItemPendencia]
            );
            if (check.length > 0 && check[0].Estatus === 'FINALIZADA') {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Pend�ncia j� Finalizada!' });
            }
        }

        // 2. Validate mandatory Sector
        if (!data.setorResponsavel) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Informe Setor Respons�vel pela Pend�ncia!' });
        }

        const nowFormatted = getCurrentDateTimeBR();

        console.log('Current Time Formatted:', nowFormatted);

        // Format DataExecucao if present (Only Date)
        // Format DataExecucao if present (Only Date)
        if (data.dataExecucao) {
            const parts = data.dataExecucao.split('-');
            if (parts.length === 3) {
                dataExecucaoFormatted = `${parts[2]} / ${parts[1]} / ${parts[0]} `;
            } else {
                // Try to split by space if it has time and take first part
                dataExecucaoFormatted = data.dataExecucao.split(' ')[0];
            }
        }

        // Force Uppercase
        const descricaoPendenciaUpper = (data.descricaoPendencia || '').toUpperCase();
        const origemPendenciaUpper = (data.origemPendencia || 'ROMANEIO').toUpperCase();

        // 3. Auto-Save New Task Type if it doesn't exist (Runs for both INSERT and UPDATE)
        if (data.tipoTarefa) {
            console.log('Checking task type:', data.tipoTarefa);
            const [existingTask] = await connection.execute(
                "SELECT TipoTarefa FROM tipotarefa WHERE TipoTarefa = ?",
                [data.tipoTarefa]
            );

            if (existingTask.length === 0) {
                // Insert new task type
                await connection.execute(
                    "INSERT INTO tipotarefa (TipoTarefa, DataCriacao, CriadoPor) VALUES (?, ?, ?)",
                    [data.tipoTarefa, nowFormatted, data.usuario || 'Sistema']
                );
            }

        }

        if (!data.idOrdemServicoItemPendencia) {
            // --- NEW PENDENCY Logic ---

            // Clear UltimaPendencia for this Fabricante
            await connection.execute(
                "UPDATE ordemservicoitempendencia SET UltimaPendencia = '' WHERE CodMatFabricante = ?",
                [data.codMatFabricante || '']
            );

            const sql = `
                INSERT INTO ordemservicoitempendencia(
                IdOrdemServicoItem, IdOrdemServico, IdRomaneio, Romaneio, IdPlanodeCorte,
                IdMaterial, DescResumo, DescDetal, DescricaoPendencia, Usuario,
                CodMatFabricante, Espessura, MaterialSW, DataCriacao, Estatus,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem,
                IdProjeto, Projeto, IdTag, Tag, UltimaPendencia,
                CriadoPorSetor, Situacao, SetorResponsavel, TipoCadastro, DataExecucao,
                controleenvioemail, emailresponsavelpelatarefa, idusuarioresponsavel, TipoTarefa, UsuarioResponsavel,
                TipoRegistro, DescProjeto, DescTag, DescEmpresa, OrigemPendencia
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                data.idOrdemServicoItem, data.idOrdemServico, data.idRomaneio, data.romaneio, '',
                data.idMaterial, data.descResumo || '', data.descDetal || '', descricaoPendenciaUpper, data.usuario || 'Sistema',
                data.codMatFabricante || '', data.espessura || '', data.materialSW || '', nowFormatted, 'PENDENCIA',
                '', '', '', '', '',
                data.idProjeto, data.projeto || '', data.idTag, data.tag || '', 'S',
                data.criadoPorSetor || '', '', data.setorResponsavel || '', 'RNC', dataExecucaoFormatted || '',
                '', '', data.idUsuarioResponsavel, data.tipoTarefa || '', data.usuarioResponsavel || '',
                'RNC', data.descProjeto || '', data.descTag || '', data.descEmpresa || '', origemPendenciaUpper
            ];

            await connection.execute(sql, params);

            // --- UPDATE TOTALS (New RNCs Only) ---
            // 1. Update OrdemServico (verified columns exist)
            if (data.idOrdemServico) {
                await connection.execute(
                    "UPDATE ordemservico SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdOrdemServico = ?",
                    [data.idOrdemServico]
                );
            }

            // 2. Update Tags (verified columns exist)
            if (data.idTag) {
                await connection.execute(
                    "UPDATE tags SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdTag = ?",
                    [data.idTag]
                );
            }

            // 3. Update Projetos (verified columns exist - qtderncPendente camelCase)
            if (data.idProjeto) {
                await connection.execute(
                    "UPDATE projetos SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ?",
                    [data.idProjeto]
                );
            }

        } else {
            // --- UPDATE PENDENCY Logic ---
            const sql = `
                UPDATE ordemservicoitempendencia SET
DescricaoPendencia = ?, SetorResponsavel = ?, TipoCadastro = ?, TipoTarefa = ?,
            DataExecucao = ?, UsuarioResponsavel = ?, IdUsuarioResponsavel = ?,
            emailresponsavelpelatarefa = ?, OrigemPendencia = ?,
            Espessura = ?, MaterialSW = ?
                WHERE idOrdemServicoItemPendencia = ?
                    `;
            const params = [
                descricaoPendenciaUpper, data.setorResponsavel || '', 'RNC', data.tipoTarefa || '',
                dataExecucaoFormatted || '', data.usuarioResponsavel || '', data.idUsuarioResponsavel,
                data.emailResponsavel || '', origemPendenciaUpper,
                data.espessura || '', data.materialSW || '',
                data.idOrdemServicoItemPendencia
            ];
            await connection.execute(sql, params);
        }



        await connection.commit();
        res.json({ success: true, message: 'Processo concludo!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error saving RNC:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar RNC: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/rnc/finalizar - Finaliza Pendncia e Decrementa Contadores
app.post('/api/rnc/finalizar', async (req, res) => {
    const { idOrdemServicoItemPendencia, usuario, setor } = req.body;
    const connection = await pool.getConnection();

    if (!idOrdemServicoItemPendencia) {
        return res.status(400).json({ success: false, message: 'ID da pendncia  obrigatrio' });
    }

    try {
        await connection.beginTransaction();

        // 1. Get Pendency Details to verify and get IDs for decrement
        const [pendencyRows] = await connection.execute(
            "SELECT IdOrdemServico, IdTag, IdProjeto, Estatus FROM ordemservicoitempendencia WHERE IdOrdemServicoItemPendencia = ?",
            [idOrdemServicoItemPendencia]
        );

        if (pendencyRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Pendncia no encontrada' });
        }

        const pendency = pendencyRows[0];

        if (pendency.Estatus === 'FINALIZADA') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Pendncia j est finalizada' });
        }

        const nowFormatted = getCurrentDateTimeBR();

        const descricaoFinalizacao = req.body.descricao || 'FINALIZAO FEITA PELO SISTEMA';

        // 3. Update Pendency Status
        await connection.execute(`
            UPDATE ordemservicoitempendencia SET
Estatus = 'FINALIZADA',
            Situacao = 'CONCLUIDA',
            FinalizadoPorUsuarioSetor = ?,
            SetorResponsavelFinalizacao = ?,
            DataAcertoProjeto = ?,
            DescricaoFinalizacao = ?
                WHERE IdOrdemServicoItemPendencia = ?
                    `, [usuario || 'Sistema', setor || '', nowFormatted, descricaoFinalizacao, idOrdemServicoItemPendencia]);

        // 4. Decrement Counters (qtderncPendente) in related tables
        // OrdemServico
        if (pendency.IdOrdemServico) {
            await connection.execute(
                "UPDATE ordemservico SET qtderncPendente = IF(qtderncPendente > 0, qtderncPendente - 1, 0) WHERE IdOrdemServico = ?",
                [pendency.IdOrdemServico]
            );
        }

        // Tags
        if (pendency.IdTag) {
            await connection.execute(
                "UPDATE tags SET qtderncPendente = IF(qtderncPendente > 0, qtderncPendente - 1, 0) WHERE IdTag = ?",
                [pendency.IdTag]
            );
        }

        // Projetos (Note: qtderncPendente camelCase)
        if (pendency.IdProjeto) {
            await connection.execute(
                "UPDATE projetos SET qtderncPendente = IF(qtderncPendente > 0, qtderncPendente - 1, 0) WHERE IdProjeto = ?",
                [pendency.IdProjeto]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Pendncia finalizada com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error finalizing RNC:', error);
        res.status(500).json({ success: false, message: 'Erro ao finalizar RNC: ' + error.message });
    } finally {
        if (connection) connection.release();
    }
});

// --- SYSTEM UTILITIES ---
app.post('/api/system/open-folder', async (req, res) => {
    const { path: folderPath } = req.body;

    if (!folderPath) {
        return res.status(400).json({ success: false, message: 'Path is required' });
    }

    console.log(`[SYSTEM] Request to open folder: ${folderPath} `);

    // Basic security check (optional: restrict to specific drives or patterns if needed)
    // For this internal app, we allow it but log it.

    require('child_process').exec(`start "" "${folderPath}"`, (error) => {
        if (error) {
            console.error(`[SYSTEM] Error opening folder: ${error.message} `);
            return res.status(500).json({ success: false, message: 'Failed to open folder' });
        }
        res.json({ success: true, message: 'Folder opened successfully' });
    });
});

// --- SUPERADMIN MODULE (Continued) ---


app.get('/api/admin/check-auth', authenticateAdmin, (req, res) => {
    res.json({ success: true, user: { role: 'superadmin' } });
});

// DB Management Routes
app.post('/api/admin/db/test', authenticateAdmin, async (req, res) => {
    const config = req.body;
    try {
        const success = await pool.testConnection(config);
        if (success) {
            res.json({ success: true, message: 'Conex�o bem-sucedida! O banco de dados est� acess�vel.' });
        } else {
            res.status(400).json({ success: false, message: 'Falha na conex�o. Verifique os dados.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao conectar: ' + error.message });
    }
});

app.post('/api/admin/db/save', authenticateAdmin, async (req, res) => {
    const newConfig = req.body; // { host, user, password, database, port }

    try {
        // 1. Update runtime pool
        const initialized = pool.initPool(newConfig);
        if (!initialized) {
            throw new Error('Falha ao inicializar o pool com as novas configura��es.');
        }

        // 2. Update .env file persistently
        const envPath = path.join(__dirname, '../.env');
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        const keysToUpdate = {
            DB_HOST: newConfig.host,
            DB_USER: newConfig.user,
            DB_PASSWORD: newConfig.password,
            DB_NAME: newConfig.database,
            DB_PORT: newConfig.port
        };

        let lines = envContent.split('\n');
        const newLines = [];
        const processedKeys = new Set(); // Track keys we have added from existing file

        // Process existing lines
        lines.forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                if (keysToUpdate[key] !== undefined) {
                    newLines.push(`${key} = ${keysToUpdate[key]} `);
                    processedKeys.add(key);
                } else {
                    newLines.push(line);
                    processedKeys.add(key);
                }
            } else {
                newLines.push(line);
            }
        });

        // Append missing keys
        Object.keys(keysToUpdate).forEach(key => {
            if (!processedKeys.has(key)) {
                if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
                    newLines.push('');
                }
                newLines.push(`${key} = ${keysToUpdate[key]} `);
            }
        });

        fs.writeFileSync(envPath, newLines.join('\n'));
        console.log('[API] .env file updated with new DB config');

        res.json({ success: true, message: 'Configura��o salva e aplicada com sucesso!' });

    } catch (error) {
        console.error('Error saving DB config:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configura��o: ' + error.message });
    }
});

// ============================================================================
// CONTROLE DE EXPEDIÇÃO
// ============================================================================

app.get('/api/controle-expedicao', async (req, res) => {
    try {
        const { projeto, tag, descTag, empresa, codmat, descResumo, dataPrevisaoInicio, dataPrevisaoFim, concluidos } = req.query;
        let query = "SELECT IdProjeto, Projeto, DescEmpresa, Tag, DescTag, codmatfabricante, DataPrevisao, QtdeTotal, PesoUnitario, MontagemTotalExecutado, TotalExpedicao, Comprimento, Profundidade, Largura, descresumo, descdetal, RealizadoInicioExpedicao, RealizadoFinalExpedicao, IdTag, Idordemservico, IdOrdemServicoItem, Finalizadotag, FinalizadoProjeto, OrdemServicoItemFinalizado, enderecoarquivo, ProdutoPrincipal FROM viewcontroleexpedicao WHERE 1=1";
        const queryParams = [];

        if (projeto) { query += " AND Projeto LIKE ?"; queryParams.push(`%${projeto}%`); }
        if (tag) { query += " AND Tag LIKE ?"; queryParams.push(`%${tag}%`); }
        if (descTag) { query += " AND DescTag LIKE ?"; queryParams.push(`%${descTag}%`); }
        if (empresa) { query += " AND DescEmpresa LIKE ?"; queryParams.push(`%${empresa}%`); }
        if (codmat) { query += " AND codmatfabricante LIKE ?"; queryParams.push(`%${codmat}%`); }
        if (descResumo) { query += " AND DescResumo LIKE ?"; queryParams.push(`%${descResumo}%`); } 
        
        if (dataPrevisaoInicio && dataPrevisaoFim) {
            query += " AND STR_TO_DATE(DataPrevisao, '%d/%m/%Y') BETWEEN ? AND ?";
            queryParams.push(dataPrevisaoInicio, dataPrevisaoFim);
        } else if (dataPrevisaoInicio) {
            query += " AND STR_TO_DATE(DataPrevisao, '%d/%m/%Y') >= ?";
            queryParams.push(dataPrevisaoInicio);
        } else if (dataPrevisaoFim) {
            query += " AND STR_TO_DATE(DataPrevisao, '%d/%m/%Y') <= ?";
            queryParams.push(dataPrevisaoFim);
        }
        
        if (!concluidos || concluidos !== '1') {
            query += " AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado <> 'C') AND (Finalizadotag IS NULL OR Finalizadotag <> 'C')";
        }

        query += " ORDER BY Projeto ASC, Tag ASC LIMIT 1000";

        const [rows] = await pool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar viewcontroleexpedicao:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ABRIR ARQUIVO GENÉRICO (3D, PDF, etc) - SIMULA PROCESS.START DO VB.NET NO SERVIDOR
app.get('/api/controle-expedicao/abrir-arquivo', (req, res) => {
    try {
        let { caminho, tipo } = req.query;

        if (!caminho) {
            return res.status(400).json({ success: false, message: 'Caminho não informado' });
        }

        if (tipo === 'pdf') {
            const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
            extensoes.forEach(ext => {
                caminho = caminho.replace(ext, ".PDF");
            });
        }

        if (fs.existsSync(caminho)) {
            const { exec } = require('child_process');
            exec(`start "" "${caminho}"`, (error) => {
                if (error) {
                    console.error('Erro ao abrir arquivo:', error);
                    return res.status(500).json({ success: false, message: 'Erro ao executar arquivo' });
                }
                res.json({ success: true, message: 'Arquivo aberto com sucesso' });
            });
        } else {
            res.status(404).json({ success: false, message: 'Arquivo não existe!!' });
        }
    } catch (error) {
        console.error('Erro exception abrir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ABRIR ISOMÉTRICO (Busca caminho no banco e abre)
app.get('/api/controle-expedicao/abrir-iso', async (req, res) => {
    try {
        const { idTag } = req.query;
        if (!idTag) return res.status(400).json({ success: false, message: 'IdTag não informado' });

        const [rows] = await pool.execute("SELECT CaminhoIsometrico FROM tags WHERE idtag = ?", [idTag]);
        
        if (rows.length > 0 && rows[0].CaminhoIsometrico) {
            const endereco = rows[0].CaminhoIsometrico;
            if (fs.existsSync(endereco)) {
                const { exec } = require('child_process');
                exec(`start "" "${endereco}"`, (error) => {
                    if (error) {
                        return res.status(500).json({ success: false, message: 'Erro ao executar isométrico' });
                    }
                    res.json({ success: true, message: 'Isométrico aberto com sucesso' });
                });
            } else {
                res.status(404).json({ success: false, message: 'Arquivo referenciado na base de dados não existe!!' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Nenhum caminho isométrico encontrado para esta Tag.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/controle-expedicao/ordem-item', async (req, res) => {
    try {
        const { idOrdemServico, idOrdemServicoItem, tag, projeto } = req.query;
        let query = `
            SELECT idordemservicoitemControle, IdOrdemServicoITem, IdOrdemServico, Projeto, Tag, 
                   ESTATUS_OrdemServico, CriadoPor, DataCriacao, CodMatFabricante, QtdeTotal, 
                   TotalExpedicao, DescResumo, DescDetal
            FROM viewordemservicoitemcontrole 
            WHERE IdOrdemServicoITem = ? AND IdOrdemServico = ? AND origem = 'EXpedicao'
        `;
        const queryParams = [idOrdemServicoItem, idOrdemServico];
        
        if (tag) {
            query += " AND Tag LIKE ?";
            queryParams.push(`%${tag}%`);
        }
        if (projeto) {
            query += " AND Projeto LIKE ?";
            queryParams.push(`%${projeto}%`);
        }

        const [rows] = await pool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar viewordemservicoitemcontrole:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/controle-expedicao/apontar', async (req, res) => {
    const { idOrdemServicoItem, idOrdemServico, idTag, idProjeto, qtde, qtdeTotalDaLinha } = req.body;
    const qtdeNum = parseFloat(qtde);
    
    // Auth context (if any) or 'Sistema'
    let usuarioLogado = 'Sistema';
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.login) usuarioLogado = decoded.login;
        } catch(e) {}
    }

    if (!idOrdemServicoItem || !qtdeNum || qtdeNum <= 0) {
        return res.status(400).json({ success: false, message: 'Dados inválidos.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const dataAtual = getCurrentDateTimeBR();

        let qtdExpedidaGeral = 0;

        // 4 e 5: a quantidade digitada será acrescida ao campo de total de expedição
        // Se na primeira atualização a data de realizado inicio estiver vazia, atualizar.
        // 6: Se qtde entrada + total expedição == qtde total, atualizar realizado final.

        const tabelas = [
            { 
                nome: 'ordemservicoitem', idCampo: 'IdOrdemServicoItem', idValor: idOrdemServicoItem, campoFinal: 'RealizadofinalExpedicao',
                campoInicio: 'RealizadoInicioExpedicao', campoUserInicio: 'UsuarioRealizadoInicioExpedicao', campoUserFinal: 'UsuarioRealizadoFinalExpedicao', campoTotal: 'TotalExpedicao'
            },
            { 
                nome: 'ordemservico', idCampo: 'IdOrdemServico', idValor: idOrdemServico, campoFinal: 'RealizadoFinalExpedicao',
                campoInicio: 'RealizadoInicioExpedicao', campoUserInicio: 'UsuarioRealizadoInicioExpedicao', campoUserFinal: 'UsuarioRealizadoFinalExpedicao', campoTotal: 'TotalExpedicao'
            },
            { 
                nome: 'tags', idCampo: 'IdTag', idValor: idTag, campoFinal: 'realizadoFinalExpedicao',
                campoInicio: 'RealizadoInicioExpedicao', campoUserInicio: 'UsuarioRealizadoInicioExpedicao', campoUserFinal: 'UsuarioRealizadoFinalExpedicao', campoTotal: 'TotalExpedicao'
            },
            { 
                nome: 'projetos', idCampo: 'IdProjeto', idValor: idProjeto, campoFinal: 'RealizadoFinalExpedicao',
                // Projetos have specific case requirements and different user fields for Expedicao
                campoInicio: 'RealizadoInicioExpedicao', campoUserInicio: 'UsuarioRealizadoInicioExpedicao', campoUserFinal: 'UsuarioRealizadoFinalExpedicao', campoTotal: 'TotalExpedicao'
            }
        ];

        for (const t of tabelas) {
            if (!t.idValor) continue;

            const [rows] = await connection.execute(
                `SELECT \`${t.campoTotal}\`, \`${t.campoInicio}\` FROM \`${t.nome}\` WHERE \`${t.idCampo}\` = ?`,
                [t.idValor]
            );

            if (rows.length > 0) {
                const atual = rows[0];
                const totalExpedicaoAnterior = parseFloat(atual[t.campoTotal]) || 0;
                const novoTotal = totalExpedicaoAnterior + qtdeNum;
                
                let updates = [];
                let params = [];

                updates.push(`\`${t.campoTotal}\` = ?`);
                params.push(novoTotal);

                // Set Inicio se vazio
                if (!atual[t.campoInicio] || atual[t.campoInicio].trim() === '') {
                    updates.push(`\`${t.campoInicio}\` = ?`);
                    params.push(dataAtual);
                    updates.push(`\`${t.campoUserInicio}\` = ?`);
                    params.push(usuarioLogado);
                }

                // Check final
                if (novoTotal >= qtdeTotalDaLinha) {
                    updates.push(`\`${t.campoFinal}\` = ?`);
                    params.push(dataAtual);
                    updates.push(`\`${t.campoUserFinal}\` = ?`);
                    params.push(usuarioLogado);
                }

                if (t.nome === 'ordemservicoitem') {
                    qtdExpedidaGeral = novoTotal;
                }

                params.push(t.idValor);

                await connection.execute(
                    `UPDATE \`${t.nome}\` SET ${updates.join(', ')} WHERE \`${t.idCampo}\` = ?`,
                    params
                );
            }
        }

        const qtdFaltante = qtdeTotalDaLinha - qtdExpedidaGeral;
        // 7 etapa: Historico na ordemservicoitemcontrole
        await connection.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServico, IdOrdemServicoItem, QtdeTotal, 
                Processo, Origem, 
                QtdeProduzida, txtMontagem, 
                QtdeFaltante, 
                CriadoPor, DataCriacao, D_E_L_E_T_E
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
            [
                idOrdemServico, idOrdemServicoItem, qtdeTotalDaLinha,
                'EXPEDICAO', 'EXPEDICAO', // OrigemPendencia
                qtdeNum, // MontagemTotalExecutado = entrada
                String(qtdeNum),
                qtdFaltante < 0 ? 0 : qtdFaltante, // MontagemTotalExecutar
                usuarioLogado, dataAtual
            ]
        );

        await connection.commit();
        res.json({ success: true, message: 'Apontamento registrado com sucesso.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao apontar expedição:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar.' });
    } finally {
        if (connection) connection.release();
    }
});

// Exportar Tarefas / PCP Excel
app.post('/api/tarefas/exportar-excel', async (req, res) => {
    try {
        const { tarefas, usuario } = req.body;
        
        // 1. Buscar Caminhos e Template
        const [configRows] = await pool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelRelatorios'"
        );
        const templatePath = configRows.length > 0 ? configRows[0].valor : null;

        if (!templatePath || !fs.existsSync(templatePath)) {
            console.warn(`[Excel] Planilha template não encontrada: ${templatePath}`);
            return res.status(400).json({ success: false, message: 'A planilha template não foi encontrada no caminho configurado.' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1); // Pega a primeira aba
        
        // Cabeçalho (BH2 = Data, BH3 = Usuario)
        const nowFormatted = new Date().toLocaleDateString('pt-BR');
        worksheet.getCell('BH2').value = nowFormatted;
        worksheet.getCell('BH3').value = usuario || 'Sistema';

        // Linha 12 tem a formatação base, copiamos os valores a partir da linha 13
        tarefas.forEach((t, idx) => {
            const rowIdx = idx + 13;
            worksheet.getCell(`A${rowIdx}`).value = (t.idRnc || '').toString().trim().toUpperCase();
            worksheet.getCell(`F${rowIdx}`).value = (t.projeto || '').toString().trim().toUpperCase();
            worksheet.getCell(`K${rowIdx}`).value = (t.cliente || '').toString().trim().toUpperCase();
            worksheet.getCell(`R${rowIdx}`).value = (t.tag || '').toString().trim().toUpperCase();
            worksheet.getCell(`W${rowIdx}`).value = (t.descTag || '').toString().trim().toUpperCase();
            worksheet.getCell(`AF${rowIdx}`).value = (t.tipoTarefa || '').toString().trim().toUpperCase();
            worksheet.getCell(`AH${rowIdx}`).value = (t.descricao || '').toString().trim().toUpperCase();
            
            // Formatando a data
            let dataExec = t.dataExecucao || '';
            if (dataExec && typeof dataExec === 'string' && dataExec.includes('T')) {
                const parts = dataExec.split('T')[0].split('-');
                if (parts.length === 3) dataExec = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            worksheet.getCell(`AW${rowIdx}`).value = dataExec.trim().toUpperCase();
            worksheet.getCell(`BD${rowIdx}`).value = (t.usuarioResponsavel || '').toString().trim().toUpperCase();
            worksheet.getCell(`BI${rowIdx}`).value = (t.status || '').toString().trim().toUpperCase();
        });

        // Response as stream
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURIComponent('Relatorio_Agendar_TarefaPCP.xlsx'));
        
        await workbook.xlsx.write(res);
        res.end();
        console.log(`[Excel] Relatório de tarefas gerado e baixado (${tarefas?.length || 0} itens)`);

    } catch (error) {
        console.error('[Excel Tarefas] Erro ao exportar:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erro ao gerar relatório Excel: ' + error.message });
        }
    }
});

// Pesquisar Desenho Endpoint
app.get('/api/pesquisar-desenho', async (req, res) => {
    let connection = null;
    try {
        const { projeto, tag, codMat, descResumo, descDetal, espessura, material } = req.query;
        
        // Use connection specific to tenant db if applicable
        connection = await (req.tenantDbPool || pool).getConnection();

        // 1. Fetch Active Sectors
        const [setores] = await connection.execute(
            `SELECT idSetor, Setor, DataLiberada FROM setor WHERE DataLiberada = 'SIM' AND (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL)`
        );
        
        const allowedSectors = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
        
        const setoresAtivos = setores.map(s => {
            // Remove prefix "txt" se presente
            let limpo = s.Setor;
            if (limpo.toLowerCase().startsWith('txt')) {
                limpo = limpo.substring(3);
            }
            return {
                ...s,
                NomeLimpo: limpo,
                colTxt: `txt${limpo}`,
                colSt: `sttxt${limpo}`
            };
        }).filter(s => allowedSectors.includes(s.NomeLimpo.toLowerCase()));

        // 2. Build Base Query
        let query = `
            SELECT Projeto,Tag,IdOrdemServico,IdOrdemServicoItem,idplanodecorte,QtdeTotal,
                 CodMatFabricante,DescResumo,DescDetal,Espessura,MaterialSW,
                 IF(Liberado_Engenharia = 'S' OR Liberado_Engenharia = 'SIM', 'SIM', 'NÃO') AS Liberado_Engenharia,
                 Data_Liberacao_Engenharia,
                 IF(OrdemServicoItemFinalizado = 'C' OR OrdemServicoItemFinalizado = 'SIM' OR OrdemServicoItemFinalizado = 'S', 'SIM', 'NÃO') AS OrdemServicoItemFinalizado,
                 txtCorte,sttxtCorte,txtDobra,sttxtDobra,TxtSolda,sttxtSolda ,
                 txtPintura,sttxtPintura,txtMontagem ,sttxtMOntagem ,replace(EnderecoArquivo,'##','\\\\') as  EnderecoArquivo
        `;

        // 3. Add Sector columns dynamically based on Setor name in DB
        // setoresAtivos.forEach(s => {
        //     query += `, \`${s.colTxt}\`, \`${s.colSt}\``;
        // });

        query += ` FROM ordemservicoitem WHERE D_E_L_E_T_E = ''`;
        const params = [];

        // 4. Filters
        if (projeto) {
            query += ` AND Projeto LIKE ?`;
            params.push(`%${projeto}%`);
        }
        if (tag) {
            query += ` AND Tag LIKE ?`;
            params.push(`%${tag}%`);
        }
        if (codMat) {
            query += ` AND CodMatFabricante LIKE ?`;
            params.push(`%${codMat}%`);
        }
        if (descResumo) {
            query += ` AND DescResumo LIKE ?`;
            params.push(`%${descResumo}%`);
        }
        if (descDetal) {
            query += ` AND DescDetal LIKE ?`;
            params.push(`%${descDetal}%`);
        }
        if (espessura) {
            query += ` AND Espessura LIKE ?`;
            params.push(`%${espessura}%`);
        }
        if (material) {
            query += ` AND MaterialSW LIKE ?`;
            params.push(`%${material}%`);
        }

        query += ` ORDER BY Projeto ASC, Tag ASC LIMIT 500`;

        const [items] = await connection.execute(query, params);

        res.json({
            success: true,
            setores: setoresAtivos,
            data: items
        });

    } catch (err) {
        console.error('Erro na pesquisa de desenho:', err);
        res.status(500).json({ success: false, message: 'Erro ao pesquisar desenhos.' });
    } finally {
        if (connection) connection.release();
    }
});


// Static files and SPA Catch-all (Must be last)
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/img', express.static(path.join(__dirname, '../public/img')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT} and listening on all interfaces(0.0.0.0)`);
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('Failed to connect to database on startup:', err.message);
    }
});
