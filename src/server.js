const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Helper para datas no formato brasileiro (DD/MM/YYYY)
const formatBR = (date = new Date(), includeTime = false) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    if (!includeTime) return `${day}/${month}/${year}`;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'SincoWebSecret2026!KeySecure';

// Middleware
app.use(compression()); // T5: GZIP compression for all responses
app.use(helmet({ contentSecurityPolicy: false })); // T6: Security headers
app.use(express.json({ limit: '10mb' })); // T8: reduced body limit (was 50mb - unrealistic)
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// T10: Rate limiter for login route
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per IP per window
    message: { success: false, message: 'Muitas tentativas. Aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

// LOGGING MIDDLEWARE (dev verbose, prod quiet)
app.use((req, res, next) => {
    const start = Date.now();
    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
        console.log('\n[API] ' + req.method + ' ' + req.url);
        if (Object.keys(req.query).length > 0) {
            console.log('[API]    QUERY: ' + JSON.stringify(req.query));
        }
        if (req.body && Object.keys(req.body).length > 0) {
            const safeBody = { ...req.body };
            Object.keys(safeBody).forEach(key => {
                if (typeof safeBody[key] === 'string' && safeBody[key].length > 200) {
                    safeBody[key] = safeBody[key].substring(0, 50) + '... [TRUNCATED]';
                }
            });
            console.log('[API]    BODY: ' + JSON.stringify(safeBody));
        }
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (isProd) {
            if (duration > 500 || res.statusCode >= 400) {
                console.log('[API] ' + res.statusCode + ' ' + req.method + ' ' + req.url + ' (' + duration + 'ms)');
            }
        } else {
            console.log('[API] ' + res.statusCode + ' (' + duration + 'ms)');
        }
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

// ReposiÃƒÂ§ÃƒÂ£o Routes
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
        console.error('Erro ao buscar itens de reposiÃƒÂ§ÃƒÂ£o:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor ao buscar reposiÃƒÂ§ÃƒÂ£o.' });
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
        const [result] = await pool.query(query, [formatBR(new Date(), true), 'Sistema', id]);
        
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Item excluÃƒÂ­do com sucesso (reposiÃƒÂ§ÃƒÂ£o).' });
        } else {
            res.status(404).json({ success: false, message: 'Item nÃƒÂ£o encontrado ou jÃƒÂ¡ excluÃƒÂ­do.' });
        }
    } catch (error) {
        console.error('Erro ao excluir item de reposiÃƒÂ§ÃƒÂ£o:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor ao excluir reposiÃƒÂ§ÃƒÂ£o.' });
    }
});

app.post('/api/reposicao/apontamento', async (req, res) => {
    let connection;
    try {
        const { IdOrdemServicoItem, quantidadeApontada } = req.body;
        
        if (!IdOrdemServicoItem || !quantidadeApontada || quantidadeApontada <= 0) {
            return res.status(400).json({ success: false, message: 'Dados invÃƒÂ¡lidos para o apontamento.' });
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
            return res.status(404).json({ success: false, message: 'PeÃƒÂ§a de reposiÃƒÂ§ÃƒÂ£o nÃƒÂ£o localizada.' });
        }

        const item = items[0];
        
        if (item.sttxtCorte === 'C') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este item de reposiÃƒÂ§ÃƒÂ£o jÃƒÂ¡ estÃƒÂ¡ concluÃƒÂ­do.' });
        }

        const atualExecutado = Number(item.cortetotalexecutado) || 0;
        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const limiteMaximo = qtdeTotal - atualExecutado;

        if (quantidadeApontada > limiteMaximo) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `A quantidade informada excede o limite restante de reposiÃƒÂ§ÃƒÂ£o (${limiteMaximo}).` });
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
            const descFinalizacao = `RNC AutomÃƒÂ¡tica  - Encerramento do Pedido de ReposiÃƒÂ§ÃƒÂ£o de PeÃƒÂ§a da OS: ${item.IdOrdemServico} Item: ${item.IdOrdemServicoItemReposicao || ''} Concluido , Excluindo da Lista de PendÃƒÂªncia`;
            
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
                usuarioLogado, dataAtual, descFinalizacao, usuarioLogado, 'ProduÃƒÂ§ÃƒÂ£o', item.IdPendenciaReposicao
            ]);
        }

        await connection.commit();
        res.json({ success: true, message: 'PeÃƒÂ§as repostas apontadas com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro na transaction do Apontamento de ReposiÃƒÂ§ÃƒÂ£o:', error);
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
        console.log(`[File] DiretÃ¯Â¿Â½rio limpo: ${diretorio}`);
    } catch (err) {
        console.error(`[File] Erro ao limpar diretÃ¯Â¿Â½rio ${diretorio}:`, err);
    }
};

const ExportarRomaneioExcelPadrao = async (idRomaneio) => {
    try {
        console.log(`[Excel] Iniciando exportaÃ¯Â¿Â½Ã¯Â¿Â½o padrÃ¯Â¿Â½o do Romaneio #${idRomaneio}`);

        // 1. Buscar Caminhos e Template
        const [configRows] = await pool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelRomaneio'"
        );
        const templatePath = configRows.length > 0 ? configRows[0].valor : null;

        const [romRows] = await pool.execute(
            `SELECT * FROM romaneio WHERE idRomaneio = ?`,
            [idRomaneio]
        );
        if (romRows.length === 0) throw new Error('Romaneio nÃ¯Â¿Â½o encontrado');
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
            console.warn(`[Excel] Template nÃ¯Â¿Â½o encontrado em ${templatePath}. Criando novo.`);
            worksheet = workbook.addWorksheet('Romaneio');
        }

        // 4. Preencher CabeÃ¯Â¿Â½alho (PadrÃ¯Â¿Â½o Legado)
        const paddedId = idRomaneio.toString().padStart(5, '0');
        const fullAddress = [
            romData.EnviadoPara,
            `RUA: ${romData.endereco || ''}`,
            `NÃ¯Â¿Â½: ${romData.numero || ''}`,
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

        // 5. Preencher Itens (ComeÃ¯Â¿Â½a na linha 18)
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
            // No ExcelJS nÃ¯Â¿Â½o existe um "CopyRange" direto tÃ¯Â¿Â½o simples, 
            // mas podemos tentar manter os estilos se o template jÃ¯Â¿Â½ tiver a linha formatada.
        });

        // 6. Salvar
        if (!romData.ENDERECORomaneio) {
            throw new Error('DiretÃ¯Â¿Â½rio do Romaneio nÃ¯Â¿Â½o configurado no banco de dados.');
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

        if (rows.length === 0) return res.status(404).send('Romaneio nÃ¯Â¿Â½o encontrado');
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).send('DiretÃ¯Â¿Â½rio de arquivos nÃ¯Â¿Â½o encontrado');
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

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado' });
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).json({ success: false, message: 'DiretÃ¯Â¿Â½rio nÃ¯Â¿Â½o existe no servidor' });
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
            return res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado' });
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
        res.status(500).json({ success: false, message: 'Erro ao buscar itens disponÃ¯Â¿Â½veis.' });
    }
});

// POST /api/romaneio/:id/items - Add items to a Romaneio
app.post('/api/romaneio/:id/items', async (req, res) => {
    const { id } = req.params;
    const { IdOrdemServicoItem, qtde, usuario } = req.body;

    if (!IdOrdemServicoItem || !qtde || qtde <= 0) {
        return res.status(400).json({ success: false, message: 'Dados invÃ¯Â¿Â½lidos para inclusÃ¯Â¿Â½o.' });
    }

    try {
        // 1. Fetch item details and check balance from view
        const [viewRows] = await pool.execute(
            "SELECT * FROM viewitensprojetoemaberto WHERE IdOrdemServicoItem = ?",
            [IdOrdemServicoItem]
        );

        if (viewRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item nÃ¯Â¿Â½o encontrado ou jÃ¯Â¿Â½ finalizado.' });
        }

        const item = viewRows[0];
        const saldoDisponivel = (item.QtdeTotal || 0) - (item.RomaneioTotalEnviado || 0);

        if (qtde > saldoDisponivel) {
            return res.status(400).json({
                success: false,
                message: `Quantidade solicitada (${qtde}) Ã¯Â¿Â½ maior que o saldo disponÃ¯Â¿Â½vel (${saldoDisponivel}).`
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

        // --- ATUALIZAÃ¯Â¿Â½Ã¯Â¿Â½O REQUISITADA: SalvarDados em ordemservicoitemcontrole para 'Expedicao' ---
        // Mapeando os parÃ¯Â¿Â½metros do VB.NET para a inserÃ¯Â¿Â½Ã¯Â¿Â½o:
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

        res.json({ success: true, message: 'Item adicionado ao romaneio com sucesso e controle logado!' });
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
            return res.status(404).json({ success: false, message: 'Arquivo nÃ¯Â¿Â½o associado a este item.' });
        }

        const originalEndereco = rows[0].EnderecoArquivo;
        let endereco = originalEndereco;

        // NormalizaÃ¯Â¿Â½Ã¯Â¿Â½o baseada na lÃ¯Â¿Â½gica VB.NET original
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            endereco = endereco.split(ext).join(".PDF");
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
                message: `Arquivo PDF nÃ¯Â¿Â½o encontrado. Favor verificar se o caminho estÃ¯Â¿Â½ acessÃ¯Â¿Â½vel: ${endereco}`,
                path: endereco
            });
        }
    } catch (error) {
        console.error('[FILES] Fatal error opening PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar solicitaÃ¯Â¿Â½Ã¯Â¿Â½o do desenho.' });
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
            return res.status(404).json({ success: false, message: 'Arquivo nÃ¯Â¿Â½o associado a este item.' });
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
                message: `Arquivo original nÃ¯Â¿Â½o encontrado no servidor: ${endereco}`,
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
    const { usuario } = req.query; // Pega o usuÃ¯Â¿Â½rio da query string ou header se disponÃ¯Â¿Â½vel
    const connection = await pool.getConnection();

    console.log(`[DELETE] Request to delete Item: ${idRomaneioItem} by User: ${usuario}`);

    try {
        await connection.beginTransaction();

        // 1. Validar se o item existe e obter dados bÃ¯Â¿Â½sicos
        const [itemRows] = await connection.execute(
            "SELECT IdRomaneio, IDOrdemServicoITEM, qtdeUsuario FROM romaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (itemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Item nÃ¯Â¿Â½o encontrado.' });
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
            return res.status(400).json({ success: false, message: 'JÃ¯Â¿Â½ existe retorno deste Item, nÃ¯Â¿Â½o pode ser excluÃ¯Â¿Â½do.' });
        }

        // 3. Validar Bloqueio (Status do Romaneio - Liberado)
        const [romaneioRows] = await connection.execute(
            "SELECT Liberado FROM romaneio WHERE idRomaneio = ?",
            [idRomaneio]
        );

        if (romaneioRows.length > 0 && romaneioRows[0].Liberado === 'S') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este Romaneio jÃ¯Â¿Â½ estÃ¯Â¿Â½ Liberado e nÃ¯Â¿Â½o permite exclusÃ¯Â¿Â½o de itens.' });
        }

        // 4. Soft Delete do Item
        await connection.execute(
            "UPDATE romaneioitem SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = NOW(), UsuarioD_E_L_E_T_E = ? WHERE IdRomaneioItem = ?",
            [usuario || 'Sistema', idRomaneioItem]
        );

        // 5. Atualizar Saldo na Ordem de ServiÃ¯Â¿Â½o (ordemservicoitem)
        const [osItemRows] = await connection.execute(
            "SELECT RomaneioTotalEnviado, RomaneioSaldoEnviar FROM ordemservicoitem WHERE IdOrdemServicoItem = ?",
            [idOSItem]
        );

        if (osItemRows.length > 0) {
            let totalEnviado = (osItemRows[0].RomaneioTotalEnviado || 0) - qtdeRemover;
            let saldoEnviar = (osItemRows[0].RomaneioSaldoEnviar || 0) + qtdeRemover;

            // Garantir que nÃ¯Â¿Â½o fiquem negativos por erro de arredondamento ou dados prÃ¯Â¿Â½vios
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
        res.json({ success: true, message: 'Item excluÃ¯Â¿Â½do com sucesso e saldos atualizados.' });

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
            return res.status(400).json({ success: false, message: 'ConfiguraÃ¯Â¿Â½Ã¯Â¿Â½o EnderecoPastaRaizRomaneio nÃ¯Â¿Â½o encontrada.' });
        }

        const rootPath = configRows[0].valor;

        // 2. Construct Folder Path (RO_paddedId)
        const paddedId = String(id).padStart(4, '0');
        const folderPath = `${rootPath}\\RO_${paddedId}`;

        console.log(`[Action] Attempting to open Romaneio folder: ${folderPath}`);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ success: false, message: `Pasta nÃ¯Â¿Â½o encontrada no servidor: ${folderPath}` });
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
                message: `Caminho raiz nÃ¯Â¿Â½o encontrado: ${rootPath}. Verifique a configuraÃ¯Â¿Â½Ã¯Â¿Â½o do sistema.`
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
        res.json({ success: true, message: 'Romaneio excluÃ¯Â¿Â½do com sucesso' });
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
        return res.status(400).json({ success: false, message: 'AÃ¯Â¿Â½Ã¯Â¿Â½o nÃ¯Â¿Â½o especificada.' });
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
                            message: `Este Romaneio jÃ¯Â¿Â½ possui registro de envio e nÃ¯Â¿Â½o pode ser alterado. (Motorista: ${r.NomeMotorista || 'N/A'} | Data: ${r.DataEnvio || 'N/A'}). O processo foi finalizado.`
                        });
                    }
                }

                // Validate mandatory fields if this is a registration with data
                if (dadosEnvio) {
                    if (!dadosEnvio.motorista || !dadosEnvio.placa || !dadosEnvio.tipoTransporte || !dadosEnvio.cnh || !dadosEnvio.categoria || !dadosEnvio.telefone) {
                        // Strict validation as requested
                        return res.status(400).json({ success: false, message: 'Dados de envio incompletos. Preencha todos os campos obrigatÃ¯Â¿Â½rios.' });
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
                    // No, "os novos campos tambem serÃ¯Â¿Â½o obrigatorios".
                    if (!req.body.dadosEnvio) {
                        return res.status(400).json({ success: false, message: 'Dados do transporte sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios para registrar.' });
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
                    return res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado.' });
                }

                const current = currentRows[0];

                // Validation 1: Check if soft deleted
                if (current.D_E_L_E_T_E === '*') {
                    return res.status(400).json({ success: false, message: 'NÃ¯Â¿Â½o Ã¯Â¿Â½ possÃ¯Â¿Â½vel liberar um romaneio excluÃ¯Â¿Â½do.' });
                }

                // Validation 2: Check if already finalized
                if (current.Estatus === 'F') {
                    return res.status(400).json({ success: false, message: 'Romaneio jÃ¯Â¿Â½ finalizado. NÃ¯Â¿Â½o Ã¯Â¿Â½ possÃ¯Â¿Â½vel liberar.' });
                }

                // Validation 3: Check if registered (Motorista and Date)
                if (!current.NomeMotorista || !current.DataEnvio) {
                    return res.status(400).json({ success: false, message: 'O romaneio deve ser registrado (motorista e data) antes de ser liberado.' });
                }

                // Validation 4: Check if already released (Condition 1)
                if (current.Liberado === 'S') {
                    return res.status(400).json({ success: false, message: 'O romaneio jÃ¯Â¿Â½ consta como Liberado. O processo nÃ¯Â¿Â½o pode ser repetido.' });
                }

                // Validation 5: Check if there are items (Condition 2)
                const [itemRows] = await pool.execute(
                    "SELECT COUNT(*) as count FROM romaneioitem WHERE IdRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
                    [id]
                );

                if (itemRows[0].count === 0) {
                    return res.status(400).json({ success: false, message: 'O romaneio nÃ¯Â¿Â½o possui itens vinculados. LiberaÃ¯Â¿Â½Ã¯Â¿Â½o interrompida. Por favor, adicione itens antes de prosseguir.' });
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
                    console.log(`[Action] ERRO: Romaneio #${id} nÃ¯Â¿Â½o localizado no banco de dados para cancelar liberaÃ¯Â¿Â½Ã¯Â¿Â½o.`);
                    return res.status(404).json({ success: false, message: `Romaneio #${id} nÃ¯Â¿Â½o encontrado no banco de dados.` });
                }

                const abort = abortRows[0];
                // Helper for case-insensitive access in JS object
                const getAbortVal = (obj, key) => {
                    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                    return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                };

                const abortLiberado = getAbortVal(abort, 'Liberado');
                const abortEstatus = getAbortVal(abort, 'Estatus');

                console.log(`[Action] Cancelar LiberaÃ¯Â¿Â½Ã¯Â¿Â½o ID: ${id} | Estatus: "${abortEstatus}" | Liberado: "${abortLiberado}"`);

                // STRICT VALIDATION
                if (abortEstatus === 'F') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} jÃ¯Â¿Â½ estÃ¯Â¿Â½ FINALIZADO e nÃ¯Â¿Â½o pode ser cancelado.` });
                }

                if (abortLiberado !== 'S') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} nÃ¯Â¿Â½o consta como liberado (Status DB: "${abortLiberado}"). LiberaÃ¯Â¿Â½Ã¯Â¿Â½o nÃ¯Â¿Â½o pode ser cancelada.` });
                }

                // 2. Perform cleanup if released
                if (abort.ENDERECORomaneio) {
                    const pdfPath = path.join(abort.ENDERECORomaneio, 'PDF');
                    console.log(`[Action] Limpando diretÃ¯Â¿Â½rio de PDFs: ${pdfPath}`);
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
                return res.status(400).json({ success: false, message: 'AÃ¯Â¿Â½Ã¯Â¿Â½o invÃ¯Â¿Â½lida.' });
        }

        const [result] = await pool.execute(updateQuery, params);

        // --- Post-Action Logic: Excel Export for 'liberar' ---
        let excelResult = null;
        if (action === 'liberar' && result.affectedRows > 0) {
            excelResult = await ExportarRomaneioExcelPadrao(id);
        }

        if (result.affectedRows > 0) {
            let successMessage = `AÃ¯Â¿Â½Ã¯Â¿Â½o '${action}' realizada com sucesso!`;
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
            res.status(404).json({ success: false, message: 'Romaneio nÃ¯Â¿Â½o encontrado.' });
        }

    } catch (error) {
        console.error(`Error performing action ${action} on romaneio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao processar aÃ¯Â¿Â½Ã¯Â¿Â½o.' });
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

        // Se 'mostrarConcluidos' nÃ¯Â¿Â½o for true, filtra apenas os que nÃ¯Â¿Â½o foram finalizados
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
        console.error('[RETORNO] Erro ao buscar histÃ¯Â¿Â½rico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar histÃ¯Â¿Â½rico do item.' });
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
            throw new Error('Item do romaneio nÃ¯Â¿Â½o encontrado.');
        }

        const item = itemRows[0];
        const novaQtdeRetorno = (Number(item.QtdeTotalRetorno) || 0) + Number(qtdeRetorno);

        // 2. Inserir no histÃ¯Â¿Â½rico (romaneioitemcontrole)
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
            throw new Error('Registro de histÃ¯Â¿Â½rico nÃ¯Â¿Â½o encontrado.');
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

// ConfiguraÃ¯Â¿Â½Ã¯Â¿Â½o do Sistema (Admin only)
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
app.post('/api/login', loginLimiter, async (req, res) => {
    const { login, senha, password } = req.body;
    const pwd = senha || password;

    if (!login || !pwd) {
        return res.status(400).json({ success: false, message: 'UsuÃ¯Â¿Â½rio e senha sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios' });
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
            res.status(401).json({ success: false, message: 'Credenciais invÃ¯Â¿Â½lidas' });
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
        res.status(401).json({ success: false, message: 'Credenciais invÃ¯Â¿Â½lidas' });
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
        return res.status(400).json({ success: false, message: 'dbName ÃƒÂ© obrigatÃƒÂ³rio' });
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
        return res.status(401).json({ success: false, message: 'Token de superadmin invÃƒÂ¡lido' });
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

        res.json({ success: true, message: `SincronizaÃ¯Â¿Â½Ã¯Â¿Â½o concluÃ¯Â¿Â½da. ${syncedCount} novos usuÃ¯Â¿Â½rios importados.` });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ success: false, message: 'Erro na sincronizaÃ¯Â¿Â½Ã¯Â¿Â½o: ' + error.message });
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
            res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio atualizado com sucesso' });

        }

        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio atualizado com sucesso' });
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

// --- CRUD: UsuÃ¯Â¿Â½rio (with Central Sync) ---

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
        res.status(500).json({ success: false, message: 'Erro ao listar usuÃ¯Â¿Â½rios' });
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
            res.status(404).json({ success: false, message: 'UsuÃ¯Â¿Â½rio nÃ¯Â¿Â½o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usuÃ¯Â¿Â½rio' });
    }
});

// CREATE User (with Central Sync)
app.post('/api/usuario', async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario, email, status } = req.body;

    if (!NomeCompleto || !Login || !Senha) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Senha sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios' });
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

        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio criado com sucesso', id: newUserId });
    } catch (error) {
        console.error('Error creating usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Login jÃ¯Â¿Â½ existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao criar usuÃ¯Â¿Â½rio' });
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

        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'Login jÃ¯Â¿Â½ existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao atualizar usuÃ¯Â¿Â½rio' });
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

        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio excluÃ¯Â¿Â½do com sucesso' });
    } catch (error) {
        console.error('Error deleting usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usuÃ¯Â¿Â½rio' });
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

// --- CRUD: Pessoa JurÃ¯Â¿Â½dica ---

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
        res.status(500).json({ success: false, message: 'Erro ao buscar opÃ¯Â¿Â½Ã¯Â¿Â½es de fornecedor' });
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
            res.status(404).json({ success: false, message: 'Registro nÃ¯Â¿Â½o encontrado' });
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
        return res.status(400).json({ success: false, message: 'RazÃ¯Â¿Â½o Social Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
    }

    // Basic Server-Side Validation
    // Validate CNPJ simply by length (stripped)
    if (data.Cnpj) {
        const cnpjClean = data.Cnpj.replace(/[^\d]+/g, '');
        if (cnpjClean.length !== 14) {
            return res.status(400).json({ success: false, message: 'CNPJ deve conter 14 dÃ¯Â¿Â½gitos.' });
        }
    }
    // Validate Email regex
    if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
        return res.status(400).json({ success: false, message: 'Formato de e-mail invÃ¯Â¿Â½lido.' });
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
        res.json({ success: true, message: 'Registro excluÃ¯Â¿Â½do' });
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
        res.status(500).json({ success: false, message: 'Erro ao buscar opÃ¯Â¿Â½Ã¯Â¿Â½es de unidade' });
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
            res.status(404).json({ success: false, message: 'Unidade de medida nÃ¯Â¿Â½o encontrada' });
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
        return res.status(400).json({ success: false, message: 'Tipo da medida Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no mÃ¯Â¿Â½ximo 3 caracteres' });
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
        return res.status(400).json({ success: false, message: 'Tipo da medida Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no mÃ¯Â¿Â½ximo 3 caracteres' });
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
        res.json({ success: true, message: 'Unidade de medida excluÃ¯Â¿Â½da' });
    } catch (error) {
        console.error('Error deleting medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: FamÃ¯Â¿Â½lia ---

// LIST (Read All)
app.get('/api/familia', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT IdFamilia, DescFamilia, IdEmpresa, DataCriacao, CriadoPor FROM familia WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdFamilia DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching familia list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar famÃ¯Â¿Â½lias' });
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
        res.status(500).json({ success: false, message: 'Erro ao buscar opÃ¯Â¿Â½Ã¯Â¿Â½es de famÃ¯Â¿Â½lia' });
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
            res.status(404).json({ success: false, message: 'FamÃ¯Â¿Â½lia nÃ¯Â¿Â½o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar famÃ¯Â¿Â½lia' });
    }
});

// CREATE (Insert)
app.post('/api/familia', async (req, res) => {
    const { DescFamilia, IdEmpresa } = req.body;

    if (!DescFamilia) {
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o da famÃ¯Â¿Â½lia Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o deve ter no mÃ¯Â¿Â½ximo 50 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO familia (DescFamilia, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?)',
            [DescFamilia.trim(), IdEmpresa || null, now, 'Sistema']
        );
        res.json({ success: true, message: 'FamÃ¯Â¿Â½lia cadastrada com sucesso', id: result.insertId });
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
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o da famÃ¯Â¿Â½lia Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o deve ter no mÃ¯Â¿Â½ximo 50 caracteres' });
    }

    try {
        await pool.execute(
            'UPDATE familia SET DescFamilia = ?, IdEmpresa = ? WHERE IdFamilia = ?',
            [DescFamilia.trim(), IdEmpresa || null, id]
        );
        res.json({ success: true, message: 'FamÃ¯Â¿Â½lia atualizada com sucesso' });
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
        res.json({ success: true, message: 'FamÃ¯Â¿Â½lia excluÃ¯Â¿Â½da' });
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
        res.status(500).json({ success: false, message: 'Erro ao buscar opÃ¯Â¿Â½Ã¯Â¿Â½es de acabamento' });
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
            res.status(404).json({ success: false, message: 'Acabamento nÃ¯Â¿Â½o encontrado' });
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
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o do acabamento Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o deve ter no mÃ¯Â¿Â½ximo 200 caracteres' });
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
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o do acabamento Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'DescriÃ¯Â¿Â½Ã¯Â¿Â½o deve ter no mÃ¯Â¿Â½ximo 200 caracteres' });
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
        res.json({ success: true, message: 'Acabamento excluÃ¯Â¿Â½do' });
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
            res.status(404).json({ success: false, message: 'Material nÃ¯Â¿Â½o encontrado' });
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
        return res.status(400).json({ success: false, message: 'CÃ¯Â¿Â½digo do material Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
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
            res.status(400).json({ success: false, message: 'CÃ¯Â¿Â½digo do material jÃ¯Â¿Â½ existe' });
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
        return res.status(400).json({ success: false, message: 'CÃ¯Â¿Â½digo do material Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
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
            res.status(400).json({ success: false, message: 'CÃ¯Â¿Â½digo do material jÃ¯Â¿Â½ existe' });
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
        res.json({ success: true, message: 'Material excluÃ¯Â¿Â½do' });
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
            res.status(404).json({ success: false, message: 'Projeto nÃ¯Â¿Â½o encontrado' });
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
        return res.status(400).json({ success: false, message: 'Nome do projeto ÃƒÂ© obrigatÃƒÂ³rio' });
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
        const baseDrive = process.env.ENDERECO_PROJETO || 'G:\\\\MEU DRIVE\\\\ESTRUTURA PADRÃƒÆ’O LYNX\\\\004-PROJETOS';
        const EnderecoProjeto = path.join(baseDrive, projetoName);

        try {
            if (!fs.existsSync(EnderecoProjeto)) {
                fs.mkdirSync(EnderecoProjeto, { recursive: true });
                fs.mkdirSync(path.join(EnderecoProjeto, '00-Projeto'));
                fs.mkdirSync(path.join(EnderecoProjeto, '01-Tags'));
                fs.mkdirSync(path.join(EnderecoProjeto, '02-Isometrico'));
                fs.mkdirSync(path.join(EnderecoProjeto, '03-MediÃƒÂ§ÃƒÂ£o'));
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
        return res.status(400).json({ success: false, message: 'Nome do projeto ÃƒÂ© obrigatÃƒÂ³rio' });
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
                /* CobranÃƒÂ§a */
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
                // CobranÃƒÂ§a
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
        res.json({ success: true, message: 'Projeto excluÃ¯Â¿Â½do' });
    } catch (error) {
        console.error('Error deleting projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// VISÃƒÆ’O GERAL PRODUÃƒâ€¡ÃƒÆ’O
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// GET projetos for production overview
app.get('/api/visao-geral/projetos', async (req, res) => {
    try {
        const mostrarFinalizados = req.query.finalizados === '1';
        const mostrarLiberados = req.query.liberados === '1';

        // CondiÃƒÂ§ÃƒÂµes base de exclusÃƒÂ£o
        const condicoes = [`COALESCE(p.D_E_L_E_T_E,'') = ''`];

        if (mostrarFinalizados && mostrarLiberados) {
            // Caso as duas opÃƒÂ§ÃƒÂµes primeiras sejam selecionadas exibir todos os registros
            // nenhums condiÃƒÂ§ÃƒÂ£o extra
        } else if (mostrarFinalizados && !mostrarLiberados) {
            // 1- opÃƒÂ§ÃƒÂ£o 'Mostrar Finalizados' sÃƒÂ£o todos os registros onde 'Finalizado' ÃƒÂ© diferente de vazio e que nÃƒÂ£o foram liberados
            condicoes.push(`COALESCE(p.Finalizado,'') != ''`);
            condicoes.push(`COALESCE(p.liberado,'') = ''`);
        } else if (!mostrarFinalizados && mostrarLiberados) {
            // 2 - opÃƒÂ§ÃƒÂ£o 'Mostrar Liberado' sÃƒÂ£o todos os registros que tenham o campo 'Liberado' diferente de vazio
            condicoes.push(`COALESCE(p.liberado,'') != ''`);
        } else {
            // Se nenhuma das opÃƒÂ§oes ou 'Limpar' , apenas os registros com campos 'Finalizado' e 'Liberado' vazios
            condicoes.push(`COALESCE(p.Finalizado,'') = ''`);
            condicoes.push(`COALESCE(p.liberado,'') = ''`);
        }

        const where = condicoes.join(' AND ');

        // Get projects with aggregated sector totals from their tags + RNC count
        const [rows] = await pool.execute(`
            SELECT
                p.IdProjeto, p.Projeto, p.DescProjeto, p.DataPrevisao, p.DataCriacao,
                p.Finalizado, p.liberado, p.StatusProj, p.DescStatus,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Tags / PeÃƒÂ§as nativos da tabela Projetos Ã¢â€â‚¬Ã¢â€â‚¬ */
                COUNT(t.IdTag) AS QtdeTags,
                COALESCE(p.QtdeTagsExecutadas, 0) AS QtdeTagsExecutadas,
                COALESCE(p.QtdePecasTags, 0) AS QtdePecasTags,
                COALESCE(p.QtdePecasExecutadas, 0) AS QtdePecasExecutadas,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ RNC Ã¢â€â‚¬Ã¢â€â‚¬ */
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
                             
                /* Ã¢â€â‚¬Ã¢â€â‚¬ Novas req Ã¢â€â‚¬Ã¢â€â‚¬ */
                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,'') AS DECIMAL(10,2))), 0) AS qtdetotalpecas,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Setor Corte Ã¢â€â‚¬Ã¢â€â‚¬ */
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalCorte,
                COALESCE(SUM(CAST(NULLIF(t.CorteTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecCorte,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Setor Dobra Ã¢â€â‚¬Ã¢â€â‚¬ */
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalDobra,
                COALESCE(SUM(CAST(NULLIF(t.DobraTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecDobra,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Setor Solda Ã¢â€â‚¬Ã¢â€â‚¬ */
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutar,'') AS DECIMAL(10,2))), 0)   AS TotalSolda,
                COALESCE(SUM(CAST(NULLIF(t.SoldaTotalExecutado,'') AS DECIMAL(10,2))), 0)  AS ExecSolda,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Setor Pintura Ã¢â€â‚¬Ã¢â€â‚¬ */
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutar,'') AS DECIMAL(10,2))), 0)  AS TotalPintura,
                COALESCE(SUM(CAST(NULLIF(t.PinturaTotalExecutado,'') AS DECIMAL(10,2))), 0) AS ExecPintura,

                /* Ã¢â€â‚¬Ã¢â€â‚¬ Setor Montagem Ã¢â€â‚¬Ã¢â€â‚¬ */
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

        console.log(`[VisÃƒÂ£o Geral ProduÃƒÂ§ÃƒÂ£o] Query executada para tenant: ${req.tenantDb}. Rows found: ${rows.length}`);

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
            return res.status(400).json({ success: false, message: 'Todos os campos sÃƒÂ£o obrigatÃƒÂ³rios: Projetista, InÃƒÂ­cio e Fim.' });
        }

        const [result] = await pool.execute(`
            UPDATE tags 
            SET ProjetistaPlanejado = ?, 
                PlanejadoInicioEngenharia = ?, 
                PlanejadoFinalEngenharia = ?
            WHERE IdTag = ?
        `, [projetistaPlanejado, planejadoInicioEngenharia, planejadoFinalEngenharia, req.params.idTag]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tag nÃƒÂ£o encontrada.' });
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
            return res.status(400).json({ success: false, message: 'A Quantidade Liberada ÃƒÂ© obrigatÃƒÂ³ria.' });
        }

        // Fetch current tag to calculate balance
        const [tagRows] = await pool.execute('SELECT QtdeTag FROM tags WHERE IdTag = ?', [req.params.idTag]);
        if (tagRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tag nÃƒÂ£o encontrada.' });
        }
        
        const qtdeTag = parseFloat(tagRows[0].QtdeTag) || 0;
        const liberada = parseFloat(qtdeLiberada) || 0;
        
        if (liberada > qtdeTag) {
            return res.status(400).json({ success: false, message: `Quantidade liberada (${liberada}) nÃƒÂ£o pode ser maior que a Quantidade da Tag (${qtdeTag}).` });
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
            return res.status(400).json({ success: false, message: 'Projeto e UsuÃƒÂ¡rio sÃƒÂ£o obrigatÃƒÂ³rios.' });
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
            if (!idTag) return res.status(400).json({ success: false, message: 'ID da Tag ÃƒÂ© obrigatÃƒÂ³rio para finalizar apenas uma.' });
            
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
// VISÃƒÆ’O GERAL DE ENGENHARIA API
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
            return res.status(400).json({ success: false, message: 'Setor invÃƒÂ¡lido.' });
        }
        if (!usuario) {
            return res.status(400).json({ success: false, message: 'UsuÃƒÂ¡rio obrigatÃƒÂ³rio.' });
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
            return res.status(400).json({ success: false, message: 'Nenhum dado fornecido para atualizaÃƒÂ§ÃƒÂ£o.' });
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
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag nÃƒÂ£o encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag jÃƒÂ¡ Finalizado!' });

        const filePath = `/uploads/isometricos/${file.filename}`;

        await pool.execute("UPDATE tags SET CaminhoIsometrico = ? WHERE IdTag = ?", [filePath, idTag]);

        res.json({ success: true, message: 'Desenho IsomÃƒÂ©trico associado com sucesso.', data: { CaminhoIsometrico: filePath } });
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
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag nÃƒÂ£o encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag jÃƒÂ¡ Finalizado!' });

        const [tagRow] = await pool.execute("SELECT CaminhoIsometrico FROM tags WHERE IdTag = ?", [idTag]);
        const caminho = tagRow[0].CaminhoIsometrico;

        if (caminho) {
            const absolutePath = path.join(__dirname, '../public', caminho);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await pool.execute("UPDATE tags SET CaminhoIsometrico = NULL WHERE IdTag = ?", [idTag]);

        res.json({ success: true, message: 'Desenho IsomÃƒÂ©trico removido com sucesso.', data: { CaminhoIsometrico: null } });
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

        res.json({ success: true, message: idRnc ? 'PendÃƒÂªncia salva com sucesso!' : 'PendÃƒÂªncia criada com sucesso!' });
    } catch (error) {
        console.error('Error saving visao-geral pendencia:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar: ' + error.message });
    }
});

// PUT /api/visao-geral/pendencias/:id/finalizar
app.put('/api/visao-geral/pendencias/:id/finalizar', async (req, res) => {
    const id = req.params.id;
    const { usuarioFin, dataFin, setorFin, descFin, idProjeto } = req.body;
    
    // idProjeto nÃƒÂ£o ÃƒÂ© mais obrigatÃƒÂ³rio pois Tarefas podem ser genÃƒÂ©ricas (sem vinculo de projeto)
    if (!usuarioFin || !dataFin || !setorFin) {
        return res.status(400).json({ success: false, message: 'Faltam dados de finalizaÃƒÂ§ÃƒÂ£o' });
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
            // Provavelmente jÃƒÂ¡ veio formatada (ex: 19/03/2026) da funÃƒÂ§ÃƒÂ£o isoToBr do frontend
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

        res.json({ success: true, message: 'PendÃƒÂªncia finalizada' });
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
            return res.status(400).json({ success: false, message: 'Data de previsÃƒÂ£o ÃƒÂ© obrigatÃƒÂ³ria.' });
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

        res.json({ success: true, message: 'Data de previsÃƒÂ£o atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data: ' + error.message });
    }
});

// PUT: Atualizar DataPrevisao de uma Tag especÃƒÂ­fica
app.put('/api/visao-geral/tag/:idTag/data-previsao', async (req, res) => {
    try {
        const { idTag } = req.params;
        const { dataPrevisao } = req.body;

        if (!dataPrevisao) {
            return res.status(400).json({ success: false, message: 'Data de previsÃƒÂ£o ÃƒÂ© obrigatÃƒÂ³ria.' });
        }

        await pool.executeOnDefault(
            `UPDATE tags SET DataPrevisao = ? WHERE IdTag = ?`,
            [dataPrevisao, idTag]
        );

        res.json({ success: true, message: 'Data de previsÃƒÂ£o da tag atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data da tag: ' + error.message });
    }
});

// PUT: Atualizar data planejada de um setor de uma Tag especÃƒÂ­fica
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
            return res.status(400).json({ success: false, message: 'Campo invÃƒÂ¡lido.' });
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

// POST: Finalizar Projeto em cascata (projetos Ã¢â€ â€™ tags Ã¢â€ â€™ OS Ã¢â€ â€™ OS itens)
app.post('/api/visao-geral/projeto/:id/finalizar', async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userFinal = usuario || 'Sistema';

    try {
        // 1. Verificar se jÃƒÂ¡ estÃƒÂ¡ finalizado
        const [check] = await pool.executeOnDefault(
            `SELECT Finalizado FROM projetos WHERE IdProjeto = ?`,
            [id]
        );
        if (!check.length) {
            return res.status(404).json({ success: false, message: 'Projeto nÃƒÂ£o encontrado.' });
        }
        if (check[0].Finalizado && check[0].Finalizado.trim() !== '') {
            return res.status(400).json({
                success: false,
                message: `Este projeto jÃƒÂ¡ estÃƒÂ¡ finalizado (status: "${check[0].Finalizado}"). Nenhuma alteraÃƒÂ§ÃƒÂ£o foi realizada.`
            });
        }

        const now = getCurrentDateTimeBR();

        // 2. Finalizar em transaÃƒÂ§ÃƒÂ£o
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

// POST: Cancelar FinalizaÃƒÂ§ÃƒÂ£o do Projeto (desfaz cascata em projetos/tags/OS/OSitens)
app.post('/api/visao-geral/projeto/:id/cancelar-finalizacao', async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userCancel = usuario || 'Sistema';

    try {
        // 1. Verificar se estÃƒÂ¡ finalizado (condiÃƒÂ§ÃƒÂ£o para cancelar)
        const [check] = await pool.executeOnDefault(
            `SELECT Finalizado, Projeto FROM projetos WHERE IdProjeto = ?`,
            [id]
        );
        if (!check.length) {
            return res.status(404).json({ success: false, message: 'Projeto nÃƒÂ£o encontrado.' });
        }
        if (!check[0].Finalizado || check[0].Finalizado.trim() === '') {
            return res.status(400).json({
                success: false,
                message: `O projeto "${check[0].Projeto}" nÃƒÂ£o estÃƒÂ¡ finalizado. Nenhuma alteraÃƒÂ§ÃƒÂ£o foi realizada.`
            });
        }

        // 2. Desfazer finalizaÃƒÂ§ÃƒÂ£o em cascata (limpar campos)
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

        res.json({ success: true, message: `FinalizaÃƒÂ§ÃƒÂ£o cancelada com sucesso por ${userCancel}.` });
    } catch (error) {
        console.error('Error cancelling finalization:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar finalizaÃƒÂ§ÃƒÂ£o: ' + error.message });
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
            return res.status(404).json({ success: false, message: 'Projeto nÃƒÂ£o encontrado' });
        }

        const endereco = rows[0].EnderecoProjeto;

        if (!endereco) {
            return res.status(400).json({ success: false, message: 'Projeto nÃƒÂ£o possui um endereÃƒÂ§o de pasta configurado.' });
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
            return res.status(400).json({ success: false, message: 'O projeto nÃƒÂ£o pode ser liberado pois o status de liberaÃƒÂ§ÃƒÂ£o nÃƒÂ£o estÃƒÂ¡ vazio.' });
        }

        // LÃƒÂ³gica NÃƒÂ£o-Alfatec padrÃƒÂ£o (liberado = 'S', DataLiberacao)
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
            res.status(404).json({ success: false, message: 'Tag nÃ¯Â¿Â½o encontrada' });
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
        return res.status(400).json({ success: false, message: 'Tag e Projeto sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios' });
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
        return res.status(400).json({ success: false, message: 'Tag Ã¯Â¿Â½ obrigatÃ¯Â¿Â½ria' });
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
        res.json({ success: true, message: 'Tag excluÃ¯Â¿Â½da' });
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
        res.status(500).json({ success: false, message: 'Erro ao carregar opÃ¯Â¿Â½Ã¯Â¿Â½es' });
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
            res.status(404).json({ success: false, message: 'NÃ¯Â¿Â½o encontrado' });
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
        return res.status(400).json({ success: false, message: 'Tipo Produto Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
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
        return res.status(400).json({ success: false, message: 'Tipo Produto Ã¯Â¿Â½ obrigatÃ¯Â¿Â½rio' });
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
        res.json({ success: true, message: 'Tipo excluÃ¯Â¿Â½do' });
    } catch (error) {
        console.error('Error deleting tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- Rota para servir PDFs de caminhos locais ---
// Esta rota permite abrir PDFs que estÃ¯Â¿Â½o em pastas do sistema de arquivos
app.get('/api/pdf', async (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Caminho do arquivo nÃ¯Â¿Â½o informado' });
    }

    try {
        // Normaliza o caminho (trata barras e formato)
        let normalizedPath = filePath.replace(/\\/g, '/');

        // Remove prefixo file:/// se existir
        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extensÃ¯Â¿Â½o para .pdf se necessÃ¯Â¿Â½rio
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            normalizedPath = normalizedPath.split(ext).join('.pdf');
        });

        // Verifica se o arquivo existe
        if (!fs.existsSync(normalizedPath)) {
            console.error('Arquivo nÃ¯Â¿Â½o encontrado:', normalizedPath);
            return res.status(404).json({ success: false, message: 'Arquivo nÃ¯Â¿Â½o encontrado: ' + normalizedPath });
        }

        // Verifica se Ã¯Â¿Â½ realmente um PDF
        if (!normalizedPath.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ success: false, message: 'Apenas arquivos PDF sÃ¯Â¿Â½o permitidos' });
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
        return res.status(400).json({ success: false, message: 'Caminho do arquivo ou tipo nÃ¯Â¿Â½o informado' });
    }

    try {
        let normalizedPath = filePath.replace(/\\/g, '/');

        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extensÃ¯Â¿Â½o para o tipo solicitado
        const targetExt = type.toLowerCase() === 'sldprt' ? '.SLDPRT' : '.DXF';
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            normalizedPath = normalizedPath.split(ext).join(targetExt);
        });

        if (!fs.existsSync(normalizedPath)) {
            // Tenta com extensÃ¯Â¿Â½o em minÃ¯Â¿Â½scula como fallback
            const lowerExt = targetExt.toLowerCase();
            const altPath = normalizedPath.replace(/\.[^.]+$/, lowerExt);

            if (fs.existsSync(altPath)) {
                normalizedPath = altPath;
            } else {
                console.error('Arquivo para download nÃ¯Â¿Â½o encontrado:', normalizedPath);
                return res.status(404).json({ success: false, message: 'Arquivo nÃ¯Â¿Â½o encontrado: ' + normalizedPath });
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

// --- Ordens de ServiÃ¯Â¿Â½o (Somente Leitura) ---

// OPTIONS: Lista de Projetos Ã¯Â¿Â½nicos para dropdown
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

// OPTIONS: Lista de Tags Ã¯Â¿Â½nicas para dropdown
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

// SEARCH: Busca global em itens por cÃ¯Â¿Â½digo do documento/desenho

// OPTIONS: Lista de Projetos para Clonagem
app.get('/api/ordemservico/projetos-clonagem', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT IdProjeto as value, Projeto as label FROM projetos WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY Projeto");
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

// OPTIONS: Lista de Tags para Clonagem
app.get('/api/ordemservico/tags-clonagem', async (req, res) => {
    try {
        const projetoId = req.query.projetoId;
        if (!projetoId) return res.json({ success: true, data: [] });
        const [rows] = await pool.execute("SELECT IdTag as value, Tag as label FROM tags WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND IdProjeto = ? ORDER BY Tag", [projetoId]);
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

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

// LIST Ordens de ServiÃ¯Â¿Â½o com paginaÃ¯Â¿Â½Ã¯Â¿Â½o e filtros
app.get('/api/ordemservico', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const projeto = req.query.projeto;
        const tag = req.query.tag;
        const search = req.query.search;
        const filter = req.query.filter || 'liberados';

        // Construir WHERE dinÃ¯Â¿Â½mico
        let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";
        const params = [];

        if (filter === 'liberados') {
            whereClause += " AND Liberado_Engenharia = 'S' AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')";
        }

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

        // Query com paginaÃ¯Â¿Â½Ã¯Â¿Â½o
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
                EnderecoOrdemServico, NumeroOPOmie
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

// GET ONE Ordem de ServiÃ¯Â¿Â½o
app.get('/api/ordemservico/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM ordemservico WHERE IdOrdemServico = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'OS nÃ¯Â¿Â½o encontrada' });
        }
    } catch (error) {
        console.error('Error fetching ordemservico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar OS' });
    }
});

// LIST Itens de uma Ordem de ServiÃ¯Â¿Â½o


// ---------------------------------------------------------

// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA ROTA: Finalizar Ordem Servico (Etapa 6)
// ---------------------------------------------------------
app.post('/api/ordemservico/finalizar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico ÃƒÂ© obrigatÃƒÂ³rio' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de ServiÃƒÂ§o nÃƒÂ£o encontrada.' });

        if (rows[0].OrdemServicoFinalizado === 'C') {
            return res.status(400).json({ success: false, message: 'O.S. jÃƒÂ¡ Finalizada' });
        }

        const dataatual = formatBR(new Date(), true);

        // Update ordemservico
        await connection.query(`
            UPDATE ordemservico 
            SET OrdemServicoFinalizado = 'C',
                DataFinalizado = ?
            WHERE IdOrdemServico = ?
        `, [dataatual, IdOrdemServico]);

        // Update ordemservicoitem
        await connection.query(`
            UPDATE ordemservicoitem
            SET OrdemServicoItemFinalizado = 'C'
            WHERE IdOrdemServico = ?
        `, [IdOrdemServico]);

        return res.json({ success: true, message: 'Processo FinalizaÃƒÂ§ÃƒÂ£o ConcluÃƒÂ­do' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// NOVA ROTA: Excluir/Cancelar Ordem de ServiÃƒÂ§o
// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA ROTA: Cancelar Finalizacao Ordem Servico (Etapa 7)
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico ÃƒÂ© obrigatÃƒÂ³rio' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de ServiÃƒÂ§o nÃƒÂ£o encontrada.' });

        if (rows[0].OrdemServicoFinalizado !== 'C') {
            return res.status(400).json({ success: false, message: 'NÃƒÂ£o HÃƒÂ¡ itens para continuar processo (OS nÃƒÂ£o finalizada).' });
        }

        try {
            await connection.query('UPDATE planocorte SET Concluido = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);
        } catch(e) {
            console.log("Aviso: tabela planocorte possivelmente ignorada/vazia para UPDATE:", e.message);
        }

        await connection.query('UPDATE ordemservico SET ORDEMSERVICOFINALIZADO = "", DataFinalizado = NULL WHERE IdOrdemServico = ?', [IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET ORDEMSERVICOITEMFINALIZADO = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);

        return res.json({ success: true, message: 'Processo de cancelamento da FinalizaÃƒÂ§ÃƒÂ£o Executado' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});


// ---------------------------------------------------------
// NOVA ROTA: Inserir Numero OP do Omie (Etapa 8)
// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA ROTA: Criar CÃƒÂ³pia da Ordem de ServiÃƒÂ§o (Etapa 9)
// ---------------------------------------------------------
app.post('/api/ordemservico/clonar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, novoFator, usuarioNome, novoIdProjeto, novoIdTag, novaDescricao } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico de origem ÃƒÂ© obrigatÃƒÂ³rio' });
        if (!novoIdProjeto || !novoIdTag) return res.status(400).json({ success: false, message: 'Projeto e Tag de destino sÃƒÂ£o obrigatÃƒÂ³rios' });
        
        const fator = isNaN(parseInt(novoFator)) || parseInt(novoFator) <= 0 ? 1 : parseInt(novoFator);
        const criador = usuarioNome || 'Sistema Web';

        // 1. Obter a O.S Original
        const [origOS] = await connection.query('SELECT * FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S de origem nÃƒÂ£o encontrada' });
        const os = origOS[0];

        // 2. Obter Dados do Novo Projeto e Nova Tag
        const [rowProjeto] = await connection.query('SELECT Projeto FROM projetos WHERE IdProjeto = ?', [novoIdProjeto]);
        if (rowProjeto.length === 0) return res.status(404).json({ success: false, message: 'Projeto de destino nÃƒÂ£o encontrado' });
        const { Projeto: nomeProjeto } = rowProjeto[0];

        const [rowTag] = await connection.query('SELECT Tag, DescTag, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag FROM tags WHERE IdTag = ?', [novoIdTag]);
        if (rowTag.length === 0) return res.status(404).json({ success: false, message: 'Tag de destino nÃƒÂ£o encontrada' });
        const { Tag: nomeTag, DescTag: descTagDestino, DataPrevisao: dataPrevTag } = rowTag[0];

        // 3. Inserir Header (Mestre) Limpando VariÃƒÂ¡veis de Estado
        const queryInsertMestre = `
            INSERT INTO ordemservico (
                IdProjeto, Projeto, IdTag, Tag, DescTag, Descricao, fator, EnderecoOrdemServico, 
                CriadoPor, DataCriacao, Estatus, D_E_L_E_T_E, Liberado_Engenharia, Data_Liberacao_Engenharia, 
                idOSReferencia, OrdemServicoFinalizado, DataPrevisao, 
                QtdeTotalItens, QtdeItensExecutados, PercentualItens, QtdeTotalPecas, QtdepecasExecutadas, Percentualpecas, 
                IdEmpresa, DescEmpresa
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'A', '', '', '', ?, '', ?, '', '', '', '', '', '', ?, ?)
        `;
        
        const descUsada = novaDescricao || os.Descricao;
        const prevUsada = dataPrevTag || os.DataPrevisao;
        const today = new Date();
        const dataCriacaoFormatada = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

        const [resultInsert] = await connection.query(queryInsertMestre, [
            novoIdProjeto, nomeProjeto, novoIdTag, nomeTag, descTagDestino, descUsada, fator, os.EnderecoOrdemServico,
            criador, dataCriacaoFormatada, IdOrdemServico, prevUsada, os.IdEmpresa, os.DescEmpresa
        ]);

        const novoId = resultInsert.insertId;

        // Tentar formatar DiretÃƒÂ³rio fisÃƒÂ­co
        let newEndereco = os.EnderecoOrdemServico;
        if (newEndereco) {
            const format5 = (num) => String(num).padStart(5, '0');
            const oldPref1 = `OS_${format5(IdOrdemServico)}`;
            const oldPref2 = `OS_${IdOrdemServico}`;
            const newPref = `OS_${format5(novoId)}`;
            
            if (newEndereco.includes(oldPref1)) newEndereco = newEndereco.replace(oldPref1, newPref);
            else if (newEndereco.includes(oldPref2)) newEndereco = newEndereco.replace(oldPref2, newPref);
            else newEndereco += `_COPIA_${novoId}`;

            await connection.query('UPDATE ordemservico SET EnderecoOrdemServico = ? WHERE IdOrdemServico = ?', [newEndereco, novoId]);

            try {
                const fsp = require('fs/promises');
                const p = require('path');
                await fsp.mkdir(newEndereco, { recursive: true });
                const subdirs = ['DXF', 'PDF', 'DFT', 'PUNC', 'LASER', 'Projeto', 'PEÃƒâ€¡AS DE ESTOQUE', 'LXDS'];
                for (const sd of subdirs) {
                    await fsp.mkdir(p.join(newEndereco, sd), { recursive: true }).catch(() => {});
                }
            } catch (e) {
                console.log('[CloneOS] Pasta de rede inacesÃƒÂ­vel:', e.message);
            }
        }

        // 4. Inserir Itens (Filhas)
        const queryInsertItens = `
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
                ?, ?, Estatus, Acabamento, D_E_L_E_T_E, ?, qtde,
                txtSoldagem, txtTipoDesenho, txtCorte, txtDobra, txtSolda,
                txtPintura, txtMontagem, CorteTotalExecutar, DobraTotalExecutar, SoldaTotalExecutar,
                PinturaTotalExecutar, MontagemTotalExecutar, Comprimentocaixadelimitadora,
                Larguracaixadelimitadora, Espessuracaixadelimitadora, AreaPinturaUnitario,
                PesoUnitario, txtItemEstoque, ?, '', '',
                '', '', '', '', '', '',
                ProdutoPrincipal, EnderecoArquivoItemOrdemServico, ?, ?
            FROM ordemservicoitem 
            WHERE (IdOrdemServico = ?) AND (IdOrdemServicoReposicao IS NULL OR IdOrdemServicoReposicao = '')
        `;

        await connection.query(queryInsertItens, [
            novoId, novoIdProjeto, nomeProjeto, novoIdTag, nomeTag, descTagDestino,
            fator, fator, fator, criador, dataCriacaoFormatada, fator, prevUsada, os.IdEmpresa, os.DescEmpresa, IdOrdemServico
        ]);

        return res.json({ success: true, message: 'Nova CÃƒÂ³pia da Ordem de ServiÃƒÂ§o inserida!', novoId });

    } catch (e) {
        console.error("Erro ao clonar O.S (Inter-Projetos):", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/ordemservico/numero-op', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, NumeroOPOmie } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico ÃƒÂ© obrigatÃƒÂ³rio' });

        await connection.query('UPDATE ordemservico SET NumeroOPOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET NumeroOpOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);

        return res.json({ success: true, message: 'NÃƒÂºmero da OP do OMIE atualizado com sucesso!' });

    } catch (e) {
        console.error("Erro ao atualizar Numero OP Omie:", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/ordemservico/excluir', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, Usuario } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico ÃƒÂ© obrigatÃƒÂ³rio' });

        // ValidaÃƒÂ§ÃƒÂ£o idÃƒÂªntica ao VB.NET: verificar se hÃƒÂ¡ execuÃƒÂ§ÃƒÂ£o ou plano de corte
        const [rows] = await connection.query(`
            SELECT 
                count(idplanodecorte) +
                count(CorteTotalExecutado) + count(DobraTotalExecutado) + count(SoldaTotalExecutado) +
                count(PinturaTotalExecutado) + count(MontagemTotalExecutado) as totalExecutado
            FROM ordemservicoitem 
            WHERE IdOrdemServico = ? 
              AND (idplanodecorte > 0 OR CorteTotalExecutado > 0 OR DobraTotalExecutado > 0 OR SoldaTotalExecutado > 0 OR PinturaTotalExecutado > 0 OR MontagemTotalExecutado > 0)
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `, [IdOrdemServico]);

        let totalExecutado = 0;
        if (rows.length > 0) {
            totalExecutado = parseInt(rows[0].totalExecutado) || 0;
        }

        if (totalExecutado > 0) {
            // Busca apenas os planos de corte para listar na mensagem, caso haja para exibiÃƒÂ§ÃƒÂ£o de detalhes
            const [planoRows] = await connection.query(`
                SELECT idplanodecorte, CodMatFabricante
                FROM ordemservicoitem 
                WHERE IdOrdemServico = ? AND idplanodecorte > 0 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [IdOrdemServico]);

            let MsgDetalhes = '';
            for (const p of planoRows) {
                MsgDetalhes += `\nPlanoCorte = ${p.idplanodecorte}  Numero Desenho: = ${p.CodMatFabricante}`;
            }

            return res.status(400).json({
                success: false, 
                message: `A OS Numero: ${IdOrdemServico} contÃƒÂ©m processos em andamento, por este motivo nÃƒÂ£o pode ser cancelada. Ver plano(s) de corte:${MsgDetalhes}`
            });
        }

        // Realiza o "Soft Delete" na tabela ordemservico
        const dataatual = formatBR(new Date(), true);
        const executor = Usuario || 'Sistema'; // Fallback

        const [updateOS] = await connection.query(`
            UPDATE ordemservico 
            SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = ?
            WHERE IdOrdemServico = ?
        `, [executor, dataatual, IdOrdemServico]);

        if (updateOS.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Ordem de ServiÃƒÂ§o nÃƒÂ£o encontrada ou jÃƒÂ¡ excluÃƒÂ­da.' });
        }

        // Realiza o "Soft Delete" na tabela ordemservicoitem
        await connection.query(`
            UPDATE ordemservicoitem
            SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = ?
            WHERE IdOrdemServico = ?
        `, [executor, dataatual, IdOrdemServico]);

        // Aqui entraria: ClasseclOrdemServico.CalcularordemservicoitemFatorOS_TAG_PROJETO() 
        // Em um ecosistema reativo moderno ou onde essa query roda, precisariamos recalcular nivel superior.
        // Como o React recarrega a grid com dados do SQL, o `D_E_L_E_T_E = '*'` ja omitira da listagem inicial.

        return res.json({ success: true, message: 'Ordem de serviÃƒÂ§o excluÃƒÂ­da com sucesso.' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ---------------------------------------------------------
// NOVA ROTA: Gerar Relatorio Excel (Etapa 10)
// ---------------------------------------------------------
app.post('/api/ordemservico/:id/excel', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const IdOrdemServico = req.params.id;

        const [origOS] = await connection.query('SELECT * FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S nÃƒÂ£o encontrada' });
        const os = origOS[0];

        const db = require('./config/db');
        const store = db.asyncLocalStorage.getStore();
        const dbName = store ? store.dbName : 'lynxlocal';
        
        // Caminho padrao fallback conforme instrucao (G:\Meu Drive\ConfiguraÃƒÂ§ÃƒÂµes + dbName + Configuracao...)
        let templatePath = `G:\\Meu Drive\\ConfiguraÃƒÂ§ÃƒÂµes\\${dbName}\\Configuracao\\Template-OS-rev02.xlsx`;

        // O usuÃƒÂ¡rio especificou que, para o lynxlocal, a base do arquivo ÃƒÂ© exatamente esta:
        if (dbName === 'lynxlocal' || dbName === 'Lynx') {
            templatePath = 'G:\\Meu Drive\\Estrutura padrÃƒÂ£o Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-OS-Rev03.xlsx';
        }
        
        // Tenta buscar da configuracaosistema primeiro (mais seguro se existir lÃƒÂ¡)
        const [configRows] = await connection.query("SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelOrdemServico'");
        if (configRows.length > 0 && configRows[0].valor) {
            templatePath = configRows[0].valor;
        }

        const fs = require('fs');
        if (!fs.existsSync(templatePath)) {
            // Tentativa alternativa caso o nome do arquivo seja "Templat" sem E
            const altPath = templatePath.replace('Template', 'Templat');
            if (fs.existsSync(altPath)) {
                templatePath = altPath;
            } else {
                return res.status(400).json({ success: false, message: 'Template Excel nÃƒÂ£o encontrado: ' + templatePath });
            }
        }

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.worksheets[0];

        const format5 = (num) => String(num).padStart(5, '0');
        const osString = format5(os.IdOrdemServico);

        // Header mapping
        worksheet.getCell('W1').value = osString;
        worksheet.getCell('D8').value = (os.Projeto || '') + ' - ' + (os.DescEmpresa || '');
        worksheet.getCell('D9').value = (os.Tag || '').trim().toUpperCase();
        worksheet.getCell('N8').value = (os.Descricao || '').trim().toUpperCase();
        worksheet.getCell('D10').value = (os.EnderecoOrdemServico || '').trim().toUpperCase();
        worksheet.getCell('D13').value = (os.CriadoPor || '').trim().toUpperCase();
        worksheet.getCell('D14').value = (os.DataCriacao || '').trim().toUpperCase();

        const [itens] = await connection.query(`
            SELECT * FROM ordemservicoitem 
            WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdOrdemServicoItem
        `, [IdOrdemServico]);

        // Items mapping starting at row 19 (using row 18 as template)
        const startRow = 18;
        
        for (let i = 0; i < itens.length; i++) {
            const item = itens[i];
            
            // Insert row by duplicating style of row 18
            worksheet.duplicateRow(startRow, 1, true);
            const row = worksheet.getRow(startRow + 1 + i);
            
            row.getCell('A').value = String(item.IdOrdemServicoItem || '').trim().toUpperCase();
            row.getCell('B').value = String(item.CodMatFabricante || '').trim().toUpperCase();
            row.getCell('I').value = String(item.QtdeTotal || '').trim().toUpperCase();
            row.getCell('J').value = String(item.MaterialSW || '').trim().toUpperCase();
            row.getCell('K').value = String(item.Unidade || '').trim().toUpperCase();
            row.getCell('L').value = String(item.Espessura || '').trim().toUpperCase();
            row.getCell('M').value = String(item.Altura || '').trim().toUpperCase();
            row.getCell('N').value = String(item.Largura || '').trim().toUpperCase();
            row.getCell('O').value = String(item.txtItemEstoque || '').trim().toUpperCase();
            row.getCell('P').value = String(item.DescResumo || '').trim().toUpperCase();
            row.getCell('S').value = String(item.DescDetal || '').trim().toUpperCase();
            row.getCell('V').value = String(item.Acabamento || '').trim().toUpperCase();
            row.getCell('W').value = String(item.txtTipoDesenho || '').trim().toUpperCase();
            row.commit();
        }

        // Deleta a linha template original (A18:W18)
        worksheet.spliceRows(startRow, 1);

        const destPath = os.EnderecoOrdemServico;
        if (!destPath || !fs.existsSync(destPath)) {
            return res.status(400).json({ success: false, message: 'DiretÃƒÂ³rio final da OS nÃƒÂ£o existe: ' + destPath });
        }

        const fileName = `OS_${osString}.xlsx`;
        const path = require('path');
        const finalFile = path.join(destPath, fileName);

        await workbook.xlsx.writeFile(finalFile);

        // Open Explorer
        try {
            require('child_process').exec(`explorer "${destPath}"`);
        } catch (e) {
            console.error('Falha ao abrir explorer:', e);
        }

        return res.json({ success: true, message: 'RelatÃƒÂ³rio Excel gerado com sucesso.', file: finalFile });

    } catch (e) {
        console.error("Erro na geraÃƒÂ§ÃƒÂ£o de Excel:", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// NOVA ROTA: Atualizar arquivos na pasta da OS (Icone 3)
// ---------------------------------------------------------
app.post('/api/ordemservico/atualizar-arquivos', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;

        const [osRows] = await connection.query('SELECT EnderecoOrdemServico, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS nÃƒÂ£o encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de ServiÃƒÂ§o jÃƒÂ¡ Liberada para ProduÃƒÂ§ÃƒÂ£o, nÃƒÂ£o pode mais ser modificada!' });
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

        
        // ImportarArquivos (Port from VB.NET)
        const fsLib = require('fs');
        const [itens] = await connection.query('SELECT IdOrdemServicoItem, EnderecoArquivo, MaterialSW, QtdeTotal, Espessura, txtTipoDesenho, Acabamento FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = "")', [IdOrdemServico]);
        
        const paramExportar = '1';

        for (const pasta of pastasLimpar) {
            const pastaUpper = pasta.toUpperCase();
            const alvoDir = path.join(diretorio, pastaUpper);
            if (!fsLib.existsSync(alvoDir)) {
                try { fsLib.mkdirSync(alvoDir, { recursive: true }); } catch(e){}
            }

            for (const item of itens) {
                if (!item.EnderecoArquivo) continue;
                
                let origem = item.EnderecoArquivo;
                
                // Adapta extensÃƒÂµes
                const extsToReplace = ['.SLDPRT', '.SLDASM', '.ASM', '.PSM', '.PAR'];
                for (const ext of extsToReplace) {
                    const re = new RegExp(ext.replace('.', '\.'), 'i');
                    if (re.test(origem)) {
                        origem = origem.replace(re, '.' + pastaUpper);
                        break;
                    }
                }
                
                const materialSW = item.MaterialSW || 'Sem Material';
                const qtdeTotal = item.QtdeTotal || 'Sem Quantidade'; 
                const espessura = item.Espessura || 'Sem Espessura';
                const tipoDesenho = item.txtTipoDesenho || 'Sem Tipo Desenho';

                if (fsLib.existsSync(origem)) {
                    const nomeStr = path.parse(origem).name;
                    const extStr = path.parse(origem).ext;
                    let novoNome = '';

                    const isAssembly = /\.(SLDASM|ASM)$/i.test(item.EnderecoArquivo);

                    if (isAssembly) {
                        novoNome = `OS_${IdOrdemServico}_${tipoDesenho}_${qtdeTotal}_${nomeStr}${extStr}`;
                    } else if (paramExportar === '1') {
                        novoNome = `OS_${IdOrdemServico}_${espessura}_${materialSW}_${qtdeTotal}_${nomeStr}${extStr}`;
                    } else if (paramExportar === '2') {
                        novoNome = `OS_${IdOrdemServico}_${qtdeTotal}_${nomeStr}_${materialSW}_${espessura}${extStr}`;
                    } else {
                        novoNome = `OS_${IdOrdemServico}_${espessura}_${materialSW}_${qtdeTotal}_${nomeStr}${extStr}`;
                    }

                    const destinoArquivo = path.join(alvoDir, novoNome);

                    try {
                        fsLib.copyFileSync(origem, destinoArquivo);
                        
                        if (pastaUpper === 'PDF') {
                            await connection.query('UPDATE ordemservicoitem SET EnderecoArquivoItemOrdemServico = ? WHERE IdOrdemServicoItem = ?', [destinoArquivo, item.IdOrdemServicoItem]);
                        }
                    } catch(err) {
                        console.error('Erro ao copiar arquivo:', err.message);
                    }
                }
            }
        }

        res.json({ success: true, message: 'Arquivos locais importados e pastas atualizadas com sucesso.' });

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
        connection = await pool.getConnection();
        const { IdOrdemServico, FatorMultiplicador } = req.body;

        const fator = parseFloat(FatorMultiplicador);
        if (isNaN(fator) || fator <= 0) {
            return res.status(400).json({ success: false, message: 'Fator invÃƒÂ¡lido' });
        }

        const [osRows] = await connection.query('SELECT IdTag, EnderecoOrdemServico, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS nÃƒÂ£o encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de ServiÃƒÂ§o jÃƒÂ¡ Liberada para ProduÃƒÂ§ÃƒÂ£o, nÃƒÂ£o pode mais ser modificada!' });
        }

        // Verifica ITENS
        const [itemRows] = await connection.query('SELECT IdOrdemServicoItem, Qtde, AreaPintura, Peso FROM ordemservicoitem WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (itemRows.length === 0) {
            return res.status(400).json({ success: false, message: 'NÃƒÂ£o hÃƒÂ¡ itens a serem alterados!' });
        }

        for (const item of itemRows) {
            let qtdeNum = parseFloat(item.Qtde) || 0;
            if (qtdeNum === 0) qtdeNum = 1; // avoid division by zero if Data was bad

            const areaUnit = (parseFloat(item.AreaPintura) || 0) / qtdeNum;
            const pesoUnit = (parseFloat(item.Peso) || 0) / qtdeNum;

            const newQtdeTotal = qtdeNum * fator;
            const newArea = areaUnit * fator;
            const newPeso = pesoUnit * fator;

            await connection.query(`
                UPDATE ordemservicoitem 
                SET QtdeTotal = ?, AreaPintura = ?, Peso = ?, Fator = ?
                WHERE IdOrdemServicoItem = ?
            `, [newQtdeTotal, newArea, newPeso, fator, item.IdOrdemServicoItem]);
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

app.post('/api/ordemservico/liberar', async (req, res) => {
    const { IdOrdemServico, IdTag, IdProjeto, Fator, EnderecoOrdemServico, TipoLiberacao } = req.body;
    let connection;
    try {
        if (!IdOrdemServico || !Fator || !EnderecoOrdemServico || !TipoLiberacao) {
            return res.status(400).json({ success: false, message: 'ParÃƒÂ¢metros obrigatÃƒÂ³rios ausentes.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Validar Produto Principal
        const [produtoPrincipal] = await connection.execute(
            `SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE IdOrdemServico = ? AND ProdutoPrincipal = 'sim' LIMIT 1`,
            [IdOrdemServico]
        );
        if (produtoPrincipal.length === 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Verifique se hÃƒÂ¡ um produto principal para a Ordem de ServiÃƒÂ§o cadastrado.' });
        }

        // 2. Limpar DiretÃƒÂ³rios e Copiar Arquivos
        const [items] = await connection.execute(
            `SELECT EnderecoArquivo FROM ordemservicoitem WHERE IdOrdemServico = ? AND EnderecoArquivo IS NOT NULL AND EnderecoArquivo != ''`,
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
                filePath = filePath.replace(/##/g, '\\');

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
        const dataatual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        await connection.execute(
            `UPDATE ordemservico SET Liberado_Engenharia = 'S', Data_Liberacao_Engenharia = ? WHERE IdOrdemServico = ?`,
            [dataatual, IdOrdemServico]
        );
        await connection.execute(
            `UPDATE ordemservicoitem SET Liberado_Engenharia = 'S', Data_Liberacao_Engenharia = ? WHERE IdOrdemServico = ?`,
            [dataatual, IdOrdemServico]
        );

        // 4. Fluxo Parcial/Total
        if (TipoLiberacao === 'Total') {
            const [tagsResult] = await connection.execute(
                `SELECT SaldoTag, QtdeLiberada FROM tags WHERE IdTag = ?`,
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
                `UPDATE tags SET QtdeLiberada = ?, SaldoTag = ? WHERE IdTag = ?`,
                [novoQtdeLiberada, novoSaldoTag, IdTag]
            );

            await connection.execute(
                `UPDATE ordemservico SET TipoLiberacaoOrdemServico = 'Total' WHERE IdOrdemServico = ?`,
                [IdOrdemServico]
            );
        } else {
            await connection.execute(
                `UPDATE ordemservico SET TipoLiberacaoOrdemServico = 'Parcial' WHERE IdOrdemServico = ?`,
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
                    { header: 'DescriÃƒÂ§ÃƒÂ£o', key: 'desc', width: 50 },
                    { header: 'Qtde', key: 'qtde', width: 10 },
                    { header: 'Peso', key: 'peso', width: 15 },
                    { header: 'Liberado', key: 'lib', width: 10 }
                ];

                const [itensData] = await connection.execute(`SELECT * FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')`, [IdOrdemServico]);
                itensData.forEach((it) => {
                    worksheet.addRow({
                        cod: it.CodMatFabricante,
                        desc: it.DescResumo || it.DescDetal,
                        qtde: it.QtdeTotal,
                        peso: it.Peso,
                        lib: it.Liberado_Engenharia
                    });
                });

                const excelPath = path.join(EnderecoOrdemServico, `Exportacao_Padrao_OS${IdOrdemServico}.xlsx`);
                await workbook.xlsx.writeFile(excelPath);
            }
        } catch (excelErr) {
            console.error('Erro ao gerar Excel de liberaÃƒÂ§ÃƒÂ£o:', excelErr);
        }

        await connection.commit();
        res.json({ success: true, message: 'Ordem de serviÃƒÂ§o liberada com sucesso.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao liberar OS:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao liberar Ordem de ServiÃƒÂ§o.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/ordemservico/:id/itens', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, DescResumo, DescDetal, Fator,
                QtdeTotal, Peso, AreaPintura, Acabamento, Unidade,
                Espessura, Altura, Largura,
                CodMatFabricante, MaterialSW, EnderecoArquivo,
                ProdutoPrincipal,
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

// --- Apontamento de ProduÃ¯Â¿Â½Ã¯Â¿Â½o ---

// Mapeamento de setores para colunas
const setorColumns = {
    corte: { txt: 'txtCorte', percentual: 'CortePercentual', status: 'sttxtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' },
    dobra: { txt: 'txtDobra', percentual: 'DobraPercentual', status: 'sttxtDobra', total: 'DobraTotalExecutado', executar: 'DobraTotalExecutar' },
    solda: { txt: 'txtSolda', percentual: 'SoldaPercentual', status: 'sttxtSolda', total: 'SoldaTotalExecutado', executar: 'SoldaTotalExecutar' },
    pintura: { txt: 'txtPintura', percentual: 'PinturaPercentual', status: 'sttxtPintura', total: 'PinturaTotalExecutado', executar: 'PinturaTotalExecutar' },
    montagem: { txt: 'TxtMontagem', percentual: 'MontagemPercentual', status: 'sttxtMontagem', total: 'MontagemTotalExecutado', executar: 'MontagemTotalExecutar' },
    mapa: { txt: 'txtCorte', percentual: 'CortePercentual', status: 'sttxtCorte', total: 'CorteTotalExecutado', executar: 'CorteTotalExecutar' }
};

// GET: Mapa da ProduÃ¯Â¿Â½Ã¯Â¿Â½o - visÃ¯Â¿Â½o geral de todos os processos
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
        res.status(500).json({ success: false, message: 'Erro ao carregar mapa de produÃ¯Â¿Â½Ã¯Â¿Â½o' });
    }
});

// LIST: Itens por setor para apontamento
app.get('/api/apontamento/:setor', async (req, res) => {
    const setor = req.params.setor.toLowerCase();
    const setorConfig = setorColumns[setor];

    if (!setorConfig) {
        return res.status(400).json({
            success: false,
            message: 'Setor invÃ¯Â¿Â½lido. Use: corte, dobra, solda, pintura ou montagem'
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

// GET: Ordens de ServiÃ¯Â¿Â½o para dropdown de apontamento
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

// GET: Detalhes de um item + histÃ¯Â¿Â½rico de apontamentos
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
    osi.EnderecoArquivoItemOrdemServico,
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
            return res.status(404).json({ success: false, message: 'Item nÃ¯Â¿Â½o encontrado' });
        }

        const item = itemRows[0];

        // Buscar histÃ¯Â¿Â½rico de apontamentos baseando-se na viewordemservicoitemcontrole conforme sistema legado (VB.NET)
        // Ignoramos a filtragem por processo aqui para manter a compatibilidade com a visualizaÃ¯Â¿Â½Ã¯Â¿Â½o completa
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

// POST: Registrar apontamento de produÃ¯Â¿Â½Ã¯Â¿Â½o
app.post('/api/apontamento', async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({
            success: false,
            message: 'IdOrdemServicoItem, Processo e QtdeProduzida sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios'
        });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const isMapa = Processo.toLowerCase() === 'mapa';
    const setorAtivo = !isMapa ? Processo.toLowerCase() : null;

    if (!isMapa && !setorColumns[setorAtivo]) {
        return res.status(400).json({ success: false, message: 'Processo invÃ¯Â¿Â½lido' });
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
            return res.status(404).json({ success: false, message: 'Item nÃ¯Â¿Â½o encontrado' });
        }

        const item = itemRows[0];
        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;

        // Sectors to process: If Mapa, process ALL 5 sectors. If individual, only the active one.
        const setoresParaProcessar = isMapa
            ? ['corte', 'dobra', 'solda', 'pintura', 'montagem']
            : [setorAtivo];

        if (setoresParaProcessar.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Este item nÃ¯Â¿Â½o possui setores ativos para apontar' });
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
                    return res.status(400).json({ success: false, message: `NÃ¯Â¿Â½o hÃ¯Â¿Â½ saldo a executar para o setor ${sName}.` });
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
            return res.status(404).json({ success: false, message: 'Apontamento nÃ¯Â¿Â½o encontrado' });
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
        res.status(500).json({ success: false, message: 'Erro ao buscar estatÃ¯Â¿Â½sticas' });
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


// ConfiguraÃ¯Â¿Â½Ã¯Â¿Â½o - GET
app.get('/api/config', async (req, res) => {
    try {
        // Tentar buscar colunas do SincoWeb. Se nÃƒÂ£o existirem (banco legado), retornar padrÃƒÂ£o.
        const [rows] = await pool.execute(
            'SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1'
        );
        if (rows.length > 0) {
            res.json({ success: true, config: rows[0] });
        } else {
            res.json({ success: true, config: {
                RestringirApontamentoSemSaldoAnterior: 'NÃƒÂ£o',
                ProcessosVisiveis: '["corte","dobra","solda","pintura","montagem"]'
            }});
        }
    } catch (error) {
        // Banco legado (ex: alfatec2) nÃƒÂ£o tem essas colunas Ã¢â‚¬â€ retorna config padrÃƒÂ£o sem erro
        if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_NO_SUCH_TABLE') {
            console.warn('[Config GET] Banco com estrutura legada, usando defaults:', error.message);
            return res.json({ success: true, config: {
                RestringirApontamentoSemSaldoAnterior: 'NÃƒÂ£o',
                ProcessosVisiveis: '["corte","dobra","solda","pintura","montagem"]'
            }, _legacyDb: true });
        }
        console.error('Config error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar configuraÃƒÂ§ÃƒÂµes' });
    }
});

// PUT /api/config - Salvar configuraÃƒÂ§ÃƒÂµes do sistema
app.put('/api/config', async (req, res) => {
    try {
        const { restringirApontamento, processosVisiveis } = req.body;
        
        // Verificar se as colunas existem antes de tentar atualizar (bancos legados nÃƒÂ£o as tÃƒÂªm)
        let [cols] = [];
        try {
            [cols] = await pool.execute(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = 'configuracaosistema'
                 AND COLUMN_NAME IN ('RestringirApontamentoSemSaldoAnterior','ProcessosVisiveis')`
            );
        } catch (e) {
            cols = [];
        }

        if (!cols || cols.length === 0) {
            // Banco legado: nÃƒÂ£o tem as colunas, preferÃƒÂªncias sÃƒÂ³ ficam no localStorage
            return res.json({
                success: true,
                _legacyDb: true,
                message: 'PreferÃƒÂªncias salvas localmente (banco nÃƒÂ£o suporta configuraÃƒÂ§ÃƒÂµes centralizadas)'
            });
        }

        const colNames = cols.map(c => c.COLUMN_NAME);
        const [existing] = await pool.execute('SELECT id FROM configuracaosistema LIMIT 1');
        
        if (existing.length > 0) {
            const updates = [];
            const params = [];
            if (restringirApontamento !== undefined && colNames.includes('RestringirApontamentoSemSaldoAnterior')) {
                updates.push('RestringirApontamentoSemSaldoAnterior = ?');
                params.push(restringirApontamento);
            }
            if (processosVisiveis !== undefined && colNames.includes('ProcessosVisiveis')) {
                updates.push('ProcessosVisiveis = ?');
                params.push(processosVisiveis);
            }
            if (updates.length > 0) {
                await pool.execute('UPDATE configuracaosistema SET ' + updates.join(', ') + ' WHERE id = ' + existing[0].id, params);
            }
        } else {
            // Somente insere se as colunas existem
            if (colNames.includes('RestringirApontamentoSemSaldoAnterior') && colNames.includes('ProcessosVisiveis')) {
                await pool.execute(
                    'INSERT INTO configuracaosistema (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis) VALUES (?, ?)',
                    [restringirApontamento || 'NÃƒÂ£o', processosVisiveis || '["corte","dobra","solda","pintura","montagem"]']
                );
            }
        }
        
        res.json({ success: true, message: 'ConfiguraÃƒÂ§ÃƒÂµes salvas com sucesso!' });
    } catch (error) {
        console.error('Config save error:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configuraÃƒÂ§ÃƒÂµes' });
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

// GET /api/config/usuarios - Retornar UsuÃ¯Â¿Â½rios (Colaboradores)
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

// POST /api/producao/pendencia - Gerar PendÃ¯Â¿Â½ncia (AÃ¯Â¿Â½Ã¯Â¿Â½o 2)
app.post('/api/producao/pendencia', async (req, res) => {
    const data = req.body;

    if (!data.idOrdemServicoItem || !data.descricaoPendencia) {
        return res.status(400).json({ success: false, message: 'ID do item e descriÃ¯Â¿Â½Ã¯Â¿Â½o sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios.' });
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
            return res.json({ success: true, message: 'PendÃ¯Â¿Â½ncia finalizada com sucesso!' });
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
            return res.json({ success: true, message: 'PendÃ¯Â¿Â½ncia atualizada com sucesso!' });
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
        res.json({ success: true, message: 'PendÃ¯Â¿Â½ncia gerada com sucesso!' });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[POST /api/producao/pendencia] Error:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar pendÃ¯Â¿Â½ncia.' });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/producao/pendencias/historico - Listar pendÃ¯Â¿Â½ncias vinculadas a um item (por CodMatFabricante)
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
        res.status(500).json({ success: false, message: 'Erro ao buscar histÃ¯Â¿Â½rico' });
    }
});

// POST /api/producao/reposicao - Gerar ReposiÃ¯Â¿Â½Ã¯Â¿Â½o
app.post('/api/producao/reposicao', async (req, res) => {
    console.log('[POST /api/producao/reposicao] req.body chamado com:', req.body);
    const { idOrdemServicoItem, qtdeReposicao, motivo, usuario } = req.body;

    if (!idOrdemServicoItem || !qtdeReposicao || qtdeReposicao <= 0) {
        return res.status(400).json({ success: false, message: 'ID do item e quantidade vÃ¯Â¿Â½lida sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios.' });
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
            return res.status(404).json({ success: false, message: 'Item original nÃ¯Â¿Â½o encontrado.' });
        }

        const itemPai = itemRows[0];
        const qtdeAtualReposicao = Number(itemPai.QtdeReposicao) || 0;
        const novaQtdeReposicao = qtdeAtualReposicao + Number(qtdeReposicao);

        // 2. Atualizar quantidade de reposiÃ¯Â¿Â½Ã¯Â¿Â½o no item pai original
        await conn.execute(
            `UPDATE ordemservicoitem SET QtdeReposicao = ? WHERE IdOrdemServicoItem = ?`,
            [novaQtdeReposicao, idOrdemServicoItem].map(p => p === undefined ? '' : p)
        );

        // 3. Preparar inserÃ¯Â¿Â½Ã¯Â¿Â½o do Item de ReposiÃ¯Â¿Â½Ã¯Â¿Â½o Pai
        // Clonar dados do pai ajustando QtdeTotal, Reposicao e campos de status
        const pesoOriginal = parseFloat(itemPai.Peso?.toString().replace(',', '.') || '0');
        // Peso original da peÃ¯Â¿Â½a ou proporcional - VB.NET usa PesoUnitario * entrada. Mas QtdeTotal original do BD jÃ¯Â¿Â½ armazena Qtde do pai.
        // Vamos usar o PesoUnitario calculado se existir ou proporcional.

        let pesoUnitario = parseFloat(itemPai.PesoUnitario?.toString().replace(',', '.') || '0');
        if (pesoUnitario === 0 && Number(itemPai.QtdeTotal) > 0) {
            pesoUnitario = pesoOriginal / Number(itemPai.QtdeTotal);
        }

        const novoQtdeTotal = Number(qtdeReposicao);
        const novoPesoTotal = pesoUnitario * novoQtdeTotal;
        const novoAreaPinturaUnitario = parseFloat(itemPai.AreaPinturaUnitario?.toString().replace(',', '.') || '0');
        const novaAreaPinturaTotal = novoAreaPinturaUnitario * novoQtdeTotal;

        // Limpar status de execuÃ¯Â¿Â½Ã¯Â¿Â½o dos diversos setores conforme o VB
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
        // Optamos por simular o log mÃ¯Â¿Â½nimo na ordemservicoitempendencia ou ordemservicoitemcontrole
        await conn.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor, DataCriacao, D_E_L_E_T_E, DescricaoEstorno
            ) VALUES (?, ?, 'Reposicao', ?, ?, ?, '', 'GEROU REPOSICAO')`,
            [idOrdemServicoItem, itemPai.IdOrdemServico, novoQtdeTotal, usuario || 'Sistema', nowFormat].map(p => p === undefined ? '' : p)
        );

        await conn.commit();
        res.json({ success: true, message: `ReposiÃ¯Â¿Â½Ã¯Â¿Â½o gerada com sucesso! ${novoQtdeTotal} itens clonados para a nova reposiÃ¯Â¿Â½Ã¯Â¿Â½o.` });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[API] Error in POST /api/producao/reposicao:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar reposiÃ¯Â¿Â½Ã¯Â¿Â½o: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});

// ConfiguraÃ¯Â¿Â½Ã¯Â¿Â½o - UPDATE
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

// --- CRUD: UsuÃ¯Â¿Â½rios ---

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
        res.status(500).json({ success: false, message: 'Erro ao listar usuÃ¯Â¿Â½rios' });
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
            res.status(404).json({ success: false, message: 'UsuÃ¯Â¿Â½rio nÃ¯Â¿Â½o encontrado' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usuÃ¯Â¿Â½rio' });
    }
});

// CREATE User
app.post('/api/usuario', async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario } = req.body;

    if (!NomeCompleto || !Login || !Senha || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login, Senha e Tipo sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios' });
    }

    try {
        // Check if login exists
        const [existing] = await pool.execute('SELECT idUsuario FROM usuario WHERE Login = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = "")', [Login]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Login jÃ¯Â¿Â½ existe' });
        }

        const now = getCurrentDateTimeBR();
        const [result] = await pool.execute(
            'INSERT INTO usuario (NomeCompleto, Login, Senha, TipoUsuario, DataCadastro, CriadoPor, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [NomeCompleto.trim(), Login.trim(), Senha, TipoUsuario, now, 'Sistema', 'A']
        );
        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar usuÃ¯Â¿Â½rio' });
    }
});

// UPDATE User
app.put('/api/usuario/:id', async (req, res) => {
    const id = req.params.id;
    const { NomeCompleto, Login, Senha, TipoUsuario } = req.body;

    if (!NomeCompleto || !Login || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Tipo sÃ¯Â¿Â½o obrigatÃ¯Â¿Â½rios' });
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
        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuÃ¯Â¿Â½rio' });
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
        res.json({ success: true, message: 'UsuÃ¯Â¿Â½rio excluÃ¯Â¿Â½do' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usuÃ¯Â¿Â½rio' });
    }
});

// --- RNC / PENDÃ¯Â¿Â½NCIA ROMANEIO ---

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
            return res.status(404).json({ success: false, message: 'Item do romaneio nÃ¯Â¿Â½o encontrado' });
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
        res.status(500).json({ success: false, message: 'Erro ao listar pendÃ¯Â¿Â½ncias' });
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
                return res.status(400).json({ success: false, message: 'PendÃ¯Â¿Â½ncia jÃ¯Â¿Â½ Finalizada!' });
            }
        }

        // 2. Validate mandatory Sector
        if (!data.setorResponsavel) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Informe Setor ResponsÃ¯Â¿Â½vel pela PendÃ¯Â¿Â½ncia!' });
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
            res.json({ success: true, message: 'ConexÃ¯Â¿Â½o bem-sucedida! O banco de dados estÃ¯Â¿Â½ acessÃ¯Â¿Â½vel.' });
        } else {
            res.status(400).json({ success: false, message: 'Falha na conexÃ¯Â¿Â½o. Verifique os dados.' });
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
            throw new Error('Falha ao inicializar o pool com as novas configuraÃ¯Â¿Â½Ã¯Â¿Â½es.');
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

        res.json({ success: true, message: 'ConfiguraÃ¯Â¿Â½Ã¯Â¿Â½o salva e aplicada com sucesso!' });

    } catch (error) {
        console.error('Error saving DB config:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configuraÃ¯Â¿Â½Ã¯Â¿Â½o: ' + error.message });
    }
});

// ============================================================================
// CONTROLE DE EXPEDIÃƒâ€¡ÃƒÆ’O
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

// ABRIR ARQUIVO GENÃƒâ€°RICO (3D, PDF, etc) - SIMULA PROCESS.START DO VB.NET NO SERVIDOR
app.get('/api/controle-expedicao/abrir-arquivo', (req, res) => {
    try {
        let { caminho, tipo } = req.query;

        if (!caminho) {
            return res.status(400).json({ success: false, message: 'Caminho nÃƒÂ£o informado' });
        }

        if (tipo === 'pdf' || tipo === 'dxf') {
            const targetExt = tipo.toLowerCase() === 'pdf' ? '.PDF' : '.DXF';
            const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
            extensoes.forEach(ext => {
                caminho = caminho.split(ext).join(targetExt);
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
            res.status(404).json({ success: false, message: 'Arquivo nÃƒÂ£o existe!!' });
        }
    } catch (error) {
        console.error('Erro exception abrir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ABRIR ISOMÃƒâ€°TRICO (Busca caminho no banco e abre)
app.get('/api/controle-expedicao/abrir-iso', async (req, res) => {
    try {
        const { idTag } = req.query;
        if (!idTag) return res.status(400).json({ success: false, message: 'IdTag nÃƒÂ£o informado' });

        const [rows] = await pool.execute("SELECT CaminhoIsometrico FROM tags WHERE idtag = ?", [idTag]);
        
        if (rows.length > 0 && rows[0].CaminhoIsometrico) {
            const endereco = rows[0].CaminhoIsometrico;
            if (fs.existsSync(endereco)) {
                const { exec } = require('child_process');
                exec(`start "" "${endereco}"`, (error) => {
                    if (error) {
                        return res.status(500).json({ success: false, message: 'Erro ao executar isomÃƒÂ©trico' });
                    }
                    res.json({ success: true, message: 'IsomÃƒÂ©trico aberto com sucesso' });
                });
            } else {
                res.status(404).json({ success: false, message: 'Arquivo referenciado na base de dados nÃƒÂ£o existe!!' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Nenhum caminho isomÃƒÂ©trico encontrado para esta Tag.' });
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
        return res.status(400).json({ success: false, message: 'Dados invÃƒÂ¡lidos.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const dataAtual = getCurrentDateTimeBR();

        let qtdExpedidaGeral = 0;

        // 4 e 5: a quantidade digitada serÃƒÂ¡ acrescida ao campo de total de expediÃƒÂ§ÃƒÂ£o
        // Se na primeira atualizaÃƒÂ§ÃƒÂ£o a data de realizado inicio estiver vazia, atualizar.
        // 6: Se qtde entrada + total expediÃƒÂ§ÃƒÂ£o == qtde total, atualizar realizado final.

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
        console.error('Erro ao apontar expediÃƒÂ§ÃƒÂ£o:', error);
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
            console.warn(`[Excel] Planilha template nÃƒÂ£o encontrada: ${templatePath}`);
            return res.status(400).json({ success: false, message: 'A planilha template nÃƒÂ£o foi encontrada no caminho configurado.' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const worksheet = workbook.getWorksheet(1); // Pega a primeira aba
        
        // CabeÃƒÂ§alho (BH2 = Data, BH3 = Usuario)
        const nowFormatted = new Date().toLocaleDateString('pt-BR');
        worksheet.getCell('BH2').value = nowFormatted;
        worksheet.getCell('BH3').value = usuario || 'Sistema';

        // Linha 12 tem a formataÃƒÂ§ÃƒÂ£o base, copiamos os valores a partir da linha 13
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
        console.log(`[Excel] RelatÃƒÂ³rio de tarefas gerado e baixado (${tarefas?.length || 0} itens)`);

    } catch (error) {
        console.error('[Excel Tarefas] Erro ao exportar:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erro ao gerar relatÃƒÂ³rio Excel: ' + error.message });
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
                 IF(Liberado_Engenharia = 'S' OR Liberado_Engenharia = 'SIM', 'SIM', 'NÃƒÆ’O') AS Liberado_Engenharia,
                 Data_Liberacao_Engenharia,
                 IF(OrdemServicoItemFinalizado = 'C' OR OrdemServicoItemFinalizado = 'SIM' OR OrdemServicoItemFinalizado = 'S', 'SIM', 'NÃƒÆ’O') AS OrdemServicoItemFinalizado,
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

// --- APIs de Desenho (PDF, DXF, 3D) ---
const resolveDrawingPath = (basePath, type) => {
    if (!basePath) return '';
    let resolved = basePath;
    const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
    const target = type.toUpperCase() === 'PDF' ? '.PDF' : type.toUpperCase() === 'DXF' ? '.DXF' : '.SLDPRT';
    
    for (const ext of extensoes) {
        resolved = resolved.replace(ext, target);
    }
    return resolved;
};

app.get('/api/ordemservicoitem/check-file', (req, res) => {
    try {
        const { path: filePath, type } = req.query;
        if (!filePath) return res.json({ exists: false });
        
        const fs = require('fs');
        const resolvedPath = resolveDrawingPath(filePath, type || 'pdf');
        
        if (fs.existsSync(resolvedPath)) {
            return res.json({ exists: true, resolvedPath });
        } else {
            return res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ exists: false, error: err.message });
    }
});

// Sem autenticaÃƒÂ§ÃƒÂ£o obrigatÃƒÂ³ria para facilitar window.open em nova guia. Ideal: usar tokens em querystring se necessÃƒÂ¡rio.
app.get('/api/pdf', (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) return res.status(400).send('Path is required');
        
        const fs = require('fs');
        const resolvedPath = resolveDrawingPath(filePath, 'pdf');
        
        if (fs.existsSync(resolvedPath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            const stream = fs.createReadStream(resolvedPath);
            stream.pipe(res);
        } else {
            res.status(404).send('<script>alert("Arquivo PDF nÃƒÂ£o encontrado!"); window.close();</script>');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/download', (req, res) => {
    try {
        const { path: filePath, type } = req.query;
        if (!filePath || !type) return res.status(400).send('Path and type are required');
        
        const fs = require('fs');
        const resolvedPath = resolveDrawingPath(filePath, type);
        
        if (fs.existsSync(resolvedPath)) {
            const fileName = require('path').basename(resolvedPath);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            const stream = fs.createReadStream(resolvedPath);
            stream.pipe(res);
        } else {
            res.status(404).send('<script>alert("Arquivo nÃƒÂ£o encontrado!"); window.close();</script>');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- ÃƒÂcone 5: Excluir linha OS ---
app.delete('/api/ordemservicoitem/:id', async (req, res) => {
    let connection = null;
    try {
        const id = req.params.id;
        connection = await (req.tenantDbPool || pool).getConnection();
        
        const [rows] = await connection.execute("SELECT Liberado_Engenharia FROM ordemservicoitem WHERE IdOrdemServicoItem = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Item nÃƒÂ£o encontrado.' });
        
        if (rows[0].Liberado_Engenharia === 'S' || rows[0].Liberado_Engenharia === 'SIM') {
            return res.status(400).json({ success: false, message: 'Item da Ordem ServiÃƒÂ§o nÃƒÂ£o pode ser excluido, O.S. jÃƒÂ¡ liberada! Verifique!' });
        }
        
        const usuarioDesc = req.user?.nome || 'Sistema';
        
        const [updateRes] = await connection.execute(
            `UPDATE ordemservicoitem 
             SET d_e_l_e_t_e = '*', UsuÃƒÂ¡riod_e_l_e_t_e = ?, datad_e_l_e_t_e = NOW() 
             WHERE IdOrdemServicoItem = ?`,
            [usuarioDesc, id]
        );
        
        if (updateRes.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Item nÃƒÂ£o excluÃƒÂ­do, verifique.' });
        }
        
        res.json({ success: true, message: 'Item excluÃƒÂ­do com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir item OS:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// TESTE FINAL MONTAGEM
// ============================================================================
app.get('/api/teste-final-montagem/itens', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        const modo = req.query.modo === 'concluidos' ? 'concluidos' : 'pendentes';

        // Limite de registros: vem do frontend (localStorage maxRegistros), com fallback de 500
        const limitParam = parseInt(req.query.limit) || 500;
        const limite = (limitParam > 0 && limitParam <= 10000) ? limitParam : 500;

        // Filtros opcionais
        const { IdOrdemServico, IdOrdemServicoItem, Projeto, Tag, DescResumo,
                DescDetal, CodMatFabricante, IdPlanoDeCorte } = req.query;

        let whereClause = `EnderecoArquivo <> '' AND EnderecoArquivo IS NOT NULL
            AND (Liberado_Engenharia IS NOT NULL AND Liberado_Engenharia <> '')`;

        if (modo === 'concluidos') {
            whereClause += ` AND (txtmontagem = '1')
                AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '' OR OrdemServicoItemFinalizado = 'C')`;
        } else {
            whereClause += ` AND ((sttxtMontagem IS NULL OR sttxtMontagem = '') AND txtmontagem = '1')
                AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '')`;
        }

        const params = [];
        if (IdOrdemServico)    { whereClause += ' AND IdOrdemServico LIKE ?';     params.push(`%${IdOrdemServico}%`); }
        if (IdOrdemServicoItem){ whereClause += ' AND IdOrdemServicoItem LIKE ?'; params.push(`%${IdOrdemServicoItem}%`); }
        if (Projeto)           { whereClause += ' AND Projeto LIKE ?';            params.push(`%${Projeto}%`); }
        if (Tag)               { whereClause += ' AND Tag LIKE ?';               params.push(`%${Tag}%`); }
        if (DescResumo)        { whereClause += ' AND DescResumo LIKE ?';         params.push(`%${DescResumo}%`); }
        if (DescDetal)         { whereClause += ' AND DescDetal LIKE ?';          params.push(`%${DescDetal}%`); }
        if (CodMatFabricante)  { whereClause += ' AND CodMatFabricante LIKE ?';   params.push(`%${CodMatFabricante}%`); }
        if (IdPlanoDeCorte)    { whereClause += ' AND IdPlanoDeCorte LIKE ?';     params.push(`%${IdPlanoDeCorte}%`); }

        const query = `
            SELECT
                CodMatFabricante,
                IdOrdemServico,
                IdOrdemServicoItem,
                IdProjeto,
                Projeto,
                IdTag,
                Tag,
                DescTag,
                Qtdetotal          AS QtdeTotal,
            LIMIT ${limite}
        `;

        const [rows] = await connection.execute(query, params);
        res.json({ success: true, data: rows, modo, total: rows.length });
    } catch (err) {
        console.error('[TesteFinalMontagem] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ----------------------------------------------------------------------------
// TESTE FINAL MONTAGEM Ã¢â‚¬â€ LanÃƒÂ§ar quantidade testada
// ----------------------------------------------------------------------------
app.post('/api/teste-final-montagem/lancar', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { IdOrdemServicoItem, IdOrdemServico, IdTag, entrada: entradaRaw, usuario } = req.body;
        const entrada = Number(entradaRaw);

        if (!IdOrdemServicoItem || !entrada) {
            return res.status(400).json({ success: false, message: 'ParÃƒÂ¢metros invÃƒÂ¡lidos.' });
        }

        // 1. Buscar dados atuais do item
        const [[item]] = await connection.execute(
            `SELECT IdOrdemServico, IdOrdemServicoItem, QtdeTotal, ProdutoPrincipal,
                    MontagemTotalExecutado, MontagemTotalExecutar,
                    sttxtMontagem, OrdemServicoItemFinalizado, RealizadoInicioMontagem
             FROM ordemservicoitem WHERE IdOrdemServicoItem = ? LIMIT 1`,
            [IdOrdemServicoItem]
        );

        if (!item) return res.status(404).json({ success: false, message: 'Item nÃƒÂ£o encontrado.' });

        // 2. ValidaÃƒÂ§ÃƒÂµes
        if (item.OrdemServicoItemFinalizado === 'C') {
            return res.json({ success: false, message: 'Item jÃƒÂ¡ finalizado!' });
        }
        if (item.sttxtMontagem === 'C') {
            return res.json({ success: false, message: 'Item jÃƒÂ¡ finalizado no setor de Montagem!' });
        }

        // Tag finalizada?
        if (IdTag) {
            const [[tagRow]] = await connection.execute(
                'SELECT Finalizado FROM tags WHERE idtag = ? LIMIT 1', [IdTag]
            );
            if (tagRow && tagRow.Finalizado && tagRow.Finalizado !== '') {
                return res.json({ success: false, message: 'Tag jÃƒÂ¡ Finalizada!' });
            }
        }

        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const executadoAtual = Number(item.MontagemTotalExecutado) || 0;

        // Validar entrada
        if (isNaN(entrada) || entrada <= 0 || entrada > qtdeTotal) {
            return res.json({ success: false, message: 'Valor informado invÃƒÂ¡lido!' });
        }

        const novoExecutado = executadoAtual + entrada;
        const novoExecutar  = Math.max(0, (Number(item.MontagemTotalExecutar) || 0) - entrada);
        const percentual    = qtdeTotal > 0 ? ((novoExecutado / qtdeTotal) * 100).toFixed(2) : '0';
        const agora         = new Date().toLocaleString('pt-BR');     // datetime completo para campos Realizado*
        const agoraData     = new Date().toLocaleDateString('pt-BR'); // somente data (DD/MM/YYYY, 10 chars) para campos Data*
        // Conclui SOMENTE quando o total executado atingir a quantidade total do item
        const concluido     = novoExecutado >= qtdeTotal;

        if (concluido) {
            // Ã¢â€â‚¬Ã¢â€â‚¬ CONCLUSÃƒÆ’O DO SETOR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
            await connection.execute(
                `UPDATE ordemservicoitem SET
                    MontagemTotalExecutado   = ?,
                    MontagemTotalExecutar    = 0,
                    MontagemPercentual       = 100,
                    sttxtMontagem            = 'C',
                    RealizadoFinalMontagem   = ?,
                    DataFinalMontagem        = ?
                 WHERE IdOrdemServicoItem = ?`,
                [novoExecutado, agora, agoraData, IdOrdemServicoItem]
            );

            // Preencher inÃƒÂ­cio se vazio
            if (!item.RealizadoInicioMontagem) {
                await connection.execute(
                    `UPDATE ordemservicoitem SET RealizadoInicioMontagem = ? WHERE IdOrdemServicoItem = ?`,
                    [agora, IdOrdemServicoItem]
                );
            }

            // Atualizar tags
            if (IdTag) {
                await connection.execute(
                    `UPDATE tags SET
                        RealizadoInicioMontagem = COALESCE(NULLIF(RealizadoInicioMontagem,''), ?),
                        RealizadoFinalMontagem  = ?,
                        MontagemTotalExecutado  = ?
                     WHERE idtag = ?`,
                    [agora, agora, novoExecutado, IdTag]
                );
            }

            // Verificar setores pendentes via view
            const [[statusRow]] = await connection.execute(
                `SELECT Resultado FROM viewordemservicoitemstatussetor WHERE IDOrdemServicoItem = ? LIMIT 1`,
                [IdOrdemServicoItem]
            ).catch(() => [[null]]);

            const setoresPendentes = statusRow ? Number(statusRow.Resultado) : 1;

            let itemFinalizado = false;
            let osFinalizada   = false;

            if (setoresPendentes === 0) {
                // Finalizar o item
                await connection.execute(
                    `UPDATE ordemservicoitem SET OrdemServicoItemFinalizado = 'C', DataFinalizado = ?
                     WHERE IdOrdemServicoItem = ?`,
                    [agoraData, IdOrdemServicoItem]
                );
                itemFinalizado = true;

                // Se Produto Principal, finalizar todos itens da OS
                if (item.ProdutoPrincipal === 'SIM' || item.ProdutoPrincipal === 'S') {
                    await connection.execute(
                        `UPDATE ordemservicoitem SET
                            OrdemServicoItemFinalizado = 'C', DataFinalizado = ?,
                            MontagemTotalExecutado = QtdeTotal, MontagemTotalExecutar = 0, MontagemPercentual = 100
                         WHERE IdOrdemServico = ? AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '')`,
                        [agoraData, IdOrdemServico]
                    );
                }

                // Verificar se todos itens da OS foram concluÃƒÂ­dos
                const [[countRow]] = await connection.execute(
                    `SELECT COUNT(IdOrdemServicoItem) as pendentes FROM ordemservicoitem
                     WHERE IdOrdemServico = ?
                       AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '')`,
                    [IdOrdemServico]
                );

                if (Number(countRow.pendentes) === 0) {
                    await connection.execute(
                        `UPDATE ordemservico SET OrdemServicoFinalizado = 'S', DataFinalizado = ?
                         WHERE IdOrdemServico = ?`,
                        [agoraData, IdOrdemServico]
                    );
                    osFinalizada = true;
                }
            }

            await connection.commit();
            return res.json({
                success: true,
                concluido: true,
                itemFinalizado,
                osFinalizada,
                novoExecutado,
                novoExecutar: 0,
                percentual: '100',
                message: itemFinalizado
                    ? (osFinalizada ? 'Item finalizado! Ordem de Servico encerrada!' : 'Item finalizado com sucesso!')
                    : 'Setor Montagem concluido!'
            });

        } else {
            // Parcial
            const inicioUpdate = !item.RealizadoInicioMontagem ? agora : item.RealizadoInicioMontagem;

            await connection.execute(
                `UPDATE ordemservicoitem SET
                    MontagemTotalExecutado   = ?,
                    MontagemTotalExecutar    = ?,
                    MontagemPercentual       = ?,
                    RealizadoInicioMontagem  = ?
                 WHERE IdOrdemServicoItem = ?`,
                [novoExecutado, novoExecutar, parseFloat(percentual), inicioUpdate, IdOrdemServicoItem]
            );

            await connection.commit();
            return res.json({
                success: true,
                concluido: false,
                novoExecutado,
                novoExecutar,
                percentual,
                message: 'Lancamento salvo com sucesso!'
            });
        }

    } catch (err) {
        if (connection) await connection.rollback().catch(() => {});
        console.error('[TesteFinalMontagem/Lancar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao salvar: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Lista para tela de MONTAGEM
// GET /api/plano-corte/lista
// ============================================================================
app.get('/api/plano-corte/lista', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        const { Espessura, MaterialSW, exibirConcluidos, IdPlanodecorte, descplanodecorte } = req.query;
        const mostrarTodos = exibirConcluidos === 'true';

        // ============================
        // FILTROS — espelho do VB.NET (tela Montagem)
        // ============================
        const filtros = [];
        const params = [];

        if (IdPlanodecorte) {
            filtros.push('IdPlanodecorte = ?');
            params.push(Number(IdPlanodecorte));
        }

        // Sempre: não deletados
        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");

        if (!mostrarTodos) {
            // PENDENTES (padrão): planos ainda não enviados para corte e não concluídos
            // Equiv. VB: AND (concluido = '' OR concluido is null) AND (enviadocorte = '' or enviadocorte is null)
            filtros.push("(Concluido = '' OR Concluido IS NULL)");
            filtros.push("(EnviadoCorte = '' OR EnviadoCorte IS NULL)");
        }
        // chkTodos=true: sem restrição extra — mostra todos os planos ativos

        if (descplanodecorte) { filtros.push('descplanodecorte LIKE ?'); params.push(`%${descplanodecorte}%`); }
        if (Espessura)        { filtros.push('Espessura LIKE ?');        params.push(`%${Espessura}%`); }
        if (MaterialSW)       { filtros.push('MaterialSW LIKE ?');       params.push(`%${MaterialSW}%`); }

        const sql = `
            SELECT IdPlanodecorte, DescPlanodecorte, Espessura, MaterialSW,
                   DataCad, DataLimite, CriadoPor, EnviadoCorte AS Enviadocorte, Concluido,
                   EnderecoCompletoPlanoCorte, DataLiberacao, UsuarioLiberacao,
                   DataInicial, DataFinal, QtdeTotalPecas, QtdeTotalPecasExecutadas
            FROM planodecorte
            WHERE ${filtros.join(' AND ')}
            GROUP BY IdPlanodecorte
            ORDER BY IdPlanodecorte DESC
        `;

        const [rows] = await connection.execute(sql, params);

        if (rows.length === 0) {
            return res.json({ success: true, data: [], total: 0, message: 'Nenhum plano localizado.' });
        }
        res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        console.error('[PlanoCorte/Lista-Montagem] Erro:', err.message);
        res.json({ success: false, data: [], message: 'Erro ao carregar planos.', error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Lista para tela de PRODUÇÃO (execução fábrica)
// GET /api/producao-plano-corte/lista
//
// Espelha VB.NET — tela de Produção Plano de Corte:
//   SEMPRE filtra EnviadoCorte = 'S'
//   exibirTodos=false (PENDENTES): exclui concluídos
//   exibirTodos=true  (TODOS):     mostra todos enviados, concluídos ou não
// ============================================================================
app.get('/api/producao-plano-corte/lista', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        const { Espessura, MaterialSW, exibirConcluidos, exibirTodos, IdPlanodecorte, descplanodecorte } = req.query;
        const mostrarConcluidos = exibirConcluidos === 'true' || exibirTodos === 'true';

        const filtros = [];
        const params = [];

        if (IdPlanodecorte) {
            filtros.push('IdPlanodecorte = ?');
            params.push(Number(IdPlanodecorte));
        }

        // Sempre: não deletados + SEMPRE enviados para corte
        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");
        filtros.push("(EnviadoCorte = 'S')");

        // PENDENTES: também exclui concluídos
        // Equiv. VB: filtros.Add("(Concluido = '' OR Concluido IS NULL)")
        if (!mostrarConcluidos) {
            filtros.push("(Concluido = '' OR Concluido IS NULL)");
        }

        if (descplanodecorte) { filtros.push('descplanodecorte LIKE ?'); params.push(`%${descplanodecorte}%`); }
        if (Espessura)        { filtros.push('Espessura LIKE ?');        params.push(`%${Espessura}%`); }
        if (MaterialSW)       { filtros.push('MaterialSW LIKE ?');       params.push(`%${MaterialSW}%`); }

        const sql = `
            SELECT IdPlanodecorte, DescPlanodecorte, Espessura, MaterialSW,
                   DataCad, DataLimite, CriadoPor, EnviadoCorte AS Enviadocorte, Concluido,
                   EnderecoCompletoPlanoCorte, DataLiberacao, UsuarioLiberacao,
                   LiberacaoParaCorte, DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte,
                   DataInicial, DataFinal, QtdeTotalPecas, QtdeTotalPecasExecutadas,
                   Percentual
            FROM planodecorte
            WHERE ${filtros.join(' AND ')}
            ORDER BY IdPlanodecorte DESC
        `;

        const [rows] = await connection.execute(sql, params);

        if (rows.length === 0) {
            return res.json({
                success: true, data: [], total: 0,
                message: 'Nenhum plano de corte localizado para os filtros informados.'
            });
        }
        res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        console.error('[PlanoCorte/Lista-Producao] Erro:', err.message);
        res.json({
            success: false,
            data: [],
            message: 'Aviso: Não foi possível carregar a lista de planos de corte no momento.',
            error: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Itens disponíveis para Montagem
// ============================================================================
app.get('/api/plano-corte/itens-disponiveis', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;

        // Prioridade: 1) query param (enviado pelo frontend com base no AppConfig)
        //             2) leitura do DB (fallback)
        let tipoFiltro = req.query.tipoFiltro;
        if (!tipoFiltro || (tipoFiltro !== 'corte' && tipoFiltro !== 'chaparia')) {
            try {
                const [cfgRows] = await tenantPool.execute('SELECT PlanoCorteFiltroDC FROM configuracaosistema LIMIT 1');
                tipoFiltro = (cfgRows.length > 0 && cfgRows[0].PlanoCorteFiltroDC) ? cfgRows[0].PlanoCorteFiltroDC : 'corte';
            } catch (_) { tipoFiltro = 'corte'; }
        }

        console.log(`[PlanoCorte] tipoFiltro ativo: ${tipoFiltro}`);
        
        connection = await tenantPool.getConnection();
        
        let query = `
            SELECT 
                CodMatFabricante    AS CodMatFabricante,
                Espessura           AS Espessura,
                MaterialSW          AS MaterialSW,
                IdEmpresa           AS IdEmpresa,
                DescEmpresa         AS DescEmpresa,
                IdProjeto           AS IdProjeto,
                IdTag               AS IdTag,
                QtdeTotal           AS QtdeTotal,
                IdOrdemServico      AS IdOrdemServico,
                IdOrdemServicoItem  AS IdOrdemServicoItem,
                IdPlanoDeCorte      AS IdPlanoDeCorte,
                Projeto             AS Projeto,
                Tag                 AS Tag,
                EnderecoArquivo     AS EnderecoArquivo,
                DescTag             AS DescTag,
                DescResumo          AS DescResumo,
                DescDetal           AS DescDetal
            FROM viewordemservicoitem
            WHERE 
                (EnderecoArquivo LIKE '%SLDPRT%' OR EnderecoArquivo LIKE '%PSM%' OR EnderecoArquivo LIKE '%PAR%') 
                AND (Espessura IS NOT NULL AND Espessura <> '')
                AND (MaterialSW IS NOT NULL AND MaterialSW <> '')
                AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '')
                AND (SttxtCorte IS NULL OR SttxtCorte = '')
                AND (IdPlanoDeCorte IS NULL OR IdPlanoDeCorte = '')
                AND Liberado_Engenharia = 'S'
        `;
        
        const params = [];
        
        if (tipoFiltro === 'corte') {
            query += " AND TxtCorte = '1'";
        } else if (tipoFiltro === 'chaparia') {
            query += " AND TxtTipoDesenho = 'CHAPARIA'";
        }

        query += " ORDER BY Projeto ASC, Tag ASC LIMIT 1000";

        const [rows] = await connection.execute(query, params);
        
        res.json({ success: true, data: rows, tipoFiltroAplicado: tipoFiltro });
    } catch (err) {
        console.error('Erro ao buscar itens de plano de corte:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar itens' });
    } finally {
        if (connection) connection.release();
    }
});



// ============================================================================
// PLANO DE CORTE â€” Lista de planos (Etapa 2: Visualizar)
// ============================================================================
// GET /api/producao-plano-corte/lista - Lista de planos (Etapa 2: Visualizar)
app.get(['/api/plano-corte/lista', '/api/producao-plano-corte/lista'], async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        // Parâmetros aceitos (frontend envia 'exibirTodos', mas aceitamos 'exibirConcluidos' também)
        const { Espessura, MaterialSW, exibirConcluidos, exibirTodos, IdPlanodecorte, descplanodecorte } = req.query;
        const mostrarConcluidos = exibirConcluidos === 'true' || exibirTodos === 'true';

        // ============================
        // FILTROS — espelho do VB.NET
        // ============================
        const filtros = [];
        const params = [];

        // Filtro por ID específico (opcional)
        if (IdPlanodecorte) {
            filtros.push('IdPlanodecorte = ?');
            params.push(Number(IdPlanodecorte));
        }

        // Sempre: não deletados + enviados para corte
        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");
        filtros.push("(EnviadoCorte = 'S')");

        // Se não mostrar concluídos (chk não marcado): exclui com concluido preenchido
        // Equiv. VB: filtros.Add("(Concluido = '' OR Concluido IS NULL)")
        if (!mostrarConcluidos) {
            filtros.push("(Concluido = '' OR Concluido IS NULL)");
        }
        // Todos (chk marcado): sem restrição extra — exibe todos os enviados, concluídos ou não

        // Filtros textuais opcionais
        if (descplanodecorte) { filtros.push('descplanodecorte LIKE ?'); params.push(`%${descplanodecorte}%`); }
        if (Espessura)        { filtros.push('Espessura LIKE ?');        params.push(`%${Espessura}%`); }
        if (MaterialSW)       { filtros.push('MaterialSW LIKE ?');       params.push(`%${MaterialSW}%`); }

        // ============================
        // MONTA E EXECUTA SQL
        // ============================
        const sql = `
            SELECT IdPlanodecorte, DescPlanodecorte, Espessura, MaterialSW,
                   DataCad, DataLimite, CriadoPor, EnviadoCorte, Concluido,
                   EnderecoCompletoPlanoCorte, DataLiberacao, UsuarioLiberacao,
                   DataInicial, DataFinal, QtdeTotalPecas, QtdeTotalPecasExecutadas,
                   Percentual
            FROM planodecorte
            WHERE ${filtros.join(' AND ')}
            ORDER BY IdPlanodecorte DESC
        `;

        const [rows] = await connection.execute(sql, params);

        if (rows.length === 0) {
            return res.json({
                success: true,
                data: [],
                total: 0,
                message: 'Nenhum plano de corte localizado para os filtros informados.'
            });
        }

        res.json({ success: true, data: rows, total: rows.length });

    } catch (err) {
        console.error('[PlanoCorte/Lista] Erro:', err.message);
        res.json({
            success: false,
            data: [],
            message: 'Aviso: Não foi possível carregar a lista de planos de corte no momento.',
            error: err.message
        });
    } finally {
        if (connection) connection.release();
    }
});


// ============================================================================
// PLANO DE CORTE — Itens de um plano específico
// Rotas: /api/plano-corte/itens/:idPlano  e  /api/producao-plano-corte/itens/:idPlano
//
// Query params:
//   exibirTodos=true  → todos os itens do plano (incl. concluídos/cortados)
//   exibirTodos=false → apenas pendentes: txtCorte='1' + sttxtCorte vazio + não finalizado
//   Projeto, Tag, DescResumo, CodMatFabricante → filtros textuais
//
// Espelha exatamente a lógica VB.NET:
//   Se NOT ChkConcluidos.Checked:
//     filtros.Add("(txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))"
//     filtros.Add("(ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')"
// ============================================================================
async function _handlePlanoItens(req, res) {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { idPlano } = req.params;
        const { exibirTodos, Projeto, Tag, DescResumo, CodMatFabricante } = req.query;
        const mostrarTodos = exibirTodos === 'true';

        // ============================
        // FILTROS — espelho do VB.NET
        // ============================
        const filtros = [];
        const params = [];

        // Sempre: não deletados
        filtros.push("(d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')");

        // Filtro por plano específico (ChkTodosPC NOT checked no VB)
        filtros.push('idplanodecorte = ?');
        params.push(idPlano);

        if (!mostrarTodos) {
            // PENDENTES: Equiv. VB quando ChkConcluidos NÃO marcado:
            //   filtros.Add("(txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))"
            //   filtros.Add("(ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')"
            filtros.push("(txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))");
            filtros.push("(ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')");
        }
        // TODOS (mostrarTodos=true): sem restrição extra — exibe tudo vinculado ao plano

        // Filtros textuais opcionais
        if (Projeto)          { filtros.push('Projeto LIKE ?');          params.push(`%${Projeto}%`); }
        if (Tag)              { filtros.push('Tag LIKE ?');              params.push(`%${Tag}%`); }
        if (DescResumo)       { filtros.push('DescResumo LIKE ?');       params.push(`%${DescResumo}%`); }
        if (CodMatFabricante) { filtros.push('CodMatFabricante LIKE ?'); params.push(`%${CodMatFabricante}%`); }

        // ============================
        // SELECT — espelho do VB.NET
        // ============================
        const [rows] = await connection.execute(`
            SELECT
                CodMatFabricante, idplanodecorte AS IdPlanodecorte,
                IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,
                IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,
                QtdeTotal, txtCorte,
                COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,
                COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,
                CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '/', QtdeTotal) AS Parcial,
                OrdemServicoItemFinalizado, DescResumo, DescDetal,
                EnderecoArquivo,
                EnderecoArquivoItemOrdemServico,
                qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,
                RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia,
                COALESCE(QtdeReposicao, 0) AS QtdeReposicao
            FROM ordemservicoitem
            WHERE ${filtros.join(' AND ')}
            ORDER BY IdOrdemServicoItem ASC
        `, params);

        res.json({ success: true, data: rows, total: rows.length, exibirTodos: mostrarTodos });
    } catch (err) {
        console.error('[PlanoCorte/Itens] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
}

// Rotas (alias — frontend usa /api/producao-plano-corte/itens/:idPlano)
app.get('/api/plano-corte/itens/:idPlano', _handlePlanoItens);

// POST /api/producao-plano-corte/:id/liberar-producao
// Espelha VB.NET: Liberar Plano de Corte para Produção
// Atualiza LiberacaoParaCorte = 'S', DataLiberacaoParaCorte, UsuarioLiberacaoParaCorte
app.post('/api/producao-plano-corte/:id/liberar-producao', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;
        const usuario = req.user?.NomeCompleto || req.user?.nome || 'Sistema';
        const agora = new Date().toLocaleDateString('pt-BR');

        // Verificar se já foi liberado
        const [[plano]] = await connection.execute(
            'SELECT LiberacaoParaCorte FROM planodecorte WHERE IdPlanodecorte = ?', [id]
        );

        if (!plano) {
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        if (plano.LiberacaoParaCorte === 'S') {
            return res.json({ success: false, message: 'Plano de corte já liberado para produção!' });
        }

        await connection.execute(
            `UPDATE planodecorte SET
                LiberacaoParaCorte = 'S',
                DataLiberacaoParaCorte = ?,
                UsuarioLiberacaoParaCorte = ?
             WHERE IdPlanodecorte = ?`,
            [agora, usuario, id]
        );

        res.json({ success: true, message: 'Plano #' + id + ' liberado para produção com sucesso.' });
    } catch (err) {
        console.error('[Producao/Liberar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao liberar plano para produção.' });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/producao-plano-corte/:id/finalizar
// Espelha VB.NET: Finalizar Plano de Corte
// 1. Marca plano como concluído
// 2. Finaliza compulsoriamente itens pendentes
app.post('/api/producao-plano-corte/:id/finalizar', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;
        const usuario = req.user?.NomeCompleto || req.user?.nome || 'Sistema';
        const agora = new Date();
        const agoraData = formatBR(agora);
        const agoraFull = formatBR(agora, true);

        // 1. Verifica se existe e se já não está concluído
        const [[plano]] = await connection.execute(
            'SELECT Concluido FROM planodecorte WHERE IdPlanodecorte = ?', [id]
        );

        if (!plano) {
            await connection.rollback();
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        if (plano.Concluido && plano.Concluido.trim() !== '') {
            await connection.rollback();
            return res.json({ success: false, message: 'Este plano já se encontra concluído.' });
        }

        // 2. Busca itens pendentes para finalizar (Corte pendente)
        const [itensPendentes] = await connection.execute(
            `SELECT IdOrdemServicoItem, QtdeTotal, TxtDobra, TxtSolda, TxtPintura, TxtMontagem 
             FROM ordemservicoitem 
             WHERE idplanodecorte = ? 
               AND (sttxtcorte IS NULL OR sttxtcorte = '')
               AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')`,
            [id]
        );

        // 3. Finaliza os itens pendentes
        for (const it of itensPendentes) {
            // Atualiza o item de corte como concluído
            await connection.execute(
                `UPDATE ordemservicoitem SET
                    CorteTotalExecutar = 0,
                    CorteTotalExecutado = ?,
                    sttxtcorte = 'C',
                    RealizadoFinalCorte = ?,
                    UsuarioRealizadoFinalCorte = ?
                 WHERE IdOrdemServicoItem = ?`,
                [it.QtdeTotal, agoraFull, usuario, it.IdOrdemServicoItem]
            );

            // Propaga quantidade para próximo setor (Dobra -> Solda -> Pintura -> Montagem)
            let proximoSetorCol = null;
            if (it.TxtDobra === '1') proximoSetorCol = 'DobraTotalExecutar';
            else if (it.TxtSolda === '1') proximoSetorCol = 'SoldaTotalExecutar';
            else if (it.TxtPintura === '1') proximoSetorCol = 'PinturaTotalExecutar';
            else if (it.TxtMontagem === '1') proximoSetorCol = 'MontagemTotalExecutar';

            if (proximoSetorCol) {
                await connection.execute(
                    `UPDATE ordemservicoitem SET ${proximoSetorCol} = ${proximoSetorCol} + ? WHERE IdOrdemServicoItem = ?`,
                    [it.QtdeTotal, it.IdOrdemServicoItem]
                );
            }
        }

        // 4. Marca o plano de corte como concluído
        await connection.execute(
            `UPDATE planodecorte SET
                QtdeTotalPecasExecutadas = QtdeTotalPecas,
                Percentual = 100,
                Concluido = 'C',
                DataFinal = ?
             WHERE IdPlanodecorte = ?`,
            [agoraData, id]
        );

        await connection.commit();
        res.json({ 
            success: true, 
            message: `Plano #${id} finalizado com sucesso. ${itensPendentes.length} itens concluídos.` 
        });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Producao/Finalizar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao finalizar plano.' });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/producao-plano-corte/itens/:id/lancar-producao
// Lançamento de produção manual para item individual (Ícone 5)
app.post('/api/producao-plano-corte/itens/:id/lancar-producao', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;
        const { entrada, idPlanodecorte, usuario } = req.body;
        const qtd = parseFloat(entrada);

        if (isNaN(qtd) || qtd <= 0) throw new Error('Quantidade informada inválida.');

        // 1. Busca dados do item
        const [[item]] = await connection.execute(
            `SELECT IdOrdemServicoItem, IdOrdemServico, QtdeTotal, 
                    CorteTotalExecutado, CorteTotalExecutar, sttxtcorte,
                    txtDobra, txtSolda, txtPintura, txtMontagem, 
                    RealizadoInicioCorte, COALESCE(QtdeReposicao, 0) AS QtdeReposicao
             FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`, [id]
        );

        if (!item) throw new Error('Item não encontrado.');
        if (item.sttxtcorte === 'C') throw new Error('Item já finalizado.');

        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
        const reposicao = parseFloat(item.QtdeReposicao) || 0;
        const qtdeEfetiva = qtdeTotal - reposicao;

        const executadoAnterior = parseFloat(item.CorteTotalExecutado) || 0;
        const saldoDisponivel = qtdeEfetiva - executadoAnterior;

        if (qtd > saldoDisponivel) throw new Error(`A quantidade informada (${qtd}) ultrapassa o limite disponível (${saldoDisponivel}).`);

        const novoExecutado = executadoAnterior + qtd;
        const novoExecutar = Math.max(0, saldoDisponivel - qtd);
        const agora = new Date();
        const agoraData = formatBR(agora);
        const agoraFull = formatBR(agora, true);

        // 2. Atualiza item (Corte)
        let setFields = `CorteTotalExecutado = ?, CorteTotalExecutar = ?, UsuarioRealizadoFinalCorte = ?`;
        let params = [novoExecutado, novoExecutar, usuario];

        if (novoExecutar <= 0) {
            setFields += `, sttxtcorte = 'C', RealizadoFinalCorte = ?`;
            params.push(agoraFull);
        }
        if (!item.RealizadoInicioCorte) {
            setFields += `, RealizadoInicioCorte = ?`;
            params.push(agoraFull);
        }

        params.push(id);
        await connection.execute(`UPDATE ordemservicoitem SET ${setFields} WHERE IdOrdemServicoItem = ?`, params);

        // 3. Registro de Auditoria (Histórico de Produção)
        // Mapeamento conforme SalvarDados VB.NET:
        // QtdeTotal, "", CorteTotalExecutado (QtdeProduzida), CorteTotalExecutar (QtdeFaltante), Login, DataCriacao, ...
        await connection.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServico, IdOrdemServicoItem, IdOSItemProcesso, Processo,
                QtdeTotal, QtdeProduzida, QtdeFaltante, CriadoPor, DataCriacao, Situacao
            ) VALUES (?, ?, 0, 'CORTE', ?, ?, ?, ?, ?, 'LANCAMENTO')`,
            [item.IdOrdemServico, id, qtdeTotal, novoExecutado, novoExecutar, usuario, agoraFull]
        );

        // 4. Propaga para próximo setor
        let proximoCol = null;
        if (item.txtDobra === '1') proximoCol = 'DobraTotalExecutar';
        else if (item.txtSolda === '1') proximoCol = 'SoldaTotalExecutar';
        else if (item.txtPintura === '1') proximoCol = 'PinturaTotalExecutar';
        else if (item.txtMontagem === '1') proximoCol = 'MontagemTotalExecutar';

        if (proximoCol) {
            await connection.execute(
                `UPDATE ordemservicoitem SET ${proximoCol} = COALESCE(${proximoCol}, 0) + ? WHERE IdOrdemServicoItem = ?`,
                [qtd, id]
            );
        }

        // 5. Recalcula totais do plano
        const [[totals]] = await connection.execute(
            `SELECT sum(QtdeTotal) as total, sum(CorteTotalExecutado) as executado 
             FROM ordemservicoitem WHERE idplanodecorte = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')`,
            [idPlanodecorte]
        );

        const pcTotal = parseFloat(totals.total) || 0;
        const pcExec = parseFloat(totals.executado) || 0;
        const pcPerc = pcTotal > 0 ? (pcExec / pcTotal) * 100 : 0;
        const pcConcluido = pcTotal > 0 && pcExec >= pcTotal ? 'C' : '';

        await connection.execute(
            `UPDATE planodecorte SET 
                QtdeTotalPecasExecutadas = ?, 
                Percentual = ?, 
                Concluido = ?,
                DataFinal = ?
             WHERE IdPlanodecorte = ?`,
            [pcExec, pcPerc.toFixed(2), pcConcluido, pcConcluido === 'C' ? agoraData : null, idPlanodecorte]
        );

        // 6. Recalcula totais da Ordem de Serviço (Mestre)
        const [[osStats]] = await connection.execute(
            `SELECT SUM(QtdeTotal) as total, SUM(CorteTotalExecutado) as exec 
             FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR d_e_l_e_t_e = '')`, 
            [item.IdOrdemServico]
        );
        const osTotal = parseFloat(osStats.total) || 1;
        const osExec = parseFloat(osStats.exec) || 0;
        const osPerc = (osExec / osTotal) * 100;

        await connection.execute(
            `UPDATE ordemservico SET 
                QtdePecasExecutadas = ?, 
                PercentualPecas = ?,
                CortePercentual = ?
             WHERE IdOrdemServico = ?`,
            [osExec, osPerc.toFixed(2), osPerc.toFixed(2), item.IdOrdemServico]
        );

        await connection.commit();
        res.json({ success: true, message: `Lançado ${qtd} peças com sucesso.` });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Producao/LancarItem] Erro:', err.message);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/producao-plano-corte/itens/:idPlano', _handlePlanoItens);

// ============================================================================
// PLANO DE CORTE — Abrir Pasta no Servidor (Explorer)
// ============================================================================
app.post('/api/plano-corte/:id/abrir-pasta', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        const [rows] = await connection.execute(
            `SELECT EnderecoCompletoPlanoCorte FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0 || !rows[0].EnderecoCompletoPlanoCorte) {
            return res.json({ success: false, message: 'Plano não possui diretório válido salvo.' });
        }

        const folderPath = rows[0].EnderecoCompletoPlanoCorte;
        const fs = require('fs');
        const { exec } = require('child_process');

        // Verifica se o diretório base existe e tenta criar a pasta se necessário
        try {
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        } catch (fsErr) {
            console.error('[PlanoCorte/AbrirPasta] Erro FS:', fsErr.message);
            return res.json({ 
                success: false, 
                message: `Não foi possível acessar ou criar o diretório: ${folderPath}. Verifique permissões ou se o drive está mapeado.` 
            });
        }

        const cmd = process.platform === 'win32' ? `start "" "${folderPath}"` : `explorer "${folderPath}"`;
        exec(cmd, (err) => {
            if (err) {
                console.error('[PlanoCorte/AbrirPasta] Erro abrir:', err);
                return res.json({ success: false, message: 'Erro ao tentar abrir o local no Windows Explorer: ' + err.message });
            }
            res.json({ success: true, message: 'Pasta aberta no servidor' });
        });

    } catch (err) {
        console.error('[PlanoCorte/AbrirPasta] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro interno ao abrir pasta: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Abrir Desenho no Servidor (3D ou PDF)
// ============================================================================
app.post('/api/plano-corte/abrir-desenho', async (req, res) => {
    try {
        let { filePath, tipo } = req.body;
        if (!filePath) return res.json({ success: false, message: 'Caminho do arquivo não fornecido.' });

        const fs = require('fs');
        const { exec } = require('child_process');

        // Se for PDF, aplica normalização de extensões conforme VB.NET
        if (tipo === 'PDF') {
            const extensoes = [
                '.SLDPRT', '.SLDASM', '.sldprt', '.sldasm', 
                '.asm', '.ASM', '.psm', '.PSM', '.par', '.PAR'
            ];
            for (const ext of extensoes) {
                filePath = filePath.replace(new RegExp(ext.replace('.', '\\.'), 'g'), '.PDF');
            }
        }

        if (!fs.existsSync(filePath)) {
            return res.json({ success: false, message: `Arquivo não encontrado: ${filePath}` });
        }

        const cmd = `start "" "${filePath}"`;
        exec(cmd, (err) => {
            if (err) {
                console.error('[PlanoCorte/AbrirDesenho] Erro abrir:', err.message);
                return res.json({ success: false, message: 'Falha ao abrir desenho: ' + err.message });
            }
            res.json({ success: true, message: 'Desenho aberto no servidor' });
        });

    } catch (err) {
        console.error('[PlanoCorte/AbrirDesenho] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro interno: ' + err.message });
    }
});

// ============================================================================
// PLANO DE CORTE — Liberar Plano de Corte (Importar Arquivos + Set Enviadocorte 'S')
// ============================================================================
app.post('/api/plano-corte/:id/liberar', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();
        const { id } = req.params;

        const [planoRows] = await connection.execute(
            `SELECT IdPlanodecorte, Enviadocorte, EnderecoCompletoPlanoCorte 
             FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [id]
        );

        if (planoRows.length === 0) {
            await connection.rollback();
            return res.json({ success: false, message: 'Plano de corte não encontrado' });
        }
        
        const plano = planoRows[0];
        if (plano.Enviadocorte === 'S' || plano.Enviadocorte === 'SIM') {
            await connection.rollback();
            return res.json({ success: false, message: 'Plano de corte já se encontra liberado' });
        }

        const folderPath = (plano.EnderecoCompletoPlanoCorte || '').trim();
        if (!folderPath) {
            await connection.rollback();
            return res.json({ success: false, message: 'Plano sem caminho de diretório definido' });
        }

        const fs = require('fs');
        const path = require('path');

        // Limpar Diretório
        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
        fs.mkdirSync(folderPath, { recursive: true });

        // Extensões de destino do VB.NET
        const extensoes = ['LXDS', 'DXF', 'DFT', 'PDF'];
        for (const ext of extensoes) {
            const sub = path.join(folderPath, ext);
            if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
        }

        // Busca todos itens da OS
        const [itens] = await connection.execute(
            `SELECT IdOrdemServicoItem, IdOrdemServico, EnderecoArquivo 
             FROM ordemservicoitem 
             WHERE idplanodecorte = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')`,
            [id]
        );

        let arquivosCopiados = 0;
        let errosCopia = 0;

        // Limpa a pasta e despeja
        for (const item of itens) {
            if (!item.EnderecoArquivo || item.EnderecoArquivo.trim() === '') continue;
            
            const originPath = item.EnderecoArquivo.trim();
            try {
                if (!fs.existsSync(originPath)) {
                    console.warn(`[PlanoCorte/Liberar] Origem não existe: ${originPath}`);
                    continue;
                }

                const files = fs.readdirSync(originPath);
                for (const file of files) {
                    const extInfo = path.extname(file).toUpperCase().replace('.', '');
                    if (extensoes.includes(extInfo)) {
                        const srcFile = path.join(originPath, file);
                        const dstFile = path.join(folderPath, extInfo, file);
                        try {
                            fs.copyFileSync(srcFile, dstFile);
                            arquivosCopiados++;
                        } catch (e) {
                            console.error(`[PlanoCorte/Liberar] Erro cópia ${file}:`, e.message);
                            errosCopia++;
                        }
                    }
                }
            } catch (dirErr) {
                console.error(`[PlanoCorte/Liberar] Erro ao ler diretório ${originPath}:`, dirErr.message);
                errosCopia++;
            }
        }

        // Atualiza banco usando 'S' conforme VB
        const liberadoPor = req.session?.user?.nome || 'Sistema';
        await connection.execute(
            `UPDATE planodecorte 
             SET Enviadocorte = 'S', 
                 DataLiberacao = ?, 
                 UsuarioLiberacao = ?
             WHERE IdPlanodecorte = ?`,
            [new Date().toLocaleDateString('pt-BR'), liberadoPor, id]
        );

        await connection.commit();
        res.json({ 
            success: true, 
            message: `Plano Liberado. ${arquivosCopiados} arquivos copiados.`,
            meta: { copiados: arquivosCopiados, erros: errosCopia }
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[PlanoCorte/Liberar] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao liberar plano: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Cancelar Liberação (equivalente ao UpdateCancelaEnvioPC do VB)
// ============================================================================
app.post('/api/plano-corte/:id/cancelar-liberacao', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        // Limpa os campos de liberação sem verificar conteúdo (UpdateCancelaEnvioPC do VB)
        await connection.execute(
            `UPDATE planodecorte
             SET Enviadocorte              = '',
                 LiberacaoParaCorte        = '',
                 DataLiberacaoParaCorte    = NULL,
                 UsuarioLiberacaoParaCorte = '',
                 DataLiberacao             = NULL,
                 UsuarioLiberacao          = ''
             WHERE IdPlanodecorte = ?`,
            [id]
        );

        res.json({
            success: true,
            message: `Liberação do Plano #${id} cancelada com sucesso.`
        });

    } catch (err) {
        console.error('[PlanoCorte/CancelarLiberacao] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao cancelar liberação: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Bloquear preenchimento automático (Enviadocorte = 'B')
// Equivalente: BancoDados.AlteracaoEspecifica("planodecorte","enviadocorte","B",...)
// Condições: plano NÃO pode estar liberado ('S') nem já bloqueado ('B')
// ============================================================================
app.post('/api/plano-corte/:id/bloquear', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        const [rows] = await connection.execute(
            `SELECT IdPlanodecorte, Enviadocorte FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        const plano = rows[0];

        if (plano.Enviadocorte === 'S' || plano.Enviadocorte === 'SIM') {
            return res.json({ success: false, message: 'Plano já liberado para a fábrica. Cancele a liberação antes de bloquear.' });
        }

        if (plano.Enviadocorte === 'B') {
            return res.json({ success: false, message: 'Plano já está bloqueado para preenchimento automático.' });
        }

        await connection.execute(
            `UPDATE planodecorte SET Enviadocorte = 'B' WHERE IdPlanodecorte = ?`,
            [id]
        );

        res.json({
            success: true,
            message: `Plano #${id} bloqueado para preenchimento automático.`
        });

    } catch (err) {
        console.error('[PlanoCorte/Bloquear] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao bloquear plano: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Desbloquear preenchimento automático (Enviadocorte = '')
// Desfaz o processo de bloqueio (ícone 6)
// ============================================================================
app.post('/api/plano-corte/:id/desbloquear', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        const [rows] = await connection.execute(
            `SELECT IdPlanodecorte, Enviadocorte FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        if (rows[0].Enviadocorte !== 'B') {
            return res.json({ success: false, message: 'Plano não está bloqueado.' });
        }

        await connection.execute(
            `UPDATE planodecorte SET Enviadocorte = '' WHERE IdPlanodecorte = ?`,
            [id]
        );

        res.json({
            success: true,
            message: `Plano #${id} desbloqueado. Preenchimento automático liberado.`
        });

    } catch (err) {
        console.error('[PlanoCorte/Desbloquear] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao desbloquear plano: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Excluir Plano de Corte (Soft Delete)
// Ícone 7: Só exclui se não houver execução (cortetotalexecutado = 0)
// ============================================================================
app.post('/api/plano-corte/:id/excluir', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        // 1. Verificar se plano já tem histórico de execução
        const [execRows] = await connection.execute(
            `SELECT SUM(COALESCE(cortetotalexecutado, 0)) as totalExecutado 
             FROM ordemservicoitem 
             WHERE idplanodecorte = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')`,
            [id]
        );

        const totalExecutado = Number(execRows[0]?.totalExecutado) || 0;

        if (totalExecutado > 0) {
            return res.json({ 
                success: false, 
                message: 'Plano de corte tem histórico de execução! Não pode ser excluído.' 
            });
        }

        // 2. Transação para limpar vínculos e marcar como deletado
        await connection.beginTransaction();

        const now = new Date();
        const dataAtual = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const usuarioLogado = req.user?.nome || req.user?.login || 'Sistema';

        // Desvincular itens
        await connection.execute(
            `UPDATE ordemservicoitem SET idplanodecorte = '' WHERE idplanodecorte = ?`,
            [id]
        );

        // Soft delete no plano
        await connection.execute(
            `UPDATE planodecorte 
             SET D_E_L_E_T_E = '*', 
                 DataD_E_L_E_T_E = ?, 
                 UsuarioD_E_L_E_T_E = ? 
             WHERE IdPlanodecorte = ?`,
            [dataAtual, usuarioLogado, id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Plano #${id} excluído com sucesso.`
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[PlanoCorte/Excluir] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao excluir plano: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Gerar Relatório Excel (Ícone 8)
// Somente exportação (sem cópia de arquivos)
// ============================================================================
app.post('/api/plano-corte/:id/exportar-excel', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantPool = req.tenantDbPool || pool;

        // Invocando a função interna que já faz a lógica complexa do excel
        const excelResult = await ExportarPlanoExcelPadrao(id, tenantPool);

        if (excelResult.success) {
            // Tenta abrir o arquivo automaticamente no Excel (servidor local)
            const { exec } = require('child_process');
            const cmd = `start "" "${excelResult.path}"`;
            exec(cmd, (err) => {
                if (err) console.error('[PlanoExcel/Abrir] Falha ao abrir:', err.message);
            });

            res.json({
                success: true,
                message: `Relatório Excel do Plano #${id} gerado e aberto com sucesso.`,
                path: excelResult.path
            });
        } else {
            res.json({
                success: false,
                message: excelResult.message || 'Falha ao gerar relatório.'
            });
        }

    } catch (err) {
        console.error('[PlanoCorte/ExportarExcel] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao gerar Excel: ' + err.message });
    }
});

// ============================================================================
// PLANO DE CORTE — Remover item (desvincular de plano)
// ============================================================================
app.post('/api/plano-corte/remover-item', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        
        const { idOrdemServicoItem } = req.body;
        if (!idOrdemServicoItem) {
            return res.status(400).json({ success: false, message: 'ID do item não fornecido.' });
        }

        // 1. Verificar se o item está em um plano que permite alteração (opcional, mas recomendado)
        const [statusRows] = await connection.execute(`
            SELECT osi.IdPlanodecorte, pc.Enviadocorte, pc.Concluido
            FROM ordemservicoitem osi
            LEFT JOIN planodecorte pc ON osi.IdPlanodecorte = pc.IdPlanodecorte
            WHERE osi.IdOrdemServicoItem = ?
        `, [idOrdemServicoItem]);

        if (statusRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        }

        const itemData = statusRows[0];
        if (itemData.Enviadocorte === 'S' || itemData.Concluido === 'S' || itemData.Concluido === 'C') {
            return res.status(403).json({ success: false, message: 'Não é possível remover itens de um plano já enviado ou concluído.' });
        }

        // 2. Desvincular item do plano
        await connection.execute(
            `UPDATE ordemservicoitem SET IdPlanodecorte = NULL WHERE IdOrdemServicoItem = ?`,
            [idOrdemServicoItem]
        );

        res.json({ success: true, message: 'Item removido do plano com sucesso.' });
    } catch (err) {
        console.error('[PlanoCorte/RemoverItem] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao remover item: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE — Incluir itens de OS em plano (cria ou reutiliza)
// ============================================================================
app.post('/api/plano-corte/incluir-itens', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { itens } = req.body; // array de IdOrdemServicoItem
        const criadoPor = req.session?.user?.nome || req.session?.user?.login || 'Sistema';
        const dataCad   = new Date().toLocaleDateString('pt-BR');

        if (!itens || itens.length === 0) {
            return res.json({ success: false, message: 'Nenhum item selecionado' });
        }

        // 1) Carrega configuração de caminho base para Plano de Corte
        const [configRows] = await connection.execute(
            `SELECT valor FROM configuracaosistema WHERE chave LIKE '%Enderecoplanodecorte%' LIMIT 1`
        );
        const baseDirPlano = configRows.length > 0 ? (configRows[0].valor || '').trim() : '';

        // 2) Carrega cache de planos existentes (nao enviados, nao concluidos)
        const [planosExistentes] = await connection.execute(`
            SELECT IdPlanodecorte AS IdPlanodecorte,
                   Espessura AS Espessura,
                   MaterialSW AS MaterialSW
            FROM planodecorte
            WHERE (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
              AND (Enviadocorte IS NULL OR Enviadocorte = '')
              AND (Concluido IS NULL OR Concluido = '')
        `);
        const cachePlanos = new Map();
        const cacheEnderecos = new Map(); // Mapa para armazenar IdPlano -> Endereco
        for (const row of planosExistentes) {
            const key = `${(row.Espessura||'').trim()}|${(row.MaterialSW||'').trim()}`;
            if (!cachePlanos.has(key)) {
                cachePlanos.set(key, row.IdPlanodecorte);
                cacheEnderecos.set(row.IdPlanodecorte, row.EnderecoCompletoPlanoCorte);
            }
        }

        const resultados = [];

        // 2) Processa cada item selecionado
        for (const idItem of itens) {
            const [itemRows] = await connection.execute(
                `SELECT IdOrdemServicoItem, Espessura, MaterialSW, idplanodecorte AS IdPlanodecorte
                 FROM ordemservicoitem
                 WHERE IdOrdemServicoItem = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')`,
                [idItem]
            );
            if (!itemRows.length) { resultados.push({ IdOrdemServicoItem: idItem, status: 'nao_encontrado' }); continue; }

            const item = itemRows[0];
            // Pula se ja tem plano
            if (item.IdPlanodecorte && String(item.IdPlanodecorte).trim() !== '') {
                resultados.push({ IdOrdemServicoItem: idItem, status: 'ja_tem_plano', IdPlanodecorte: item.IdPlanodecorte }); continue;
            }

            const espessura = (item.Espessura || '').replace(',', '.').trim();
            const material  = (item.MaterialSW || '').trim();

            if (!espessura || !material) {
                resultados.push({ IdOrdemServicoItem: idItem, status: 'sem_espessura_material' }); continue;
            }

            const key = `${espessura}|${material}`;
            let idPlano;

            if (cachePlanos.has(key)) {
                // Reutiliza plano existente (mesma espessura + material)
                idPlano = cachePlanos.get(key);
            } else {
                // Cria novo plano de corte
                const desc = `PLANO DE CORTE AUTOMATICO PARA ESPESSURA: ${espessura} COM MATERIAL: ${material}`;
                await connection.execute(
                    `INSERT INTO planodecorte (Espessura, MaterialSW, DescPlanodecorte, DataCad, CriadoPor)
                     VALUES (?, ?, ?, ?, ?)`,
                    [espessura, material, desc, dataCad, criadoPor]
                );
                const [[novoRow]] = await connection.execute('SELECT MAX(IdPlanodecorte) AS NovoId FROM planodecorte');
                idPlano = novoRow.NovoId;

                // Salva o EnderecoCompletoPlanoCorte do novo plano
                if (baseDirPlano) {
                    const dirName = 'PC_' + String(idPlano).padStart(5, '0');
                    const separator = baseDirPlano.includes('/') && !baseDirPlano.includes('\\') ? '/' : '\\';
                    const fullPath = baseDirPlano + (baseDirPlano.endsWith(separator) ? '' : separator) + dirName;
                    await connection.execute(
                        `UPDATE planodecorte SET EnderecoCompletoPlanoCorte = ? WHERE IdPlanodecorte = ?`,
                        [fullPath, idPlano]
                    );
                    cacheEnderecos.set(idPlano, fullPath);
                }

                cachePlanos.set(key, idPlano);
            }

            // Vincula item ao plano
            await connection.execute(
                `UPDATE ordemservicoitem SET idplanodecorte = ? WHERE IdOrdemServicoItem = ?`,
                [idPlano, idItem]
            );
            resultados.push({ 
                IdOrdemServicoItem: idItem, 
                status: 'ok', 
                IdPlanodecorte: idPlano,
                EnderecoCompletoPlanoCorte: cacheEnderecos.get(idPlano)
            });
        }

        // 3) Atualiza totais acumulados (QtdeTotalPecas) em todos os planos afetados
        await connection.execute(`
            UPDATE planodecorte pc
            JOIN (
                SELECT idplanodecorte, SUM(qtdetotal) AS total
                FROM ordemservicoitem
                WHERE (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
                GROUP BY idplanodecorte
            ) somas ON pc.idplanodecorte = somas.idplanodecorte
            SET pc.qtdetotalpecas = somas.total
            WHERE (pc.d_e_l_e_t_e IS NULL OR pc.d_e_l_e_t_e = '')
        `);

        await connection.commit();

        const ok      = resultados.filter(r => r.status === 'ok').length;
        const pulados = resultados.filter(r => r.status === 'ja_tem_plano').length;
        const erros   = resultados.filter(r => !['ok','ja_tem_plano'].includes(r.status)).length;

        // Coleta endereços únicos dos planos afetados
        const enderecosAfetados = Array.from(new Set(resultados.map(r => r.EnderecoCompletoPlanoCorte).filter(Boolean)));

        res.json({
            success: true,
            message: `${ok} incluido(s), ${pulados} ja tinham plano, ${erros} erro(s)`,
            resultados, ok, pulados, erros,
            enderecos: enderecosAfetados
        });
    } catch (err) {
        if (connection) { try { await connection.rollback(); } catch(_){} }
        console.error('[PlanoCorte/IncluirItens] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});
// ============================================================================
// PLANO DE CORTE — Exportar Excel Padrão (ExportarPlanoExcelPadrao do VB.NET)
// ============================================================================
const ExportarPlanoExcelPadrao = async (idPlano, tenantPool) => {
    const dbPool = tenantPool || pool;
    try {
        console.log(`[PlanoExcel] Iniciando exportação do Plano #${idPlano}`);

        // 1. Buscar template
        const [cfgRows] = await dbPool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelPlanoCorte' LIMIT 1"
        );
        const templatePath = cfgRows.length > 0 ? cfgRows[0].valor : null;

        // 2. Buscar dados do plano
        const [planoRows] = await dbPool.execute(
            `SELECT * FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [idPlano]
        );
        if (planoRows.length === 0) throw new Error('Plano de corte não encontrado');
        const plano = planoRows[0];

        if (!plano.EnderecoCompletoPlanoCorte) {
            throw new Error('Plano sem caminho de diretório definido');
        }

        // 3. Buscar itens do plano (aglutinados por OS/Item — visão individual)
        const [itens] = await dbPool.execute(`
            SELECT 
                osi.IdOrdemServico,
                osi.IdOrdemServicoItem,
                osi.Espessura,
                osi.MaterialSW,
                osi.CodMatFabricante,
                osi.QtdeTotal,
                osi.EnderecoArquivo,
                osi.DescResumo,
                osi.DescDetal
            FROM ordemservicoitem osi
            WHERE osi.idplanodecorte = ?
              AND (osi.d_e_l_e_t_e IS NULL OR osi.d_e_l_e_t_e = '')
            ORDER BY osi.IdOrdemServico, osi.IdOrdemServicoItem
        `, [idPlano]);

        // 4. Gerar Excel
        const workbook = new ExcelJS.Workbook();
        let worksheet;

        if (templatePath && fs.existsSync(templatePath)) {
            console.log(`[PlanoExcel] Usando template: ${templatePath}`);
            await workbook.xlsx.readFile(templatePath);
            worksheet = workbook.getWorksheet(1);
        } else {
            console.warn(`[PlanoExcel] Template não encontrado. Criando planilha nova.`);
            worksheet = workbook.addWorksheet('Plano de Corte');
            
            // Definição de Estilos
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            const centerAlign = { vertical: 'middle', horizontal: 'center' };
            const leftAlign   = { vertical: 'middle', horizontal: 'left' };
            const thinBorder  = {
                top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };

            // 1. Cabeçalho do Plano
            const row1 = worksheet.getRow(1);
            row1.values = ['ID Plano', 'Descrição', 'Espessura', 'Material SW', 'Data Cad.'];
            row1.height = 25;
            for(let i=1; i<=5; i++) {
                const cell = row1.getCell(i);
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.alignment = centerAlign;
                cell.border = thinBorder;
            }

            const row2 = worksheet.getRow(2);
            row2.values = [
                plano.IdPlanodecorte,
                plano.DescPlanodecorte || '',
                plano.Espessura || '',
                plano.MaterialSW || '',
                plano.DataCad || ''
            ];
            row2.height = 20;
            for(let i=1; i<=5; i++) {
                const cell = row2.getCell(i);
                cell.alignment = leftAlign;
                cell.border = thinBorder;
            }

            // Espaço vazio
            worksheet.addRow([]);

            // 2. Cabeçalho dos Itens
            const row5 = worksheet.getRow(5);
            row5.values = ['OS', 'Item OS', 'Espessura', 'Material SW', 'Cod. Fab.', 'Qtde Total', 'Desc. Resumo', 'Desc. Detalhe'];
            row5.height = 25;
            for(let i=1; i<=8; i++) {
                const cell = row5.getCell(i);
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.alignment = centerAlign;
                cell.border = thinBorder;
            }

            // Dados dos Itens
            itens.forEach((item, idx) => {
                const row = worksheet.getRow(6 + idx);
                row.values = [
                    item.IdOrdemServico,
                    item.IdOrdemServicoItem,
                    item.Espessura || '',
                    item.MaterialSW || '',
                    item.CodMatFabricante || '',
                    item.QtdeTotal || 0,
                    item.DescResumo || '',
                    item.DescDetal || ''
                ];
                row.height = 20;
                for(let i=1; i<=8; i++) {
                    const cell = row.getCell(i);
                    cell.alignment = leftAlign;
                    cell.border = thinBorder;
                }
            });

            // Ajuste de largura das colunas
            worksheet.columns = [
                { width: 12 }, { width: 30 }, { width: 12 }, { width: 22 },
                { width: 25 }, { width: 12 }, { width: 35 }, { width: 50 },
            ];
        }

        // 5. Preencher cabeçalho (se template existir, usa células VB-padrão)
        // 5. Preencher cabeçalho (se template existir, usa células VB-padrão)
        if (templatePath && fs.existsSync(templatePath)) {
            try {
                const paddedId = String(idPlano).padStart(5, '0');
                worksheet.getCell('A1').value = paddedId;
                worksheet.getCell('A2').value = plano.DescPlanodecorte || '';
                worksheet.getCell('A3').value = plano.Espessura || '';
                worksheet.getCell('A4').value = plano.MaterialSW || '';
                worksheet.getCell('A5').value = plano.DataCad || '';

                // Itens a partir da linha 10 (ajustar conforme template real)
                itens.forEach((item, idx) => {
                    const row = 10 + idx;
                    worksheet.getCell(`A${row}`).value = item.IdOrdemServico;
                    worksheet.getCell(`B${row}`).value = item.IdOrdemServicoItem;
                    worksheet.getCell(`C${row}`).value = item.Espessura || '';
                    worksheet.getCell(`D${row}`).value = item.MaterialSW || '';
                    worksheet.getCell(`E${row}`).value = item.CodMatFabricante || '';
                    worksheet.getCell(`F${row}`).value = item.QtdeTotal || 0;
                    worksheet.getCell(`G${row}`).value = item.DescResumo || '';
                    worksheet.getCell(`H${row}`).value = item.DescDetal || '';
                });
            } catch (cellErr) {
                console.warn('[PlanoExcel] Erro ao preencher células do template:', cellErr.message);
            }
        }

        // 6. Salvar no diretório do plano
        const folderPath = plano.EnderecoCompletoPlanoCorte.trim();
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
        const paddedId = String(idPlano).padStart(5, '0');
        const fileName = `PlanoCorte_${paddedId}_${timestamp}.xlsx`;
        const savePath = path.join(folderPath, fileName);

        await workbook.xlsx.writeFile(savePath);
        console.log(`[PlanoExcel] Arquivo gerado: ${savePath}`);
        return { success: true, path: savePath, fileName };

    } catch (err) {
        console.error(`[PlanoExcel] Erro ao exportar plano #${idPlano}:`, err.message);
        return { success: false, error: err.message };
    }
};

// ============================================================================
// PLANO DE CORTE — Atualizar Arquivos (ImportarArquivos + ExportarPlanoExcel)
// Equivalente ao botão VB.NET: LimparDiretorio + ImportarArquivos (LXDS/DXF/DFT/PDF)
// Condição: deve ser executado somente quando aglutinado = true (verificação no frontend)
// ============================================================================
app.post('/api/plano-corte/:id/atualizar-arquivos', async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        const { id } = req.params;

        // 1. Buscar dados do plano
        const [planoRows] = await connection.execute(
            `SELECT IdPlanodecorte, DescPlanodecorte, EnderecoCompletoPlanoCorte 
             FROM planodecorte WHERE IdPlanodecorte = ? LIMIT 1`,
            [id]
        );

        if (planoRows.length === 0) {
            return res.json({ success: false, message: 'Plano de corte não encontrado.' });
        }

        const plano = planoRows[0];
        const folderPath = (plano.EnderecoCompletoPlanoCorte || '').trim();

        if (!folderPath) {
            return res.json({ success: false, message: 'Plano sem caminho de diretório definido. Verifique as configurações.' });
        }

        // 2. Buscar itens do plano (equivalente ao DGVItensPLanodeCorte)
        const [itens] = await connection.execute(`
            SELECT IdOrdemServicoItem, IdOrdemServico, EnderecoArquivo
            FROM ordemservicoitem
            WHERE idplanodecorte = ?
              AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
        `, [id]);

        if (itens.length === 0) {
            return res.json({ success: false, message: 'Nenhum item encontrado neste plano de corte.' });
        }

        // 3. LimparDiretorio(EnderecoCompletoPlanoCorte) — equivalente ao VB
        limparDiretorio(folderPath);

        // Garante que a pasta existe após limpar
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // 4. ImportarArquivos para cada extensão: LXDS, DXF, DFT, PDF
        const extensoes = ['LXDS', 'DXF', 'DFT', 'PDF'];
        const stats = { copiados: 0, ignorados: 0, erros: 0, semOrigemExistente: 0 };
        const detalhes = [];

        for (const ext of extensoes) {
            let copiasExt = 0;

            for (const item of itens) {
                if (!item.EnderecoArquivo || item.EnderecoArquivo.trim() === '') {
                    stats.ignorados++;
                    continue;
                }

                const originPath = item.EnderecoArquivo.trim();

                try {
                    if (!fs.existsSync(originPath)) {
                        stats.semOrigemExistente++;
                        continue;
                    }

                    const files = fs.readdirSync(originPath);
                    for (const file of files) {
                        const fileExt = path.extname(file).toUpperCase().replace('.', '');
                        if (fileExt !== ext) continue;

                        const srcFile = path.join(originPath, file);
                        const dstFile = path.join(folderPath, file);

                        try {
                            fs.copyFileSync(srcFile, dstFile);
                            stats.copiados++;
                            copiasExt++;
                        } catch (copyErr) {
                            console.error(`[PlanoCorte/AtualizarArquivos] Erro ao copiar ${file}:`, copyErr.message);
                            stats.erros++;
                        }
                    }
                } catch (dirErr) {
                    console.error(`[PlanoCorte/AtualizarArquivos] Erro ao ler diretório ${originPath}:`, dirErr.message);
                    stats.erros++;
                }
            }

            detalhes.push(`${ext}: ${copiasExt}`);
        }

        console.log(`[PlanoCorte/AtualizarArquivos] Plano #${id}: ${stats.copiados} arq. copiados (${detalhes.join(', ')})`);

        // 5. ExportarPlanoExcelPadrao() — equivalente ao VB
        connection.release();
        connection = null;
        const excelResult = await ExportarPlanoExcelPadrao(id, tenantPool);

        const excelMsg = excelResult.success
            ? ` Excel gerado: ${excelResult.fileName}`
            : ` (Excel: ${excelResult.error})`;

        res.json({
            success: true,
            message: `Plano de Corte #${id} atualizado! ${stats.copiados} arquivo(s) importado(s) [${detalhes.join(' | ')}].${excelMsg}`,
            stats,
            excelGerado: excelResult.success,
            excelPath: excelResult.path || null
        });

    } catch (err) {
        console.error('[PlanoCorte/AtualizarArquivos] Erro:', err.message);
        res.status(500).json({ success: false, message: 'Erro ao atualizar arquivos: ' + err.message });
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
