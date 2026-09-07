const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const db = require('./config/db');
const pool = db;
const tenantMiddleware = require('./middleware/tenant');

// ─── CAMPO AUXILIAR DIÁRIO (em memória, por banco) ───────────────────────────
// Chave: "{dbName}_{IdOrdemServicoItem}_{setor}_{YYYY-MM-DD}"
// Valor: minutos acumulados e APROVADOS hoje para este item/setor/banco
// Reset automático: novo dia = nova chave = valor 0 automaticamente
const dailyMinProdMap = new Map();

/**
 * Obtém os minutos acumulados hoje para um item/setor/banco.
 * @param {string} dbName  - Nome do banco do tenant (ex: "lynxlocal")
 * @param {number} idItem  - IdOrdemServicoItem
 * @param {string} setor   - Nome do setor em lowercase (ex: "galvanizar")
 * @returns {number} minutos já acumulados hoje (0 se é o primeiro do dia)
 */
function getDailyAccumulated(dbName, idItem, setor) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${dbName}_${idItem}_${setor}_${today}`;
    return dailyMinProdMap.get(key) || 0;
}

/**
 * Incrementa o acumulado diário após um apontamento aprovado.
 */
function addDailyAccumulated(dbName, idItem, setor, minutos) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `${dbName}_${idItem}_${setor}_${today}`;
    const prev = dailyMinProdMap.get(key) || 0;
    dailyMinProdMap.set(key, prev + minutos);
    console.log(`[DailyMinProd] ${key} → ${prev} + ${minutos} = ${prev + minutos} min`);
}
// ─────────────────────────────────────────────────────────────────────────────


function toIsoDate(val) {
    if (!val || typeof val !== 'string') return null;
    val = val.trim();
    if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    return val;
}

const matrizRoutes = require('./routes/matrizRoutes');
const blocksetRoutes = require('./routes/blocksetRoutes');
const pecaManufaturadaRoutes = require('./routes/pecaManufaturada');
const tiposTransporteRoutes = require('./routes/tiposTransporte');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
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

// Helper global: retorna o NomeCompleto do usuário autenticado via JWT context
const getCtxNomeCompleto = (fallback = 'Sistema') => {
    try {
        const store = db.asyncLocalStorage.getStore();
        if (store && store.user && store.user.nomeCompleto) return store.user.nomeCompleto;
        if (store && store.user && store.user.login) return store.user.login;
    } catch(e) {}
    return fallback;
};

const NULLIF_TRIM = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    return s === '' ? '' : s;
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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, tenant-id');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Apply Tenant Middleware to all API routes

app.use('/api', tenantMiddleware);

// Admin Routes
app.use('/api/matriz', matrizRoutes);

// BlockSet Routes
app.use('/api/blockset', blocksetRoutes);

// Peça Manufaturada Routes (modularizado)
app.locals.pool = pool;
app.use('/api/peca-manufaturada', pecaManufaturadaRoutes);
app.use('/api/config/veiculo', tiposTransporteRoutes);

// Reposià§ão Routes
app.get('/api/reposicao/itens', tenantMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, IdMaterial, Projeto, DescEmpresa, Tag, DescTag, 
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
        const [rows] = await req.tenantDbPool.query(query);
        console.log(`[DEBUG REPOSICAO] tenantId was unused | rows.length: ${rows.length}`);
                // Auto-sync dynamic columns for all returned resources PLUS hardcoded legacy ones
        const hardcodedLegacy = ['CorteaLaser', 'PUNSIONADEIRA', 'GALVANIZAR', 'Corte', 'Dobra', 'Solda', 'Pintura', 'Montagem', 'Engenharia', 'Isometrico', 'Medicao', 'Acabamento', 'Aprovacao'];
        const allResources = rows.map(r => r.processofabricacao).filter(Boolean);
        for (const legacy of hardcodedLegacy) {
            allResources.push(legacy);
        }

        const dbName = req.tenantDbPool?.pool?.config?.connectionConfig?.database || 'default';
        for (const rawResource of allResources) {
            if (!rawResource) continue;
            const resName = rawResource.trim().replace(/\s+/g, '');
            if (!resName) continue;
            
            const cacheKey = `${dbName}_${resName}`;
            if (!syncedTenantResources.has(cacheKey)) {
                await ensureDynamicResourceColumns(req.tenantDbPool, rawResource);
                syncedTenantResources.set(cacheKey, true);
            }
        }
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar itens de reposià§ão:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor ao buscar reposià§ão.' });
    }
});

app.delete('/api/reposicao/itens/:id', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const usuario = req.query.usuario || 'Sistema';
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const dataAtual = formatBR(new Date(), true);
        const [result] = await connection.query(
            `UPDATE ordemservicoitem SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdOrdemServicoItem = ?`,
            [dataAtual, usuario, id]
        );
        await connection.query(
            `UPDATE ordemservicoitempendencia SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdOrdemServicoItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [dataAtual, usuario, id]
        );
        await connection.commit();
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Item excluído com sucesso.' });
        } else {
            res.status(404).json({ success: false, message: 'Item não encontrado ou já excluído.' });
        }
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao excluir item de reposição:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao excluir reposição.' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/reposicao/apontamento', tenantMiddleware, async (req, res) => {
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
            SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, IdMaterial, QtdeTotal, cortetotalexecutado, cortetotalexecutar, 
                   sttxtCorte, IdOrdemservicoReposicao, IdOrdemServicoItemReposicao, IdPendenciaReposicao
            FROM ordemservicoitem 
            WHERE IdOrdemServicoItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') FOR UPDATE
        `, [IdOrdemServicoItem]);

        if (items.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Peà§a de reposià§ão não localizada.' });
        }

        const item = items[0];
        
        if (item.sttxtCorte === 'C') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este item de reposià§ão já está concluà­do.' });
        }

        const atualExecutado = Number(item.cortetotalexecutado) || 0;
        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const limiteMaximo = qtdeTotal - atualExecutado;

        if (quantidadeApontada > limiteMaximo) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: `A quantidade informada excede o limite restante de reposià§ão (${limiteMaximo}).` });
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
            const descFinalizacao = `RNC Automática  - Encerramento do Pedido de Reposià§ão de Peà§a da OS: ${item.IdOrdemServico} Item: ${item.IdOrdemServicoItemReposicao || ''} Concluido , Excluindo da Lista de Pendàªncia`;
            
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
                usuarioLogado, dataAtual, descFinalizacao, usuarioLogado, 'Produà§ão', item.IdPendenciaReposicao
            ]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Peà§as repostas apontadas com sucesso!' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro na transaction do Apontamento de Reposià§ão:', error);
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
const getCurrentDateSQL = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
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
        console.log(`[File] Diretório limpo: ${diretorio}`);
    } catch (err) {
        console.error(`[File] Erro ao limpar diretório ${diretorio}:`, err);
    }
};

const ExportarRomaneioExcelPadrao = async (idRomaneio) => {
    try {
        console.log(`[Excel] Iniciando exportação padr?o do Romaneio #${idRomaneio}`);

        // 1. Buscar Caminhos e Template
        const [configRows] = await req.tenantDbPool.execute(
            "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelRomaneio'"
        );
        const templatePath = configRows.length > 0 ? configRows[0].valor : null;

        const [romRows] = await req.tenantDbPool.execute(
            `SELECT * FROM romaneio WHERE idRomaneio = ?`,
            [idRomaneio]
        );
        if (romRows.length === 0) throw new Error('Romaneio não encontrado');
        const romData = romRows[0];

        // 2. Buscar Itens
        const [items] = await req.tenantDbPool.execute(
            "SELECT * FROM v_rom_itens_incluidos WHERE IdRomaneio = ?",
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
            console.warn(`[Excel] Template não encontrado em ${templatePath}. Criando novo.`);
            worksheet = workbook.addWorksheet('Romaneio');
        }

        // 4. Preencher Cabe?alho (Padr?o Legado)
        const paddedId = idRomaneio.toString().padStart(5, '0');
        const fullAddress = [
            romData.EnviadoPara,
            `RUA: ${romData.endereco || ''}`,
            `N?: ${romData.numero || ''}`,
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

        // 5. Preencher Itens (Come?a na linha 18)
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
            // No ExcelJS não existe um "CopyRange" direto t?o simples, 
            // mas podemos tentar manter os estilos se o template já tiver a linha formatada.
        });

        // 6. Salvar
        if (!romData.ENDERECORomaneio) {
            throw new Error('Diretório do Romaneio não configurado no banco de dados.');
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
app.get('/api/romaneio/download-excel/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
            [id]
        );

        if (rows.length === 0) return res.status(404).send('Romaneio não encontrado');
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).send('Diretório de arquivos não encontrado');
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
app.post('/api/romaneio/open-folder/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Romaneio não encontrado' });
        const dir = rows[0].ENDERECORomaneio;

        if (!dir || !fs.existsSync(dir)) {
            return res.status(404).json({ success: false, message: 'Diretório não existe no servidor' });
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
app.get('/api/tarefas', tenantMiddleware, async (req, res) => {
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
        const [rows] = await req.tenantDbPool.execute(query);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tarefas' });
    }
});


// GET /api/romaneio - List all
app.get('/api/romaneio', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.query(
            "SELECT idRomaneio AS idRomaneio, Descricao AS Descricao, EnviadoPara AS EnviadoPara, DATACRIACAO AS DATACRIACAO, CriadoPor AS CriadoPor, ENDERECORomaneio AS ENDERECORomaneio, Estatus AS Estatus, Liberado AS Liberado, DataEnvio AS DataEnvio, NomeMotorista AS NomeMotorista FROM romaneio WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*') ORDER BY idRomaneio DESC"
        );


        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching romaneios:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar romaneios' });
    }
});

// GET /api/romaneio/v-itens-projeto-aberto - Search available items from project
app.get('/api/romaneio/v-itens-projeto-aberto', tenantMiddleware, async (req, res) => {
    const { projeto, tag, resumo, detalhe, codFabricante, mostrarEnviados, mostrarFinalizados } = req.query;

    try {
        let conditionFinalizado = "(OrdemServicoItemFinalizado = '' OR OrdemServicoItemFinalizado IS NULL)";
        if (mostrarFinalizados === 'true') {
            conditionFinalizado = "(OrdemServicoItemFinalizado = '' OR OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = 'C')";
        }

        let sql = `SELECT * FROM v_rom_itens_disponiveis WHERE 
            ${conditionFinalizado} AND 
            (Liberado_Engenharia = 'S')`;

        const params = [];

        if (mostrarEnviados !== 'true') {
            // Mostra apenas itens com saldo real > 0 (QtdeTotal - já enviado)
            sql += ` AND (QtdeTotal - COALESCE(RomaneioTotalEnviado, 0)) > 0`;
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

        sql += ` LIMIT 500`;

        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching v-itens-projeto-aberto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens disponíveis.' });
    }
});

// GET /api/romaneio/:id - Get single romaneio details
app.get('/api/romaneio/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT * FROM romaneio WHERE idRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Romaneio não encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(`Error fetching romaneio #${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do romaneio' });
    }
});

// POST /api/romaneio/:id/items - Add items to a Romaneio
app.post('/api/romaneio/:id/items', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { IdOrdemServicoItem, qtde, usuario } = req.body;

    if (!IdOrdemServicoItem || !qtde || qtde <= 0) {
        return res.status(400).json({ success: false, message: 'Dados inválidos para inclusão.' });
    }

    try {
        // 1. Fetch item details and check balance from view
        const [viewRows] = await req.tenantDbPool.execute(
            "SELECT * FROM v_rom_itens_disponiveis WHERE IdOrdemServicoItem = ?",
            [IdOrdemServicoItem]
        );

        if (viewRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item não encontrado ou já finalizado.' });
        }

        const item = viewRows[0];
        const saldoDisponivel = (item.QtdeTotal || 0) - (item.RomaneioTotalEnviado || 0);

        if (qtde > saldoDisponivel) {
            return res.status(400).json({
                success: false,
                message: `Quantidade solicitada (${qtde}) ? maior que o saldo disponível (${saldoDisponivel}).`
            });
        }

        // 2. UPSERT: verificar se item já existe neste romaneio (evitar duplicata)
        const [existing] = await req.tenantDbPool.execute(
            "SELECT IdRomaneioItem, qtdeUsuario FROM romaneioitem WHERE IdRomaneio = ? AND IDOrdemServicoITEM = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1",
            [id, IdOrdemServicoItem]
        );

        const pesoUnit = item.PesoUnitario || 0;
        const areaUnit = item.AreaPinturaUnitario || 0;

        if (existing.length > 0) {
            // Item já existe → somar quantidade ao registro existente
            const reg = existing[0];
            const novaQtde = Number(reg.qtdeUsuario) + Number(qtde);
            const novoPeso = pesoUnit * novaQtde;
            const novaArea = areaUnit * novaQtde;

            await req.tenantDbPool.execute(
                "UPDATE romaneioitem SET qtdeUsuario = ?, qtdeGrid = ?, QtdeRomaneio = ?, PesoTotal = ?, AreaPinturaTotal = ? WHERE IdRomaneioItem = ?",
                [novaQtde, novaQtde, novaQtde, novoPeso, novaArea, reg.IdRomaneioItem]
            );
            // Atualiza ordemservicoitem com referências ao romaneio
            await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem
                 SET idRomaneio = ?, IdRomaneioItem = ?, QtdeRomaneio = ?, EnviadoParaRomaneio = 'S'
                 WHERE IdOrdemServicoItem = ?`,
                [id, reg.IdRomaneioItem, novaQtde, IdOrdemServicoItem]
            );
            await req.tenantDbPool.execute(
                "INSERT INTO ordemservicoitemcontrole (IdOrdemServico, IdOrdemServicoItem, Processo, QtdeTotal, QtdeProduzida, Origem, CriadoPor, DataCriacao, D_E_L_E_T_E) VALUES (?, ?, 'Expedicao', ?, ?, 'Expedicao', ?, ?, '')",
                [item.IdOrdemServico || null, IdOrdemServicoItem, item.QtdeTotal || qtde, qtde, usuario || 'Sistema', getCurrentDateTimeBR()]
            );
            return res.json({ success: true, message: `Quantidade somada ao item existente. Nova qtde: ${novaQtde}` });
        }

        // Item não existe → INSERT novo registro
        const pesoTotal = pesoUnit * qtde;
        const areaTotal = areaUnit * qtde;

        const [insertResult] = await req.tenantDbPool.execute(
            "INSERT INTO romaneioitem (IdRomaneio, IDOrdemServicoITEM, Usuario, DataCriacao, qtdeUsuario, qtdeGrid, QtdeRomaneio, PesoUnitario, PesoTotal, AreaPintura, AreaPinturaTotal, CodMatFabricante, Situacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ITEM LOCALIZADO')",
            [id, IdOrdemServicoItem, usuario || 'Sistema', getCurrentDateTimeBR(), qtde, qtde, qtde, pesoUnit, pesoTotal, areaUnit, areaTotal, item.CodMatFabricante || '']
        );
        const novoIdRomaneioItem = insertResult.insertId;
        // Atualiza ordemservicoitem com referências ao romaneio
        await req.tenantDbPool.execute(
            `UPDATE ordemservicoitem
             SET idRomaneio = ?, IdRomaneioItem = ?, QtdeRomaneio = ?, EnviadoParaRomaneio = 'S'
             WHERE IdOrdemServicoItem = ?`,
            [id, novoIdRomaneioItem, qtde, IdOrdemServicoItem]
        );
        await req.tenantDbPool.execute(
            "INSERT INTO ordemservicoitemcontrole (IdOrdemServico, IdOrdemServicoItem, Processo, QtdeTotal, QtdeProduzida, Origem, CriadoPor, DataCriacao, D_E_L_E_T_E) VALUES (?, ?, 'Expedicao', ?, ?, 'Expedicao', ?, ?, '')",
            [item.IdOrdemServico || null, IdOrdemServicoItem, item.QtdeTotal || qtde, qtde, usuario || 'Sistema', getCurrentDateTimeBR()]
        );
        res.json({ success: true, message: 'Item adicionado ao romaneio com sucesso!' });
    } catch (error) {
        console.error('Error adding item to romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao incluir item no romaneio.' });
    }
});

// GET /api/romaneio/:id/inserted-items - List items already in the Romaneio
app.get('/api/romaneio/:id/inserted-items', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { projeto, tag, resumo, detalhe, codFabricante } = req.query;

    try {
        let sql = `SELECT * FROM v_rom_itens_incluidos WHERE IdRomaneio = ?`;
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

        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching inserted items:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens do romaneio.' });
    }
});

// GET /api/files/open-pdf/:idRomaneioItem - Open PDF drawing for a romaneio item
app.get('/api/files/open-pdf/:idRomaneioItem', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    const fs = require('fs');
    const path = require('path');

    console.log(`[FILES] Request to open PDF for Item: ${idRomaneioItem}`);

    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT EnderecoArquivo FROM v_rom_itens_incluidos WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (rows.length === 0 || !rows[0].EnderecoArquivo) {
            console.warn(`[FILES] No EnderecoArquivo found for Item: ${idRomaneioItem}`);
            return res.status(404).json({ success: false, message: 'Arquivo não associado a este item.' });
        }

        const originalEndereco = rows[0].EnderecoArquivo;
        let endereco = originalEndereco;

        // Normalização baseada na l?gica VB.NET original
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
                message: `Arquivo PDF não encontrado. Favor verificar se o caminho est? acess?vel: ${endereco}`,
                path: endereco
            });
        }
    } catch (error) {
        console.error('[FILES] Fatal error opening PDF:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar solicitação do desenho.' });
    }
});

// GET /api/files/open-3d/:idRomaneioItem - Open original 3D drawing
app.get('/api/files/open-3d/:idRomaneioItem', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    const fs = require('fs');
    const path = require('path');

    console.log(`[FILES] Request to open 3D for Item: ${idRomaneioItem}`);

    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT EnderecoArquivo FROM v_rom_itens_incluidos WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (rows.length === 0 || !rows[0].EnderecoArquivo) {
            console.warn(`[FILES] No EnderecoArquivo found for Item: ${idRomaneioItem}`);
            return res.status(404).json({ success: false, message: 'Arquivo não associado a este item.' });
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
                message: `Arquivo original não encontrado no servidor: ${endereco}`,
                path: endereco
            });
        }
    } catch (error) {
        console.error('[FILES] Fatal error opening 3D:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar desenho 3D.' });
    }
});
// PUT /api/romaneio/item/:idRomaneioItem/observacao - Update observation
app.put('/api/romaneio/item/:idRomaneioItem/observacao', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const { observacao } = req.body;
        const { idRomaneioItem } = req.params;
        connection = await pool.getConnection();
        
        await connection.execute(
            "UPDATE romaneioitem SET Observacao = ? WHERE IdRomaneioItem = ?",
            [observacao, idRomaneioItem]
        );
        
        res.json({ success: true, message: 'Observação atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar observacao:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/romaneio/item/:idRomaneioItem/estorno - Estorno de quantidade
app.post('/api/romaneio/item/:idRomaneioItem/estorno', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    const { qtdeEstorno, usuario } = req.body;
    let conn = null;
    try {
        const qtde = Number(qtdeEstorno);
        if (!qtde || qtde <= 0) {
            return res.status(400).json({ success: false, message: 'Quantidade de estorno inválida.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Busca o item do romaneio com todos os dados necessários
        const [rows] = await conn.execute(
            `SELECT IdRomaneioItem, IdRomaneio, IDOrdemServicoITEM,
                    qtdeRomaneio, SaldoRomaneio, PesoUnitario, AreaPintura
             FROM romaneioitem
             WHERE IdRomaneioItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
             LIMIT 1`,
            [idRomaneioItem]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item não encontrado no romaneio.' });
        }

        const item = rows[0];
        const qtdeAtual = Number(item.qtdeRomaneio || 0);
        const saldoAtual = Number(item.SaldoRomaneio || 0);

        // 2. Validação: qtdeEstorno <= qtdeRomaneio
        if (qtde > qtdeAtual) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Quantidade de estorno (${qtde}) não pode ser maior que a quantidade no romaneio (${qtdeAtual}).`
            });
        }

        const novaQtdeRomaneio = qtdeAtual - qtde;
        const novoSaldo = saldoAtual + qtde;
        const now = getCurrentDateTimeBR();
        const dateNow = getCurrentDateBR();

        // 3. Atualiza romaneioitem
        await conn.execute(
            `UPDATE romaneioitem SET qtdeRomaneio = ?, SaldoRomaneio = ? WHERE IdRomaneioItem = ?`,
            [novaQtdeRomaneio, novoSaldo, idRomaneioItem]
        );

        // 4. Registra em romaneioitemcontrole com Situacao = 'ESTORNO'
        const pesoCalc = Number(item.PesoUnitario || 0) * qtde;
        const areaCalc = Number(item.AreaPintura || 0) * qtde;

        await conn.execute(
            `INSERT INTO romaneioitemcontrole
                (IdRomaneioItem, IdRomaneio, IDOrdemServicoITEM, Usuario, DataCriacao,
                 qtdeUsuario, qtdeGrid, PesoUnitario, Pesocalculado, AreaPintura, AreaPinturaCalculada,
                 Situacao, D_E_L_E_T_E)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESTORNO', '')`,
            [
                idRomaneioItem,
                item.IdRomaneio,
                item.IDOrdemServicoITEM,
                usuario || 'Sistema',
                now,
                qtde,
                qtde,
                item.PesoUnitario || 0,
                pesoCalc,
                item.AreaPintura || 0,
                areaCalc
            ]
        );

        await conn.commit();
        console.log(`[Estorno] Item #${idRomaneioItem}: -${qtde} | Nova qtde: ${novaQtdeRomaneio} | Novo saldo: ${novoSaldo}`);
        res.json({
            success: true,
            message: `Estorno de ${qtde} unidade(s) realizado com sucesso.`,
            novaQtdeRomaneio,
            novoSaldo
        });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error('[Estorno] Erro:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao processar estorno.' });
    } finally {
        if (conn) conn.release();
    }
});

// POST /api/romaneio/item/:idRomaneioItem/alterar-qtde - Alterar (subtrair) qtdeUsuario e devolver saldo à OS
app.post('/api/romaneio/item/:idRomaneioItem/alterar-qtde', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    const { qtdeAlterar, usuario } = req.body;
    let conn = null;
    try {
        const qtde = Number(qtdeAlterar);
        if (!qtde || qtde <= 0) {
            return res.status(400).json({ success: false, message: 'Quantidade inválida.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Busca o item do romaneio
        const [rows] = await conn.execute(
            `SELECT IdRomaneioItem, IdRomaneio, IDOrdemServicoITEM, qtdeUsuario
             FROM romaneioitem
             WHERE IdRomaneioItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
             LIMIT 1`,
            [idRomaneioItem]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item não encontrado no romaneio.' });
        }

        const item = rows[0];
        const qtdeAtual = Number(item.qtdeUsuario || 0);

        // 2. Validação: qtdeAlterar <= qtdeUsuario
        if (qtde > qtdeAtual) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Quantidade (${qtde}) não pode ser maior que a qtde do item (${qtdeAtual}).`
            });
        }

        const novaQtdeUsuario = qtdeAtual - qtde;

        // 3. Atualiza qtdeUsuario no romaneioitem
        await conn.execute(
            `UPDATE romaneioitem SET qtdeUsuario = ?, qtdeGrid = ?, QtdeRomaneio = ? WHERE IdRomaneioItem = ?`,
            [novaQtdeUsuario, novaQtdeUsuario, novaQtdeUsuario, idRomaneioItem]
        );

        // 4. Devolve a quantidade ao RomaneioSaldoEnviar da OS
        await conn.execute(
            `UPDATE ordemservicoitem
             SET RomaneioSaldoEnviar = COALESCE(RomaneioSaldoEnviar, 0) + ?
             WHERE IdOrdemServicoItem = ?`,
            [qtde, item.IDOrdemServicoITEM]
        );

        await conn.commit();
        console.log(`[AlterarQtde] Item #${idRomaneioItem}: qtdeUsuario ${qtdeAtual} -> ${novaQtdeUsuario} | +${qtde} devolvido ao saldo OS`);
        res.json({
            success: true,
            message: `Quantidade alterada. Nova qtde: ${novaQtdeUsuario}. Saldo devolvido à OS: +${qtde}.`,
            novaQtdeUsuario
        });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error('[AlterarQtde] Erro:', err);
        res.status(500).json({ success: false, message: 'Erro ao processar alteração de quantidade.' });
    } finally {
        if (conn) conn.release();
    }
});

app.delete('/api/romaneio/item/:idRomaneioItem', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    const { usuario } = req.query; // Pega o usuário da query string ou header se disponível
    const connection = await pool.getConnection();

    console.log(`[DELETE] Request to delete Item: ${idRomaneioItem} by User: ${usuario}`);

    try {
        await connection.beginTransaction();

        // 1. Validar se o item existe e obter dados b?sicos
        const [itemRows] = await connection.execute(
            "SELECT IdRomaneio, IDOrdemServicoITEM, qtdeUsuario FROM romaneioitem WHERE IdRomaneioItem = ?",
            [idRomaneioItem]
        );

        if (itemRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Item não encontrado.' });
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
            return res.status(400).json({ success: false, message: 'Já existe retorno deste Item, não pode ser excluído.' });
        }

        // 3. Validar Bloqueio (Status do Romaneio - Liberado)
        const [romaneioRows] = await connection.execute(
            "SELECT Liberado FROM romaneio WHERE idRomaneio = ?",
            [idRomaneio]
        );

        if (romaneioRows.length > 0 && romaneioRows[0].Liberado === 'S') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este Romaneio já est? Liberado e não permite exclusão de itens.' });
        }

        // 4. Soft Delete do Item
        await connection.execute(
            "UPDATE romaneioitem SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = NOW(), UsuarioD_E_L_E_T_E = ? WHERE IdRomaneioItem = ?",
            [usuario || 'Sistema', idRomaneioItem]
        );

        // 5. Atualizar Saldo na Ordem de Serviço (ordemservicoitem)
        const [osItemRows] = await connection.execute(
            "SELECT RomaneioTotalEnviado, RomaneioSaldoEnviar FROM ordemservicoitem WHERE IdOrdemServicoItem = ?",
            [idOSItem]
        );

        if (osItemRows.length > 0) {
            let totalEnviado = (osItemRows[0].RomaneioTotalEnviado || 0) - qtdeRemover;
            let saldoEnviar = (osItemRows[0].RomaneioSaldoEnviar || 0) + qtdeRemover;

            // Garantir que não fiquem negativos por erro de arredondamento ou dados prévios
            totalEnviado = Math.max(0, totalEnviado);

            if (totalEnviado === 0) {
                // Item totalmente removido do romaneio → limpar todos os campos de referência
                await connection.execute(
                    `UPDATE ordemservicoitem
                     SET RomaneioTotalEnviado = 0,
                         RomaneioSaldoEnviar  = ?,
                         EnviadoParaRomaneio  = '',
                         idRomaneio           = NULL,
                         IdRomaneioItem       = NULL,
                         QtdeRomaneio         = NULL
                     WHERE IdOrdemServicoItem = ?`,
                    [saldoEnviar, idOSItem]
                );
                console.log(`[DELETE] OS Item #${idOSItem}: referências ao romaneio limpas.`);
            } else {
                // Ainda há quantidade enviada → apenas atualiza saldos
                await connection.execute(
                    `UPDATE ordemservicoitem
                     SET RomaneioTotalEnviado = ?,
                         RomaneioSaldoEnviar  = ?,
                         EnviadoParaRomaneio  = 'S'
                     WHERE IdOrdemServicoItem = ?`,
                    [totalEnviado, saldoEnviar, idOSItem]
                );
            }
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
        res.json({ success: true, message: 'Item excluído com sucesso e saldos atualizados.' });

    } catch (error) {
        await connection.rollback();
        console.error('[DELETE] Error deleting romaneio item:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao excluir item do romaneio.' });
    } finally {
        connection.release();
    }
});

// POST /api/admin/shutdown - Shut down background processes
app.post('/api/admin/shutdown', tenantMiddleware, async (req, res) => {
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
app.post('/api/romaneio/open', tenantMiddleware, async (req, res) => {
    const { id, path: clientPath } = req.body;
    try {
        let folderPath = clientPath || null;

        // Se o frontend não enviou o path, busca no banco pelo id
        if (!folderPath && id) {
            const [rows] = await req.tenantDbPool.execute(
                "SELECT ENDERECORomaneio FROM romaneio WHERE idRomaneio = ? LIMIT 1",
                [id]
            );
            if (rows.length > 0 && rows[0].ENDERECORomaneio) {
                folderPath = rows[0].ENDERECORomaneio;
            }
        }

        if (!folderPath) {
            return res.status(400).json({ success: false, message: 'Caminho da pasta não definido para este romaneio.' });
        }

        console.log(`[Action] Abrindo pasta do Romaneio #${id}: ${folderPath}`);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ success: false, message: `Pasta não encontrada no servidor: ${folderPath}` });
        }

        // Abre no Windows Explorer
        require('child_process').exec(`start "" "${folderPath}"`, (err) => {
            if (err) {
                console.error('Erro ao abrir pasta:', err);
            }
        });

        res.json({ success: true, message: `Abrindo pasta: ${folderPath}` });

    } catch (error) {
        console.error('Error opening romaneio folder:', error);
        res.status(500).json({ success: false, message: 'Erro ao abrir pasta' });
    }
});

// POST /api/romaneio - Create New
app.post('/api/romaneio', tenantMiddleware, async (req, res) => {
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
                message: `Caminho raiz não encontrado: ${rootPath}. Verifique a configuração do sistema.`
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

        const paddedId = String(newId).padStart(4, '0'); // 4 digits: 0001, 0023, etc.
        const folderPath = `${rootPath}\\RO_${paddedId}`;

        // 4. Criar pasta fisicamente no disco
        try {
            fs.mkdirSync(folderPath, { recursive: true });
            fs.mkdirSync(`${folderPath}\\PDF`, { recursive: true });
            console.log(`[Romaneio] Pasta criada: ${folderPath}`);
        } catch (mkdirErr) {
            // Nao bloqueia a criacao do romaneio se a pasta falhar (ex: drive nao mapeado)
            console.error(`[Romaneio] Erro ao criar pasta ${folderPath}:`, mkdirErr.message);
        }

        // 5. Salvar caminho no banco
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
app.put('/api/romaneio/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        await req.tenantDbPool.execute(
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
app.delete('/api/romaneio/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        await req.tenantDbPool.query(
            "UPDATE romaneio SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ? WHERE idRomaneio = ?",
            [getCurrentDateTimeBR(), id]
        );
        res.json({ success: true, message: 'Romaneio excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting romaneio:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir romaneio' });
    }
});

// PUT /api/romaneio/:id/action - Perform specific actions (Status Workflow)
app.put('/api/romaneio/:id/action', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { action, usuario } = req.body;
    if (!action) {
        return res.status(400).json({ success: false, message: 'A??o não especificada.' });
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
                const [checkRows] = await req.tenantDbPool.execute(
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
                            message: `Este Romaneio já possui registro de envio e não pode ser alterado. (Motorista: ${r.NomeMotorista || 'N/A'} | Data: ${r.DataEnvio || 'N/A'}). O processo foi finalizado.`
                        });
                    }
                }

                // Validate mandatory fields if this is a registration with data
                if (dadosEnvio) {
                    if (!dadosEnvio.motorista || !dadosEnvio.tipoTransporte || !dadosEnvio.cnh || !dadosEnvio.categoria || !dadosEnvio.telefone) {
                        // Strict validation as requested
                        return res.status(400).json({ success: false, message: 'Dados de envio incompletos. Preencha todos os campos obrigatorios.' });
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
                        dadosEnvio.placa ? dadosEnvio.placa.toUpperCase() : dadosEnvio.tipoTransporte.toUpperCase(),
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
                    // No, "os novos campos tambem ser?o obrigatorios".
                    if (!req.body.dadosEnvio) {
                        return res.status(400).json({ success: false, message: 'Dados do transporte s?o obrigatórios para registrar.' });
                    }
                }
                break;

            case 'liberar':
                // 1. Check current status
                const [currentRows] = await req.tenantDbPool.execute(
                    "SELECT Estatus, Liberado, D_E_L_E_T_E, NomeMotorista, DataEnvio FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );

                if (currentRows.length === 0) {
                    return res.status(404).json({ success: false, message: 'Romaneio não encontrado.' });
                }

                const current = currentRows[0];

                // Validation 1: Check if soft deleted
                if (current.D_E_L_E_T_E === '*') {
                    return res.status(400).json({ success: false, message: 'Não ? possível liberar um romaneio excluído.' });
                }

                // Validation 2: Check if already finalized
                if (current.Estatus === 'F') {
                    return res.status(400).json({ success: false, message: 'Romaneio já finalizado. Não ? possível liberar.' });
                }

                // Validation 3: Check if registered (Motorista and Date)
                if (!current.NomeMotorista || !current.DataEnvio) {
                    return res.status(400).json({ success: false, message: 'O romaneio deve ser registrado (motorista e data) antes de ser liberado.' });
                }

                // Validation 4: Check if already released (Condition 1)
                if (current.Liberado === 'S') {
                    return res.status(400).json({ success: false, message: 'O romaneio já consta como Liberado. O processo não pode ser repetido.' });
                }

                // Validation 5: Check if there are items (Condition 2)
                const [itemRows] = await req.tenantDbPool.execute(
                    "SELECT COUNT(*) as count FROM romaneioitem WHERE IdRomaneio = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')",
                    [id]
                );

                if (itemRows[0].count === 0) {
                    return res.status(400).json({ success: false, message: 'O romaneio não possui itens vinculados. Liberação interrompida. Por favor, adicione itens antes de prosseguir.' });
                }

                // Proceed with update
                updateQuery = "UPDATE romaneio SET Estatus = '', Liberado = 'S', DataLiberacao = ?, UsuarioLiberacao = ? WHERE idRomaneio = ?";
                params = [now, usuario || 'Sistema', id];
                break;

            case 'cancelar_lib':
                // 1. Fetch current details
                const [abortRows] = await req.tenantDbPool.execute(
                    "SELECT Estatus, Liberado, ENDERECORomaneio FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );

                if (abortRows.length === 0) {
                    console.log(`[Action] ERRO: Romaneio #${id} não localizado no banco de dados para cancelar liberação.`);
                    return res.status(404).json({ success: false, message: `Romaneio #${id} não encontrado no banco de dados.` });
                }

                const abort = abortRows[0];
                // Helper for case-insensitive access in JS object
                const getAbortVal = (obj, key) => {
                    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                    return foundKey ? String(obj[foundKey] || '').trim().toUpperCase() : '';
                };

                const abortLiberado = getAbortVal(abort, 'Liberado');
                const abortEstatus = getAbortVal(abort, 'Estatus');

                console.log(`[Action] Cancelar Liberação ID: ${id} | Estatus: "${abortEstatus}" | Liberado: "${abortLiberado}"`);

                // STRICT VALIDATION
                if (abortEstatus === 'F') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} já est? FINALIZADO e não pode ser cancelado.` });
                }

                if (abortLiberado !== 'S') {
                    return res.status(400).json({ success: false, message: `O Romaneio #${id} não consta como liberado (Status DB: "${abortLiberado}"). Liberação não pode ser cancelada.` });
                }

                // 2. Perform cleanup if released
                if (abort.ENDERECORomaneio) {
                    const pdfPath = path.join(abort.ENDERECORomaneio, 'PDF');
                    console.log(`[Action] Limpando diretório de PDFs: ${pdfPath}`);
                    limparDiretorio(pdfPath);
                }

                // 3. Update database (Matching Legacy VB.NET exact fields and values)
                console.log(`[Action] Executando SQL de Cancelamento para Romaneio #${id}`);
                updateQuery = "UPDATE romaneio SET Estatus = '', Liberado = '', UsuarioLiberacao = '', DataLiberacao = '' WHERE idRomaneio = ?";
                params = [id];
                break;

            case 'cancelar_registro':
                // Valida: so permitido quando romaneio esta Registrado (tem motorista, nao liberado, nao finalizado)
                const [crRows] = await req.tenantDbPool.execute(
                    "SELECT Estatus, Liberado, NomeMotorista FROM romaneio WHERE idRomaneio = ?",
                    [id]
                );
                if (crRows.length === 0) {
                    return res.status(404).json({ success: false, message: `Romaneio #${id} nao encontrado.` });
                }
                const crRec      = crRows[0];
                const crLiberado = String(crRec.Liberado     || '').trim().toUpperCase();
                const crEstatus  = String(crRec.Estatus      || '').trim().toUpperCase();
                const crMotorista= String(crRec.NomeMotorista|| '').trim();

                if (crEstatus === 'F') {
                    return res.status(400).json({ success: false, message: `Romaneio #${id} esta FINALIZADO e nao pode ter o registro cancelado.` });
                }
                if (crLiberado === 'S') {
                    return res.status(400).json({ success: false, message: `Romaneio #${id} ja esta Liberado. Cancele a liberacao primeiro.` });
                }
                if (!crMotorista) {
                    return res.status(400).json({ success: false, message: `Romaneio #${id} nao possui registro de motorista para cancelar.` });
                }

                // Desfaz tudo que o "Registrar" fez — volta ao estado Novo
                updateQuery = `UPDATE romaneio SET
                    Estatus = '',
                    NomeMotorista = '',
                    PlacaVeiculo = '',
                    Cnh = '',
                    Categoria = '',
                    Telefone = '',
                    TipoTransporte = '',
                    DataEnvio = '',
                    HoraEnvio = ''
                    WHERE idRomaneio = ?`;
                params = [id];
                break;

            case 'atualizar':
                // For now, maybe just update status to 'Atualizado'é Or just a touch? 
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
                return res.status(400).json({ success: false, message: 'A??o inválida.' });
        }

        const [result] = await req.tenantDbPool.execute(updateQuery, params);

        // --- Post-Action Logic: Excel Export for 'liberar' ---
        let excelResult = null;
        if (action === 'liberar' && result.affectedRows > 0) {
            excelResult = await ExportarRomaneioExcelPadrao(id);
        }

        if (result.affectedRows > 0) {
            let successMessage = `A??o '${action}' realizada com sucesso!`;
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
            res.status(404).json({ success: false, message: 'Romaneio não encontrado.' });
        }

    } catch (error) {
        console.error(`Error performing action ${action} on romaneio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao processar ação.' });
    }
});

// --- ROMANEIO-RETORNO ROUTES ---

// GET /api/romaneio-retorno/items - List items for return control
app.get('/api/romaneio-retorno/items', tenantMiddleware, async (req, res) => {
    const { romaneio, projeto, tag, numDoc, mostrarConcluidos } = req.query;
    try {
        let sql = `SELECT * FROM view_retorno_itens WHERE 1=1
            AND IdRomaneio IN (SELECT idRomaneio FROM romaneio WHERE Liberado = 'S')`;
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

        if (mostrarConcluidos === 'true') {
            // Mostrar concluídos: exibe apenas registros finalizados manualmente ou com saldo zerado
            sql += ` AND (MarcarComoFinalizado = 'S' OR Saldo <= 0)`;
        } else {
            // Padrão (não marcados): exibe apenas registros em aberto com saldo maior que zero
            sql += ` AND (MarcarComoFinalizado IS NULL OR MarcarComoFinalizado != 'S') AND Saldo > 0`;
        }

        sql += ` ORDER BY IdRomaneio DESC, IdRomaneioItem ASC LIMIT 500`;

        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[RETORNO] Erro ao buscar itens:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens para retorno.' });
    }
});

// GET /api/romaneio-retorno/history/:idRomaneioItem - List movement history for an item
app.get('/api/romaneio-retorno/history/:idRomaneioItem', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem } = req.params;
    try {
        const [rows] = await req.tenantDbPool.execute(
            `SELECT * FROM romaneioitemcontrole 
             WHERE IdRomaneioItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
             ORDER BY DataCriacao DESC`,
            [idRomaneioItem]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[RETORNO] Erro ao buscar histórico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar histórico do item.' });
    }
});

// POST /api/romaneio-retorno/process - Mark item as returned/processed
app.post('/api/romaneio-retorno/process', tenantMiddleware, async (req, res) => {
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
            throw new Error('Item do romaneio não encontrado.');
        }

        const item = itemRows[0];
        const novaQtdeRetorno = (Number(item.QtdeTotalRetorno) || 0) + Number(qtdeRetorno);

        // 2. Inserir no histórico (romaneioitemcontrole)
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

// POST /api/romaneio-retorno/registrar-retorno — Registra qtde de retorno em romaneioitemcontrole
app.post('/api/romaneio-retorno/registrar-retorno', tenantMiddleware, async (req, res) => {
    const { idRomaneioItem, idRomaneio, qtdeGrid, usuario, nomeCompleto } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Buscar dados do item — usa qtdeUsuario como quantidade enviada real
        const [itemRows] = await connection.execute(
            'SELECT qtdeUsuario AS QtdeEnviada, QtdeTotalRetorno, IDOrdemServicoITEM FROM romaneioitem WHERE IdRomaneioItem = ?',
            [idRomaneioItem]
        );
        if (itemRows.length === 0) throw new Error('Item do romaneio não encontrado.');

        const item = itemRows[0];
        const qtdeEnviada = Number(item.QtdeEnviada) || 0;
        const qtde = Number(qtdeGrid);

        // 2. Validar quantidade
        if (!qtde || qtde <= 0) throw new Error('Quantidade deve ser maior que zero.');
        if (qtde > qtdeEnviada) throw new Error(`Quantidade (${qtde}) não pode ser maior que a quantidade enviada (${qtdeEnviada}).`);

        // 3. Inserir em romaneioitemcontrole com qtdeUsuario, IdRomaneio, DataRetorno, UsuarioRetorno e Situacao = RETORNO
        await connection.execute(
            `INSERT INTO romaneioitemcontrole
             (IdRomaneioItem, IdRomaneio, IDOrdemServicoITEM, qtdeUsuario, DataRetorno, UsuarioRetorno, DataCriacao, Usuario, Situacao)
             VALUES (?, ?, ?, ?, CURDATE(), ?, NOW(), ?, 'RETORNO')`,
            [idRomaneioItem, idRomaneio, item.IDOrdemServicoITEM, qtde, nomeCompleto, nomeCompleto]
        );

        // 4. Atualizar saldo de retorno no romaneioitem
        const novaQtdeRetorno = (Number(item.QtdeTotalRetorno) || 0) + qtde;
        await connection.execute(
            "UPDATE romaneioitem SET QtdeTotalRetorno = ?, Situacao = 'RETORNO' WHERE IdRomaneioItem = ?",
            [novaQtdeRetorno, idRomaneioItem]
        );

        await connection.commit();
        res.json({ success: true, message: `Retorno de ${qtde} peça(s) registrado com sucesso.` });
    } catch (error) {
        await connection.rollback();
        console.error('[REGISTRAR-RETORNO]', error.message);
        res.status(400).json({ success: false, message: error.message || 'Erro ao registrar retorno.' });
    } finally {
        connection.release();
    }
});

// DELETE /api/romaneio-retorno/history/:idControle - Cancel a return entry
app.delete('/api/romaneio-retorno/history/:idControle', tenantMiddleware, async (req, res) => {
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
            throw new Error('Registro de histórico não encontrado.');
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

// GET /api/romaneio-retorno/controle/:idOrdemServicoItem - busca romaneioitemcontrole pelo IdOrdemServicoItem
app.get('/api/romaneio-retorno/controle/:idOrdemServicoItem', tenantMiddleware, async (req, res) => {
    const { idOrdemServicoItem } = req.params;
    try {
        const [rows] = await req.tenantDbPool.execute(
            `SELECT ric.*, ri.QtdeUsuario AS QtdeAtualItem, ri.IdRomaneioItem
             FROM romaneioitemcontrole ric
             LEFT JOIN romaneioitem ri ON ri.IdRomaneioItem = ric.IdRomaneioItem
             WHERE ric.IDOrdemServicoITEM = ?
               AND (ric.D_E_L_E_T_E IS NULL OR ric.D_E_L_E_T_E = '')
             ORDER BY ric.DataCriacao DESC`,
            [idOrdemServicoItem]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[RETORNO] Erro ao buscar controle:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar controle.' });
    }
});

// POST /api/romaneio-retorno/estorno/:idControle - Estorna um registro de romaneioitemcontrole
app.post('/api/romaneio-retorno/estorno/:idControle', tenantMiddleware, async (req, res) => {
    const { idControle } = req.params;
    const { usuario, observacao, qtdeEstorno } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Buscar o registro de controle (usando IdRomaneioItem)
        const [ctrlRows] = await connection.execute(
            `SELECT idromaneioitemcontrole, IdRomaneioItem, qtdeUsuario, Situacao
             FROM romaneioitemcontrole 
             WHERE IdRomaneioItem = ? AND Situacao = 'RETORNO' 
             ORDER BY DataCriacao DESC LIMIT 1`,
            [idControle]
        );
        if (ctrlRows.length === 0) throw new Error('Registro não encontrado.');
        const ctrl = ctrlRows[0];

        if (ctrl.Situacao === 'ESTORNO') {
            throw new Error('Este registro já foi estornado.');
        }

        // Quantidade a devolver: usa qtdeEstorno digitado pelo usuário (validado no frontend)
        const maxQtde = Number(ctrl.qtdeUsuario || 0);
        const qtdeDevolucao = qtdeEstorno ? Math.min(Number(qtdeEstorno), maxQtde) : maxQtde;
        if (qtdeDevolucao <= 0) throw new Error('Quantidade de estorno inválida.');

        // 2. Subtrair qtdeDevolucao de QtdeTotalRetorno no romaneioitem
        const [itemRows] = await connection.execute(
            `SELECT QtdeTotalRetorno FROM romaneioitem WHERE IdRomaneioItem = ?`,
            [ctrl.IdRomaneioItem]
        );
        if (itemRows.length > 0) {
            const novaQtde = Math.max(0, (Number(itemRows[0].QtdeTotalRetorno) || 0) - qtdeDevolucao);
            const situacaoUpdate = novaQtde === 0 ? "Situacao = 'ITEM LOCALIZADO'" : "Situacao = 'RETORNO'";
            await connection.execute(
                `UPDATE romaneioitem SET QtdeTotalRetorno = ?, ${situacaoUpdate} WHERE IdRomaneioItem = ?`,
                [novaQtde, ctrl.IdRomaneioItem]
            );
        }

        // 3. Marcar o registro de controle como ESTORNO e salvar Observacao
        await connection.execute(
            `UPDATE romaneioitemcontrole SET Situacao = 'ESTORNO', Usuario = ?, Observacao = ? WHERE idromaneioitemcontrole = ?`,
            [usuario || 'Sistema', observacao || '', ctrl.idromaneioitemcontrole]
        );

        await connection.commit();
        res.json({ success: true, message: `Estorno realizado. ${qtdeDevolucao} unidade(s) devolvidas ao item.` });
    } catch (error) {
        await connection.rollback();
        console.error('[RETORNO] Erro no estorno:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao realizar estorno.' });
    } finally {
        connection.release();
    }
});

// Configuração do Sistema (Admin only)
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

// Helper: Registrar acesso de usuário no banco central (auditoria)
async function recordLoginAudit(login, dbName, clientName, ip) {
    let conn;
    try {
        conn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        // Garante que a tabela existe
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS login_audit (
                id INT AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(100) NOT NULL,
                db_name VARCHAR(100),
                client_name VARCHAR(150),
                ip_address VARCHAR(50),
                data_acesso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_data (data_acesso)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await conn.execute(
            'INSERT INTO login_audit (login, db_name, client_name, ip_address, data_acesso) VALUES (?, ?, ?, ?, NOW())',
            [login, dbName || null, clientName || null, ip || null]
        );
    } catch (err) {
        console.warn('[AUDIT] Erro ao registrar login:', err.message);
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
                    c.id as id_conexao_banco, c.nome_cliente, c.db_host, c.db_user, c.db_pass, c.db_name, c.db_port 
             FROM usuarios_central u
             LEFT JOIN conexoes_bancos c ON u.id_conexao_banco = c.id
             WHERE u.login = ? AND u.senha = ? AND (c.ativo = 1 OR c.id IS NULL) AND (u.ativo = 1 OR u.ativo IS NULL)`,
            [login, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            return {
                found: true,
                tenantConfig: user.db_host ? {
                    id: user.id_conexao_banco,
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
    const { login, senha, password, banco } = req.body;
    const pwd = senha || password;

    if (login && String(login).trim().toLowerCase() === 'admin') {
        console.warn(`[AUTH_BLOCKED] Tentativa de login bloqueada para o usuário 'admin' a partir do IP: ${req.ip}`);
        return res.status(403).json({ success: false, message: "Acesso não permitido para o usuário 'admin'. Utilize suas credenciais corporativas pessoais." });
    }

    if (!login || !pwd) {
        return res.status(400).json({ success: false, message: 'Usuário e senha são obrigatórios' });
    }

    try {
        // 0. Strict Tenant Auth (if banco is provided by LoginAcesso)
        if (banco) {
            console.log(`[AUTH] Modo estrito solicitado para banco: ${banco} (Usuário: ${login})`);
            const tenantPool = pool.getPoolByName(banco);
            if (!tenantPool) {
                return res.status(401).json({ success: false, message: 'Banco de dados não encontrado ou inativo.' });
            }

            const [userRows] = await tenantPool.execute('SELECT * FROM usuario WHERE Login = ? AND Senha = ?', [login, pwd]);
            if (userRows.length > 0) {
                const user = userRows[0];
                const tipo = user.TipoUsuario ? user.TipoUsuario.toString().trim().toUpperCase() : '';
                const role = (tipo === 'A' || tipo === 'ADMIN') ? 'admin' : 'user';
                const isSuper = await isUserSuperadmin(login);
                const isLocalAdmin = login.toLowerCase() === 'admin';
                const isSuperFinal = isSuper || isLocalAdmin;

                const token = jwt.sign({
                    id: user.idUsuario,
                    login: login,
                    role: role,
                    nomeCompleto: user.NomeCompleto,
                    dbName: banco,
                    isSuperadmin: isSuperFinal,
                    tenantId: centralAuth?.tenantConfig?.id
                }, JWT_SECRET, { expiresIn: '12h' });

                recordLoginAudit(login, banco, banco, req.ip).catch(() => {});
                return res.json({
                    success: true,
                    token,
                    user: {
                        id: user.idUsuario,
                        login: login,
                        nome: isSuperFinal ? login : user.NomeCompleto,
                        role,
                        setor: user.Setor,
                        mapaProducao: user.MapaProducao,
                        isSuperadmin: isSuperFinal,
                        superadmin: isSuperFinal ? 'S' : 'N',
                        clientName: '', 
                        dbName: banco
                    }
                });
            } else {
                return res.status(401).json({ success: false, message: 'Credenciais inválidas para este banco de dados.' });
            }
        }

        // 1. Try Central Auth First
        console.log(`[AUTH] Attempting central login for user: ${login}`);
        try {
            let centralAuth = await authenticateCentralUser(login, pwd);

            if (!centralAuth.found) {
                console.log(`[AUTH] User ${login} not found centrally. Attempting lazy sync...`);
                await runGlobalUserSync(login);
                centralAuth = await authenticateCentralUser(login, pwd);
            }

            if (centralAuth.found) {
                if (centralAuth.tenantConfig) {
                    console.log(`[AUTH] Central user found. Switching to tenant DB: ${centralAuth.tenantConfig.database}`);

                    pool.initPool(centralAuth.tenantConfig);
                    const tenantPool = pool.getPoolByName(centralAuth.tenantConfig.database);

                    console.log(`[AUTH-DEBUG] Querying DB ${centralAuth.tenantConfig.database} for login: "${login}"`);
                    const [userRows] = await tenantPool.execute('SELECT * FROM usuario WHERE Login = ?', [login]);
                    console.log(`[AUTH-DEBUG] Found ${userRows.length} rows in local DB`);

                    if (userRows.length > 0) {
                        const user = userRows[0];
                        const tipo = user.TipoUsuario ? user.TipoUsuario.toString().trim().toUpperCase() : '';
                        console.log(`[AUTH-DEBUG] TipoUsuario found: "${tipo}"`);
                        const role = (tipo === 'A' || tipo === 'ADMIN') ? 'admin' : 'user';

                        // Generate JWT
                        const token = jwt.sign({
                            id: user.idUsuario,
                            login: login,
                            role: role,
                            nomeCompleto: user.NomeCompleto,
                            dbName: centralAuth.tenantConfig.database,
                            isSuperadmin: centralAuth.isSuperadmin,
                            tenantId: centralAuth.tenantConfig.id
                        }, JWT_SECRET, { expiresIn: '12h' });

                        recordLoginAudit(login, centralAuth.tenantConfig.database, centralAuth.clientName, req.ip).catch(() => {});
                        return res.json({
                            success: true,
                            token,
                            user: {
                                id: user.idUsuario,
                                login: login,
                                nome: centralAuth.isSuperadmin ? login : user.NomeCompleto,
                                role,
                                setor: user.Setor,
                                mapaProducao: user.MapaProducao,
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
                            isSuperadmin: centralAuth.isSuperadmin,
                            tenantId: centralAuth.tenantConfig.id
                        }, JWT_SECRET, { expiresIn: '12h' });

                        recordLoginAudit(login, centralAuth.tenantConfig.database, centralAuth.clientName, req.ip).catch(() => {});
                        return res.json({
                            success: true,
                            token,
                            user: {
                                id: centralAuth.originalUserId,
                                login: login,
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
                        isSuperadmin: true,
                        tenantId: 1
                    }, JWT_SECRET, { expiresIn: '12h' });

                    recordLoginAudit(login, 'N/A', 'Global System', req.ip).catch(() => {});
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
            const tipo = user.TipoUsuario ? user.TipoUsuario.toString().trim().toUpperCase() : '';
            const role = (tipo === 'A' || tipo === 'ADMIN') ? 'admin' : 'user';

            // Check if Superadmin in central DB
            const isSuper = await isUserSuperadmin(login);
            // Admin em lynxlocal (fallback local) ? considerado superadmin nativo do sistema
            const isLocalAdmin = login.toLowerCase() === 'admin';
            const isSuperFinal = isSuper || isLocalAdmin;

            const token = jwt.sign({
                id: user.idUsuario,
                login: login,
                role: role,
                mapaProducao: user.MapaProducao,
                dbName: 'lynxlocal',
                isSuperadmin: isSuperFinal,
                tenantId: 1
            }, JWT_SECRET, { expiresIn: '12h' });

            recordLoginAudit(login, 'lynxlocal', 'LYNX (LYNXLOCAL)', req.ip).catch(() => {});
            return res.json({
                success: true,
                token,
                user: {
                    id: user.idUsuario,
                    login: login,
                    nome: user.NomeCompleto,
                    role,
                    mapaProducao: user.MapaProducao,
                    dbName: 'lynxlocal',
                    clientName: 'LYNX (LYNXLOCAL)',
                    isSuperadmin: isSuperFinal
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Erro no login' });
    }
});

// --- CENTRAL MANAGEMENT (Superadmin) ---

// Real Superadmin Auth Middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[AUTH MIDDLEWARE] Blocked access to ${req.method} ${req.url} - Missing Token`);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Aceita: isSuperadmin=true OU Admin no banco principal (lynxlocal)
        const isAllowed =
            decoded.isSuperadmin === true ||
            (decoded.role === 'admin' && decoded.dbName === 'lynxlocal') ||
            decoded.login?.toLowerCase() === 'superadmin';

        if (isAllowed) {
            req.adminUser = decoded;
            return next();
        } else {
            console.warn(`[AUTH MIDDLEWARE] Blocked access to ${req.method} ${req.url} - Not a Superadmin (role:${decoded.role}, db:${decoded.dbName})`);
            return res.status(403).json({ success: false, message: 'Forbidden: Acesso restrito ao Superadmin' });
        }
    } catch (err) {
        console.warn(`[AUTH MIDDLEWARE] Blocked access to ${req.method} ${req.url} - Invalid Token`);
        return res.status(401).json({ success: false, message: 'Sessão de Superadmin inválida ou expirada' });
    }
};

// Admin Check Auth Route for Frontend
app.get('/api/admin/check-auth', authenticateAdmin, (req, res) => {
    res.json({ success: true, message: 'Sessão válida', user: req.adminUser });
});

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
                    isSuperadmin: true,
                    tenantId: 1
                }, JWT_SECRET, { expiresIn: '12h' });

                return res.json({ success: true, token: token, userId: user.id });
            }
        }

        console.warn(`[ADMIN AUTH] Invalid credentials for: ${username}`);
        res.status(401).json({ success: false, message: 'Credenciais inválidas' });
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
        return res.status(400).json({ success: false, message: 'dbName à© obrigatà³rio' });
    }

    const authHeader = req.headers['authorization'];
    const superToken = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(superToken, JWT_SECRET);
        if (!decoded.isSuperadmin) {
            return res.status(403).json({ success: false, message: 'Apenas superadmins podem usar esta rota' });
        }

        const [rows] = await pool.executeOnDefault(
            'SELECT id FROM conexoes_bancos WHERE db_name = ? LIMIT 1',
            [dbName]
        );
        const tenantId = rows.length > 0 ? rows[0].id : 1;

        const token = jwt.sign({
            id: decoded.id,
            nome: decoded.nome || 'Superadmin',
            login: decoded.login,
            role: 'admin',
            superadmin: 'S',
            dbName: dbName,
            clientName: req.body.cliente || dbName,
            isSuperadmin: true,
            tenantId: tenantId
        }, JWT_SECRET, { expiresIn: '12h' });

        return res.json({ success: true, token });
    } catch (err) {
        console.error('[ADMIN IMPERSONATE] Token error:', err);
        return res.status(401).json({ success: false, message: 'Token de superadmin inválido' });
    }
});

// ─── SUPERADMIN: Database Switching (via normal JWT route) ───────────────────

// GET /api/superadmin/bancos-ativos — lista todos os bancos ativos (apenas SuperAdmin)
app.get('/api/superadmin/bancos-ativos', async (req, res) => {
    try {
        if (!req.tenantUser?.isSuperadmin) {
            return res.status(403).json({ success: false, message: 'Acesso restrito a SuperAdmins.' });
        }
        const [rows] = await pool.executeOnDefault(
            'SELECT id, nome_cliente, db_name, db_host, ativo FROM conexoes_bancos WHERE ativo = 1 ORDER BY nome_cliente ASC'
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[SuperAdmin] Erro ao listar bancos:', err);
        res.status(500).json({ success: false, message: 'Erro ao listar bancos: ' + err.message });
    }
});

// POST /api/superadmin/switch-db — gera novo token JWT com o dbName solicitado (apenas SuperAdmin)
app.post('/api/superadmin/switch-db', tenantMiddleware, async (req, res) => {
    try {
        if (!req.tenantUser?.isSuperadmin) {
            return res.status(403).json({ success: false, message: 'Acesso restrito a SuperAdmins.' });
        }

        const { dbName } = req.body;
        if (!dbName) {
            return res.status(400).json({ success: false, message: 'dbName ? obrigatório.' });
        }

        // Validate that the target DB exists and is active
        const [rows] = await pool.executeOnDefault(
            'SELECT id, nome_cliente, db_name, db_host, db_user, db_pass, db_port FROM conexoes_bancos WHERE db_name = ? AND ativo = 1 LIMIT 1',
            [dbName]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: `Banco '${dbName}' não encontrado ou inativo.` });
        }

        const banco = rows[0];

        // Ensure pool exists for target DB
        if (!pool.hasPool(dbName)) {
            pool.initPool({
                host: banco.db_host,
                user: banco.db_user,
                password: banco.db_pass,
                database: banco.db_name,
                port: banco.db_port || 3306
            });
            console.log(`[SuperAdmin] Pool lazy-loaded for switch to: ${dbName}`);
        }

        const decoded = req.tenantUser;
        const newToken = jwt.sign({
            id: decoded.id,
            login: decoded.login,
            nome: decoded.nome || decoded.login,
            role: 'admin',
            dbName: dbName,
            clientName: banco.nome_cliente,
            isSuperadmin: true,
            superadmin: 'S',
            tenantId: banco.id
        }, JWT_SECRET, { expiresIn: '12h' });

        console.log(`[SuperAdmin] ${decoded.login} switched to DB: ${dbName} (${banco.nome_cliente})`);

        res.json({
            success: true,
            token: newToken,
            user: {
                id: decoded.id,
                nome: decoded.nome || decoded.login,
                login: decoded.login,
                role: 'admin',
                dbName: dbName,
                clientName: banco.nome_cliente,
                isSuperadmin: true,
                superadmin: 'S'
            }
        });
    } catch (err) {
        console.error('[SuperAdmin] Erro ao trocar banco:', err);
        res.status(500).json({ success: false, message: 'Erro ao trocar banco: ' + err.message });
    }
});

// List Tenant Databases
app.get('/api/admin/databases', authenticateAdmin, async (req, res) => {
    try {
        const [rows] = await pool.executeOnDefault('SELECT * FROM conexoes_bancos ORDER BY nome_cliente ASC', []);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching databases: ' + error.message });
    }
});

// Add/Update Tenant Database
app.post('/api/admin/databases', authenticateAdmin, async (req, res) => {
    const { nome_cliente, db_host, db_user, db_pass, db_name, db_port, copia_banco_dados } = req.body;
    try {
        await pool.executeOnDefault(
            'INSERT INTO conexoes_bancos (nome_cliente, db_host, db_user, db_pass, db_name, db_port, copia_banco_dados) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome_cliente, db_host, db_user, db_pass, db_name, db_port || 3306, copia_banco_dados || null]
        );
        res.json({ success: true, message: 'Banco cadastrado com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error saving database: ' + error.message });
    }
});

// Toggle Tenant Database Status (Ativo/Inativo)
app.put('/api/admin/databases/:id/toggle', authenticateAdmin, async (req, res) => {
    try {
        const dbId = req.params.id;
        
        // Obter o status atual
        const [rows] = await pool.executeOnDefault('SELECT ativo FROM conexoes_bancos WHERE id = ?', [dbId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Banco de dados não encontrado' });
        }
        
        const currentStatus = rows[0].ativo;
        const newStatus = currentStatus ? 0 : 1; // Toggle boolean
        
        await pool.executeOnDefault('UPDATE conexoes_bancos SET ativo = ? WHERE id = ?', [newStatus, dbId]);
        res.json({ success: true, message: `Banco de dados ${newStatus ? 'Ativado' : 'Desativado'} com sucesso`, ativo: newStatus });
    } catch (error) {
        console.error('Error toggling database:', error);
        res.status(500).json({ success: false, message: 'Erro ao alterar status do banco: ' + error.message });
    }
});

// ── LOGIN AUDIT ────────────────────────────────────────────────────────────────
// GET /api/admin/login-audit — Lista acessos das últimas 24h (padrão) ou período customizado
app.get('/api/admin/login-audit', authenticateAdmin, async (req, res) => {
    let conn;
    try {
        conn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS login_audit (
                id INT AUTO_INCREMENT PRIMARY KEY,
                login VARCHAR(100) NOT NULL,
                db_name VARCHAR(100),
                client_name VARCHAR(150),
                ip_address VARCHAR(50),
                data_acesso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_data (data_acesso)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        const horas = parseInt(req.query.horas) || 24;
        const [rows] = await conn.execute(
            'SELECT * FROM login_audit WHERE data_acesso >= DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY data_acesso DESC LIMIT 500',
            [horas]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.end();
    }
});

// DELETE /api/admin/login-audit — Remove registros com mais de 24h
app.delete('/api/admin/login-audit', authenticateAdmin, async (req, res) => {
    let conn;
    try {
        conn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [result] = await conn.execute(
            'DELETE FROM login_audit WHERE data_acesso < DATE_SUB(NOW(), INTERVAL 24 HOUR)'
        );
        res.json({ success: true, deleted: result.affectedRows, message: `${result.affectedRows} registro(s) removido(s)` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (conn) await conn.end();
    }
});

app.post('/api/admin/sync-users/:dbId', authenticateAdmin, async (req, res) => {
    const dbId = req.params.dbId;
    let centralConn;
    let tenantConn;

    try {
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [dbRows] = await centralConn.execute('SELECT * FROM conexoes_bancos WHERE id = ?', [dbId]);

        if (dbRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Database not found' });
        }
        const dbConfig = dbRows[0];

        tenantConn = await mysql.createConnection({
            host: dbConfig.db_host,
            user: dbConfig.db_user,
            password: dbConfig.db_pass,
            database: dbConfig.db_name,
            port: dbConfig.db_port
        });

        const [users] = await tenantConn.execute('SELECT * FROM usuario');

        let syncedCount = 0;
        let updatedCount = 0;
        
        for (const user of users) {
            let isAtivo = 1;
            if (user.D_E_L_E_T_E && user.D_E_L_E_T_E.trim() !== '') isAtivo = 0;
            if (user.status && user.status.toString().toLowerCase() === 'inativo') isAtivo = 0;
            if (user.status && user.status.toString() === '0') isAtivo = 0;

            const [existing] = await centralConn.execute(
                'SELECT id FROM usuarios_central WHERE login = ? AND id_conexao_banco = ?',
                [user.Login, dbId]
            );

            if (existing.length === 0) {
                await centralConn.execute(
                    `INSERT INTO usuarios_central (login, senha, id_conexao_banco, id_usuario_origem, ativo, IdMatriz) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [user.Login, user.Senha, dbId, user.idUsuario, isAtivo, user.IdMatriz || null]
                );
                syncedCount++;
            } else {
                await centralConn.execute(
                    `UPDATE usuarios_central SET senha = ?, id_conexao_banco = ?, id_usuario_origem = ?, ativo = ?, IdMatriz = ? 
                     WHERE id = ?`,
                    [user.Senha, dbId, user.idUsuario, isAtivo, user.IdMatriz || null, existing[0].id]
                );
                updatedCount++;
            }
        }

        res.json({ success: true, message: `Sincronização concluída. ${syncedCount} criados, ${updatedCount} atualizados.` });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ success: false, message: 'Erro na sincronização: ' + error.message });
    } finally {
        if (centralConn) await centralConn.end();
        if (tenantConn) await tenantConn.end();
    }
});

async function runGlobalUserSync(targetLogin = null) {
    let centralConn;
    try {
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        const [dbRows] = await centralConn.execute('SELECT * FROM conexoes_bancos WHERE ativo = 1');
        
        let totalCreated = 0;
        let totalUpdated = 0;
        let errors = [];

        for (const dbConfig of dbRows) {
            let tenantConn;
            try {
                tenantConn = await mysql.createConnection({
                    host: dbConfig.db_host,
                    user: dbConfig.db_user,
                    password: dbConfig.db_pass,
                    database: dbConfig.db_name,
                    port: dbConfig.db_port || 3306
                });

                const queryStr = targetLogin ? 'SELECT * FROM usuario WHERE Login = ?' : 'SELECT * FROM usuario';
                const queryParams = targetLogin ? [targetLogin] : [];
                const [users] = await tenantConn.execute(queryStr, queryParams);

                for (const user of users) {
                    let isAtivo = 1;
                    if (user.D_E_L_E_T_E && user.D_E_L_E_T_E.trim() !== '') isAtivo = 0;
                    if (user.status && user.status.toString().toLowerCase() === 'inativo') isAtivo = 0;
                    if (user.status && user.status.toString() === '0') isAtivo = 0;

                    const [existing] = await centralConn.execute(
                        'SELECT id FROM usuarios_central WHERE login = ? AND id_conexao_banco = ?',
                        [user.Login, dbConfig.id]
                    );

                    if (existing.length === 0) {
                        await centralConn.execute(
                            `INSERT INTO usuarios_central (login, senha, id_conexao_banco, id_usuario_origem, ativo, IdMatriz) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [user.Login, user.Senha, dbConfig.id, user.idUsuario, isAtivo, user.IdMatriz || null]
                        );
                        totalCreated++;
                    } else {
                        await centralConn.execute(
                            `UPDATE usuarios_central SET senha = ?, id_conexao_banco = ?, id_usuario_origem = ?, ativo = ?, IdMatriz = ? 
                             WHERE id = ?`,
                            [user.Senha, dbConfig.id, user.idUsuario, isAtivo, user.IdMatriz || null, existing[0].id]
                        );
                        totalUpdated++;
                    }
                }
            } catch (err) {
                console.error(`Error syncing db ${dbConfig.db_name}:`, err.message);
                errors.push({ db: dbConfig.db_name, error: err.message });
            } finally {
                if (tenantConn) await tenantConn.end();
            }
        }

        console.log(`[BACKGROUND SYNC] Concluído. ${totalCreated} criados, ${totalUpdated} atualizados. Erros: ${errors.length}`);
        return { success: true, message: `Sincronização Global Concluída. ${totalCreated} criados, ${totalUpdated} atualizados. Erros: ${errors.length}`, details: { created: totalCreated, updated: totalUpdated, errors } };

    } catch (error) {
        console.error('[BACKGROUND SYNC] Global Sync Error:', error);
        return { success: false, message: 'Erro na sincronização global: ' + error.message };
    } finally {
        if (centralConn) await centralConn.end();
    }
}

// Sincronizar TODOS os clientes (API Trigger)
app.post('/api/admin/sync-all', authenticateAdmin, async (req, res) => {
    const result = await runGlobalUserSync();
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

// Iniciar a checagem a cada 10 horas (36000000 ms)
setInterval(async () => {
    console.log('[BACKGROUND SYNC] Iniciando sincronização automática de usuários (10h)...');
    await runGlobalUserSync();
}, 10 * 60 * 60 * 1000);


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
            res.json({ success: true, message: 'Usuário atualizado com sucesso' });
        } else {
            res.status(400).json({ success: false, message: 'Nenhum campo para atualizar' });
        }
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ success: false, message: 'Error updating user: ' + error.message });
    } finally {
        if (connection) await connection.end();
    }
});

// --- HELPER: Sync Single User to Central DB ---
async function checkGlobalLoginUnique(login, senha, currentDbHost, currentDbName, currentIdUsuarioOrigem = null) {
    let centralConn;
    try {
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);
        
        // Find our tenant DB ID
        const [dbRows] = await centralConn.execute(
            'SELECT id FROM conexoes_bancos WHERE db_name = ?',
            [currentDbName]
        );
        let currentDbId = dbRows.length > 0 ? dbRows[0].id : null;

        // Check if login AND senha exact match exists
        const [existing] = await centralConn.execute(
            'SELECT id_conexao_banco, id_usuario_origem FROM usuarios_central WHERE login = ? AND senha = ?',
            [login, senha]
        );

        if (existing.length === 0) return true; // Login is free globally

        const userCentral = existing[0];
        
        // If it belongs to US (same DB) and is the SAME user (updating themselves), it's fine
        if (currentDbId && userCentral.id_conexao_banco === currentDbId && 
            currentIdUsuarioOrigem && String(userCentral.id_usuario_origem) === String(currentIdUsuarioOrigem)) {
            return true;
        }

        // Otherwise, login is already taken by another tenant or another user
        return false;
    } catch (error) {
        console.error('[SYNC] Error checking global login:', error);
        throw error;
    } finally {
        if (centralConn) await centralConn.end();
    }
}

async function syncUserToCentral(userData, tenantDbHost = null, tenantDbName = null) {
    let centralConn;
    try {
        // Get current tenant DB config
        const currentDbHost = tenantDbHost || pool.getConfig().host;
        const currentDbName = tenantDbName || pool.getConfig().database;

        if (!currentDbHost || !currentDbName) {
            console.warn('[SYNC] Cannot sync user: current DB config not available');
            return { success: false, message: 'Current DB config unavailable' };
        }

        // Connect to central
        centralConn = await mysql.createConnection(CENTRAL_DB_CONFIG);

        // Find the conexao_banco ID for this tenant
        const [dbRows] = await centralConn.execute(
            'SELECT id FROM conexoes_bancos WHERE db_name = ? AND ativo = 1',
            [currentDbName]
        );

        if (dbRows.length === 0) {
            console.warn(`[SYNC] Tenant database not registered in central: ${currentConfig.host}/${currentConfig.database}`);
            return { success: false, message: 'Tenant DB not registered in central' };
        }

        const idConexaoBanco = dbRows[0].id;

        let isAtivo = 1;
        if (userData.D_E_L_E_T_E && userData.D_E_L_E_T_E.trim() !== '') isAtivo = 0;
        if (userData.status && userData.status.toString().toLowerCase() === 'inativo') isAtivo = 0;
        if (userData.status && userData.status.toString() === '0') isAtivo = 0;
        // Se forceInactive foi passado diretamente:
        if (userData.forceInactive) isAtivo = 0;

        // Check if user already exists in central for this tenant
        const [existingUser] = await centralConn.execute(
            'SELECT id FROM usuarios_central WHERE login = ? AND id_conexao_banco = ?',
            [userData.Login, idConexaoBanco]
        );

        if (existingUser.length > 0) {
            // Update existing
            await centralConn.execute(
                `UPDATE usuarios_central 
                 SET senha = ?, id_conexao_banco = ?, id_usuario_origem = ?, ativo = ?, IdMatriz = ?, updated_at = NOW()
                 WHERE id = ?`,
                [userData.Senha, idConexaoBanco, userData.idUsuario, isAtivo, userData.IdMatriz || null, existingUser[0].id]
            );
            console.log(`[SYNC] Updated user in central: ${userData.Login} (ativo: ${isAtivo})`);
        } else {
            // Insert new
            await centralConn.execute(
                `INSERT INTO usuarios_central (login, senha, id_conexao_banco, id_usuario_origem, ativo, IdMatriz)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userData.Login, userData.Senha, idConexaoBanco, userData.idUsuario, isAtivo, userData.IdMatriz || null]
            );
            console.log(`[SYNC] Inserted new user to central: ${userData.Login} (ativo: ${isAtivo})`);
        }

        return { success: true };

    } catch (error) {
        console.error('[SYNC] Error syncing user to central:', error);
        return { success: false, message: error.message };
    } finally {
        if (centralConn) await centralConn.end();
    }
}

// --- CRUD: Usu?rio (with Central Sync) ---

// LIST All Users
app.get('/api/usuario', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            `SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status 
             FROM usuario 
             WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
             ORDER BY NomeCompleto`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
    }
});

// GET One User
app.get('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status FROM usuario WHERE idUsuario = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usu?rio não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
    }
});

// CREATE User (with Central Sync)
app.post('/api/usuario', tenantMiddleware, async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario, Setor, email, Descricao, Sigla,
            txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
            MapaProducao, Romaneio, OrdemServico, SolidWorks,
            GerenciamentoProducao, VisaoGeralProducao,
            Comercial, Financeiro, Teste, Expedicao } = req.body;

    if (!NomeCompleto || !Login || !Senha || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login, Senha e Tipo são obrigatórios' });
    }

    try {
        // Check NomeCompleto duplicado
        const [existingName] = await req.tenantDbPool.execute(
            "SELECT NomeCompleto FROM usuario WHERE NomeCompleto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')",
            [NomeCompleto.trim()]
        );
        if (existingName.length > 0) {
            return res.status(400).json({ success: false, message: 'Nome de Usuário já Cadastrado!' });
        }

        // Check Login duplicado
        const [existingLogin] = await req.tenantDbPool.execute(
            "SELECT idUsuario FROM usuario WHERE Login = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')",
            [Login.trim()]
        );
        if (existingLogin.length > 0) {
            return res.status(400).json({ success: false, message: 'Nome de Login já Cadastrado, favor informar outro Login!' });
        }

        const currentDbHost = req.tenantDbPool?.pool?.config?.connectionConfig?.host || process.env.DB_HOST;
        const currentDbName = req.user?.dbName || req.tenantUser?.dbName;
        const isGlobalUnique = await checkGlobalLoginUnique(Login.trim(), Senha, currentDbHost, currentDbName);
        if (!isGlobalUnique) {
            return res.status(400).json({ success: false, message: 'Este login e senha já estão sendo usados. Escolha outro usuário ou mude a senha.' });
        }

        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            `INSERT INTO usuario (
                NomeCompleto, Login, Senha, TipoUsuario, Setor, email,
                Descricao, Sigla, DataCadastro, CriadoPor, status,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
                MapaProducao, Romaneio, OrdemServico, SolidWorks,
                GerenciamentoProducao, VisaoGeralProducao,
                Comercial, Financeiro, Teste, Expedicao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                NomeCompleto.trim().toUpperCase(), Login.trim(), Senha, TipoUsuario,
                Setor || '', email || '', Descricao || '', Sigla || '',
                now, 'Sistema', 'A',
                txtCorte || '', txtDobra || '', txtSolda || '', txtPintura || '',
                txtMontagem || '', txtAlmoxarifado || '',
                MapaProducao || '', Romaneio || '', OrdemServico || '', SolidWorks || '',
                GerenciamentoProducao || '', VisaoGeralProducao || '',
                Comercial || '', Financeiro || '', Teste || '', Expedicao || ''
            ]
        );

        const newUserId = result.insertId;

        // Sync to Central DB (async, non-blocking)
        syncUserToCentral({ idUsuario: newUserId, Login, Senha, NomeCompleto }, currentDbHost, currentDbName).catch(err => {
            console.error('[SYNC] Failed to sync new user to central:', err);
        });

        res.json({ success: true, message: 'Usuário criado com sucesso', id: newUserId });
    } catch (error) {
        console.error('Error creating usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar usuário: ' + error.message });
    }
});

// UPDATE User (with Central Sync)
app.put('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { NomeCompleto, Login, Senha, TipoUsuario, Setor, email, Descricao, Sigla,
            txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
            MapaProducao, Romaneio, OrdemServico, SolidWorks,
            GerenciamentoProducao, VisaoGeralProducao,
            Comercial, Financeiro, Teste, Expedicao } = req.body;

    if (!NomeCompleto || !Login || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Tipo são obrigatórios' });
    }

    try {
        const currentDbHost = req.tenantDbPool?.pool?.config?.connectionConfig?.host || process.env.DB_HOST;
        const currentDbName = req.user?.dbName || req.tenantUser?.dbName;

        // Obter senha real caso a enviada seja placeholder ou vazia
        let senhaFinal = Senha;
        if (!Senha || Senha.trim() === '' || Senha === '••••••••') {
            const [userRows] = await req.tenantDbPool.execute('SELECT Senha FROM usuario WHERE idUsuario = ?', [id]);
            if (userRows.length > 0) {
                senhaFinal = userRows[0].Senha;
            }
        }

        const isGlobalUnique = await checkGlobalLoginUnique(Login.trim(), senhaFinal, currentDbHost, currentDbName, id);
        if (!isGlobalUnique) {
            return res.status(400).json({ success: false, message: 'Este login e senha já estão sendo usados. Escolha outro usuário ou mude a senha.' });
        }

        let sql = `UPDATE usuario SET
            NomeCompleto = ?, Login = ?, TipoUsuario = ?,
            Setor = ?, email = ?, Descricao = ?, Sigla = ?,
            txtCorte = ?, txtDobra = ?, txtSolda = ?, txtPintura = ?,
            txtMontagem = ?, txtAlmoxarifado = ?,
            MapaProducao = ?, Romaneio = ?, OrdemServico = ?, SolidWorks = ?,
            GerenciamentoProducao = ?, VisaoGeralProducao = ?,
            Comercial = ?, Financeiro = ?, Teste = ?, Expedicao = ?`;

        const values = [
            NomeCompleto.trim().toUpperCase(), Login.trim(), TipoUsuario,
            Setor || '', email || '', Descricao || '', Sigla || '',
            txtCorte || '', txtDobra || '', txtSolda || '', txtPintura || '',
            txtMontagem || '', txtAlmoxarifado || '',
            MapaProducao || '', Romaneio || '', OrdemServico || '', SolidWorks || '',
            GerenciamentoProducao || '', VisaoGeralProducao || '',
            Comercial || '', Financeiro || '', Teste || '', Expedicao || ''
        ];

        // Apenas atualiza senha se fornecida e não for placeholder
        if (Senha && Senha.trim() !== '' && Senha !== '••••••••') {
            sql += ', Senha = ?';
            values.push(Senha);
        }

        sql += ' WHERE idUsuario = ?';
        values.push(id);

        await req.tenantDbPool.execute(sql, values);

        // Sync to Central DB (async)
        const [userRows] = await req.tenantDbPool.execute(
            'SELECT idUsuario, Login, Senha, NomeCompleto FROM usuario WHERE idUsuario = ?', [id]
        );
        if (userRows.length > 0) {
            syncUserToCentral(userRows[0], currentDbHost, currentDbName).catch(err => {
                console.error('[SYNC] Failed to sync updated user to central:', err);
            });
        }

        res.json({ success: true, message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário: ' + error.message });
    }
});

// DELETE User (Soft Delete)
app.delete('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    try {
        const now = getCurrentDateTimeBR();
        await req.tenantDbPool.execute(
            "UPDATE usuario SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = 'Sistema' WHERE idUsuario = ?",
            [now, req.params.id]
        );

        // Sync delete to Central DB (async)
        const [userRows] = await req.tenantDbPool.execute(
            'SELECT idUsuario, Login, Senha, NomeCompleto FROM usuario WHERE idUsuario = ?', [req.params.id]
        );
        if (userRows.length > 0) {
            const currentDbHost = req.tenantDbPool?.pool?.config?.connectionConfig?.host || process.env.DB_HOST;
            const currentDbName = req.user?.dbName || req.tenantUser?.dbName;
            syncUserToCentral({ ...userRows[0], forceInactive: true }, currentDbHost, currentDbName).catch(err => {
                console.error('[SYNC] Failed to sync deleted user to central:', err);
            });
        }

        res.json({ success: true, message: 'Usuário excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usuário' });
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

        const schema = { tables: {}, tableDefinitions: {}, indexes: {} };

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

            // 2.5 Get Indexes
            const [indexRows] = await conn.execute(`SHOW INDEX FROM \`${tableName}\``);
            schema.indexes[tableName] = indexRows;

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
    // Aceita actions[] (novo formato) ou sqlStatements[] (legado)
    const { destDbId, actions, sqlStatements, usuario, sourceDbName } = req.body;

    const items = actions || (sqlStatements ? sqlStatements.map(sql => ({ sql, description: sql.substring(0, 80), type: 'sql' })) : []);

    if (!destDbId || !items.length) {
        return res.status(400).json({ success: false, message: 'destDbId e actions[] são obrigatórios' });
    }

    const destConfig = await getDbConfigById(destDbId);
    if (!destConfig) return res.status(404).json({ success: false, message: 'Banco destino não encontrado' });

    let conn;
    let histConn;
    const results = [];

    try {
        conn = await mysql.createConnection({
            host: destConfig.db_host,
            user: destConfig.db_user,
            password: destConfig.db_pass,
            database: destConfig.db_name,
            port: destConfig.db_port
        });

        // Conecta ao lynxlocal para histórico
        try {
            histConn = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: 'lynxlocal',
                port: parseInt(process.env.DB_PORT || '3306')
            });
        } catch (he) {
            console.warn('[SyncHistory] Não foi possível conectar ao histórico:', he.message);
        }

        for (const item of items) {
            const sql = item.sql || item;
            const description = item.description || sql.substring(0, 100);
            const tipo = item.type || 'sql';
            let status = 'ok';
            let errorMsg = null;

            try {
                await conn.execute(sql);
            } catch (sqlErr) {
                status = 'erro';
                errorMsg = sqlErr.message;
                console.warn('[SyncSchema] Erro (continuando):', sqlErr.message, '| SQL:', sql.substring(0, 80));
            }

            results.push({ sql, description, type: tipo, status, error: errorMsg });

            // Registrar no histórico
            if (histConn) {
                try {
                    await histConn.execute(
                        `INSERT INTO sinco_sync_historico
                            (usuario, banco_origem, banco_destino, tipo_acao, descricao, sql_executado, status, mensagem_erro)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            usuario || 'superadmin',
                            sourceDbName || 'origem',
                            destConfig.db_name,
                            tipo,
                            description,
                            sql,
                            status,
                            errorMsg
                        ]
                    );
                } catch (he) {
                    console.warn('[SyncHistory] Erro ao registrar:', he.message);
                }
            }
        }

        const ok = results.filter(r => r.status === 'ok').length;
        const erros = results.filter(r => r.status === 'erro').length;

        res.json({
            success: true,
            message: `${ok} executado(s) com sucesso, ${erros} com erro(s).`,
            results
        });

    } catch (error) {
        console.error('Schema Sync Error:', error);
        res.status(500).json({ success: false, message: 'Erro crítico: ' + error.message });
    } finally {
        if (conn) await conn.end();
        if (histConn) await histConn.end();
    }
});

// GET /api/admin/schema/history — Histórico de sincronizações
app.get('/api/admin/schema/history', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '200');
        const banco = req.query.banco || null;

        let sql = `SELECT * FROM sinco_sync_historico`;
        const params = [];
        if (banco) { sql += ' WHERE banco_destino = ?'; params.push(banco); }
        sql += ' ORDER BY data_execucao DESC LIMIT ?';
        params.push(limit);

        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// MANUTENÇÃO: Recalcular QtdeOS e QtdeOSExecutadas em todas as tags
// POST /api/manutencao/recalcular-qtde-os
// Body: { chave: 'SincoMasterKey2026!' }
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/manutencao/recalcular-qtde-os', tenantMiddleware, async (req, res) => {
    const MANUT_KEY = 'SincoMasterKey2026!';
    const { chave } = req.body;

    if (chave !== MANUT_KEY) {
        return res.status(403).json({ success: false, message: 'Chave inválida.' });
    }

    try {
        const queryPool = req.tenantDbPool || pool;

        // Atualiza QtdeOS e QtdeOSExecutadas em TODAS as tags de uma vez
        const [result] = await req.tenantDbPool.execute(`
            UPDATE tags t
            SET
                QtdeOS = (
                    SELECT COUNT(*) FROM ordemservico os
                    WHERE os.IdTag = t.IdTag
                      AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
                ),
                QtdeOSExecutadas = (
                    SELECT COUNT(*) FROM ordemservico os
                    WHERE os.IdTag = t.IdTag
                      AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
                      AND TRIM(COALESCE(os.OrdemServicoFinalizado,'')) = 'C'
                )
            WHERE (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
        `);

        console.log(`[MANUTENCAO] recalcular-qtde-os | Tags atualizadas: ${result.affectedRows}`);
        res.json({ success: true, message: `QtdeOS e QtdeOSExecutadas recalculados em ${result.affectedRows} tags com sucesso.`, tagsAtualizadas: result.affectedRows });

    } catch (e) {
        console.error('[MANUTENCAO] Erro ao recalcular QtdeOS:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});
// --- CRUD: Pessoa Jur?dica ---

// LIST (Read All)
app.get('/api/pj', tenantMiddleware, async (req, res) => {
    try {
        // FIXED: Used EnderecoLogo instead of LogoUrl
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdPessoa, RazaoSocial, NomeFantasia, Cnpj, Cidade, Estado, Telefone, EnderecoLogo FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*' ORDER BY IdPessoa DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching PJ list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar registros' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/pj/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdPessoa as id, RazaoSocial as label, Cnpj as cnpj FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*' ORDER BY RazaoSocial"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching pj options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op??es de fornecedor' });
    }
});

// GET ONE (Read Single)
app.get('/api/pj/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM pessoajuridica WHERE IdPessoa = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Registro não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar registro' });
    }
});


// Helper: Parse double/float robustly (especially handling Portuguese commas)
const parseDoubleOrNull = (val) => {
    if (val === undefined || val === null) return null;
    let s = val.toString().trim();
    if (s === '') return null;
    s = s.replace(',', '.');
    const parsed = parseFloat(s);
    return isNaN(parsed) ? null : parsed;
};

// Helper: Parse integer robustly
const parseIntOrNull = (val) => {
    if (val === undefined || val === null) return null;
    let s = val.toString().trim();
    if (s === '') return null;
    const parsed = parseInt(s, 10);
    return isNaN(parsed) ? null : parsed;
};

// CREATE (Insert) with File Upload
app.post('/api/pj', upload.single('Logo'), async (req, res) => {
    const data = req.body;

    if (!data.RazaoSocial) {
        return res.status(400).json({ success: false, message: 'Raz?o Social ? obrigatória' });
    }

    // Basic Server-Side Validation
    // Validate CNPJ simply by length (stripped)
    if (data.Cnpj) {
        const cnpjClean = data.Cnpj.replace(/[^\d]+/g, '');
        if (cnpjClean.length !== 14) {
            return res.status(400).json({ success: false, message: 'CNPJ deve conter 14 d?gitos.' });
        }
    }
    // Validate Email regex
    if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
        return res.status(400).json({ success: false, message: 'Formato de e-mail inválido.' });
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

        const [result] = await req.tenantDbPool.execute(sql, values);
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

        await req.tenantDbPool.execute(sql, values);
        res.json({ success: true, message: 'Atualizado com sucesso' });

    } catch (error) {
        console.error('Error updating PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/pj/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body; // Expect user from body
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE pessoajuridica SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdPessoa = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Registro excluído' });
    } catch (error) {
        console.error('Error deleting PJ:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Unidade de Medida ---

// LIST (Read All)
app.get('/api/medida', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdMedida, TipoMedida, DescMedida, IdEmpresa, DataCriacao, CriadoPor FROM medida WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdMedida DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching medida list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar unidades de medida' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/medida/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT TipoMedida as id, CONCAT(TipoMedida, ' - ', COALESCE(DescMedida, '')) as label FROM medida WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY TipoMedida"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching medida options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op??es de unidade' });
    }
});

// GET ONE (Read Single)
app.get('/api/medida/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM medida WHERE IdMedida = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Unidade de medida não encontrada' });
        }
    } catch (error) {
        console.error('Error fetching medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar unidade de medida' });
    }
});

// CREATE (Insert)
app.post('/api/medida', tenantMiddleware, async (req, res) => {
    const { TipoMedida, DescMedida, IdEmpresa } = req.body;

    if (!TipoMedida) {
        return res.status(400).json({ success: false, message: 'Tipo da medida ? obrigatório' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no m?ximo 3 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            'INSERT INTO medida (TipoMedida, DescMedida, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [TipoMedida.toUpperCase().trim(), DescMedida?.trim() || null, IdEmpresa || null, now, getCtxNomeCompleto()]
        );
        res.json({ success: true, message: 'Unidade de medida cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/medida/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { TipoMedida, DescMedida, IdEmpresa } = req.body;

    if (!TipoMedida) {
        return res.status(400).json({ success: false, message: 'Tipo da medida ? obrigatório' });
    }

    if (TipoMedida.length > 3) {
        return res.status(400).json({ success: false, message: 'Tipo da medida deve ter no m?ximo 3 caracteres' });
    }

    try {
        await req.tenantDbPool.execute(
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
app.delete('/api/medida/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE medida SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdMedida = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Unidade de medida excluída' });
    } catch (error) {
        console.error('Error deleting medida:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Fam?lia ---

// LIST (Read All)
app.get('/api/familia', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdFamilia, DescFamilia, IdEmpresa, DataCriacao, CriadoPor FROM familia WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IdFamilia DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching familia list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar fam?lias' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/familia/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdFamilia as id, DescFamilia as label FROM familia WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY DescFamilia"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching familia options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op??es de fam?lia' });
    }
});

// GET ONE (Read Single)
app.get('/api/familia/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM familia WHERE IdFamilia = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Fam?lia não encontrada' });
        }
    } catch (error) {
        console.error('Error fetching familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar fam?lia' });
    }
});

// CREATE (Insert)
app.post('/api/familia', tenantMiddleware, async (req, res) => {
    const { DescFamilia, IdEmpresa } = req.body;

    if (!DescFamilia) {
        return res.status(400).json({ success: false, message: 'Descri??o da fam?lia ? obrigatória' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'Descri??o deve ter no m?ximo 50 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            'INSERT INTO familia (DescFamilia, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?)',
            [DescFamilia.trim(), IdEmpresa || null, now, getCtxNomeCompleto()]
        );
        res.json({ success: true, message: 'Fam?lia cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/familia/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { DescFamilia, IdEmpresa } = req.body;

    if (!DescFamilia) {
        return res.status(400).json({ success: false, message: 'Descri??o da fam?lia ? obrigatória' });
    }

    if (DescFamilia.length > 50) {
        return res.status(400).json({ success: false, message: 'Descri??o deve ter no m?ximo 50 caracteres' });
    }

    try {
        await req.tenantDbPool.execute(
            'UPDATE familia SET DescFamilia = ?, IdEmpresa = ? WHERE IdFamilia = ?',
            [DescFamilia.trim(), IdEmpresa || null, id]
        );
        res.json({ success: true, message: 'Fam?lia atualizada com sucesso' });
    } catch (error) {
        console.error('Error updating familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});

// DELETE (Soft Delete)
app.delete('/api/familia/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE familia SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdFamilia = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Fam?lia excluída' });
    } catch (error) {
        console.error('Error deleting familia:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Acabamento ---

// LIST (Read All)
app.get('/api/acabamento', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IDAcabamento, DescAcabamento, Status, IdEmpresa, DataCriacao, CriadoPor FROM acabamento WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY IDAcabamento DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching acabamento list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar acabamentos' });
    }
});

// OPTIONS (for dropdown)
app.get('/api/acabamento/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IDAcabamento as id, DescAcabamento as label FROM acabamento WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY DescAcabamento"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching acabamento options:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar op??es de acabamento' });
    }
});

// GET ONE (Read Single)
app.get('/api/acabamento/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM acabamento WHERE IDAcabamento = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Acabamento não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar acabamento' });
    }
});

// CREATE (Insert)
app.post('/api/acabamento', tenantMiddleware, async (req, res) => {
    const { DescAcabamento, IdEmpresa } = req.body;

    if (!DescAcabamento) {
        return res.status(400).json({ success: false, message: 'Descri??o do acabamento ? obrigatória' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'Descri??o deve ter no m?ximo 200 caracteres' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            'INSERT INTO acabamento (DescAcabamento, Status, IdEmpresa, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [DescAcabamento.trim(), 'A', IdEmpresa || null, now, getCtxNomeCompleto()]
        );
        res.json({ success: true, message: 'Acabamento cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE (Put)
app.put('/api/acabamento/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { DescAcabamento, IdEmpresa } = req.body;

    if (!DescAcabamento) {
        return res.status(400).json({ success: false, message: 'Descri??o do acabamento ? obrigatória' });
    }

    if (DescAcabamento.length > 200) {
        return res.status(400).json({ success: false, message: 'Descri??o deve ter no m?ximo 200 caracteres' });
    }

    try {
        await req.tenantDbPool.execute(
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
app.delete('/api/acabamento/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE acabamento SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IDAcabamento = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Acabamento excluído' });
    } catch (error) {
        console.error('Error deleting acabamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: Material ---

// Helper: garante coluna com cache em memória — evita ALTER TABLE duplicado a cada request
const _colCache = new Map();
const ensureColumn = async (db, table, col, colDef) => {
    const key = `${table}.${col}`;
    if (_colCache.has(key)) return;
    const [cols] = await req.tenantDbPool.execute(`SHOW COLUMNS FROM \`${table}\` LIKE '${col}'`);
    if (cols.length === 0) await req.tenantDbPool.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${colDef}`);
    _colCache.set(key, true);
};

// LIST (Read All) with JOINs
app.get('/api/material', tenantMiddleware, async (req, res) => {
    try {
        const db = req.tenantDbPool || pool;
        // Garante colunas opcionais — roda somente se a coluna ainda não existir
        await Promise.allSettled([
            ensureColumn(db, 'material', 'ImagemProduto', 'LONGTEXT NULL'),
            ensureColumn(db, 'material', 'acabamento', 'VARCHAR(150) NULL'),
            ensureColumn(db, 'material', 'D_E_L_E_T_E', 'VARCHAR(1) NULL'),
        ]);

        const [rows] = await req.tenantDbPool.execute(`
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

// BUSCAR por CodMatFabricante
app.get('/api/material/busca-cod', tenantMiddleware, async (req, res) => {
    try {
        const search = req.query.q;
        if (!search) return res.json({ success: true, data: [] });
        const [rows] = await req.tenantDbPool.execute(`
            SELECT * FROM material 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') 
              AND CodMatFabricante = ?
            LIMIT 1
        `, [search]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in material search:', error);
        res.status(500).json({ success: false, message: 'Erro na busca de material' });
    }
});


// BUSCA LIVRE (Por código ou descrição)
app.get('/api/material/busca-livre', tenantMiddleware, async (req, res) => {
    try {
        const search = req.query.q || '';
        const limit = 50;
        
        let sql = `
            SELECT * FROM material 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `;
        let params = [];
        
        if (search) {
            sql += ` AND (CodMatFabricante LIKE ? OR DescResumo LIKE ? OR DescDetal LIKE ?)`;
            params = [`%${search}%`, `%${search}%`, `%${search}%`];
        }
        
        sql += ` ORDER BY IdMaterial DESC LIMIT ${limit}`;
        
        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in material search libre:', error);
        res.status(500).json({ success: false, message: 'Erro na busca livre de material' });
    }
});

// GET PROCESSOS DO MATERIAL (Processos de Fabricacao)
app.get('/api/material/processos/:cod', tenantMiddleware, async (req, res) => {
    try {
        const cod = req.params.cod;
        if (!cod) {
            return res.json({ success: true, data: [] });
        }

        const [mats] = await req.tenantDbPool.execute(
            `SELECT IdMaterial FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1`,
            [cod]
        );
        const idMaterial = mats.length > 0 ? mats[0].IdMaterial : null;

        const [rows] = await req.tenantDbPool.execute(
            `SELECT 
                mp.IdMaterialProcesso,
                mp.IdProcesso,
                mp.SequenciaExecucao,
                COALESCE(NULLIF(mp.TempoEstimadoMin, ''), '0') AS tempoSetup,
                COALESCE(NULLIF(mp.TempoPadraoMin, ''), '0') AS tempoPadrao,
                mp.Ativo,
                COALESCE(pf.ProcessoFabricacao, CONCAT('Processo #', mp.IdProcesso)) AS processofabricacao
             FROM material_processo mp
             LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
             WHERE (mp.codmatFabricante = ? OR (mp.IdMaterial IS NOT NULL AND mp.IdMaterial = ?))
               AND (mp.Ativo = 'A' OR mp.Ativo IS NULL OR mp.Ativo = '1')
             ORDER BY COALESCE(mp.IdOrdemServico, 0) ASC, COALESCE(mp.IdTag, 0) ASC, COALESCE(mp.IdProjeto, 0) ASC, mp.SequenciaExecucao ASC, mp.IdMaterialProcesso ASC`,
            [cod, idMaterial]
        );

        const data = rows.map(r => ({
            idProcesso: r.IdProcesso,
            processofabricacao: r.processofabricacao,
            tempoSetup: Math.max(0, parseFloat(String(r.tempoSetup)) || 0),
            tempoPadrao: Math.max(0, parseFloat(String(r.tempoPadrao)) || 0)
        }));

        res.json({ success: true, data });
    } catch (e) {
        console.error('Erro ao buscar processos do material:', e);
        res.status(500).json({ success: false, message: 'Erro ao buscar processos do material', error: e.message });
    }
});

// GET ONE (Read Single)
app.get('/api/material/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM material WHERE IdMaterial = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Material não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching material:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar material' });
    }
});

// CREATE (Insert)
app.post('/api/material', tenantMiddleware, async (req, res) => {
    const data = req.body;

    if (!data.CodMatFabricante) {
        return res.status(400).json({ success: false, message: 'C?digo do material ? obrigatório' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const loggedUser = req.user?.NomeCompleto || req.user?.nome || req.user?.login || req.tenantUser?.nome || 'Sistema';
        const idMatriz = req.tenantUser?.tenantId || req.user?.idMatriz || null;

        const [result] = await req.tenantDbPool.execute(
            `INSERT INTO material (
                CodMatFabricante, DescResumo, DescDetal, NumeroRP,
                FamiliaMat, CodigoJuridicoMat, 
                Peso, Unidade, Altura, Largura, Profundidade,
                Valor, PercICMS, vICMS, PercIPI, vIPI, vLiquido,
                acabamento, ImagemProduto, DtCad, UsuarioCriacao,
                Autor, Palavrachave, Titulo, SubTitulo, Notas,
                AreaPintura, NumeroDobras, UnidadeSW, ValorSW,
                Imagem, StatusMat, IdValor, TotalValor, EnderecoArquivo,
                MaterialSW, ConfiguracaoArquivo, txtItemEstoque, IdMatriz
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.CodMatFabricante?.trim(),
                data.DescResumo?.trim().toUpperCase() || null,
                data.DescDetal?.trim().toUpperCase() || null,
                data.NumeroRP?.trim() || null,
                parseIntOrNull(data.FamiliaMat),
                data.CodigoJuridicoMat || null,
                parseDoubleOrNull(data.Peso),
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
                loggedUser,
                data.Autor || null,
                data.Palavrachave || null,
                data.Titulo || null,
                data.SubTitulo || null,
                data.Notas || null,
                data.AreaPintura || null,
                data.NumeroDobras || null,
                data.UnidadeSW || null,
                data.ValorSW || null,
                data.Imagem || null,
                data.StatusMat || null,
                data.IdValor || null,
                data.TotalValor || null,
                data.EnderecoArquivo || null,
                data.MaterialSW || null,
                data.ConfiguracaoArquivo || null,
                data.txtItemEstoque || null,
                idMatriz
            ]
        );
        res.json({ success: true, message: 'Material cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'C?digo do material já existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
        }
    }
});

// UPDATE (Put)
app.put('/api/material/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.CodMatFabricante) {
        return res.status(400).json({ success: false, message: 'C?digo do material ? obrigatório' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const loggedUser = req.user?.NomeCompleto || req.user?.nome || req.user?.login || req.tenantUser?.nome || 'Sistema';
        const idMatriz = req.tenantUser?.tenantId || req.user?.idMatriz || null;

        await req.tenantDbPool.execute(
            `UPDATE material SET
                CodMatFabricante = ?, DescResumo = ?, DescDetal = ?, NumeroRP = ?,
                FamiliaMat = ?, CodigoJuridicoMat = ?,
                Peso = ?, Unidade = ?, Altura = ?, Largura = ?, Profundidade = ?,
                Valor = ?, PercICMS = ?, vICMS = ?, PercIPI = ?, vIPI = ?, vLiquido = ?,
                acabamento = ?, ImagemProduto = ?, DtAlteracao = ?, UsuarioAlteracao = ?,
                Autor = ?, Palavrachave = ?, Titulo = ?, SubTitulo = ?, Notas = ?,
                AreaPintura = ?, NumeroDobras = ?, UnidadeSW = ?, ValorSW = ?,
                Imagem = ?, StatusMat = ?, IdValor = ?, TotalValor = ?, EnderecoArquivo = ?,
                MaterialSW = ?, ConfiguracaoArquivo = ?, txtItemEstoque = ?, IdMatriz = ?
            WHERE IdMaterial = ?`,
            [
                data.CodMatFabricante?.trim(),
                data.DescResumo?.trim().toUpperCase() || null,
                data.DescDetal?.trim().toUpperCase() || null,
                data.NumeroRP?.trim() || null,
                parseIntOrNull(data.FamiliaMat),
                data.CodigoJuridicoMat || null,
                parseDoubleOrNull(data.Peso),
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
                loggedUser,
                data.Autor || null,
                data.Palavrachave || null,
                data.Titulo || null,
                data.SubTitulo || null,
                data.Notas || null,
                data.AreaPintura || null,
                data.NumeroDobras || null,
                data.UnidadeSW || null,
                data.ValorSW || null,
                data.Imagem || null,
                data.StatusMat || null,
                data.IdValor || null,
                data.TotalValor || null,
                data.EnderecoArquivo || null,
                data.MaterialSW || null,
                data.ConfiguracaoArquivo || null,
                data.txtItemEstoque || null,
                idMatriz,
                id
            ]
        );
        res.json({ success: true, message: 'Material atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating material:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, message: 'C?digo do material já existe' });
        } else {
            res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
        }
    }
});

// DELETE (Soft Delete)
app.delete('/api/material/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE material SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdMaterial = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Material excluído' });
    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- PEÇA MANUFATURADA --- Rotas migradas para src/routes/pecaManufaturada.js ---
// Registradas via: app.use('/api/peca-manufaturada', pecaManufaturadaRoutes) no topo deste arquivo.



// --- PEÇA MANUFATURADA --- Rotas migradas para src/routes/pecaManufaturada.js ---
// app.use('/api/peca-manufaturada', pecaManufaturadaRoutes) -- registrado no topo.


// --- CRUD: Projetos ---
// LIST (Read All) 
app.get('/api/projeto', tenantMiddleware, async (req, res) => {
    try {
        const {
            dataInicio, dataFim, projeto, descProjeto, descEmpresa,
            previsaoInicio, previsaoFim, criacaoInicio, criacaoFim,
            finalizado, liberado, cnpj, statusProj
        } = req.query;

        let queryParams = [];

        // Filtro base: excluir deletados
        // ─── WHERE com prefixo p. direto (sem regex) ─────────────────────
        let conditions = [];

        // Excluir deletados
        conditions.push("(p.D_E_L_E_T_E IS NULL OR p.D_E_L_E_T_E = '')");

        // Filtro de Liberado (S/N)
        if (liberado) {
            conditions.push("p.liberado = ?");
            queryParams.push(liberado);
        }

        // Filtro de Condição (finalizado):
        //   'C'  → apenas finalizados
        //   'N'  → apenas não finalizados (padrão)
        //   ''   → todos
        if (finalizado === 'C') {
            conditions.push("p.Finalizado = 'C'");
        } else if (finalizado === '' || finalizado === 'T') {
            // Todos: sem restrição
        } else {
            // 'N' ou não enviado: apenas não finalizados
            conditions.push("(p.Finalizado IS NULL OR p.Finalizado = '' OR COALESCE(p.Finalizado,'') <> 'C')");
        }

        // Filtro de StatusProj
        if (statusProj && statusProj !== 'todos') {
            conditions.push("p.StatusProj = ?");
            queryParams.push(statusProj);
        }

        // Datas de previsão
        const prevIni = previsaoInicio || dataInicio;
        const prevFim = previsaoFim || dataFim;
        if (prevIni) {
            conditions.push("STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') >= STR_TO_DATE(?, '%d/%m/%Y')");
            queryParams.push(prevIni);
        }
        if (prevFim) {
            conditions.push("STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') <= STR_TO_DATE(?, '%d/%m/%Y')");
            queryParams.push(prevFim);
        }

        // Datas de criação
        if (criacaoInicio) {
            conditions.push("STR_TO_DATE(p.DataCriacao, '%d/%m/%Y') >= STR_TO_DATE(?, '%d/%m/%Y')");
            queryParams.push(criacaoInicio);
        }
        if (criacaoFim) {
            conditions.push("STR_TO_DATE(p.DataCriacao, '%d/%m/%Y') <= STR_TO_DATE(?, '%d/%m/%Y')");
            queryParams.push(criacaoFim);
        }

        // Textos
        if (projeto) {
            conditions.push("p.Projeto LIKE ?");
            queryParams.push(`%${projeto}%`);
        }
        if (descProjeto) {
            conditions.push("p.DescProjeto LIKE ?");
            queryParams.push(`%${descProjeto}%`);
        }
        if (descEmpresa) {
            conditions.push("p.DescEmpresa LIKE ?");
            queryParams.push(`%${descEmpresa}%`);
        }
        if (cnpj) {
            conditions.push("p.Cnpj LIKE ?");
            queryParams.push(`%${cnpj}%`);
        }

        const whereClause = 'WHERE ' + conditions.join(' AND ');
        console.log('[API /projeto] WHERE:', whereClause, '| params:', queryParams, '| finalizado:', finalizado);

        // Paginação: page e limit via query string (padrão 100, máx 300)
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(300, parseInt(req.query.limit) || 100);
        const offset = (page - 1) * limit;

        // LEFT JOIN agregado → executa UMA consulta para todos apontamentos
        const sql = `
            SELECT
                p.IdProjeto, p.Projeto, p.DescProjeto,
                p.ClienteProjeto, p.DescEmpresa, p.Cnpj,
                p.DataPrevisao, p.DataCriacao, p.PrazoEntrega,
                p.StatusProj, p.DescStatus,
                p.liberado, p.DataLiberacao,
                p.Finalizado, p.DataFinalizado, p.UsuarioFinalizado,
                p.ValorFabricacao, p.ValorRevenda, p.TotalProjeto,
                p.CriadoPor, p.IdEmpresa, p.EnderecoProjeto, p.Observacao,
                p.D_E_L_E_T_E,
                COALESCE(ap.qtd, 0) AS temApontamento,
                0 AS temSaldoPendente
            FROM projetos p
            LEFT JOIN (
                SELECT os2.IdProjeto, COUNT(c2.IdOrdemServicoItemControle) AS qtd
                FROM ordemservicoitemcontrole c2
                INNER JOIN ordemservicoitem oi2 ON oi2.IdOrdemServicoItem = c2.IdOrdemServicoItem
                INNER JOIN ordemservico os2     ON os2.IdOrdemServico     = oi2.IdOrdemServico
                WHERE (c2.D_E_L_E_T_E IS NULL OR c2.D_E_L_E_T_E <> '*')
                GROUP BY os2.IdProjeto
            ) ap ON ap.IdProjeto = p.IdProjeto
            ${whereClause}
            ORDER BY p.IdProjeto DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const countSql = `
            SELECT COUNT(*) AS total FROM projetos p
            ${whereClause}
        `;

        const [[rows], [countResult]] = await Promise.all([
            req.tenantDbPool.execute(sql, queryParams),
            req.tenantDbPool.execute(countSql, queryParams)
        ]);

        res.json({
            success: true,
            data: rows,
            total: Number(countResult[0].total),
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching projetos list:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar projetos' });
    }
});

// GET ONE (Read Single)
app.get('/api/projeto/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            `SELECT p.*,
                (SELECT COUNT(*) FROM ordemservicoitemcontrole c
                 INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = c.IdOrdemServicoItem
                 INNER JOIN ordemservico os ON os.IdOrdemServico = oi.IdOrdemServico
                 WHERE os.IdProjeto = p.IdProjeto
                   AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E <> '*')
                ) AS temApontamento
            FROM projetos p WHERE p.IdProjeto = ?`,
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Projeto não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar projeto' });
    }
});

// CREATE (Insert)
app.post('/api/projeto', tenantMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto à© obrigatà³rio' });
    }

    try {
        const now = getCurrentDateTimeBR();

        let idEmpresa = null;
        let descEmpresa = null;
        if (data.ClienteProjeto) {
            const [empRows] = await req.tenantDbPool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE RazaoSocial = ? LIMIT 1', [data.ClienteProjeto]);
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
                fs.mkdirSync(path.join(EnderecoProjeto, '03-Medià§ão'));
                fs.mkdirSync(path.join(EnderecoProjeto, '04-Qualidade'));
            }
        } catch (dirError) {
            console.error('Erro ao criar diretorio de projeto:', dirError);
        }

        const [result] = await req.tenantDbPool.execute(
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
app.put('/api/projeto/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto à© obrigatà³rio' });
    }

    try {
        let idEmpresa = null;
        let descEmpresa = null;
        if (data.ClienteProjeto) {
            const [empRows] = await req.tenantDbPool.execute('SELECT IdPessoa, NomeFantasia FROM pessoajuridica WHERE RazaoSocial = ? LIMIT 1', [data.ClienteProjeto]);
            if (empRows && empRows.length > 0) {
                idEmpresa = empRows[0].IdPessoa;
                descEmpresa = empRows[0].NomeFantasia;
            }
        }

        await req.tenantDbPool.execute(
            `UPDATE projetos SET
                Projeto = ?, DescProjeto = ?, ClienteProjeto = ?, Responsavel = ?,
                DataPrevisao = ?, PrazoEntrega = ?, StatusProj = ?, DescStatus = ?,
                IdEmpresa = ?, DescEmpresa = ?, PlanejadoFinanceiro = ?, DataEntradaPedido = ?,
                Estado = ?,
                /* Faturamento */
                Cnpj = ?, NomeFantasia = ?, InscEst = ?, EnderecoCliente = ?,
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
                TotalValor = ?, ObservacaoFinal = ?
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
                data.InscEst || data.IE || null,
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
                // Cobranà§a
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
                data.TotalValor || data.TotalFinal || null,
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
app.delete('/api/projeto/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE projetos SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdProjeto = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Projeto excluído' });
    } catch (error) {
        console.error('Error deleting projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});


// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// VISÃƒÆ’O GERAL PRODUÃƒâ€¡ÃƒÆ’O
// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

// ─── ACOMPANHAMENTO GERAL (VISÃO GERAL PRODUÇÃO) ───

// GET projetos for production overview
app.get('/api/acompanhamento/projetos', tenantMiddleware, async (req, res) => {
    try {
        const status = req.query.status; 
        const isFinalizados = req.query.finalizados === '1';
        const isLiberados = req.query.liberados === '1';
        const search = req.query.search;
        const searchProjeto = req.query.projeto;
        const searchDescricao = req.query.descricao;
        const dataFinalDe = req.query.dataFinalDe;
        const dataFinalAte = req.query.dataFinalAte;

        // Condições base de exclusão
        const condicoes = [`COALESCE(p.D_E_L_E_T_E,'') = ''`];

        if (status === 'todos' || status === '') {
            // Todos: inclui StatusProj em branco ou NULL sem filtro
        } else if (status) {
            condicoes.push(`p.StatusProj = ${pool.escape(status)}`);
        }

        if (searchProjeto) {
            const s = pool.escape('%' + searchProjeto.toLowerCase() + '%');
            condicoes.push(`(LOWER(p.Projeto) LIKE ${s} OR LOWER(p.DescEmpresa) LIKE ${s})`);
        }

        if (searchDescricao) {
            const s = pool.escape('%' + searchDescricao.toLowerCase() + '%');
            condicoes.push(`(LOWER(p.DescProjeto) LIKE ${s})`);
        }

        if (search) {
            const s = pool.escape('%' + search.toLowerCase() + '%');
            condicoes.push(`(LOWER(p.Projeto) LIKE ${s} OR LOWER(p.DescProjeto) LIKE ${s} OR LOWER(p.DescEmpresa) LIKE ${s})`);
        }

        if (dataFinalDe) {
            condicoes.push(`STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') >= '${dataFinalDe}'`);
        }
        if (dataFinalAte) {
            condicoes.push(`STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') <= '${dataFinalAte}'`);
        }

        const previsaoInicio = req.query.previsaoInicio;
        const previsaoFim = req.query.previsaoFim;
        const criacaoInicio = req.query.criacaoInicio;
        const criacaoFim = req.query.criacaoFim;

        if (previsaoInicio) condicoes.push(`STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') >= STR_TO_DATE(${pool.escape(previsaoInicio)}, '%d/%m/%Y')`);
        if (previsaoFim) condicoes.push(`STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') <= STR_TO_DATE(${pool.escape(previsaoFim)}, '%d/%m/%Y')`);
        if (criacaoInicio) condicoes.push(`STR_TO_DATE(p.DataCriacao, '%d/%m/%Y') >= STR_TO_DATE(${pool.escape(criacaoInicio)}, '%d/%m/%Y')`);
        if (criacaoFim) condicoes.push(`STR_TO_DATE(p.DataCriacao, '%d/%m/%Y') <= STR_TO_DATE(${pool.escape(criacaoFim)}, '%d/%m/%Y')`);

        const modo = req.query.modo || 'liberados';

        if (modo === 'todos') {
            // no conditions
        } else if (modo === 'finalizados') {
            condicoes.push(`TRIM(COALESCE(p.Finalizado,'')) = 'C'`);
        } else if (modo === 'nao_liberados') {
            condicoes.push(`(TRIM(COALESCE(p.liberado,'')) = '' OR TRIM(COALESCE(p.liberado,'')) = 'N')`);
            condicoes.push(`TRIM(COALESCE(p.Finalizado,'')) != 'C'`);
        } else if (modo === 'nao_finalizados') {
            condicoes.push(`TRIM(COALESCE(p.Finalizado,'')) != 'C'`);
        } else {
            // 'liberados' (default)
            condicoes.push(`(TRIM(COALESCE(p.liberado,'')) = 'S' OR TRIM(COALESCE(p.liberado,'')) = 'SIM')`);
            condicoes.push(`TRIM(COALESCE(p.Finalizado,'')) != 'C'`);
        }

        const where = condicoes.join(' AND ');

        console.log(`[API] Projetos - status: ${status || 'default(ativos)'} | where: ${where}`);




const queryPool = req.tenantDbPool || pool;

        // 1. Fetch Projects (Base data + Native Tags count/percentages)
        const [projetos] = await queryPool.execute(`
            SELECT
                p.*,
                CASE WHEN TRIM(COALESCE(p.DescEmpresa, '')) IN ('', 'Sem cliente', 'Sem Cliente', 'SEM CLIENTE') THEN p.ClienteProjeto ELSE p.DescEmpresa END as DescEmpresa,
                TRIM(p.Finalizado) as Finalizado, 
                COUNT(t.IdTag) AS QtdeTags,
                COALESCE(SUM(CAST(NULLIF(t.qtdetotal,'') AS DECIMAL(10,2))), 0) AS qtdetotalpecas
            FROM projetos p
            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE ${where}
            GROUP BY p.IdProjeto
            ORDER BY p.IdProjeto DESC
            LIMIT 300
        `);

        if (projetos.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const projectIds = projetos.map(p => p.IdProjeto);
        const inClause = projectIds.join(',');

        // Build column list defensively for ordemservicoitem
        const [osiCols] = await queryPool.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordemservicoitem'"
        );
        const osiSet = new Set(osiCols.map(c => c.COLUMN_NAME.toLowerCase()));
        
        const safeOsiCol = (colName) => osiSet.has(colName.toLowerCase()) ? `osi.${colName}` : `NULL`;
        const safeOsiFlag = (colName) => osiSet.has(colName.toLowerCase()) ? `osi.${colName}` : `'0'`;

        // 2. Fetch OS / OSI Aggregations for all fetched projects
        const [osStatsRows] = await queryPool.execute(`
            SELECT 
                os.IdProjeto,
                COUNT(DISTINCT os.IdOrdemServico) AS QtdeOS,
                COALESCE(SUM(os.QtdeTotalItens), 0) AS QtdePecasTags,
                
                /* Corte */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorte')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalCorte,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorte')} = '1' THEN CAST(NULLIF(${safeOsiCol('CorteTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecCorte,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioCorte, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalCorte,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioCorte, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalCorte,
                MAX(CASE WHEN ${safeOsiFlag('txtCorte')} = '1' OR ${safeOsiFlag('txtCorte')} = 'S' THEN 1 ELSE 0 END) as flagCorte,

                /* Dobra */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtDobra')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalDobra,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtDobra')} = '1' THEN CAST(NULLIF(${safeOsiCol('DobraTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecDobra,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioDobra, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalDobra,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioDobra, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalDobra,
                MAX(CASE WHEN ${safeOsiFlag('txtDobra')} = '1' OR ${safeOsiFlag('txtDobra')} = 'S' THEN 1 ELSE 0 END) as flagDobra,

                /* Solda */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtSolda')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalSolda,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtSolda')} = '1' THEN CAST(NULLIF(${safeOsiCol('SoldaTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecSolda,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioSolda, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalSolda,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioSolda, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalSolda,
                MAX(CASE WHEN ${safeOsiFlag('txtSolda')} = '1' OR ${safeOsiFlag('txtSolda')} = 'S' THEN 1 ELSE 0 END) as flagSolda,

                /* Pintura */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPintura')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalPintura,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPintura')} = '1' THEN CAST(NULLIF(${safeOsiCol('PinturaTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecPintura,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioPintura, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalPintura,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioPintura, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalPintura,
                MAX(CASE WHEN ${safeOsiFlag('txtPintura')} = '1' OR ${safeOsiFlag('txtPintura')} = 'S' THEN 1 ELSE 0 END) as flagPintura,

                /* Montagem */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('TxtMontagem')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalMontagem,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('TxtMontagem')} = '1' THEN CAST(NULLIF(${safeOsiCol('MontagemTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecMontagem,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioMontagem, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalMontagem,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioMontagem, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalMontagem,
                MAX(CASE WHEN ${safeOsiFlag('TxtMontagem')} = '1' OR ${safeOsiFlag('TxtMontagem')} = 'S' THEN 1 ELSE 0 END) as flagMontagem,

                /* Corte a Laser */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorteaLaser')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalCorteaLaser,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorteaLaser')} = '1' THEN CAST(NULLIF(${safeOsiCol('CorteaLaserTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecCorteaLaser,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioCorteaLaser, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalCorteaLaser,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioCorteaLaser, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalCorteaLaser,
                MAX(CASE WHEN ${safeOsiFlag('txtCorteaLaser')} = '1' OR ${safeOsiFlag('txtCorteaLaser')} = 'S' THEN 1 ELSE 0 END) as flagCorteaLaser,

                /* Punsionadeira */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPUNSIONADEIRA')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalPunsionadeira,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPUNSIONADEIRA')} = '1' THEN CAST(NULLIF(${safeOsiCol('PUNSIONADEIRATotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecPunsionadeira,
                MIN(${safeOsiCol('PlanejadoInicioPUNSIONADEIRA')}) as PlanejadoInicioPunsionadeira, MAX(${safeOsiCol('PlanejadoFinalPUNSIONADEIRA')}) as PlanejadoFinalPunsionadeira,
                MIN(${safeOsiCol('RealizadoInicioPUNSIONADEIRA')}) as RealizadoInicioPunsionadeira, MAX(${safeOsiCol('RealizadoFinalPUNSIONADEIRA')}) as RealizadoFinalPunsionadeira,
                MAX(CASE WHEN ${safeOsiFlag('txtPUNSIONADEIRA')} = '1' OR ${safeOsiFlag('txtPUNSIONADEIRA')} = 'S' THEN 1 ELSE 0 END) as flagPunsionadeira,

                /* Galvanizar */
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtGALVANIZAR')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS TotalGalvanizar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtGALVANIZAR')} = '1' THEN CAST(NULLIF(${safeOsiCol('GALVANIZARTotalExecutado')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS ExecGalvanizar,
                MIN(${safeOsiCol('PlanejadoInicioGALVANIZAR')}) as PlanejadoInicioGalvanizar, MAX(${safeOsiCol('PlanejadoFinalGALVANIZAR')}) as PlanejadoFinalGalvanizar,
                MIN(${safeOsiCol('RealizadoInicioGALVANIZAR')}) as RealizadoInicioGalvanizar, MAX(${safeOsiCol('RealizadoFinalGALVANIZAR')}) as RealizadoFinalGalvanizar,
                MAX(CASE WHEN ${safeOsiFlag('txtGALVANIZAR')} = '1' OR ${safeOsiFlag('txtGALVANIZAR')} = 'S' THEN 1 ELSE 0 END) as flagGalvanizar

            FROM ordemservico os
            LEFT JOIN ordemservicoitem osi ON CAST(os.IdOrdemServico AS CHAR) = ${safeOsiCol('IdOrdemServico')} AND (${safeOsiCol('D_E_L_E_T_E')} IS NULL OR ${safeOsiCol('D_E_L_E_T_E')} = '')
            INNER JOIN tags t ON os.IdTag = t.IdTag AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE os.IdProjeto IN (${inClause}) 
              AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
              AND os.IdTag IS NOT NULL /* (Conta apenas OS vinculada a tag) */
            GROUP BY os.IdProjeto
        `);

        
        const [mpStatsRows] = await queryPool.execute(`
            SELECT 
                os.IdProjeto,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalCorte,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecCorte,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioCorte,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalCorte,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioCorte,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalCorte,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalDobra,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecDobra,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioDobra,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalDobra,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioDobra,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalDobra,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalSolda,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecSolda,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioSolda,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalSolda,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioSolda,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalSolda,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalPintura,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecPintura,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioPintura,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalPintura,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioPintura,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalPintura,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalMontagem,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecMontagem,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioMontagem,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalMontagem,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioMontagem,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalMontagem,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalCorteaLaser,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecCorteaLaser,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioCorteaLaser,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalCorteaLaser,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioCorteaLaser,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalCorteaLaser,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalPunsionadeira,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecPunsionadeira,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioPunsionadeira,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalPunsionadeira,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioPunsionadeira,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalPunsionadeira,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalGalvanizar,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecGalvanizar,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioGalvanizar,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalGalvanizar,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioGalvanizar,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalGalvanizar
            FROM (
                SELECT IdOrdemServico, IdProjeto
                FROM ordemservico
                WHERE IdProjeto IN (${inClause})
                  AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')
                  AND IdTag IS NOT NULL
            ) os
            INNER JOIN material_processo mp ON mp.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            GROUP BY os.IdProjeto
        `);
        
        const mpStatsMapProjeto = {};
        for (const row of mpStatsRows) {
            mpStatsMapProjeto[row.IdProjeto] = row;
        }

        const osStatsMap = {};
        for (const row of osStatsRows) {
            osStatsMap[row.IdProjeto] = row;
        }

        // 3. Fetch RNC stats
        const [rncRows] = await queryPool.execute(`
            SELECT 
                r.IdProjeto,
                COUNT(CASE WHEN r.Estatus = 'PENDENCIA' THEN 1 END) AS TotalRnc,
                COUNT(*) AS qtdernc,
                COUNT(CASE WHEN r.Estatus = 'PENDENCIA' OR r.Estatus IS NULL OR r.Estatus = '' THEN 1 END) AS qtderncPendente,
                COUNT(CASE WHEN r.Estatus LIKE '%FIN%' OR r.Estatus = 'FINALIZADA' THEN 1 END) AS qtderncFinalizada
            FROM ordemservicoitempendencia r
            WHERE r.IdProjeto IN (${inClause})
              AND (r.D_E_L_E_T_E IS NULL OR r.D_E_L_E_T_E <> '*')
            GROUP BY r.IdProjeto
        `);

        const rncMap = {};
        for (const row of rncRows) {
            rncMap[row.IdProjeto] = row;
        }

        console.log(`[Visão Geral Produção] Projetos found: ${projetos.length}. OS/Item Aggregations executed.`);

        /* Compute percentages in JS to avoid division-by-zero in SQL */
        const pctNormal = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
        const pctSetor = (exec, sumQtde) => {
            return sumQtde > 0 ? Math.min(100, Math.round((exec / sumQtde) * 100)) : 0;
        };

        // 4. Merge all
        const enriched = projetos.map(p => {
            const osS = osStatsMap[p.IdProjeto] || {};
            const mpS = mpStatsMapProjeto[p.IdProjeto] || {};
            const rncS = rncMap[p.IdProjeto] || {};
            
            const merged = {
                ...p,
                QtdeOS: osS.QtdeOS || 0,
                QtdePecasTags: osS.QtdePecasTags || 0,
                
                TotalRnc: rncS.TotalRnc || 0,
                qtdernc: rncS.qtdernc || 0,
                qtderncPendente: rncS.qtderncPendente || 0,
                qtderncFinalizada: rncS.qtderncFinalizada || 0,

                TotalCorte: p.CorteTotalExecutar ?? mpS.mpTotalCorte ?? osS.TotalCorte ?? 0, ExecCorte: p.CorteTotalExecutado ?? mpS.mpExecCorte ?? osS.ExecCorte ?? 0,
                PlanejadoInicioCorte: p.PlanejadoInicioCorte || mpS.mpPlanejadoInicioCorte || osS.PlanejadoInicioCorte || null, PlanejadoFinalCorte: p.PlanejadoFinalCorte || mpS.mpPlanejadoFinalCorte || osS.PlanejadoFinalCorte || null,
                RealizadoInicioCorte: p.RealizadoInicioCorte || mpS.mpRealizadoInicioCorte || osS.RealizadoInicioCorte || null, RealizadoFinalCorte: p.RealizadoFinalCorte || mpS.mpRealizadoFinalCorte || osS.RealizadoFinalCorte || null,
                flagCorte: osS.flagCorte || 0,

                TotalDobra: p.DobraTotalExecutar ?? mpS.mpTotalDobra ?? osS.TotalDobra ?? 0, ExecDobra: p.DobraTotalExecutado ?? mpS.mpExecDobra ?? osS.ExecDobra ?? 0,
                PlanejadoInicioDobra: p.PlanejadoInicioDobra || mpS.mpPlanejadoInicioDobra || osS.PlanejadoInicioDobra || null, PlanejadoFinalDobra: p.PlanejadoFinalDobra || mpS.mpPlanejadoFinalDobra || osS.PlanejadoFinalDobra || null,
                RealizadoInicioDobra: p.RealizadoInicioDobra || mpS.mpRealizadoInicioDobra || osS.RealizadoInicioDobra || null, RealizadoFinalDobra: p.RealizadoFinalDobra || mpS.mpRealizadoFinalDobra || osS.RealizadoFinalDobra || null,
                flagDobra: osS.flagDobra || 0,

                TotalSolda: p.SoldaTotalExecutar ?? mpS.mpTotalSolda ?? osS.TotalSolda ?? 0, ExecSolda: p.SoldaTotalExecutado ?? mpS.mpExecSolda ?? osS.ExecSolda ?? 0,
                PlanejadoInicioSolda: p.PlanejadoInicioSolda || mpS.mpPlanejadoInicioSolda || osS.PlanejadoInicioSolda || null, PlanejadoFinalSolda: p.PlanejadoFinalSolda || mpS.mpPlanejadoFinalSolda || osS.PlanejadoFinalSolda || null,
                RealizadoInicioSolda: p.RealizadoInicioSolda || mpS.mpRealizadoInicioSolda || osS.RealizadoInicioSolda || null, RealizadoFinalSolda: p.RealizadoFinalSolda || mpS.mpRealizadoFinalSolda || osS.RealizadoFinalSolda || null,
                flagSolda: osS.flagSolda || 0,

                TotalPintura: p.PinturaTotalExecutar ?? mpS.mpTotalPintura ?? osS.TotalPintura ?? 0, ExecPintura: p.PinturaTotalExecutado ?? mpS.mpExecPintura ?? osS.ExecPintura ?? 0,
                PlanejadoInicioPintura: p.PlanejadoInicioPintura || mpS.mpPlanejadoInicioPintura || osS.PlanejadoInicioPintura || null, PlanejadoFinalPintura: p.PlanejadoFinalPintura || mpS.mpPlanejadoFinalPintura || osS.PlanejadoFinalPintura || null,
                RealizadoInicioPintura: p.RealizadoInicioPintura || mpS.mpRealizadoInicioPintura || osS.RealizadoInicioPintura || null, RealizadoFinalPintura: p.RealizadoFinalPintura || mpS.mpRealizadoFinalPintura || osS.RealizadoFinalPintura || null,
                flagPintura: osS.flagPintura || 0,

                TotalMontagem: p.MontagemTotalExecutar ?? mpS.mpTotalMontagem ?? osS.TotalMontagem ?? 0, ExecMontagem: p.MontagemTotalExecutado ?? mpS.mpExecMontagem ?? osS.ExecMontagem ?? 0,
                PlanejadoInicioMontagem: p.PlanejadoInicioMontagem || mpS.mpPlanejadoInicioMontagem || osS.PlanejadoInicioMontagem || null, PlanejadoFinalMontagem: p.PlanejadoFinalMontagem || mpS.mpPlanejadoFinalMontagem || osS.PlanejadoFinalMontagem || null,
                RealizadoInicioMontagem: p.RealizadoInicioMontagem || mpS.mpRealizadoInicioMontagem || osS.RealizadoInicioMontagem || null, RealizadoFinalMontagem: p.RealizadoFinalMontagem || mpS.mpRealizadoFinalMontagem || osS.RealizadoFinalMontagem || null,
                flagMontagem: osS.flagMontagem || 0,

                TotalCorteaLaser: p.CorteaLaserTotalExecutar ?? mpS.mpTotalCorteaLaser ?? osS.TotalCorteaLaser ?? 0, ExecCorteaLaser: p.CorteaLaserTotalExecutado ?? mpS.mpExecCorteaLaser ?? osS.ExecCorteaLaser ?? 0,
                PlanejadoInicioCorteaLaser: p.PlanejadoInicioCorteaLaser || mpS.mpPlanejadoInicioCorteaLaser || osS.PlanejadoInicioCorteaLaser || null, PlanejadoFinalCorteaLaser: p.PlanejadoFinalCorteaLaser || mpS.mpPlanejadoFinalCorteaLaser || osS.PlanejadoFinalCorteaLaser || null,
                RealizadoInicioCorteaLaser: p.RealizadoInicioCorteaLaser || mpS.mpRealizadoInicioCorteaLaser || osS.RealizadoInicioCorteaLaser || null, RealizadoFinalCorteaLaser: p.RealizadoFinalCorteaLaser || mpS.mpRealizadoFinalCorteaLaser || osS.RealizadoFinalCorteaLaser || null,
                flagCorteaLaser: osS.flagCorteaLaser || 0,

                TotalPunsionadeira: p.PunsionadeiraTotalExecutar ?? mpS.mpTotalPunsionadeira ?? osS.TotalPunsionadeira ?? 0, ExecPunsionadeira: p.PunsionadeiraTotalExecutado ?? mpS.mpExecPunsionadeira ?? osS.ExecPunsionadeira ?? 0,
                PlanejadoInicioPunsionadeira: p.PlanejadoInicioPunsionadeira || mpS.mpPlanejadoInicioPunsionadeira || osS.PlanejadoInicioPunsionadeira || null, PlanejadoFinalPunsionadeira: p.PlanejadoFinalPunsionadeira || mpS.mpPlanejadoFinalPunsionadeira || osS.PlanejadoFinalPunsionadeira || null,
                RealizadoInicioPunsionadeira: p.RealizadoInicioPunsionadeira || mpS.mpRealizadoInicioPunsionadeira || osS.RealizadoInicioPunsionadeira || null, RealizadoFinalPunsionadeira: p.RealizadoFinalPunsionadeira || mpS.mpRealizadoFinalPunsionadeira || osS.RealizadoFinalPunsionadeira || null,
                flagPunsionadeira: osS.flagPunsionadeira || 0,

                TotalGalvanizar: p.GalvanizarTotalExecutar ?? mpS.mpTotalGalvanizar ?? osS.TotalGalvanizar ?? 0, ExecGalvanizar: p.GalvanizarTotalExecutado ?? mpS.mpExecGalvanizar ?? osS.ExecGalvanizar ?? 0,
                PlanejadoInicioGalvanizar: p.PlanejadoInicioGalvanizar || mpS.mpPlanejadoInicioGalvanizar || osS.PlanejadoInicioGalvanizar || null, PlanejadoFinalGalvanizar: p.PlanejadoFinalGalvanizar || mpS.mpPlanejadoFinalGalvanizar || osS.PlanejadoFinalGalvanizar || null,
                RealizadoInicioGalvanizar: p.RealizadoInicioGalvanizar || mpS.mpRealizadoInicioGalvanizar || osS.RealizadoInicioGalvanizar || null, RealizadoFinalGalvanizar: p.RealizadoFinalGalvanizar || mpS.mpRealizadoFinalGalvanizar || osS.RealizadoFinalGalvanizar || null,
                flagGalvanizar: osS.flagGalvanizar || 0,
            };

            merged.PercentualTags = pctNormal(Number(merged.QtdeTagsExecutadas), Number(merged.QtdeTags));
            merged.PercentualPecas = pctNormal(Number(merged.QtdePecasExecutadas), Number(merged.QtdePecasTags));
            merged.PctCorte = pctSetor(Number(merged.ExecCorte), Number(merged.TotalCorte));
            merged.PctDobra = pctSetor(Number(merged.ExecDobra), Number(merged.TotalDobra));
            merged.PctSolda = pctSetor(Number(merged.ExecSolda), Number(merged.TotalSolda));
            merged.PctPintura = pctSetor(Number(merged.ExecPintura), Number(merged.TotalPintura));
            merged.PctMontagem = pctSetor(Number(merged.ExecMontagem), Number(merged.TotalMontagem));
            merged.PctCorteaLaser = pctSetor(Number(merged.ExecCorteaLaser), Number(merged.TotalCorteaLaser));
            merged.PctPunsionadeira = pctSetor(Number(merged.ExecPunsionadeira), Number(merged.TotalPunsionadeira));
            merged.PctGalvanizar = pctSetor(Number(merged.ExecGalvanizar), Number(merged.TotalGalvanizar));

            return merged;
        });




        res.json({ success: true, data: enriched });

    } catch (error) {
        console.error('Error fetching visao-geral projetos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar projetos: ' + error.message });
    }
});

// GET tags for a project in production overview
app.get('/api/acompanhamento/projeto/:projetoId/tags', tenantMiddleware, async (req, res) => {
    try {
        const queryPool = req.tenantDbPool || pool;
        const tenantDb = req.tenantDb || 'default';

        // Build column list defensively for dynamic columns in 'tags' table
        const [tagsCols] = await req.tenantDbPool.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags'"
        );
        const tagsSet = new Set(tagsCols.map(c => c.COLUMN_NAME.toLowerCase()));
        
        const safeTagCol = (colName) => tagsSet.has(colName.toLowerCase()) ? colName : `NULL AS ${colName}`;

        const [tagsRaw] = await req.tenantDbPool.execute(`
            SELECT
                IdTag, Tag, DescTag, DataEntrada, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag, ValorTag, 
                ${safeTagCol('StatusTag')},
                QtdeOSExecutadas, QtdePecasOS, QtdePecasExecutadas, PercentualPecas, PercentualOS,
                qtdetotal, Finalizado, qtdernc, PesoTotal, ProjetistaPlanejado, PlanejadoInicioEngenharia, PlanejadoFinalEngenharia,
                ${safeTagCol('txtCORTE')}, ${safeTagCol('txtDOBRA')}, ${safeTagCol('txtPINTURA')}, ${safeTagCol('txtPUNSIONADEIRA')}, ${safeTagCol('txtCorteaLaser')}, ${safeTagCol('txtGALVANIZAR')},
                ${safeTagCol('PlanejadoInicioCorte')}, ${safeTagCol('PlanejadoFinalCorte')},
                ${safeTagCol('PlanejadoInicioDobra')}, ${safeTagCol('PlanejadoFinalDobra')},
                ${safeTagCol('PlanejadoInicioSolda')}, ${safeTagCol('PlanejadoFinalSolda')},
                ${safeTagCol('PlanejadoInicioPintura')}, ${safeTagCol('PlanejadoFinalPintura')},
                ${safeTagCol('PlanejadoInicioMontagem')}, ${safeTagCol('PlanejadoFinalMontagem')},
                ${safeTagCol('PlanejadoInicioPUNSIONADEIRA')}, ${safeTagCol('PlanejadoFinalPUNSIONADEIRA')},
                ${safeTagCol('PlanejadoInicioCorteaLaser')}, ${safeTagCol('PlanejadoFinalCorteaLaser')},
                ${safeTagCol('PlanejadoInicioGALVANIZAR')}, ${safeTagCol('PlanejadoFinalGALVANIZAR')},
                ${safeTagCol('Observacao')},
                ${safeTagCol('PlanejadoInicioMedicao')},   ${safeTagCol('PlanejadoFinalMedicao')},   ${safeTagCol('RealizadoInicioMedicao')},   ${safeTagCol('RealizadoFinalMedicao')},
                ${safeTagCol('PlanejadoInicioIsometrico')}, ${safeTagCol('PlanejadoFinalIsometrico')}, ${safeTagCol('RealizadoInicioIsometrico')}, ${safeTagCol('RealizadoFinalIsometrico')},
                ${safeTagCol('PlanejadoInicioAprovacao')},  ${safeTagCol('PlanejadoFinalAprovacao')},  ${safeTagCol('RealizadoInicioAprovacao')},  ${safeTagCol('RealizadoFinalAprovacao')},
                ${safeTagCol('PlanejadoInicioAcabamento')}, ${safeTagCol('PlanejadoFinalAcabamento')}, ${safeTagCol('RealizadoInicioAcabamento')}, ${safeTagCol('RealizadoFinalAcabamento')},
                ${safeTagCol('PlanejadoInicioExpedicao')},  ${safeTagCol('PlanejadoFinalExpedicao')},  ${safeTagCol('RealizadoInicioExpedicao')},  ${safeTagCol('realizadoFinalExpedicao')}
            FROM tags
            WHERE IdProjeto = ?
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')
              AND (${tagsSet.has('tagjaexcluida') ? "TagJaExcluida IS NULL OR TRIM(TagJaExcluida) NOT IN ('1', 'SIM', 'S')" : "1=1"})
              AND (${tagsSet.has('statustag') ? "StatusTag IS NULL OR (CAST(StatusTag AS CHAR) NOT LIKE '%EXCLU%' AND CAST(StatusTag AS CHAR) NOT LIKE '%CANCEL%')" : "1=1"})
            ORDER BY IdTag ASC
        `, [req.params.projetoId]);

        if (tagsRaw.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const tagIds = tagsRaw.map(t => t.IdTag);
        const inClause = tagIds.join(',');

                // Build column list defensively for ordemservicoitem
        const [osiCols] = await req.tenantDbPool.execute(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ordemservicoitem'"
        );
        const osiSet = new Set(osiCols.map(c => c.COLUMN_NAME.toLowerCase()));
        
        const safeOsiCol = (colName) => osiSet.has(colName.toLowerCase()) ? `osi.${colName}` : `NULL`;
        const safeOsiFlag = (colName) => osiSet.has(colName.toLowerCase()) ? `osi.${colName}` : `'0'`;

        const [osStatsRows] = await req.tenantDbPool.execute(`
            SELECT 
                os.IdTag,
                COUNT(DISTINCT os.IdOrdemServico) AS QtdeOS,
                COALESCE(SUM(os.QtdeTotalItens), 0) AS QtdeTotalPecas,

                /* flags */
                MAX(CASE WHEN ${safeOsiFlag('txtCorte')} = '1' OR ${safeOsiFlag('txtCorte')} = 'S' THEN 1 ELSE 0 END) as flagCorte,
                MAX(CASE WHEN ${safeOsiFlag('txtDobra')} = '1' OR ${safeOsiFlag('txtDobra')} = 'S' THEN 1 ELSE 0 END) as flagDobra,
                MAX(CASE WHEN ${safeOsiFlag('txtSolda')} = '1' OR ${safeOsiFlag('txtSolda')} = 'S' THEN 1 ELSE 0 END) as flagSolda,
                MAX(CASE WHEN ${safeOsiFlag('txtPintura')} = '1' OR ${safeOsiFlag('txtPintura')} = 'S' THEN 1 ELSE 0 END) as flagPintura,
                MAX(CASE WHEN ${safeOsiFlag('txtMontagem')} = '1' OR ${safeOsiFlag('txtMontagem')} = 'S' THEN 1 ELSE 0 END) as flagMontagem,
                MAX(CASE WHEN ${safeOsiFlag('txtCorteaLaser')} = '1' OR ${safeOsiFlag('txtCorteaLaser')} = 'S' THEN 1 ELSE 0 END) as flagCorteaLaser,
                MAX(CASE WHEN ${safeOsiFlag('txtPUNSIONADEIRA')} = '1' OR ${safeOsiFlag('txtPUNSIONADEIRA')} = 'S' THEN 1 ELSE 0 END) as flagPunsionadeira,
                MAX(CASE WHEN ${safeOsiFlag('txtGALVANIZAR')} = '1' OR ${safeOsiFlag('txtGALVANIZAR')} = 'S' THEN 1 ELSE 0 END) as flagGalvanizar,

                /* Corte */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioCorte, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalCorte,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioCorte, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalCorte')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalCorte,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('CorteTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS CorteTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('CorteTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS CorteTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorte')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeCorte,

                /* Dobra */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioDobra, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalDobra,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioDobra, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalDobra')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalDobra,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('DobraTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS DobraTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('DobraTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS DobraTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtDobra')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeDobra,

                /* Solda */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioSolda, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalSolda,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioSolda, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalSolda')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalSolda,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('SoldaTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS SoldaTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('SoldaTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS SoldaTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtSolda')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeSolda,

                /* Pintura */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioPintura, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalPintura,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioPintura, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalPintura')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalPintura,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('PinturaTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS PinturaTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('PinturaTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS PinturaTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPintura')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdePintura,

                /* Montagem */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioMontagem, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalMontagem,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioMontagem, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalMontagem')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalMontagem,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('MontagemTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS MontagemTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('MontagemTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS MontagemTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('TxtMontagem')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeMontagem,

                /* Corte a Laser */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioCorteaLaser, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalCorteaLaser,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioCorteaLaser, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalCorteaLaser')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalCorteaLaser,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('CorteaLaserTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS CorteaLaserTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('CorteaLaserTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS CorteaLaserTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtCorteaLaser')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeCorteaLaser,

                /* Punsionadeira */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioPUNSIONADEIRA')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioPUNSIONADEIRA, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalPUNSIONADEIRA')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalPUNSIONADEIRA,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioPUNSIONADEIRA')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioPUNSIONADEIRA, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalPUNSIONADEIRA')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalPUNSIONADEIRA,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('PUNSIONADEIRATotalExecutado')},'') AS DECIMAL(10,2))), 0) AS PUNSIONADEIRATotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('PUNSIONADEIRATotalExecutar')},'') AS DECIMAL(10,2))), 0) AS PUNSIONADEIRATotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtPUNSIONADEIRA')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdePunsionadeira,

                /* Galvanizar */
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoInicioGALVANIZAR')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoInicioGALVANIZAR, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('PlanejadoFinalGALVANIZAR')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as PlanejadoFinalGALVANIZAR,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoInicioGALVANIZAR')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoInicioGALVANIZAR, DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(${safeOsiCol('RealizadoFinalGALVANIZAR')}, ''), '%d/%m/%Y')), '%d/%m/%Y') as RealizadoFinalGALVANIZAR,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('GALVANIZARTotalExecutado')},'') AS DECIMAL(10,2))), 0) AS GALVANIZARTotalExecutado,
                COALESCE(SUM(CAST(NULLIF(${safeOsiCol('GALVANIZARTotalExecutar')},'') AS DECIMAL(10,2))), 0) AS GALVANIZARTotalExecutar,
                COALESCE(SUM(CASE WHEN ${safeOsiFlag('txtGALVANIZAR')} = '1' THEN CAST(NULLIF(${safeOsiCol('QtdeTotal')},'') AS DECIMAL(10,2)) ELSE 0 END), 0) AS SumQtdeGalvanizar

            FROM ordemservico os
            LEFT JOIN ordemservicoitem osi ON CAST(os.IdOrdemServico AS CHAR) = ${safeOsiCol('IdOrdemServico')} AND (${safeOsiCol('D_E_L_E_T_E')} IS NULL OR ${safeOsiCol('D_E_L_E_T_E')} = '')
            WHERE os.IdTag IN (${inClause})
              AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
            GROUP BY os.IdTag
        `);

        const osStatsMap = {};
        for (const row of osStatsRows) {
            osStatsMap[row.IdTag] = row;
        }

        
        
        const [mpStatsRows] = await req.tenantDbPool.execute(`
            SELECT 
                os.IdTag,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalCorte,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecCorte,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioCorte,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalCorte,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioCorte,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Corte%' AND pf.processofabricacao NOT LIKE '%Laser%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalCorte,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalDobra,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecDobra,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioDobra,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalDobra,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioDobra,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Dobra%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalDobra,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalSolda,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecSolda,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioSolda,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalSolda,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioSolda,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Solda%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalSolda,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalPintura,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecPintura,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioPintura,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalPintura,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioPintura,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Pintura%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalPintura,
                
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalMontagem,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecMontagem,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioMontagem,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalMontagem,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioMontagem,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Montagem%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalMontagem,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalCorteaLaser,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecCorteaLaser,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioCorteaLaser,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalCorteaLaser,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioCorteaLaser,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%Laser%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalCorteaLaser,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalPunsionadeira,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecPunsionadeira,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioPUNSIONADEIRA,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalPUNSIONADEIRA,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioPUNSIONADEIRA,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%PUNSIONADEIRA%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalPUNSIONADEIRA,

                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.TotalExecutar ELSE 0 END), 0) AS mpTotalGalvanizar,
                COALESCE(SUM(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.TotalExecutado ELSE 0 END), 0) AS mpExecGalvanizar,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.PlanejadoInicio ELSE NULL END), '%d/%m/%Y') as mpPlanejadoInicioGALVANIZAR,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.PlanejadoFinal ELSE NULL END), '%d/%m/%Y') as mpPlanejadoFinalGALVANIZAR,
                DATE_FORMAT(MIN(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.RealizadoInicio ELSE NULL END), '%d/%m/%Y') as mpRealizadoInicioGALVANIZAR,
                DATE_FORMAT(MAX(CASE WHEN pf.processofabricacao LIKE '%GALVANIZAR%' THEN mp.RealizadoFinal ELSE NULL END), '%d/%m/%Y') as mpRealizadoFinalGALVANIZAR
            FROM (
                SELECT IdOrdemServico, IdTag
                FROM ordemservico
                WHERE IdTag IN (${inClause})
                  AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')
            ) os
            INNER JOIN material_processo mp ON mp.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            GROUP BY os.IdTag
        `);
const mpStatsMap = {};
        for (const row of mpStatsRows) {
            mpStatsMap[row.IdTag] = row;
        }

        const rows = tagsRaw.map(t => {
            const osS = osStatsMap[t.IdTag] || {};
            const mpS = mpStatsMap[t.IdTag] || {};
            return {
                ...t,
                QtdeOS: osS.QtdeOS || 0,
                QtdeTotalPecas: osS.QtdeTotalPecas || 0,
                
                flagCorte: osS.flagCorte || 0,
                flagDobra: osS.flagDobra || 0,
                flagSolda: osS.flagSolda || 0,
                flagPintura: osS.flagPintura || 0,
                flagMontagem: osS.flagMontagem || 0,
                flagCorteaLaser: osS.flagCorteaLaser || 0,
                flagPunsionadeira: osS.flagPunsionadeira || 0,
                flagGalvanizar: osS.flagGalvanizar || 0,
                
                txtCORTE: t.txtCORTE,
                txtDOBRA: t.txtDOBRA,
                txtPINTURA: t.txtPINTURA,
                txtPUNSIONADEIRA: t.txtPUNSIONADEIRA,
                txtCorteaLaser: t.txtCorteaLaser,
                txtGALVANIZAR: t.txtGALVANIZAR,

                PlanejadoInicioCorte: mpS.mpPlanejadoInicioCorte || t.PlanejadoInicioCorte || osS.PlanejadoInicioCorte || null, PlanejadoFinalCorte: mpS.mpPlanejadoFinalCorte || t.PlanejadoFinalCorte || osS.PlanejadoFinalCorte || null,
                RealizadoInicioCorte: mpS.mpRealizadoInicioCorte || t.RealizadoInicioCorte || osS.RealizadoInicioCorte || null, RealizadoFinalCorte: mpS.mpRealizadoFinalCorte || t.RealizadoFinalCorte || osS.RealizadoFinalCorte || null,
                CorteTotalExecutado: mpS.mpExecCorte ?? t.CorteTotalExecutado ?? osS.CorteTotalExecutado ?? 0, CorteTotalExecutar: mpS.mpTotalCorte ?? t.CorteTotalExecutar ?? osS.CorteTotalExecutar ?? 0, SumQtdeCorte: osS.SumQtdeCorte || 0,

                PlanejadoInicioDobra: mpS.mpPlanejadoInicioDobra || t.PlanejadoInicioDobra || osS.PlanejadoInicioDobra || null, PlanejadoFinalDobra: mpS.mpPlanejadoFinalDobra || t.PlanejadoFinalDobra || osS.PlanejadoFinalDobra || null,
                RealizadoInicioDobra: mpS.mpRealizadoInicioDobra || t.RealizadoInicioDobra || osS.RealizadoInicioDobra || null, RealizadoFinalDobra: mpS.mpRealizadoFinalDobra || t.RealizadoFinalDobra || osS.RealizadoFinalDobra || null,
                DobraTotalExecutado: mpS.mpExecDobra ?? t.DobraTotalExecutado ?? osS.DobraTotalExecutado ?? 0, DobraTotalExecutar: mpS.mpTotalDobra ?? t.DobraTotalExecutar ?? osS.DobraTotalExecutar ?? 0, SumQtdeDobra: osS.SumQtdeDobra || 0,

                PlanejadoInicioSolda: mpS.mpPlanejadoInicioSolda || t.PlanejadoInicioSolda || osS.PlanejadoInicioSolda || null, PlanejadoFinalSolda: mpS.mpPlanejadoFinalSolda || t.PlanejadoFinalSolda || osS.PlanejadoFinalSolda || null,
                RealizadoInicioSolda: mpS.mpRealizadoInicioSolda || t.RealizadoInicioSolda || osS.RealizadoInicioSolda || null, RealizadoFinalSolda: mpS.mpRealizadoFinalSolda || t.RealizadoFinalSolda || osS.RealizadoFinalSolda || null,
                SoldaTotalExecutado: mpS.mpExecSolda ?? t.SoldaTotalExecutado ?? osS.SoldaTotalExecutado ?? 0, SoldaTotalExecutar: mpS.mpTotalSolda ?? t.SoldaTotalExecutar ?? osS.SoldaTotalExecutar ?? 0, SumQtdeSolda: osS.SumQtdeSolda || 0,

                PlanejadoInicioPintura: mpS.mpPlanejadoInicioPintura || t.PlanejadoInicioPintura || osS.PlanejadoInicioPintura || null, PlanejadoFinalPintura: mpS.mpPlanejadoFinalPintura || t.PlanejadoFinalPintura || osS.PlanejadoFinalPintura || null,
                RealizadoInicioPintura: mpS.mpRealizadoInicioPintura || t.RealizadoInicioPintura || osS.RealizadoInicioPintura || null, RealizadoFinalPintura: mpS.mpRealizadoFinalPintura || t.RealizadoFinalPintura || osS.RealizadoFinalPintura || null,
                PinturaTotalExecutado: mpS.mpExecPintura ?? t.PinturaTotalExecutado ?? osS.PinturaTotalExecutado ?? 0, PinturaTotalExecutar: mpS.mpTotalPintura ?? t.PinturaTotalExecutar ?? osS.PinturaTotalExecutar ?? 0, SumQtdePintura: osS.SumQtdePintura || 0,

                PlanejadoInicioMontagem: mpS.mpPlanejadoInicioMontagem || t.PlanejadoInicioMontagem || osS.PlanejadoInicioMontagem || null, PlanejadoFinalMontagem: mpS.mpPlanejadoFinalMontagem || t.PlanejadoFinalMontagem || osS.PlanejadoFinalMontagem || null,
                RealizadoInicioMontagem: mpS.mpRealizadoInicioMontagem || t.RealizadoInicioMontagem || osS.RealizadoInicioMontagem || null, RealizadoFinalMontagem: mpS.mpRealizadoFinalMontagem || t.RealizadoFinalMontagem || osS.RealizadoFinalMontagem || null,
                MontagemTotalExecutado: mpS.mpExecMontagem ?? t.MontagemTotalExecutado ?? osS.MontagemTotalExecutado ?? 0, MontagemTotalExecutar: mpS.mpTotalMontagem ?? t.MontagemTotalExecutar ?? osS.MontagemTotalExecutar ?? 0, SumQtdeMontagem: osS.SumQtdeMontagem || 0,

                PlanejadoInicioCorteaLaser: mpS.mpPlanejadoInicioCorteaLaser || t.PlanejadoInicioCorteaLaser || osS.PlanejadoInicioCorteaLaser || null, PlanejadoFinalCorteaLaser: mpS.mpPlanejadoFinalCorteaLaser || t.PlanejadoFinalCorteaLaser || osS.PlanejadoFinalCorteaLaser || null,
                RealizadoInicioCorteaLaser: mpS.mpRealizadoInicioCorteaLaser || t.RealizadoInicioCorteaLaser || osS.RealizadoInicioCorteaLaser || null, RealizadoFinalCorteaLaser: mpS.mpRealizadoFinalCorteaLaser || t.RealizadoFinalCorteaLaser || osS.RealizadoFinalCorteaLaser || null,
                CorteaLaserTotalExecutado: mpS.mpExecCorteaLaser ?? t.CorteaLaserTotalExecutado ?? osS.CorteaLaserTotalExecutado ?? 0, CorteaLaserTotalExecutar: mpS.mpTotalCorteaLaser ?? t.CorteaLaserTotalExecutar ?? osS.CorteaLaserTotalExecutar ?? 0, SumQtdeCorteaLaser: osS.SumQtdeCorteaLaser || 0,

                PlanejadoInicioPUNSIONADEIRA: mpS.mpPlanejadoInicioPUNSIONADEIRA || t.PlanejadoInicioPUNSIONADEIRA || osS.PlanejadoInicioPUNSIONADEIRA || null, PlanejadoFinalPUNSIONADEIRA: mpS.mpPlanejadoFinalPUNSIONADEIRA || t.PlanejadoFinalPUNSIONADEIRA || osS.PlanejadoFinalPUNSIONADEIRA || null,
                RealizadoInicioPUNSIONADEIRA: mpS.mpRealizadoInicioPUNSIONADEIRA || t.RealizadoInicioPUNSIONADEIRA || osS.RealizadoInicioPUNSIONADEIRA || null, RealizadoFinalPUNSIONADEIRA: mpS.mpRealizadoFinalPUNSIONADEIRA || t.RealizadoFinalPUNSIONADEIRA || osS.RealizadoFinalPUNSIONADEIRA || null,
                PUNSIONADEIRATotalExecutado: mpS.mpExecPunsionadeira ?? osS.PUNSIONADEIRATotalExecutado ?? 0, PUNSIONADEIRATotalExecutar: mpS.mpTotalPunsionadeira ?? osS.PUNSIONADEIRATotalExecutar ?? 0, SumQtdePunsionadeira: osS.SumQtdePunsionadeira || 0,

                PlanejadoInicioGALVANIZAR: mpS.mpPlanejadoInicioGALVANIZAR || t.PlanejadoInicioGALVANIZAR || osS.PlanejadoInicioGALVANIZAR || null, PlanejadoFinalGALVANIZAR: mpS.mpPlanejadoFinalGALVANIZAR || t.PlanejadoFinalGALVANIZAR || osS.PlanejadoFinalGALVANIZAR || null,
                RealizadoInicioGALVANIZAR: mpS.mpRealizadoInicioGALVANIZAR || t.RealizadoInicioGALVANIZAR || osS.RealizadoInicioGALVANIZAR || null, RealizadoFinalGALVANIZAR: mpS.mpRealizadoFinalGALVANIZAR || t.RealizadoFinalGALVANIZAR || osS.RealizadoFinalGALVANIZAR || null,
                GALVANIZARTotalExecutado: mpS.mpExecGalvanizar ?? osS.GALVANIZARTotalExecutado ?? 0, GALVANIZARTotalExecutar: mpS.mpTotalGalvanizar ?? osS.GALVANIZARTotalExecutar ?? 0, SumQtdeGalvanizar: osS.SumQtdeGalvanizar || 0,

                CortePercentual: (Number(osS.SumQtdeCorte) > 0 ? Math.round((Number(osS.CorteTotalExecutado) || 0) / Number(osS.SumQtdeCorte) * 100) : 0).toString(),
                DobraPercentual: (Number(osS.SumQtdeDobra) > 0 ? Math.round((Number(osS.DobraTotalExecutado) || 0) / Number(osS.SumQtdeDobra) * 100) : 0).toString(),
                SoldaPercentual: (Number(osS.SumQtdeSolda) > 0 ? Math.round((Number(osS.SoldaTotalExecutado) || 0) / Number(osS.SumQtdeSolda) * 100) : 0).toString(),
                PinturaPercentual: (Number(osS.SumQtdePintura) > 0 ? Math.round((Number(osS.PinturaTotalExecutado) || 0) / Number(osS.SumQtdePintura) * 100) : 0).toString(),
                MontagemPercentual: (Number(osS.SumQtdeMontagem) > 0 ? Math.round((Number(osS.MontagemTotalExecutado) || 0) / Number(osS.SumQtdeMontagem) * 100) : 0).toString(),
                CorteaLaserPercentual: (Number(osS.SumQtdeCorteaLaser) > 0 ? Math.round((Number(osS.CorteaLaserTotalExecutado) || 0) / Number(osS.SumQtdeCorteaLaser) * 100) : 0).toString(),
                PUNSIONADEIRAPercentual: (Number(osS.SumQtdePunsionadeira) > 0 ? Math.round((Number(osS.PUNSIONADEIRATotalExecutado) || 0) / Number(osS.SumQtdePunsionadeira) * 100) : 0).toString(),
                GALVANIZARPercentual: (Number(osS.SumQtdeGalvanizar) > 0 ? Math.round((Number(osS.GALVANIZARTotalExecutado) || 0) / Number(osS.SumQtdeGalvanizar) * 100) : 0).toString(),
            };
        });


        console.log(`[Tags] [${tenantDb}] Projeto ${req.params.projetoId}: ${rows.length} tags found`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`[Tags] Error fetching tags for projeto ${req.params.projetoId} (tenant: ${req.tenantDb || 'default'}):`, error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags: ' + error.message });
    }
});

// ─── GET recursos (material_processo) agregados por tag do projeto ───────────
app.get('/api/acompanhamento/projeto/:projetoId/recursos', tenantMiddleware, async (req, res) => {
    try {
        const { projetoId } = req.params;
        const queryPool = req.tenantDbPool || pool;

        const [rows] = await queryPool.execute(`
            SELECT
                t.IdTag,
                t.Tag,
                t.DescTag,
                TRIM(t.Finalizado)                                             AS Finalizado,
                pf.IdProcessoFabricacao,
                pf.processofabricacao                                          AS DescRecurso,
                COALESCE(SUM(mp.TotalExecutar),  0)                            AS TotalExecutar,
                COALESCE(SUM(mp.TotalExecutado), 0)                            AS TotalExecutado,
                DATE_FORMAT(MIN(mp.PlanejadoInicio), '%d/%m/%Y')               AS PlanejadoInicio,
                DATE_FORMAT(MAX(mp.PlanejadoFinal),  '%d/%m/%Y')               AS PlanejadoFinal,
                DATE_FORMAT(MIN(mp.RealizadoInicio), '%d/%m/%Y')               AS RealizadoInicio,
                DATE_FORMAT(MAX(mp.RealizadoFinal),  '%d/%m/%Y')               AS RealizadoFinal
            FROM tags t
            INNER JOIN ordemservico os
                ON  os.IdTag = t.IdTag
                AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
            INNER JOIN material_processo mp
                ON  mp.IdOrdemServico = os.IdOrdemServico
            INNER JOIN processofabricacao pf
                ON  pf.IdProcessoFabricacao = mp.IdProcesso
            WHERE t.IdProjeto = ?
              AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '' OR t.D_E_L_E_T_E = ' ')
            GROUP BY t.IdTag, t.Tag, t.DescTag, t.Finalizado,
                     pf.IdProcessoFabricacao, pf.processofabricacao
            ORDER BY t.IdTag ASC, pf.processofabricacao ASC
        `, [projetoId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`[Recursos] Error for projeto ${req.params.projetoId}:`, error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar recursos: ' + error.message });
    }
});

// GET OS recursos para uma tag específica (detalhe expansível por OS)
app.get('/api/acompanhamento/tag/:tagId/os-recursos', tenantMiddleware, async (req, res) => {
    try {
        const { tagId } = req.params;
        const queryPool = req.tenantDbPool || pool;

        const [rows] = await queryPool.execute(`
            SELECT
                os.IdOrdemServico,
                COALESCE(os.Descricao, CONCAT('OS #', os.IdOrdemServico)) AS DescricaoOS,
                TRIM(os.Estatus)                                           AS StatusOS,
                pf.IdProcessoFabricacao,
                pf.processofabricacao                                      AS DescRecurso,
                COALESCE(SUM(mp.TotalExecutar),  0)                        AS TotalExecutar,
                COALESCE(SUM(mp.TotalExecutado), 0)                        AS TotalExecutado,
                DATE_FORMAT(MIN(mp.PlanejadoInicio), '%d/%m/%Y')           AS PlanejadoInicio,
                DATE_FORMAT(MAX(mp.PlanejadoFinal),  '%d/%m/%Y')           AS PlanejadoFinal,
                DATE_FORMAT(MIN(mp.RealizadoInicio), '%d/%m/%Y')           AS RealizadoInicio,
                DATE_FORMAT(MAX(mp.RealizadoFinal),  '%d/%m/%Y')           AS RealizadoFinal
            FROM material_processo mp
            INNER JOIN ordemservico os
                ON  os.IdOrdemServico = mp.IdOrdemServico
                AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
            INNER JOIN processofabricacao pf
                ON  pf.IdProcessoFabricacao = mp.IdProcesso
            WHERE mp.IdTag = ?
            GROUP BY os.IdOrdemServico, os.Descricao, os.Estatus,
                     pf.IdProcessoFabricacao, pf.processofabricacao
            ORDER BY os.IdOrdemServico ASC, pf.processofabricacao ASC
        `, [tagId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`[OS Recursos] Error for tag ${req.params.tagId}:`, error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar OS recursos: ' + error.message });
    }
});

// PUT planejar-projetista for a tag
app.put('/api/acompanhamento/tags/:idTag/planejar-projetista', tenantMiddleware, async (req, res) => {
    try {
        const { projetistaPlanejado, planejadoInicioEngenharia, planejadoFinalEngenharia, usuario } = req.body;
        
        if (!projetistaPlanejado || !planejadoInicioEngenharia || !planejadoFinalEngenharia) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatà³rios: Projetista, Inà­cio e Fim.' });
        }

        const queryPool = req.tenantDbPool || pool;
        const [result] = await req.tenantDbPool.execute(`
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

// PUT observacao for a project
app.put('/api/acompanhamento/projeto/:id/observacao', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { observacao } = req.body;

        const queryPool = req.tenantDbPool || pool;
        const [result] = await req.tenantDbPool.execute(
            "UPDATE projetos SET Observacao = ? WHERE IdProjeto = ?",
            [observacao || '', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
        }

        res.json({ success: true, message: 'Observaà§ão atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating project observation:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar observaà§ão: ' + error.message });
    }
});

// PUT observacao for a tag
app.put('/api/acompanhamento/tags/:idTag/observacao', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const { observacao } = req.body;

        const queryPool = req.tenantDbPool || pool;
        const [result] = await req.tenantDbPool.execute(
            "UPDATE tags SET Observacao = ? WHERE IdTag = ?",
            [observacao || '', idTag]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        }

        res.json({ success: true, message: 'Observação da tag atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating tag observation:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar observação da tag: ' + error.message });
    }
});

// PUT alterar qtde liberada for a tag
app.put('/api/acompanhamento/tags/:idTag/qtde', tenantMiddleware, async (req, res) => {
    try {
        const { qtdeLiberada, usuario } = req.body;
        
        if (qtdeLiberada === undefined || qtdeLiberada === null) {
            return res.status(400).json({ success: false, message: 'A Quantidade Liberada à© obrigatà³ria.' });
        }

        // Fetch current tag to calculate balance
        const queryPool = req.tenantDbPool || pool;
        const [tagRows] = await req.tenantDbPool.execute('SELECT QtdeTag FROM tags WHERE IdTag = ?', [req.params.idTag]);
        if (tagRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        }
        
        const qtdeTag = parseFloat(tagRows[0].QtdeTag) || 0;
        const liberada = parseFloat(qtdeLiberada) || 0;
        
        if (liberada > qtdeTag) {
            return res.status(400).json({ success: false, message: `Quantidade liberada (${liberada}) não pode ser maior que a Quantidade da Tag (${qtdeTag}).` });
        }

        const saldo = qtdeTag - liberada;

        const [result] = await req.tenantDbPool.execute(`
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
app.put('/api/acompanhamento/tags/finalizar', tenantMiddleware, async (req, res) => {
    try {
        const { idProjeto, idTag, finalizarTodas, usuario } = req.body;
        
        if (!idProjeto || !usuario) {
            return res.status(400).json({ success: false, message: 'Projeto e Usuário são obrigatà³rios.' });
        }

        const dataLocal = getCurrentDateTimeBR();
        const queryPool = req.tenantDbPool || pool;
        
        if (finalizarTodas) {
            await req.tenantDbPool.execute(`
                UPDATE tags 
                SET Finalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdProjeto = ? AND (Finalizado IS NULL OR Finalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, usuario, idProjeto]);

            await req.tenantDbPool.execute(`
                UPDATE ordemservicoitem 
                SET OrdemServicoItemFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE idProjeto = ? AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, usuario, idProjeto]);

            await req.tenantDbPool.execute(`
                UPDATE ordemservico 
                SET OrdemServicoFinalizado = 'C', 
                    DataFinalizado = ?,
                    DataFinalizacao = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdProjeto = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado = '') AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [dataLocal, dataLocal, usuario, idProjeto]);
        } else {
            if (!idTag) return res.status(400).json({ success: false, message: 'ID da Tag à© obrigatà³rio para finalizar apenas uma.' });
            
            await req.tenantDbPool.execute(`
                UPDATE tags 
                SET Finalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, usuario, idTag]);

            await req.tenantDbPool.execute(`
                UPDATE ordemservicoitem 
                SET OrdemServicoItemFinalizado = 'C', 
                    DataFinalizado = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, usuario, idTag]);

            await req.tenantDbPool.execute(`
                UPDATE ordemservico 
                SET OrdemServicoFinalizado = 'C', 
                    DataFinalizado = ?,
                    DataFinalizacao = ?, 
                    UsuarioFinalizado = ? 
                WHERE IdTag = ?
            `, [dataLocal, dataLocal, usuario, idTag]);
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
app.get('/api/visao-geral-engenharia/tags', tenantMiddleware, async (req, res) => {
    try {
        const queryPool = req.tenantDbPool || pool;
        const [rows] = await req.tenantDbPool.execute(`
            SELECT
                t.IdTag, t.Tag, t.DescTag, t.Projeto, t.DescEmpresa, t.TipoProduto, t.DataPrevisao, t.ProjetistaPlanejado, t.CaminhoIsometrico,
                t.PlanejadoInicioMedicao, t.PlanejadoFinalMedicao, t.RealizadoInicioMedicao, t.RealizadoFinalMedicao,
                t.PlanejadoInicioIsometrico, t.PlanejadoFinalIsometrico, t.RealizadoInicioIsometrico, t.RealizadoFinalIsometrico,
                t.PlanejadoInicioEngenharia, t.PlanejadoFinalEngenharia, t.RealizadoInicioEngenharia, t.RealizadoFinalEngenharia,
                t.PlanejadoInicioAprovacao, t.PlanejadoFinalAprovacao, t.RealizadoInicioAprovacao, t.RealizadoFinalAprovacao,
                p.DataTermino, p.Finalizado AS ProjFinalizado, p.liberado AS ProjLiberado
            FROM tags t
            LEFT JOIN projetos p ON t.IdProjeto = p.IdProjeto
            WHERE (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E != '*')
            ORDER BY t.IdProjeto DESC, t.IdTag DESC
        `);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching visao-geral-engenharia tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags da engenharia: ' + error.message });
    }
});

// GET: Buscar TODAS as tags globalmente (para a tela de Visão Geral Global Tags)
app.get('/api/visao-geral/tags-globais', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.executeOnDefault(`
            SELECT 
                t.IdTag, t.IdProjeto, t.Tag, t.DescTag, DATE_FORMAT(t.DataPrevisao, '%d/%m/%Y') AS DataPrevisao,
                t.PlanejadoInicioCorte, t.PlanejadoFinalCorte, t.RealizadoInicioCorte, t.RealizadoFinalCorte, t.CorteTotalExecutar, t.CorteTotalExecutado, t.CortePercentual,
                t.PlanejadoInicioDobra, t.PlanejadoFinalDobra, t.RealizadoInicioDobra, t.RealizadoFinalDobra, t.DobraTotalExecutar, t.DobraTotalExecutado, t.DobraPercentual,
                t.PlanejadoInicioSolda, t.PlanejadoFinalSolda, t.RealizadoInicioSolda, t.RealizadoFinalSolda, t.SoldaTotalExecutar, t.SoldaTotalExecutado, t.SoldaPercentual,
                t.PlanejadoInicioPintura, t.PlanejadoFinalPintura, t.RealizadoInicioPintura, t.RealizadoFinalPintura, t.PinturaTotalExecutar, t.PinturaTotalExecutado, t.PinturaPercentual,
                t.PlanejadoInicioMontagem, t.PlanejadoFinalMontagem, t.RealizadoInicioMontagem, t.RealizadoFinalMontagem, t.MontagemTotalExecutar, t.MontagemTotalExecutado, t.MontagemPercentual,
                p.Projeto as Projeto,
                p.DescProjeto as ProjetoDescricao,
                p.Finalizado as ProjetoFinalizado
            FROM tags t
            LEFT JOIN projetos p ON t.IdProjeto = p.IdProjeto
            WHERE (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E != '*')
            ORDER BY t.IdTag DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags-globais:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags globais: ' + error.message });
    }
});

// PUT lote update dates for Visao Geral Engenharia
app.put('/api/visao-geral-engenharia/tags/lote', tenantMiddleware, async (req, res) => {
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

        const placeholders = idTags.map(() => 'é').join(',');
        params.push(...idTags);

        const query = `
            UPDATE tags 
            SET ${updates.join(', ')}
            WHERE IdTag IN (${placeholders})
        `;

        const queryPool = req.tenantDbPool || pool;
        const [result] = await req.tenantDbPool.execute(query, params);

        // ── PROPAGAR 4 DATAS DO SETOR PARA PROJETOS (com usuário responsável) ──
        // MIN para Início | MAX para Final | usuario = NomeCompleto do usuário logado
        const SETOR_MAP_LOTE = {
            Medicao: [
                { tag: 'PlanejadoInicioMedicao',  proj: 'PlanejadoInicioMEDICAO',  usu: 'UsuarioPlanejadoInicioMEDICAO',  fn: 'MIN' },
                { tag: 'PlanejadoFinalMedicao',   proj: 'PlanejadoFinalMEDICAO',   usu: 'UsuarioPlanejadoFinalMEDICAO',   fn: 'MAX' },
                { tag: 'RealizadoInicioMedicao',  proj: 'RealizadoInicioMEDICAO',  usu: 'UsuarioRealizadoInicioMEDICAO',  fn: 'MIN' },
                { tag: 'RealizadoFinalMedicao',   proj: 'RealizadoFinalMEDICAO',   usu: 'UsuarioRealizadoFinalMEDICAO',   fn: 'MAX' },
            ],
            Isometrico: [
                { tag: 'PlanejadoInicioIsometrico',  proj: 'PlanejadoInicioISOMETRICO',  usu: 'UsuarioPlanejadoInicioISOMETRICO',  fn: 'MIN' },
                { tag: 'PlanejadoFinalIsometrico',   proj: 'PlanejadoFinalISOMETRICO',   usu: 'UsuarioPlanejadoFinalISOMETRICO',   fn: 'MAX' },
                { tag: 'RealizadoInicioIsometrico',  proj: 'RealizadoInicioISOMETRICO',  usu: 'UsuarioRealizadoInicioISOMETRICO',  fn: 'MIN' },
                { tag: 'RealizadoFinalIsometrico',   proj: 'RealizadoFinalISOMETRICO',   usu: 'UsuarioRealizadoFinalISOMETRICO',   fn: 'MAX' },
            ],
            Engenharia: [
                { tag: 'PlanejadoInicioEngenharia',  proj: 'PlanejadoInicioENGENHARIA',  usu: 'UsuarioPlanejadoInicioENGENHARIA',  fn: 'MIN' },
                { tag: 'PlanejadoFinalEngenharia',   proj: 'PlanejadoFinalENGENHARIA',   usu: 'UsuarioPlanejadoFinalENGENHARIA',   fn: 'MAX' },
                { tag: 'RealizadoInicioEngenharia',  proj: 'RealizadoInicioENGENHARIA',  usu: 'UsuarioRealizadoInicioENGENHARIA',  fn: 'MIN' },
                { tag: 'RealizadoFinalEngenharia',   proj: 'RealizadoFinalENGENHARIA',   usu: 'UsuarioRealizadoFinalENGENHARIA',   fn: 'MAX' },
            ],
            Aprovacao: [
                { tag: 'PlanejadoInicioAprovacao',   proj: 'PlanejadoInicioAPROVACAO',   usu: 'UsuarioPlanejadoInicioAPROVACAO',   fn: 'MIN' },
                { tag: 'PlanejadoFinalAprovacao',    proj: 'PlanejadoFinalAPROVACAO',    usu: 'UsuarioPlanejadoFinalAPROVACAO',    fn: 'MAX' },
                { tag: 'RealizadoInicioAprovacao',   proj: 'RealizadoInicioAPROVACAO',   usu: 'UsuarioRealizadoInicioAPROVACAO',   fn: 'MIN' },
                { tag: 'RealizadoFinalAprovacao',    proj: 'RealizadoFinalAPROVACAO',    usu: 'UsuarioRealizadoFinalAPROVACAO',    fn: 'MAX' },
            ],
        };
        try {
            const camposSetor = SETOR_MAP_LOTE[setor];
            if (camposSetor) {
                // 1) Descobre os projetos afetados pelas tags alteradas
                const phIds = idTags.map(() => 'é').join(',');
                const [tagProjRows] = await req.tenantDbPool.execute(
                    `SELECT DISTINCT IdProjeto FROM tags WHERE IdTag IN (${phIds})`, idTags
                );

                for (const { IdProjeto } of tagProjRows) {
                    const setProjeto   = [];
                    const paramsProjeto = [];

                    // 2) Para cada um dos 4 campos do setor: recalcula MIN ou MAX nas tags
                    for (const { tag, proj, usu, fn } of camposSetor) {
                        const [[aggRow]] = await req.tenantDbPool.execute(`
                            SELECT DATE_FORMAT(
                                ${fn}(STR_TO_DATE(NULLIF(TRIM(\`${tag}\`),''), '%d/%m/%Y')),
                                '%d/%m/%Y'
                            ) AS val
                            FROM tags
                            WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                        `, [IdProjeto]);

                        const valor = aggRow.val || null;
                        // Grava data calculada no campo do projeto
                        setProjeto.push(`\`${proj}\` = ?`);
                        paramsProjeto.push(valor);
                        // Grava NomeCompleto do usuário responsável
                        setProjeto.push(`\`${usu}\` = ?`);
                        paramsProjeto.push(valor ? usuario : null);
                    }

                    paramsProjeto.push(IdProjeto);
                    await req.tenantDbPool.execute(
                        `UPDATE projetos SET ${setProjeto.join(', ')} WHERE IdProjeto = ?`,
                        paramsProjeto
                    );
                }
                console.log(`[lote] 4 datas de ${setor} propagadas para ${tagProjRows.length} projeto(s). Resp: ${usuario}`);
            }
        } catch (propagErr) {
            console.error('[lote] Erro na propagação para projetos:', propagErr.message);
            // Não interrompe — dado principal (tags) já foi salvo com sucesso
        }
        // ─────────────────────────────────────────────────────────────────────

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

// Upload configurations for CNH
const storageCNH = multer.diskStorage({
    destination: function (req, file, cb) {
        const cnhDir = 'C:\\fotosfuncionarios';
        if (!fs.existsSync(cnhDir)) {
            fs.mkdirSync(cnhDir, { recursive: true });
        }
        cb(null, cnhDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'cnh-' + uniqueSuffix + ext)
    }
});
const uploadCNH = multer({ storage: storageCNH });


// POST upload isometrico
app.post('/api/visao-geral-engenharia/tags/:idTag/isometrico', uploadIso.single('isometricoPdf'), async (req, res) => {
    try {
        const file = req.file;
        const { idTag } = req.params;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
        }

        const queryPool = req.tenantDbPool || pool;
        const [rows] = await req.tenantDbPool.execute("SELECT Finalizado FROM tags WHERE IdTag = ?", [idTag]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag já Finalizado!' });

        const filePath = `/uploads/isometricos/${file.filename}`;

        await req.tenantDbPool.execute("UPDATE tags SET CaminhoIsometrico = ? WHERE IdTag = ?", [filePath, idTag]);

        res.json({ success: true, message: 'Desenho Isométrico associado com sucesso.', data: { CaminhoIsometrico: filePath } });
    } catch (error) {
        console.error('Error uploading isometrico:', error);
        res.status(500).json({ success: false, message: 'Erro ao associar desenho: ' + error.message });
    }
});

// DELETE limpar isometrico
app.delete('/api/visao-geral-engenharia/tags/:idTag/isometrico', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const queryPool = req.tenantDbPool || pool;
        
        const [rows] = await req.tenantDbPool.execute("SELECT Finalizado FROM tags WHERE IdTag = ?", [idTag]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Tag não encontrada.' });
        if (rows[0].Finalizado === 'C') return res.status(400).json({ success: false, message: 'Tag já Finalizado!' });

        const [tagRow] = await req.tenantDbPool.execute("SELECT CaminhoIsometrico FROM tags WHERE IdTag = ?", [idTag]);
        const caminho = tagRow[0].CaminhoIsometrico;

        if (caminho) {
            const absolutePath = path.join(__dirname, '../public', caminho);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await req.tenantDbPool.execute("UPDATE tags SET CaminhoIsometrico = NULL WHERE IdTag = ?", [idTag]);

        res.json({ success: true, message: 'Desenho Isométrico removido com sucesso.', data: { CaminhoIsometrico: null } });
    } catch (error) {
        console.error('Error clearing isometrico:', error);
        res.status(500).json({ success: false, message: 'Erro ao limpar desenho: ' + error.message });
    }
});


// GET RNCs for a project in production overview
app.get('/api/visao-geral/rncs/:projetoId', tenantMiddleware, async (req, res) => {
    try {
        const queryPool = req.tenantDbPool || pool;
        const [rows] = await req.tenantDbPool.execute(`
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
app.get('/api/todas-pendencias', tenantMiddleware, async (req, res) => {
    try {
        const { exibirFinalizadas } = req.query; // 'true' or 'false'
        
        // Regra de filtragem de status solicitada
        let statusFilter = "AND (Estatus IS NULL OR Estatus <> 'FINALIZADA')";
        if (exibirFinalizadas === 'true') {
            statusFilter = "AND Estatus = 'FINALIZADA'";
        }

        const [rows] = await req.tenantDbPool.execute(`
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
app.get('/api/visao-geral/pendencias/:projetoId', tenantMiddleware, async (req, res) => {
    try {
        const origem = req.query.origem || 'VISAOGERALPROJ';
        
        let tipoCadastro = 'RNC';
        let statusList = "'PENDENCIA', 'FINALIZADO'";
        if (origem === 'ACAOPCP') {
            tipoCadastro = 'TAREFA';
            statusList = "'TarefaAberta', 'TarefaFinalizada'";
        }

        const [rows] = await req.tenantDbPool.execute(`
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
app.post('/api/visao-geral/pendencias', tenantMiddleware, async (req, res) => {
    try {
        const data = req.body;
        const now = getCurrentDateTimeBR();

        let idRnc = data.idRnc;

        if (idRnc) {
            // UPDATE EXISITNG
            await req.tenantDbPool.execute(`
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
            
            const [result] = await req.tenantDbPool.execute(`
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
                await req.tenantDbPool.execute(`UPDATE projetos SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ?`, [data.idProjeto]);
                await req.tenantDbPool.execute(`UPDATE tags SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`, [data.idProjeto]);
                await req.tenantDbPool.execute(`UPDATE ordemservico SET qtdernc = COALESCE(qtdernc, 0) + 1, qtderncPendente = COALESCE(qtderncPendente, 0) + 1 WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`, [data.idProjeto]);
            }
        }

        res.json({ success: true, message: idRnc ? 'Pendàªncia salva com sucesso!' : 'Pendàªncia criada com sucesso!' });
    } catch (error) {
        console.error('Error saving visao-geral pendencia:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar: ' + error.message });
    }
});

// PUT /api/visao-geral/pendencias/:id/finalizar
app.put('/api/visao-geral/pendencias/:id/finalizar', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { usuarioFin, dataFin, setorFin, descFin, idProjeto } = req.body;
    
    // idProjeto não à© mais obrigatà³rio pois Tarefas podem ser genà©ricas (sem vinculo de projeto)
    if (!usuarioFin || !dataFin || !setorFin) {
        return res.status(400).json({ success: false, message: 'Faltam dados de finalizaà§ão' });
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
            // Provavelmente já veio formatada (ex: 19/03/2026) da funà§ão isoToBr do frontend
            dtFinFormatada = dataFin;
        }
    }

    try {
        await req.tenantDbPool.execute(`
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
        const [pendencyInfo] = await req.tenantDbPool.execute(`SELECT TipoCadastro, IdTag, IdOrdemServico FROM ordemservicoitempendencia WHERE IdOrdemServicoItemPendencia = ?`, [id]);
        
        if (idProjeto && pendencyInfo.length > 0 && pendencyInfo[0].TipoCadastro === 'RNC') {
            await req.tenantDbPool.execute(`UPDATE projetos SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdProjeto = ?`, [idProjeto]);
            
            // Get specific Tag and OS for this pendency to update them correctly
            const pendency = pendencyInfo;
            if (pendency.length > 0) {
                const { IdTag, IdOrdemServico } = pendency[0];
                if (IdTag) await req.tenantDbPool.execute(`UPDATE tags SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdTag = ?`, [IdTag]);
                if (IdOrdemServico) await req.tenantDbPool.execute(`UPDATE ordemservico SET qtderncPendente = GREATEST(COALESCE(qtderncPendente,0) - 1, 0), qtderncFinalizada = COALESCE(qtderncFinalizada,0) + 1 WHERE IdOrdemServico = ?`, [IdOrdemServico]);
            }
        }

        res.json({ success: true, message: 'Pendàªncia finalizada' });
    } catch (e) {
        console.error('Finalizar erro:', e);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

// PUT: Atualizar DataPrevisao do projeto (e opcionalmente das tags)
app.put('/api/visao-geral/projeto/:id/data-previsao', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { dataPrevisao, atualizarTags } = req.body;

        if (!dataPrevisao) {
            return res.status(400).json({ success: false, message: 'Data de previsão à© obrigatà³ria.' });
        }

        await pool.executeOnDefault(
            `UPDATE projetos SET DataPrevisao = ? WHERE IdProjeto = ?`,
            [dataPrevisao, id]
        );

        if (atualizarTags) {
            await pool.executeOnDefault(
                `UPDATE tags SET DataPrevisao = ? WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND (Finalizado IS NULL OR Finalizado != 'C')`,
                [dataPrevisao, id]
            );
        }

        res.json({ success: true, message: 'Data de previsão atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data: ' + error.message });
    }
});

// PUT: Atualizar DataPrevisao de uma Tag especà­fica
app.put('/api/visao-geral/tag/:idTag/data-previsao', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const { dataPrevisao } = req.body;

        if (!dataPrevisao) {
            return res.status(400).json({ success: false, message: 'Data de previsão à© obrigatà³ria.' });
        }

        await pool.executeOnDefault(
            `UPDATE tags SET DataPrevisao = ? WHERE IdTag = ? AND (Finalizado IS NULL OR Finalizado != 'C')`,
            [dataPrevisao, idTag]
        );

        res.json({ success: true, message: 'Data de previsão da tag atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag DataPrevisao:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data da tag: ' + error.message });
    }
});

// PUT: Atualizar data planejada em lote para todas as tags sem planejamento de um projeto
app.put('/api/visao-geral/projeto/:id/bulk-update-planning', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { updates } = req.body;
        
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: 'Updates invalidos.' });
        }

        const sectorFieldMap = {
            'Corte': { pi: 'PlanejadoInicioCorte', pf: 'PlanejadoFinalCorte' },
            'Dobra': { pi: 'PlanejadoInicioDobra', pf: 'PlanejadoFinalDobra' },
            'Solda': { pi: 'PlanejadoInicioSolda', pf: 'PlanejadoFinalSolda' },
            'Pintura': { pi: 'PlanejadoInicioPintura', pf: 'PlanejadoFinalPintura' },
            'Montagem': { pi: 'PlanejadoInicioMontagem', pf: 'PlanejadoFinalMontagem' }
        };

        for (const update of updates) {
            const { sectorKey, dataInicio, dataFim } = update;
            const fields = sectorFieldMap[sectorKey];
            if (!fields) continue;

            const valIni = dataInicio || '';
            const valFim = dataFim || '';

            const queryPool = req.tenantDbPool || pool;
            await req.tenantDbPool.execute(
                `UPDATE tags 
                 SET ${fields.pi} = CASE WHEN ? != '' THEN ? ELSE ${fields.pi} END,
                     ${fields.pf} = CASE WHEN ? != '' THEN ? ELSE ${fields.pf} END
                 WHERE IdProjeto = ? AND (Finalizado IS NULL OR Finalizado != 'C')`,
                [valIni, valIni, valFim, valFim, id]
            );
            await req.tenantDbPool.execute(
                `UPDATE ordemservico 
                 SET ${fields.pi} = CASE WHEN ? != '' THEN ? ELSE ${fields.pi} END,
                     ${fields.pf} = CASE WHEN ? != '' THEN ? ELSE ${fields.pf} END
                 WHERE IdProjeto = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')`,
                [valIni, valIni, valFim, valFim, id]
            );
            await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem 
                 SET ${fields.pi} = CASE WHEN ? != '' THEN ? ELSE ${fields.pi} END,
                     ${fields.pf} = CASE WHEN ? != '' THEN ? ELSE ${fields.pf} END
                 WHERE IdProjeto = ? AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')`,
                [valIni, valIni, valFim, valFim, id]
            );
        }

        res.json({ success: true, message: 'Planejamento em lote aplicado com sucesso!' });
    } catch (error) {
        console.error('Error in bulk-update-planning:', error);
        res.status(500).json({ success: false, message: 'Erro interno: ' + error.message });
    }
});

// PUT: Atualizar data planejada de um setor de uma Tag especà­fica
app.put('/api/visao-geral/tag/:idTag/setor-data', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const { field, value } = req.body;

        // Campos permitidos — todos os setores (VARCHAR e DATE)
        const allowedFields = [
            'PlanejadoInicioCorte',         'PlanejadoFinalCorte',
            'PlanejadoInicioDobra',         'PlanejadoFinalDobra',
            'PlanejadoInicioSolda',         'PlanejadoFinalSolda',
            'PlanejadoInicioPintura',       'PlanejadoFinalPintura',
            'PlanejadoInicioMontagem',      'PlanejadoFinalMontagem',
            'PlanejadoInicioCorteaLaser',   'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPUNSIONADEIRA', 'PlanejadoFinalPUNSIONADEIRA',
            'PlanejadoInicioGALVANIZAR',    'PlanejadoFinalGALVANIZAR',
        ];

        if (!allowedFields.includes(field)) {
            return res.status(400).json({ success: false, message: 'Campo inválido: ' + field });
        }

        // Determinar o setor a partir do nome do campo
        // Ex: PlanejadoInicioCorte → setor = 'Corte' → flag = 'txtCorte'
        const sectorFlagMap = {
                  "Corte": "txtCorte",
                  "Dobra": "txtDobra",
                  "Solda": "txtSolda",
                  "Pintura": "txtPintura",
                  "Montagem": "TxtMontagem",
                  "CorteaLaser": "txtCorteaLaser",
                  "PUNSIONADEIRA": "txtPUNSIONADEIRA", "GALVANIZAR": "txtGALVANIZAR", "Punsionadeira": "txtPUNSIONADEIRA", "Galvanizar": "txtGALVANIZAR"
        };
        const sectorName = Object.keys(sectorFlagMap).find(k => field.includes(k));
        const txtFlag = sectorName ? sectorFlagMap[sectorName] : null;

        // Para limpar o campo: value vazio → NULL
        let dbValue = value;
        if (!value || value.trim() === '') dbValue = null;

        const queryPool = req.tenantDbPool || pool;

        // 1. Atualizar a TAG
        await req.tenantDbPool.execute(
            `UPDATE tags SET ${field} = ? WHERE IdTag = ? AND (Finalizado IS NULL OR Finalizado != 'C')`,
            [dbValue, idTag]
        );

        res.json({ success: true, message: 'Data do setor atualizada com sucesso.' });
    } catch (error) {
        console.error('Error updating Tag sector date:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar data do setor: ' + error.message });
    }
});

// Propag// Propagar datas de planejamento e usuário da TAG → OS e OSItens respeitando txt{Recurso}='1'
app.post('/api/visao-geral/tag/:idTag/propagar-datas-os', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const { setores, usuario } = req.body;
        const userName = usuario || 'SuperAdmin';

        if (!setores || !setores.length) {
            return res.status(400).json({ success: false, message: 'Nenhum setor informado.' });
        }

        const sectorFlagMap = {
            "Corte": "txtCORTE",
            "Dobra": "txtDobra",
            "Solda": "txtSolda",
            "Pintura": "txtPintura",
            "Montagem": "TxtMontagem",
            "CorteaLaser": "txtCorteaLaser",
            "PUNSIONADEIRA": "txtPUNSIONADEIRA",
            "GALVANIZAR": "txtGALVANIZAR",
            "Laser": "txtCorteaLaser",
            "Punsionadeira": "txtPUNSIONADEIRA",
            "Galvanizar": "txtGALVANIZAR"
        };

        const queryPool = req.tenantDbPool || pool;

        // Fetch column lists for dynamic column checking
        const [colsTag] = await req.tenantDbPool.execute('SHOW COLUMNS FROM tags');
        const tagColNames = colsTag.map(c => c.Field);

        const [colsOS] = await req.tenantDbPool.execute('SHOW COLUMNS FROM ordemservico');
        const osColNames = colsOS.map(c => c.Field);

        const [colsOSI] = await req.tenantDbPool.execute('SHOW COLUMNS FROM ordemservicoitem');
        const osiColNames = colsOSI.map(c => c.Field);

        let totalUpdated = 0;

        for (const s of setores) {
            const { sectorName, piValue, pfValue } = s;
            const txtFlag = sectorFlagMap[sectorName];
            if (!txtFlag) continue;

            const nameKey = (sectorName === 'Laser' ? 'CorteaLaser' : sectorName === 'Punsionadeira' ? 'PUNSIONADEIRA' : sectorName === 'Galvanizar' ? 'GALVANIZAR' : sectorName);

            const piField = `PlanejadoInicio${nameKey}`;
            const pfField = `PlanejadoFinal${nameKey}`;
            const upiField = `UsuarioPlanejadoInicio${nameKey}`;
            const upfField = `UsuarioPlanejadoFinal${nameKey}`;

            const piDb = (piValue && piValue.trim() !== '') ? piValue : null;
            const pfDb = (pfValue && pfValue.trim() !== '') ? pfValue : null;

            // 1. Update TAG (incluindo txtFlag = '1')
            const tagSetClauses = [`${piField} = COALESCE(?, ${piField})`, `${pfField} = COALESCE(?, ${pfField})`];
            const tagParams = [piDb, pfDb];

            // Encontrar nome exato da coluna flag na tag (ex: txtCORTE vs txtCorte)
            const exactTagTxtFlag = tagColNames.find(c => c.toLowerCase() === txtFlag.toLowerCase());
            if (exactTagTxtFlag) {
                tagSetClauses.push(`${exactTagTxtFlag} = '1'`);
            }

            if (tagColNames.includes(upiField)) {
                tagSetClauses.push(`${upiField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upiField} END`);
                tagParams.push(piDb, userName);
            }
            if (tagColNames.includes(upfField)) {
                tagSetClauses.push(`${upfField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upfField} END`);
                tagParams.push(pfDb, userName);
            }

            await req.tenantDbPool.execute(
                `UPDATE tags SET ${tagSetClauses.join(', ')} WHERE IdTag = ? AND (Finalizado IS NULL OR Finalizado != 'C')`,
                [...tagParams, idTag]
            );

            // 2. Update ordemservico (incluindo txtFlag = '1')
            const osSetClauses = [`${piField} = COALESCE(?, ${piField})`, `${pfField} = COALESCE(?, ${pfField})`];
            const osParams = [piDb, pfDb];

            const exactOsTxtFlag = osColNames.find(c => c.toLowerCase() === txtFlag.toLowerCase());
            if (exactOsTxtFlag) {
                osSetClauses.push(`${exactOsTxtFlag} = '1'`);
            }

            if (osColNames.includes(upiField)) {
                osSetClauses.push(`${upiField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upiField} END`);
                osParams.push(piDb, userName);
            }
            if (osColNames.includes(upfField)) {
                osSetClauses.push(`${upfField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upfField} END`);
                osParams.push(pfDb, userName);
            }

            await req.tenantDbPool.execute(
                `UPDATE ordemservico SET ${osSetClauses.join(', ')} WHERE IdTag = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')`,
                [...osParams, idTag]
            );

            // 3. Update ordemservicoitem
            const osiSetClauses = [`osi.${piField} = COALESCE(?, osi.${piField})`, `osi.${pfField} = COALESCE(?, osi.${pfField})`];
            const osiParams = [piDb, pfDb];
            if (osiColNames.includes(upiField)) {
                osiSetClauses.push(`osi.${upiField} = CASE WHEN ? IS NOT NULL THEN ? ELSE osi.${upiField} END`);
                osiParams.push(piDb, userName);
            }
            if (osiColNames.includes(upfField)) {
                osiSetClauses.push(`osi.${upfField} = CASE WHEN ? IS NOT NULL THEN ? ELSE osi.${upfField} END`);
                osiParams.push(pfDb, userName);
            }

            const exactOsiTxtFlag = osiColNames.find(c => c.toLowerCase() === txtFlag.toLowerCase()) || txtFlag;

            const [result] = await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem osi
                 INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
                 SET ${osiSetClauses.join(', ')}
                 WHERE os.IdTag = ?
                   AND osi.${exactOsiTxtFlag} = '1'
                   AND (osi.OrdemServicoItemFinalizado IS NULL OR osi.OrdemServicoItemFinalizado != 'C')`,
                [...osiParams, idTag]
            );

            totalUpdated += result.affectedRows || 0;
        }

        res.json({ success: true, message: `Datas, flags e usuário (${userName}) gravados na Tag, OSs e ${totalUpdated} itens com sucesso!` });
    } catch (error) {
        console.error('Error in propagar-datas-os:', error);
        res.status(500).json({ success: false, message: 'Erro ao gravar planejamento: ' + error.message });
    }
});

// Propagar datas de planejamento e usuário de uma OS específica para seus itens
app.post('/api/visao-geral/os/:idOs/propagar-datas', tenantMiddleware, async (req, res) => {
    try {
        const { idOs } = req.params;
        const { setores, usuario } = req.body;
        const userName = usuario || 'SuperAdmin';

        if (!setores || !setores.length) {
            return res.status(400).json({ success: false, message: 'Nenhum setor informado.' });
        }

        const sectorFlagMap = {
            "Corte": "txtCORTE",
            "Dobra": "txtDobra",
            "Solda": "txtSolda",
            "Pintura": "txtPintura",
            "Montagem": "TxtMontagem",
            "CorteaLaser": "txtCorteaLaser",
            "PUNSIONADEIRA": "txtPUNSIONADEIRA",
            "GALVANIZAR": "txtGALVANIZAR",
            "Laser": "txtCorteaLaser",
            "Punsionadeira": "txtPUNSIONADEIRA",
            "Galvanizar": "txtGALVANIZAR"
        };

        const queryPool = req.tenantDbPool || pool;

        const [colsOS] = await req.tenantDbPool.execute('SHOW COLUMNS FROM ordemservico');
        const osColNames = colsOS.map(c => c.Field);

        const [colsOSI] = await req.tenantDbPool.execute('SHOW COLUMNS FROM ordemservicoitem');
        const osiColNames = colsOSI.map(c => c.Field);

        let totalUpdated = 0;

        for (const s of setores) {
            const { sectorName, piValue, pfValue } = s;
            const txtFlag = sectorFlagMap[sectorName];
            if (!txtFlag) continue;

            const nameKey = (sectorName === 'Laser' ? 'CorteaLaser' : sectorName === 'Punsionadeira' ? 'PUNSIONADEIRA' : sectorName === 'Galvanizar' ? 'GALVANIZAR' : sectorName);

            const piField = `PlanejadoInicio${nameKey}`;
            const pfField = `PlanejadoFinal${nameKey}`;
            const upiField = `UsuarioPlanejadoInicio${nameKey}`;
            const upfField = `UsuarioPlanejadoFinal${nameKey}`;

            const piDb = (piValue && piValue.trim() !== '') ? piValue : null;
            const pfDb = (pfValue && pfValue.trim() !== '') ? pfValue : null;

            // 1. Update ordemservico (incluindo txtFlag = '1')
            const osSetClauses = [`${piField} = COALESCE(?, ${piField})`, `${pfField} = COALESCE(?, ${pfField})`];
            const osParams = [piDb, pfDb];

            const exactOsTxtFlag = osColNames.find(c => c.toLowerCase() === txtFlag.toLowerCase());
            if (exactOsTxtFlag) {
                osSetClauses.push(`${exactOsTxtFlag} = '1'`);
            }

            if (osColNames.includes(upiField)) {
                osSetClauses.push(`${upiField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upiField} END`);
                osParams.push(piDb, userName);
            }
            if (osColNames.includes(upfField)) {
                osSetClauses.push(`${upfField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upfField} END`);
                osParams.push(pfDb, userName);
            }

            await req.tenantDbPool.execute(
                `UPDATE ordemservico SET ${osSetClauses.join(', ')} WHERE IdOrdemServico = ? AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')`,
                [...osParams, idOs]
            );

            // 2. Update ordemservicoitem
            const osiSetClauses = [`${piField} = COALESCE(?, ${piField})`, `${pfField} = COALESCE(?, ${pfField})`];
            const osiParams = [piDb, pfDb];
            if (osiColNames.includes(upiField)) {
                osiSetClauses.push(`${upiField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upiField} END`);
                osiParams.push(piDb, userName);
            }
            if (osiColNames.includes(upfField)) {
                osiSetClauses.push(`${upfField} = CASE WHEN ? IS NOT NULL THEN ? ELSE ${upfField} END`);
                osiParams.push(pfDb, userName);
            }

        const exactOsiTxtFlag = osiColNames.find(c => c.toLowerCase() === txtFlag.toLowerCase()) || txtFlag;

            const [result] = await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem SET ${osiSetClauses.join(', ')}
                 WHERE IdOrdemServico = ?
                   AND ${exactOsiTxtFlag} = '1'
                   AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')`,
                [...osiParams, idOs]
            );

            totalUpdated += result.affectedRows || 0;
        }

        res.json({ success: true, message: `Datas, flags e usuário (${userName}) gravados na OS e ${totalUpdated} itens com sucesso!` });
    } catch (error) {
        console.error('Error in OS propagar-datas:', error);
        res.status(500).json({ success: false, message: 'Erro ao gravar planejamento da OS: ' + error.message });
    }
});

app.post('/api/visao-geral/projeto/:id/finalizar', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userFinal = usuario || 'Sistema';

    try {
        const queryPool = req.tenantDbPool || pool;
        const [check] = await req.tenantDbPool.execute(
            `SELECT Finalizado FROM projetos WHERE IdProjeto = ?`,
            [id]
        );
        if (!check.length) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
        }
        if (check[0].Finalizado && check[0].Finalizado.trim() !== '') {
            return res.status(400).json({
                success: false,
                message: `Este projeto já está finalizado (status: "${check[0].Finalizado}"). Nenhuma alteraà§ão foi realizada.`
            });
        }

        const now = getCurrentDateTimeBR();

        // 2. Finalizar em transaà§ão
        // projetos: DataFinalizado
        await req.tenantDbPool.execute(
            `UPDATE projetos SET Finalizado='C', UsuarioFinalizado=?, DataFinalizado=? WHERE IdProjeto=?`,
            [userFinal, now, id]
        );
        // tags: DataFinalizado
        await req.tenantDbPool.execute(
            `UPDATE tags SET Finalizado='C', UsuarioFinalizado=?, DataFinalizado=? WHERE IdProjeto=? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E='')`,
            [userFinal, now, id]
        );
        // ordemservico: DataFinalizado e DataFinalizacao
        await req.tenantDbPool.execute(
            `UPDATE ordemservico SET OrdemServicoFinalizado='C', UsuarioFinalizado=?, DataFinalizado=?, DataFinalizacao=? WHERE IdProjeto=?`,
            [userFinal, now, now, id]
        );
        // ordemservicoitem: DataFinalizado
        await req.tenantDbPool.execute(
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

// GET: Pré-check — verifica se é possível cancelar a finalização do projeto
app.get('/api/visao-geral/projeto/:id/pode-cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [check] = await req.tenantDbPool.execute(
            `SELECT Finalizado, Projeto FROM projetos WHERE IdProjeto = ?`, [id]
        );
        if (!check.length) return res.status(404).json({ success: false, pode: false, message: 'Projeto não encontrado.' });
        if (!check[0].Finalizado || check[0].Finalizado.trim() === '') {
            return res.json({ success: false, pode: false, message: `O projeto não está finalizado.` });
        }
        // Verifica saldo via material_processo (fonte de verdade)
        const [mpRows] = await req.tenantDbPool.execute(
            `SELECT COUNT(mp.IdMaterialProcesso) as TotalMP,
                    SUM(COALESCE(mp.TotalExecutar, 0)) as SaldoMP,
                    COUNT(osi.IdOrdemServicoItem) as TotalItens
             FROM ordemservicoitem osi
             JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
             LEFT JOIN material_processo mp ON mp.IdOrdemServico = osi.IdOrdemServico
                 AND mp.codmatFabricante = osi.codmatFabricante
             WHERE os.IdProjeto = ?
               AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
               AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')`,
            [id]
        );
        const r = mpRows[0] || {};
        const totalItens = Number(r.TotalItens) || 0;
        const totalMP    = Number(r.TotalMP)    || 0;
        const saldoMP    = Number(r.SaldoMP)    || 0;

        if (totalItens === 0) {
            return res.json({ success: false, pode: false,
                message: `Projeto sem itens de OS — cancelamento não permitido.` });
        }
        if (totalMP > 0 && saldoMP === 0) {
            return res.json({ success: false, pode: false,
                message: `Não é possível cancelar a finalização do projeto "${check[0].Projeto}". ` +
                         `Todos os processos já foram concluídos (sem saldo pendente de produção).` });
        }
        return res.json({ success: true, pode: true,
            message: `Projeto "${check[0].Projeto}" possui saldo pendente. Cancelamento permitido.` });
    } catch (error) {
        console.error('[Pre-check cancelar-finalizacao]', error);
        return res.status(500).json({ success: false, pode: false, message: 'Erro ao verificar elegibilidade.' });
    }
});

// POST: Cancelar Finalização do Projeto (desfaz cascata em projetos/tags/OS/OSitens)
app.post('/api/visao-geral/projeto/:id/cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { usuario } = req.body;
    const userCancel = usuario || 'Sistema';

    try {
        // 1. Verificar se o projeto existe e está finalizado
        const [check] = await req.tenantDbPool.execute(
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

        // 2. VALIDAÇÃO: verificar se existem quantidades a executar via material_processo
        //    Fonte de verdade: mp.TotalExecutar > 0 significa que ainda há produção pendente.
        //    Os campos legados (CorteTotalExecutado etc.) NÃO são usados pois são calculados
        //    sobre todos os setores independente de o item ter ou não aquele processo.
        const [mpRows] = await req.tenantDbPool.execute(
            `SELECT
                COUNT(mp.IdMaterialProcesso)       as TotalMP,
                SUM(COALESCE(mp.TotalExecutar, 0)) as SaldoMP,
                COUNT(osi.IdOrdemServicoItem)       as TotalItens
             FROM ordemservicoitem osi
             JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico
             LEFT JOIN material_processo mp ON mp.IdOrdemServico = osi.IdOrdemServico
                 AND mp.codmatFabricante = osi.codmatFabricante
             WHERE os.IdProjeto = ?
               AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
               AND (os.D_E_L_E_T_E  IS NULL OR os.D_E_L_E_T_E  = '' OR os.D_E_L_E_T_E  != '*')`,
            [id]
        );

        const mpR = mpRows[0] || {};
        const totalItens = Number(mpR.TotalItens) || 0;
        const totalMP    = Number(mpR.TotalMP)    || 0;
        const saldoMP    = Number(mpR.SaldoMP)    || 0;

        // Projeto sem itens — não faz sentido cancelar
        if (totalItens === 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível cancelar a finalização: o projeto "${check[0].Projeto}" não possui itens de OS.`
            });
        }

        // Se há registros em material_processo, a fonte de verdade é TotalExecutar
        if (totalMP > 0 && saldoMP === 0) {
            return res.status(400).json({
                success: false,
                message: `Não é possível cancelar a finalização do projeto "${check[0].Projeto}". ` +
                         `Todos os processos já foram concluídos (TotalExecutar = 0 em todos os registros). ` +
                         `O cancelamento só é permitido quando há saldo pendente de produção.`
            });
        }

        // 3. Desfazer finalização em cascata
        await req.tenantDbPool.execute(
            `UPDATE projetos SET Finalizado='', UsuarioFinalizado='', DataFinalizado='' WHERE IdProjeto=?`,
            [id]
        );
        await req.tenantDbPool.execute(
            `UPDATE tags SET Finalizado='', UsuarioFinalizado='', DataFinalizado='' WHERE IdProjeto=? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E='')`,
            [id]
        );
        await req.tenantDbPool.execute(
            `UPDATE ordemservico SET OrdemServicoFinalizado='', UsuarioFinalizado='', DataFinalizacao='' WHERE IdProjeto=?`,
            [id]
        );
        await req.tenantDbPool.execute(
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

app.post('/api/projeto/:id/open-folder', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT EnderecoProjeto FROM projetos WHERE IdProjeto = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
        }

        const endereco = rows[0].EnderecoProjeto;

        if (!endereco) {
            return res.status(400).json({ success: false, message: 'Projeto não possui um endereà§o de pasta configurado.' });
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

// PRE-CHECK STATUS LIBERACAO PROJETO
app.get('/api/projeto/:id/status-liberacao', tenantMiddleware, async (req, res) => {
    try {
        const projectId = req.params.id;

        const [tagRows] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) as count FROM tags WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`,
            [projectId]
        );
        const tagCount = Number(tagRows[0]?.count || 0);

        if (tagCount === 0) {
            return res.json({
                success: false,
                liberavel: false,
                message: 'Não ? possível liberar este projeto. O projeto deve possuir pelo menos uma Tag e a Tag deve possuir pelo menos uma Ordem de Serviço (OS).'
            });
        }

        const [osRows] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) as count FROM ordemservico os
             INNER JOIN tags t ON t.IdTag = os.IdTag
             WHERE t.IdProjeto = ? 
               AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E <> '*') 
               AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E <> '*')`,
            [projectId]
        );
        const osCount = Number(osRows[0]?.count || 0);

        if (osCount === 0) {
            return res.json({
                success: false,
                liberavel: false,
                message: 'Não ? possível liberar este projeto. O projeto deve possuir pelo menos uma Tag e a Tag deve possuir pelo menos uma Ordem de Serviço (OS).'
            });
        }

        return res.json({
            success: true,
            liberavel: true,
            message: 'Projeto elegível para liberação.'
        });
    } catch (error) {
        console.error('Error pre-checking project release:', error);
        return res.status(500).json({ success: false, liberavel: false, message: 'Erro ao verificar elegibilidade do projeto.' });
    }
});

// LIBERAR PROJETO
app.post('/api/projeto/:id/liberar', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const projectId = req.params.id;
        const now = getCurrentDateTimeBR();
        const dbPool = req.tenantDbPool || pool;

        const [rows] = await dbPool.execute('SELECT liberado, Projeto FROM projetos WHERE IdProjeto = ?', [projectId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado.' });
        }
        if (rows[0].liberado && String(rows[0].liberado).trim().toUpperCase() === 'S') {
            return res.status(400).json({ success: false, message: `O projeto "${rows[0].Projeto}" já está liberado.` });
        }

        // 1. Validação: O projeto deve possuir pelo menos uma Tag
        const [tagRows] = await dbPool.execute(
            `SELECT COUNT(*) as count FROM tags WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')`,
            [projectId]
        );
        const tagCount = Number(tagRows[0]?.count || 0);

        if (tagCount === 0) {
            return res.json({
                success: false,
                message: 'Não é possível liberar este projeto. O projeto deve possuir pelo menos uma Tag e a Tag deve possuir pelo menos uma Ordem de Serviço (OS).'
            });
        }

        // 2. Validação: Pelo menos uma Tag do projeto deve possuir pelo menos uma Ordem de Serviço (OS)
        const [osRows] = await dbPool.execute(
            `SELECT COUNT(*) as count FROM ordemservico os
             INNER JOIN tags t ON t.IdTag = os.IdTag
             WHERE t.IdProjeto = ? 
               AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E <> '*') 
               AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E <> '*')`,
            [projectId]
        );
        const osCount = Number(osRows[0]?.count || 0);

        if (osCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível liberar este projeto. O projeto deve possuir pelo menos uma Tag e a Tag deve possuir pelo menos uma Ordem de Serviço (OS).'
            });
        }

        // Liberar: atualiza Liberado = 'S', DataLiberacao e UsuarioCriacao (NomeCompleto do usuário logado)
        const nomeUsuario = req.user?.NomeCompleto || req.user?.nome || usuario || 'Sistema';
        await dbPool.execute(
            `UPDATE projetos SET 
                liberado = 'S', 
                DataLiberacao = ?,
                StatusProj = 'AT',
                DescStatus = 'Ativo',
                CriadoPor = COALESCE(CriadoPor, ?)
            WHERE IdProjeto = ?`,
            [now, nomeUsuario, projectId]
        );

        console.log(`[Projeto] Projeto ${projectId} liberado (Liberado='S') por ${nomeUsuario} em ${now}`);
        res.json({ success: true, message: 'Projeto liberado com sucesso.' });
    } catch (error) {
        console.error('Error liberating project:', error);
        res.status(500).json({ success: false, message: 'Erro ao liberar o projeto.' });
    }
});

app.patch('/api/projeto/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, confirmar, usuario } = req.body;

        if (!['PA', 'CA', 'AT'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status invalido. Use AT, PA ou CA.' });
        }

        const [apontRows] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) as count FROM ordemservicoitemcontrole c
             INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = c.IdOrdemServicoItem
             INNER JOIN ordemservico os ON os.IdOrdemServico = oi.IdOrdemServico
             WHERE os.IdProjeto = ?
               AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E <> '*')`, [id]
        );
        const qtdApontamentos = Number(apontRows[0].count);

        if (qtdApontamentos > 0 && !confirmar && status !== 'AT') {
            return res.status(200).json({
                success: false,
                requiresConfirmation: true,
                qtdApontamentos,
                message: 'ATENCAO: Este projeto possui ' + qtdApontamentos + ' apontamento(s) de producao registrado(s). Ao ' + (status === 'CA' ? 'cancelar' : 'parar') + ' o projeto, toda a cadeia abaixo (Tags, Ordens de Servico) tambem sera atualizada. Esta acao ficara registrada com seu nome. Deseja realmente prosseguir?'
            });
        }

        if (qtdApontamentos > 0 && confirmar && (!usuario || usuario.trim() === '')) {
            return res.status(400).json({ success: false, message: 'E obrigatorio informar o nome do usuario responsavel pela autorizacao.' });
        }

        const now = getCurrentDateTimeBR();
        const nomeUsuario = (usuario || 'Sistema').trim();
        const descStatus = status === 'CA' ? 'Cancelado' : status === 'PA' ? 'Parado' : 'Ativo';
        const descStatusFinal = (status !== 'AT' && qtdApontamentos > 0)
            ? (descStatus + ' | ' + nomeUsuario + ' | ' + now)
            : descStatus;

        if (status === 'AT') {
            await req.tenantDbPool.execute(
                `UPDATE projetos SET StatusProj = 'AT', DescStatus = 'Ativo', liberado = 'S', DataLiberacao = ? WHERE IdProjeto = ?`,
                [now, id]
            );
        } else {
            await req.tenantDbPool.execute(
                `UPDATE projetos SET StatusProj = ?, DescStatus = ? WHERE IdProjeto = ?`,
                [status, descStatusFinal, id]
            );
        }

        // ─── Cascata: Tags ───────────────────────────────────────────────────
        // StatusTag: 1=Ativo, 2=Cancelado, 3=Parado
        const tagStatus     = status === 'CA' ? 2 : status === 'PA' ? 3 : 1;
        const tagDescStatus = descStatus; // 'Cancelado' | 'Parado' | 'Ativo'

        // ─── Cascata: Ordens de Serviço ───────────────────────────────────────
        // Estatus ? varchar(45) — mapear para valores legíveis
        const osEstatusMap = { CA: 'Cancelado', PA: 'Parado', AT: 'Ativo' };
        const osEstatus = osEstatusMap[status] ?? 'Ativo';

        await Promise.all([
            // Atualiza Tags
            req.tenantDbPool.execute(
                `UPDATE tags
                 SET StatusTag = ?, DescStatus = ?
                 WHERE IdProjeto = ?
                   AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [tagStatus, tagDescStatus, id]
            ),
            // Atualiza Ordens de Serviço (campo correto: Estatus)
            req.tenantDbPool.execute(
                `UPDATE ordemservico
                 SET Estatus = ?
                 WHERE IdProjeto = ?
                   AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')`,
                [osEstatus, id]
            ),
        ]);

        const [[tagsAtualizadas]] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) AS cnt FROM tags WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`, [id]
        );
        const [[osAtualizadas]] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) AS cnt FROM ordemservico WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')`, [id]
        );

        console.log(`[API /projeto/${id}/status] ${status} → Tags: ${tagsAtualizadas.cnt} | OS: ${osAtualizadas.cnt}`);

        res.json({
            success: true,
            message: `Projeto ${descStatus.toLowerCase()} com sucesso. Cadeia atualizada: ${tagsAtualizadas.cnt} Tag(s) e ${osAtualizadas.cnt} Ordem(ns) de Serviço.`
                + (qtdApontamentos > 0 ? ` Autorizado por: ${nomeUsuario}.` : '')
        });
    } catch (error) {
        console.error('Error updating project status:', error);
        res.status(500).json({ success: false, message: 'Erro ao alterar status: ' + error.message });
    }
});



app.post('/api/projeto/:id/cancelar-liberacao', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Verificar se existem apontamentos de produção vinculados ao projeto
        const [apontRows] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) as count FROM ordemservicoitemcontrole c
             INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = c.IdOrdemServicoItem
             INNER JOIN ordemservico os ON os.IdOrdemServico = oi.IdOrdemServico
             WHERE os.IdProjeto = ?
               AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E <> '*')`,
            [id]
        );
        if (apontRows[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Não ? possível cancelar a liberação: este projeto já possui ${apontRows[0].count} apontamento(s) de produção registrado(s).` 
            });
        }

        // 2. Verificar se existem Ordens de Serviço vinculadas
        const [osRows] = await req.tenantDbPool.execute('SELECT COUNT(*) as count FROM ordemservico WHERE IdProjeto = ?', [id]);
        if (osRows[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Não ? possível cancelar a liberação: existem ${osRows[0].count} Ordens de Serviço vinculadas a este projeto.` 
            });
        }

        // 3. Reverter status do projeto
        await req.tenantDbPool.execute(
            `UPDATE projetos SET 
                liberado = '', 
                DataLiberacao = NULL 
            WHERE IdProjeto = ?`,
            [id]
        );

        res.json({ success: true, message: 'Liberação do projeto cancelada com sucesso.' });
    } catch (error) {
        console.error('Error canceling project liberation:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao cancelar liberação.' });
    }
});

// --- CRUD: Tags (associadas a Projetos) ---

// LIST by Project ID
app.get('/api/projeto/:projetoId/tags', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
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
app.get('/api/tag/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM tags WHERE IdTag = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Tag não encontrada' });
        }
    } catch (error) {
        console.error('Error fetching tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tag' });
    }
});

// CREATE Tag
app.post('/api/tag', tenantMiddleware, async (req, res) => {
    const data = req.body;

    if (!data.Tag || !data.IdProjeto) {
        return res.status(400).json({ success: false, message: 'Tag e Projeto são obrigatórios' });
    }

    try {
        const [result] = await req.tenantDbPool.execute(
            `INSERT INTO tags (
                Tag, DescTag, IdProjeto, Projeto, DataPrevisao,
                TipoProduto, UnidadeProduto, QtdeTag, QtdeLiberada, 
                SaldoTag, ValorTag, StatusTag, DescStatus, CriadoPor, DataEntrada
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                data.CriadoPor || 'Sistema',
                data.DataEntrada || new Date().toLocaleDateString('pt-BR')
            ]
        );

        // Recalcula QtdeTags no projeto após inserir a nova tag
        await req.tenantDbPool.execute(
            `UPDATE projetos
             SET QtdeTags = (
                 SELECT COUNT(*) FROM tags
                 WHERE IdProjeto = ?
                   AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
             )
             WHERE IdProjeto = ?`,
            [data.IdProjeto, data.IdProjeto]
        );
        console.log(`[TAG] QtdeTags recalculado para Projeto ${data.IdProjeto} após inserção de nova tag.`);

        res.json({ success: true, message: 'Tag cadastrada com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE Tag
app.put('/api/tag/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Tag) {
        return res.status(400).json({ success: false, message: 'Tag ? obrigatória' });
    }

    try {
        await req.tenantDbPool.execute(
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

// PATCH: Atualizar DataEntrada e CriadoPor nas tags existentes com NULL
app.patch('/api/tags/backfill-entrada', tenantMiddleware, async (req, res) => {
    try {
        const hoje = new Date().toLocaleDateString('pt-BR');
        // Preenche DataEntrada com a data de previsão do projeto (ou hoje como fallback)
        // e CriadoPor com 'Sistema' onde está NULL
        const [r1] = await req.tenantDbPool.execute(`
            UPDATE tags t
            LEFT JOIN projetos p ON p.IdProjeto = t.IdProjeto
            SET t.DataEntrada = COALESCE(
                p.DataEntradaPedido,
                DATE_FORMAT(t.DataPrevisao, '%d/%m/%Y'),
                ?
            )
            WHERE (t.DataEntrada IS NULL OR TRIM(t.DataEntrada) = '')
              AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
        `, [hoje]);

        const [r2] = await req.tenantDbPool.execute(`
            UPDATE tags SET CriadoPor = 'Sistema'
            WHERE (CriadoPor IS NULL OR TRIM(CriadoPor) = '')
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `);

        res.json({
            success: true,
            message: `DataEntrada preenchida em ${r1.affectedRows} tag(s). CriadoPor atualizado em ${r2.affectedRows} tag(s).`
        });
    } catch (error) {
        console.error('Error backfilling tags:', error);
        res.status(500).json({ success: false, message: 'Erro: ' + error.message });
    }
});

// DELETE Tag (Soft Delete)
app.delete('/api/tag/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        // Descobre o IdProjeto antes de deletar (para recalcular QtdeTags)
        const [[tagRow]] = await req.tenantDbPool.execute(
            'SELECT IdProjeto FROM tags WHERE IdTag = ?',
            [req.params.id]
        );

        await req.tenantDbPool.execute(
            "UPDATE tags SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdTag = ?",
            [now, usuario || 'Sistema', req.params.id]
        );

        // Recalcula QtdeTags no projeto após a exclusão
        if (tagRow?.IdProjeto) {
            await req.tenantDbPool.execute(
                `UPDATE projetos
                 SET QtdeTags = (
                     SELECT COUNT(*) FROM tags
                     WHERE IdProjeto = ?
                       AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                 )
                 WHERE IdProjeto = ?`,
                [tagRow.IdProjeto, tagRow.IdProjeto]
            );
            console.log(`[TAG] QtdeTags recalculado para Projeto ${tagRow.IdProjeto} após exclusão de tag ${req.params.id}.`);
        }

        res.json({ success: true, message: 'Tag excluída' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- CRUD: TipoProduto ---

// OPTIONS for dropdown
app.get('/api/tipoproduto/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdTipoProduto as id, TipoProduto as label FROM tipoproduto WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' ORDER BY TipoProduto"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tipoproduto options:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar op??es' });
    }
});

// LIST
app.get('/api/tipoproduto', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
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
app.get('/api/tipoproduto/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT * FROM tipoproduto WHERE IdTipoProduto = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar' });
    }
});

// CREATE
app.post('/api/tipoproduto', tenantMiddleware, async (req, res) => {
    const { TipoProduto, Unidade, Descricao } = req.body;

    if (!TipoProduto) {
        return res.status(400).json({ success: false, message: 'Tipo Produto ? obrigatório' });
    }

    try {
        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            'INSERT INTO tipoproduto (TipoProduto, Unidade, Descricao, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?)',
            [TipoProduto.trim(), Unidade || null, Descricao || null, now, getCtxNomeCompleto()]
        );
        res.json({ success: true, message: 'Tipo cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

// UPDATE
app.put('/api/tipoproduto/:id', tenantMiddleware, async (req, res) => {
    const { TipoProduto, Unidade, Descricao } = req.body;

    if (!TipoProduto) {
        return res.status(400).json({ success: false, message: 'Tipo Produto ? obrigatório' });
    }

    try {
        await req.tenantDbPool.execute(
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
app.delete('/api/tipoproduto/:id', tenantMiddleware, async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();

        await req.tenantDbPool.execute(
            "UPDATE tipoproduto SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdTipoProduto = ?",
            [now, usuario || 'Sistema', req.params.id]
        );
        res.json({ success: true, message: 'Tipo excluído' });
    } catch (error) {
        console.error('Error deleting tipoproduto:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// --- Rota para servir PDFs de caminhos locais ---
// Esta rota permite abrir PDFs que est?o em pastas do sistema de arquivos
app.get('/api/pdf', tenantMiddleware, async (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Caminho do arquivo não informado' });
    }

    try {
        // Normaliza o caminho (trata barras e formato)
        let normalizedPath = filePath.replace(/\\/g, '/');

        // Remove prefixo file:/// se existir
        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extens?o para .pdf se necess?rio
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            normalizedPath = normalizedPath.split(ext).join('.pdf');
        });

        // Verifica se o arquivo existe
        if (!fs.existsSync(normalizedPath)) {
            console.error('Arquivo não encontrado:', normalizedPath);
            return res.status(404).json({ success: false, message: 'Arquivo não encontrado: ' + normalizedPath });
        }

        // Verifica se ? realmente um PDF
        if (!normalizedPath.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ success: false, message: 'Apenas arquivos PDF s?o permitidos' });
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
app.get('/api/download', tenantMiddleware, async (req, res) => {
    const filePath = req.query.path;
    const type = req.query.type; // 'dxf' or 'sldprt'

    if (!filePath || !type) {
        return res.status(400).json({ success: false, message: 'Caminho do arquivo ou tipo não informado' });
    }

    try {
        let normalizedPath = filePath.replace(/\\/g, '/');

        if (normalizedPath.startsWith('file:///')) {
            normalizedPath = normalizedPath.substring(8);
        }

        // Troca extens?o para o tipo solicitado
        const targetExt = type.toLowerCase() === 'sldprt' ? '.SLDPRT' : '.DXF';
        const extensoes = [".SLDPRT", ".SLDASM", ".sldprt", ".sldasm", ".asm", ".ASM", ".psm", ".PSM", ".par", ".PAR"];
        extensoes.forEach(ext => {
            normalizedPath = normalizedPath.split(ext).join(targetExt);
        });

        if (!fs.existsSync(normalizedPath)) {
            // Tenta com extensão em minúscula como fallback
            const lowerExt = targetExt.toLowerCase();
            const altPath = normalizedPath.replace(/\.[^.]+$/, lowerExt);

            if (fs.existsSync(altPath)) {
                normalizedPath = altPath;
            } else {
                console.error('Arquivo para download não encontrado:', normalizedPath);
                return res.status(404).json({ success: false, message: 'Arquivo não encontrado: ' + normalizedPath });
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

// --- Ordens de Serviço (Somente Leitura) ---

// OPTIONS: Lista de Projetos únicos para dropdown
app.get('/api/ordemservico/projetos', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
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

// OPTIONS: Lista de Tags únicas para dropdown
app.get('/api/ordemservico/tags', tenantMiddleware, async (req, res) => {
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
        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar tags' });
    }
});

// OPTIONS: Lista de Projetos para Clonagem
app.get('/api/ordemservico/projetos-clonagem', tenantMiddleware, async (req, res) => {
    try {
        // Exibe projetos ativos (não deletados e não finalizados)
        // Projetos liberados pela engenharia (liberado='S') TAMBÉM aparecem — apenas finalizados são excluídos
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdProjeto as value, Projeto as label FROM projetos WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND (Finalizado IS NULL OR Finalizado <> 'C') ORDER BY Projeto"
        );
        console.log(`[ProjetosClonagem] Tenant: ${req.tenantId || 'default'} | Projetos disponíveis: ${rows.length}`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[ProjetosClonagem] Erro:', error.message);
        res.status(500).json({ success: false });
    }
});

// OPTIONS: Lista de Tags para Clonagem
app.get('/api/ordemservico/tags-clonagem', tenantMiddleware, async (req, res) => {
    try {
        const projetoId = req.query.projetoId;
        if (!projetoId) return res.json({ success: true, data: [] });
        const [rows] = await req.tenantDbPool.execute("SELECT IdTag as value, Tag as label FROM tags WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND IdProjeto = ? ORDER BY Tag", [projetoId]);
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

// SEARCH: Busca global em itens por código do documento/desenho
app.get('/api/ordemservico/busca-item', tenantMiddleware, async (req, res) => {
    try {
        const search = req.query.q;
        if (!search || search.length < 2) {
            return res.json({ success: true, data: [] });
        }
        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                osi.IdOrdemServicoItem, osi.IdOrdemServico, osi.CodMatFabricante, 
                osi.DescResumo, osi.QtdeTotal, osi.Peso, osi.EnderecoArquivo,
                os.Projeto, os.Tag, os.DescTag
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            WHERE (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
              AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
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

// CREATE Ordem de Serviço
app.post('/api/ordemservico', tenantMiddleware, async (req, res) => {
    const data = req.body;
    if (!data.IdProjeto || !data.IdTag) {
        return res.status(400).json({ success: false, message: 'Projeto e Tag são obrigatórios' });
    }
    try {
        const now = getCurrentDateTimeBR();
        
        const [result] = await req.tenantDbPool.execute(
            `INSERT INTO ordemservico (
                Projeto, Tag, DescTag, Descricao, IdEmpresa, IdProjeto, IdTag, DescEmpresa,
                EnderecoOrdemServico, CriadoPor, DataCriacao, Estatus, DataPrevisao,
                ProdutoPadrao, CodDesenhoProduto, DescricaoProduto, ProdutoCriadoPor, DataCriacaoProduto,
                Fator, TipoLiberacaoOrdemServico, IdMatriz
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.Projeto || '',
                data.Tag || '',
                data.DescTag || '',
                data.Descricao || '',
                data.IdEmpresa || 0,
                data.IdProjeto || 0,
                data.IdTag || 0,
                data.DescEmpresa || '',
                '',  // endereço real definido abaixo após obter o ID
                data.CriadoPor || 'Sistema',
                data.DataCriacao || now,
                data.Estatus || 'A',
                data.DataPrevisao || null,
                data.ProdutoPadrao || '',
                data.CodDesenhoProduto || '',
                data.DescricaoProduto || '',
                data.ProdutoCriadoPor || '',
                data.DataCriacaoProduto || null,
                data.Fator || 1,
                data.TipoLiberacaoOrdemServico || 'Total',
                data.IdMatriz || 0
            ]
        );
        const novoId = result.insertId;

        // Busca o endereço base da OS na configuração do sistema (ignora valor do frontend)
        let enderecoBase = '';
        try {
            const [cfgRows] = await req.tenantDbPool.execute(
                "SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoPastaRaizOS' LIMIT 1"
            );
            if (cfgRows.length > 0 && cfgRows[0].valor) {
                enderecoBase = cfgRows[0].valor.trim();
            }
        } catch (cfgErr) {
            console.warn('[CriarOS] Não foi possível buscar EnderecoPastaRaizOS:', cfgErr.message);
        }

        if (enderecoBase) {
            const format5 = (num) => String(num).padStart(5, '0');
            if (enderecoBase.endsWith('\\') || enderecoBase.endsWith('/')) {
                enderecoBase = enderecoBase.slice(0, -1);
            }
            const nomePastaOs = `OS_${format5(novoId)}`;
            const novoEndereco = `${enderecoBase}\\${nomePastaOs}`;
            
            // Atualiza o banco com o caminho correto da pasta da OS
            await req.tenantDbPool.execute(
                'UPDATE ordemservico SET EnderecoOrdemServico = ? WHERE IdOrdemServico = ?',
                [novoEndereco, novoId]
            );

            // Cria fisicamente a pasta e subpastas
            try {
                const fsp = require('fs/promises');
                const p = require('path');
                await fsp.mkdir(novoEndereco, { recursive: true });
                const subdirs = ['DXF', 'PDF', 'DFT', 'PUNC', 'LASER', 'Projeto', 'PEÇAS DE ESTOQUE', 'LXDS'];
                for (const sd of subdirs) {
                    await fsp.mkdir(p.join(novoEndereco, sd), { recursive: true }).catch(() => {});
                }
            } catch (fsErr) {
                console.error('[CriarOS] Falha ao criar pastas:', fsErr.message);
            }
        } else {
            console.warn('[CriarOS] EnderecoPastaRaizOS não configurado — pasta não criada para OS', novoId);
        }

        res.json({ success: true, message: 'OS cadastrada', id: novoId });

    } catch (error) {
        console.error('Error creating ordemservico:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar OS: ' + error.message });
    }
});

// LIST Ordens de Serviço com paginação e filtros
app.get('/api/ordemservico', tenantMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const projeto = req.query.projeto;
        const tag = req.query.tag;
        const search = req.query.search;
        const filtroFinalizado = req.query.filtroFinalizado || 'NAO_FINALIZADAS';
        const filtroLiberado = req.query.filtroLiberado || 'LIBERADAS';
        const { 
            dataCriacaoInicio, dataCriacaoFim,
            dataPrevisaoInicio, dataPrevisaoFim,
            dataLiberacaoInicio, dataLiberacaoFim
        } = req.query;

        // Construir WHERE dinÃ¢mico
        let whereClause = "(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')";
        const params = [];

        if (filtroFinalizado === 'FINALIZADAS') {
            whereClause += " AND OrdemServicoFinalizado = 'C'";
        } else if (filtroFinalizado === 'NAO_FINALIZADAS') {
            whereClause += " AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')";
        }

        if (filtroLiberado === 'LIBERADAS') {
            whereClause += " AND Liberado_Engenharia = 'S'";
        } else if (filtroLiberado === 'NAO_LIBERADAS') {
            whereClause += " AND (Liberado_Engenharia IS NULL OR Liberado_Engenharia != 'S')";
        }

        if (projeto) {
            // Se for puramente numérico, filtra por IdProjeto (mais preciso)
            // Caso contrário, filtra pelo nome do projeto (LIKE)
            if (/^\d+$/.test(projeto.trim())) {
                whereClause += " AND IdProjeto = ?";
                params.push(parseInt(projeto.trim()));
            } else {
                whereClause += " AND Projeto LIKE ?";
                params.push(`%${projeto.trim()}%`);
            }
        }
        if (tag) {
            whereClause += " AND Tag LIKE ?";
            params.push(`%${tag}%`);
        }
        if (search) {
            whereClause += " AND (CAST(IdOrdemServico AS CHAR) LIKE ? OR Tag LIKE ? OR DescTag LIKE ? OR Projeto LIKE ? OR Descricao LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Adicionar filtros de data independentes
        const addDateFilter = (field, start, end) => {
            if (start && end) {
                whereClause += ` AND (
                    COALESCE(
                        STR_TO_DATE(LEFT(${field}, 10), '%d/%m/%Y'),
                        STR_TO_DATE(LEFT(${field}, 10), '%Y-%m-%d')
                    ) BETWEEN ? AND ?
                )`;
                params.push(start, end);
            }
        };

        addDateFilter('DataCriacao', dataCriacaoInicio, dataCriacaoFim);
        addDateFilter('DataPrevisao', dataPrevisaoInicio, dataPrevisaoFim);
        addDateFilter('Data_Liberacao_Engenharia', dataLiberacaoInicio, dataLiberacaoFim);

        // Count total
        const [countResult] = await req.tenantDbPool.execute(
            `SELECT COUNT(*) as total FROM ordemservico WHERE ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Query com paginação e calculo dinÃ¢mico de itens e percentuais
        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                os.IdOrdemServico, os.Projeto, os.Tag, os.DescTag, os.Descricao,
                os.Estatus, os.DataPrevisao, os.DataCriacao, os.CriadoPor,
                os.Liberado_Engenharia, os.Data_Liberacao_Engenharia,
                os.IdOrdemServico, os.Projeto, os.Tag, os.DescTag, os.Descricao,
                os.Estatus, os.DataPrevisao, os.DataCriacao, os.CriadoPor,
                os.Liberado_Engenharia, os.Data_Liberacao_Engenharia,
                os.QtdeTotalItens, os.QtdeItensExecutados, os.PercentualItens,
                os.QtdeTotalPecas, os.QtdePecasExecutadas, os.PercentualPecas,
                os.PesoTotal, os.AreaPinturaTotal,
                os.OrdemServicoFinalizado, os.DataFinalizado,
                os.IdProjeto, os.IdTag, os.DescEmpresa,
                os.PlanejadoInicioCorte, os.PlanejadoFinalCorte, os.RealizadoInicioCorte, os.RealizadoFinalCorte,
                os.PlanejadoInicioDobra, os.PlanejadoFinalDobra, os.RealizadoInicioDobra, os.RealizadoFinalDobra,
                os.PlanejadoInicioSolda, os.PlanejadoFinalSolda, os.RealizadoInicioSolda, os.RealizadoFinalSolda,
                os.PlanejadoInicioPintura, os.PlanejadoFinalPintura, os.RealizadoInicioPintura, os.RealizadoFinalPintura,
                os.PlanejadoInicioMontagem, os.PlanejadoFinalMontagem, os.RealizadoInicioMontagem, os.RealizadoFinalMontagem,
                os.PlanejadoInicioENGENHARIA, os.PlanejadoFinalENGENHARIA, os.RealizadoInicioENGENHARIA, os.RealizadoFinalENGENHARIA,
                os.PlanejadoInicioACABAMENTO, os.PlanejadoFinalACABAMENTO, os.RealizadoInicioACABAMENTO, os.RealizadoFinalACABAMENTO,
                os.PlanejadoInicioPUNSIONADEIRA, os.PlanejadoFinalPUNSIONADEIRA, os.RealizadoInicioPUNSIONADEIRA, os.RealizadoFinalPUNSIONADEIRA,
                os.PlanejadoInicioGALVANIZAR, os.PlanejadoFinalGALVANIZAR, os.RealizadoInicioGALVANIZAR, os.RealizadoFinalGALVANIZAR,
                os.PlanejadoInicioCorteaLaser, os.PlanejadoFinalCorteaLaser, os.RealizadoInicioCorteaLaser, os.RealizadoFinalCorteaLaser,
                os.EnderecoOrdemServico, os.NumeroOPOmie, os.Fator
            FROM ordemservico os
            WHERE ${whereClause}
            ORDER BY os.IdOrdemServico DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // --- CONTEXT-SAFE SEQUENTIAL STRATEGY (Final Reliability Fix) ---
        if (rows.length > 0) {
            for (const os of rows) {
                try {
                    // Sequential loop ensures AsyncLocalStorage context is preserved for each tenant query
                    const [stats] = await req.tenantDbPool.execute(`
                        SELECT 
                            COUNT(*) as itTotal,
                            COUNT(CASE WHEN OrdemServicoItemFinalizado = 'C' THEN 1 END) as itExec,
                            COALESCE(SUM(QtdeTotal), 0) as pTotal,
                            COALESCE(SUM(CASE WHEN OrdemServicoItemFinalizado = 'C' THEN QtdeTotal ELSE 0 END), 0) as pExec
                        FROM ordemservicoitem
                        WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                    `, [String(os.IdOrdemServico)]);

                    if (stats && stats.length > 0) {
                        const s = stats[0];
                        os.QtdeTotalItensCalc = s.itTotal || 0;
                        os.QtdeItensExecutadosCalc = s.itExec || 0;
                        os.PercentualItensCalc = os.QtdeTotalItensCalc > 0 
                            ? Number((os.QtdeItensExecutadosCalc / os.QtdeTotalItensCalc * 100).toFixed(2)) 
                            : 0;
                        os.QtdeTotalPecasCalc = s.pTotal || 0;
                        os.QtdePecasExecutadasCalc = s.pExec || 0;
                    } else {
                        os.QtdeTotalItensCalc = 0;
                        os.QtdeItensExecutadosCalc = 0;
                        os.PercentualItensCalc = 0;
                        os.QtdeTotalPecasCalc = 0;
                        os.QtdePecasExecutadasCalc = 0;
                    }

                    // Verificar se OS possui apontamentos de produção
                    const [apontCheck] = await req.tenantDbPool.execute(
                        `SELECT COUNT(*) as count FROM ordemservicoitemcontrole c
                         INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = c.IdOrdemServicoItem
                         WHERE oi.IdOrdemServico = ?
                           AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E <> '*')`,
                        [String(os.IdOrdemServico)]
                    );
                    os.temApontamento = apontCheck[0].count > 0;
                } catch (err) {
                    console.error(`Error fetching context-safe stats for OS ${os.IdOrdemServico}:`, err);
                    os.QtdeTotalItensCalc = 0;
                    os.QtdeItensExecutadosCalc = 0;
                    os.PercentualItensCalc = 0;
                    os.QtdeTotalPecasCalc = 0;
                    os.QtdePecasExecutadasCalc = 0;
                    os.temApontamento = false;
                }
            }
        }

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

// GET ONE Ordem de Serviço
app.get('/api/ordemservico/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                os.*
            FROM ordemservico os
            WHERE os.IdOrdemServico = ?
        `, [req.params.id]);

        if (rows.length > 0) {
            const os = rows[0];
            const [itemStats] = await req.tenantDbPool.execute(`
                SELECT 
                    COUNT(*) as itTotal,
                    COUNT(CASE WHEN OrdemServicoItemFinalizado = 'C' THEN 1 END) as itExec,
                    COALESCE(SUM(QtdeTotal), 0) as pTotal,
                    COALESCE(SUM(CASE WHEN OrdemServicoItemFinalizado = 'C' THEN QtdeTotal ELSE 0 END), 0) as pExec
                FROM ordemservicoitem
                WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `, [String(os.IdOrdemServico)]);

            if (itemStats.length > 0) {
                const stats = itemStats[0];
                os.QtdeTotalItensCalc = stats.itTotal;
                os.QtdeItensExecutadosCalc = stats.itExec;
                os.PercentualItensCalc = os.QtdeTotalItensCalc > 0 
                    ? Number((os.QtdeItensExecutadosCalc / os.QtdeTotalItensCalc * 100).toFixed(2)) 
                    : 0;
                os.QtdeTotalPecasCalc = stats.pTotal;
                os.QtdePecasExecutadasCalc = stats.pExec;
            }

            res.json({ success: true, data: os });
        } else {
            res.status(404).json({ success: false, message: 'OS não encontrada' });
        }
    } catch (error) {
        console.error('Error fetching ordemservico:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar OS' });
    }
});

// LIST Itens de uma Ordem de Serviço


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
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico à© obrigatà³rio' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });

        if (rows[0].OrdemServicoFinalizado === 'C') {
            return res.status(400).json({ success: false, message: 'O.S. já Finalizada' });
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

        return res.json({ success: true, message: 'Processo Finalizaà§ão Concluà­do' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// NOVA ROTA: Excluir/Cancelar Ordem de Serviço
// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA ROTA: Cancelar Finalizacao Ordem Servico (Etapa 7)
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico à© obrigatà³rio' });

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

        return res.json({ success: true, message: 'Processo de cancelamento da Finalizaà§ão Executado' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ---------------------------------------------------------
// NOVA ROTA: Cancelar Liberação da Ordem de Serviço
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-liberacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;

        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico ? obrigatório' });

        // 1. Verificar se a OS existe e está liberada
        const [osRows] = await connection.query(
            'SELECT Liberado_Engenharia, IdTag, IdProjeto, Fator, TipoLiberacaoOrdemServico FROM ordemservico WHERE IdOrdemServico = ?',
            [IdOrdemServico]
        );
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });

        if (osRows[0].Liberado_Engenharia !== 'S') {
            return res.status(400).json({ success: false, message: 'A Ordem de Serviço não está liberada.' });
        }

        // 2. Verificar se existem apontamentos de produção vinculados à OS
        const [apontRows] = await connection.query(
            `SELECT COUNT(*) as count FROM ordemservicoitemcontrole c
             INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = c.IdOrdemServicoItem
             WHERE oi.IdOrdemServico = ?
               AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E <> '*')`,
            [IdOrdemServico]
        );
        if (apontRows[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Não ? possível cancelar a liberação: esta OS já possui ${apontRows[0].count} apontamento(s) de produção registrado(s).`
            });
        }

        await connection.beginTransaction();

        // 3. Reverter liberação da OS
        await connection.query(
            `UPDATE ordemservico SET Liberado_Engenharia = '', Data_Liberacao_Engenharia = NULL, TipoLiberacaoOrdemServico = '' WHERE IdOrdemServico = ?`,
            [IdOrdemServico]
        );

        // 4. Reverter liberação dos itens da OS
        await connection.query(
            `UPDATE ordemservicoitem SET Liberado_Engenharia = '', Data_Liberacao_Engenharia = NULL WHERE IdOrdemServico = ?`,
            [IdOrdemServico]
        );

        // 5. Reverter saldo na tag (se liberação era Total)
        const osData = osRows[0];
        if (osData.TipoLiberacaoOrdemServico === 'Total' && osData.IdTag && osData.Fator) {
            const fator = parseFloat(osData.Fator) || 0;
            if (fator > 0) {
                await connection.query(
                    `UPDATE tags SET QtdeLiberada = GREATEST(0, QtdeLiberada - ?), SaldoTag = SaldoTag + ? WHERE IdTag = ?`,
                    [fator, fator, osData.IdTag]
                );
            }
        }

        // 6. Cancelar itens vinculados em Planos de Corte (se não tiverem execução)
        try {
            await connection.query(
                `UPDATE planocorteitem pci
                 INNER JOIN ordemservicoitem oi ON oi.IdOrdemServicoItem = pci.IdOrdemServicoItem
                 SET pci.D_E_L_E_T_E = '*'
                 WHERE oi.IdOrdemServico = ?
                   AND (pci.Executado IS NULL OR pci.Executado = '' OR pci.Executado = '0')`,
                [IdOrdemServico]
            );
        } catch (e) {
            console.log('[CancelarLiberacaoOS] Aviso ao limpar plano de corte:', e.message);
        }

        await connection.commit();
        console.log(`[CancelarLiberacaoOS] OS ${IdOrdemServico} - Liberação cancelada com sucesso.`);
        return res.json({ success: true, message: 'Liberação da Ordem de Serviço cancelada com sucesso.' });

    } catch (e) {
        if (connection) await connection.rollback();
        console.error('[CancelarLiberacaoOS] Erro:', e);
        res.status(500).json({ success: false, message: 'Erro interno ao cancelar liberação: ' + e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ---------------------------------------------------------
// NOVA ROTA: Inserir Numero OP do Omie (Etapa 8)
// ---------------------------------------------------------

// ---------------------------------------------------------
// NOVA ROTA: Criar Cà³pia da Ordem de Serviço (Etapa 9)
// ---------------------------------------------------------
app.post('/api/ordemservico/clonar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, novoFator, usuarioNome, novoIdProjeto, novoIdTag, novaDescricao } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico de origem à© obrigatà³rio' });
        if (!novoIdProjeto || !novoIdTag) return res.status(400).json({ success: false, message: 'Projeto e Tag de destino são obrigatà³rios' });
        
        const fator = isNaN(parseInt(novoFator)) || parseInt(novoFator) <= 0 ? 1 : parseInt(novoFator);
        const criador = getCtxNomeCompleto() !== 'Sistema' ? getCtxNomeCompleto() : (usuarioNome || 'Sistema Web');

        // 1. Obter a O.S Original
        const [origOS] = await connection.query('SELECT * FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S de origem não encontrada' });
        const os = origOS[0];

        // 2. Obter Dados do Novo Projeto e Nova Tag
        const [rowProjeto] = await connection.query('SELECT Projeto FROM projetos WHERE IdProjeto = ?', [novoIdProjeto]);
        if (rowProjeto.length === 0) return res.status(404).json({ success: false, message: 'Projeto de destino não encontrado' });
        const { Projeto: nomeProjeto } = rowProjeto[0];

        const [rowTag] = await connection.query('SELECT Tag, DescTag, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag FROM tags WHERE IdTag = ?', [novoIdTag]);
        if (rowTag.length === 0) return res.status(404).json({ success: false, message: 'Tag de destino não encontrada' });
        const { Tag: nomeTag, DescTag: descTagDestino, DataPrevisao: dataPrevTag } = rowTag[0];

        // 3. Inserir Header (Mestre) Limpando Variáveis de Estado
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

        // Tentar formatar Diretà³rio fisà­co
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
                console.log('[CloneOS] Pasta de rede inacesà­vel:', e.message);
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
            WHERE (IdOrdemServico = ?) 
              AND (IdOrdemServicoReposicao IS NULL OR IdOrdemServicoReposicao = '')
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
        `;

        await connection.query(queryInsertItens, [
            novoId, novoIdProjeto, nomeProjeto, novoIdTag, nomeTag, descTagDestino,
            fator, fator, fator, criador, dataCriacaoFormatada, fator, prevUsada, os.IdEmpresa, os.DescEmpresa, IdOrdemServico
        ]);

        // Inicializar TotalExecutar do primeiro setor para todos os itens clonados
        const [clonedItems] = await connection.query(
            `SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [novoId]
        );
        for (const cItem of clonedItems) {
            await inicializarPrimeiroSetor(connection, cItem.IdOrdemServicoItem);
        }

        // Recalcular as somatórias em cascata pelo fato de termos novos itens clonados
        await recalcularQuantidadesTotais(novoId, connection);

        return res.json({ success: true, message: 'Nova Cópia da Ordem de Serviço inserida!', novoId });

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
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico à© obrigatà³rio' });

        await connection.query('UPDATE ordemservico SET NumeroOPOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET NumeroOpOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);

        return res.json({ success: true, message: 'Nàºmero da OP do OMIE atualizado com sucesso!' });

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
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico à© obrigatà³rio' });

        // Validação adicional: Bloqueio de O.S Finalizada
        const [osStatus] = await connection.query(`SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?`, [IdOrdemServico]);
        if (osStatus.length > 0 && osStatus[0].OrdemServicoFinalizado === 'C') {
            return res.status(400).json({ success: false, message: 'A OS Não pode ser excluída pois já encontra-se finalizada/concluída.' });
        }

        // Validaà§ão idàªntica ao VB.NET: verificar se há execuà§ão ou plano de corte
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
            // Busca apenas os planos de corte para listar na mensagem, caso haja para exibià§ão de detalhes
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
                message: `A OS Numero: ${IdOrdemServico} contà©m processos em andamento, por este motivo não pode ser cancelada. Ver plano(s) de corte:${MsgDetalhes}`
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
            return res.status(400).json({ success: false, message: 'Ordem de Serviço não encontrada ou já excluà­da.' });
        }

        // Realiza o "Soft Delete" na tabela ordemservicoitem
        await connection.query(`
            UPDATE ordemservicoitem
            SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = ?
            WHERE IdOrdemServico = ?
        `, [executor, dataatual, IdOrdemServico]);

        // Aqui executamos o Recalculo para subtrair os totais cascateados
        await recalcularQuantidadesTotais(IdOrdemServico, connection);

        return res.json({ success: true, message: 'Ordem de servià§o excluà­da com sucesso.' });

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
        if (origOS.length === 0) return res.status(404).json({ success: false, message: 'O.S não encontrada' });
        const os = origOS[0];

        const db = require('./config/db');
        const store = db.asyncLocalStorage.getStore();
        const dbName = store ? store.dbName : 'lynxlocal';
        const fs = require('fs');
        const path = require('path');
        
        let templatePath = '';

        // Tenta buscar da configuracaosistema primeiro (prioridade máxima)
        const [configRows] = await connection.query("SELECT valor FROM configuracaosistema WHERE chave = 'EnderecoTemplateExcelOrdemServico'");
        if (configRows.length > 0 && configRows[0].valor && fs.existsSync(configRows[0].valor)) {
            templatePath = configRows[0].valor;
        } else {
            // Lógica dinÃ¢mica baseada no tenant (banco ativo)
            const BASE_DRIVE_PATH = 'G:\\Meu Drive\\ConfiguraçÃµes';
            let tenantFolder = null;

            // Possíveis nomes da pasta do cliente no Google Drive
            const possibleFolderNames = [
                dbName, 
                dbName.charAt(0).toUpperCase() + dbName.slice(1).toLowerCase(), 
                dbName.toUpperCase(),
                'Configuracao' + dbName,
                'Configuração' + dbName,
                'Configuracao' + dbName.charAt(0).toUpperCase() + dbName.slice(1).toLowerCase()
            ];

            for (const folderName of possibleFolderNames) {
                const fullPath = path.join(BASE_DRIVE_PATH, folderName);
                if (fs.existsSync(fullPath)) {
                    tenantFolder = fullPath;
                    break;
                }
            }

            if (!tenantFolder) {
                // Caso não encontre pasta específica, tenta fallback para lynxlocal
                if (dbName === 'lynxlocal' || dbName === 'Lynx') {
                    const lynxPath = 'G:\\Meu Drive\\Estrutura padrão Lynx\\023-SGQ\\023-001-FORMULARIOS\\Templat-OS-Rev03.xlsx';
                    if (fs.existsSync(lynxPath)) {
                        templatePath = lynxPath;
                    } else {
                        return res.status(400).json({ success: false, message: 'Template Excel do Lynx não encontrado.' });
                    }
                } else {
                    return res.status(400).json({ success: false, message: `Pasta de configuração não encontrada para o banco: ${dbName}` });
                }
            } else {
                // Procurar pelo arquivo de template de OS dentro da pasta do tenant
                const templateNames = [
                    'Template-OS-rev02.xlsx',
                    'Templat-OS-rev02.xlsx',
                    'Templat-OS-Rev03.xlsx',
                    'Template-OS.xlsx',
                    'Templat-OS.xlsx'
                ];

                for (const tName of templateNames) {
                    // Tenta direto na raiz da pasta do cliente
                    const testPath = path.join(tenantFolder, tName);
                    if (fs.existsSync(testPath)) {
                        templatePath = testPath;
                        break;
                    }
                    // Tenta numa subpasta Configuracao por garantia
                    const testPathSub = path.join(tenantFolder, 'Configuracao', tName);
                    if (fs.existsSync(testPathSub)) {
                        templatePath = testPathSub;
                        break;
                    }
                }

                if (!templatePath) {
                    return res.status(400).json({ success: false, message: `Nenhum template Excel de OS (ex: Templat-OS-rev02.xlsx) encontrado na pasta: ${tenantFolder}` });
                }
            }
        }

        const XlsxPopulate = require('xlsx-populate');
        const workbook = await XlsxPopulate.fromFileAsync(templatePath);
        const worksheet = workbook.sheet(0);

        const format5 = (num) => String(num).padStart(5, '0');
        const osString = format5(os.IdOrdemServico);

        const sanitize = (str) => String(str || '').replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim().toUpperCase();

        // Header mapping Sheet 0
        const ws0 = workbook.sheet(0);
        ws0.cell('W1').value(osString);
        ws0.cell('D8').value(sanitize((os.Projeto || '') + ' - ' + (os.DescEmpresa || '')));
        ws0.cell('D9').value(sanitize(os.Tag));
        ws0.cell('T8').value(sanitize(os.Descricao));
        ws0.cell('D10').value(sanitize(os.EnderecoOrdemServico));
        ws0.cell('D13').value(sanitize(os.CriadoPor));
        ws0.cell('D14').value(sanitize(os.DataCriacao));

        // Header mapping Sheet 1 (if exists)
        const ws1 = workbook.sheet(1);
        if (ws1) {
            ws1.cell('P1').value(osString);
            ws1.cell('D8').value(sanitize((os.Projeto || '') + ' - ' + (os.DescEmpresa || '')));
            ws1.cell('D9').value(sanitize(os.Tag));
            ws1.cell('M8').value(sanitize(os.Descricao));
            ws1.cell('D10').value(sanitize(os.EnderecoOrdemServico));
            ws1.cell('D13').value(sanitize(os.CriadoPor));
            ws1.cell('D14').value(sanitize(os.DataCriacao));
        }

        const [itens] = await connection.query(`
            SELECT * FROM ordemservicoitem 
            WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdOrdemServicoItem
        `, [IdOrdemServico]);

        // Items mapping starting at row 18
        const startRow = 18;
        
        for (let i = 0; i < itens.length; i++) {
            const item = itens[i];
            const rowNum = startRow + i;

            // Populate Sheet 0
            ws0.cell(`A${rowNum}`).value(item.IdOrdemServicoItem || '');
            ws0.cell(`B${rowNum}`).value(sanitize(item.CodMatFabricante));
            ws0.cell(`I${rowNum}`).value(Number(item.QtdeTotal) || 0);
            ws0.cell(`J${rowNum}`).value(sanitize(item.MaterialSW));
            ws0.cell(`K${rowNum}`).value(sanitize(item.Unidade));
            ws0.cell(`L${rowNum}`).value(sanitize(item.Espessura));
            ws0.cell(`M${rowNum}`).value(sanitize(item.Altura));
            ws0.cell(`N${rowNum}`).value(sanitize(item.Largura));
            ws0.cell(`O${rowNum}`).value(sanitize(item.txtItemEstoque));
            ws0.cell(`P${rowNum}`).value(sanitize(item.DescResumo));
            ws0.cell(`S${rowNum}`).value(sanitize(item.DescDetal));
            ws0.cell(`V${rowNum}`).value(sanitize(item.Acabamento));
            ws0.cell(`W${rowNum}`).value(sanitize(item.txtTipoDesenho));

            // Populate Sheet 1
            if (ws1) {
                ws1.cell(`A${rowNum}`).value(item.IdOrdemServicoItem || '');
                ws1.cell(`D${rowNum}`).value(sanitize(item.CodMatFabricante));
                ws1.cell(`G${rowNum}`).value(sanitize((item.DescResumo || '') + ' ' + (item.DescDetal || '')));
                ws1.cell(`N${rowNum}`).value(Number(item.QtdeTotal) || 0);
                ws1.cell(`O${rowNum}`).value(sanitize(item.Unidade));
                ws1.cell(`P${rowNum}`).value(0); // PESO
            }
        }

        const destPath = os.EnderecoOrdemServico;
        if (!destPath || !fs.existsSync(destPath)) {
            return res.status(400).json({ success: false, message: 'Diretà³rio final da OS não existe: ' + destPath });
        }

        const fileName = `OS_${osString}.xlsx`;
        const p = require('path');
        const finalFile = p.join(destPath, fileName);

        await workbook.toFileAsync(finalFile);

        // Open Explorer
        try {
            require('child_process').exec(`explorer "${destPath}"`);
        } catch (e) {
            console.error('Falha ao abrir explorer:', e);
        }

        return res.json({ success: true, message: 'Relatà³rio Excel gerado com sucesso.', file: finalFile });

    } catch (e) {
        console.error("Erro na geraà§ão de Excel:", e);
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
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS não encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de Serviço já Liberada para Produà§ão, não pode mais ser modificada!' });
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
                
                // Adapta extensàµes
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
            return res.status(400).json({ success: false, message: 'Fator inválido' });
        }

        const [osRows] = await connection.query('SELECT IdTag, EnderecoOrdemServico, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);
        if (osRows.length === 0) return res.status(404).json({ success: false, message: 'OS não encontrada.' });
        
        const os = osRows[0];
        if (os.Liberado_Engenharia === 'S') {
            return res.status(400).json({ success: false, message: 'Ordem de Serviço já Liberada para Produà§ão, não pode mais ser modificada!' });
        }

        // Verifica ITENS
        const [itemRows] = await connection.query('SELECT IdOrdemServicoItem, Qtde, AreaPintura, Peso FROM ordemservicoitem WHERE IdOrdemServico = ?', [IdOrdemServico]);
        // Permite alterar fator mesmo sem itens
        /* if (itemRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Não há itens a serem alterados!' });
        } */

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

// ---------------------------------------------------------
// ROTA: Alterar Fator com cascata completa OS → Tag → Projeto
// Atualiza QtdeTotal de cada item = qtdeUnit × novoFator
// Atualiza TotalExecutar do PRIMEIRO setor ativo de cada item = novoQtde
// Zera TotalExecutar dos demais setores
// recalcularQuantidadesTotais propaga somas para OS, Tag e Projeto
// ---------------------------------------------------------
app.post('/api/ordemservico/alterar-fator-cascata', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, NovoFator } = req.body;

        const novoFator = parseFloat(NovoFator);
        if (isNaN(novoFator) || novoFator <= 0) {
            return res.status(400).json({ success: false, message: 'Fator inválido. Deve ser um número maior que zero.' });
        }

        // Busca OS (fator anterior)
        const [osRows] = await connection.query(
            'SELECT IdOrdemServico, Fator, IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != \'*\')',
            [IdOrdemServico]
        );
        if (osRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });
        }
        const os = osRows[0];
        const fatorAnterior = parseFloat(os.Fator) || 1;

        // Busca itens ativos com todos os campos necessários
        const [itemRows] = await connection.query(
            `SELECT IdOrdemServicoItem, QtdeTotal, AreaPintura, Peso,
                    txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem
             FROM ordemservicoitem
             WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [IdOrdemServico]
        );
        if (itemRows.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum item encontrado para esta Ordem de Serviço.' });
        }

        // Mapeamento de setores em ordem de prioridade
        const setorOrdem = [
            { flag: 'txtCorte',    campoExecutar: 'CorteTotalExecutar'    },
            { flag: 'txtDobra',    campoExecutar: 'DobraTotalExecutar'    },
            { flag: 'txtSolda',    campoExecutar: 'SoldaTotalExecutar'    },
            { flag: 'txtPintura',  campoExecutar: 'PinturaTotalExecutar'  },
            { flag: 'TxtMontagem', campoExecutar: 'MontagemTotalExecutar' },
        ];

        await connection.beginTransaction();
        try {
            let somaTotal = 0;

            for (const item of itemRows) {
                const qtdeAtual = parseFloat(item.QtdeTotal) || 0;
                const areaAtual = parseFloat(item.AreaPintura) || 0;
                const pesoAtual = parseFloat(item.Peso) || 0;

                // Reverte para qtde unitária (sem fator anterior) e aplica novo fator
                const qtdeUnit = fatorAnterior > 0 ? qtdeAtual / fatorAnterior : qtdeAtual;
                const areaUnit = fatorAnterior > 0 ? areaAtual / fatorAnterior : areaAtual;
                const pesoUnit = fatorAnterior > 0 ? pesoAtual / fatorAnterior : pesoAtual;

                const novaQtde = Math.round(qtdeUnit * novoFator * 1000) / 1000;
                const novaArea = Math.round(areaUnit * novoFator * 1000) / 1000;
                const novoPeso = Math.round(pesoUnit * novoFator * 1000) / 1000;

                somaTotal += novaQtde;

                // Identifica o PRIMEIRO setor ativo do item
                const primeiroSetor = setorOrdem.find(s => String(item[s.flag]).trim() === '1');

                // Monta o SET dinâmico para TotalExecutar dos setores
                // O primeiro setor ativo recebe novaQtde; os demais recebem 0
                const setCampos = setorOrdem.map(s =>
                    `\`${s.campoExecutar}\` = ${primeiroSetor && s.campoExecutar === primeiroSetor.campoExecutar ? novaQtde : 0}`
                ).join(', ');

                await connection.query(
                    `UPDATE ordemservicoitem
                     SET QtdeTotal = ?, AreaPintura = ?, Peso = ?, Fator = ?, ${setCampos}
                     WHERE IdOrdemServicoItem = ?`,
                    [novaQtde, novaArea, novoPeso, novoFator, item.IdOrdemServicoItem]
                );
            }

            // Atualiza Fator na OS (QtdeTotalItens virá do recalcularQuantidadesTotais)
            await connection.query(
                'UPDATE ordemservico SET Fator = ? WHERE IdOrdemServico = ?',
                [novoFator, IdOrdemServico]
            );

            await connection.commit();

            console.log(`[alterar-fator-cascata] OS ${IdOrdemServico}: fator ${fatorAnterior}→${novoFator}, somaTotal=${somaTotal}, ${itemRows.length} itens atualizados`);
        } catch (txErr) {
            await connection.rollback();
            throw txErr;
        }

        // Recalcula cascata completa: QtdeTotalItens, setores, percentuais → OS → Tag → Projeto
        await recalcularQuantidadesTotais(IdOrdemServico, connection);

        return res.json({
            success: true,
            message: `Fator atualizado de ${fatorAnterior} para ${novoFator}. Quantidades recalculadas em cascata (OS → Tag → Projeto).`,
            FatorAnterior: fatorAnterior,
            NovoFator: novoFator
        });

    } catch (e) {
        console.error('[alterar-fator-cascata] Erro:', e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

// ---------------------------------------------------------
// ROTA: Consultar Fator Multiplicador de uma OS no banco
// ---------------------------------------------------------
app.get('/api/ordemservico/:id/fator', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { id } = req.params;
        const [rows] = await connection.query(
            'SELECT IdOrdemServico, Descricao, Fator, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != \'*\')',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });
        }
        const os = rows[0];
        return res.json({
            success: true,
            IdOrdemServico: os.IdOrdemServico,
            Descricao: os.Descricao || '',
            Fator: os.Fator ?? 0,
            Liberado_Engenharia: os.Liberado_Engenharia
        });
    } catch (e) {
        console.error('[GET fator] Erro:', e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/ordemservico/liberar', tenantMiddleware, async (req, res) => {
    const { IdOrdemServico, IdTag, IdProjeto, Fator, EnderecoOrdemServico, TipoLiberacao } = req.body;
    let connection;
    try {
        if (!IdOrdemServico || !Fator || !TipoLiberacao) {
            return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios ausentes: IdOrdemServico, Fator e TipoLiberacao são necessários.' });
        }

        // 0. Validar se o Projeto desta OS está liberado (Liberado = 'S')
        if (IdProjeto) {
            const dbPool = req.tenantDbPool || pool;
            const [projRows] = await dbPool.execute(
                `SELECT Liberado, Projeto FROM projetos WHERE IdProjeto = ? LIMIT 1`,
                [IdProjeto]
            );
            if (projRows.length > 0) {
                const projLiberado = String(projRows[0].Liberado || '').trim().toUpperCase();
                if (projLiberado !== 'S') {
                    const nomeProjeto = projRows[0].Projeto || `ID ${IdProjeto}`;
                    return res.status(400).json({
                        success: false,
                        message: `Não é possível liberar esta Ordem de Serviço. O Projeto "${nomeProjeto}" ainda não foi liberado. Acesse a tela de Projetos, localize o projeto e clique no ícone de liberação (✓) antes de liberar a OS.`
                    });
                }
            }
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
            return res.status(400).json({ success: false, message: 'Verifique se há um produto principal para a Ordem de Serviço cadastrado.' });
        }

        // 1.5 Validar se todos os itens possuem pelo menos um recurso associado
        const [itensSemRecurso] = await connection.execute(
            `SELECT osi.CodMatFabricante
             FROM ordemservicoitem osi
             LEFT JOIN material_processo mp 
               ON osi.IdOrdemServico = mp.IdOrdemServico 
              AND osi.CodMatFabricante = mp.codmatFabricante
              AND COALESCE(osi.IdTag, 0) = COALESCE(mp.IdTag, 0)
              AND COALESCE(osi.IdProjeto, 0) = COALESCE(mp.IdProjeto, 0)
             WHERE osi.IdOrdemServico = ?
             GROUP BY osi.IdOrdemServicoItem
             HAVING COUNT(mp.IdProcesso) = 0`,
            [IdOrdemServico]
        );
        if (itensSemRecurso.length > 0) {
            await connection.rollback();
            const codigosSemRecurso = itensSemRecurso.map(i => i.CodMatFabricante).join(', ');
            return res.status(400).json({ 
                success: false, 
                message: `Não é possível liberar a OS. O(s) item(ns) a seguir não possuem nenhum recurso (processo) associado: ${codigosSemRecurso}. Adicione pelo menos um recurso para cada item.` 
            });
        }

        // 2. Limpar Diretà³rios e Copiar Arquivos
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
                    { header: 'Descrição', key: 'desc', width: 50 },
                    { header: 'Qtde', key: 'qtde', width: 10 },
                    { header: 'Peso', key: 'peso', width: 15 },
                    { header: 'Liberado', key: 'lib', width: 10 }
                ];

                const [itensData] = await connection.execute(`SELECT 
                CodMatFabricante, DescResumo, DescDetal, QtdeTotal, Peso, Liberado_Engenharia FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')`, [IdOrdemServico]);
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
            console.error('Erro ao gerar Excel de liberaà§ão:', excelErr);
        }

        await connection.commit();

        // 6. Aplicar Fator Multiplicador nos itens e inicializar TotalExecutar do primeiro setor
        //    QtdeTotal_item = qtdeUnit × Fator; TotalExecutar(primeiroSetor) = QtdeTotal_item
        try {
            const fator = parseFloat(Fator) || 1;

            // Mapeamento de setores em ordem de prioridade
            const setorOrdem = [
                { flag: 'txtCorte',    campoExecutar: 'CorteTotalExecutar'    },
                { flag: 'txtDobra',    campoExecutar: 'DobraTotalExecutar'    },
                { flag: 'txtSolda',    campoExecutar: 'SoldaTotalExecutar'    },
                { flag: 'txtPintura',  campoExecutar: 'PinturaTotalExecutar'  },
                { flag: 'TxtMontagem', campoExecutar: 'MontagemTotalExecutar' },
            ];

            const [itensParaFator] = await connection.execute(
                `SELECT IdOrdemServicoItem, QtdeTotal, AreaPintura, Peso,
                        txtCorte, txtDobra, txtSolda, txtPintura, TxtMontagem, Fator as FatorAtual
                 FROM ordemservicoitem
                 WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [IdOrdemServico]
            );

            for (const item of itensParaFator) {
                const fatorAtual  = parseFloat(item.FatorAtual) || 1;
                const qtdeAtual   = parseFloat(item.QtdeTotal)   || 0;
                const areaAtual   = parseFloat(item.AreaPintura) || 0;
                const pesoAtual   = parseFloat(item.Peso)        || 0;

                // Reverte para unitário e aplica novo fator
                const qtdeUnit = fatorAtual > 0 ? qtdeAtual / fatorAtual : qtdeAtual;
                const areaUnit = fatorAtual > 0 ? areaAtual / fatorAtual : areaAtual;
                const pesoUnit = fatorAtual > 0 ? pesoAtual / fatorAtual : pesoAtual;

                const novaQtde = Math.round(qtdeUnit * fator * 1000) / 1000;
                const novaArea = Math.round(areaUnit * fator * 1000) / 1000;
                const novoPeso = Math.round(pesoUnit * fator * 1000) / 1000;

                // Primeiro setor ativo → recebe novaQtde; demais → 0
                const primeiroSetor = setorOrdem.find(s => String(item[s.flag]).trim() === '1');
                const setCampos = setorOrdem.map(s =>
                    `\`${s.campoExecutar}\` = ${primeiroSetor && s.campoExecutar === primeiroSetor.campoExecutar ? novaQtde : 0}`
                ).join(', ');

                await connection.execute(
                    `UPDATE ordemservicoitem
                     SET QtdeTotal = ?, AreaPintura = ?, Peso = ?, Fator = ?, ${setCampos}
                     WHERE IdOrdemServicoItem = ?`,
                    [novaQtde, novaArea, novoPeso, fator, item.IdOrdemServicoItem]
                );
            }

            // Atualiza Fator na OS
            await connection.execute(
                `UPDATE ordemservico SET Fator = ? WHERE IdOrdemServico = ?`,
                [fator, IdOrdemServico]
            );

            // Recalcula cascata: OS (QtdeTotalItens, TotalExecutar setores) → Tag → Projeto
            await recalcularQuantidadesTotais(IdOrdemServico, connection);

            console.log(`[liberar] OS ${IdOrdemServico}: Fator=${fator}, ${itensParaFator.length} itens processados, cascata recalculada.`);
        } catch (fatorErr) {
            console.error('[liberar] Erro ao aplicar fator/recalcular:', fatorErr.message);
            // Não aborta — a liberação já foi commitada com sucesso
        }

        res.json({ success: true, message: 'Ordem de serviço liberada com sucesso.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Erro ao liberar OS:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao liberar Ordem de Serviço.' });
    } finally {
        if (connection) connection.release();
    }
});


// ══ ROTAS BULK DE PLANEJAMENTO DE SETORES (PROJETO + TAG + OSs + ITENS DAS OSs) ══
app.put('/api/visao-geral/tag/:id/setor-data-bulk', tenantMiddleware, async (req, res) => {
    try {
        const { updates } = req.body;
        const tagId = req.params.id;
        const queryPool = req.tenantDbPool || pool;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.json({ success: true, message: 'Nenhuma alteração a salvar.' });
        }

        const allowedFields = [
            'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
            'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPunsionadeira', 'PlanejadoFinalPunsionadeira',
            'PlanejadoInicioPUNSIONADEIRA', 'PlanejadoFinalPUNSIONADEIRA',
            'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
            'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
            'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
            'PlanejadoInicioGalvanizar', 'PlanejadoFinalGalvanizar',
            'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
            'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem',
            'PlanejadoInicioEngenharia', 'PlanejadoFinalEngenharia',
            'DataPrevisao'
        ];

        const dateColsProj = [
            'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPUNSIONADEIRA', 'PlanejadoFinalPUNSIONADEIRA',
            'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
            'PlanejadoInicioPunsionadeira', 'PlanejadoFinalPunsionadeira',
            'PlanejadoInicioGalvanizar', 'PlanejadoFinalGalvanizar'
        ];

        const setClausesTag = [];
        const valuesTag = [];
        const setClausesProj = [];
        const valuesProj = [];

        for (const u of updates) {
            if (allowedFields.includes(u.field)) {
                setClausesTag.push(`\`${u.field}\` = ?`);
                valuesTag.push(u.value || null);

                setClausesProj.push(`\`${u.field}\` = ?`);
                if (dateColsProj.includes(u.field)) {
                    valuesProj.push(toIsoDate(u.value));
                } else {
                    valuesProj.push(u.value || null);
                }
            }
        }

        if (setClausesTag.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo permitido fornecido.' });
        }

        // 1. Atualizar a TAG no MySQL
        valuesTag.push(tagId);
        const sqlTag = `UPDATE tags SET ${setClausesTag.join(', ')} WHERE IdTag = ?`;
        await req.tenantDbPool.execute(sqlTag, valuesTag);

        // 2. Atualizar o PROJETO correspondente no MySQL
        const [tagRows] = await req.tenantDbPool.execute('SELECT IdProjeto FROM tags WHERE IdTag = ?', [tagId]);
        if (tagRows.length > 0 && tagRows[0].IdProjeto) {
            const idProjeto = tagRows[0].IdProjeto;
            valuesProj.push(idProjeto);
            const sqlProj = `UPDATE projetos SET ${setClausesProj.join(', ')} WHERE IdProjeto = ?`;
            await req.tenantDbPool.execute(sqlProj, valuesProj);
        }

        res.json({ success: true, message: 'Datas de planejamento do Projeto e Tag salvas com sucesso no banco de dados.' });
    } catch (error) {
        console.error('Error updating tag sector dates bulk:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar datas de planejamento.' });
    }
});

app.put('/api/visao-geral/tag/:id/propagar-datas-os', tenantMiddleware, async (req, res) => {
    try {
        const { updates } = req.body;
        const tagId = req.params.id;
        const queryPool = req.tenantDbPool || pool;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.json({ success: true, message: 'Nenhuma alteração a propagar.' });
        }

        const allowedFields = [
            'PlanejadoInicioCorte', 'PlanejadoFinalCorte',
            'PlanejadoInicioCorteaLaser', 'PlanejadoFinalCorteaLaser',
            'PlanejadoInicioPunsionadeira', 'PlanejadoFinalPunsionadeira',
            'PlanejadoInicioPUNSIONADEIRA', 'PlanejadoFinalPUNSIONADEIRA',
            'PlanejadoInicioDobra', 'PlanejadoFinalDobra',
            'PlanejadoInicioSolda', 'PlanejadoFinalSolda',
            'PlanejadoInicioPintura', 'PlanejadoFinalPintura',
            'PlanejadoInicioGalvanizar', 'PlanejadoFinalGalvanizar',
            'PlanejadoInicioGALVANIZAR', 'PlanejadoFinalGALVANIZAR',
            'PlanejadoInicioMontagem', 'PlanejadoFinalMontagem',
            'PlanejadoInicioEngenharia', 'PlanejadoFinalEngenharia',
            'DataPrevisao'
        ];

        const setClausesOS = [];
        const setClausesItems = [];
        const valuesOS = [];
        const valuesItems = [];

        for (const u of updates) {
            if (allowedFields.includes(u.field)) {
                setClausesOS.push(`\`${u.field}\` = ?`);
                valuesOS.push(u.value || null);

                setClausesItems.push(`osi.\`${u.field}\` = ?`);
                valuesItems.push(u.value || null);
            }
        }

        if (setClausesOS.length === 0) {
            return res.json({ success: true, message: 'Nenhum campo válido para propagar.' });
        }

        valuesOS.push(tagId);
        const sqlOS = `UPDATE ordemservico SET ${setClausesOS.join(', ')} WHERE IdTag = ?`;
        await req.tenantDbPool.execute(sqlOS, valuesOS);

        valuesItems.push(tagId);
        const sqlItems = `UPDATE ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico SET ${setClausesItems.join(', ')} WHERE os.IdTag = ?`;
        await req.tenantDbPool.execute(sqlItems, valuesItems);

        res.json({ success: true, message: 'Datas propagadas com sucesso para todas as OSs e Itens da Tag!' });
    } catch (error) {
        console.error('Error propagating dates to OS:', error);
        res.status(500).json({ success: false, message: 'Erro ao propagar datas para as Ordens de Serviço.' });
    }
});

app.get('/api/visao-geral/tag/:id/ordens-servico', tenantMiddleware, async (req, res) => {
    try {
        const queryPool = req.tenantDbPool || pool;
        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                os.IdOrdemServico, os.IdTag, os.IdProjeto, os.Descricao, os.OrdemServicoFinalizado, os.Liberado_Engenharia, 
                os.Data_Liberacao_Engenharia, os.DataPrevisao, os.Fator, os.EnderecoOrdemServico, os.NumeroOPOmie,
                
                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') THEN 1 ELSE 0 END), 0) AS QtdeTotalItens,
                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') AND TRIM(COALESCE(osi.OrdemServicoItemFinalizado, '')) IN ('C','S') THEN 1 ELSE 0 END), 0) AS QtdeItensExecutados,
                
                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') THEN COALESCE(NULLIF(osi.QtdeTotal, 0), NULLIF(osi.qtde, 0), 1) ELSE 0 END), 0) AS QtdeTotalPecas,
                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') AND TRIM(COALESCE(osi.OrdemServicoItemFinalizado, '')) IN ('C','S') THEN COALESCE(NULLIF(osi.QtdeTotal, 0), NULLIF(osi.qtde, 0), 1) ELSE 0 END), 0) AS QtdePecasExecutadas,

                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') THEN COALESCE(NULLIF(osi.Peso, 0), (COALESCE(osi.PesoUnitario,0) * COALESCE(NULLIF(osi.QtdeTotal, 0), 1))) ELSE 0 END), 0) AS PesoTotal,
                COALESCE(SUM(CASE WHEN (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '') THEN COALESCE(NULLIF(osi.AreaPintura, 0), (COALESCE(osi.AreaPinturaUnitario,0) * COALESCE(NULLIF(osi.QtdeTotal, 0), 1))) ELSE 0 END), 0) AS AreaPinturaTotal,

                os.CorteTotalExecutar, os.CorteTotalExecutado,
                os.DobraTotalExecutar, os.DobraTotalExecutado,
                os.SoldaTotalExecutar, os.SoldaTotalExecutado,
                os.PinturaTotalExecutar, os.PinturaTotalExecutado,
                os.MontagemTotalExecutar, os.MontagemTotalExecutado,
                os.CorteaLaserTotalExecutar, os.CorteaLaserTotalExecutado,
                os.PlanejadoInicioCorte, os.PlanejadoFinalCorte,
                os.PlanejadoInicioPUNSIONADEIRA, os.PlanejadoFinalPUNSIONADEIRA,
                os.PlanejadoInicioGALVANIZAR, os.PlanejadoFinalGALVANIZAR,
                
                os.PunsionadeiraTotalExecutar, os.PunsionadeiraTotalExecutado,
                os.GalvanizarTotalExecutar, os.GalvanizarTotalExecutado
            FROM ordemservico os
            LEFT JOIN ordemservicoitem osi ON osi.IdOrdemServico = os.IdOrdemServico AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
            WHERE os.IdTag = ? AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
            GROUP BY os.IdOrdemServico
            ORDER BY os.IdOrdemServico
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ordens de servico for tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar ordens de servico da tag' });
    }
});

app.get('/api/ordemservico/:id/itens', tenantMiddleware, async (req, res) => {
    console.log(`[DEBUG] Hit /api/ordemservico/:id/itens for id ${req.params.id}`);
    try {
        // Verificar se material_processo existe neste tenant
        let hasMpTable = false;
        try {
            await req.tenantDbPool.execute('SELECT 1 FROM material_processo LIMIT 1');
            hasMpTable = true;
        } catch(e) { hasMpTable = false; }

        let rows;
        if (hasMpTable) {
            // Schema com material_processo: enriquecer dados de OSI com mp
            [rows] = await req.tenantDbPool.execute(`
                SELECT osi.*,
                    COALESCE(osi.Fator, 1) AS Fator,
                    IF(osi.Peso IS NULL OR osi.Peso = 0, m.Peso, osi.Peso) AS Peso,
                    COALESCE(osi.EnderecoArquivo, m.EnderecoArquivo) AS EnderecoArquivo,
                    COALESCE(osi.Liberado_Engenharia, 'N') AS Liberado_Engenharia,
                    COALESCE(osi.ProdutoPrincipal, 'N') AS ProdutoPrincipal,
                    -- Dados agregados de material_processo para este item
                    (SELECT MAX(mp2.TotalExecutar)
                     FROM material_processo mp2
                     WHERE mp2.IdOrdemServico = osi.IdOrdemServico
                       AND mp2.codmatFabricante = osi.CodMatFabricante
                     LIMIT 1) AS QtdeTotalMp,
                    (SELECT COUNT(*)
                     FROM material_processo mp3
                     WHERE mp3.IdOrdemServico = osi.IdOrdemServico
                       AND mp3.codmatFabricante = osi.CodMatFabricante) AS TotalProcessos
                FROM ordemservicoitem osi
                LEFT JOIN material m ON m.CodMatFabricante = osi.CodMatFabricante
                WHERE osi.IdOrdemServico = ?
                  AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
                ORDER BY osi.IdOrdemServicoItem
            `, [req.params.id]);
        } else {
            // Fallback: schema sem material_processo - busca simples
            [rows] = await req.tenantDbPool.execute(`
                SELECT osi.*,
                    COALESCE(osi.Fator, 1) AS Fator,
                    IF(osi.Peso IS NULL OR osi.Peso = 0, m.Peso, osi.Peso) AS Peso,
                    COALESCE(osi.EnderecoArquivo, m.EnderecoArquivo) AS EnderecoArquivo,
                    COALESCE(osi.Liberado_Engenharia, 'N') AS Liberado_Engenharia,
                    COALESCE(osi.ProdutoPrincipal, 'N') AS ProdutoPrincipal
                FROM ordemservicoitem osi
                LEFT JOIN material m ON m.CodMatFabricante = osi.CodMatFabricante
                WHERE osi.IdOrdemServico = ?
                  AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
                ORDER BY osi.IdOrdemServicoItem
            `, [req.params.id]);
        }

        console.log(`[API /itens] Request for OS ${req.params.id} returned ${rows.length} rows.`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ordemservicoitem:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar itens OS' });
    }
});

app.get('/api/visao-geral/projeto/:id/ordens-servico', tenantMiddleware, async (req, res) => {
    try {
        const projId = req.params.id;
        console.log(`[API] Fetching OS for project ID: ${projId}`);
        const queryPool = req.tenantDbPool || pool;

        // 1. Fetch the project to get its "Projeto" name
        const [projRows] = await req.tenantDbPool.execute('SELECT Projeto FROM projetos WHERE IdProjeto = ?', [projId]);
        const projName = projRows.length > 0 ? projRows[0].Projeto : null;

        // 2. Fetch the OSes matching either IdProjeto OR Projeto
        let sql = `
            SELECT 
                IdOrdemServico, Descricao, OrdemServicoFinalizado, Liberado_Engenharia, QtdeTotalItens,
                CorteTotalExecutar, CorteTotalExecutado,
                DobraTotalExecutar, DobraTotalExecutado,
                SoldaTotalExecutar, SoldaTotalExecutado,
                PinturaTotalExecutar, PinturaTotalExecutado,
                MontagemTotalExecutar, MontagemTotalExecutado,
                CorteaLaserTotalExecutar, CorteaLaserTotalExecutado,
                PunsionadeiraTotalExecutar, PunsionadeiraTotalExecutado,
                PlanejadoInicioCorte, PlanejadoFinalCorte,
                PlanejadoInicioDobra, PlanejadoFinalDobra,
                PlanejadoInicioSolda, PlanejadoFinalSolda,
                PlanejadoInicioPintura, PlanejadoFinalPintura,
                PlanejadoInicioMontagem, PlanejadoFinalMontagem,
                PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser,
                PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA,
                PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR,
                
                GalvanizarTotalExecutar, GalvanizarTotalExecutado
            FROM ordemservico 
            WHERE (IdProjeto = ? `;
        let params = [projId];

        if (projName && String(projName).trim() !== '') {
            sql += ` OR Projeto = ? `;
            params.push(projName);
        }
        
        sql += `) AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E = ' ')
                ORDER BY IdOrdemServico`;

        const [rows] = await req.tenantDbPool.execute(sql, params);
        console.log(`[API] Returning ${rows.length} OSes for project ${projId} (Projeto Name: ${projName})`);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[API] Error fetching ordens de servico for project:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar ordens de servico do projeto', error: error.message });
    }
});
app.get('/api/ordemservico/:id/itens-disponiveis', tenantMiddleware, async (req, res) => {
    try {
        const osId = req.params.id;
        const search = req.query.search || '';
        
        const [osItems] = await req.tenantDbPool.execute(
            `SELECT CodMatFabricante FROM ordemservicoitem WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [osId]
        );
        const codigosInOS = osItems.map(i => i.CodMatFabricante).filter(Boolean);

        let sql = `
            SELECT 
                MAX(IdOrdemServicoItem) as IdOrdemServicoItem,
                CodMatFabricante,
                MAX(DescResumo) as DescResumo,
                MAX(DescDetal) as DescDetal,
                MAX(Peso) as Peso,
                MAX(Espessura) as Espessura,
                MAX(MaterialSW) as MaterialSW,
                MAX(Unidade) as Unidade,
                MAX(Projeto) as Projeto,
                MAX(Tag) as Tag
            FROM ordemservicoitem 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
              AND CodMatFabricante IS NOT NULL 
              AND CodMatFabricante != ''
        `;
        const params = [];

        if (codigosInOS.length > 0) {
            sql += ` AND CodMatFabricante NOT IN (${codigosInOS.map(()=>'?').join(',')}) `;
            params.push(...codigosInOS);
        }

        if (search) {
            sql += ` AND (CodMatFabricante LIKE ? OR DescResumo LIKE ? OR Projeto LIKE ? OR Tag LIKE ?) `;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        sql += ` GROUP BY CodMatFabricante ORDER BY MAX(IdOrdemServicoItem) DESC LIMIT 100 `;

        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens disponíveis.' });
    }
});


app.get('/api/ordemservico/:id/itens-codigos', tenantMiddleware, async (req, res) => {
    try {
        const { idProjeto, idTag } = req.query;
        let sql = 'SELECT DISTINCT codmatFabricante FROM material_processo WHERE IdOrdemServico = ?';
        let params = [req.params.id];
        
        if (idProjeto) { sql += ' AND IdProjeto = ?'; params.push(idProjeto); }
        else { sql += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
        if (idTag) { sql += ' AND IdTag = ?'; params.push(idTag); }
        else { sql += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }
        
        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, codigos: rows.map(r => r.codmatFabricante) });
    } catch (e) {
        console.error('Erro itens-codigos:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/ordemservico/:id/materiais-em-processo', tenantMiddleware, async (req, res) => {
    try {
        const osId = req.params.id;
        // Busca TODOS os materiais da OS (sem filtrar por idProjeto/idTag)
        // para retornar processos de cada item individualmente.
        // A chave composta codmat__idTag__idProjeto distingue itens com o mesmo
        // código em projetos/tags diferentes dentro da mesma OS.
        const sql = `
            SELECT mp.codmatFabricante,
                   COALESCE(mp.IdTag, 0)     AS IdTag,
                   COALESCE(mp.IdProjeto, 0) AS IdProjeto,
                   m.DescResumo, mp.TotalExecutar as Qtde,
                   mp.IdProcesso, pf.processofabricacao,
                   mp.TempoEstimadoMin, mp.TempoPadraoMin, mp.SequenciaExecucao
            FROM material_processo mp
            LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            LEFT JOIN material m ON mp.IdMaterial = m.IdMaterial
            WHERE mp.IdOrdemServico = ?
            ORDER BY mp.codmatFabricante, mp.SequenciaExecucao ASC`;

        const [rows] = await req.tenantDbPool.execute(sql, [osId]);
        const mats = {};
        for (const r of rows) {
            if (!r.codmatFabricante) continue;
            // Chave composta: codmat + idTag + idProjeto
            const compKey = `${r.codmatFabricante}__${r.IdTag}__${r.IdProjeto}`;
            if (!mats[compKey]) {
                mats[compKey] = {
                    codmatfabricante: r.codmatFabricante,
                    idTag: r.IdTag,
                    idProjeto: r.IdProjeto,
                    desc: r.DescResumo,
                    qtde: Number(r.Qtde) || 1,
                    recursoTempos: {},
                    processos: []
                };
            }
            if (r.processofabricacao) {
                const key = r.processofabricacao.trim().replace(/\s+/g, '');
                mats[compKey].recursoTempos[key] = {
                    tempoSetup: Number(r.TempoEstimadoMin || 0),
                    tempoPadrao: Number(r.TempoPadraoMin || 0),
                    label: r.processofabricacao
                };
                mats[compKey].processos.push({
                    SequenciaExecucao: r.SequenciaExecucao,
                    processofabricacao: r.processofabricacao,
                    Qtde: Number(r.Qtde) || 1,
                    TempoEstimadoMin: Number(r.TempoEstimadoMin || 0),
                    TempoPadraoMin: Number(r.TempoPadraoMin || 0)
                });
            }
        }
        res.json({ success: true, data: mats });
    } catch (e) {
        console.error('Erro ao buscar materiais na OS:', e);
        res.status(500).json({ success: false, message: 'Erro', error: e.message });
    }
});

app.delete('/api/material-processo/item', tenantMiddleware, async (req, res) => {
    try {
        const { codmatFabricante, osId, idProjeto, idTag } = req.body;
        if (!codmatFabricante || !osId) return res.status(400).json({ success: false, message: 'Dados inválidos' });
        
        let sql = 'DELETE FROM material_processo WHERE codmatFabricante = ? AND IdOrdemServico = ?';
        const params = [codmatFabricante, osId];
        
        if (idProjeto) { sql += ' AND IdProjeto = ?'; params.push(idProjeto); }
        else { sql += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
        if (idTag) { sql += ' AND IdTag = ?'; params.push(idTag); }
        else { sql += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }
        
        await req.tenantDbPool.execute(sql, params);
        
        let sqlOsi = 'DELETE FROM ordemservicoitem WHERE CodMatFabricante = ? AND IdOrdemServico = ?';
        if (idProjeto) { sqlOsi += ' AND IdProjeto = ?'; }
        else { sqlOsi += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
        if (idTag) { sqlOsi += ' AND IdTag = ?'; }
        else { sqlOsi += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }
        await req.tenantDbPool.execute(sqlOsi, params);
        
        res.json({ success: true, message: 'Material removido da OS' });
    } catch (e) {
        console.error('Erro ao excluir material:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.patch('/api/material-processo/quantidade', tenantMiddleware, async (req, res) => {
    try {
        const { codmatFabricante, osId, idProjeto, idTag, qtde, novaQtd } = req.body;
        if (!codmatFabricante || !osId) return res.status(400).json({ success: false, message: 'Dados inválidos' });

        const valueQtd = novaQtd !== undefined ? novaQtd : qtde;

        let subWhere = 'codmatFabricante = ? AND IdOrdemServico = ?';
        let subParams = [codmatFabricante, osId];
        
        if (idProjeto) { subWhere += ' AND IdProjeto = ?'; subParams.push(idProjeto); }
        else { subWhere += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
        
        if (idTag) { subWhere += ' AND IdTag = ?'; subParams.push(idTag); }
        else { subWhere += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }

        let sql = `
            UPDATE material_processo 
            SET TotalExecutar = ? 
            WHERE IdMaterialProcesso = (
                SELECT id FROM (
                    SELECT IdMaterialProcesso AS id 
                    FROM material_processo 
                    WHERE ${subWhere}
                    ORDER BY SequenciaExecucao ASC LIMIT 1
                ) as subquery
            )
        `;
        const params = [valueQtd, ...subParams];
        console.log('PARAMS TO EXECUTE (quantidade):', params);

        await req.tenantDbPool.execute(sql, params);
        res.json({ success: true });
    } catch (e) {
        console.error('Erro ao atualizar quantidade:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.patch('/api/material-processo/tempos', tenantMiddleware, async (req, res) => {
    try {
        const { codmatFabricante, osId, idProjeto, idTag, labelProcesso, tempoSetup, tempoPadrao, qtde } = req.body;
        if (!codmatFabricante || !osId || !labelProcesso) return res.status(400).json({ success: false, message: 'Dados inválidos' });

        const normLabel = labelProcesso.trim().replace(/\s+/g, '');
        const [procRows] = await req.tenantDbPool.execute('SELECT IdProcessoFabricacao FROM processofabricacao WHERE REPLACE(processofabricacao, \' \', \'\') = ? LIMIT 1', [normLabel]);
        if (!procRows.length) return res.status(404).json({ success: false, message: 'Processo não encontrado' });
        const idProcesso = procRows[0].IdProcessoFabricacao;

        let sqlTempos = 'UPDATE material_processo SET TempoEstimadoMin = ?, TempoPadraoMin = ? WHERE codmatFabricante = ? AND IdOrdemServico = ? AND IdProcesso = ?';
        const paramsTempos = [tempoSetup, tempoPadrao, codmatFabricante, osId, idProcesso];
        if (idProjeto) { sqlTempos += ' AND IdProjeto = ?'; paramsTempos.push(idProjeto); }
        else { sqlTempos += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
        if (idTag) { sqlTempos += ' AND IdTag = ?'; paramsTempos.push(idTag); }
        else { sqlTempos += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }
        await req.tenantDbPool.execute(sqlTempos, paramsTempos);

        if (qtde !== undefined && qtde !== null) {
            let subWhere = 'codmatFabricante = ? AND IdOrdemServico = ?';
            let subParams = [codmatFabricante, osId];
            if (idProjeto) { subWhere += ' AND IdProjeto = ?'; subParams.push(idProjeto); }
            else { subWhere += ' AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = \'\')'; }
            if (idTag) { subWhere += ' AND IdTag = ?'; subParams.push(idTag); }
            else { subWhere += ' AND (IdTag IS NULL OR IdTag = 0 OR IdTag = \'\')'; }

            let sqlQtd = `
                UPDATE material_processo 
                SET TotalExecutar = ? 
                WHERE IdMaterialProcesso = (
                    SELECT id FROM (
                        SELECT IdMaterialProcesso AS id 
                        FROM material_processo 
                        WHERE ${subWhere}
                        ORDER BY SequenciaExecucao ASC LIMIT 1
                    ) as subquery
                )
            `;
            const paramsQtd = [qtde, ...subParams];
            await req.tenantDbPool.execute(sqlQtd, paramsQtd);
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Erro ao atualizar tempos:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/ordemservico/:id/incluir-itens', tenantMiddleware, async (req, res) => {
    let conn = null;
    try {
        const osId = req.params.id;
        const { itensSelecionados } = req.body;
        
        if (!itensSelecionados || !itensSelecionados.length) {
            return res.status(400).json({ success: false, message: 'Nenhum item selecionado.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [osRows] = await conn.execute(`SELECT IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag, IdEmpresa, DescEmpresa, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?`, [osId]);
        if (osRows.length === 0) throw new Error('OS não encontrada');
        if (osRows[0].Liberado_Engenharia === 'S' || osRows[0].Liberado_Engenharia === 'SIM') {
            throw new Error('OS já liberada, não pode incluir itens');
        }
        const osData = osRows[0];

        let adicionados = 0;
        
        for (const idItem of itensSelecionados) {
            const [itemRows] = await conn.execute(`SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`, [idItem]);
            if (itemRows.length === 0) continue;
            
            const original = itemRows[0];
            
            const [existRows] = await conn.execute(
                `SELECT IdOrdemServicoItem FROM ordemservicoitem WHERE IdOrdemServico = ? AND CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [osId, original.CodMatFabricante]
            );
            if (existRows.length > 0) continue;

            // Validar: item deve ter Espessura e MaterialSW preenchidos
            const semEspessura = !original.Espessura || String(original.Espessura).trim() === '';
            const semMaterialSW = !original.MaterialSW || String(original.MaterialSW).trim() === '';
            if (semEspessura || semMaterialSW) {
                const campos = [];
                if (semEspessura) campos.push('Espessura');
                if (semMaterialSW) campos.push('MaterialSW');
                throw new Error('Item "' + (original.CodMatFabricante || original.IdOrdemServicoItem) + '" não possui ' + campos.join(' e ') + ' preenchido(s). Verifique o cadastro do material antes de incluir na OS.');
            } 

            // Validar e carregar peso/área unitários com fallback da tabela material
            let pesoUnit = Number(original.PesoUnitario) || 0;
            if (pesoUnit === 0) {
                pesoUnit = Number(original.Peso) || 0;
            }
            let areaUnit = Number(original.AreaPinturaUnitario) || 0;
            if (areaUnit === 0) {
                areaUnit = Number(original.AreaPintura) || 0;
            }

            if (pesoUnit === 0 || areaUnit === 0) {
                const [matRows] = await conn.execute(
                    `SELECT Peso, AreaPintura FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                    [original.CodMatFabricante]
                );
                if (matRows.length > 0) {
                    if (pesoUnit === 0 && matRows[0].Peso) {
                        pesoUnit = Number(matRows[0].Peso) || 0;
                    }
                    if (areaUnit === 0 && matRows[0].AreaPintura) {
                        areaUnit = Number(matRows[0].AreaPintura) || 0;
                    }
                }
            }

            const colsToCopy = [
                'IdProjeto', 'Projeto', 'IdTag', 'Tag', 'DescTag', 'IdMaterial', 'DescResumo', 'DescDetal', 'Autor',
                'Palavrachave', 'Notas', 'Espessura', 'AreaPintura', 'NumeroDobras', 'Peso', 'Unidade', 'UnidadeSW', 'ValorSW',
                'Altura', 'Largura', 'CodMatFabricante', 'EnderecoArquivo', 'MaterialSW', 'QtdeTotal', 'Fator', 'qtde',
                'txtSoldagem', 'txtTipoDesenho', 'txtCorte', 'txtDobra', 'txtSolda', 'txtPintura', 'TxtMontagem',
                'Comprimentocaixadelimitadora', 'Larguracaixadelimitadora', 'Espessuracaixadelimitadora',
                'AreaPinturaUnitario', 'PesoUnitario', 'txtItemEstoque', 'ProdutoPrincipal', 'IdEmpresa', 'DescEmpresa', 'NumeroOpOmie'
            ];

            // ── Busca caminho base SolidWorks nas configuracoes do tenant ──────────
            // Chave esperada: 'path_solidworks'  |  Fallback: padrao do banco lynxlocal
            let swBasePath = 'G:\\MEU DRIVE\\04-ARQUIVOS SOLIDWORKS';
            try {
                const [cfgRows] = await conn.execute(
                    `SELECT valor FROM configuracoes_internas WHERE chave = 'path_solidworks' LIMIT 1`
                );
                if (cfgRows.length > 0 && cfgRows[0].valor) {
                    swBasePath = cfgRows[0].valor.trim().replace(/[\\/]+$/, ''); // remove trailing slash
                }
            } catch(e) { /* tabela pode nao existir em todos os tenants — usa fallback */ }

            // Determina sufixo: CONJUNTO → .SLDASM, demais → .SLDPRT
            const tipoDesenho = (original.txtTipoDesenho || '').trim().toUpperCase();
            const sufixoSW = (tipoDesenho === 'CONJUNTO') ? '.SLDASM' : '.SLDPRT';
            const codMat = (original.CodMatFabricante || '').trim();

            // Gera o EnderecoArquivo calculado
            const enderecoCalculado = codMat
                ? `${swBasePath}\\${codMat}${sufixoSW}`
                : null;

            console.log(`[INCLUIR-ITEM] ${codMat} | TipoDesenho: "${tipoDesenho}" | Sufixo: ${sufixoSW} | Endereco: ${enderecoCalculado}`);
            // ─────────────────────────────────────────────────────────────────────

            const cols = colsToCopy.filter(c => original[c] !== undefined);
            const vals = cols.map(c => {
                if (c === 'IdProjeto') return osData.IdProjeto;
                if (c === 'Projeto') return osData.Projeto;
                if (c === 'IdTag') return osData.IdTag;
                if (c === 'Tag') return osData.Tag;
                if (c === 'DescTag') return osData.DescTag;
                if (c === 'IdEmpresa') return osData.IdEmpresa;
                if (c === 'DescEmpresa') return osData.DescEmpresa;
                if (c === 'qtde') {
                    return Number(original.qtde) || Number(original.QtdeTotal) || 1;
                }
                if (c === 'PesoUnitario') {
                    return pesoUnit;
                }
                if (c === 'AreaPinturaUnitario') {
                    return areaUnit;
                }
                if (c === 'Peso') {
                    const qtdeTotal = Number(original.QtdeTotal) || 0;
                    const fator = Number(original.Fator) || 1;
                    const fatorMultiplier = fator <= 0 ? 1 : fator;
                    return pesoUnit * qtdeTotal * fatorMultiplier;
                }
                if (c === 'AreaPintura') {
                    const qtdeTotal = Number(original.QtdeTotal) || 0;
                    const fator = Number(original.Fator) || 1;
                    const fatorMultiplier = fator <= 0 ? 1 : fator;
                    return areaUnit * qtdeTotal * fatorMultiplier;
                }
                // ── Gera EnderecoArquivo se vazio ou marcador de importacao ───────
                if (c === 'EnderecoArquivo') {
                    const atual = original[c] || '';
                    const invalido = !atual || atual.trim() === '' || atual.trim().toUpperCase() === 'IMPORTADO DA PLANILHA';
                    return (invalido ? enderecoCalculado : atual).toUpperCase();
                }
                // ─────────────────────────────────────────────────────────────────
                return original[c];
            });
            
            const sqlInsert = `
                INSERT INTO ordemservicoitem (
                    IdOrdemServico, UsuarioCriacao, CriadoPor, DataCriacao, 
                    Liberado_Engenharia,
                    ${cols.join(', ')}
                ) VALUES (
                    ?, 'Sistema', 'Sistema', NOW(),
                    'N',
                    ${cols.map(()=>'é').join(', ')}
                )
            `;
            
            const [insertRes] = await conn.execute(sqlInsert, [osId, ...vals]);
            await inicializarPrimeiroSetor(conn, insertRes.insertId);
            
            adicionados++;
        }

        await recalcularQuantidadesTotais(osId, conn);

        await conn.commit();
        res.json({ success: true, message: `${adicionados} itens incluídos com sucesso!`, adicionados });
    } catch (e) {
        if (conn) await conn.rollback();
        res.status(500).json({ success: false, message: e.message || 'Erro ao incluir itens' });
    } finally {
        if (conn) conn.release();
    }
});

app.get('/api/ordemservico/:id/itens-codigos', tenantMiddleware, async (req, res) => {
    try {
        const osId = req.params.id;
        const [rows] = await req.tenantDbPool.execute(`
            SELECT DISTINCT CodMatFabricante 
            FROM ordemservicoitem 
            WHERE IdOrdemServico = ? 
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `, [osId]);
        
        const codigos = rows.map(r => r.CodMatFabricante).filter(Boolean);
        res.json({ success: true, codigos });
    } catch (e) {
        console.error('Erro ao buscar codigos na OS:', e);
        res.status(500).json({ success: false, message: 'Erro ao buscar codigos na OS', error: e.message });
    }
});

app.post('/api/ordemservico/:id/incluir-materiais-dinamico', tenantMiddleware, async (req, res) => {
    let conn = null;
    try {
        const osId = req.params.id;
        const { itensSelecionados, osContext } = req.body;
        
        if (!itensSelecionados || !itensSelecionados.length) {
            return res.status(400).json({ success: false, message: 'Nenhum material selecionado.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [osRows] = await conn.execute(`SELECT IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag, IdEmpresa, DescEmpresa, Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?`, [osId]);
        if (osRows.length === 0) throw new Error('OS não encontrada');
        if (osRows[0].Liberado_Engenharia === 'S' || osRows[0].Liberado_Engenharia === 'SIM') {
            throw new Error('OS já liberada, não pode incluir materiais');
        }
        const osData = osRows[0];

        // Helper para checar e criar colunas dinamicamente
        async function ensureColumns(tableName, columnsToEnsure) {
            const [colRows] = await conn.execute(`SHOW COLUMNS FROM ${tableName}`);
            const existingCols = colRows.map(r => r.Field.toLowerCase());
            for (const col of columnsToEnsure) {
                if (!existingCols.includes(col.name.toLowerCase())) {
                    try {
                        await conn.execute(`ALTER TABLE ${tableName} ADD COLUMN \`${col.name}\` ${col.type}`);
                    } catch(e) {
                        console.error(`Erro ao adicionar coluna ${col.name} em ${tableName}:`, e.message);
                    }
                }
            }
        }

        const sectorsList = ['Corte', 'Dobra', 'Solda', 'Pintura', 'Montagem', 'CorteaLaser', 'Punsionadeira', 'Galvanizar', 'Engenharia'];

        function getSectorKey(procName) {
            const norm = (procName || '').trim().toUpperCase().replace(/\s+/g, '');
            if (norm.includes('CORTEALASER') || norm.includes('CORTELASER') || norm.includes('LASER')) return 'CorteaLaser';
            if (norm.includes('PUNSIONADEIRA') || norm.includes('PUNCIONADEIRA')) return 'Punsionadeira';
            if (norm.includes('GALVANIZAR')) return 'Galvanizar';
            if (norm.includes('ENGENHARIA')) return 'Engenharia';
            if (norm.includes('CORTE')) return 'Corte';
            if (norm.includes('DOBRA')) return 'Dobra';
            if (norm.includes('SOLDA')) return 'Solda';
            if (norm.includes('PINTURA')) return 'Pintura';
            if (norm.includes('MONTAGEM')) return 'Montagem';
            return null;
        }

        let adicionados = 0;
        
        for (const item of itensSelecionados) {
            const { codmatfabricante, qtde, acabamento, tempoSetup, tempoPadrao, totalTempo, fator, recursoTempos } = item;
            
            const [matRows] = await conn.execute(
                `SELECT * FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1`,
                [codmatfabricante]
            );
            
            if (matRows.length === 0) continue;
            const mat = matRows[0];
            
            const qtdeTotalNum = Number(qtde) || 1;
            const fatorNum = Math.max(1, parseInt(String(fator), 10) || 1);
            const pesoUnit = Number(mat.Peso) || 0;
            const areaUnit = Number(mat.AreaPintura) || 0;


        let itemSumSetup = 0;
        let itemSumPadrao = 0;
        let itemSumTotal = 0;

        if (recursoTempos && typeof recursoTempos === 'object') {
            for (const [secKey, recVal] of Object.entries(recursoTempos)) {
                if (!recVal) continue;
                const rSetup = Math.max(0, parseInt(String(recVal.tempoSetup), 10) || 0);
                const rPadrao = Math.max(0, parseInt(String(recVal.tempoPadrao), 10) || 0);
                const rTotalTempo = (rPadrao * qtdeTotalNum) + rSetup;

                itemSumSetup += rSetup;
                itemSumPadrao += rPadrao;
                itemSumTotal += rTotalTempo;
            }
        }

        const itemGlobalSetup = Number(tempoSetup) || itemSumSetup;
        const itemGlobalPadrao = Number(tempoPadrao) || itemSumPadrao;
        const itemGlobalTotal = Number(totalTempo) || (itemSumTotal > 0 ? itemSumTotal : ((itemGlobalPadrao * qtdeTotalNum) + itemGlobalSetup));

        await ensureColumns('ordemservicoitem', [
            { name: 'TempoSetup', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'TempoPadrao', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'TotalTempo', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'qtde', type: 'DECIMAL(10,2) DEFAULT 1' },
            { name: 'Fator', type: 'INT DEFAULT 1' }
        ]);

        const cols = [
            'IdOrdemServico', 'CodMatFabricante', 'DescResumo', 'DescDetal', 'QtdeTotal', 'qtde',
            'Acabamento', 'Peso', 'AreaPintura', 'Espessura', 'Altura', 'Largura',
            'Unidade', 'MaterialSW', 'EnderecoArquivo', 'ProdutoPrincipal',
            'IdProjeto', 'IdTag', 'Projeto', 'Tag', 'DescTag', 'IdEmpresa', 'DescEmpresa',
            'UsuarioCriacao', 'CriadoPor', 'DataCriacao', 'Liberado_Engenharia', 'Fator',
            'TempoSetup', 'TempoPadrao', 'TotalTempo'
        ];

        const vals = [
            osId, codmatfabricante, mat.DescResumo, mat.DescDetal, qtdeTotalNum, qtdeTotalNum,
            acabamento, (pesoUnit * qtdeTotalNum), (areaUnit * qtdeTotalNum), mat.Espessura, mat.Altura, mat.Largura,
            mat.Unidade, mat.MaterialSW, mat.EnderecoArquivo, mat.ProdutoPrincipal,
            osData.IdProjeto || osContext?.IdProjeto || null, osData.IdTag || osContext?.IdTag || null, osData.Projeto || osContext?.Projeto || null,
            osData.Tag || osContext?.Tag || null, osData.DescTag || osContext?.DescTag || null, osData.IdEmpresa || osContext?.IdEmpresa || null, osData.DescEmpresa || osContext?.DescEmpresa || null,
            'Sistema', 'Sistema', new Date(), 'N', fatorNum,
            itemGlobalSetup, itemGlobalPadrao, itemGlobalTotal
        ];

        const sqlInsert = `
            INSERT INTO ordemservicoitem (${cols.map(c => `\`${c}\``).join(', ')})
            VALUES (${cols.map(()=>'?').join(', ')})
        `;

        const [insertRes] = await conn.execute(sqlInsert, vals);

        if (recursoTempos && typeof recursoTempos === 'object') {
            let seq = 1;
            for (const [secKey, recVal] of Object.entries(recursoTempos)) {
                if (!recVal) continue;
                const rSetup = Math.max(0, parseInt(String(recVal.tempoSetup), 10) || 0);
                const rPadrao = Math.max(0, parseInt(String(recVal.tempoPadrao), 10) || 0);

                const [procIds] = await conn.execute(`SELECT IdProcessoFabricacao FROM processofabricacao WHERE REPLACE(processofabricacao, ' ', '') = ? LIMIT 1`, [secKey]);
                if (procIds.length > 0) {
                    const idProcesso = procIds[0].IdProcessoFabricacao;
                    await conn.execute(
                        `INSERT INTO material_processo (
                            IdMaterial, codmatFabricante, IdProcesso, SequenciaExecucao, 
                            TempoEstimadoMin, TempoPadraoMin, TotalExecutar, Ativo, 
                            UsuarioCriacao, DataCriacao, IdOrdemServico, IdProjeto, IdTag
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'A', 'Sistema', NOW(), ?, ?, ?)`,
                        [
                            mat.IdMaterial, codmatfabricante, idProcesso, seq,
                            rSetup, rPadrao, qtdeTotalNum,
                            osId, osData.IdProjeto || osContext?.IdProjeto || null, osData.IdTag || osContext?.IdTag || null
                        ]
                    );
                    seq++;
                }
            }
        }

            
            adicionados++;
        }

        await recalcularQuantidadesTotais(osId, conn);

        await conn.commit();
        res.json({ success: true, message: `${adicionados} materiais incluídos com sucesso!`, adicionados });
    } catch (e) {
        if (conn) await conn.rollback();
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao incluir materiais' });
    } finally {
        if (conn) conn.release();
    }
});

// --- Apontamento de Produ??o ---

// Mapeamento de setores para colunas
const setorColumns = {
    corte:         { txt: 'txtCorte',         percentual: 'CortePercentual',         status: 'sttxtCorte',         total: 'CorteTotalExecutado',         executar: 'CorteTotalExecutar',         inicio: 'RealizadoInicioCorte',         final: 'RealizadoFinalCorte',         userInicio: 'UsuarioRealizadoInicioCorte',         userFinal: 'UsuarioRealizadoFinalCorte'         },
    dobra:         { txt: 'txtDobra',         percentual: 'DobraPercentual',         status: 'sttxtDobra',         total: 'DobraTotalExecutado',         executar: 'DobraTotalExecutar',         inicio: 'RealizadoInicioDobra',         final: 'RealizadoFinalDobra',         userInicio: 'UsuarioRealizadoInicioDobra',         userFinal: 'UsuarioRealizadoFinalDobra'         },
    solda:         { txt: 'txtSolda',         percentual: 'SoldaPercentual',         status: 'sttxtSolda',         total: 'SoldaTotalExecutado',         executar: 'SoldaTotalExecutar',         inicio: 'RealizadoInicioSolda',         final: 'RealizadoFinalSolda',         userInicio: 'UsuarioRealizadoInicioSolda',         userFinal: 'UsuarioRealizadoFinalSolda'         },
    pintura:       { txt: 'txtPintura',       percentual: 'PinturaPercentual',       status: 'sttxtPintura',       total: 'PinturaTotalExecutado',       executar: 'PinturaTotalExecutar',       inicio: 'RealizadoInicioPintura',       final: 'RealizadoFinalPintura',       userInicio: 'UsuarioRealizadoInicioPintura',       userFinal: 'UsuarioRealizadoFinalPintura'       },
    montagem:      { txt: 'TxtMontagem',      percentual: 'MontagemPercentual',      status: 'sttxtMontagem',      total: 'MontagemTotalExecutado',      executar: 'MontagemTotalExecutar',      inicio: 'RealizadoInicioMontagem',      final: 'RealizadoFinalMontagem',      userInicio: 'UsuarioRealizadoInicioMontagem',      userFinal: 'UsuarioRealizadoFinalMontagem'      },
    galvanizar:    { txt: 'txtGALVANIZAR',    percentual: 'GALVANIZARPercentual',    status: 'sttxtGALVANIZAR',    total: 'GALVANIZARTotalExecutado',    executar: 'GALVANIZARTotalExecutar',    inicio: 'RealizadoInicioGALVANIZAR',    final: 'RealizadoFinalGALVANIZAR',    userInicio: 'UsuarioRealizadoInicioGALVANIZAR',    userFinal: 'UsuarioRealizadoFinalGALVANIZAR'    },
    punsionadeira: { txt: 'txtPUNSIONADEIRA', percentual: 'PUNSIONADEIRAPercentual', status: 'sttxtPUNSIONADEIRA', total: 'PUNSIONADEIRATotalExecutado', executar: 'PUNSIONADEIRATotalExecutar', inicio: 'RealizadoInicioPUNSIONADEIRA', final: 'RealizadoFinalPUNSIONADEIRA', userInicio: 'UsuarioRealizadoInicioPUNSIONADEIRA', userFinal: 'UsuarioRealizadoFinalPUNSIONADEIRA' },
    mapa:          { txt: 'txtCorte',         percentual: 'CortePercentual',         status: 'sttxtCorte',         total: 'CorteTotalExecutado',         executar: 'CorteTotalExecutar',         inicio: 'RealizadoInicioCorte',         final: 'RealizadoFinalCorte',         userInicio: 'UsuarioRealizadoInicioCorte',         userFinal: 'UsuarioRealizadoFinalCorte'         }
};

// -----------------------------------------------------------------------------
// RESOLU��O DIN�MICA DE RECURSOS
// Quando um novo recurso � cadastrado no banco, esta fun��o tenta construir
// o mapeamento de colunas automaticamente a partir do padr�o de nomenclatura.
// Cache evita m�ltiplas consultas SHOW COLUMNS para o mesmo recurso.
// -----------------------------------------------------------------------------
const _setorConfigCache = {};


/**
 * Atualiza o campo [recurso]MinProd em forma de cascata nos 4 níveis hierárquicos:
 * ordemservicoitem -> ordemservico -> tags -> projetos
 */
async function atualizarMinProdCascata(conn, idItem, processoKey, inputQty, operacao = 'ADD') {
    try {
        if (!idItem || !processoKey || !inputQty || inputQty <= 0) return;

        let rawName = String(processoKey).trim();
        let recName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const normalizedRawName = rawName.toLowerCase().replace(/\s+/g, '');
        if (normalizedRawName === 'montagem') recName = 'Montagem';
        else if (normalizedRawName === 'corte') recName = 'Corte';
        else if (normalizedRawName === 'dobra') recName = 'Dobra';
        else if (normalizedRawName === 'solda') recName = 'Solda';
        else if (normalizedRawName === 'pintura') recName = 'Pintura';
        else if (normalizedRawName === 'galvanizar') recName = 'Galvanizar';
        else if (normalizedRawName === 'punsionadeira') recName = 'Punsionadeira';
        else if (normalizedRawName === 'cortealaser' || normalizedRawName === 'laser') recName = 'CorteaLaser';

        const minProdCol = `${recName}MinProd`;
        const txtCol1 = `txt${recName}`;
        const txtCol2 = `txt${rawName}`;

        const [itemRows] = await conn.execute(
            `SELECT osi.*, os.IdOrdemServico, os.IdTag, os.Tag, os.IdProjeto, os.Projeto
             FROM ordemservicoitem osi
             INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
             WHERE osi.IdOrdemServicoItem = ?`,
            [idItem]
        );
        if (!itemRows || itemRows.length === 0) return;
        const item = itemRows[0];

        const tempoPadrao = parseFloat(item[txtCol1] || item[txtCol2] || item[`txt${recName.toUpperCase()}`]) || 0;
        const totalprod = Math.round(tempoPadrao * inputQty);

        if (totalprod <= 0) return;

        const valModifier = operacao === 'SUB' ? `- ${totalprod}` : `+ ${totalprod}`;

        const queryItem = `UPDATE ordemservicoitem SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE IdOrdemServicoItem = ?`;
        const queryOS   = `UPDATE ordemservico SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE IdOrdemServico = ?`;

        await conn.execute(queryItem, [idItem]).catch(e => console.warn(`[MinProd Warning Item] ${e.message}`));

        if (item.IdOrdemServico) {
            await conn.execute(queryOS, [item.IdOrdemServico]).catch(e => console.warn(`[MinProd Warning OS] ${e.message}`));
        }

        if (item.IdTag) {
            await conn.execute(`UPDATE tags SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE IdTag = ?`, [item.IdTag]).catch(e => console.warn(`[MinProd Warning Tag] ${e.message}`));
        } else if (item.Tag) {
            await conn.execute(`UPDATE tags SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE Tag = ?`, [item.Tag]).catch(e => console.warn(`[MinProd Warning Tag] ${e.message}`));
        }

        if (item.IdProjeto) {
            await conn.execute(`UPDATE projetos SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE IdProjeto = ?`, [item.IdProjeto]).catch(e => console.warn(`[MinProd Warning Proj] ${e.message}`));
        } else if (item.Projeto) {
            await conn.execute(`UPDATE projetos SET \`${minProdCol}\` = GREATEST(0, COALESCE(\`${minProdCol}\`, 0) ${valModifier}) WHERE Projeto = ?`, [item.Projeto]).catch(e => console.warn(`[MinProd Warning Proj] ${e.message}`));
        }

        console.log(`[MinProd Cascata] ${operacao} | ${minProdCol} | Item=${idItem} | totalprod=${totalprod} (tempoPadrao=${tempoPadrao} * qtde=${inputQty})`);
    } catch (err) {
        console.error('[MinProd Cascata Erro]', err.message);
    }
}

async function resolveSetorConfig(processo, conn) {
    const key = String(processo).trim().toUpperCase();

    // 1. Cache hit
    if (_setorConfigCache[key] !== undefined) {
        if (_setorConfigCache[key] === null) {
            console.warn(`[RECURSO_NAO_MAPEADO] Processo '${key}' n�o possui colunas no banco � opera��o ignorada.`);
        }
        return _setorConfigCache[key];
    }

    // 2. Verificar no setorColumns est�tico (chave min�scula)
    const keyLower = key.toLowerCase();
    if (setorColumns[keyLower]) {
        _setorConfigCache[key] = setorColumns[keyLower];
        return setorColumns[keyLower];
    }

    // 3. Resolu��o din�mica: verificar se as colunas existem no banco
    try {
        const dbConn = conn || pool;
        const [cols] = await dbConn.execute(
            "SHOW COLUMNS FROM ordemservicoitem WHERE Field IN (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                `txt${key}`,
                `sttxt${key}`,
                `${key}TotalExecutado`,
                `${key}TotalExecutar`,
                `${key}Percentual`,
                `RealizadoInicio${key}`,
                `RealizadoFinal${key}`,
                `UsuarioRealizadoInicio${key}`
            ]
        );

        const found = cols.map(c => c.Field);
        const hasTxt         = found.includes(`txt${key}`);
        const hasTotal       = found.includes(`${key}TotalExecutado`);
        const hasExecutar    = found.includes(`${key}TotalExecutar`);

        if (hasTotal && hasExecutar) {
            const config = {
                txt:        hasTxt ? `txt${key}` : null,
                percentual: found.includes(`${key}Percentual`)           ? `${key}Percentual`                     : null,
                status:     found.includes(`sttxt${key}`)                ? `sttxt${key}`                          : null,
                total:      `${key}TotalExecutado`,
                executar:   `${key}TotalExecutar`,
                inicio:     found.includes(`RealizadoInicio${key}`)      ? `RealizadoInicio${key}`                : null,
                final:      found.includes(`RealizadoFinal${key}`)       ? `RealizadoFinal${key}`                 : null,
                userInicio: found.includes(`UsuarioRealizadoInicio${key}`)? `UsuarioRealizadoInicio${key}`        : null,
                userFinal:  null
            };
            _setorConfigCache[key] = config;
            console.log(`[RECURSO_DINAMICO] Processo '${key}' resolvido dinamicamente. Colunas encontradas: ${found.join(', ')}`);
            return config;
        }

        // Colunas n�o existem no banco
        _setorConfigCache[key] = null;
        console.warn(`[RECURSO_NAO_MAPEADO] Processo '${key}' � colunas ${key}TotalExecutado / ${key}TotalExecutar n�o existem no banco. Opera��o ignorada sem erro.`);
        return null;

    } catch (err) {
        _setorConfigCache[key] = null;
        console.error(`[RECURSO_ERRO] Falha ao resolver dinamicamente o processo '${key}': ${err.message}`);
        return null;
    }
}

/**
 * Após inserir um ordemservicoitem, atualiza o campo TotalExecutar
 * do PRIMEIRO setor que tiver processo (txt* = '1' ou 'S') com o valor de QtdeTotal.
 * Agora suporta qualquer setor dinâmico da base de dados.
 *
 * @param {object} conn  - conexão ativa (pool ou connection)
 * @param {number} id    - IdOrdemServicoItem recém-inserido
 */
async function inicializarPrimeiroSetor(conn, id) {
    try {
        const [rows] = await conn.execute(
            `SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = ? LIMIT 1`,
            [id]
        );
        if (!rows || rows.length === 0) return;

        const item = rows[0];
        const qtde = parseFloat(item.QtdeTotal ?? item.qtdetotal) || 0;
        if (qtde <= 0) return;

        // Ordem base de processos da indústria
        const sequenciaSetores = [
            'ENGENHARIA', 'ISOMETRICO', 'MEDICAO', 'Corte', 'CorteaLaser',
            'CortePuncionadeira', 'CorteSerradeFita', 'CorteLaser', 'Usinagem',
            'PUNCIONADEIRA', 'SERRADEFITA', 'Dobra', 'CALDEIRARIA', 'SERRALHERIA',
            'Solda', 'SoldaaLaser', 'SoldaMig', 'SoldaTg', 'Pintura', 'Montagem',
            'ACABAMENTO', 'APROVACAO', 'APROVAÇÃO'
        ];

        let primeiroSetor = null;
        for (const sec of sequenciaSetores) {
            const txtField = `txt${sec}`;
            const val = item[txtField];
            if (String(val).trim() === '1' || String(val).trim().toUpperCase() === 'S') {
                primeiroSetor = sec;
                break;
            }
        }

        if (!primeiroSetor) return; // nenhum setor com processo

        const campoAExecutar = `${primeiroSetor}TotalExecutar`;

        // Verifica se a coluna existe e se já está preenchida
        if (item[campoAExecutar] !== undefined && (item[campoAExecutar] === null || item[campoAExecutar] === '' || item[campoAExecutar] == 0)) {
            await conn.execute(
                `UPDATE ordemservicoitem SET \`${campoAExecutar}\` = ? WHERE IdOrdemServicoItem = ?`,
                [qtde, id]
            );
        }

        console.log(`[inicializarPrimeiroSetor] Item ${id}: ${campoAExecutar} = ${qtde}`);
    } catch (err) {
        console.error(`[inicializarPrimeiroSetor] Erro ao inicializar item ${id}:`, err.message);
    }
}

// GET: Mapa da Produ??o - vis?o geral de todos os processos
require('./routes/rota2')(app, tenantMiddleware);

// GET /api/apontamento/mapa/producao
// [ROTA 2 - NOVA LÓGICA] Usa material_processo como fonte de verdade dos recursos.
// Exibe itens de OS que possuem ao menos 1 registro em material_processo.
app.get('/api/apontamento/mapa/producao', tenantMiddleware, async (req, res) => {
    const { projeto, tag, os, item, status, codMatFabricante, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
        // Base: item não deletado, liberado pela engenharia, OS não deletada
        // e com ao menos 1 processo em material_processo
        let whereClause = `
            (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_Engenharia = 'S'
            AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
            AND EXISTS (
                SELECT 1 FROM material_processo mp
                WHERE mp.IdOrdemServico = osi.IdOrdemServico
                  AND mp.codmatFabricante = osi.CodMatFabricante
            )
        `;
        const params = [];

        if (projeto) {
            whereClause += ' AND (os.Projeto LIKE ? OR p.DescProjeto LIKE ?)';
            params.push(`%${projeto}%`, `%${projeto}%`);
        }
        if (tag) {
            whereClause += ' AND (os.DescTag LIKE ? OR os.Tag LIKE ?)';
            params.push(`%${tag}%`, `%${tag}%`);
        }
        if (os) {
            whereClause += ' AND os.IdOrdemServico = ?';
            params.push(os);
        }
        if (item) {
            whereClause += ' AND osi.IdOrdemServicoItem = ?';
            params.push(item);
        }
        if (req.query.planoCorte) {
            whereClause += ' AND osi.IdPlanodecorte LIKE ?';
            params.push(`%${req.query.planoCorte}%`);
        }
        if (req.query.cliente) {
            whereClause += ' AND (os.DescEmpresa LIKE ? OR p.ClienteProjeto LIKE ?)';
            params.push(`%${req.query.cliente}%`, `%${req.query.cliente}%`);
        }
        if (codMatFabricante) {
            whereClause += ' AND osi.CodMatFabricante LIKE ?';
            params.push(`%${codMatFabricante}%`);
        }
        if (req.query.dataPlanejamentoInicio) {
            whereClause += ` AND EXISTS (SELECT 1 FROM material_processo mpd WHERE mpd.IdOrdemServico = osi.IdOrdemServico AND mpd.codmatFabricante = osi.CodMatFabricante AND DATE(mpd.PlanejadoInicio) >= ?)`;
            params.push(req.query.dataPlanejamentoInicio);
        }
        if (req.query.dataPlanejamentoFim) {
            whereClause += ` AND EXISTS (SELECT 1 FROM material_processo mpd WHERE mpd.IdOrdemServico = osi.IdOrdemServico AND mpd.codmatFabricante = osi.CodMatFabricante AND DATE(mpd.PlanejadoInicio) <= ?)`;
            params.push(req.query.dataPlanejamentoFim);
        }

        // Filtro status: pendente = ao menos 1 processo com TotalExecutar > 0 ou RealizadoFinal NULL
        if (status === 'pendente') {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM material_processo mps
                WHERE mps.IdOrdemServico = osi.IdOrdemServico
                  AND mps.codmatFabricante = osi.CodMatFabricante
                  AND (mps.TotalExecutado IS NULL OR mps.TotalExecutado < mps.TotalExecutar OR mps.RealizadoFinal IS NULL)
            )`;
        } else if (status === 'concluido') {
            whereClause += ` AND NOT EXISTS (
                SELECT 1 FROM material_processo mps
                WHERE mps.IdOrdemServico = osi.IdOrdemServico
                  AND mps.codmatFabricante = osi.CodMatFabricante
                  AND (mps.TotalExecutado IS NULL OR mps.TotalExecutado < mps.TotalExecutar OR mps.RealizadoFinal IS NULL)
            )`;
        }

        const [countResult] = await req.tenantDbPool.execute(`
            SELECT COUNT(DISTINCT osi.IdOrdemServicoItem) as total
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
        `, params);
        const total = countResult[0].total;

        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                osi.IdOrdemServicoItem,
                osi.IdOrdemServico,
                osi.CodMatFabricante,
                osi.DescResumo,
                osi.DescDetal,
                osi.QtdeTotal,
                osi.EnderecoArquivo,
                osi.EnderecoArquivoItemOrdemServico,
                osi.IdPlanodecorte as PlanoCorte,
                osi.MaterialSW,
                osi.Espessura,
                osi.ProdutoPrincipal as IsProdutoPrincipal,
                (SELECT DescResumo FROM ordemservicoitem WHERE IdOrdemServico = osi.IdOrdemServico AND ProdutoPrincipal = 'sim' LIMIT 1) as NomeProdutoPrincipal,
                os.Projeto,
                os.IdProjeto,
                p.DescProjeto,
                os.Tag,
                os.IdTag,
                os.DescTag,
                CASE WHEN TRIM(COALESCE(os.DescEmpresa, '')) IN ('', 'Sem cliente', 'Sem Cliente', 'SEM CLIENTE') THEN p.ClienteProjeto ELSE os.DescEmpresa END as Cliente,
                os.Estatus AS StatusOS,
                os.OrdemServicoFinalizado AS OSFinalizado,
                p.Finalizado AS StatusProjeto,
                -- Agrega todos os recursos via material_processo
                COALESCE((
                    SELECT SUM(COALESCE(mp.TotalExecutado, 0))
                    FROM material_processo mp
                    WHERE mp.IdOrdemServico = osi.IdOrdemServico AND mp.codmatFabricante = osi.CodMatFabricante
                ), 0) AS QtdeProduzidaSetor,
                COALESCE((
                    SELECT SUM(COALESCE(mp.TotalExecutar, osi.QtdeTotal))
                    FROM material_processo mp
                    WHERE mp.IdOrdemServico = osi.IdOrdemServico AND mp.codmatFabricante = osi.CodMatFabricante
                ), osi.QtdeTotal) AS TotalExecutar,
                COALESCE((
                    SELECT CASE WHEN SUM(COALESCE(mp.TotalExecutar, 0)) > 0
                        THEN ROUND((SUM(COALESCE(mp.TotalExecutado, 0)) / SUM(COALESCE(mp.TotalExecutar, 0))) * 100)
                        ELSE 0 END
                    FROM material_processo mp
                    WHERE mp.IdOrdemServico = osi.IdOrdemServico AND mp.codmatFabricante = osi.CodMatFabricante
                ), 0) AS PercentualSetor,
                -- Tooltip com todos os recursos do item
                (
                    SELECT GROUP_CONCAT(CONCAT(COALESCE(mp2.SequenciaExecucao,'?'), 'º: ', COALESCE(pf.processofabricacao,'?')) ORDER BY COALESCE(mp2.SequenciaExecucao, 999) SEPARATOR ' | ')
                    FROM material_processo mp2
                    LEFT JOIN processofabricacao pf ON pf.IdProcessoFabricacao = mp2.IdProcesso
                    WHERE mp2.IdOrdemServico = osi.IdOrdemServico AND mp2.codmatFabricante = osi.CodMatFabricante
                ) AS TodosRecursosTooltip,
                -- Data de planejamento do primeiro processo
                (
                    SELECT mp3.PlanejadoInicio FROM material_processo mp3
                    WHERE mp3.IdOrdemServico = osi.IdOrdemServico AND mp3.codmatFabricante = osi.CodMatFabricante
                    ORDER BY COALESCE(mp3.SequenciaExecucao, 999) ASC LIMIT 1
                ) AS DataPlanejamento
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
            ORDER BY osi.IdOrdemServico DESC, osi.IdOrdemServicoItem
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, params);

        res.json({ 
            success: true, 
            data: rows,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching mapa producao (Rota 2):', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar mapa de produção', error: error.message });
    }
});

app.get('/api/apontamento/planejamento/diario', tenantMiddleware, async (req, res) => {
    try {
        const { planInicioDe, planInicioAte, planFimDe, planFimAte, setor, os, limit } = req.query;
        let query = `
            SELECT 
                oi.IdOrdemServicoItem, oi.IdOrdemServico, oi.Projeto, oi.Tag, oi.CodMatFabricante, oi.DescResumo, oi.QtdeTotal, oi.qtde,
                os.Descricao as OSDescricao,
                COALESCE(oi.PlanejadoInicioCorte, os.PlanejadoInicioCorte) as PlanejadoInicioCorte,
                COALESCE(oi.PlanejadoFinalCorte, os.PlanejadoFinalCorte) as PlanejadoFinalCorte,
                COALESCE(oi.PlanejadoInicioDobra, os.PlanejadoInicioDobra) as PlanejadoInicioDobra,
                COALESCE(oi.PlanejadoFinalDobra, os.PlanejadoFinalDobra) as PlanejadoFinalDobra,
                COALESCE(oi.PlanejadoInicioSolda, os.PlanejadoInicioSolda) as PlanejadoInicioSolda,
                COALESCE(oi.PlanejadoFinalSolda, os.PlanejadoFinalSolda) as PlanejadoFinalSolda,
                COALESCE(oi.PlanejadoInicioPintura, os.PlanejadoInicioPintura) as PlanejadoInicioPintura,
                COALESCE(oi.PlanejadoFinalPintura, os.PlanejadoFinalPintura) as PlanejadoFinalPintura,
                COALESCE(oi.PlanejadoInicioMontagem, os.PlanejadoInicioMontagem) as PlanejadoInicioMontagem,
                COALESCE(oi.PlanejadoFinalMontagem, os.PlanejadoFinalMontagem) as PlanejadoFinalMontagem,
                oi.txtCorte, oi.txtDobra, oi.txtSolda, oi.txtPintura, oi.TxtMontagem as txtMontagem,
                COALESCE(ctrl.CorteTotalExecutado, 0) as CorteTotalExecutado,
                COALESCE(ctrl.DobraTotalExecutado, 0) as DobraTotalExecutado,
                COALESCE(ctrl.SoldaTotalExecutado, 0) as SoldaTotalExecutado,
                COALESCE(ctrl.PinturaTotalExecutado, 0) as PinturaTotalExecutado,
                COALESCE(ctrl.MontagemTotalExecutado, 0) as MontagemTotalExecutado
            FROM ordemservicoitem oi
            JOIN ordemservico os ON oi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN (
                SELECT 
                    IdOrdemServicoItem,
                    SUM(CASE WHEN Processo = 'corte' THEN CAST(QtdeProduzida AS UNSIGNED) ELSE 0 END) as CorteTotalExecutado,
                    SUM(CASE WHEN Processo = 'dobra' THEN CAST(QtdeProduzida AS UNSIGNED) ELSE 0 END) as DobraTotalExecutado,
                    SUM(CASE WHEN Processo = 'solda' THEN CAST(QtdeProduzida AS UNSIGNED) ELSE 0 END) as SoldaTotalExecutado,
                    SUM(CASE WHEN Processo = 'pintura' THEN CAST(QtdeProduzida AS UNSIGNED) ELSE 0 END) as PinturaTotalExecutado,
                    SUM(CASE WHEN Processo = 'montagem' THEN CAST(QtdeProduzida AS UNSIGNED) ELSE 0 END) as MontagemTotalExecutado
                FROM ordemservicoitemcontrole
                WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
                GROUP BY IdOrdemServicoItem
            ) ctrl ON ctrl.IdOrdemServicoItem = oi.IdOrdemServicoItem
            WHERE (oi.D_E_L_E_T_E IS NULL OR oi.D_E_L_E_T_E = '' OR oi.D_E_L_E_T_E != '*')
              AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
        `;

        const params = [];
        
        if (os) {
            if (!isNaN(os) && os.trim() !== '') {
                query += " AND oi.IdOrdemServico = ?";
                params.push(os);
            } else {
                query += " AND (os.Descricao LIKE ? OR oi.Projeto LIKE ? OR oi.Tag LIKE ?)";
                params.push(`%${os}%`, `%${os}%`, `%${os}%`);
            }
        }

        const [rows] = await req.tenantDbPool.query(query, params);

        const normalizeDate = (d) => {
            if(!d) return null;
            if(d.includes('/')) {
                const parts = d.split(' ')[0].split('/');
                if(parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            return d.split(' ')[0];
        };

        let result = [];
        
        const processSetor = (row, s) => {
            const dtIniRaw = row[`PlanejadoInicio${s}`];
            const dtFimRaw = row[`PlanejadoFinal${s}`];
            
            const hasSetor = row[`txt${s}`] === '1' || row[`Txt${s}`] === '1' || (s==='Montagem' && row.txtMontagem === '1') || !!dtIniRaw || !!dtFimRaw;
            if(!hasSetor) return;
            if(!dtIniRaw && !dtFimRaw) return;
            
            const dtIni = normalizeDate(dtIniRaw);
            const dtFim = normalizeDate(dtFimRaw);

            let include = true;
            
            if (planInicioDe || planInicioAte) {
                if (!dtIni) { include = false; }
                else {
                    if (planInicioDe && dtIni < planInicioDe) include = false;
                    if (planInicioAte && dtIni > planInicioAte) include = false;
                }
            }

            if (planFimDe || planFimAte) {
                if (!dtFim) { include = false; }
                else {
                    if (planFimDe && dtFim < planFimDe) include = false;
                    if (planFimAte && dtFim > planFimAte) include = false;
                }
            }

            if(include) {
                result.push({
                    IdOrdemServicoItem: row.IdOrdemServicoItem,
                    IdOrdemServico: row.IdOrdemServico,
                    OSDescricao: row.OSDescricao,
                    Projeto: row.Projeto,
                    Tag: row.Tag,
                    CodMatFabricante: row.CodMatFabricante,
                    DescResumo: row.DescResumo,
                    Setor: s,
                    PlanejadoInicio: dtIniRaw,
                    PlanejadoFim: dtFimRaw,
                    QtdeTotal: Number(row.QtdeTotal) || Number(row.qtde) || 0,
                    QtdeExecutada: row[`${s}TotalExecutado`] || 0
                });
            }
        };

        rows.forEach(row => {
            if(!setor || setor === 'todos' || setor.toLowerCase() === 'corte') processSetor(row, 'Corte');
            if(!setor || setor === 'todos' || setor.toLowerCase() === 'dobra') processSetor(row, 'Dobra');
            if(!setor || setor === 'todos' || setor.toLowerCase() === 'solda') processSetor(row, 'Solda');
            if(!setor || setor === 'todos' || setor.toLowerCase() === 'pintura') processSetor(row, 'Pintura');
            if(!setor || setor === 'todos' || setor.toLowerCase() === 'montagem') processSetor(row, 'Montagem');
        });
        
        if (result.length === 0 && (planInicioDe || planInicioAte || planFimDe || planFimAte)) {
        }

        if(limit) { result = result.slice(0, parseInt(limit, 10) || 500); }
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Erro /api/apontamento/planejamento/diario:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar planejamento diario' });
    }
});

app.get('/api/apontamento/:setor', tenantMiddleware, async (req, res) => {
    const setor = req.params.setor.toLowerCase();
    let setorConfig = setorColumns[setor];

    if (!setorConfig) {
        const cap = setor.charAt(0).toUpperCase() + setor.slice(1);
        setorConfig = {
            txt: 'txt'+cap, percentual: cap+'Percentual', status: 'sttxt'+cap,
            total: cap+'TotalExecutado', executar: cap+'TotalExecutar',
            inicio: 'RealizadoInicio'+cap, final: 'RealizadoFinal'+cap,
            userInicio: 'UsuarioRealizadoInicio'+cap, userFinal: 'UsuarioRealizadoFinal'+cap
        };
    }

    const { projeto, tag, os, item, search, status, codMatFabricante, dataPlanejamentoInicio, dataPlanejamentoFim, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
        let whereClause = `osi.${setorConfig.txt} = '1' 
            AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '' OR osi.D_E_L_E_T_E != '*')
            AND osi.Liberado_engenharia = 'S'
            AND(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')`;
        const params = [];

        if (projeto) {
            whereClause += ' AND (os.Projeto LIKE ? OR p.DescProjeto LIKE ?)';
            params.push(`%${projeto}%`, `%${projeto}%`);
        }

        if (item) {
            whereClause += ' AND osi.IdOrdemServicoItem = ?';
            params.push(item);
        }

        // Plano de Corte
        if (req.query.planoCorte) {
            whereClause += ' AND osi.IdPlanodecorte LIKE ?';
            params.push(`%${req.query.planoCorte}%`);
        }

        if (status === 'pendente') {
            whereClause += ` AND(osi.${setorConfig.status} IS NULL OR osi.${setorConfig.status} != 'C')`;
        } else if (status === 'concluido') {
            whereClause += ` AND osi.${setorConfig.status} = 'C'`;
        }

        // Filtro Tag: busca por descrição da tag (LIKE)
        if (req.query.tag) {
            whereClause += ' AND (os.DescTag LIKE ? OR os.Tag LIKE ?)';
            params.push(`%${req.query.tag}%`, `%${req.query.tag}%`);
        }

        // Filtro Ordem de Serviço: busca apenas por ID da OS
        if (req.query.os) {
            whereClause += ' AND os.IdOrdemServico = ?';
            params.push(req.query.os);
        }

        // Filtro Cliente: busca por descrição (LIKE)
        if (req.query.cliente) {
            whereClause += ' AND (os.DescEmpresa LIKE ? OR p.ClienteProjeto LIKE ?)';
            params.push(`%${req.query.cliente}%`, `%${req.query.cliente}%`);
        }

        // Filtro Cód. Mat. Fabricante
        if (codMatFabricante) {
            whereClause += ' AND osi.CodMatFabricante LIKE ?';
            params.push(`%${codMatFabricante}%`);
        }

                // Filtro Data Planejamento Range
        if (dataPlanejamentoInicio && dataPlanejamentoFim) {
            const setorUpper = setor.charAt(0).toUpperCase() + setor.slice(1);
            whereClause += ` AND (
                (STR_TO_DATE(SUBSTRING_INDEX(osi.PlanejadoInicio${setorUpper}, ' ', 1), '%d/%m/%Y') >= ? AND STR_TO_DATE(SUBSTRING_INDEX(osi.PlanejadoInicio${setorUpper}, ' ', 1), '%d/%m/%Y') <= ?) OR 
                (DATE(osi.PlanejadoInicio${setorUpper}) >= ? AND DATE(osi.PlanejadoInicio${setorUpper}) <= ?)
            )`;
            params.push(dataPlanejamentoInicio, dataPlanejamentoFim, dataPlanejamentoInicio, dataPlanejamentoFim);
        } else if (dataPlanejamentoInicio) {
            const setorUpper = setor.charAt(0).toUpperCase() + setor.slice(1);
            whereClause += ` AND (
                STR_TO_DATE(SUBSTRING_INDEX(osi.PlanejadoInicio${setorUpper}, ' ', 1), '%d/%m/%Y') = ? OR 
                DATE(osi.PlanejadoInicio${setorUpper}) = ?
            )`;
            params.push(dataPlanejamentoInicio, dataPlanejamentoInicio);
        }

        const [countResult] = await req.tenantDbPool.execute(`
            SELECT COUNT(*) as total
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
        `, params);
        const total = countResult[0].total;

        const [rows] = await req.tenantDbPool.execute(`
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
                osi.${setorConfig.executar} as TotalExecutar,
                osi.PlanejadoInicio${setor.charAt(0).toUpperCase() + setor.slice(1)} as DataPlanejamento,
                os.Projeto,
                os.IdProjeto,
                p.DescProjeto,
                os.Tag,
                os.IdTag,
                os.DescTag,
                CASE WHEN TRIM(COALESCE(os.DescEmpresa, '')) IN ('', 'Sem cliente', 'Sem Cliente', 'SEM CLIENTE') THEN p.ClienteProjeto ELSE os.DescEmpresa END as Cliente,
                osi.txtcorte as txtCorte,
                osi.txtdobra as txtDobra,
                osi.txtsolda as txtSolda,
                osi.txtpintura as txtPintura,
                osi.txtmontagem as TxtMontagem,

                osi.CorteSequencia,
                osi.DobraSequencia,
                osi.SoldaSequencia,
                osi.PinturaSequencia,
                osi.MontagemSequencia,
                osi.txtCorteaLaser,
                osi.CorteaLaserSequencia,
                osi.txtPUNSIONADEIRA,
                osi.PunsionadeiraSequencia,
                osi.txtGALVANIZAR,
                osi.GalvanizarSequencia,
                osi.txtENGENHARIA,
                osi.EngenhariaSequencia,

                osi.CorteTotalExecutado,
                osi.DobraTotalExecutado,
                osi.SoldaTotalExecutado,
                osi.PinturaTotalExecutado,
                osi.MontagemTotalExecutado,
                osi.GALVANIZARTotalExecutado, osi.GALVANIZARTotalExecutar,
                osi.PUNSIONADEIRATotalExecutado, osi.PUNSIONADEIRATotalExecutar,
                osi.CorteaLaserTotalExecutado, osi.CorteaLaserTotalExecutar,
                osi.CorteMinProd, osi.DobraMinProd, osi.SoldaMinProd, osi.PinturaMinProd, osi.MontagemMinProd,
                osi.CorteaLaserMinProd, osi.PUNSIONADEIRAMinProd, osi.GALVANIZARMinProd,
                osi.ProdutoPrincipal as IsProdutoPrincipal,
                osi.TempoSetup, osi.TempoPadrao, osi.TotalTempo,
                osi.CorteTempoSetup, osi.CorteTempoPadrao, osi.CorteTotalTempo,
                osi.DobraTempoSetup, osi.DobraTempoPadrao, osi.DobraTotalTempo,
                osi.SoldaTempoSetup, osi.SoldaTempoPadrao, osi.SoldaTotalTempo,
                osi.PinturaTempoSetup, osi.PinturaTempoPadrao, osi.PinturaTotalTempo,
                osi.MontagemTempoSetup, osi.MontagemTempoPadrao, osi.MontagemTotalTempo,
                osi.GalvanizarTempoSetup, osi.GalvanizarTempoPadrao, osi.GalvanizarTotalTempo,
                osi.PunsionadeiraTempoSetup, osi.PunsionadeiraTempoPadrao, osi.PunsionadeiraTotalTempo,
                osi.CorteaLaserTempoSetup, osi.CorteaLaserTempoPadrao, osi.CorteaLaserTotalTempo,
                osi.EngenhariaTempoSetup, osi.EngenhariaTempoPadrao, osi.EngenhariaTotalTempo
            FROM ordemservicoitem osi
            INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
            WHERE ${whereClause}
            ORDER BY osi.IdOrdemServico DESC, osi.IdOrdemServicoItem
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, params);

        // Otimização (Data Loader)
        if (rows.length > 0) {
            const itemIds = rows.map(r => r.IdOrdemServicoItem);
            const osIds = [...new Set(rows.map(r => r.IdOrdemServico))];

            const [historyRows] = await req.tenantDbPool.execute(`
                SELECT IdOrdemServicoItem, COALESCE(SUM(CAST(QtdeProduzida AS UNSIGNED)), 0) as QtdeProduzidaHistory
                FROM ordemservicoitemcontrole
                WHERE Processo = ?
                  AND IdOrdemServicoItem IN (${itemIds.join(',')})
                  AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')
                GROUP BY IdOrdemServicoItem
            `, [setor]);

            const historyMap = {};
            for (const hr of historyRows) {
                historyMap[hr.IdOrdemServicoItem] = hr.QtdeProduzidaHistory;
            }

            const [ppRows] = await req.tenantDbPool.execute(`
                SELECT IdOrdemServico, MAX(DescResumo) as NomeProdutoPrincipal
                FROM ordemservicoitem
                WHERE ProdutoPrincipal = 'sim'
                  AND IdOrdemServico IN (${osIds.join(',')})
                GROUP BY IdOrdemServico
            `);

            const ppMap = {};
            for (const ppr of ppRows) {
                ppMap[ppr.IdOrdemServico] = ppr.NomeProdutoPrincipal;
            }

            for (const r of rows) {
                r.QtdeProduzidaHistory = historyMap[r.IdOrdemServicoItem] || 0;
                r.NomeProdutoPrincipal = ppMap[r.IdOrdemServico] || null;
            }
        }

        res.json({ 
            success: true, 
            data: rows, 
            setor,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.json({ 
                success: true, 
                data: [], 
                setor,
                pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
                message: 'Setor sem apontamentos (coluna inexistente)'
            });
        }
        console.error('Error fetching apontamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar itens para apontamento' });
    }
});

// GET: Projetos para dropdown de apontamento
app.get('/api/apontamento/projetos/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
            SELECT DISTINCT os.Projeto as value, os.Projeto as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
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
app.get('/api/apontamento/tags/options', tenantMiddleware, async (req, res) => {
    try {
        let query = `
            SELECT DISTINCT os.Tag as value, CONCAT(os.Tag, ' - ', os.DescTag) as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
AND(osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = '')
              AND os.Tag IS NOT NULL AND os.Tag != ''
    `;
        const params = [];

        if (req.query.projeto) {
            query += ' AND os.Projeto = ?';
            params.push(req.query.projeto);
        }

        query += ' ORDER BY os.Tag';

        const [rows] = await req.tenantDbPool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar tags' });
    }
});

// GET: Ordens de Serviço para dropdown de apontamento
app.get('/api/apontamento/os/options', tenantMiddleware, async (req, res) => {
    try {
        let query = `
            SELECT DISTINCT os.IdOrdemServico as value,
    CONCAT('OS ', os.IdOrdemServico, ' - ', os.Tag) as label 
            FROM ordemservico os
            INNER JOIN ordemservicoitem osi ON os.IdOrdemServico = osi.IdOrdemServico
WHERE(os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')
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

        const [rows] = await req.tenantDbPool.execute(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching ordens:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar ordens' });
    }
});

// GET: Clientes para dropdown de apontamento
app.get('/api/apontamento/clientes/options', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
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

// GET: Detalhes de um item + histórico de apontamentos
app.get('/api/apontamento/item/:id/:processo', tenantMiddleware, async (req, res) => {
    const { id, processo } = req.params;
    const isAll = processo.toLowerCase() === 'all';
    let setorConfig = setorColumns[processo.toLowerCase()];
    if (!setorConfig && !isAll) {
        const cap = processo.charAt(0).toUpperCase() + processo.slice(1).toLowerCase();
        setorConfig = {
            txt: 'txt'+cap, percentual: cap+'Percentual', status: 'sttxt'+cap,
            total: cap+'TotalExecutado', executar: cap+'TotalExecutar',
            inicio: 'RealizadoInicio'+cap, final: 'RealizadoFinal'+cap,
            userInicio: 'UsuarioRealizadoInicio'+cap, userFinal: 'UsuarioRealizadoFinal'+cap
        };
    } else if (!setorConfig) {
        setorConfig = setorColumns['mapa'];
    }

    try {
        console.log(`[API] Fetching item details for ID: ${id}, Processo: ${processo} `);
        // Buscar item
        const [itemRows] = await req.tenantDbPool.execute(`
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
    osi.Fator,
    osi.txtCorte,
    osi.txtSolda,
    osi.txtPintura,
    osi.TxtMontagem,
    osi.TempoSetup,
    osi.TempoPadrao,
    osi.TotalTempo,
    osi.CorteTempoSetup, osi.CorteTempoPadrao, osi.CorteTotalTempo,
    osi.DobraTempoSetup, osi.DobraTempoPadrao, osi.DobraTotalTempo,
    osi.SoldaTempoSetup, osi.SoldaTempoPadrao, osi.SoldaTotalTempo,
    osi.PinturaTempoSetup, osi.PinturaTempoPadrao, osi.PinturaTotalTempo,
    osi.MontagemTempoSetup, osi.MontagemTempoPadrao, osi.MontagemTotalTempo,
    osi.GalvanizarTempoSetup, osi.GalvanizarTempoPadrao, osi.GalvanizarTotalTempo,
    osi.PunsionadeiraTempoSetup, osi.PunsionadeiraTempoPadrao, osi.PunsionadeiraTotalTempo,
    osi.CorteaLaserTempoSetup, osi.CorteaLaserTempoPadrao, osi.CorteaLaserTotalTempo,
    osi.EngenhariaTempoSetup, osi.EngenhariaTempoPadrao, osi.EngenhariaTotalTempo,
    osi.CorteMinProd, osi.DobraMinProd, osi.SoldaMinProd, osi.PinturaMinProd, osi.MontagemMinProd,
    osi.CorteaLaserMinProd, osi.PUNSIONADEIRAMinProd, osi.GALVANIZARMinProd,
    osi.GALVANIZARTotalExecutado, osi.GALVANIZARTotalExecutar,
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

        // Fetch actual totals from material_processo table instead of legacy OS item
        try {
            const [mpRows] = await req.tenantDbPool.execute(`SELECT mp.TotalExecutado, mp.TotalExecutar 
                FROM material_processo mp 
                JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao 
                WHERE mp.IdOrdemServico = ? AND mp.codmatFabricante = ? AND REPLACE(LOWER(pf.processofabricacao), ' ', '') = ?`, [item.IdOrdemServico, item.CodMatFabricante, processo.toLowerCase()]);
            
            if (mpRows.length > 0) {
                item.TotalExecutado = mpRows[0].TotalExecutado || 0;
                item.TotalExecutar = mpRows[0].TotalExecutar || item.QtdeTotal;
                item.QtdeFaltanteCalculada = item.TotalExecutar - item.TotalExecutado;
                item.PercentualSetor = (item.TotalExecutado / item.TotalExecutar) * 100;
            }
        } catch(err) {
            console.error("[API] Error fetching material_processo:", err.message);
        }
        // Buscar hist�rico de apontamentos
        const historicoQuery = `
            SELECT
                v.idordemservicoitemControle,
                v.CriadoPor,
                v.DataCriacao,
                v.Codmatfabricante,
                v.QtdeTotal,
                v.QtdeProduzida,
                v.QtdeFaltante,
                v.txtCorte,
                v.txtDobra,
                v.txtSolda,
                v.txtPintura,
                v.txtMontagem,
                c.Processo
            FROM viewordemservicoitemcontrole v
            LEFT JOIN ordemservicoitemcontrole c ON v.idordemservicoitemControle = c.IdOrdemServicoItemControle
            WHERE v.IdOrdemServicoItem = ?
            ORDER BY v.DataCriacao DESC, v.idordemservicoitemControle DESC
        `

        const [historicoRows] = await req.tenantDbPool.execute(historicoQuery, [id]);

        // Legacy missing quantity logic
        const totalExecutado = parseFloat(item.TotalExecutado) || 0;
        const totalExecutar = (item.TotalExecutar === null || parseFloat(item.TotalExecutar) === 0)
            ? item.QtdeTotal - totalExecutado
            : parseFloat(item.TotalExecutar);

        // Campo auxiliar diário — lido da memória (por banco + item + setor + data)
        const dbNameDet = (req.tenantUser && req.tenantUser.dbName) || process.env.DB_NAME || 'default';
        const processoNorm = processo.toLowerCase();
        const dailyMinProd = getDailyAccumulated(dbNameDet, id, processoNorm);

        const responseData = {
            item: item,
            historico: historicoRows,
            totalProduzido: totalExecutado,
            qtdeFaltante: Math.min(item.QtdeTotal - totalExecutado, Math.max(0, totalExecutar)),
            dailyMinProd  // minutos acumulados HOJE no campo auxiliar (começa em 0 a cada novo dia)
        };
        console.log(`[API] Sending details for item ${id} | dailyMinProd(${processoNorm})=${dailyMinProd}`);
        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching item details:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes do item' });
    }
});

// GET: Listar apontamentos parciais
app.get('/api/apontamentos-parciais', tenantMiddleware, async (req, res) => {
    try {
        const queryPool = req.tenantDbPool || pool;
        const [rows] = await queryPool.query(`
            SELECT 
                c.IdOrdemServicoItemControle,
                c.IdOrdemServicoItem,
                c.IdOrdemServico,
                c.Processo,
                c.QtdeTotal,
                c.QtdeProduzida,
                c.CriadoPor,
                c.DataCriacao,
                i.CodMatFabricante,
                i.IdPlanodecorte,
                i.EnderecoArquivo,
                i.EnderecoArquivoItemOrdemServico,
                os.Projeto,
                os.Tag,
                os.Estatus as StatusOS,
                os.OrdemServicoFinalizado as OSFinalizado,
                p.Finalizado as StatusProjeto
            FROM ordemservicoitemcontrole c
            INNER JOIN ordemservicoitem i ON c.IdOrdemServicoItem = i.IdOrdemServicoItem
            INNER JOIN ordemservico os ON c.IdOrdemServico = os.IdOrdemServico
            LEFT JOIN projetos p ON os.Projeto = p.Projeto
            WHERE c.TipoApontamento = 'Parcial'
              AND c.QtdeProduzida < c.QtdeTotal
              AND (c.D_E_L_E_T_E IS NULL OR c.D_E_L_E_T_E = '')
            ORDER BY c.DataCriacao DESC
        `);
        res.json({ success: true, parciais: rows });
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage && error.sqlMessage.includes('TipoApontamento')) {
            console.warn('[API Apontamentos Parciais] Base de dados legada não possui TipoApontamento, retornando array vazio.');
            return res.json({ success: true, parciais: [] });
        }
        console.error('[API Apontamentos Parciais] Erro ao buscar parciais:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor' });
    }
});

app.get('/api/material-processo/setores-consolidados-tags', tenantMiddleware, async (req, res) => {
    const { tagIds } = req.query;
    if (!tagIds) return res.json({ success: true, sectors: [] });
    const ids = tagIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length === 0) return res.json({ success: true, sectors: [] });
    try {
        const placeholders = ids.map(() => '?').join(',');
        const query = `
            SELECT 
                mp.IdProcesso, pf.processofabricacao,
                SUM(mp.MinutosProducao) as TotalPadrao,
                SUM(mp.TotalExecutado) as exec,
                SUM(mp.TotalExecutar) as aExec,
                SUM(IFNULL(mp.TotalExecutado, 0) + IFNULL(mp.TotalExecutar, 0)) as qtdeTotal
            FROM material_processo mp
            LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            WHERE mp.IdTag IN (${placeholders})
            GROUP BY mp.IdProcesso, pf.processofabricacao
        `;
        const [rows] = await req.tenantDbPool.execute(query, ids);
        
        const sectors = rows.map(r => {
            const rawName = String(r.processofabricacao || '').toUpperCase();
            return {
                key: rawName,
                label: rawName,
                idMaterialProcesso: r.IdProcesso,
                dias: 1, 
                pi: '',
                pf: '',
                minProd: Math.round(parseFloat(r.TotalPadrao) || 0),
                qtdeTotal: parseFloat(r.qtdeTotal) || 0,
                exec: parseFloat(r.exec) || 0,
                aExec: parseFloat(r.aExec) || 0
            };
        });
        
        res.json({ success: true, sectors });
    } catch (e) {
        console.error('[Consolidated Sectors TAG Error]', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET: Setores consolidados de múltiplas OSs (para Bulk Modal)
app.get('/api/material-processo/setores-consolidados-os', tenantMiddleware, async (req, res) => {
    const { osIds } = req.query;
    if (!osIds) return res.json({ success: true, sectors: [] });
    
    const ids = osIds.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length === 0) return res.json({ success: true, sectors: [] });
    
    try {
        const placeholders = ids.map(() => '?').join(',');
        const query = `
            SELECT 
                mp.IdProcesso, pf.processofabricacao,
                SUM(mp.MinutosProducao) as TotalPadrao,
                SUM(mp.TotalExecutado) as exec,
                SUM(mp.TotalExecutar) as aExec,
                SUM(IFNULL(mp.TotalExecutado, 0) + IFNULL(mp.TotalExecutar, 0)) as qtdeTotal
            FROM material_processo mp
            LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            WHERE mp.IdOrdemServico IN (${placeholders})
            GROUP BY mp.IdProcesso, pf.processofabricacao
        `;
        const [rows] = await req.tenantDbPool.execute(query, ids);
        
        const sectors = rows.map(r => {
            const rawName = String(r.processofabricacao || '').toUpperCase();
            return {
                key: rawName,
                label: rawName,
                idMaterialProcesso: r.IdProcesso,
                dias: 1, 
                pi: '',
                pf: '',
                minProd: Math.round(parseFloat(r.TotalPadrao) || 0),
                qtdeTotal: parseFloat(r.qtdeTotal) || 0,
                exec: parseFloat(r.exec) || 0,
                aExec: parseFloat(r.aExec) || 0
            };
        });
        
        res.json({ success: true, sectors });
    } catch (e) {
        console.error('[Consolidated Sectors OS Error]', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST: Salvar planejamento e datas dos setores/recursos para OS, Tag ou Item
app.post('/api/salvar-setores-planejamento', tenantMiddleware, async (req, res) => {
    const { targetType, targetId, sectors, targetIds } = req.body;

    if (!targetType || !targetId || !Array.isArray(sectors)) {
        return res.status(400).json({ success: false, message: 'Parâmetros targetType, targetId e sectors são obrigatórios.' });
    }

    const queryPool = req.tenantDbPool || pool;
    const tenantPool = req.tenantDbPool || pool;
        const conn = await tenantPool.getConnection();
    try {
        await conn.beginTransaction();

        const formatBr = (val) => {
            if (!val || val === '—') return null;
            const str = String(val).trim();
            if (str.includes('/')) return str;
            if (str.includes('-')) {
                const parts = str.split('T')[0].split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }
            return val;
        };

        const parseBrDate = (str) => {
            if (!str || str === '—') return null;
            const s = String(str).trim();
            if (s.includes('/')) {
                const p = s.split('/');
                if (p.length === 3) return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
            }
            if (s.includes('-')) {
                const p = s.split('T')[0].split('-');
                if (p.length === 3) return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
            }
            return null;
        };

        const updateFieldsForEntity = async (table, idCol, idValue) => {
            const updates = [];
            const params = [];

            for (const s of sectors) {
                let rawName = String(s.key || s.label || '').trim();
                let recName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                let diasName = recName;
                const normalizedRawName = rawName.toLowerCase().replace(/\s+/g, '');
                if (normalizedRawName === 'montagem') { recName = 'Montagem'; diasName = 'Montagem'; }
                else if (normalizedRawName === 'corte') { recName = 'Corte'; diasName = 'Corte'; }
                else if (normalizedRawName === 'dobra') { recName = 'Dobra'; diasName = 'Dobra'; }
                else if (normalizedRawName === 'solda') { recName = 'Solda'; diasName = 'Solda'; }
                else if (normalizedRawName === 'pintura') { recName = 'Pintura'; diasName = 'Pintura'; }
                else if (normalizedRawName === 'galvanizar') { recName = 'GALVANIZAR'; diasName = 'Galvanizar'; }
                else if (normalizedRawName === 'punsionadeira') { recName = 'PUNSIONADEIRA'; diasName = 'Punsionadeira'; }
                else if (normalizedRawName === 'cortealaser' || normalizedRawName === 'laser') { recName = 'CorteaLaser'; diasName = 'CorteaLaser'; }

                const colPi = `PlanejadoInicio${recName}`;
                const colPf = `PlanejadoFinal${recName}`;
                const colDias = `${diasName}DiasProducao`;

                const brPi = formatBr(s.pi);
                const brPf = formatBr(s.pf);
                const valDias = parseInt(String(s.dias), 10) || 1;

                updates.push(`\`${colPi}\` = ?`);
                params.push(brPi);

                updates.push(`\`${colPf}\` = ?`);
                params.push(brPf);

                updates.push(`\`${colDias}\` = ?`);
                params.push(valDias);
            }

            if (updates.length > 0) {
                params.push(idValue);
                const sql = `UPDATE \`${table}\` SET ${updates.join(', ')} WHERE \`${idCol}\` = ?`;
                await conn.execute(sql, params).catch(err => {
                    console.warn(`[Save Sector Warning] ${err.message}`);
                });
            }
        };

        const updateParentHierarchy = async (osId, tagId, projetoId) => {
            const updateEntityRow = async (table, idCol, idVal) => {
                if (!idVal) return;
                const [rows] = await conn.execute(`SELECT * FROM \`${table}\` WHERE \`${idCol}\` = ?`, [idVal]).catch(() => [[]]);
                if (!rows || rows.length === 0) return;
                const parentRow = rows[0];

                const updates = [];
                const params = [];

                for (const s of sectors) {
                    let rawName = String(s.key || s.label || '').trim();
                    let recName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                    let diasName = recName;
                    const normalizedRawName = rawName.toLowerCase().replace(/\s+/g, '');
                    if (normalizedRawName === 'montagem') { recName = 'Montagem'; diasName = 'Montagem'; }
                    else if (normalizedRawName === 'corte') { recName = 'Corte'; diasName = 'Corte'; }
                    else if (normalizedRawName === 'dobra') { recName = 'Dobra'; diasName = 'Dobra'; }
                    else if (normalizedRawName === 'solda') { recName = 'Solda'; diasName = 'Solda'; }
                    else if (normalizedRawName === 'pintura') { recName = 'Pintura'; diasName = 'Pintura'; }
                    else if (normalizedRawName === 'galvanizar') { recName = 'GALVANIZAR'; diasName = 'Galvanizar'; }
                    else if (normalizedRawName === 'punsionadeira') { recName = 'PUNSIONADEIRA'; diasName = 'Punsionadeira'; }
                    else if (normalizedRawName === 'cortealaser' || normalizedRawName === 'laser') { recName = 'CorteaLaser'; diasName = 'CorteaLaser'; }

                    const colPi = `PlanejadoInicio${recName}`;
                    const colPf = `PlanejadoFinal${recName}`;
                    const colDias = `${diasName}DiasProducao`;

                    const itemPiBr = formatBr(s.pi);
                    const itemPfBr = formatBr(s.pf);
                    const valDias = parseInt(String(s.dias), 10) || 1;
                    
                    // Always push days update so parent hierarchy matches the latest saved sector's days
                    updates.push(`\`${colDias}\` = ?`);
                    params.push(valDias);

                    const itemPiDt = parseBrDate(itemPiBr);
                    const itemPfDt = parseBrDate(itemPfBr);

                    // Verifica as datas existentes no pai (caso existam)
                    const parentPiBr = parentRow[colPi];
                    const parentPfBr = parentRow[colPf];
                    const parentPiDt = parseBrDate(parentPiBr);
                    const parentPfDt = parseBrDate(parentPfBr);

                    // Start Date: Só atualiza se o pai não tiver data ou se a nova data for mais antiga
                    if (itemPiBr && itemPiDt) {
                        if (!parentPiDt || itemPiDt < parentPiDt) {
                            updates.push(`\`${colPi}\` = ?`);
                            params.push(itemPiBr);
                        }
                    }

                    // End Date: Só atualiza se o pai não tiver data ou se a nova data for mais recente
                    if (itemPfBr && itemPfDt) {
                        if (!parentPfDt || itemPfDt > parentPfDt) {
                            updates.push(`\`${colPf}\` = ?`);
                            params.push(itemPfBr);
                        }
                    }
                }

                if (updates.length > 0) {
                    params.push(idVal);
                    const sql = `UPDATE \`${table}\` SET ${updates.join(', ')} WHERE \`${idCol}\` = ?`;
                    await conn.execute(sql, params).catch(err => {
                        console.warn(`[Hierarchy Sector Rollup Warning] Table ${table}: ${err.message}`);
                    });
                    console.log(`[Hierarchy Sector Rollup] Updated ${table} (${idCol}=${idVal}) with ${updates.length} sector date fields.`);
                }
            };

            if (osId) await updateEntityRow('ordemservico', 'IdOrdemServico', osId);
            if (tagId) await updateEntityRow('tags', 'IdTag', tagId);
            if (projetoId) await updateEntityRow('projetos', 'IdProjeto', projetoId);
        };

        const idsToUpdate = ((targetType === 'tag' || targetType === 'tag_os_bulk') && Array.isArray(targetIds) && targetIds.length > 0) ? targetIds : [targetId];

        const PROCESS_ID_MAP = {
            'CORTE': 1, 'DOBRA': 2, 'SOLDA': 3, 'PINTURA': 4, 'MONTAGEM': 5,
            'CORTE A LASER': 13, 'LASER': 13, 'PUNSIONADEIRA': 14, 'GALVANIZAR': 15
        };

        for (const currentTargetId of idsToUpdate) {
            if (targetType === 'os' || targetType === 'tag_os_bulk' || targetType === 'tag') {
                const loggedUser = req.body.usuario || req.user?.login || req.user?.nome || req.user?.NomeCompleto || 'Sistema';

                for (const s of sectors) {
                    const rawName = String(s.key || s.label || '').toUpperCase().trim();
                    const processId = PROCESS_ID_MAP[rawName];
                    if (processId) {
                        const itemPiDt = parseBrDate(s.pi);
                        const itemPfDt = parseBrDate(s.pf);
                        const itemPiSql = itemPiDt && !isNaN(itemPiDt.getTime()) ? `${itemPiDt.getFullYear()}-${String(itemPiDt.getMonth() + 1).padStart(2, '0')}-${String(itemPiDt.getDate()).padStart(2, '0')}` : null;
                        const itemPfSql = itemPfDt && !isNaN(itemPfDt.getTime()) ? `${itemPfDt.getFullYear()}-${String(itemPfDt.getMonth() + 1).padStart(2, '0')}-${String(itemPfDt.getDate()).padStart(2, '0')}` : null;
                        const valDias = parseInt(String(s.dias), 10) || 1;
                        
                        const mpUpdates = [];
                        const mpParams = [];
                        
                        if (itemPiSql) { 
                            mpUpdates.push('PlanejadoInicio = ?'); mpParams.push(itemPiSql); 
                            mpUpdates.push('UsuarioPlanejadoInicio = ?'); mpParams.push(loggedUser);
                        }
                        if (itemPfSql) { 
                            mpUpdates.push('PlanejadoFinal = ?'); mpParams.push(itemPfSql); 
                            mpUpdates.push('UsuarioPlanejadoFinal = ?'); mpParams.push(loggedUser);
                        }
                        
                        if (mpUpdates.length > 0) {
                            mpUpdates.push('DiasProducao = ?'); 
                            mpParams.push(valDias);
                            mpParams.push(currentTargetId, processId);
                            
                            const whereCol = (targetType === 'tag') ? 'IdTag' : 'IdOrdemServico';
                            await conn.execute(`UPDATE material_processo SET ${mpUpdates.join(', ')} WHERE ${whereCol} = ? AND IdProcesso = ?`, mpParams).catch(err => {
                                console.warn(`[Material Processo Bulk Warning]: ${err.message}`);
                            });
                        }
                    }
                }

                if (targetType === 'os' || targetType === 'tag_os_bulk') {
                    const [osRows] = await conn.execute('SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ?', [currentTargetId]).catch(() => [[]]);
                    if (osRows && osRows[0]) {
                        await updateParentHierarchy(null, osRows[0].IdTag, osRows[0].IdProjeto);
                    }
                } else if (targetType === 'tag') {
                    const [tagRows] = await conn.execute('SELECT IdProjeto FROM tags WHERE IdTag = ?', [currentTargetId]).catch(() => [[]]);
                    if (tagRows && tagRows[0]) {
                        await updateParentHierarchy(null, currentTargetId, tagRows[0].IdProjeto);
                    }
                }
        } else if (targetType === 'projeto') {
            await updateFieldsForEntity('projetos', 'IdProjeto', currentTargetId, "AND (Finalizado IS NULL OR Finalizado NOT IN ('C', 'S'))");
            await updateFieldsForEntity('tags', 'IdProjeto', currentTargetId, "AND (Finalizado IS NULL OR Finalizado NOT IN ('C', 'S'))");
            await updateFieldsForEntity('ordemservico', 'IdProjeto', currentTargetId, "AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado NOT IN ('C', 'S'))");
            await updateFieldsForEntity('ordemservicoitem', 'IdProjeto', currentTargetId, "AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado NOT IN ('C', 'S'))");
            await updateParentHierarchy(null, null, currentTargetId);
        } else if (targetType === 'item') {
            const [itemRows] = await conn.execute('SELECT codmatFabricante, IdOrdemServico FROM ordemservicoitem WHERE IdOrdemServicoItem = ?', [currentTargetId]).catch(() => [[]]);
            if (itemRows && itemRows[0]) {
                const { codmatFabricante, IdOrdemServico } = itemRows[0];
                if (codmatFabricante && IdOrdemServico) {
                    const PROCESS_ID_MAP = {
                        'corte': 1, 'dobra': 2, 'solda': 3, 'pintura': 4, 'montagem': 5,
                        'cortealaser': 13, 'laser': 13, 'punsionadeira': 14, 'galvanizar': 15
                    };
                    
                    for (const s of sectors) {
                        const rawName = String(s.key || s.label || '').trim();
                        const normalizedName = rawName.toLowerCase().replace(/\s+/g, '');
                        const loggedUser = req.body.usuario || req.user?.login || req.user?.nome || req.user?.NomeCompleto || 'Sistema';

                        const itemPiDt = parseBrDate(s.pi);
                        const itemPfDt = parseBrDate(s.pf);
                        const itemPiSql = itemPiDt && !isNaN(itemPiDt.getTime()) ? `${itemPiDt.getFullYear()}-${String(itemPiDt.getMonth() + 1).padStart(2, '0')}-${String(itemPiDt.getDate()).padStart(2, '0')}` : null;
                        const itemPfSql = itemPfDt && !isNaN(itemPfDt.getTime()) ? `${itemPfDt.getFullYear()}-${String(itemPfDt.getMonth() + 1).padStart(2, '0')}-${String(itemPfDt.getDate()).padStart(2, '0')}` : null;
                        const valDias = parseInt(String(s.dias), 10) || 1;

                        const updates = [];
                        const params = [];

                        if (itemPiSql) {
                            updates.push('PlanejadoInicio = ?'); params.push(itemPiSql);
                            updates.push('UsuarioPlanejadoInicio = ?'); params.push(loggedUser);
                        }
                        if (itemPfSql) {
                            updates.push('PlanejadoFinal = ?'); params.push(itemPfSql);
                            updates.push('UsuarioPlanejadoFinal = ?'); params.push(loggedUser);
                        }

                        if (updates.length > 0) {
                            updates.push('DiasProducao = ?');
                            params.push(valDias);

                            // Prioridade 1: usa IdMaterialProcesso diretamente (Rota 2)
                            const idMp = s.idMaterialProcesso || s.IdMaterialProcesso;
                            if (idMp) {
                                params.push(idMp);
                                await conn.execute(`UPDATE material_processo SET ${updates.join(', ')} WHERE IdMaterialProcesso = ?`, params).catch(err => {
                                    console.warn(`[Material Processo Item Warning IdMp]: ${err.message}`);
                                });
                            } else {
                                // Fallback: lookup por PROCESS_ID_MAP (processos-padrão legado)
                                const PROCESS_ID_MAP_ITEM = {
                                    'corte': 1, 'dobra': 2, 'solda': 3, 'pintura': 4, 'montagem': 5,
                                    'cortealaser': 13, 'laser': 13, 'punsionadeira': 14, 'galvanizar': 15
                                };
                                const processId = PROCESS_ID_MAP_ITEM[normalizedName];
                                if (processId) {
                                    params.push(codmatFabricante, IdOrdemServico, processId);
                                    await conn.execute(`UPDATE material_processo SET ${updates.join(', ')} WHERE codmatFabricante = ? AND IdOrdemServico = ? AND IdProcesso = ?`, params).catch(err => {
                                        console.warn(`[Material Processo Item Warning Fallback]: ${err.message}`);
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

                }

        await conn.commit();
        console.log(`[Planejamento Setores] Salvo com sucesso para ${targetType} ID=${targetId} com ${sectors.length} setores e propagado na hierarquia`);
        res.json({ success: true, message: 'Planejamento dos setores salvo com sucesso e propagado na hierarquia.' });
    } catch (error) {
        await conn.rollback();
        console.error('[Planejamento Setores] Erro ao salvar:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar planejamento dos setores: ' + error.message });
    } finally {
        conn.release();
    }
});


// Função para cascatear o saldo para o próximo recurso ativo

// NOVO HELPER: Cascata de Finalização (Item -> OS -> Tag -> Projeto)
async function cascatearFinalizados(connection, idOrdemServicoItem, idOrdemServico, idTag, idProjeto, codMatFabricante) {
    if (!idOrdemServicoItem || !codMatFabricante) return;

    try {
        // 1. Nível ITEM: Todos os recursos (material_processo) concluídos?
        const [mpRows] = await connection.execute(`
            SELECT COUNT(*) as pendentes 
            FROM material_processo 
            WHERE IdOrdemServico = ? AND codmatFabricante = ? AND COALESCE(TotalExecutar, 0) > 0
        `, [idOrdemServico, codMatFabricante]);

        const itemFinalizado = (mpRows[0].pendentes === 0) ? 'C' : '';
        await connection.execute(`
            UPDATE ordemservicoitem 
            SET OrdemServicoItemFinalizado = ? 
            WHERE IdOrdemServicoItem = ?
        `, [itemFinalizado, idOrdemServicoItem]);

        // 2. Nível OS: Todos os itens concluídos?
        if (idOrdemServico) {
            const [itemRows] = await connection.execute(`
                SELECT COUNT(*) as pendentes 
                FROM ordemservicoitem 
                WHERE IdOrdemServico = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e != '*') 
                  AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado != 'C')
            `, [idOrdemServico]);

            const osFinalizada = (itemRows[0].pendentes === 0) ? 'C' : '';
            await connection.execute(`
                UPDATE ordemservico 
                SET OrdemServicoFinalizado = ? 
                WHERE IdOrdemServico = ?
            `, [osFinalizada, idOrdemServico]);
            
            // Se a OS não foi finalizada, Tag e Projeto tb não serão. 
            // Mas vamos processar a cascata de qualquer forma para atualizar regressivamente se houver estorno.
        }

        // 3. Nível TAG: Todas as OS concluídas?
        if (idTag) {
            const [osRows] = await connection.execute(`
                SELECT COUNT(*) as pendentes 
                FROM ordemservico 
                WHERE IdTag = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e != '*') 
                  AND (OrdemServicoFinalizado IS NULL OR OrdemServicoFinalizado != 'C')
            `, [idTag]);

            const tagFinalizada = (osRows[0].pendentes === 0) ? 'C' : '';
            await connection.execute(`
                UPDATE tags 
                SET Finalizado = ? 
                WHERE IdTag = ?
            `, [tagFinalizada, idTag]);
        }

        // 4. Nível PROJETO: Todas as Tags concluídas?
        if (idProjeto) {
            const [tagRows] = await connection.execute(`
                SELECT COUNT(*) as pendentes 
                FROM tags 
                WHERE IdProjeto = ? AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e != '*') 
                  AND (Finalizado IS NULL OR Finalizado != 'C')
            `, [idProjeto]);

            const projetoFinalizado = (tagRows[0].pendentes === 0) ? 'C' : '';
            await connection.execute(`
                UPDATE projetos 
                SET Finalizado = ? 
                WHERE IdProjeto = ?
            `, [projetoFinalizado, idProjeto]);
        }
    } catch (e) {
        console.error('[cascatearFinalizados] Erro:', e.message);
    }
}

async function cascatearSaldoProximoRecurso(conn, item, sName, quantidadeAAdicionar) {
    if (!item || !sName || quantidadeAAdicionar <= 0) return;

    const recursos = [
        { id: 'corte',         txtField: 'txtCorte',         seqField: 'CorteSequencia',         executarField: 'CorteTotalExecutar' },
        { id: 'dobra',         txtField: 'txtDobra',         seqField: 'DobraSequencia',         executarField: 'DobraTotalExecutar' },
        { id: 'solda',         txtField: 'txtSolda',         seqField: 'SoldaSequencia',         executarField: 'SoldaTotalExecutar' },
        { id: 'pintura',       txtField: 'txtPintura',       seqField: 'PinturaSequencia',       executarField: 'PinturaTotalExecutar' },
        { id: 'montagem',      txtField: 'TxtMontagem',      seqField: 'MontagemSequencia',      executarField: 'MontagemTotalExecutar' },
        { id: 'cortealaser',   txtField: 'txtCorteaLaser',   seqField: 'CorteaLaserSequencia',   executarField: 'CorteaLaserTotalExecutar' },
        { id: 'punsionadeira', txtField: 'txtPUNSIONADEIRA', seqField: 'PunsionadeiraSequencia', executarField: 'PUNSIONADEIRATotalExecutar' },
        { id: 'galvanizar',    txtField: 'txtGALVANIZAR',    seqField: 'GalvanizarSequencia',    executarField: 'GALVANIZARTotalExecutar' },
        { id: 'engenharia',    txtField: 'txtENGENHARIA',    seqField: 'EngenhariaSequencia',    executarField: 'ENGENHARIATotalExecutar' },
        { id: 'usinagem',      txtField: 'txtUsinagem',      seqField: 'UsinagemSequencia',      executarField: 'UsinagemTotalExecutar' },
        { id: 'caldeiraria',   txtField: 'txtCALDEIRARIA',   seqField: 'CaldeirariaSequencia',   executarField: 'CALDEIRARIATotalExecutar' },
        { id: 'serralheria',   txtField: 'txtSERRALHERIA',   seqField: 'SerralheriaSequencia',   executarField: 'SERRALHERIATotalExecutar' },
        { id: 'puncionadeira', txtField: 'txtPUNCIONADEIRA', seqField: 'PuncionadeiraSequencia', executarField: 'PUNCIONADEIRATotalExecutar' },
        { id: 'acabamento',    txtField: 'txtACABAMENTO',    seqField: 'AcabamentoSequencia',    executarField: 'ACABAMENTOTotalExecutar' }
    ];

    const ativos = [];
    for (const r of recursos) {
        // Handle txtmontagem mapping in server.js vs db if needed, but DB field is TxtMontagem or txtmontagem
        const val = String(item[r.txtField] || item[r.txtField.toLowerCase()] || '').trim().toUpperCase();
        if (val === '1' || val === 'S') {
            ativos.push({
                id: r.id,
                executarField: r.executarField,
                seq: parseInt(item[r.seqField] || item[r.seqField.toLowerCase()]) || 999
            });
        }
    }

    ativos.sort((a, b) => a.seq - b.seq);

    const currentResource = ativos.find(r => r.id === sName.toLowerCase());
    if (!currentResource) return; 

    const currentSeq = currentResource.seq;
    const nextResource = ativos.find(r => r.seq > currentSeq);

    if (nextResource) {
        try {
            await conn.execute(
                `UPDATE ordemservicoitem SET ${nextResource.executarField} = COALESCE(${nextResource.executarField}, 0) + ? WHERE IdOrdemServicoItem = ?`,
                [quantidadeAAdicionar, item.IdOrdemServicoItem]
            );
            console.log(`[Cascata] Adicionado ${quantidadeAAdicionar} em ${nextResource.executarField} (Setor: ${nextResource.id}) para OSItem: ${item.IdOrdemServicoItem}`);
        } catch(e) {
            console.error(`[Cascata] Falha ao atualizar saldo para o próximo recurso: `, e.message);
        }
    }
}

app.post('/api/apontamento-parcial', tenantMiddleware, async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({ success: false, message: 'IdOrdemServicoItem, Processo e QtdeProduzida sao obrigatorios' });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const queryPool = req.tenantDbPool || pool;
    const tenantPool = req.tenantDbPool || pool;
        const conn = await tenantPool.getConnection();
    try {
        await conn.beginTransaction();

        const now = getCurrentDateTimeBR();
        const processoKey = String(Processo).trim().toUpperCase();
        const usuario = CriadoPor || 'Sistema';

        // 1. Buscar dados completos do item
        const [itemRows] = await conn.execute(
            `SELECT osi.*, os.IdProjeto, os.IdTag
             FROM ordemservicoitem osi
             INNER JOIN ordemservico os ON osi.IdOrdemServico = os.IdOrdemServico
             WHERE osi.IdOrdemServicoItem = ?`,
            [IdOrdemServicoItem]
        );
        if (itemRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item nao encontrado' });
        }

        const item = itemRows[0];
        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;
        const idOS = item.IdOrdemServico || IdOrdemServico;

        // 2. Resolver config do setor (estático ou dinamicamente)
        const sConfig = await resolveSetorConfig(processoKey, conn);

        if (!sConfig) {
            // Recurso não mapeado e não existe no banco — registra log e retorna sucesso gracioso
            console.warn(`[RECURSO_NAO_MAPEADO] Apontamento Parcial ignorado — Processo '${processoKey}' sem colunas no banco. Item=${IdOrdemServicoItem}`);
            await conn.rollback();
            return res.json({ success: true, message: `Apontamento registrado (recurso '${processoKey}' ainda não mapeado no sistema — log gerado).` });
        }

        // 3. Verificar flag txt{Recurso} = '1' — confirma que o recurso está ativo neste item
        const txtFlag = sConfig.txt ? String(item[sConfig.txt] || '').trim() : null;
        if (txtFlag !== null && txtFlag !== '1') {
            console.warn(`[RECURSO_INATIVO] Processo '${processoKey}' não está ativo (txt=${txtFlag}) no Item=${IdOrdemServicoItem}. Apontamento ignorado.`);
            await conn.rollback();
            return res.json({ success: true, message: `Recurso '${processoKey}' não está ativo para este item — operação ignorada sem erro.` });
        }

        // 4. Calcular novo TotalExecutado e Percentual do setor
        const totalExecutadoAtual = parseFloat(item[sConfig.total]) || 0;
        const novoTotalExecutado = totalExecutadoAtual + inputQty;
        const novoPercentual = qtdeTotal > 0 ? Math.min(100, Math.round((novoTotalExecutado / qtdeTotal) * 100)) : 0;

        // 5. Atualizar ordemservicoitem: TotalExecutado + Percentual do setor
        let updateQuery = `UPDATE ordemservicoitem SET ${sConfig.total} = ?, ${sConfig.percentual || sConfig.total} = ?`;
        const updateParams = [novoTotalExecutado, novoPercentual];

        // Gravar data de início realizado se for o primeiro apontamento deste setor (coluna pode não existir em setores dinâmicos)
        if (sConfig.inicio && !item[sConfig.inicio]) {
            updateQuery += `, ${sConfig.inicio} = ?`;
            // Gravar data respeitando o tipo da coluna no banco
            const dateToRecord = (sConfig.dateType === 'date') ? getCurrentDateSQL() : getCurrentDateBR();
            updateParams.push(dateToRecord);
            if (sConfig.userInicio) {
                updateQuery += `, ${sConfig.userInicio} = ?`;
                updateParams.push(usuario);
            }
        }
        updateQuery += ` WHERE IdOrdemServicoItem = ?`;
        updateParams.push(IdOrdemServicoItem);
        await conn.execute(updateQuery, updateParams);

        // 6. Propagar saldo para o próximo setor ativo na cadeia produtiva (Fluxo Push)
        // Busca todos os recursos ativos do item dinamicamente
        const allSectorKeys = Object.keys(setorColumns).filter(k => k !== 'mapa');
        const currentPosInStatic = allSectorKeys.indexOf(processoKey.toLowerCase());
        let nextSectorName = null;

        if (currentPosInStatic >= 0) {
            // Recurso ? estático — usa sequência conhecida
            for (let i = currentPosInStatic + 1; i < allSectorKeys.length; i++) {
                const checkConfig = setorColumns[allSectorKeys[i]];
                if (checkConfig && checkConfig.txt && NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                    nextSectorName = allSectorKeys[i];
                    break;
                }
            }
        } else {
            // Recurso dinâmico — busca próxima coluna txt* = '1' no item após o atual
            // Como não há ordem definida, apenas logamos sem propagar
            console.log(`[RECURSO_DINAMICO] Recurso '${processoKey}' ? dinâmico — propagação de saldo para próximo setor não aplicada.`);
        }

        if (nextSectorName) {
            const nextConfig = await resolveSetorConfig(nextSectorName.toUpperCase(), conn);
            if (nextConfig) {
                await conn.execute(
                    `UPDATE ordemservicoitem SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdOrdemServicoItem = ?`,
                    [inputQty, IdOrdemServicoItem]
                );
                console.log(`[API Apontamento Parcial] Propagando ${inputQty} para próximo setor: ${nextSectorName}`);
            }
        }

        // 7. Inserir registro de controle (histórico)
        await conn.execute(
            `INSERT INTO ordemservicoitemcontrole (IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, QtdeTotal, TipoApontamento, Situacao, CriadoPor, DataCriacao)
             VALUES (?, ?, ?, ?, ?, 'Parcial', 'P', ?, ?)`,
            [IdOrdemServicoItem, idOS || null, processoKey.toLowerCase(), inputQty, qtdeTotal, usuario, now]
        );

        // 8. Recalcular totais em cascata (OS -> Tag -> Projeto)
        await recalcularQuantidadesTotais(idOS, conn);

        // Cascata de Saldo
        await cascatearSaldoProximoRecurso(conn, item, processoKey, inputQty);

        await conn.commit();
        console.log(`[API Apontamento Parcial] OK | Item=${IdOrdemServicoItem} | Processo=${processoKey} | Qtde=${inputQty} | NovoExecutado=${novoTotalExecutado}`);
        res.json({ success: true, message: 'Apontamento parcial registrado com sucesso.' });

    } catch (error) {
        await conn.rollback();
        console.error('[API Apontamento Parcial] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar apontamento parcial: ' + error.message });
    } finally {
        conn.release();
    }
});

// DELETE: Excluir apontamento parcial
app.delete('/api/apontamentos-parciais/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const queryPool = req.tenantDbPool || pool;
    const tenantPool = req.tenantDbPool || pool;
        const conn = await tenantPool.getConnection();
    try {
        await conn.beginTransaction();
        
        // Buscar dados do controle
        const [ctrlRows] = await conn.execute(
            "SELECT * FROM ordemservicoitemcontrole WHERE IdOrdemServicoItemControle = ? AND TipoApontamento = 'Parcial' AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')",
            [id]
        );
        
        if (ctrlRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Apontamento parcial não encontrado.' });
        }
        
        const controle = ctrlRows[0];
        const setorFieldTotal = `txt${controle.Processo.charAt(0).toUpperCase() + controle.Processo.slice(1).toLowerCase()}`;
        const setorColTotalExecutado = `${controle.Processo.charAt(0).toUpperCase() + controle.Processo.slice(1).toLowerCase()}TotalExecutado`;
        
        // Subtrair quantidade do TotalExecutado no item
        await conn.execute(`
            UPDATE ordemservicoitem 
            SET ${setorColTotalExecutado} = GREATEST(0, COALESCE(${setorColTotalExecutado}, 0) - ?)
            WHERE IdOrdemServicoItem = ?
        `, [controle.QtdeProduzida, controle.IdOrdemServicoItem]);
        
        // Ocultar da tabela de controle (soft delete)
        await conn.execute("UPDATE ordemservicoitemcontrole SET D_E_L_E_T_E = '*' WHERE IdOrdemServicoItemControle = ?", [id]);
        
        // Recalcular totais (OS, Tag, Projeto)
        await recalcularQuantidadesTotais(controle.IdOrdemServico, conn);
        
        await conn.commit();
        res.json({ success: true, message: 'Apontamento parcial removido com sucesso.' });
    } catch (error) {
        await conn.rollback();
        console.error('[API Apontamentos Parciais] Erro ao excluir parcial:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao excluir.' });
    } finally {
        conn.release();
    }
});

// POST: Registrar apontamento de produção
app.post('/api/apontamento', tenantMiddleware, async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, TipoApontamento, CriadoPor, LimiteDiario } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({
            success: false,
            message: 'IdOrdemServicoItem, Processo e QtdeProduzida são obrigatórios'
        });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const isMapa = Processo.toLowerCase() === 'mapa';
    const setorAtivo = !isMapa ? Processo.toLowerCase() : null;
    // RecursoOrigem: quando MAPA é clicado na página de recurso especial (galvanizar etc.)
    // o frontend envia o recurso de origem para apontarmos apenas aquele setor
    const recursoOrigem = req.body.RecursoOrigem ? req.body.RecursoOrigem.toLowerCase() : null;
    const isMapaEspecial = isMapa && recursoOrigem && setorColumns[recursoOrigem] && recursoOrigem !== 'mapa';

    if (!isMapa && !setorColumns[setorAtivo]) {
        return res.status(400).json({ success: false, message: 'Processo inválido' });
    }

    // ─── VALIDAÇÃO DO LIMITE DIÁRIO (campo auxiliar em memória) ───────────────
    // Só valida setores diretos (não MAPA genérico sem recursoOrigem definido)
    const setorParaValidar = !isMapa ? setorAtivo : (isMapaEspecial ? recursoOrigem : null);
    const dbName = (req.tenantUser && req.tenantUser.dbName) || process.env.DB_NAME || 'default';

    if (setorParaValidar && LimiteDiario !== undefined && LimiteDiario !== null) {
        const limiteDiario = parseFloat(LimiteDiario) || 0;
        if (limiteDiario > 0) {
            // Busca tempoPadrao/setup do item diretamente (leitura rápida, sem transação)
            try {
                const [quickRows] = await req.tenantDbPool.execute(
                    `SELECT GalvanizarTempoPadrao, GalvanizarTempoSetup,
                            PunsionadeiraTempoPadrao, PunsionadeiraTempoSetup,
                            CorteaLaserTempoPadrao, CorteaLaserTempoSetup,
                            CorteTempoPadrao, CorteTempoSetup,
                            DobraTempoPadrao, DobraTempoSetup,
                            SoldaTempoPadrao, SoldaTempoSetup,
                            PinturaTempoPadrao, PinturaTempoSetup,
                            MontagemTempoPadrao, MontagemTempoSetup,
                            TempoPadrao, TempoSetup
                     FROM ordemservicoitem WHERE IdOrdemServicoItem = ? LIMIT 1`,
                    [IdOrdemServicoItem]
                );

                if (quickRows.length > 0) {
                    const qi = quickRows[0];
                    const cap = setorParaValidar.charAt(0).toUpperCase() + setorParaValidar.slice(1);
                    // Mapa de nome especial para prefixo da coluna
                    const PREFIXO_MAP = { galvanizar: 'Galvanizar', punsionadeira: 'Punsionadeira', cortealaser: 'CorteaLaser' };
                    const pref = PREFIXO_MAP[setorParaValidar] || cap;
                    const tPadrao = parseFloat(qi[`${pref}TempoPadrao`] || qi.TempoPadrao) || 0;
                    const tSetup  = parseFloat(qi[`${pref}TempoSetup`]  || qi.TempoSetup)  || 0;

                    const acumuladoHoje = getDailyAccumulated(dbName, IdOrdemServicoItem, setorParaValidar);
                    const tempoEste = (inputQty * tPadrao) + (acumuladoHoje === 0 ? tSetup : 0);
                    const totalComEste = acumuladoHoje + tempoEste;

                    console.log(`[DailyMinProd] Validação: acumulado=${acumuladoHoje} + este=${tempoEste.toFixed(1)} = ${totalComEste.toFixed(1)} | limite=${limiteDiario}`);

                    if (totalComEste > limiteDiario) {
                        return res.status(400).json({
                            success: false,
                            limiteDiarioExcedido: true,
                            message: `Limite diário excedido para o setor ${setorParaValidar.toUpperCase()}. ` +
                                     `Já produzido hoje: ${acumuladoHoje} min. ` +
                                     `Este apontamento adicionaria ${tempoEste.toFixed(1)} min. ` +
                                     `Total: ${totalComEste.toFixed(1)} min vs limite de ${limiteDiario} min.`,
                            acumuladoHoje,
                            tempoEste: parseFloat(tempoEste.toFixed(1)),
                            limiteDiario
                        });
                    }
                }
            } catch (validErr) {
                // Falha na validação: loga mas não bloqueia (segurança operacional)
                console.error('[DailyMinProd] Erro na validação prévia:', validErr.message);
            }
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const conn = await pool.getConnection();
    try {
        let req_idmatriz = null;
        try {
            const [matRows] = await req.tenantDbPool.query('SELECT id FROM conexoes_bancos WHERE db_name = ? LIMIT 1', [req.tenantDb]);
            if (matRows && matRows.length > 0) req_idmatriz = matRows[0].id;
        } catch(e) {
            console.error('[API Apontamento] Aviso: Falha ao buscar idmatriz de conexoes_bancos:', e.message);
        }

        await conn.beginTransaction();

        const now = getCurrentDateTimeBR();
        const dateSQL = getCurrentDateSQL(); // YYYY-MM-DD for DATE-type columns
        // Helper: date format depends on column type in DB
        // galvanizar and punsionadeira have DATE columns for Realizado* fields
        const DATE_SETOR_KEYS = new Set(['galvanizar', 'punsionadeira', 'cortealaser']);
        const getDateForSetor = (sName) => DATE_SETOR_KEYS.has(sName) ? dateSQL : now;

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
            return res.status(404).json({ success: false, message: 'Item não encontrado' });
        }

        const item = itemRows[0];
        const qtdeTotal = parseFloat(item.QtdeTotal) || 0;

        const MAPA_SEQUENCE_SAFE = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];
        const setoresParaProcessar = isMapaEspecial
            // MAPA especial: recurso não-padrão (galvanizar, punsionadeira etc.) - apontar só este setor
            ? [recursoOrigem]
            : isMapa
                // MAPA padrão: somente os 5 setores seguros que têm colunas em OS/Tags/Projetos, filtrados por txt=1
                ? MAPA_SEQUENCE_SAFE.filter(sKey => {
                    const sCfg = setorColumns[sKey];
                    return sCfg && sCfg.txt && NULLIF_TRIM(item[sCfg.txt]) === '1';
                  })
                : [setorAtivo];

        if (setoresParaProcessar.length === 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Este item não possui setores ativos para apontar' });
        }

        let someSectorFinalized = false;
        let lastNovoTotalExecutado = 0;
        let lastNovoPercentual = 0;
        let lastFinalizado = false;

        const sequence = ['corte', 'dobra', 'solda', 'pintura', 'montagem'];

        for (const sName of setoresParaProcessar) {
            const sConfig = setorColumns[sName];
            const totalExecutadoDb = parseFloat(item[sConfig.total]) || 0;
            const dateNow = getDateForSetor(sName); // CORRIGIDO: passa sName (string), nao sConfig (objeto)
            const statusAtual = item[sConfig.status];

            if (statusAtual === 'C' && !isMapa) continue;

            const currentInputQty = isMapa ? Math.max(0, qtdeTotal - totalExecutadoDb) : inputQty;

            // If not Mapa and no quantity to process, skip
            if (!isMapa && currentInputQty <= 0) continue;

            // Determinar se este ? o primeiro setor ativo do item na cadeia produtiva
            let isFirstActiveSector = true;
            const currentIndexInSequence = sequence.indexOf(sName);
            for (let i = 0; i < currentIndexInSequence; i++) {
                const checkSName = sequence[i];
                const checkConfig = setorColumns[checkSName];
                if (NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                    isFirstActiveSector = false;
                    break;
                }
            }

            const capacidadeSetor = isFirstActiveSector
                ? qtdeTotal
                : (parseFloat(item[sConfig.executar]) || 0);

            const saldoAExecutar = capacidadeSetor - totalExecutadoDb;

            if (!isMapa) {
                // 1. Validação de Saldo a Executar Normal
                if (saldoAExecutar <= 0) {
                    await conn.rollback();
                    return res.status(400).json({ success: false, message: `Não há saldo a executar para o setor ${sName}.` });
                }

                if (currentInputQty > saldoAExecutar) {
                    await conn.rollback();
                    return res.status(400).json({
                        success: false,
                        message: `Quantidade informada(${currentInputQty}) excede o saldo a executar(${saldoAExecutar}) no setor ${sName} !`
                    });
                }

                // 2. Validação de Sequência (Saldo Anterior)
                const currentIndex = sequence.indexOf(sName);
                if (currentIndex > 0) {
                    let prevSectorName = null;
                    // Procurar o setor anterior que ? ativado para este item
                    for (let i = currentIndex - 1; i >= 0; i--) {
                        const checkSName = sequence[i];
                        const checkConfig = setorColumns[checkSName];
                        if (NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                            prevSectorName = checkSName;
                            break;
                        }
                    }

                    if (prevSectorName) {
                        const prevConfig = setorColumns[prevSectorName];
                        const prevTotalExecutado = parseFloat(item[prevConfig.total]) || 0;
                        const novoTotalTentativa = totalExecutadoDb + currentInputQty;

                        if (novoTotalTentativa > prevTotalExecutado) {
                            await conn.rollback();
                            const msg = `Não ? aceito apontar produção no setor '${sName.charAt(0).toUpperCase() + sName.slice(1)}' pois o setor anterior '${prevSectorName.charAt(0).toUpperCase() + prevSectorName.slice(1)}' possui apenas ${prevTotalExecutado} unidades concluídas.`;
                            return res.status(400).json({ success: false, message: msg });
                        }
                    }
                }
            }

            const novoTotalExecutado = isMapa ? qtdeTotal : totalExecutadoDb + currentInputQty;
            const totalExecutarAtualDb = parseFloat(item[sConfig.executar]) || (qtdeTotal - totalExecutadoDb);
            const novoTotalExecutar = isMapa ? 0 : Math.max(0, totalExecutarAtualDb - currentInputQty); // NUNCA MOVIDO! Apenas preservado.
            const novoPercentual = isMapa ? 100 : (qtdeTotal > 0 ? Math.min(100, Math.round((novoTotalExecutado / qtdeTotal) * 100)) : 0);
            const finalizado = novoTotalExecutado >= qtdeTotal;

            if (finalizado || isMapa) someSectorFinalized = true;

            lastNovoTotalExecutado = novoTotalExecutado;
            lastNovoPercentual = novoPercentual;
            lastFinalizado = finalizado || isMapa;

            // 5. Update ordemservicoitem - totais + status
            let updateItemQuery = `
                UPDATE ordemservicoitem 
                SET ${sConfig.total} = ?, 
                    ${sConfig.executar} = ?, 
                    ${sConfig.percentual} = ?,
                    ${sConfig.status} = ?,
                    idmatriz = COALESCE(NULLIF(idmatriz, 0), ?)
`;
            const updateItemParams = [novoTotalExecutado, novoTotalExecutar, novoPercentual, (finalizado || isMapa) ? 'C' : '', req_idmatriz];

            // 5a. Realizado INICIO: gravar no item se for o primeiro apontamento do setor (campo NULL)
            const dateForThisSetor = getDateForSetor(sName);
            if (!item[sConfig.inicio]) {
                updateItemQuery += `, ${sConfig.inicio} = ?, ${sConfig.userInicio} = ?`;
                updateItemParams.push(dateForThisSetor, CriadoPor || 'Sistema');
            }

            // 5b. Realizado FINAL: gravar no item quando todas as peças do setor forem produzidas
            if (finalizado || isMapa) {
                updateItemQuery += `, ${sConfig.final} = ?, ${sConfig.userFinal} = ?`;
                updateItemParams.push(dateForThisSetor, CriadoPor || 'Sistema');
                if (sName === 'montagem') {
                    updateItemQuery += `, DataFinalMontagem = ?`;
                    updateItemParams.push(dateForThisSetor);
                }
            }

            // Atualizar MinProd acumulado do recurso
            let minProdCol = `${sName.charAt(0).toUpperCase() + sName.slice(1)}MinProd`;
            if (sName === 'galvanizar') minProdCol = 'GALVANIZARMinProd';
            else if (sName === 'punsionadeira') minProdCol = 'PUNSIONADEIRAMinProd';
            else if (sName === 'cortealaser') minProdCol = 'CorteaLaserMinProd';

            const minProdAtualDb = parseFloat(item[minProdCol]) || 0;
            const tempoPadraoDb = parseFloat(item[`${sName.charAt(0).toUpperCase() + sName.slice(1)}TempoPadrao`] || item.TempoPadrao) || 0;
            const tempoSetupDb = parseFloat(item[`${sName.charAt(0).toUpperCase() + sName.slice(1)}TempoSetup`] || item.TempoSetup) || 0;

            const tempoApontamentoDb = tempoPadraoDb * currentInputQty;
            let novoMinProd = 0;
            if (minProdAtualDb === 0) {
                novoMinProd = tempoSetupDb + tempoApontamentoDb;
            } else {
                novoMinProd = minProdAtualDb + tempoApontamentoDb;
            }

            updateItemQuery += `, \`${minProdCol}\` = ?`;
            updateItemParams.push(novoMinProd);

            updateItemQuery += ` WHERE IdOrdemServicoItem = ?`;
            updateItemParams.push(IdOrdemServicoItem);
            await conn.execute(updateItemQuery, updateItemParams);

            // ── Registrar no campo auxiliar diário (memória) ──────────────────
            // tempoApontamentoDb = qtde × tempoPadrao (calculado acima)
            // se for o primeiro do dia (acumulado=0), inclui setup
            const acumDiarioAtual = getDailyAccumulated(dbName, IdOrdemServicoItem, sName);
            const tempoParaMapDiario = tempoApontamentoDb + (acumDiarioAtual === 0 ? tempoSetupDb : 0);
            addDailyAccumulated(dbName, IdOrdemServicoItem, sName, tempoParaMapDiario);
            // ──────────────────────────────────────────────────────────────────

            // 6. Cascading Totals e Percentuais Dinâmicos (HIERARQUIA: Item -> OS -> Tag -> Projeto)
            // Utilizando o helper centralizado garantimos que QtdePecasExecutadas e Setores também recalculem em tempo real
            await recalcularQuantidadesTotais(item.IdOrdemServico, conn);

            // Cascata de Finalização C (Item -> OS -> Tag -> Projeto)
            await cascatearFinalizados(conn, item.IdOrdemServicoItem, item.IdOrdemServico, item.IdTag, item.IdProjeto, item.CodMatFabricante);


            // Cascata de Saldo
            await cascatearSaldoProximoRecurso(conn, item, sName, currentInputQty);
            // 6b. Atualizar MinProd acumulado do recurso em cascata (Item -> OS -> Tag -> Projeto)
            await atualizarMinProdCascata(conn, IdOrdemServicoItem, sName, currentInputQty, 'ADD');

            // 6a. Cascatear Realizado INICIO para OS / Tag / Projeto (somente se campo ainda NULL)
            if (!item[sConfig.inicio]) {
                // OS: setar inicio se ainda nulo
                await conn.execute(
                    `UPDATE ordemservico SET ${sConfig.inicio} = ? WHERE IdOrdemServico = ? AND (${sConfig.inicio} IS NULL OR ${sConfig.inicio} = '')`,
                    [dateForThisSetor, item.IdOrdemServico]
                );
                // Tag: setar inicio se ainda nulo
                if (item.IdTag) {
                    await conn.execute(
                        `UPDATE tags SET ${sConfig.inicio} = ? WHERE IdTag = ? AND (${sConfig.inicio} IS NULL OR ${sConfig.inicio} = '')`,
                        [dateNow, item.IdTag]
                    );
                }
                // Projeto: setar inicio se ainda nulo
                if (item.IdProjeto) {
                    await conn.execute(
                        `UPDATE projetos SET ${sConfig.inicio} = ? WHERE IdProjeto = ? AND (${sConfig.inicio} IS NULL OR ${sConfig.inicio} = '')`,
                        [dateNow, item.IdProjeto]
                    );
                }
            }

            // 6b. Cascatear Realizado FINAL para OS / Tag / Projeto (verificar se todos completaram o setor)
            if (finalizado || isMapa) {
                // Verificar se TODOS os itens (não deletados) da OS têm RealizadoFinal no setor
                const [pendFinalOS] = await conn.execute(
                    `SELECT COUNT(*) as cnt FROM ordemservicoitem
                     WHERE IdOrdemServico = ?
                       AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
                       AND NULLIF(${sConfig.txt}, '') = '1'
                       AND (${sConfig.final} IS NULL OR ${sConfig.final} = '')`,
                    [item.IdOrdemServico]
                );
                if (parseInt(pendFinalOS[0].cnt) === 0) {
                    await conn.execute(
                        `UPDATE ordemservico SET ${sConfig.final} = ? WHERE IdOrdemServico = ?`,
                        [dateNow, item.IdOrdemServico]
                    );
                    // Verificar se TODAS as OS (não deletadas) da Tag têm RealizadoFinal no setor
                    if (item.IdTag) {
                        const [pendFinalTag] = await conn.execute(
                            `SELECT COUNT(*) as cnt FROM ordemservico
                             WHERE IdTag = ?
                               AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
                               AND (${sConfig.final} IS NULL OR ${sConfig.final} = '')`,
                            [item.IdTag]
                        );
                        if (parseInt(pendFinalTag[0].cnt) === 0) {
                            await conn.execute(
                                `UPDATE tags SET ${sConfig.final} = ? WHERE IdTag = ?`,
                                [dateNow, item.IdTag]
                            );
                            // Verificar se TODAS as Tags (não deletadas) do Projeto têm RealizadoFinal no setor
                            if (item.IdProjeto) {
                                const [pendFinalProj] = await conn.execute(
                                    `SELECT COUNT(*) as cnt FROM tags
                                     WHERE IdProjeto = ?
                                       AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')
                                       AND (${sConfig.final} IS NULL OR ${sConfig.final} = '')`,
                                    [item.IdProjeto]
                                );
                                if (parseInt(pendFinalProj[0].cnt) === 0) {
                                    await conn.execute(
                                        `UPDATE projetos SET ${sConfig.final} = ? WHERE IdProjeto = ?`,
                                        [dateNow, item.IdProjeto]
                                    );
                                }
                            }
                        }
                    }
                }
            }

            // 7. Log de apontamento
            // A tabela ordemservicoitemcontrole só tem colunas txt para setores padrão:
            // txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado, txtMEDICAO, txtISOMETRICO, txtENGENHARIA, txtACABAMENTO, txtAPROVACAO
            // Setores especiais (galvanizar, punsionadeira, cortealaser) NÃO têm coluna txt — inserimos sem ela.
            const CONTROLE_TXT_COLS = new Set([
                'txtCorte', 'txtDobra', 'txtSolda', 'txtPintura', 'txtMontagem',
                'txtAlmoxarifado', 'txtMEDICAO', 'txtISOMETRICO', 'txtENGENHARIA',
                'txtACABAMENTO', 'txtAPROVACAO'
            ]);
            const txtSetor = sConfig.txt; // nome exato da coluna (ex: txtGALVANIZAR, txtCorte)
            const tipoAppEnv = TipoApontamento || 'Total';
            const txtColExists = CONTROLE_TXT_COLS.has(txtSetor);
            if (txtColExists) {
                await conn.execute(`
                    INSERT INTO ordemservicoitemcontrole(
                        IdOrdemServicoItem, IdOrdemServico, Processo, QtdeTotal, QtdeProduzida, \`${txtSetor}\`, TipoApontamento, CriadoPor, DataCriacao, D_E_L_E_T_E, idmatriz
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)
                `, [IdOrdemServicoItem, item.IdOrdemServico, sName.toLowerCase(), item.QtdeTotal, currentInputQty, currentInputQty, tipoAppEnv, CriadoPor || 'Sistema', now, req_idmatriz]);
            } else {
                // Setor especial (galvanizar, punsionadeira, etc.): não há coluna txt — registra sem ela
                await conn.execute(`
                    INSERT INTO ordemservicoitemcontrole(
                        IdOrdemServicoItem, IdOrdemServico, Processo, QtdeTotal, QtdeProduzida, TipoApontamento, CriadoPor, DataCriacao, D_E_L_E_T_E, idmatriz
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, '', ?)
                `, [IdOrdemServicoItem, item.IdOrdemServico, sName.toLowerCase(), item.QtdeTotal, currentInputQty, tipoAppEnv, CriadoPor || 'Sistema', now, req_idmatriz]);
            }

            // 8. Update tagcontrole
            // Mapa de setores -> nome da coluna EXATO em tagcontrole (apenas setores que têm colunas)
            const TAGCONTROLE_SETOR_MAP = {
                'corte': 'Corte', 'dobra': 'Dobra', 'solda': 'Solda', 'pintura': 'Pintura',
                'montagem': 'Montagem', 'medicao': 'MEDICAO', 'isometrico': 'ISOMETRICO',
                'engenharia': 'ENGENHARIA', 'acabamento': 'ACABAMENTO', 'aprovacao': 'APROVACAO'
            };
            if (item.IdTag && TAGCONTROLE_SETOR_MAP[sName]) {
                const setorCap = TAGCONTROLE_SETOR_MAP[sName]; // nome exato da coluna
                const dateCol = `RealizadoFinal${setorCap}Controle`;
                const userCol = `UsuarioRealizadoFinal${setorCap}Controle`;
                const [tcRows] = await conn.execute('SELECT IdTagControle FROM tagcontrole WHERE IdTag = ? LIMIT 1', [item.IdTag]);
                if (tcRows.length > 0) {
                    await conn.execute(`UPDATE tagcontrole SET \`${dateCol}\` = ?, \`${userCol}\` = ? WHERE IdTagControle = ?`, [dateNow, CriadoPor || 'Sistema', tcRows[0].IdTagControle]);
                } else {
                    await conn.execute(`INSERT INTO tagcontrole(IdTag, Tag, IdProjeto, Projeto, \`${dateCol}\`, \`${userCol}\`, DataControle) VALUES(?, ?, ?, ?, ?, ?, ?)`,
                        [item.IdTag, item.Tag, item.IdProjeto, item.Projeto, dateNow, CriadoPor || 'Sistema', dateNow]);
                }
            }
            // Setores especiais (galvanizar, punsionadeira, cortealaser etc.) não têm colunas em tagcontrole — log omitido

            // 8.5 Incrementar saldo do próximo setor (Fluxo Push)
            if (currentInputQty > 0 && (TipoApontamento !== 'Parcial')) {
                const currentIndex = sequence.indexOf(sName);
                if (currentIndex < sequence.length - 1) {
                    let nextSectorName = null;
                    for (let i = currentIndex + 1; i < sequence.length; i++) {
                        const checkSName = sequence[i];
                        const checkConfig = setorColumns[checkSName];
                        if (NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                            nextSectorName = checkSName;
                            break;
                        }
                    }
                    if (nextSectorName) {
                        const nextConfig = setorColumns[nextSectorName];
                        await conn.execute(`UPDATE ordemservicoitem SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdOrdemServicoItem = ?`, [currentInputQty, IdOrdemServicoItem]);
                        await conn.execute(`UPDATE ordemservico SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdOrdemServico = ?`, [currentInputQty, item.IdOrdemServico]);
                        if (item.IdTag) await conn.execute(`UPDATE tags SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdTag = ?`, [currentInputQty, item.IdTag]);
                        if (item.IdProjeto) await conn.execute(`UPDATE projetos SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdProjeto = ?`, [currentInputQty, item.IdProjeto]);
                    }
                }
            } else if (finalizado && TipoApontamento === 'Parcial') {
                // If it reached final validation using Parcial steps, we push the FULL QTDE to the next sector now.
                const currentIndex = sequence.indexOf(sName);
                if (currentIndex < sequence.length - 1) {
                    let nextSectorName = null;
                    for (let i = currentIndex + 1; i < sequence.length; i++) {
                        const checkSName = sequence[i];
                        const checkConfig = setorColumns[checkSName];
                        if (NULLIF_TRIM(item[checkConfig.txt]) === '1') {
                            nextSectorName = checkSName;
                            break;
                        }
                    }
                    if (nextSectorName) {
                        const nextConfig = setorColumns[nextSectorName];
                        await conn.execute(`UPDATE ordemservicoitem SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdOrdemServicoItem = ?`, [item.QtdeTotal, IdOrdemServicoItem]);
                        await conn.execute(`UPDATE ordemservico SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdOrdemServico = ?`, [item.QtdeTotal, item.IdOrdemServico]);
                        if (item.IdTag) await conn.execute(`UPDATE tags SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdTag = ?`, [item.QtdeTotal, item.IdTag]);
                        if (item.IdProjeto) await conn.execute(`UPDATE projetos SET ${nextConfig.executar} = COALESCE(${nextConfig.executar}, 0) + ? WHERE IdProjeto = ?`, [item.QtdeTotal, item.IdProjeto]);
                    }
                }
            }
        }

        // 9. Item Finalization Check (Cascading to OS/Tag/Project)
        // Reference: VB.NET BancoDados.AtualizaSetoresAnteriores() logic
        if (someSectorFinalized || isMapa) {
            // Equivalent to checking viewordemservicoitemstatussetor.Resultado = 0
            const allSectorKeys = Object.keys(setorColumns).filter(k => k !== 'mapa');
            const checkClauses = allSectorKeys.map(key => {
                const s = setorColumns[key];
                // Adiciona verificações p/ 'S' ou '1', mantendo retrocompatibilidade
                return `COALESCE(CASE WHEN (NULLIF(${s.txt}, '') = '1' OR UPPER(NULLIF(${s.txt}, '')) = 'S') AND COALESCE(${s.status}, '') != 'C' THEN 1 ELSE 0 END, 0)`;
            }).join(' +\n        ');

            const [checkSectors] = await conn.execute(`
SELECT
    (${checkClauses}) as Pendentes
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
app.delete('/api/apontamento/:id', tenantMiddleware, async (req, res) => {
    const { usuario, descricao } = req.body;
    const now = getCurrentDateTimeBR();

    try {
        // Buscar dados do apontamento antes de deletar
        const [rows] = await req.tenantDbPool.execute(
            'SELECT IdOrdemServico, IdOrdemServicoItem, Processo, QtdeProduzida FROM ordemservicoitemcontrole WHERE IdOrdemServicoItemControle = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Apontamento não encontrado' });
        }

        const { IdOrdemServico, IdOrdemServicoItem, Processo, QtdeProduzida } = rows[0];
        const setorConfig = setorColumns[Processo.toLowerCase()];

        // Soft delete
        await req.tenantDbPool.execute(
            `UPDATE ordemservicoitemcontrole 
             SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = ?, DescricaoEstorno = ?
    WHERE IdOrdemServicoItemControle = ? `,
            [usuario || 'Sistema', now, descricao || 'Estorno', req.params.id]
        );

        // Recalcular percentual
        const [sumRows] = await req.tenantDbPool.execute(`
            SELECT COALESCE(SUM(CAST(QtdeProduzida AS UNSIGNED)), 0) as totalProduzido
            FROM ordemservicoitemcontrole
            WHERE IdOrdemServicoItem = ? AND Processo = ? AND(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
    `, [IdOrdemServicoItem, Processo]);

        const [itemRows] = await req.tenantDbPool.execute(
            'SELECT QtdeTotal FROM ordemservicoitem WHERE IdOrdemServicoItem = ?',
            [IdOrdemServicoItem]
        );

        const qtdeTotal = parseInt(itemRows[0]?.QtdeTotal) || 0;
        const totalProduzido = parseInt(sumRows[0].totalProduzido) || 0;
        const novoPercentual = qtdeTotal > 0 ? Math.min(100, Math.round((totalProduzido / qtdeTotal) * 100)) : 0;
        const novoExecutar = Math.max(0, qtdeTotal - totalProduzido);

        // Atualizar percentual, total e executar
        if (setorConfig) {
            await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem SET ${setorConfig.total} = ?, ${setorConfig.executar} = ?, ${setorConfig.percentual} = ? WHERE IdOrdemServicoItem = ? `,
                [totalProduzido, novoExecutar, novoPercentual, IdOrdemServicoItem]
            );
        }

        // Cascatear as alterações da remoção (percentuais dinâmicos da OS/TAG/PROJETO)
        await recalcularQuantidadesTotais(IdOrdemServico, pool);
        // Subtrair MinProd acumulado do recurso (estorno)
        await atualizarMinProdCascata(pool, IdOrdemServicoItem, Processo, QtdeProduzida, 'SUB');

        res.json({ success: true, message: 'Apontamento estornado com sucesso' });
    } catch (error) {
        console.error('Error deleting apontamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao estornar apontamento' });
    }
});

// --- DASHBOARD STATS ---
app.get('/api/dashboard/stats', tenantMiddleware, async (req, res) => {
    try {
        // Query companies count (active only)
        // Using pool from context (tenant) or default pool
        const [rows] = await req.tenantDbPool.execute("SELECT COUNT(*) as total FROM pessoajuridica WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*'");

        // Consulta estatísticas dos projetos
        const [projRows] = await req.tenantDbPool.execute(`
            SELECT 
                COUNT(*) as total_projetos,
                SUM(CASE WHEN TRIM(COALESCE(liberado, '')) != 'S' THEN 1 ELSE 0 END) as sem_liberacao,
                SUM(CASE WHEN TRIM(COALESCE(liberado, '')) = 'S' THEN 1 ELSE 0 END) as liberados,
                SUM(CASE WHEN TRIM(COALESCE(Finalizado, '')) = 'C' THEN 1 ELSE 0 END) as finalizados,
                SUM(CASE WHEN TRIM(COALESCE(StatusProj, '')) = 'CA' THEN 1 ELSE 0 END) as cancelados
            FROM projetos
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*'
        `);

        const stats = {
            companies: rows[0].total,
            projects: projRows[0].total_projetos || 0,
            projectsSemLiberacao: projRows[0].sem_liberacao || 0,
            projectsLiberados: projRows[0].liberados || 0,
            projectsFinalizados: projRows[0].finalizados || 0,
            projectsCancelados: projRows[0].cancelados || 0
        };

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estat?sticas' });
    }
});

app.get('/api/health', tenantMiddleware, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Removed Root Redirect to landing.html to allow frontend index.html to be served

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


// Helper: retorna um pool conectado ao banco lynxlocal (template de configurações)
// Usado como fallback quando o banco ativo ainda não tem configuração própria.
let _lynxLocalPool = null;
const getLynxLocalPool = async () => {
    // Primeiro tenta pelo pool já registrado pelo nome 'lynxlocal'
    const byName = pool.getPoolByName ? pool.getPoolByName('lynxlocal') : null;
    if (byName) return byName;

    // Cria pool temporário para leitura se necessário
    if (!_lynxLocalPool) {
        try {
            const baseConfig = pool.getConfig ? pool.getConfig() : {};
            _lynxLocalPool = require('mysql2/promise').createPool({
                host:     process.env.CENTRAL_DB_HOST || baseConfig.host || 'lynxlocal.mysql.uhserver.com',
                user:     process.env.CENTRAL_DB_USER || baseConfig.user || 'lynxlocal',
                password: process.env.CENTRAL_DB_PASS || process.env.DB_PASSWORD || baseConfig.password || '',
                database: 'lynxlocal',
                port:     process.env.CENTRAL_DB_PORT || 3306,
                charset:  'utf8mb4',
                connectionLimit: 3,
                waitForConnections: true
            });
            console.log('[getLynxLocalPool] Pool lynxlocal criado como template de configurações.');
        } catch (e) {
            console.warn('[getLynxLocalPool] Falha ao criar pool lynxlocal:', e.message);
            return null;
        }
    }
    return _lynxLocalPool;
};

// Configuração - Função de auto-migração de schema para qualquer banco tenant
async function ensureConfigColumns(poolRef) {
    const REQUIRED_COLS = [
        { name: 'RestringirApontamentoSemSaldoAnterior', def: `VARCHAR(10) DEFAULT 'Não'` },
        { name: 'ProcessosVisiveis',                    def: `TEXT DEFAULT NULL` },
        { name: 'PlanoCorteFiltroDC',                   def: `VARCHAR(20) DEFAULT 'corte'` },
        { name: 'MaxRegistros',                         def: `INT DEFAULT 500` },
        { name: 'MenuStructure',                        def: `LONGTEXT DEFAULT NULL` },
        { name: 'PermitirRealizadoSemPlanejamento',     def: `VARCHAR(10) DEFAULT 'Sim'` },
        { name: 'EnderecoSalvarCNHMotorista',           def: `VARCHAR(255) DEFAULT ''` }
    ];

    // 1. Garante que a tabela existe com estrutura mínima (seguro em qualquer banco)
    await poolRef.execute(`
        CREATE TABLE IF NOT EXISTS \`configuracaosistema\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`RestringirApontamentoSemSaldoAnterior\` VARCHAR(10) DEFAULT 'Não',
            \`ProcessosVisiveis\` TEXT DEFAULT NULL,
            \`PlanoCorteFiltroDC\` VARCHAR(20) DEFAULT 'corte',
            \`MaxRegistros\` INT DEFAULT 500,
            \`MenuStructure\` LONGTEXT DEFAULT NULL,
            \`PermitirRealizadoSemPlanejamento\` VARCHAR(10) DEFAULT 'Sim'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. Verifica colunas existentes
    const [existingCols] = await poolRef.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracaosistema'`
    );
    const existingNames = existingCols.map(c => c.COLUMN_NAME);

    // 3. Adiciona colunas ausentes
    for (const col of REQUIRED_COLS) {
        if (!existingNames.includes(col.name)) {
            try {
                await poolRef.execute(`ALTER TABLE \`configuracaosistema\` ADD COLUMN \`${col.name}\` ${col.def}`);
                console.log(`[Config] Coluna '${col.name}' adicionada ao banco ativo.`);
            } catch (e) {
                if (!e.message.includes('Duplicate column')) {
                    console.warn(`[Config] Aviso ao adicionar '${col.name}':`, e.message);
                }
            }
        }
    }

    // 4. Garante pelo menos uma linha de config
    const [rows] = await poolRef.execute('SELECT COUNT(*) as cnt FROM configuracaosistema');
    if (rows[0].cnt === 0) {
        const defaultProcessos = JSON.stringify(['corte','dobra','solda','pintura','montagem','medicao','isometrico','engenharia','aprovacao','acabamento','expedicao']);
        await poolRef.execute(
            `INSERT INTO configuracaosistema (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC, MaxRegistros, PermitirRealizadoSemPlanejamento)
             VALUES ('Não', ?, 'corte', 500, 'Sim')`,
            [defaultProcessos]
        );
        console.log('[Config] Linha de configuração padrão inserida.');
    }
}

// GET /api/config - Funciona em QUALQUER banco ativo
// COPY-ON-FIRST-READ: Se o banco ativo não tiver config própria, retorna a do lynxlocal como template.
// O vínculo ? quebrado na primeira escrita (PUT /api/config ou POST /api/config/menu).
app.get('/api/config', tenantMiddleware, async (req, res) => {
    try {
        await ensureConfigColumns(pool);

        // Verifica se o tenant JÁ tem configuração própria (ao menos 1 linha com algum dado salvo)
        const [countRows] = await req.tenantDbPool.execute('SELECT COUNT(*) as cnt FROM configuracaosistema');
        const tenantHasOwnConfig = countRows[0].cnt > 0;

        if (tenantHasOwnConfig) {
            // Banco ativo tem configuração própria: usa ela diretamente
            const [rows] = await req.tenantDbPool.execute(
                `SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC,
                        MaxRegistros, MenuStructure, PermitirRealizadoSemPlanejamento
                 FROM configuracaosistema LIMIT 1`
            );
            if (rows.length > 0) {
                const row = rows[0];

                // Merge com o template do lynxlocal para campos que não foram preenchidos no banco local
                try {
                    const lynxPool = await getLynxLocalPool();
                    if (lynxPool) {
                        const [lynxRows] = await lynxPool.execute(
                            `SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC,
                                    MaxRegistros, MenuStructure, PermitirRealizadoSemPlanejamento
                             FROM configuracaosistema LIMIT 1`
                        );
                        if (lynxRows.length > 0) {
                            const lynxRow = lynxRows[0];
                            if (!row.RestringirApontamentoSemSaldoAnterior) row.RestringirApontamentoSemSaldoAnterior = lynxRow.RestringirApontamentoSemSaldoAnterior;
                            if (!row.ProcessosVisiveis) row.ProcessosVisiveis = lynxRow.ProcessosVisiveis;
                            if (!row.PlanoCorteFiltroDC) row.PlanoCorteFiltroDC = lynxRow.PlanoCorteFiltroDC;
                            if (!row.MaxRegistros) row.MaxRegistros = lynxRow.MaxRegistros;
                            if (!row.MenuStructure) row.MenuStructure = lynxRow.MenuStructure;
                            if (!row.PermitirRealizadoSemPlanejamento) row.PermitirRealizadoSemPlanejamento = lynxRow.PermitirRealizadoSemPlanejamento;
                        }
                    }
                } catch (e) {}

                if (row.ProcessosVisiveis) {
                    try {
                        const saved = JSON.parse(row.ProcessosVisiveis);
                        const engSetores = ['medicao','isometrico','engenharia','aprovacao','acabamento','expedicao'];
                        const merged = [...new Set([...saved, ...engSetores.filter(s => !saved.includes(s))])];
                        row.ProcessosVisiveis = JSON.stringify(merged);
                    } catch (e) {}
                }
                return res.json({ success: true, config: row, source: 'local' });
            }
        }

        // Banco ativo ainda não tem config própria: tenta buscar do lynxlocal como template
        try {
            const lynxPool = await getLynxLocalPool();
            if (lynxPool) {
                await ensureConfigColumns(lynxPool);
                const [lynxRows] = await lynxPool.execute(
                    `SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC,
                            MaxRegistros, MenuStructure, PermitirRealizadoSemPlanejamento
                     FROM configuracaosistema LIMIT 1`
                );
                if (lynxRows.length > 0) {
                    const row = lynxRows[0];
                    if (row.ProcessosVisiveis) {
                        try {
                            const saved = JSON.parse(row.ProcessosVisiveis);
                            const engSetores = ['medicao','isometrico','engenharia','aprovacao','acabamento','expedicao'];
                            const merged = [...new Set([...saved, ...engSetores.filter(s => !saved.includes(s))])];
                            row.ProcessosVisiveis = JSON.stringify(merged);
                        } catch (e) {}
                    }
                    console.log('[Config GET] Banco ativo sem config própria. Retornando config do lynxlocal como template.');
                    return res.json({ success: true, config: row, source: 'lynxlocal_template' });
                }
            }
        } catch (lynxErr) {
            console.warn('[Config GET] Não foi possível buscar template do lynxlocal:', lynxErr.message);
        }

        // Fallback final: valores padrão hardcoded
        res.json({ success: true, config: {
            RestringirApontamentoSemSaldoAnterior: 'Não',
            ProcessosVisiveis: JSON.stringify(['corte','dobra','solda','pintura','montagem','medicao','isometrico','engenharia','aprovacao','acabamento','expedicao']),
            PlanoCorteFiltroDC: 'corte',
            MaxRegistros: 500,
            PermitirRealizadoSemPlanejamento: 'Sim'
        }, source: 'default' });
    } catch (error) {
        console.error('[Config GET] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar configurações' });
    }
});

// PUT /api/config - Salva em QUALQUER banco ativo (auto-migra schema se necessário)

// Validar caminho da CNH
app.post('/api/config/validar-caminho', tenantMiddleware, async (req, res) => {
    const { caminho } = req.body;
    try {
        if (!caminho) return res.json({ success: false, message: 'Caminho não fornecido' });
        
        // Verifica se ? um diretório acessível
        const stats = require('fs').statSync(caminho, { throwIfNoEntry: false });
        if (!stats) {
            // Tenta criar se não existe
            require('fs').mkdirSync(caminho, { recursive: true });
        } else if (!stats.isDirectory()) {
            return res.json({ success: false, message: 'O caminho existe mas não ? uma pasta' });
        }
        
        return res.json({ success: true, message: 'Caminho válido e acessível' });
    } catch (error) {
        return res.json({ success: false, message: 'O caminho especificado ? inválido ou você não tem permissão de acesso.' });
    }
});

app.put('/api/config', tenantMiddleware, async (req, res) => {
    try {
        const { restringirApontamento, processosVisiveis, maxRegistros, permitirRealizadoSemPlanejamento, enderecoSalvarCNHMotorista } = req.body;

        await ensureConfigColumns(pool);

        const [existing] = await req.tenantDbPool.execute('SELECT id FROM configuracaosistema LIMIT 1');

        const updates = [];
        const params = [];

        if (restringirApontamento !== undefined) {
            updates.push('RestringirApontamentoSemSaldoAnterior = ?');
            params.push(restringirApontamento);
        }
        if (processosVisiveis !== undefined) {
            updates.push('ProcessosVisiveis = ?');
            params.push(processosVisiveis);
        }
        if (maxRegistros !== undefined) {
            updates.push('MaxRegistros = ?');
            params.push(maxRegistros);
        }
        if (permitirRealizadoSemPlanejamento !== undefined) {
            updates.push('PermitirRealizadoSemPlanejamento = ?');
            params.push(permitirRealizadoSemPlanejamento);
        }

        if (updates.length > 0) {
            if (existing.length > 0) {
                await req.tenantDbPool.execute(
                    'UPDATE configuracaosistema SET ' + updates.join(', ') + ' WHERE id = ?',
                    [...params, existing[0].id]
                );
            } else {
                const defaultProcessos = JSON.stringify(['corte','dobra','solda','pintura','montagem','medicao','isometrico','engenharia','aprovacao','acabamento','expedicao']);
                await req.tenantDbPool.execute(
                    `INSERT INTO configuracaosistema (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC, MaxRegistros, PermitirRealizadoSemPlanejamento)
                     VALUES (?, ?, 'corte', ?, ?)`,
                    [restringirApontamento || 'Não', processosVisiveis || defaultProcessos, maxRegistros || 500, permitirRealizadoSemPlanejamento || 'Sim']
                );
            }
        }

        console.log('[Config PUT] Configurações salvas no banco ativo.');
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('[Config PUT] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configurações' });
    }
});

// GET /api/config/setores - Retornar Setores
app.get('/api/config/setores', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute("SELECT processofabricacao AS Setor FROM processofabricacao WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY processofabricacao ASC");
        res.json({ success: true, setores: rows.map(r => r.Setor) });
    } catch (error) {
        console.error('Error fetching setores:', error);
        res.status(500).json({ success: false });
    }
});

// GET /api/config/usuarios - Retornar Usu?rios (Colaboradores)
app.get('/api/config/usuarios', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute("SELECT IdUsuario, NomeCompleto FROM usuario WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY NomeCompleto");
        res.json({ success: true, usuarios: rows });
    } catch (error) {
        console.error('Error fetching usuarios:', error);
        res.status(500).json({ success: false });
    }
});

// GET /api/config/tipostarefa - Retornar Tipos de Tarefa
app.get('/api/config/tipostarefa', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute("SELECT IdTipoTarefa, TipoTarefa FROM tipotarefa WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY TipoTarefa");
        res.json({ success: true, tipostarefa: rows });
    } catch (error) {
        console.error('Error fetching tipos tarefa:', error);
        res.status(500).json({ success: false });
    }
});

// POST /api/producao/pendencia - Gerar Pend?ncia (A??o 2)
app.post('/api/producao/pendencia', tenantMiddleware, async (req, res) => {
    const data = req.body;

    if (!data.idOrdemServicoItem || !data.descricaoPendencia) {
        return res.status(400).json({ success: false, message: 'ID do item e descri??o s?o obrigatórios.' });
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
            return res.json({ success: true, message: 'Pend?ncia finalizada com sucesso!' });
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
            return res.json({ success: true, message: 'Pend?ncia atualizada com sucesso!' });
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
        res.json({ success: true, message: 'Pend?ncia gerada com sucesso!' });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[POST /api/producao/pendencia] Error:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar pend?ncia.' });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/producao/pendencias/historico - Listar pend?ncias vinculadas a um item (por CodMatFabricante)
app.get('/api/producao/pendencias/historico', tenantMiddleware, async (req, res) => {
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

        const [rows] = await req.tenantDbPool.execute(sql, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching RNC history:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar histórico' });
    }
});

// POST /api/producao/reposicao - Gerar Reposi??o
app.post('/api/producao/reposicao', tenantMiddleware, async (req, res) => {
    console.log('[POST /api/producao/reposicao] req.body chamado com:', req.body);
    const { idOrdemServicoItem, qtdeReposicao, motivo, usuario } = req.body;

    if (!idOrdemServicoItem || !qtdeReposicao || qtdeReposicao <= 0) {
        return res.status(400).json({ success: false, message: 'ID do item e quantidade v?lida s?o obrigatórios.' });
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
            return res.status(404).json({ success: false, message: 'Item original não encontrado.' });
        }

        const itemPai = itemRows[0];
        const qtdeAtualReposicao = Number(itemPai.QtdeReposicao) || 0;
        const novaQtdeReposicao = qtdeAtualReposicao + Number(qtdeReposicao);

        // 2. Atualizar quantidade de reposi??o no item pai original
        await conn.execute(
            `UPDATE ordemservicoitem SET QtdeReposicao = ? WHERE IdOrdemServicoItem = ?`,
            [novaQtdeReposicao, idOrdemServicoItem].map(p => p === undefined ? '' : p)
        );

        // 3. Preparar inser??o do Item de Reposi??o Pai
        // Clonar dados do pai ajustando QtdeTotal, Reposicao e campos de status
        const pesoOriginal = parseFloat(itemPai.Peso?.toString().replace(',', '.') || '0');
        // Peso original da pe?a ou proporcional - VB.NET usa PesoUnitario * entrada. Mas QtdeTotal original do BD já armazena Qtde do pai.
        // Vamos usar o PesoUnitario calculado se existir ou proporcional.

        let pesoUnitario = parseFloat(itemPai.PesoUnitario?.toString().replace(',', '.') || '0');
        if (pesoUnitario === 0 && Number(itemPai.QtdeTotal) > 0) {
            pesoUnitario = pesoOriginal / Number(itemPai.QtdeTotal);
        }

        const novoQtdeTotal = Number(qtdeReposicao);
        const novoPesoTotal = pesoUnitario * novoQtdeTotal;
        const novoAreaPinturaUnitario = parseFloat(itemPai.AreaPinturaUnitario?.toString().replace(',', '.') || '0');
        const novaAreaPinturaTotal = novoAreaPinturaUnitario * novoQtdeTotal;

        // Limpar status de execu??o dos diversos setores conforme o VB
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

        // Inicializar TotalExecutar do primeiro setor com processo
        await inicializarPrimeiroSetor(conn, novoIdPai);

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

                    const [resFilho] = await conn.execute(sqlInsertFilho, paramsFilho);
                    // Inicializar TotalExecutar do primeiro setor do item filho
                    if (resFilho.insertId) await inicializarPrimeiroSetor(conn, resFilho.insertId);
                }
            }
        }

        // Criar a pendencia para o item na rotina do VB.NET 
        // MontarPendenciaReposicao(dgvItemOrdemservico)
        // Optamos por simular o log m?nimo na ordemservicoitempendencia ou ordemservicoitemcontrole
        await conn.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor, DataCriacao, D_E_L_E_T_E, DescricaoEstorno
            ) VALUES (?, ?, 'Reposicao', ?, ?, ?, '', 'GEROU REPOSICAO')`,
            [idOrdemServicoItem, itemPai.IdOrdemServico, novoQtdeTotal, usuario || 'Sistema', nowFormat].map(p => p === undefined ? '' : p)
        );

        await conn.commit();
        res.json({ success: true, message: `Reposi??o gerada com sucesso! ${novoQtdeTotal} itens clonados para a nova reposi??o.` });

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('[API] Error in POST /api/producao/reposicao:', error);
        res.status(500).json({ success: false, message: 'Erro ao gerar reposi??o: ' + error.message });
    } finally {
        if (conn) conn.release();
    }
});


// ==========================================
// LIMITES DE TEMPO DIARIO DE PRODUCAO
// ==========================================

app.get('/api/config/limites-recursos', tenantMiddleware, async (req, res) => {
    const queryPool = req.tenantDbPool || pool;
    try {
        const [rows] = await queryPool.execute('SELECT id, recurso, limite_minutos, visivel FROM producaorecursodiario');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[API] Erro ao buscar limites:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar limites' });
    }
});

app.get('/api/config/limites-recursos/:id', tenantMiddleware, async (req, res) => {
    const queryPool = req.tenantDbPool || pool;
    try {
        const [rows] = await queryPool.execute('SELECT id, recurso, limite_minutos, visivel FROM producaorecursodiario WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Não encontrado' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar limite' });
    }
});

app.post('/api/config/limites-recursos', tenantMiddleware, async (req, res) => {
    const { recurso, limite_minutos, visivel } = req.body;
    if (!recurso || limite_minutos === undefined) {
        return res.status(400).json({ success: false, message: 'Parâmetros inválidos' });
    }

    const queryPool = req.tenantDbPool || pool;
    try {
        const [result] = await queryPool.execute('INSERT INTO producaorecursodiario (recurso, limite_minutos, visivel) VALUES (?, ?, ?)', [recurso, limite_minutos, visivel || 'SIM']);
        res.json({ success: true, message: 'Criado com sucesso', id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ success: false, message: 'Já existe um limite para este recurso' });
        }
        res.status(500).json({ success: false, message: 'Erro ao salvar limite: ' + error.message });
    }
});

app.put('/api/config/limites-recursos/:id', tenantMiddleware, async (req, res) => {
    const { recurso, limite_minutos, visivel } = req.body;
    const queryPool = req.tenantDbPool || pool;
    try {
        await queryPool.execute('UPDATE producaorecursodiario SET recurso = ?, limite_minutos = ?, visivel = ? WHERE id = ?', [recurso, limite_minutos, visivel || 'SIM', req.params.id]);
        res.json({ success: true, message: 'Atualizado com sucesso' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).json({ success: false, message: 'Já existe um limite para este recurso' });
        }
        res.status(500).json({ success: false, message: 'Erro ao atualizar' });
    }
});

app.delete('/api/config/limites-recursos/:id', tenantMiddleware, async (req, res) => {
    const queryPool = req.tenantDbPool || pool;
    try {
        await queryPool.execute('DELETE FROM producaorecursodiario WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao excluir' });
    }
});

// Configuração - UPDATE

// MENU CONFIGURATION
// GET Menu Structure
// COPY-ON-FIRST-READ: Se o banco ativo não tiver menu próprio, retorna o menu do lynxlocal como template.
// Qualquer escrita (POST /api/config/menu) salva localmente e quebra o vínculo com lynxlocal.
app.get('/api/config/menu', tenantMiddleware, async (req, res) => {
    try {
        // Verifica se o banco ativo já tem configuração própria (ao menos 1 linha)
        const [countRows] = await req.tenantDbPool.execute('SELECT COUNT(*) as cnt FROM configuracaosistema');
        const tenantHasOwnConfig = countRows[0].cnt > 0;

        if (tenantHasOwnConfig) {
            // Banco ativo tem linha própria: usa o MenuStructure local
            const [rows] = await req.tenantDbPool.execute('SELECT MenuStructure FROM configuracaosistema LIMIT 1');
            if (rows.length > 0 && rows[0].MenuStructure) {
                try {
                    const menu = JSON.parse(rows[0].MenuStructure);
                    return res.json({ success: true, menu, source: 'local' });
                } catch (e) {}
            }
            // Se tem linha mas MenuStructure está vazio, continua para buscar do lynxlocal
        }

        // Banco ativo não tem config própria: tenta buscar menu do lynxlocal como template
        try {
            const lynxPool = await getLynxLocalPool();
            if (lynxPool) {
                const [lynxRows] = await lynxPool.execute('SELECT MenuStructure FROM configuracaosistema LIMIT 1');
                if (lynxRows.length > 0 && lynxRows[0].MenuStructure) {
                    try {
                        const menu = JSON.parse(lynxRows[0].MenuStructure);
                        console.log('[Config/Menu GET] Retornando menu do lynxlocal como template para banco sem config própria.');
                        return res.json({ success: true, menu, source: 'lynxlocal_template' });
                    } catch (e) {}
                }
            }
        } catch (lynxErr) {
            console.warn('[Config/Menu GET] Não foi possível buscar menu template do lynxlocal:', lynxErr.message);
        }

        // Sem template: frontend usa o menu padrão
        res.json({ success: true, menu: null, source: 'default' });
    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar menu' });
    }
});


// SAVE Menu Structure
// Esta escrita quebra o vínculo com o lynxlocal permanentemente para este banco.
app.post('/api/config/menu', tenantMiddleware, async (req, res) => {
    const { menu } = req.body;
    try {
        await ensureConfigColumns(req.tenantDbPool);
        const menuJson = JSON.stringify(menu);
        const [rows] = await req.tenantDbPool.execute('SELECT id FROM configuracaosistema LIMIT 1');
        if (rows.length > 0) {
            await req.tenantDbPool.execute('UPDATE configuracaosistema SET MenuStructure = ? WHERE id = ?', [menuJson, rows[0].id]);
        } else {
            await req.tenantDbPool.execute('INSERT INTO configuracaosistema (MenuStructure) VALUES (?)', [menuJson]);
        }
        console.log('[Config/Menu POST] Menu salvo localmente. Banco agora tem config própria.');
        res.json({ success: true });
    } catch (error) {
        console.error('Menu save error:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar menu' });
    }
});

// --- CRUD: Usu?rios ---

// LIST Users
app.get('/api/usuario', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
            SELECT idUsuario, NomeCompleto, Login, TipoUsuario, email, status 
            FROM usuario 
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' 
            ORDER BY NomeCompleto
            `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
    }
});

// ADMIN: LIST Users with filters (NomeCompleto, Setor) — tenant-aware
app.get('/api/admin/usuarios', tenantMiddleware, async (req, res) => {
    try {
        const { NomeCompleto, Setor } = req.query;

        const filtros = ["(D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')"];
        const params = [];

        if (NomeCompleto) { filtros.push('NomeCompleto LIKE ?'); params.push(`%${NomeCompleto}%`); }
        if (Setor)        { filtros.push('Setor LIKE ?');        params.push(`%${Setor}%`); }

        const [rows] = await req.tenantDbPool.execute(`
            SELECT idUsuario, NomeCompleto, Login, Senha, TipoUsuario, Setor, email, status,
                   Descricao, Sigla, EnderecoImagem,
                   txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
                   MapaProducao, Romaneio, OrdemServico, SolidWorks,
                   GerenciamentoProducao, VisaoGeralProducao,
                   Comercial, Financeiro, Teste, Expedicao
            FROM usuario
            WHERE ${filtros.join(' AND ')}
            ORDER BY NomeCompleto ASC
        `, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[Admin/Usuarios] Erro:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários: ' + error.message });
    }
});


// GET ONE User
app.get('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            'SELECT idUsuario, NomeCompleto, Login, Senha, TipoUsuario, email, status FROM usuario WHERE idUsuario = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usu?rio não encontrado' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
    }
});

// CREATE User (with Central Sync)
app.post('/api/usuario', tenantMiddleware, async (req, res) => {
    const { NomeCompleto, Login, Senha, TipoUsuario, Setor, email, Descricao, Sigla,
            txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
            MapaProducao, Romaneio, OrdemServico, SolidWorks,
            GerenciamentoProducao, VisaoGeralProducao,
            Comercial, Financeiro, Teste, Expedicao } = req.body;

    if (!NomeCompleto || !Login || !Senha || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login, Senha e Tipo são obrigatórios' });
    }

    try {
        // Check if NomeCompleto already exists
        const [existingName] = await req.tenantDbPool.execute(
            "SELECT NomeCompleto FROM usuario WHERE NomeCompleto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')",
            [NomeCompleto.trim()]
        );
        if (existingName.length > 0) {
            return res.status(400).json({ success: false, message: 'Nome de Usuário já Cadastrado!' });
        }

        // Check if Login already exists
        const [existingLogin] = await req.tenantDbPool.execute(
            "SELECT idUsuario FROM usuario WHERE Login = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')",
            [Login.trim()]
        );
        if (existingLogin.length > 0) {
            return res.status(400).json({ success: false, message: 'Nome de Login já Cadastrado, favor informar outro Login!' });
        }

        const now = getCurrentDateTimeBR();
        const [result] = await req.tenantDbPool.execute(
            `INSERT INTO usuario (
                NomeCompleto, Login, Senha, TipoUsuario, Setor, email,
                Descricao, Sigla, DataCadastro, CriadoPor, status,
                txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
                MapaProducao, Romaneio, OrdemServico, SolidWorks,
                GerenciamentoProducao, VisaoGeralProducao,
                Comercial, Financeiro, Teste, Expedicao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                NomeCompleto.trim().toUpperCase(), Login.trim(), Senha, TipoUsuario,
                Setor || '', email || '', Descricao || '', Sigla || '',
                now, 'Sistema', 'A',
                txtCorte || '', txtDobra || '', txtSolda || '', txtPintura || '',
                txtMontagem || '', txtAlmoxarifado || '',
                MapaProducao || '', Romaneio || '', OrdemServico || '', SolidWorks || '',
                GerenciamentoProducao || '', VisaoGeralProducao || '',
                Comercial || '', Financeiro || '', Teste || '', Expedicao || ''
            ]
        );
        res.json({ success: true, message: 'Usuário cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating usuario:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar usuário: ' + error.message });
    }
});
// UPDATE User (with all permission fields)
app.put('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    const id = req.params.id;
    const { NomeCompleto, Login, Senha, TipoUsuario, Setor, email, Descricao, Sigla,
            txtCorte, txtDobra, txtSolda, txtPintura, txtMontagem, txtAlmoxarifado,
            MapaProducao, Romaneio, OrdemServico, SolidWorks,
            GerenciamentoProducao, VisaoGeralProducao,
            Comercial, Financeiro, Teste, Expedicao } = req.body;

    if (!NomeCompleto || !Login || !TipoUsuario) {
        return res.status(400).json({ success: false, message: 'Nome, Login e Tipo são obrigatórios' });
    }

    try {
        const now = getCurrentDateTimeBR();

        let sql = `UPDATE usuario SET
            NomeCompleto = ?, Login = ?, TipoUsuario = ?,
            Setor = ?, email = ?, Descricao = ?, Sigla = ?,
            txtCorte = ?, txtDobra = ?, txtSolda = ?, txtPintura = ?,
            txtMontagem = ?, txtAlmoxarifado = ?,
            MapaProducao = ?, Romaneio = ?, OrdemServico = ?, SolidWorks = ?,
            GerenciamentoProducao = ?, VisaoGeralProducao = ?,
            Comercial = ?, Financeiro = ?, Teste = ?, Expedicao = ?`;

        const values = [
            NomeCompleto.trim().toUpperCase(), Login.trim(), TipoUsuario,
            Setor || '', email || '', Descricao || '', Sigla || '',
            txtCorte || '', txtDobra || '', txtSolda || '', txtPintura || '',
            txtMontagem || '', txtAlmoxarifado || '',
            MapaProducao || '', Romaneio || '', OrdemServico || '', SolidWorks || '',
            GerenciamentoProducao || '', VisaoGeralProducao || '',
            Comercial || '', Financeiro || '', Teste || '', Expedicao || ''
        ];

        // Only update password if provided
        if (Senha && Senha.trim() !== '' && Senha !== '••••••••') {
            sql += ', Senha = ?';
            values.push(Senha);
        }

        sql += ' WHERE idUsuario = ?';
        values.push(id);

        await req.tenantDbPool.execute(sql, values);
        res.json({ success: true, message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário: ' + error.message });
    }
});

// DELETE User (Soft)
app.delete('/api/usuario/:id', tenantMiddleware, async (req, res) => {
    try {
        const now = getCurrentDateTimeBR();
        await req.tenantDbPool.execute(
            "UPDATE usuario SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = 'Sistema' WHERE idUsuario = ?",
            [now, req.params.id]
        );
        res.json({ success: true, message: 'Usuário excluído' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir usuário' });
    }
});

// --- RNC / PENDÊNCIA ROMANEIO ---

// GET /api/rnc/sectors - List all sectors from dedicated table
app.get('/api/rnc/sectors', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT DISTINCT Setor FROM setor WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY Setor"
        );
        res.json({ success: true, data: rows.map(r => r.Setor) });
    } catch (error) {
        console.error('Error fetching sectors:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar setores' });
    }
});


// --- RECURSOS (PROCESSOS DE FABRICACAO) CRUD ---

// Helper function to auto-create missing fields in processofabricacao
const ensureProcessoFieldsAndRetry = async (pool, query, params) => {
    try {
        return await pool.execute(query, params);
    } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR' && (error.message.includes('Setup') || error.message.includes('TempoPadrao'))) {
            console.log('Missing fields in processofabricacao detected, attempting to create Setup and TempoPadrao...');
            try { await pool.execute('ALTER TABLE processofabricacao ADD COLUMN Setup DECIMAL(10,2) NULL'); } catch(e) {}
            try { await pool.execute('ALTER TABLE processofabricacao ADD COLUMN TempoPadrao DECIMAL(10,2) NULL'); } catch(e) {}
            console.log('Retrying the original query...');
            return await pool.execute(query, params);
        }
        throw error;
    }
};



// Helper to lazily create columns for new generic resources
const ensureDynamicResourceColumns = async (pool, resourceName) => {
    if (!resourceName) return;
    const cleanResource = resourceName.trim().replace(/\s+/g, '');
    if (!cleanResource) return;
    
    try {
        const [rows] = await pool.execute(`SHOW COLUMNS FROM ordemservicoitem`);
        const existingCols = rows.map(c => c.Field.toLowerCase());
        
        const columnsToAdd = [
            { name: `txt${cleanResource}`, type: 'VARCHAR(255) NULL' },
            { name: `${cleanResource}TotalExecutado`, type: 'VARCHAR(255) NULL' },
            { name: `PlanejadoInicio${cleanResource}`, type: 'DATETIME NULL' },
            { name: `PlanejadoFinal${cleanResource}`, type: 'DATETIME NULL' },
            { name: `RealizadoInicio${cleanResource}`, type: 'DATETIME NULL' },
            { name: `RealizadoFinal${cleanResource}`, type: 'DATETIME NULL' }
        ];
        
        for (const col of columnsToAdd) {
            if (!existingCols.includes(col.name.toLowerCase())) {
                try {
                    await pool.execute(`ALTER TABLE ordemservicoitem ADD COLUMN \`${col.name}\` ${col.type}`);
                    console.log(`Column ${col.name} added to ordemservicoitem`);
                } catch (err) {
                    console.error(`Error adding ${col.name}:`, err.message);
                }
            }
        }
        
        const [osCols] = await pool.execute(`SHOW COLUMNS FROM ordemservico`);
        const existingOsCols = osCols.map(c => c.Field.toLowerCase());
        
        const osColumnsToAdd = [
            { name: `PlanejadoInicio${cleanResource}`, type: 'DATETIME NULL' },
            { name: `PlanejadoFinal${cleanResource}`, type: 'DATETIME NULL' },
            { name: `RealizadoInicio${cleanResource}`, type: 'DATETIME NULL' },
            { name: `RealizadoFinal${cleanResource}`, type: 'DATETIME NULL' }
        ];
        
        for (const col of osColumnsToAdd) {
            if (!existingOsCols.includes(col.name.toLowerCase())) {
                try {
                    await pool.execute(`ALTER TABLE ordemservico ADD COLUMN \`${col.name}\` ${col.type}`);
                    console.log(`Column ${col.name} added to ordemservico`);
                } catch (err) {
                    console.error(`Error adding ${col.name} to ordemservico:`, err.message);
                }
            }
        }

        // --- TAGS TABLE ---
        try {
            const [tagsCols] = await pool.execute(`SHOW COLUMNS FROM tags`);
            const existingTagsCols = tagsCols.map(c => c.Field.toLowerCase());
            
            const tagsColumnsToAdd = [
                { name: `PlanejadoInicio${cleanResource}`, type: 'DATETIME NULL' },
                { name: `PlanejadoFinal${cleanResource}`, type: 'DATETIME NULL' },
                { name: `RealizadoInicio${cleanResource}`, type: 'DATETIME NULL' },
                { name: `RealizadoFinal${cleanResource}`, type: 'DATETIME NULL' }
            ];
            
            for (const col of tagsColumnsToAdd) {
                if (!existingTagsCols.includes(col.name.toLowerCase())) {
                    try {
                        await pool.execute(`ALTER TABLE tags ADD COLUMN \`${col.name}\` ${col.type}`);
                        console.log(`Column ${col.name} added to tags`);
                    } catch (err) {
                        console.error(`Error adding ${col.name} to tags:`, err.message);
                    }
                }
            }
        } catch (e) {
            console.error('ensureDynamicResourceColumns failed for tags:', e);
        }

    } catch (e) {
        console.error('ensureDynamicResourceColumns failed:', e);
    }
};

// Cache to track which resources have had their dynamic columns verified
const syncedTenantResources = new Map(); // Key: dbName_resourceName

// GET /api/recursos - Listar todos os recursos
app.get('/api/recursos', tenantMiddleware, async (req, res) => {
    try {
        const query = "SELECT IdProcessoFabricacao, processofabricacao, CodigoProcessoFabricacao, DataLiberada, Fabrica, Setup, TempoPadrao, DataCriacao, CriadoPor FROM processofabricacao WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY processofabricacao ASC";
        const [rows] = await ensureProcessoFieldsAndRetry(req.tenantDbPool, query, []);
        // Log distinct Fabrica values to diagnose tenant-specific issues
        const fabricaValues = [...new Set(rows.map(r => r.Fabrica))];
        console.log(`[Recursos] Tenant: ${req.tenantId || 'default'} | Total: ${rows.length} | Fabrica values: ${JSON.stringify(fabricaValues)}`);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching recursos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar recursos' });
    }
});

// POST /api/recursos - Criar novo recurso
app.post('/api/recursos', tenantMiddleware, async (req, res) => {
    const { processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao } = req.body;
    const usuario = req.tenantUser?.login || req.tenantUser?.nomeCompleto || 'Sistema';
    const idMatriz = req.tenantUser?.tenantId || null;
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    try {
        const query = "INSERT INTO processofabricacao (processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao, CriadoPor, DataCriacao, IdMatriz) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [processofabricacao, CodigoProcessoFabricacao || '', Fabrica || 'NAO', DataLiberada || 'NAO', Setup || null, TempoPadrao || null, usuario, nowFormat, idMatriz];
        await ensureProcessoFieldsAndRetry(req.tenantDbPool, query, params);
                // Dynamically create columns for the new resource so queries like Visão Geral won't fail
        await ensureDynamicResourceColumns(req.tenantDbPool, processofabricacao);
        
        res.json({ success: true, message: 'Recurso criado com sucesso' });
    } catch (error) {
        console.error('Error creating recurso:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar recurso' });
    }
});

// PUT /api/recursos/:id - Atualizar recurso
app.put('/api/recursos/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao } = req.body;
    try {
        // --- NEW VALIDATION ---
        const [oldRows] = await req.tenantDbPool.execute('SELECT processofabricacao, Fabrica FROM processofabricacao WHERE IdProcessoFabricacao = ?', [id]);
        if (oldRows.length > 0) {
            const oldProc = oldRows[0];
            const oldFabrica = oldProc.Fabrica || 'NAO';
            const newFabrica = Fabrica || 'NAO';
            
            if (oldFabrica !== newFabrica) {
                const procNameFormatado = (oldProc.processofabricacao || '').trim().replace(/\s+/g, '');
                if (procNameFormatado) {
                    const colName = `txt${procNameFormatado}`;
                    const [cols] = await req.tenantDbPool.execute(`SHOW COLUMNS FROM ordemservicoitem LIKE '${colName}'`);
                    if (cols.length > 0) {
                        const [usage] = await req.tenantDbPool.execute(`SELECT 1 FROM ordemservicoitem WHERE \`${colName}\` = '1' LIMIT 1`);
                        if (usage.length > 0) {
                            return res.status(400).json({ success: false, message: 'Não ? possível alterar o campo Fabrica porque este processo já está montado em um item de Ordem de Serviço.' });
                        }
                    }
                }
            }
        }
        // --- END VALIDATION ---

        const query = "UPDATE processofabricacao SET processofabricacao = ?, CodigoProcessoFabricacao = ?, Fabrica = ?, DataLiberada = ?, Setup = ?, TempoPadrao = ? WHERE IdProcessoFabricacao = ?";
        const params = [processofabricacao, CodigoProcessoFabricacao || '', Fabrica || 'NAO', DataLiberada || 'NAO', Setup || null, TempoPadrao || null, id];
        await ensureProcessoFieldsAndRetry(req.tenantDbPool, query, params);
        res.json({ success: true, message: 'Recurso atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating recurso:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar recurso' });
    }
});

// DELETE /api/recursos/:id - Excluir recurso
app.delete('/api/recursos/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const usuario = req.tenantUser?.login || 'Sistema';
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    try {
        await req.tenantDbPool.execute(
            "UPDATE processofabricacao SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdProcessoFabricacao = ?",
            [nowFormat, usuario, id]
        );
        res.json({ success: true, message: 'Recurso excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting recurso:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir recurso' });
    }
});

// --- SETORES CRUD ---

// GET /api/setores - Listar todos os setores (usado na tela de Manutenção)
app.get('/api/setores', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT idSetor, Setor, DataLiberada, Fabrica, DataCriacao, CriadoPor FROM setor WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY idSetor DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching setores:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar setores' });
    }
});

// POST /api/setores - Criar novo setor
app.post('/api/setores', tenantMiddleware, async (req, res) => {
    const { Setor, Fabrica, DataLiberada } = req.body;
    const usuario = req.tenantUser?.login || 'Sistema';
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        await req.tenantDbPool.execute(
            "INSERT INTO setor (Setor, Fabrica, DataLiberada, CriadoPor, DataCriacao) VALUES (?, ?, ?, ?, ?)",
            [Setor, Fabrica || 'NAO', DataLiberada || 'NAO', usuario, nowFormat]
        );
        res.json({ success: true, message: 'Setor criado com sucesso' });
    } catch (error) {
        console.error('Error creating setor:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar setor' });
    }
});

// PUT /api/setores/:id - Atualizar setor
app.put('/api/setores/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { Setor, Fabrica, DataLiberada } = req.body;
    try {
        await req.tenantDbPool.execute(
            "UPDATE setor SET Setor = ?, Fabrica = ?, DataLiberada = ? WHERE idSetor = ?",
            [Setor, Fabrica, DataLiberada, id]
        );
        res.json({ success: true, message: 'Setor atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating setor:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar setor' });
    }
});

// DELETE /api/setores/:id - Excluir setor (Soft delete)
app.delete('/api/setores/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const usuario = req.tenantUser?.login || 'Sistema';
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        await req.tenantDbPool.execute(
            "UPDATE setor SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE idSetor = ?",
            [nowFormat, usuario, id]
        );
        res.json({ success: true, message: 'Setor excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting setor:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir setor' });
    }
});

// --- MOTORISTAS API ---

// GET /api/motoristas - Listar todos os motoristas
app.get('/api/motoristas', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT * FROM motorista WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY Motorista"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching motoristas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar motoristas' });
    }
});


// POST /api/motoristas/upload-cnh - Fazer upload da imagem da CNH
app.post('/api/motoristas/upload-cnh', tenantMiddleware, uploadCNH.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }
    const fileUrl = '/fotosfuncionarios/' + req.file.filename;
    res.json({ success: true, url: fileUrl });
});

// POST /api/motoristas - Criar novo motorista
app.post('/api/motoristas', tenantMiddleware, async (req, res) => {
    const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH } = req.body;
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        await req.tenantDbPool.execute(
            "INSERT INTO motorista (Motorista, CNH, Categoria, Telefone, DataCadastro) VALUES (?, ?, ?, ?, ?)",
            [Motorista, CNH || '', Categoria || '', Telefone || '', DataVencimentoCNH || null, nowFormat]
        );
        res.json({ success: true, message: 'Motorista criado com sucesso' });
    } catch (error) {
        console.error('Error creating motorista:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar motorista' });
    }
});

// PUT /api/motoristas/:id - Atualizar motorista
app.put('/api/motoristas/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { Motorista, CNH, Categoria, Telefone, DataVencimentoCNH, ImagemCNH } = req.body;
    try {
        await req.tenantDbPool.execute(
            "UPDATE motorista SET Motorista = ?, CNH = ?, Categoria = ?, Telefone = ?, DataVencimentoCNH = ?, ImagemCNH = ? WHERE IdMotorista = ?",
              [Motorista, CNH || '', Categoria || '', Telefone || '', DataVencimentoCNH || null, ImagemCNH || null, id]
        );
        res.json({ success: true, message: 'Motorista atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating motorista:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar motorista' });
    }
});

// DELETE /api/motoristas/:id - Excluir motorista (Soft delete)
app.delete('/api/motoristas/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const usuario = req.tenantUser?.login || 'Sistema';
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        await req.tenantDbPool.execute(
            "UPDATE motorista SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdMotorista = ?",
            [nowFormat, usuario, id]
        );
        res.json({ success: true, message: 'Motorista excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting motorista:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir motorista' });
    }
});

// --- TIPO DE TRANSPORTE API ---

// GET /api/tipotransporte - Listar todos os tipos de transporte (não deletados)
app.get('/api/tipotransporte', tenantMiddleware, async (req, res) => {
    try {
        // Auto-create table if not exists
        await req.tenantDbPool.execute(`
            CREATE TABLE IF NOT EXISTS tipotransporte (
                IdTipoTransporte INT AUTO_INCREMENT PRIMARY KEY,
                TipoVeiculo VARCHAR(80) NOT NULL,
                Placa VARCHAR(10) DEFAULT '',
                DataCadastro VARCHAR(30) DEFAULT '',
                D_E_L_E_T_E VARCHAR(2) DEFAULT '',
                DataD_E_L_E_T_E VARCHAR(30) DEFAULT '',
                UsuarioD_E_L_E_T_E VARCHAR(80) DEFAULT ''
            )
        `);
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdTipoTransporte, TipoVeiculo, Placa FROM tipotransporte WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY TipoVeiculo"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching tipotransporte:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tipos de transporte' });
    }
});

// POST /api/tipotransporte - Criar novo tipo de transporte
app.post('/api/tipotransporte', tenantMiddleware, async (req, res) => {
    const { TipoVeiculo, Placa } = req.body;
    if (!TipoVeiculo || !TipoVeiculo.trim()) {
        return res.status(400).json({ success: false, message: 'Tipo de Veículo ? obrigatório' });
    }
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        const [result] = await req.tenantDbPool.execute(
            "INSERT INTO tipotransporte (TipoVeiculo, Placa, DataCadastro) VALUES (?, ?, ?)",
            [TipoVeiculo.trim().toUpperCase(), (Placa || '').trim().toUpperCase(), nowFormat]
        );
        res.json({ success: true, message: 'Tipo de transporte criado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating tipotransporte:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar tipo de transporte' });
    }
});

// PUT /api/tipotransporte/:id - Atualizar tipo de transporte
app.put('/api/tipotransporte/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { TipoVeiculo, Placa } = req.body;
    if (!TipoVeiculo || !TipoVeiculo.trim()) {
        return res.status(400).json({ success: false, message: 'Tipo de Veículo ? obrigatório' });
    }
    try {
        await req.tenantDbPool.execute(
            "UPDATE tipotransporte SET TipoVeiculo = ?, Placa = ? WHERE IdTipoTransporte = ?",
            [TipoVeiculo.trim().toUpperCase(), (Placa || '').trim().toUpperCase(), id]
        );
        res.json({ success: true, message: 'Tipo de transporte atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating tipotransporte:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar tipo de transporte' });
    }
});

// DELETE /api/tipotransporte/:id - Excluir tipo de transporte (Soft delete)
app.delete('/api/tipotransporte/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const usuario = req.tenantUser?.login || 'Sistema';
    const now = new Date();
    const nowFormat = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    try {
        await req.tenantDbPool.execute(
            "UPDATE tipotransporte SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = ?, UsuarioD_E_L_E_T_E = ? WHERE IdTipoTransporte = ?",
            [nowFormat, usuario, id]
        );
        res.json({ success: true, message: 'Tipo de transporte excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting tipotransporte:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir tipo de transporte' });
    }
});

// GET /api/processosfabricacao - Lista todos os processos de fabricação ativos
// NOTA: não usar /api/usuario/processos pois conflita com /api/usuario/:id
app.get('/api/processosfabricacao', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdProcessoFabricacao, ProcessoFabricacao, CodigoProcessoFabricacao FROM processofabricacao WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY ProcessoFabricacao"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching processos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar processos de fabricação: ' + error.message });
    }
});

// GET /api/processosfabricacao/usuario/:id - Lista processos vinculados ao usuário
app.get('/api/processosfabricacao/usuario/:id', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdUsuarioprocessofabricacao, ProcessoFabricacao, IdProcessoFabricacao FROM usuarioprocessofabricacao WHERE IdUsuario = ? AND (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL) ORDER BY ProcessoFabricacao",
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching user processos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar processos do usuário: ' + error.message });
    }
});

// POST /api/processosfabricacao/associar - Associa um processo a um usuário
app.post('/api/processosfabricacao/associar', tenantMiddleware, async (req, res) => {
    const { IdUsuario, IdProcessoFabricacao, ProcessoFabricacao } = req.body;
    if (!IdUsuario || !IdProcessoFabricacao) return res.status(400).json({ success: false, message: 'Faltam dados obrigatórios' });
    try {
        // Verificar se já existe
        const [existing] = await req.tenantDbPool.execute(
            "SELECT 1 FROM usuarioprocessofabricacao WHERE IdUsuario = ? AND IdProcessoFabricacao = ? AND (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL)",
            [IdUsuario, IdProcessoFabricacao]
        );
        if (existing.length > 0) return res.json({ success: false, message: 'Este processo já está associado a este usuário.' });

        // Inserir
        await req.tenantDbPool.execute(
            "INSERT INTO usuarioprocessofabricacao (IdUsuario, IdProcessoFabricacao, ProcessoFabricacao) VALUES (?, ?, ?)",
            [IdUsuario, IdProcessoFabricacao, ProcessoFabricacao]
        );
        res.json({ success: true, message: 'Processo associado com sucesso!' });
    } catch (error) {
        console.error('Error associating processo:', error);
        res.status(500).json({ success: false, message: 'Erro ao associar processo: ' + error.message });
    }
});

// DELETE /api/processosfabricacao/desvincular/:id - Remove associação (Desvincula)
app.delete('/api/processosfabricacao/desvincular/:id', tenantMiddleware, async (req, res) => {
    try {
        // Exclusão lógica padrão do sistema
        await req.tenantDbPool.execute(
            "UPDATE usuarioprocessofabricacao SET D_E_L_E_T_E = '*' WHERE IdUsuarioprocessofabricacao = ?",
            [req.params.id]
        );
        res.json({ success: true, message: 'Processo desvinculado com sucesso!' });
    } catch (error) {
        console.error('Error disassociating processo:', error);
        res.status(500).json({ success: false, message: 'Erro ao desvincular processo: ' + error.message });
    }
});

// GET /api/config/espessuras - List all espessuras
app.get('/api/config/espessuras', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute("SELECT idEspessura, Espessura FROM espessura ORDER BY Espessura ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ success: true, data: [] });
        }
        console.error('Error fetching espessuras:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar espessuras' });
    }
});

// GET /api/config/materiais - List all materialsw
app.get('/api/config/materiais', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute("SELECT idMaterialSw, MaterialSw FROM materialsw ORDER BY MaterialSw ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ success: true, data: [] });
        }
        console.error('Error fetching materiais:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar materiais' });
    }
});

// GET /api/rnc/collaborators - List active collaborators
app.get('/api/rnc/collaborators', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT idUsuario, NomeCompleto, Setor FROM usuario WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY NomeCompleto"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching RNC collaborators:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar colaboradores' });
    }
});

// GET /api/rnc/task-types - List task types from dedicated table
app.get('/api/rnc/task-types', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(
            "SELECT DISTINCT TipoTarefa FROM tipotarefa WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND TipoTarefa IS NOT NULL AND TipoTarefa != '' ORDER BY TipoTarefa"
        );
        res.json({ success: true, data: rows.map(r => r.TipoTarefa) });
    } catch (error) {
        console.error('Error fetching RNC task types:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tipos de tarefa' });
    }
});

// GET /api/rnc/item-data/:idRomaneioItem - Get header data for initial load
app.get('/api/rnc/item-data/:idRomaneioItem', tenantMiddleware, async (req, res) => {
    try {
        const [rows] = await req.tenantDbPool.execute(`
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
            return res.status(404).json({ success: false, message: 'Item do romaneio não encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching RNC item context:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar contexto do item' });
    }
});

// GET /api/rnc/list/:idRomaneioItem - List existing pendencies (Global or specific)
app.get('/api/rnc/list/:idRomaneioItem', tenantMiddleware, async (req, res) => {
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
        const [rows] = await req.tenantDbPool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error listing RNCs:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar pend?ncias' });
    }
});

// POST /api/rnc - Save Pendency (RNC) with complex logic from VB.NET
app.post('/api/rnc', tenantMiddleware, async (req, res) => {
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
                return res.status(400).json({ success: false, message: 'Pend?ncia já Finalizada!' });
            }
        }

        // 2. Validate mandatory Sector
        if (!data.setorResponsavel) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Informe Setor Respons?vel pela Pend?ncia!' });
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
                    [data.tipoTarefa, nowFormatted, data.usuario || getCtxNomeCompleto()]
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
app.post('/api/rnc/finalizar', tenantMiddleware, async (req, res) => {
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
app.post('/api/system/open-folder', tenantMiddleware, async (req, res) => {
    const { path: folderPath } = req.body;

    if (!folderPath) {
        return res.status(400).json({ success: false, message: 'Path is required' });
    }

    console.log(`[SYSTEM] Request to open folder: ${folderPath} `);

    // Basic security check (optional: restrict to specific drives or patterns if needed)
    // For this internal app, we allow it but log it.

    require('child_process').exec(`explorer.exe "${folderPath}"`, (error) => {
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
            res.json({ success: true, message: 'Conex?o bem-sucedida! O banco de dados est? acess?vel.' });
        } else {
            res.status(400).json({ success: false, message: 'Falha na conex?o. Verifique os dados.' });
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
            throw new Error('Falha ao inicializar o pool com as novas configurações.');
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

        res.json({ success: true, message: 'Configuração salva e aplicada com sucesso!' });

    } catch (error) {
        console.error('Error saving DB config:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configuração: ' + error.message });
    }
});

// ============================================================================
// CONTROLE DE EXPEDIÃƒâ€¡ÃƒÆ’O
// ============================================================================

app.get('/api/controle-expedicao', tenantMiddleware, async (req, res) => {
    try {
        const { projeto, tag, descTag, empresa, codmat, descResumo, dataPrevisaoInicio, dataPrevisaoFim, concluidos } = req.query;
        let query = `
SELECT 
    p.IdProjeto as IdProjeto, p.Projeto as Projeto, 
    CASE WHEN TRIM(COALESCE(p.DescEmpresa, '')) IN ('', 'Sem cliente', 'Sem Cliente', 'SEM CLIENTE') THEN p.ClienteProjeto ELSE p.DescEmpresa END as DescEmpresa,
    t.Tag as Tag, t.DescTag as DescTag, o.CodMatFabricante as codmatfabricante, 
    t.DataPrevisao as DataPrevisao, o.QtdeTotal as QtdeTotal, o.Peso as PesoUnitario, 
    t.MontagemTotalExecutado as MontagemTotalExecutado, t.TotalExpedicao as TotalExpedicao, 
    COALESCE(o.Comprimentocaixadelimitadora, o.Altura) as Comprimento, COALESCE(o.Espessuracaixadelimitadora, o.Espessura) as Profundidade, COALESCE(o.Larguracaixadelimitadora, o.Largura) as Largura, 
    o.DescResumo as descresumo, o.DescDetal as descdetal, 
    t.RealizadoInicioExpedicao as RealizadoInicioExpedicao, t.RealizadoFinalExpedicao as RealizadoFinalExpedicao, 
    t.IdTag as IdTag, os.IdOrdemServico as Idordemservico, o.IdOrdemServicoItem as IdOrdemServicoItem, 
    t.Finalizado as Finalizadotag, p.Finalizado as FinalizadoProjeto, 
    o.OrdemServicoItemFinalizado as OrdemServicoItemFinalizado, o.EnderecoArquivo as enderecoarquivo, o.ProdutoPrincipal as ProdutoPrincipal
FROM ordemservicoitem o
JOIN ordemservico os ON o.IdOrdemServico = os.IdOrdemServico
JOIN tags t ON os.IdTag = t.IdTag
JOIN projetos p ON os.IdProjeto = p.IdProjeto
WHERE (o.D_E_L_E_T_E IS NULL OR o.D_E_L_E_T_E = '' OR o.D_E_L_E_T_E != '*')
  AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E != '*')
  AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '' OR t.D_E_L_E_T_E != '*')
  AND (p.D_E_L_E_T_E IS NULL OR p.D_E_L_E_T_E = '' OR p.D_E_L_E_T_E != '*')
`;
        const queryParams = [];

        if (projeto) { query += " AND p.Projeto LIKE ?"; queryParams.push(`%${projeto}%`); }
        if (tag) { query += " AND t.Tag LIKE ?"; queryParams.push(`%${tag}%`); }
        if (descTag) { query += " AND t.DescTag LIKE ?"; queryParams.push(`%${descTag}%`); }
        if (empresa) { query += " AND (p.DescEmpresa LIKE ? OR p.ClienteProjeto LIKE ?)"; queryParams.push(`%${empresa}%`, `%${empresa}%`); }
        if (codmat) { query += " AND o.CodMatFabricante LIKE ?"; queryParams.push(`%${codmat}%`); }
        if (descResumo) { query += " AND o.DescResumo LIKE ?"; queryParams.push(`%${descResumo}%`); } 
        
        if (dataPrevisaoInicio && dataPrevisaoFim) {
            query += " AND STR_TO_DATE(t.DataPrevisao, '%d/%m/%Y') BETWEEN ? AND ?";
            queryParams.push(dataPrevisaoInicio, dataPrevisaoFim);
        } else if (dataPrevisaoInicio) {
            query += " AND STR_TO_DATE(t.DataPrevisao, '%d/%m/%Y') >= ?";
            queryParams.push(dataPrevisaoInicio);
        } else if (dataPrevisaoFim) {
            query += " AND STR_TO_DATE(t.DataPrevisao, '%d/%m/%Y') <= ?";
            queryParams.push(dataPrevisaoFim);
        }
        
        if (!concluidos || concluidos !== '1') {
            query += " AND (o.OrdemServicoItemFinalizado IS NULL OR o.OrdemServicoItemFinalizado <> 'C') AND (t.Finalizado IS NULL OR t.Finalizado <> 'C')";
        }

        query += " ORDER BY Projeto ASC, Tag ASC LIMIT 1000";

        const [rows] = await req.tenantDbPool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar viewcontroleexpedicao:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ABRIR ARQUIVO GENÃƒâ€°RICO (3D, PDF, etc) - SIMULA PROCESS.START DO VB.NET NO SERVIDOR
app.get('/api/controle-expedicao/abrir-arquivo', tenantMiddleware, (req, res) => {
    try {
        let { caminho, tipo } = req.query;

        if (!caminho) {
            return res.status(400).json({ success: false, message: 'Caminho não informado' });
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
            res.status(404).json({ success: false, message: 'Arquivo não existe!!' });
        }
    } catch (error) {
        console.error('Erro exception abrir:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ABRIR ISOMÃƒâ€°TRICO (Busca caminho no banco e abre)
app.get('/api/controle-expedicao/abrir-iso', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.query;
        if (!idTag) return res.status(400).json({ success: false, message: 'IdTag não informado' });

        const [rows] = await req.tenantDbPool.execute("SELECT CaminhoIsometrico FROM tags WHERE idtag = ?", [idTag]);
        
        if (rows.length > 0 && rows[0].CaminhoIsometrico) {
            const endereco = rows[0].CaminhoIsometrico;
            if (fs.existsSync(endereco)) {
                const { exec } = require('child_process');
                exec(`start "" "${endereco}"`, (error) => {
                    if (error) {
                        return res.status(500).json({ success: false, message: 'Erro ao executar isomà©trico' });
                    }
                    res.json({ success: true, message: 'Isomà©trico aberto com sucesso' });
                });
            } else {
                res.status(404).json({ success: false, message: 'Arquivo referenciado na base de dados não existe!!' });
            }
        } else {
            res.status(404).json({ success: false, message: 'Nenhum caminho isomà©trico encontrado para esta Tag.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/controle-expedicao/ordem-item', tenantMiddleware, async (req, res) => {
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

        const [rows] = await req.tenantDbPool.execute(query, queryParams);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar viewordemservicoitemcontrole:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/controle-expedicao/apontar', tenantMiddleware, async (req, res) => {
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

        // 4 e 5: a quantidade digitada será acrescida ao campo de total de expedià§ão
        // Se na primeira atualizaà§ão a data de realizado inicio estiver vazia, atualizar.
        // 6: Se qtde entrada + total expedià§ão == qtde total, atualizar realizado final.

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
        console.error('Erro ao apontar expedià§ão:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao salvar.' });
    } finally {
        if (connection) connection.release();
    }
});

// Exportar Tarefas / PCP Excel
app.post('/api/tarefas/exportar-excel', tenantMiddleware, async (req, res) => {
    try {
        const { tarefas, usuario } = req.body;
        
        // 1. Buscar Caminhos e Template
        const [configRows] = await req.tenantDbPool.execute(
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
        
        // Cabeà§alho (BH2 = Data, BH3 = Usuario)
        const nowFormatted = new Date().toLocaleDateString('pt-BR');
        worksheet.getCell('BH2').value = nowFormatted;
        worksheet.getCell('BH3').value = usuario || 'Sistema';

        // Linha 12 tem a formataà§ão base, copiamos os valores a partir da linha 13
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
        console.log(`[Excel] Relatà³rio de tarefas gerado e baixado (${tarefas?.length || 0} itens)`);

    } catch (error) {
        console.error('[Excel Tarefas] Erro ao exportar:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Erro ao gerar relatà³rio Excel: ' + error.message });
        }
    }
});

// Pesquisar Desenho Endpoint
app.get('/api/pesquisar-desenho', tenantMiddleware, async (req, res) => {
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

app.get('/api/ordemservicoitem/check-file', tenantMiddleware, (req, res) => {
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

// Sem autenticaà§ão obrigatà³ria para facilitar window.open em nova guia. Ideal: usar tokens em querystring se necessário.
app.get('/api/pdf', tenantMiddleware, (req, res) => {
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
            res.status(404).send('<script>alert("Arquivo PDF não encontrado!"); window.close();</script>');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/download', tenantMiddleware, (req, res) => {
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
            res.status(404).send('<script>alert("Arquivo não encontrado!"); window.close();</script>');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- àcone 5: Excluir linha OS ---
// --- Toggle Produto Principal ---
app.post('/api/ordemservicoitem/:id/toggle-principal', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const { id } = req.params;
        const { marcar, idOrdemServico } = req.body;

        if (!id || idOrdemServico === undefined) {
            return res.status(400).json({ success: false, message: 'IdOrdemServicoItem e idOrdemServico são obrigatórios.' });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        if (marcar) {
            // Clear any existing Produto Principal for this OS first
            await connection.execute(
                `UPDATE ordemservicoitem SET ProdutoPrincipal = NULL WHERE IdOrdemServico = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [idOrdemServico]
            );
            // Mark the selected item as Produto Principal
            await connection.execute(
                `UPDATE ordemservicoitem SET ProdutoPrincipal = 'SIM' WHERE IdOrdemServicoItem = ?`,
                [id]
            );
        } else {
            // Unmark Produto Principal
            await connection.execute(
                `UPDATE ordemservicoitem SET ProdutoPrincipal = NULL WHERE IdOrdemServicoItem = ?`,
                [id]
            );
        }

        await connection.commit();
        return res.json({
            success: true,
            message: marcar ? 'Item marcado como Produto Principal.' : 'Produto Principal desmarcado.'
        });
    } catch (error) {
        if (connection) { try { await connection.rollback(); } catch (e) {} }
        console.error('[API] Error toggle-principal:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar Produto Principal.' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/ordemservicoitem/alterar-fator', tenantMiddleware, async (req, res) => {

    let connection = null;
    try {
        const { IdOrdemServicoItem, Fator } = req.body;
        if (!IdOrdemServicoItem || Fator === undefined) {
            return res.status(400).json({ success: false, message: 'Dados inválidos.' });
        }

        const fatorNum = parseFloat(Fator);
        if (isNaN(fatorNum) || fatorNum <= 0) {
            return res.status(400).json({ success: false, message: 'Fator deve ser um número maior que zero.' });
        }

        connection = await (req.tenantDbPool || pool).getConnection();

        // 1. Obter informações do item atual
        const [rows] = await connection.execute(
            `SELECT IdOrdemServico, PesoUnitario, AreaPinturaUnitario, QtdeTotal, Liberado_Engenharia 
             FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`,
            [IdOrdemServicoItem]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        }

        const item = rows[0];

        // Regra de segurança: não pode alterar se a OS já estiver liberada
        if (item.Liberado_Engenharia === 'S' || item.Liberado_Engenharia === 'SIM') {
            return res.status(400).json({ success: false, message: 'O item não pode ter o fator alterado pois a O.S. já foi liberada!' });
        }

        // 2. Calcular os novos valores
        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const pesoUnit = Number(item.PesoUnitario) || 0;
        const areaUnit = Number(item.AreaPinturaUnitario) || 0;

        const novoPeso = pesoUnit * qtdeTotal * fatorNum;
        const novaArea = areaUnit * qtdeTotal * fatorNum;

        // 3. Atualizar o item
        await connection.execute(
            `UPDATE ordemservicoitem 
             SET Fator = ?, Peso = ?, AreaPintura = ? 
             WHERE IdOrdemServicoItem = ?`,
            [fatorNum, novoPeso, novaArea, IdOrdemServicoItem]
        );

        // 4. Executar efeito cascata
        await recalcularQuantidadesTotais(item.IdOrdemServico, connection);

        res.json({ success: true, message: 'Fator do item alterado e totais recalculados com sucesso!' });
    } catch (err) {
        console.error('Erro ao alterar fator do item:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================
// PUT /api/ordemservicoitem/:id/tempos - Manutencao de Tempos de Producao
// ============================================================
// Mapa de prefixo do campo de BD para cada recurso/setor
const SETOR_PREFIXO_MAP = {
    corte:        'Corte',
    dobra:        'Dobra',
    solda:        'Solda',
    pintura:      'Pintura',
    montagem:     'Montagem',
    cortealasar:  'CorteaLaser',
    punsionadeira:'Punsionadeira',
    galvanizar:   'Galvanizar',
    engenharia:   'Engenharia',
};

app.put('/api/ordemservicoitem/:id/tempos', tenantMiddleware, async (req, res) => {
    let conn = null;
    try {
        const { id } = req.params;
        const { TempoSetup, TempoPadrao, TotalTempo, recursoTempos, QtdeTotal,
                addRecursos, removeRecursos, osContext } = req.body;

        const dbPool = req.tenantDbPool || pool;

        // --- Campos dinâmicos por recurso (tempos) ---
        const setClauses = [];
        const values = [];
        let globalSetup = parseFloat(TempoSetup) || 0;
        let globalPadrao = parseFloat(TempoPadrao) || 0;
        let globalTotal = parseFloat(TotalTempo) || 0;
        const qtde = parseFloat(QtdeTotal) || 0;

        // Buscar as sequencias atuais do item para descobrir o maior valor
        const [rowItemSeq] = await dbPool.execute(`SELECT CorteSequencia, DobraSequencia, SoldaSequencia, PinturaSequencia, MontagemSequencia, CorteaLaserSequencia, PunsionadeiraSequencia, GalvanizarSequencia, EngenhariaSequencia FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`, [id]);
        let maxSeq = 0;
        if (rowItemSeq.length > 0) {
            const itemSeqs = rowItemSeq[0];
            for (const key in itemSeqs) {
                if (itemSeqs[key] !== null && itemSeqs[key] > maxSeq) {
                    maxSeq = itemSeqs[key];
                }
            }
        }

        // Tambem verificar se o usuario passou alguma sequencia explicitamente no payload que seja maior
        if (recursoTempos && typeof recursoTempos === 'object') {
            for (const vals of Object.values(recursoTempos)) {
                const rSeqParsed = parseInt(vals.seq, 10);
                if (!isNaN(rSeqParsed) && rSeqParsed > maxSeq) {
                    maxSeq = rSeqParsed;
                }
            }
        }

        if (recursoTempos && typeof recursoTempos === 'object' && Object.keys(recursoTempos).length > 0) {
            let sumSetup = 0, sumPadrao = 0, sumTotal = 0;
            for (const [secKey, vals] of Object.entries(recursoTempos)) {
                const pref = SETOR_PREFIXO_MAP[secKey];
                if (!pref) continue;
                const rSetup  = Math.max(0, parseFloat(vals.setup)  || 0);
                const rPadrao = Math.max(0, parseFloat(vals.padrao) || 0);
                
                let rSeqParsed = parseInt(vals.seq, 10);
                if (isNaN(rSeqParsed)) {
                    maxSeq = maxSeq === 0 ? 10 : (Math.floor(maxSeq / 10) * 10 + 10);
                    rSeqParsed = maxSeq;
                    vals.seq = rSeqParsed.toString();
                }
                const rSeq = rSeqParsed;
                
                const rTotal  = (qtde * rPadrao) + rSetup;
                setClauses.push(`${pref}TempoSetup = ?`, `${pref}TempoPadrao = ?`, `${pref}TotalTempo = ?`, `${pref}Sequencia = ?`);
                values.push(rSetup, rPadrao, rTotal, rSeq);
                sumSetup  += rSetup;
                sumPadrao += rPadrao;
                sumTotal  += rTotal;
            }
            globalSetup  = sumSetup;
            globalPadrao = sumPadrao;
            globalTotal  = sumTotal;
        }

        setClauses.push('TempoSetup = ?', 'TempoPadrao = ?', 'TotalTempo = ?');
        values.push(globalSetup, globalPadrao, globalTotal);
        values.push(id); // WHERE

        await dbPool.execute(
            `UPDATE ordemservicoitem SET ${setClauses.join(', ')} WHERE IdOrdemServicoItem = ?`,
            values
        );

        // --- Ativar/desativar flags txt* para recursos adicionados/removidos ---
        // Mapa de campo txt* por secKey
        const TXT_FIELD_MAP = {
            corte:         'txtCorte',
            dobra:         'txtDobra',
            solda:         'txtSolda',
            pintura:       'txtPintura',
            montagem:      'TxtMontagem',
            cortealasar:   'txtCorteaLaser',
            punsionadeira: 'txtPUNSIONADEIRA',
            galvanizar:    'txtGALVANIZAR',
            engenharia:    'txtEngenharia',
        };

        // Buscar IdOrdemServico do item para propagar nas tabelas pai e infos de material para atualizar engenharia
        const [itemRows] = await dbPool.execute(
            `SELECT IdOrdemServico, IdMaterial, CodMatFabricante FROM ordemservicoitem WHERE IdOrdemServicoItem = ? LIMIT 1`, [id]
        );
        const itemOsId = itemRows.length > 0 ? itemRows[0].IdOrdemServico : null;
        const itemIdMaterial = itemRows.length > 0 ? itemRows[0].IdMaterial : null;
        const itemCodMatFabricante = itemRows.length > 0 ? itemRows[0].CodMatFabricante : null;
        
        // Atualizar SequenciaExecucao na tabela material_processo (Engenharia) se o recurso foi modificado
        if (itemIdMaterial || itemCodMatFabricante) {
            for (const [secKey, vals] of Object.entries(recursoTempos || {})) {
                if (vals.IdProcesso) {
                    const seqParsed = parseInt(vals.seq, 10);
                    const seqNum = isNaN(seqParsed) ? 99 : seqParsed;
                    const tSetup = vals.setup != null && vals.setup !== '' ? parseFloat(vals.setup) : null;
                    const tPadrao = vals.padrao != null && vals.padrao !== '' ? parseFloat(vals.padrao) : null;
                    
                    try {
                        const [resUpd] = await dbPool.execute(
                            `UPDATE material_processo SET SequenciaExecucao = ?, TempoEstimadoMin = ?, TempoPadraoMin = ? WHERE (IdMaterial = ? OR codmatFabricante = ?) AND IdProcesso = ?`,
                            [seqNum, tSetup, tPadrao, itemIdMaterial || 0, itemCodMatFabricante || '', vals.IdProcesso]
                        );
                        if (resUpd.affectedRows === 0) {
                            await dbPool.execute(
                                `INSERT INTO material_processo (IdMaterial, codmatFabricante, IdProcesso, SequenciaExecucao, TempoEstimadoMin, TempoPadraoMin, Ativo, UsuarioCriacao, DataCriacao, IdMatriz)
                                 VALUES (?, ?, ?, ?, ?, ?, 'A', ?, NOW(), ?)`,
                                [itemIdMaterial || 0, itemCodMatFabricante || '', vals.IdProcesso, seqNum, tSetup, tPadrao, req.user?.NomeCompleto || req.user?.nome || 'Sistema', req.tenantUser?.tenantId || null]
                            );
                        }
                    } catch(e) {
                        console.warn(`[Tempos] Erro ao atualizar material_processo para ${secKey}:`, e.message);
                    }
                }
            }
        }

        // --- Recalcular TotalExecutar (Sempre no primeiro recurso) ---
        if (itemIdMaterial || itemCodMatFabricante) {
            try {
                // Find all processes for this item
                const [processes] = await dbPool.execute(
                    `SELECT IdMaterialProcesso, SequenciaExecucao, TotalExecutar
                     FROM material_processo 
                     WHERE (IdMaterial = ? OR codmatFabricante = ?) AND Ativo = 'A'
                     ORDER BY SequenciaExecucao ASC`,
                    [itemIdMaterial || 0, itemCodMatFabricante || '']
                );

                if (processes.length > 0) {
                    // Sum all TotalExecutar
                    let totalToExecute = 0;
                    for (const p of processes) {
                        totalToExecute += parseFloat(p.TotalExecutar || 0);
                    }

                    console.log(`[Sequencia Refino] Item (IdMat: ${itemIdMaterial}, Cod: ${itemCodMatFabricante}) -> Sequencias reordenadas. Total a executar consolidado: ${totalToExecute}`);

                    // First process gets the sum, the rest get 0
                    for (let i = 0; i < processes.length; i++) {
                        const proc = processes[i];
                        const newTotal = (i === 0) ? totalToExecute : 0;
                        if (parseFloat(proc.TotalExecutar || 0) !== newTotal) {
                            await dbPool.execute(
                                `UPDATE material_processo SET TotalExecutar = ? WHERE IdMaterialProcesso = ?`,
                                [newTotal, proc.IdMaterialProcesso]
                            );
                            console.log(`[Sequencia Refino] Processo ${proc.IdMaterialProcesso} (Seq: ${proc.SequenciaExecucao}) atualizado para TotalExecutar = ${newTotal}`);
                        }
                    }
                }
            } catch (err) {
                console.error(`[Sequencia Refino] Erro ao recalcular TotalExecutar:`, err.message);
            }
        }

        // Buscar IdTag e IdProjeto da OS
        let itemIdTag = osContext?.IdTag || null;
        let itemIdProjeto = osContext?.IdProjeto || null;
        if (itemOsId && (!itemIdTag || !itemIdProjeto)) {
            const [osRows] = await dbPool.execute(
                `SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ? LIMIT 1`, [itemOsId]
            );
            if (osRows.length > 0) {
                if (!itemIdTag)     itemIdTag     = osRows[0].IdTag;
                if (!itemIdProjeto) itemIdProjeto = osRows[0].IdProjeto;
            }
        }

        // Ativar flags para recursos adicionados
        if (Array.isArray(addRecursos) && addRecursos.length > 0) {
            for (const secKey of addRecursos) {
                const txtField = TXT_FIELD_MAP[secKey];
                const pref     = SETOR_PREFIXO_MAP[secKey];
                if (!txtField || !pref) continue;
                // Ativar no item
                try { await dbPool.execute(`UPDATE ordemservicoitem SET \`${txtField}\` = '1' WHERE IdOrdemServicoItem = ?`, [id]); } catch(e) { console.warn(`[Tempos] flag item ${txtField}:`, e.message); }
                // Ativar na OS pai
                if (itemOsId) { try { await dbPool.execute(`UPDATE ordemservico SET \`${txtField}\` = '1' WHERE IdOrdemServico = ?`, [itemOsId]); } catch(e) { console.warn(`[Tempos] flag OS ${txtField}:`, e.message); } }
                // Ativar na tag
                if (itemIdTag) { try { await dbPool.execute(`UPDATE tags SET \`${txtField}\` = '1' WHERE IdTag = ?`, [itemIdTag]); } catch(e) { console.warn(`[Tempos] flag tag ${txtField}:`, e.message); } }
                // Ativar no projeto
                if (itemIdProjeto) { try { await dbPool.execute(`UPDATE projetos SET \`${txtField}\` = '1' WHERE IdProjeto = ?`, [itemIdProjeto]); } catch(e) { console.warn(`[Tempos] flag proj ${txtField}:`, e.message); } }
                console.log(`[Tempos] Recurso ADICIONADO: ${secKey} (${txtField}) no item ${id}`);
            }
        }

        // Desativar flags para recursos removidos (apenas no item — OS/tag/projeto podem ter outros itens)
        if (Array.isArray(removeRecursos) && removeRecursos.length > 0) {
            for (const item of removeRecursos) {
                const secKey = typeof item === 'string' ? item : item.key;
                const idProc = typeof item === 'object' ? item.IdProcesso : null;
                const txtField = TXT_FIELD_MAP[secKey];
                const pref     = SETOR_PREFIXO_MAP[secKey];
                if (!txtField || !pref) continue;
                // Desativar no item e zerar tempos do recurso
                try {
                    await dbPool.execute(
                        `UPDATE ordemservicoitem SET \`${txtField}\` = '0',
                         \`${pref}TempoSetup\` = 0, \`${pref}TempoPadrao\` = 0, \`${pref}TotalTempo\` = 0
                         WHERE IdOrdemServicoItem = ?`, [id]
                    );
                } catch(e) { console.warn(`[Tempos] desativar item ${txtField}:`, e.message); }
                
                // Excluir da tabela material_processo
                if (idProc && (itemIdMaterial || itemCodMatFabricante)) {
                    try {
                        await dbPool.execute(
                            `DELETE FROM material_processo WHERE (IdMaterial = ? OR codmatFabricante = ?) AND IdProcesso = ?`,
                            [itemIdMaterial || 0, itemCodMatFabricante || '', idProc]
                        );
                    } catch(e) {
                        console.warn(`[Tempos] Erro ao deletar material_processo para ${secKey}:`, e.message);
                    }
                }
                
                console.log(`[Tempos] Recurso REMOVIDO: ${secKey} (${txtField}) no item ${id}`);
            }
        }

        console.log(`[Tempos] Item ${id}: global setup=${globalSetup}, padrao=${globalPadrao}, total=${globalTotal}`);
        
        if (itemOsId) {
            try {
                await recalcularQuantidadesTotais(itemOsId, dbPool);
                console.log(`[Tempos] Recalculo de totais (OS, Tag, Projeto) concluído para OS ${itemOsId}`);
            } catch(e) {
                console.error(`[Tempos] Erro ao recalcular totais para OS ${itemOsId}:`, e.message);
            }
        }

        return res.json({ success: true, message: 'Tempos de produção atualizados com sucesso.', globalSetup, globalPadrao, globalTotal, recursoTempos });
    } catch (err) {
        console.error('[API] Erro ao atualizar tempos:', err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/ordemservicoitem/:id', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const id = req.params.id;
        const confirmCascade = req.query.confirmCascade === 'true';
        connection = await (req.tenantDbPool || pool).getConnection();
        
        const [rows] = await connection.execute("SELECT Liberado_Engenharia, IdOrdemServico FROM ordemservicoitem WHERE IdOrdemServicoItem = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        
        if (rows[0].Liberado_Engenharia === 'S' || rows[0].Liberado_Engenharia === 'SIM') {
            return res.status(400).json({ success: false, message: 'Item da Ordem Serviço não pode ser excluido, O.S. já liberada! Verifique!' });
        }
        
        // Regra adicional: Proibir exclusão se tiver apontamentos
        const [apontamentos] = await connection.execute("SELECT COUNT(*) as cnt FROM ordemservicoitemcontrole WHERE IdOrdemServicoItem = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')", [id]);
        if (apontamentos[0].cnt > 0) {
            return res.status(400).json({ success: false, message: 'Item não pode ser excluido pois possui apontamentos de produção vinculados.' });
        }
        
        // Check if exists in romaneio
        const [romaneioItens] = await connection.execute("SELECT COUNT(*) as cnt FROM romaneioitem WHERE IDOrdemServicoITEM = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')", [id]);
        if (romaneioItens[0].cnt > 0 && !confirmCascade) {
            return res.status(400).json({ 
                success: false, 
                requiresConfirmation: true, 
                message: 'Atenção: Este item já se encontra inserido em um ou mais Romaneios.\nDeseja realmente prosseguir com a exclusão? Isso irá remover o item do histórico de envios (Romaneio).' 
            });
        }

        const usuarioDesc = req.user?.nome || 'Sistema';
        
        const [updateRes] = await connection.execute(
            `UPDATE ordemservicoitem 
             SET d_e_l_e_t_e = '*', UsuarioD_E_L_E_T_E = ?, datad_e_l_e_t_e = NOW() 
             WHERE IdOrdemServicoItem = ?`,
            [usuarioDesc, id]
        );
        
        if (updateRes.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Item não excluído, verifique.' });
        }

        if (romaneioItens[0].cnt > 0) {
            await connection.execute(
                `UPDATE romaneioitem 
                 SET D_E_L_E_T_E = '*', UsuarioD_E_L_E_T_E = ?, DataD_E_L_E_T_E = NOW() 
                 WHERE IDOrdemServicoITEM = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E != '*')`,
                [usuarioDesc, id]
            );
        }
        
        // Recalcular as quantidades porque o item foi deletado
        await recalcularQuantidadesTotais(rows[0].IdOrdemServico, connection);
        
        res.json({ success: true, message: 'Item excluído com sucesso.' });
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
app.get('/api/teste-final-montagem/itens', tenantMiddleware, async (req, res) => {
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
                Qtdetotal AS QtdeTotal,
                MontagemTotalExecutado,
                MontagemTotalExecutar,
                DescResumo,
                DescDetal,
                ProdutoPrincipal,
                RealizadoInicioMontagem,
                RealizadoFinalMontagem,
                sttxtMontagem AS sttxtmontagem,
                OrdemServicoItemFinalizado,
                descempresa AS DescEmpresa,
                PesoUnitario
            FROM ordemservicoitem
            WHERE ${whereClause}
            ORDER BY RealizadoFinalMontagem DESC, RealizadoInicioMontagem DESC, IdOrdemServicoItem DESC
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
// TESTE FINAL MONTAGEM Ã¢â‚¬â€ Lanà§ar quantidade testada
// ----------------------------------------------------------------------------
app.post('/api/teste-final-montagem/lancar', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { IdOrdemServicoItem, IdOrdemServico, IdTag, entrada: entradaRaw, usuario } = req.body;
        const entrada = Number(entradaRaw);

        if (!IdOrdemServicoItem || !entrada) {
            return res.status(400).json({ success: false, message: 'Parà¢metros inválidos.' });
        }

        // 1. Buscar dados atuais do item
        const [[item]] = await connection.execute(
            `SELECT IdOrdemServico, IdOrdemServicoItem, QtdeTotal, ProdutoPrincipal,
                    MontagemTotalExecutado, MontagemTotalExecutar,
                    sttxtMontagem, OrdemServicoItemFinalizado, RealizadoInicioMontagem
             FROM ordemservicoitem WHERE IdOrdemServicoItem = ? LIMIT 1`,
            [IdOrdemServicoItem]
        );

        if (!item) return res.status(404).json({ success: false, message: 'Item não encontrado.' });

        // 2. Validaà§àµes
        if (item.OrdemServicoItemFinalizado === 'C') {
            return res.json({ success: false, message: 'Item já finalizado!' });
        }
        if (item.sttxtMontagem === 'C') {
            return res.json({ success: false, message: 'Item já finalizado no setor de Montagem!' });
        }

        // Tag finalizada?
        if (IdTag) {
            const [[tagRow]] = await connection.execute(
                'SELECT Finalizado FROM tags WHERE idtag = ? LIMIT 1', [IdTag]
            );
            if (tagRow && tagRow.Finalizado && tagRow.Finalizado !== '') {
                return res.json({ success: false, message: 'Tag já Finalizada!' });
            }
        }

        const qtdeTotal = Number(item.QtdeTotal) || 0;
        const executadoAtual = Number(item.MontagemTotalExecutado) || 0;

        // Validar entrada
        if (isNaN(entrada) || entrada <= 0 || entrada > qtdeTotal) {
            return res.json({ success: false, message: 'Valor informado inválido!' });
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

            // Preencher inà­cio se vazio
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

                // Verificar se todos itens da OS foram concluà­dos
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
app.get('/api/plano-corte/lista', tenantMiddleware, async (req, res) => {
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
app.get('/api/producao-plano-corte/lista', tenantMiddleware, async (req, res) => {
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
app.get('/api/plano-corte/itens-disponiveis', tenantMiddleware, async (req, res) => {
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
                AND EXISTS (
                    SELECT 1 FROM material_processo mp 
                    WHERE mp.CodMatFabricante = viewordemservicoitem.CodMatFabricante 
                      AND mp.IdOrdemServico = viewordemservicoitem.IdOrdemServico 
                      AND mp.IdTag = viewordemservicoitem.IdTag 
                      AND mp.IdProjeto = viewordemservicoitem.IdProjeto 
                      AND mp.IdProcesso = '1'
                )
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
app.post('/api/producao-plano-corte/:id/liberar-producao', tenantMiddleware, async (req, res) => {
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
app.post('/api/producao-plano-corte/:id/finalizar', tenantMiddleware, async (req, res) => {
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
app.post('/api/producao-plano-corte/itens/:id/lancar-producao', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;
        const { entrada, idPlanodecorte, TipoApontamento, usuario } = req.body;
        const qtd = parseFloat(entrada);

        if (isNaN(qtd) || qtd <= 0) throw new Error('Quantidade informada inválida.');

        // 1. Busca dados do item
        const [[item]] = await connection.execute(
            `SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, IdProjeto, IdTag, QtdeTotal, 
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

        // PROPAGAÇÃO DA DATA DE INÍCIO DE CORTE (Requirement 2)
        // Se o item não tinha início de corte registrado, propagamos para os níveis superiores
        if (!item.RealizadoInicioCorte) {
            // Ordem de Serviço
            if (item.IdOrdemServico) {
                await connection.execute(
                    `UPDATE ordemservico SET RealizadoInicioCorte = ? 
                     WHERE IdOrdemServico = ? AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
                    [agoraFull, item.IdOrdemServico]
                );
            }
            // Projeto
            if (item.IdProjeto) {
                await connection.execute(
                    `UPDATE projetos SET RealizadoInicioCorte = ? 
                     WHERE IdProjeto = ? AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
                    [agoraFull, item.IdProjeto]
                );
            }
            // Tag
            if (item.IdTag) {
                await connection.execute(
                    `UPDATE tags SET RealizadoInicioCorte = ? 
                     WHERE IdTag = ? AND (RealizadoInicioCorte IS NULL OR RealizadoInicioCorte = '')`,
                    [agoraFull, item.IdTag]
                );
            }
            // Plano de Corte (Data de Início)
            if (idPlanodecorte) {
                await connection.execute(
                    `UPDATE planodecorte SET DataInicial = ? 
                     WHERE IdPlanodecorte = ? AND (DataInicial IS NULL OR DataInicial = '')`,
                    [agoraData, idPlanodecorte]
                );
            }
        }

        // 3. Registro de Auditoria (Histórico de Produção)
        const tipoAppEnv = TipoApontamento || 'Total';
        await connection.execute(
            `INSERT INTO ordemservicoitemcontrole (
                IdOrdemServico, IdOrdemServicoItem, IdOSItemProcesso, Processo,
                QtdeTotal, QtdeProduzida, QtdeFaltante, CriadoPor, DataCriacao, Situacao, TipoApontamento, txtCorte
            ) VALUES (?, ?, 0, 'CORTE', ?, ?, ?, ?, ?, 'LANCAMENTO', ?, ?)`,
            [item.IdOrdemServico, id, qtdeTotal, qtd, novoExecutar, usuario, agoraFull, tipoAppEnv, qtd]
        ); // Nota: QtdeProduzida ? a diferença (qtd) e txtCorte foi unificado

        // 4. Propaga para próximo setor
        let proximoCol = null;
        if (item.txtDobra === '1') proximoCol = 'DobraTotalExecutar';
        else if (item.txtSolda === '1') proximoCol = 'SoldaTotalExecutar';
        else if (item.txtPintura === '1') proximoCol = 'PinturaTotalExecutar';
        else if (item.txtMontagem === '1') proximoCol = 'MontagemTotalExecutar';

        if (proximoCol) {
            if (tipoAppEnv !== 'Parcial') {
                await connection.execute(
                    `UPDATE ordemservicoitem SET ${proximoCol} = COALESCE(${proximoCol}, 0) + ? WHERE IdOrdemServicoItem = ?`,
                    [qtd, id]
                );
            } else if (novoExecutar <= 0) {
                // Ao finalizar o setor em Parciais repetitivos, empurra o pacote todo
                await connection.execute(
                    `UPDATE ordemservicoitem SET ${proximoCol} = COALESCE(${proximoCol}, 0) + ? WHERE IdOrdemServicoItem = ?`,
                    [qtdeTotal, id]
                );
            }
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
                DataFinal = ?,
                UsuarioDataFinal = ?
             WHERE IdPlanodecorte = ?`,
            [pcExec, pcPerc.toFixed(2), pcConcluido, pcConcluido === 'C' ? agoraData : null, pcConcluido === 'C' ? usuario : null, idPlanodecorte]
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
app.post('/api/plano-corte/:id/abrir-pasta', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/abrir-desenho', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/:id/liberar', tenantMiddleware, async (req, res) => {
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
            `SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, EnderecoArquivo 
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
app.post('/api/plano-corte/:id/cancelar-liberacao', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/:id/bloquear', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/:id/desbloquear', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/:id/excluir', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/:id/exportar-excel', tenantMiddleware, async (req, res) => {
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
app.post('/api/plano-corte/remover-item', tenantMiddleware, async (req, res) => {
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
            return res.status(403).json({ success: false, message: 'Não ? possível remover itens de um plano já enviado ou concluído.' });
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
app.post('/api/plano-corte/incluir-itens', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();
        await connection.beginTransaction();

        const { itens } = req.body; // array de IdOrdemServicoItem
        const criadoPor = getCtxNomeCompleto();
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
app.post('/api/plano-corte/:id/atualizar-arquivos', tenantMiddleware, async (req, res) => {
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
            SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, EnderecoArquivo
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

// ============================================================================
// HELPER CASCATA DE QUANTIDADES E PERCENTUAIS (OS -> TAG -> PROJETO)
// ============================================================================
async function recalcularQuantidadesTotais(IdOrdemServico, connection) {
    if (!IdOrdemServico) return;
    try {
        const [osInfo] = await connection.execute(`SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ?`, [IdOrdemServico]);
        if (!osInfo || osInfo.length === 0) return;
        const IdTag = osInfo[0].IdTag;
        const IdProjeto = osInfo[0].IdProjeto;

        // 0. Sincronizar Projeto, Tag, DescTag da OS com seus itens
        await connection.execute(`
            UPDATE ordemservicoitem oi
            JOIN ordemservico os ON oi.IdOrdemServico = os.IdOrdemServico
            SET 
                oi.IdProjeto = os.IdProjeto,
                oi.Projeto = os.Projeto,
                oi.IdTag = os.IdTag,
                oi.Tag = os.Tag,
                oi.DescTag = os.DescTag,
                oi.IdEmpresa = os.IdEmpresa,
                oi.DescEmpresa = os.DescEmpresa
            WHERE os.IdOrdemServico = ? AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')
        `, [IdOrdemServico]);

        async function ensureTimeCols(table) {
            try {
                const [cRows] = await connection.execute(`SHOW COLUMNS FROM ${table}`);
                const exCols = cRows.map(r => r.Field.toLowerCase());
                
                const timeCols = ['TotalSetup', 'TotalPadrao', 'TempoSetup', 'TempoPadrao', 'TotalTempo'];
                const sectorsList = ['Corte', 'Dobra', 'Solda', 'Pintura', 'Montagem', 'CorteaLaser', 'Punsionadeira', 'Galvanizar', 'Engenharia'];
                for (const sec of sectorsList) {
                    timeCols.push(`${sec}TempoSetup`, `${sec}TotalSetup`, `${sec}TempoPadrao`, `${sec}TotalPadrao`, `${sec}TotalTempo`, `${sec}DiasProducao`);
                }

                for (const col of timeCols) {
                    if (!exCols.includes(col.toLowerCase())) {
                        try {
                            const colType = col.endsWith('DiasProducao') ? 'INT NULL DEFAULT 0' : 'DECIMAL(10,2) NULL DEFAULT 0';
                            await connection.execute(`ALTER TABLE ${table} ADD COLUMN \`${col}\` ${colType}`);
                        } catch(e) {}
                    }
                }
            } catch(e) {}
        }
        await ensureTimeCols('ordemservico');
        await ensureTimeCols('tags');
        await ensureTimeCols('projetos');

        // 1. Atualizar TUDO na OS
        await connection.execute(`
            UPDATE ordemservico os
            SET 
                QtdeTotalItens = (SELECT COALESCE(COUNT(*), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                QtdeTotalPecas = (SELECT COALESCE(SUM(oi.QtdeTotal), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PesoTotal = (SELECT COALESCE(SUM(oi.Peso), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                AreaPinturaTotal = (SELECT COALESCE(SUM(oi.AreaPintura), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                
                -- Agregação dos Tempos Globais da OS
                TempoSetup = (SELECT COALESCE(SUM(oi.TempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                TotalSetup = (SELECT COALESCE(SUM(oi.TempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                TempoPadrao = (SELECT COALESCE(SUM(oi.TempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                TotalPadrao = (SELECT COALESCE(SUM(oi.TempoPadrao * oi.QtdeTotal), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                TotalTempo = (SELECT COALESCE(SUM(oi.TotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                -- Tempos por Setor/Recurso na OS
                CorteTempoSetup = (SELECT COALESCE(SUM(oi.CorteTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteTotalSetup = (SELECT COALESCE(SUM(oi.CorteTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteTempoPadrao = (SELECT COALESCE(SUM(oi.CorteTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteTotalPadrao = (SELECT COALESCE(SUM(oi.CorteTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteTotalTempo = (SELECT COALESCE(SUM(oi.CorteTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteDiasProducao = (SELECT CASE WHEN SUM(oi.CorteTotalTempo) > 0 THEN CEIL(SUM(oi.CorteTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                DobraTempoSetup = (SELECT COALESCE(SUM(oi.DobraTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTotalSetup = (SELECT COALESCE(SUM(oi.DobraTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTempoPadrao = (SELECT COALESCE(SUM(oi.DobraTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTotalPadrao = (SELECT COALESCE(SUM(oi.DobraTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTotalTempo = (SELECT COALESCE(SUM(oi.DobraTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraDiasProducao = (SELECT CASE WHEN SUM(oi.DobraTotalTempo) > 0 THEN CEIL(SUM(oi.DobraTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                SoldaTempoSetup = (SELECT COALESCE(SUM(oi.SoldaTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTotalSetup = (SELECT COALESCE(SUM(oi.SoldaTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTempoPadrao = (SELECT COALESCE(SUM(oi.SoldaTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTotalPadrao = (SELECT COALESCE(SUM(oi.SoldaTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTotalTempo = (SELECT COALESCE(SUM(oi.SoldaTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaDiasProducao = (SELECT CASE WHEN SUM(oi.SoldaTotalTempo) > 0 THEN CEIL(SUM(oi.SoldaTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                PinturaTempoSetup = (SELECT COALESCE(SUM(oi.PinturaTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTotalSetup = (SELECT COALESCE(SUM(oi.PinturaTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTempoPadrao = (SELECT COALESCE(SUM(oi.PinturaTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTotalPadrao = (SELECT COALESCE(SUM(oi.PinturaTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTotalTempo = (SELECT COALESCE(SUM(oi.PinturaTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaDiasProducao = (SELECT CASE WHEN SUM(oi.PinturaTotalTempo) > 0 THEN CEIL(SUM(oi.PinturaTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                MontagemTempoSetup = (SELECT COALESCE(SUM(oi.MontagemTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTotalSetup = (SELECT COALESCE(SUM(oi.MontagemTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTempoPadrao = (SELECT COALESCE(SUM(oi.MontagemTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTotalPadrao = (SELECT COALESCE(SUM(oi.MontagemTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTotalTempo = (SELECT COALESCE(SUM(oi.MontagemTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemDiasProducao = (SELECT CASE WHEN SUM(oi.MontagemTotalTempo) > 0 THEN CEIL(SUM(oi.MontagemTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                CorteaLaserTempoSetup = (SELECT COALESCE(SUM(oi.CorteaLaserTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteaLaserTotalSetup = (SELECT COALESCE(SUM(oi.CorteaLaserTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteaLaserTempoPadrao = (SELECT COALESCE(SUM(oi.CorteaLaserTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteaLaserTotalPadrao = (SELECT COALESCE(SUM(oi.CorteaLaserTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteaLaserTotalTempo = (SELECT COALESCE(SUM(oi.CorteaLaserTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteaLaserDiasProducao = (SELECT CASE WHEN SUM(oi.CorteaLaserTotalTempo) > 0 THEN CEIL(SUM(oi.CorteaLaserTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                PunsionadeiraTempoSetup = (SELECT COALESCE(SUM(oi.PunsionadeiraTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PunsionadeiraTotalSetup = (SELECT COALESCE(SUM(oi.PunsionadeiraTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PunsionadeiraTempoPadrao = (SELECT COALESCE(SUM(oi.PunsionadeiraTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PunsionadeiraTotalPadrao = (SELECT COALESCE(SUM(oi.PunsionadeiraTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PunsionadeiraTotalTempo = (SELECT COALESCE(SUM(oi.PunsionadeiraTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PunsionadeiraDiasProducao = (SELECT CASE WHEN SUM(oi.PunsionadeiraTotalTempo) > 0 THEN CEIL(SUM(oi.PunsionadeiraTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                GalvanizarTempoSetup = (SELECT COALESCE(SUM(oi.GalvanizarTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                GalvanizarTotalSetup = (SELECT COALESCE(SUM(oi.GalvanizarTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                GalvanizarTempoPadrao = (SELECT COALESCE(SUM(oi.GalvanizarTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                GalvanizarTotalPadrao = (SELECT COALESCE(SUM(oi.GalvanizarTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                GalvanizarTotalTempo = (SELECT COALESCE(SUM(oi.GalvanizarTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                GalvanizarDiasProducao = (SELECT CASE WHEN SUM(oi.GalvanizarTotalTempo) > 0 THEN CEIL(SUM(oi.GalvanizarTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),

                EngenhariaTempoSetup = (SELECT COALESCE(SUM(oi.EngenhariaTempoSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                EngenhariaTotalSetup = (SELECT COALESCE(SUM(oi.EngenhariaTotalSetup), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                EngenhariaTempoPadrao = (SELECT COALESCE(SUM(oi.EngenhariaTempoPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                EngenhariaTotalPadrao = (SELECT COALESCE(SUM(oi.EngenhariaTotalPadrao), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                EngenhariaTotalTempo = (SELECT COALESCE(SUM(oi.EngenhariaTotalTempo), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                EngenhariaDiasProducao = (SELECT CASE WHEN SUM(oi.EngenhariaTotalTempo) > 0 THEN CEIL(SUM(oi.EngenhariaTotalTempo) / 480) ELSE 0 END FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                
                -- Pecas Executadas: Somente soma QtdeTotal se TODOS os recursos ativos estiverem concluidos ('C' ou 'S')
                QtdePecasExecutadas = (
                    SELECT COALESCE(SUM(
                        CASE 
                            WHEN (
                                (IFNULL(oi.txtCorte,'') != '1' OR IFNULL(oi.sttxtCorte,'') IN ('C','S')) AND
                                (IFNULL(oi.txtDobra,'') != '1' OR IFNULL(oi.sttxtDobra,'') IN ('C','S')) AND
                                (IFNULL(oi.txtSolda,'') != '1' OR IFNULL(oi.sttxtSolda,'') IN ('C','S')) AND
                                (IFNULL(oi.txtPintura,'') != '1' OR IFNULL(oi.sttxtPintura,'') IN ('C','S')) AND
                                (IFNULL(oi.TxtMontagem,'') != '1' OR IFNULL(oi.sttxtMontagem,'') IN ('C','S')) AND
                                (IFNULL(oi.txtCorteaLaser,'') != '1' OR IFNULL(oi.sttxtCorteaLaser,'') IN ('C','S')) AND
                                (IFNULL(oi.txtPUNSIONADEIRA,'') != '1' OR IFNULL(oi.sttxtPUNSIONADEIRA,'') IN ('C','S')) AND
                                (IFNULL(oi.txtGALVANIZAR,'') != '1' OR IFNULL(oi.sttxtGALVANIZAR,'') IN ('C','S')) AND
                                (IFNULL(oi.txtEngenharia,'') != '1' OR IFNULL(oi.sttxtEngenharia,'') IN ('C','S'))
                            ) THEN oi.QtdeTotal
                            ELSE 0
                        END
                    ), 0)
                    FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')
                ),

                -- Setores executados
                CorteTotalExecutado = (SELECT COALESCE(SUM(oi.CorteTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                CorteTotalExecutar = (SELECT COALESCE(SUM(oi.CorteTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTotalExecutado = (SELECT COALESCE(SUM(oi.DobraTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                DobraTotalExecutar = (SELECT COALESCE(SUM(oi.DobraTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTotalExecutado = (SELECT COALESCE(SUM(oi.SoldaTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                SoldaTotalExecutar = (SELECT COALESCE(SUM(oi.SoldaTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTotalExecutado = (SELECT COALESCE(SUM(oi.PinturaTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PinturaTotalExecutar = (SELECT COALESCE(SUM(oi.PinturaTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTotalExecutado = (SELECT COALESCE(SUM(oi.MontagemTotalExecutado), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                MontagemTotalExecutar = (SELECT COALESCE(SUM(oi.MontagemTotalExecutar), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = ''))
            WHERE os.IdOrdemServico = ?
        `, [IdOrdemServico]);

        // Cálculo de % OS
        await connection.execute(`
            UPDATE ordemservico os
            SET 
                PercentualPecas = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.QtdePecasExecutadas / os.QtdeTotalPecas) * 100, 2) ELSE 0 END,
                CortePercentual = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.CorteTotalExecutado / os.QtdeTotalPecas) * 100, 2) ELSE 0 END,
                DobraPercentual = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.DobraTotalExecutado / os.QtdeTotalPecas) * 100, 2) ELSE 0 END,
                SoldaPercentual = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.SoldaTotalExecutado / os.QtdeTotalPecas) * 100, 2) ELSE 0 END,
                PinturaPercentual = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.PinturaTotalExecutado / os.QtdeTotalPecas) * 100, 2) ELSE 0 END,
                MontagemPercentual = CASE WHEN os.QtdeTotalPecas > 0 THEN TRUNCATE((os.MontagemTotalExecutado / os.QtdeTotalPecas) * 100, 2) ELSE 0 END
            WHERE os.IdOrdemServico = ?
        `, [IdOrdemServico]);

        // 2. Atualizar TAG
        if (IdTag) {
            await connection.execute(`
                UPDATE tags t
                SET 
                    QtdeOS = (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    QtdeOSExecutadas = (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ') AND TRIM(COALESCE(os.OrdemServicoFinalizado,'')) = 'C'),
                    QtdePecasOS = (SELECT COALESCE(SUM(os.QtdeTotalItens), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    QtdePecasExecutadas = (SELECT COALESCE(SUM(os.QtdePecasExecutadas), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PesoTotal = (SELECT COALESCE(SUM(os.PesoTotal), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    AreaPinturaTotal = (SELECT COALESCE(SUM(os.AreaPinturaTotal), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    
                    TotalSetup = (SELECT COALESCE(SUM(os.TotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    TotalPadrao = (SELECT COALESCE(SUM(os.TotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    TotalTempo = (SELECT COALESCE(SUM(os.TotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),

                    
                    CorteTempoSetup = (SELECT COALESCE(SUM(os.CorteTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTotalSetup = (SELECT COALESCE(SUM(os.CorteTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTempoPadrao = (SELECT COALESCE(SUM(os.CorteTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTotalPadrao = (SELECT COALESCE(SUM(os.CorteTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTotalTempo = (SELECT COALESCE(SUM(os.CorteTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteDiasProducao = (SELECT CASE WHEN SUM(os.CorteTotalTempo) > 0 THEN CEIL(SUM(os.CorteTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTempoSetup = (SELECT COALESCE(SUM(os.DobraTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTotalSetup = (SELECT COALESCE(SUM(os.DobraTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTempoPadrao = (SELECT COALESCE(SUM(os.DobraTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTotalPadrao = (SELECT COALESCE(SUM(os.DobraTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTotalTempo = (SELECT COALESCE(SUM(os.DobraTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraDiasProducao = (SELECT CASE WHEN SUM(os.DobraTotalTempo) > 0 THEN CEIL(SUM(os.DobraTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTempoSetup = (SELECT COALESCE(SUM(os.SoldaTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTotalSetup = (SELECT COALESCE(SUM(os.SoldaTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTempoPadrao = (SELECT COALESCE(SUM(os.SoldaTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTotalPadrao = (SELECT COALESCE(SUM(os.SoldaTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTotalTempo = (SELECT COALESCE(SUM(os.SoldaTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaDiasProducao = (SELECT CASE WHEN SUM(os.SoldaTotalTempo) > 0 THEN CEIL(SUM(os.SoldaTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTempoSetup = (SELECT COALESCE(SUM(os.PinturaTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTotalSetup = (SELECT COALESCE(SUM(os.PinturaTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTempoPadrao = (SELECT COALESCE(SUM(os.PinturaTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTotalPadrao = (SELECT COALESCE(SUM(os.PinturaTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTotalTempo = (SELECT COALESCE(SUM(os.PinturaTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaDiasProducao = (SELECT CASE WHEN SUM(os.PinturaTotalTempo) > 0 THEN CEIL(SUM(os.PinturaTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTempoSetup = (SELECT COALESCE(SUM(os.MontagemTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTotalSetup = (SELECT COALESCE(SUM(os.MontagemTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTempoPadrao = (SELECT COALESCE(SUM(os.MontagemTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTotalPadrao = (SELECT COALESCE(SUM(os.MontagemTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTotalTempo = (SELECT COALESCE(SUM(os.MontagemTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemDiasProducao = (SELECT CASE WHEN SUM(os.MontagemTotalTempo) > 0 THEN CEIL(SUM(os.MontagemTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserTempoSetup = (SELECT COALESCE(SUM(os.CorteaLaserTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalSetup = (SELECT COALESCE(SUM(os.CorteaLaserTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserTempoPadrao = (SELECT COALESCE(SUM(os.CorteaLaserTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalPadrao = (SELECT COALESCE(SUM(os.CorteaLaserTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalTempo = (SELECT COALESCE(SUM(os.CorteaLaserTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteaLaserDiasProducao = (SELECT CASE WHEN SUM(os.CorteaLaserTotalTempo) > 0 THEN CEIL(SUM(os.CorteaLaserTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTempoSetup = (SELECT COALESCE(SUM(os.PunsionadeiraTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalSetup = (SELECT COALESCE(SUM(os.PunsionadeiraTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTempoPadrao = (SELECT COALESCE(SUM(os.PunsionadeiraTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalPadrao = (SELECT COALESCE(SUM(os.PunsionadeiraTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalTempo = (SELECT COALESCE(SUM(os.PunsionadeiraTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PunsionadeiraDiasProducao = (SELECT CASE WHEN SUM(os.PunsionadeiraTotalTempo) > 0 THEN CEIL(SUM(os.PunsionadeiraTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarTempoSetup = (SELECT COALESCE(SUM(os.GalvanizarTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalSetup = (SELECT COALESCE(SUM(os.GalvanizarTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarTempoPadrao = (SELECT COALESCE(SUM(os.GalvanizarTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalPadrao = (SELECT COALESCE(SUM(os.GalvanizarTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalTempo = (SELECT COALESCE(SUM(os.GalvanizarTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    GalvanizarDiasProducao = (SELECT CASE WHEN SUM(os.GalvanizarTotalTempo) > 0 THEN CEIL(SUM(os.GalvanizarTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaTempoSetup = (SELECT COALESCE(SUM(os.EngenhariaTempoSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalSetup = (SELECT COALESCE(SUM(os.EngenhariaTotalSetup), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaTempoPadrao = (SELECT COALESCE(SUM(os.EngenhariaTempoPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalPadrao = (SELECT COALESCE(SUM(os.EngenhariaTotalPadrao), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalTempo = (SELECT COALESCE(SUM(os.EngenhariaTotalTempo), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    EngenhariaDiasProducao = (SELECT CASE WHEN SUM(os.EngenhariaTotalTempo) > 0 THEN CEIL(SUM(os.EngenhariaTotalTempo) / 480) ELSE 0 END FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTotalExecutado = (SELECT COALESCE(SUM(os.CorteTotalExecutado), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    CorteTotalExecutar = (SELECT COALESCE(SUM(os.CorteTotalExecutar), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTotalExecutado = (SELECT COALESCE(SUM(os.DobraTotalExecutado), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    DobraTotalExecutar = (SELECT COALESCE(SUM(os.DobraTotalExecutar), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTotalExecutado = (SELECT COALESCE(SUM(os.SoldaTotalExecutado), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    SoldaTotalExecutar = (SELECT COALESCE(SUM(os.SoldaTotalExecutar), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTotalExecutado = (SELECT COALESCE(SUM(os.PinturaTotalExecutado), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    PinturaTotalExecutar = (SELECT COALESCE(SUM(os.PinturaTotalExecutar), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTotalExecutado = (SELECT COALESCE(SUM(os.MontagemTotalExecutado), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')),
                    MontagemTotalExecutar = (SELECT COALESCE(SUM(os.MontagemTotalExecutar), 0) FROM ordemservico os WHERE os.IdTag = t.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' '))
                WHERE t.IdTag = ?
            `, [IdTag]);

            await connection.execute(`
                UPDATE tags t
                SET 
                    PercentualPecas = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.QtdePecasExecutadas / t.QtdePecasOS) * 100, 2) ELSE 0 END,
                    CortePercentual = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.CorteTotalExecutado / t.QtdePecasOS) * 100, 2) ELSE 0 END,
                    DobraPercentual = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.DobraTotalExecutado / t.QtdePecasOS) * 100, 2) ELSE 0 END,
                    SoldaPercentual = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.SoldaTotalExecutado / t.QtdePecasOS) * 100, 2) ELSE 0 END,
                    PinturaPercentual = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.PinturaTotalExecutado / t.QtdePecasOS) * 100, 2) ELSE 0 END,
                    MontagemPercentual = CASE WHEN t.QtdePecasOS > 0 THEN TRUNCATE((t.MontagemTotalExecutado / t.QtdePecasOS) * 100, 2) ELSE 0 END
                WHERE t.IdTag = ?
            `, [IdTag]);
        }

        // 3. Atualizar PROJETO
        if (IdProjeto) {
            await connection.execute(`
                UPDATE projetos p
                SET 
                    QtdeTags = (SELECT COUNT(*) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    QtdePecasTags = (SELECT COALESCE(SUM(t.QtdePecasOS), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    QtdePecasExecutadas = (SELECT COALESCE(SUM(t.QtdePecasExecutadas), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    PesoTotal = (SELECT COALESCE(SUM(t.PesoTotal), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    AreaPinturaTotal = (SELECT COALESCE(SUM(t.AreaPinturaTotal), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    
                    TotalSetup = (SELECT COALESCE(SUM(t.TotalSetup), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    TotalPadrao = (SELECT COALESCE(SUM(t.TotalPadrao), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    TotalTempo = (SELECT COALESCE(SUM(t.TotalTempo), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    
                    
                    CorteTempoSetup = (SELECT COALESCE(SUM(t2.CorteTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteTotalSetup = (SELECT COALESCE(SUM(t2.CorteTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteTempoPadrao = (SELECT COALESCE(SUM(t2.CorteTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteTotalPadrao = (SELECT COALESCE(SUM(t2.CorteTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteTotalTempo = (SELECT COALESCE(SUM(t2.CorteTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteDiasProducao = (SELECT CASE WHEN SUM(t2.CorteTotalTempo) > 0 THEN CEIL(SUM(t2.CorteTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraTempoSetup = (SELECT COALESCE(SUM(t2.DobraTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraTotalSetup = (SELECT COALESCE(SUM(t2.DobraTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraTempoPadrao = (SELECT COALESCE(SUM(t2.DobraTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraTotalPadrao = (SELECT COALESCE(SUM(t2.DobraTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraTotalTempo = (SELECT COALESCE(SUM(t2.DobraTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    DobraDiasProducao = (SELECT CASE WHEN SUM(t2.DobraTotalTempo) > 0 THEN CEIL(SUM(t2.DobraTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaTempoSetup = (SELECT COALESCE(SUM(t2.SoldaTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaTotalSetup = (SELECT COALESCE(SUM(t2.SoldaTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaTempoPadrao = (SELECT COALESCE(SUM(t2.SoldaTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaTotalPadrao = (SELECT COALESCE(SUM(t2.SoldaTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaTotalTempo = (SELECT COALESCE(SUM(t2.SoldaTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    SoldaDiasProducao = (SELECT CASE WHEN SUM(t2.SoldaTotalTempo) > 0 THEN CEIL(SUM(t2.SoldaTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaTempoSetup = (SELECT COALESCE(SUM(t2.PinturaTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaTotalSetup = (SELECT COALESCE(SUM(t2.PinturaTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaTempoPadrao = (SELECT COALESCE(SUM(t2.PinturaTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaTotalPadrao = (SELECT COALESCE(SUM(t2.PinturaTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaTotalTempo = (SELECT COALESCE(SUM(t2.PinturaTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PinturaDiasProducao = (SELECT CASE WHEN SUM(t2.PinturaTotalTempo) > 0 THEN CEIL(SUM(t2.PinturaTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemTempoSetup = (SELECT COALESCE(SUM(t2.MontagemTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemTotalSetup = (SELECT COALESCE(SUM(t2.MontagemTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemTempoPadrao = (SELECT COALESCE(SUM(t2.MontagemTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemTotalPadrao = (SELECT COALESCE(SUM(t2.MontagemTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemTotalTempo = (SELECT COALESCE(SUM(t2.MontagemTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    MontagemDiasProducao = (SELECT CASE WHEN SUM(t2.MontagemTotalTempo) > 0 THEN CEIL(SUM(t2.MontagemTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserTempoSetup = (SELECT COALESCE(SUM(t2.CorteaLaserTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalSetup = (SELECT COALESCE(SUM(t2.CorteaLaserTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserTempoPadrao = (SELECT COALESCE(SUM(t2.CorteaLaserTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalPadrao = (SELECT COALESCE(SUM(t2.CorteaLaserTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserTotalTempo = (SELECT COALESCE(SUM(t2.CorteaLaserTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteaLaserDiasProducao = (SELECT CASE WHEN SUM(t2.CorteaLaserTotalTempo) > 0 THEN CEIL(SUM(t2.CorteaLaserTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTempoSetup = (SELECT COALESCE(SUM(t2.PunsionadeiraTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalSetup = (SELECT COALESCE(SUM(t2.PunsionadeiraTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTempoPadrao = (SELECT COALESCE(SUM(t2.PunsionadeiraTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalPadrao = (SELECT COALESCE(SUM(t2.PunsionadeiraTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraTotalTempo = (SELECT COALESCE(SUM(t2.PunsionadeiraTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    PunsionadeiraDiasProducao = (SELECT CASE WHEN SUM(t2.PunsionadeiraTotalTempo) > 0 THEN CEIL(SUM(t2.PunsionadeiraTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarTempoSetup = (SELECT COALESCE(SUM(t2.GalvanizarTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalSetup = (SELECT COALESCE(SUM(t2.GalvanizarTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarTempoPadrao = (SELECT COALESCE(SUM(t2.GalvanizarTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalPadrao = (SELECT COALESCE(SUM(t2.GalvanizarTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarTotalTempo = (SELECT COALESCE(SUM(t2.GalvanizarTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    GalvanizarDiasProducao = (SELECT CASE WHEN SUM(t2.GalvanizarTotalTempo) > 0 THEN CEIL(SUM(t2.GalvanizarTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaTempoSetup = (SELECT COALESCE(SUM(t2.EngenhariaTempoSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalSetup = (SELECT COALESCE(SUM(t2.EngenhariaTotalSetup), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaTempoPadrao = (SELECT COALESCE(SUM(t2.EngenhariaTempoPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalPadrao = (SELECT COALESCE(SUM(t2.EngenhariaTotalPadrao), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaTotalTempo = (SELECT COALESCE(SUM(t2.EngenhariaTotalTempo), 0) FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    EngenhariaDiasProducao = (SELECT CASE WHEN SUM(t2.EngenhariaTotalTempo) > 0 THEN CEIL(SUM(t2.EngenhariaTotalTempo) / 480) ELSE 0 END FROM tags t2 WHERE t2.IdProjeto = p.IdProjeto AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '' OR t2.D_E_L_E_T_E = ' ')),
                    CorteTotalExecutado = (SELECT COALESCE(SUM(t.CorteTotalExecutado), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    CorteTotalExecutar = (SELECT COALESCE(SUM(t.CorteTotalExecutar), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    DobraTotalExecutado = (SELECT COALESCE(SUM(t.DobraTotalExecutado), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    DobraTotalExecutar = (SELECT COALESCE(SUM(t.DobraTotalExecutar), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    SoldaTotalExecutado = (SELECT COALESCE(SUM(t.SoldaTotalExecutado), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    SoldaTotalExecutar = (SELECT COALESCE(SUM(t.SoldaTotalExecutar), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    PinturaTotalExecutado = (SELECT COALESCE(SUM(t.PinturaTotalExecutado), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    PinturaTotalExecutar = (SELECT COALESCE(SUM(t.PinturaTotalExecutar), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    MontagemTotalExecutado = (SELECT COALESCE(SUM(t.MontagemTotalExecutado), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')),
                    MontagemTotalExecutar = (SELECT COALESCE(SUM(t.MontagemTotalExecutar), 0) FROM tags t WHERE t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = ''))
                WHERE p.IdProjeto = ?
            `, [IdProjeto]);

            await connection.execute(`
                UPDATE projetos p
                SET 
                    PercentualPecas = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.QtdePecasExecutadas / p.QtdePecasTags) * 100, 2) ELSE 0 END,
                    CortePercentual = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.CorteTotalExecutado / p.QtdePecasTags) * 100, 2) ELSE 0 END,
                    DobraPercentual = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.DobraTotalExecutado / p.QtdePecasTags) * 100, 2) ELSE 0 END,
                    SoldaPercentual = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.SoldaTotalExecutado / p.QtdePecasTags) * 100, 2) ELSE 0 END,
                    PinturaPercentual = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.PinturaTotalExecutado / p.QtdePecasTags) * 100, 2) ELSE 0 END,
                    MontagemPercentual = CASE WHEN p.QtdePecasTags > 0 THEN TRUNCATE((p.MontagemTotalExecutado / p.QtdePecasTags) * 100, 2) ELSE 0 END
                WHERE p.IdProjeto = ?
            `, [IdProjeto]);
        }
    } catch(e) {
        console.error('Erro ao recalcularQuantidadesTotais:', e);
    }
}


// Static: landing page assets (root)
app.use(express.static(path.join(__dirname, '../')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
// Rota dinâmica para fotos de funcionários (CNH) baseada no tenant
app.get('/fotosfuncionarios/:filename', tenantMiddleware, async (req, res) => {
    let baseDir = 'C:\\fotosfuncionarios';
    try {
        if (req.tenantDbPool) {
            const [rows] = await db.execute('SELECT EnderecoSalvarCNHMotorista FROM configuracaosistema LIMIT 1');
            if (rows.length > 0 && rows[0].EnderecoSalvarCNHMotorista) {
                baseDir = rows[0].EnderecoSalvarCNHMotorista;
            }
        }
    } catch (e) {
        console.error('Erro ao buscar diretório da CNH para servir:', e);
    }
    const filepath = require('path').join(baseDir, req.params.filename);
    if (require('fs').existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});


app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/img', express.static(path.join(__dirname, '../public/img')));
// Static: React app assets (assets/, etc.)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Root = landing page (HTML puro, sem Node.js)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Legacy login redirect
app.get('/login', (req, res) => {
    res.redirect('/#acesso');
});

// React SPA — todas as rotas internas
app.get(/^\/(dashboard|app|admin|projetos|tags|os|romaneio|producao|material|apontamento|pendencia|tarefa|blockset|powerbuild|relatorio|configuracao|superadmin|peca-manufaturada|recursos-fabricacao|motorista|pessoa-juridica|unidades-medida|familia|acabamento|tipos-produto|setor|camera|usuarios|cadastro-usuario).*/, (req, res) => {
    const devPath = path.join(__dirname, '../frontend/dist/index.html');
    const prodPath = path.join(__dirname, '../index.html');
    const fs = require('fs');
    if (fs.existsSync(devPath)) {
        res.sendFile(devPath);
    } else {
        res.sendFile(prodPath);
    }
});


// GET /api/ordemservico/:idTag/tempos-producao
app.get('/api/ordemservico/:idTag/tempos-producao', tenantMiddleware, async (req, res) => {
    try {
        const { idTag } = req.params;
        const { recurso } = req.query;
        if (!idTag || !recurso) {
            return res.status(400).json({ success: false, message: 'Faltam dados: idTag ou recurso' });
        }
        const recursoLimpo = recurso.trim().replace(/\s+/g, '');
        const colSetup = `${recursoLimpo}TempoSetup`;
        const colPadrao = `${recursoLimpo}TempoPadrao`;
        const colTotal = `${recursoLimpo}TotalTempo`;
        
        try {
            const query = 'SELECT ?? AS Setup, ?? AS Padrao, ?? AS Total FROM tags WHERE IdTag = ? LIMIT 1';
            const [rows] = await req.tenantDbPool.query(query, [colSetup, colPadrao, colTotal, idTag]);
            if (rows.length > 0) {
                return res.json({ success: true, data: rows[0] });
            }
        } catch (colErr) {
            console.log(`Colunas de tempo não encontradas para o recurso ${recursoLimpo}`);
        }
        return res.json({ success: true, data: { Setup: 0, Padrao: 0, Total: 0 } });
    } catch (error) {
        console.error('Erro ao buscar tempos de producao:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar tempos' });
    }
});


// GET /api/ordemservico/os/:id/tempos-producao
app.get('/api/ordemservico/os/:id/tempos-producao', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { recurso } = req.query;
        if (!id || !recurso) {
            return res.status(400).json({ success: false, message: 'Faltam dados: id ou recurso' });
        }
        const recursoLimpo = recurso.trim().replace(/\s+/g, '');
        const colSetup = `${recursoLimpo}TempoSetup`;
        const colPadrao = `${recursoLimpo}TempoPadrao`;
        const colTotal = `${recursoLimpo}TotalTempo`;
        
        try {
            const query = 'SELECT ?? AS Setup, ?? AS Padrao, ?? AS Total FROM ordemservico WHERE IdOrdemServico = ? LIMIT 1';
            const [rows] = await req.tenantDbPool.query(query, [colSetup, colPadrao, colTotal, id]);
            if (rows.length > 0) {
                return res.json({ success: true, data: rows[0] });
            }
        } catch (colErr) {
            console.log(`Colunas de tempo não encontradas para o recurso ${recursoLimpo} em ordemservico`);
        }
        return res.json({ success: true, data: { Setup: 0, Padrao: 0, Total: 0 } });
    } catch (error) {
        console.error('Erro ao buscar tempos de producao da OS:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar tempos' });
    }
});


// GET /api/ordemservico/projetos/:id/tempos-producao
app.get('/api/ordemservico/projetos/:id/tempos-producao', tenantMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { recurso } = req.query;
        if (!id || !recurso) {
            return res.status(400).json({ success: false, message: 'Faltam dados: id ou recurso' });
        }
        const recursoLimpo = recurso.trim().replace(/\s+/g, '');
        const colSetup = `${recursoLimpo}TempoSetup`;
        const colPadrao = `${recursoLimpo}TempoPadrao`;
        const colTotal = `${recursoLimpo}TotalTempo`;
        
        try {
            const query = 'SELECT ?? AS Setup, ?? AS Padrao, ?? AS Total FROM projetos WHERE IdProjeto = ? LIMIT 1';
            const [rows] = await req.tenantDbPool.query(query, [colSetup, colPadrao, colTotal, id]);
            if (rows.length > 0) {
                return res.json({ success: true, data: rows[0] });
            }
        } catch (colErr) {
            console.log(`Colunas de tempo não encontradas para o recurso ${recursoLimpo} em projetos`);
        }
        return res.json({ success: true, data: { Setup: 0, Padrao: 0, Total: 0 } });
    } catch (error) {
        console.error('Erro ao buscar tempos de producao do projeto:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar tempos' });
    }
});

// Start Server

// ==========================================
// SALVAR DATAS DE PLANEJAMENTO EM LOTE (PROD SETORES)
// ==========================================
app.put('/api/projetos/:id/datas-planejamento', async (req, res) => {
    try {
        const projetoId = req.params.id;
        const { tagIds, osIds, datas } = req.body;

        if ((!tagIds || tagIds.length === 0) && (!osIds || osIds.length === 0)) {
            return res.status(400).json({ error: 'Nenhuma tag ou OS informada.' });
        }

        const tagsInClause = tagIds ? tagIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',') : '';
        const osInClause = osIds ? osIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).join(',') : '';
        
        if (!tagsInClause && !osInClause) return res.status(400).json({ error: 'IDs de tags ou OS inválidos.' });

        const SECTORS_DB = {
          'Corte': { osTxt: 'txtCorte', planIni: 'PlanejadoInicioCorte', planFim: 'PlanejadoFinalCorte', diasProd: 'CorteDiasProducao' },
          'Dobra': { osTxt: 'txtDobra', planIni: 'PlanejadoInicioDobra', planFim: 'PlanejadoFinalDobra', diasProd: 'DobraDiasProducao' },
          'Solda': { osTxt: 'txtSolda', planIni: 'PlanejadoInicioSolda', planFim: 'PlanejadoFinalSolda', diasProd: 'SoldaDiasProducao' },
          'Pintura': { osTxt: 'txtPintura', planIni: 'PlanejadoInicioPintura', planFim: 'PlanejadoFinalPintura', diasProd: 'PinturaDiasProducao' },
          'Montagem': { osTxt: 'TxtMontagem', planIni: 'PlanejadoInicioMontagem', planFim: 'PlanejadoFinalMontagem', diasProd: 'MontagemDiasProducao' },
          'Punsionadeira': { osTxt: 'txtPUNSIONADEIRA', planIni: 'PlanejadoInicioPUNSIONADEIRA', planFim: 'PlanejadoFinalPUNSIONADEIRA', diasProd: 'PunsionadeiraDiasProducao' },
          'CorteaLaser': { osTxt: 'txtCorteaLaser', planIni: 'PlanejadoInicioCorteaLaser', planFim: 'PlanejadoFinalCorteaLaser', diasProd: 'CorteaLaserDiasProducao' },
          'Galvanizar': { osTxt: 'txtGALVANIZAR', planIni: 'PlanejadoInicioGALVANIZAR', planFim: 'PlanejadoFinalGALVANIZAR', diasProd: 'GalvanizarDiasProducao' }
        };

        const tenantPool = req.tenantDbPool || pool;
        const conn = await tenantPool.getConnection();
        await conn.beginTransaction();

        try {
            for (const sectorId of Object.keys(datas)) {
                const sec = SECTORS_DB[sectorId];
                if (!sec) continue;
                
                const ini = datas[sectorId].ini;
                const fim = datas[sectorId].fim;
                if (!ini && !fim) continue; 

                // Convert YYYY-MM-DD to DD/MM/YYYY
                const iniBr = ini ? ini.split('-').reverse().join('/') : null;
                const fimBr = fim ? fim.split('-').reverse().join('/') : null;

                // For tags table
                const updateTagsParams = [];
                let setClauseTags = [];
                
                if (iniBr) { 
                    setClauseTags.push(`${sec.planIni} = CASE WHEN NULLIF(${sec.planIni}, '') IS NULL THEN ? WHEN STR_TO_DATE(?, '%d/%m/%Y') < STR_TO_DATE(${sec.planIni}, '%d/%m/%Y') THEN ? ELSE ${sec.planIni} END`);
                    updateTagsParams.push(iniBr, iniBr, iniBr); 
                }
                if (fimBr) {
                    setClauseTags.push(`${sec.planFim} = CASE WHEN NULLIF(${sec.planFim}, '') IS NULL THEN ? WHEN STR_TO_DATE(?, '%d/%m/%Y') > STR_TO_DATE(${sec.planFim}, '%d/%m/%Y') THEN ? ELSE ${sec.planFim} END`);
                    updateTagsParams.push(fimBr, fimBr, fimBr);
                }

                
                if (iniBr || fimBr) {
                    setClauseTags.push(`${sec.diasProd} = DATEDIFF(STR_TO_DATE(${sec.planFim}, '%d/%m/%Y'), STR_TO_DATE(${sec.planIni}, '%d/%m/%Y'))`);
                }
                if (setClauseTags.length > 0 && tagsInClause) {
                    const queryTags = `UPDATE tags SET ${setClauseTags.join(', ')} WHERE IdTag IN (${tagsInClause})`;
                    await conn.query(queryTags, updateTagsParams);
                }

                // For ordemservicoitem table
                const updateOsiParams = [];
                let setClauseOsi = [];

                if (iniBr) { 
                    setClauseOsi.push(`osi.${sec.planIni} = CASE WHEN NULLIF(osi.${sec.planIni}, '') IS NULL THEN ? WHEN STR_TO_DATE(?, '%d/%m/%Y') < STR_TO_DATE(osi.${sec.planIni}, '%d/%m/%Y') THEN ? ELSE osi.${sec.planIni} END`);
                    updateOsiParams.push(iniBr, iniBr, iniBr); 
                }
                if (fimBr) {
                    setClauseOsi.push(`osi.${sec.planFim} = CASE WHEN NULLIF(osi.${sec.planFim}, '') IS NULL THEN ? WHEN STR_TO_DATE(?, '%d/%m/%Y') > STR_TO_DATE(osi.${sec.planFim}, '%d/%m/%Y') THEN ? ELSE osi.${sec.planFim} END`);
                    updateOsiParams.push(fimBr, fimBr, fimBr);
                }

                
                if (iniBr || fimBr) {
                    setClauseOsi.push(`osi.${sec.diasProd} = DATEDIFF(STR_TO_DATE(osi.${sec.planFim}, '%d/%m/%Y'), STR_TO_DATE(osi.${sec.planIni}, '%d/%m/%Y'))`);
                }
                if (setClauseOsi.length > 0) {
                    let setClauseOs = setClauseOsi.map(clause => clause.replace(/osi\./g, 'os.'));

                    if (tagsInClause) {
                        const queryOSI = `UPDATE ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico SET ${setClauseOsi.join(', ')} WHERE os.IdTag IN (${tagsInClause}) AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = "" OR os.D_E_L_E_T_E = " ") AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = "" OR osi.D_E_L_E_T_E = " ") AND (TRIM(osi.${sec.osTxt}) = "1" OR TRIM(osi.${sec.osTxt}) = "S")`;
                        await conn.query(queryOSI, updateOsiParams);

                        const queryOS = `UPDATE ordemservico os SET ${setClauseOs.join(', ')} WHERE os.IdTag IN (${tagsInClause}) AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = "" OR os.D_E_L_E_T_E = " ")`;
                        await conn.query(queryOS, updateOsiParams);
                    }

                    if (osInClause) {
                        const queryOSI = `UPDATE ordemservicoitem osi INNER JOIN ordemservico os ON os.IdOrdemServico = osi.IdOrdemServico SET ${setClauseOsi.join(', ')} WHERE os.IdOrdemServico IN (${osInClause}) AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = "" OR os.D_E_L_E_T_E = " ") AND (osi.D_E_L_E_T_E IS NULL OR osi.D_E_L_E_T_E = "" OR osi.D_E_L_E_T_E = " ") AND (TRIM(osi.${sec.osTxt}) = "1" OR TRIM(osi.${sec.osTxt}) = "S")`;
                        await conn.query(queryOSI, updateOsiParams);

                        const queryOS = `UPDATE ordemservico os SET ${setClauseOs.join(', ')} WHERE os.IdOrdemServico IN (${osInClause}) AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = "" OR os.D_E_L_E_T_E = " ")`;
                        await conn.query(queryOS, updateOsiParams);
                    }
                }
            }

            await conn.commit();
            res.json({ success: true, message: 'Datas salvas com sucesso' });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});
// Rota de relatórios de OS adicionada dinamicamente
app.use('/api/ordemservico', tenantMiddleware, require('./routes/relatorioOs'));

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

// ============================================================================
// ACOMPANHAMENTO DE ETAPAS (Visão Geral de Projetos / Etapas)
// ============================================================================
app.get('/api/acompanhamento-etapas', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        // Filtros (Opcionais)
        const {
            projeto, cliente, estadoOrigem, 
            dataPrevisaoInicio, dataPrevisaoFim, 
            dataFinalInicio, dataFinalFim,
            dataPlanejamentoInicio, dataPlanejamentoFim,
            dataRealizadoInicio, dataRealizadoFim
        } = req.query;

        let whereClause = "(p.D_E_L_E_T_E IS NULL OR p.D_E_L_E_T_E = '')";
        const params = [];

        if (projeto) {
            whereClause += " AND p.Projeto LIKE ?";
            params.push('%' + projeto + '%');
        }
        if (cliente) {
            whereClause += " AND p.DescEmpresa LIKE ?";
            params.push('%' + cliente + '%');
        }
        if (estadoOrigem) {
            whereClause += " AND p.Estado = ?";
            params.push(estadoOrigem);
        }
        
        // Filtros de Datas
        // DataPrevisao
        if (dataPrevisaoInicio && dataPrevisaoFim) {
            whereClause += " AND STR_TO_DATE(p.DataPrevisao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)";
            params.push(dataPrevisaoInicio, dataPrevisaoFim);
        }
        // DataFinal (usaremos DataFinalizado)
        if (dataFinalInicio && dataFinalFim) {
            whereClause += " AND STR_TO_DATE(SUBSTRING(p.DataFinalizado, 1, 10), '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)";
            params.push(dataFinalInicio, dataFinalFim);
        }

        // Para os filtros de Data de Planejamento e Data de Realizado, 
        // procuraremos nas tags. Usaremos INNER JOIN ou EXISTS.
        if (dataPlanejamentoInicio && dataPlanejamentoFim) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM tags t2 
                WHERE t2.IdProjeto = p.IdProjeto 
                AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '')
                AND (
                    STR_TO_DATE(t2.PlanejadoInicioMedicao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.PlanejadoInicioIsometrico, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.PlanejadoInicioEngenharia, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.PlanejadoInicioAprovacao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.PlanejadoInicioAcabamento, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.PlanejadoInicioExpedicao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                )
            )`;
            for(let i=0; i<6; i++) {
                params.push(dataPlanejamentoInicio, dataPlanejamentoFim);
            }
        }

        if (dataRealizadoInicio && dataRealizadoFim) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM tags t2 
                WHERE t2.IdProjeto = p.IdProjeto 
                AND (t2.D_E_L_E_T_E IS NULL OR t2.D_E_L_E_T_E = '')
                AND (
                    STR_TO_DATE(t2.RealizadoFinalMedicao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.RealizadoFinalIsometrico, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.RealizadoFinalEngenharia, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.RealizadoFinalAprovacao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.RealizadoFinalAcabamento, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                    OR STR_TO_DATE(t2.realizadoFinalExpedicao, '%d/%m/%Y') BETWEEN DATE(?) AND DATE(?)
                )
            )`;
            for(let i=0; i<6; i++) {
                params.push(dataRealizadoInicio, dataRealizadoFim);
            }
        }

        const query = `
            SELECT 
                p.IdProjeto, 
                p.Projeto, 
                p.Observacao,
                p.DataPrevisao,
                SUBSTRING(p.DataFinalizado, 1, 10) as DataFinal,
                p.DescEmpresa as Cliente,
                p.Estado as EstadoOrigem,
                p.StatusProj as StatusProj,
                p.liberado as liberado,
                p.Finalizado as Finalizado,
                COUNT(t.IdTag) as TotalTags,
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.RealizadoFinalMedicao IS NULL OR TRIM(t.RealizadoFinalMedicao) = '') THEN 1 ELSE 0 END) as FaltaMedicao,
                SUM(CASE WHEN t.RealizadoFinalMedicao IS NOT NULL AND TRIM(t.RealizadoFinalMedicao) != '' THEN 1 ELSE 0 END) as OkMedicao,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioMedicao),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanMedicao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalMedicao),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalMedicao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.RealizadoFinalMedicao),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealMedicao,
                
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.RealizadoFinalIsometrico IS NULL OR TRIM(t.RealizadoFinalIsometrico) = '') THEN 1 ELSE 0 END) as FaltaIsometrico,
                SUM(CASE WHEN t.RealizadoFinalIsometrico IS NOT NULL AND TRIM(t.RealizadoFinalIsometrico) != '' THEN 1 ELSE 0 END) as OkIsometrico,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioIsometrico),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanIsometrico,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalIsometrico),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalIsometrico,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.RealizadoFinalIsometrico),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealIsometrico,
                
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.RealizadoFinalEngenharia IS NULL OR TRIM(t.RealizadoFinalEngenharia) = '') THEN 1 ELSE 0 END) as FaltaEngenharia,
                SUM(CASE WHEN t.RealizadoFinalEngenharia IS NOT NULL AND TRIM(t.RealizadoFinalEngenharia) != '' THEN 1 ELSE 0 END) as OkEngenharia,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioEngenharia),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanEngenharia,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalEngenharia),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalEngenharia,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.RealizadoFinalEngenharia),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealEngenharia,
                
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.RealizadoFinalAprovacao IS NULL OR TRIM(t.RealizadoFinalAprovacao) = '') THEN 1 ELSE 0 END) as FaltaAprovacao,
                SUM(CASE WHEN t.RealizadoFinalAprovacao IS NOT NULL AND TRIM(t.RealizadoFinalAprovacao) != '' THEN 1 ELSE 0 END) as OkAprovacao,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioAprovacao),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanAprovacao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalAprovacao),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalAprovacao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.RealizadoFinalAprovacao),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealAprovacao,
                
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.RealizadoFinalAcabamento IS NULL OR TRIM(t.RealizadoFinalAcabamento) = '') THEN 1 ELSE 0 END) as FaltaAcabamento,
                SUM(CASE WHEN t.RealizadoFinalAcabamento IS NOT NULL AND TRIM(t.RealizadoFinalAcabamento) != '' THEN 1 ELSE 0 END) as OkAcabamento,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioAcabamento),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanAcabamento,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalAcabamento),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalAcabamento,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.RealizadoFinalAcabamento),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealAcabamento,
                
                SUM(CASE WHEN t.IdTag IS NOT NULL AND (t.realizadoFinalExpedicao IS NULL OR TRIM(t.realizadoFinalExpedicao) = '') THEN 1 ELSE 0 END) as FaltaExpedicao,
                SUM(CASE WHEN t.realizadoFinalExpedicao IS NOT NULL AND TRIM(t.realizadoFinalExpedicao) != '' THEN 1 ELSE 0 END) as OkExpedicao,
                DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoInicioExpedicao),''), '%d/%m/%Y')), '%d/%m/%Y') as PlanExpedicao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.PlanejadoFinalExpedicao),''),  '%d/%m/%Y')), '%d/%m/%Y') as PlanFinalExpedicao,
                DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(TRIM(t.realizadoFinalExpedicao),''),  '%d/%m/%Y')), '%d/%m/%Y') as RealExpedicao
            FROM projetos p
            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE ${whereClause}
            GROUP BY p.IdProjeto
            ORDER BY p.IdProjeto DESC
        `;

        const [rows] = await connection.query(query, params);
        res.json({ success: true, data: rows });

    } catch (err) {
        console.error('Erro em /api/acompanhamento-etapas:', err);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Bulk Update das datas de etapas (Planejamento e Realizado)
app.put('/api/acompanhamento-etapas/projeto/:id/bulk-update', tenantMiddleware, async (req, res) => {
    let connection = null;
    try {
        const { id } = req.params;
        const tenantPool = req.tenantDbPool || pool;
        connection = await tenantPool.getConnection();

        const { payload, usuario, tagIds } = req.body;
        const data = payload || req.body; // retro-compatibility
        const usuarioLogado = usuario || 'Sistema';

        // Setores e seus campos de Realizado (exigem PlanejadoInicio preenchido na tag)
        const SETORES_REALIZADO = [
            { setor: 'Medicao',     planField: 'PlanejadoInicioMedicao',     realFields: ['RealizadoInicioMedicao', 'RealizadoFinalMedicao'] },
            { setor: 'Isometrico',  planField: 'PlanejadoInicioIsometrico',   realFields: ['RealizadoInicioIsometrico', 'RealizadoFinalIsometrico'] },
            { setor: 'Engenharia',  planField: 'PlanejadoInicioEngenharia',   realFields: ['RealizadoInicioEngenharia', 'RealizadoFinalEngenharia'] },
            { setor: 'Aprovacao',   planField: 'PlanejadoInicioAprovacao',    realFields: ['RealizadoInicioAprovacao', 'RealizadoFinalAprovacao'] },
            { setor: 'Acabamento',  planField: 'PlanejadoInicioAcabamento',   realFields: ['RealizadoInicioAcabamento', 'RealizadoFinalAcabamento'] },
            { setor: 'Expedicao',   planField: 'PlanejadoInicioExpedicao',    realFields: ['RealizadoInicioExpedicao', 'realizadoFinalExpedicao'] },
        ];

        const camposPermitidos = [
            'PlanejadoInicioMedicao', 'PlanejadoFinalMedicao', 'RealizadoInicioMedicao', 'RealizadoFinalMedicao',
            'PlanejadoInicioIsometrico', 'PlanejadoFinalIsometrico', 'RealizadoInicioIsometrico', 'RealizadoFinalIsometrico',
            'PlanejadoInicioEngenharia', 'PlanejadoFinalEngenharia', 'RealizadoInicioEngenharia', 'RealizadoFinalEngenharia',
            'PlanejadoInicioAprovacao', 'PlanejadoFinalAprovacao', 'RealizadoInicioAprovacao', 'RealizadoFinalAprovacao',
            'PlanejadoInicioAcabamento', 'PlanejadoFinalAcabamento', 'RealizadoInicioAcabamento', 'RealizadoFinalAcabamento',
            'PlanejadoInicioExpedicao', 'PlanejadoFinalExpedicao', 'RealizadoInicioExpedicao', 'realizadoFinalExpedicao'
        ];

        // Normaliza datas ISO → BR no payload
        const normalizedData = {};
        Object.keys(data).forEach(key => {
            if (camposPermitidos.includes(key)) {
                let val = data[key];
                if (val && val.includes('-') && val.split('-').length === 3 && val.split('-')[0].length === 4) {
                    const parts = val.split('-');
                    val = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                normalizedData[key] = val;
            }
        });

        if (Object.keys(normalizedData).length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo válido para atualizar.' });
        }

        // Busca as tags selecionadas para validação por tag
        let tagFilter = `IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`;
        const tagParams = [id];
        if (Array.isArray(tagIds) && tagIds.length > 0) {
            tagFilter += ` AND IdTag IN (${tagIds.map(() => '?').join(',')})`;
            tagParams.push(...tagIds);
        }
        const [tagsRows] = await connection.execute(
            `SELECT IdTag, ${SETORES_REALIZADO.map(s => `\`${s.planField}\``).join(', ')} FROM tags WHERE ${tagFilter}`,
            tagParams
        );

        // Para cada tag, aplica o update respeitando a regra: Realizado só se PlanejadoInicio existir
        let totalAffected = 0;
        let totalBloqueados = 0;

        for (const tag of tagsRows) {
            const updates = [];
            const params = [];

            Object.keys(normalizedData).forEach(key => {
                // Verifica se ? campo de Realizado
                const setorConf = SETORES_REALIZADO.find(s => s.realFields.includes(key));
                if (setorConf) {
                    // Tag já tem PlanejadoInicio? ou payload está enviando o PlanejadoInicio deste setor?
                    const tagJaTemPlan = !!(tag[setorConf.planField] && tag[setorConf.planField].trim());
                    const payloadTemPlan = !!(normalizedData[setorConf.planField]);
                    if (!tagJaTemPlan && !payloadTemPlan) {
                        totalBloqueados++;
                        return; // Bloqueia este campo para esta tag
                    }
                }
                updates.push(`\`${key}\` = ?`);
                params.push(normalizedData[key]);
                const capKey = key.charAt(0).toUpperCase() + key.slice(1);
                updates.push(`\`Usuario${capKey}\` = ?`);
                params.push(usuarioLogado);
            });

            if (updates.length === 0) continue;

            params.push(tag.IdTag);
            const [res2] = await connection.execute(
                `UPDATE tags SET ${updates.join(', ')} WHERE IdTag = ?`,
                params
            );
            totalAffected += res2.affectedRows;
        }

        const result = { affectedRows: totalAffected };

        // -- RECALCULAR MIN/MAX DAS DATAS NO PROJETO --
        try {
            const queryMinMax = `
                SELECT 
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioMedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalMedicaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioMedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalMedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalMedicaoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioIsometricoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalIsometricoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioIsometricoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalIsometrico, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalIsometricoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioEngenhariaMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalEngenhariaMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioEngenhariaMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalEngenharia, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalEngenhariaMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioAprovacaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalAprovacaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioAprovacaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalAprovacao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalAprovacaoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioAcabamentoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalAcabamentoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioAcabamentoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalAcabamento, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalAcabamentoMax,

                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(PlanejadoInicioExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoInicioExpedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(PlanejadoFinalExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS PlanejadoFinalExpedicaoMax,
                    DATE_FORMAT(MIN(STR_TO_DATE(NULLIF(RealizadoInicioExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoInicioExpedicaoMin,
                    DATE_FORMAT(MAX(STR_TO_DATE(NULLIF(RealizadoFinalExpedicao, ''), '%d/%m/%Y')), '%d/%m/%Y') AS RealizadoFinalExpedicaoMax
                FROM tags 
                WHERE IdProjeto = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            `;
            const [aggRows] = await connection.execute(queryMinMax, [id]);
            if (aggRows && aggRows.length > 0) {
                const agg = aggRows[0];
                const mapFields = {
                    // Campos em MAIUSCULAS conforme a tabela projetos
                    PlanejadoInicioMEDICAO:    agg.PlanejadoInicioMedicaoMin,
                    PlanejadoFinalMEDICAO:     agg.PlanejadoFinalMedicaoMax,
                    RealizadoInicioMEDICAO:    agg.RealizadoInicioMedicaoMin,
                    RealizadoFinalMEDICAO:     agg.RealizadoFinalMedicaoMax,

                    PlanejadoInicioISOMETRICO: agg.PlanejadoInicioIsometricoMin,
                    PlanejadoFinalISOMETRICO:  agg.PlanejadoFinalIsometricoMax,
                    RealizadoInicioISOMETRICO: agg.RealizadoInicioIsometricoMin,
                    RealizadoFinalISOMETRICO:  agg.RealizadoFinalIsometricoMax,

                    PlanejadoInicioENGENHARIA: agg.PlanejadoInicioEngenhariaMin,
                    PlanejadoFinalENGENHARIA:  agg.PlanejadoFinalEngenhariaMax,
                    RealizadoInicioENGENHARIA: agg.RealizadoInicioEngenhariaMin,
                    RealizadoFinalENGENHARIA:  agg.RealizadoFinalEngenhariaMax,

                    PlanejadoInicioAPROVACAO:  agg.PlanejadoInicioAprovacaoMin,
                    PlanejadoFinalAPROVACAO:   agg.PlanejadoFinalAprovacaoMax,
                    RealizadoInicioAPROVACAO:  agg.RealizadoInicioAprovacaoMin,
                    RealizadoFinalAPROVACAO:   agg.RealizadoFinalAprovacaoMax,

                    PlanejadoInicioACABAMENTO: agg.PlanejadoInicioAcabamentoMin,
                    PlanejadoFinalACABAMENTO:  agg.PlanejadoFinalAcabamentoMax,
                    RealizadoInicioACABAMENTO: agg.RealizadoInicioAcabamentoMin,
                    RealizadoFinalACABAMENTO:  agg.RealizadoFinalAcabamentoMax,

                    PlanejadoInicioExpedicao:  agg.PlanejadoInicioExpedicaoMin,
                    PlanejadoFinalExpedicao:   agg.PlanejadoFinalExpedicaoMax,
                    RealizadoInicioExpedicao:  agg.RealizadoInicioExpedicaoMin,
                    RealizadoFinalExpedicao:   agg.RealizadoFinalExpedicaoMax
                };
                
                
                const updatesProj = [];
                const paramsProj = [];
                for (const [f, v] of Object.entries(mapFields)) {
                    updatesProj.push(`${f} = ?`);
                    paramsProj.push(v || '');
                    // Grava o campo de usuário correspondente se a data não for vazia
                    if (v) {
                        const capF = f.charAt(0).toUpperCase() + f.slice(1);
                        updatesProj.push(`Usuario${capF} = ?`);
                        paramsProj.push(usuarioLogado);
                    }
                }

                if (updatesProj.length > 0) {
                    paramsProj.push(id);
                    await connection.execute(`UPDATE projetos SET ${updatesProj.join(', ')} WHERE IdProjeto = ?`, paramsProj);
                }
            }
        } catch (e) {
            console.error('Erro ao recalcular limites do projeto:', e);
        }

        const bloqueioMsg = totalBloqueados > 0 
            ? ` (${totalBloqueados} campo(s) Realizado ignorado(s): sem data Planejado no setor correspondente)`
            : '';
        res.json({ success: true, message: `Datas atualizadas em ${result.affectedRows} tags do projeto.${bloqueioMsg}` });

    } catch (err) {
        console.error('Erro em bulk-update de acompanhamento-etapas:', err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar datas: ' + err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ─── ENDPOINT DE MANUTENCAO: Recalcula QtdeTags para todos os projetos ────
// Chame via: GET /api/manutencao/fix-qtdetags?key=sinco-manut-2026
// REMOVER APOS EXECUTAR UMA VEZ.
app.get('/api/manutencao/fix-qtdetags', tenantMiddleware, async (req, res) => {
    if (req.query.key !== 'sinco-manut-2026') {
        return res.status(403).json({ success: false, message: 'Chave invalida' });
    }
    try {
        const [result] = await req.tenantDbPool.execute(`
            UPDATE projetos p
            SET QtdeTags = (
                SELECT COUNT(*) FROM tags t
                WHERE t.IdProjeto = p.IdProjeto
                  AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            )
            WHERE (p.D_E_L_E_T_E IS NULL OR p.D_E_L_E_T_E = '')
        `);
        console.log(`[MANUTENCAO] QtdeTags recalculado para ${result.affectedRows} projetos.`);

        const [[p84]] = await req.tenantDbPool.execute(
            'SELECT IdProjeto, Projeto, QtdeTags FROM projetos WHERE IdProjeto = 84'
        );

        const [divs] = await req.tenantDbPool.execute(`
            SELECT p.IdProjeto, p.Projeto, p.QtdeTags, COUNT(t.IdTag) as CountReal
            FROM projetos p
            LEFT JOIN tags t ON t.IdProjeto = p.IdProjeto
                AND (t.D_E_L_E_T_E IS NULL OR t.D_E_L_E_T_E = '')
            WHERE (p.D_E_L_E_T_E IS NULL OR p.D_E_L_E_T_E = '')
            GROUP BY p.IdProjeto
            HAVING CAST(COALESCE(p.QtdeTags, 0) AS UNSIGNED) != COUNT(t.IdTag)
        `);

        res.json({
            success: true,
            projetosAtualizados: result.affectedRows,
            projeto84: p84,
            divergenciasRestantes: divs.length,
            divergencias: divs
        });
    } catch (e) {
        console.error('[MANUTENCAO] Erro:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── ENDPOINT ANALISE: Padrao EnderecoArquivo ───────────────────────────────
app.get('/api/manutencao/analise-endereco', tenantMiddleware, async (req, res) => {
    if (req.query.key !== 'sinco-manut-2026') {
        return res.status(403).json({ success: false, message: 'Chave invalida' });
    }
    try {
        // 1. Amostras de EnderecoArquivo existentes
        const [amostras] = await req.tenantDbPool.execute(`
            SELECT EnderecoArquivo, CodMatFabricante
            FROM ordemservicoitem
            WHERE EnderecoArquivo IS NOT NULL AND EnderecoArquivo <> ''
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdOrdemServicoItem DESC
            LIMIT 30
        `);

        // 2. Padroes de pasta base (tudo antes do ultimo separador)
        const bases = [...new Set(amostras.map(r => {
            const p = r.EnderecoArquivo;
            const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
            return idx > 0 ? p.substring(0, idx) : p;
        }))];

        // 3. Sufixos distintos de arquivo
        const sufixos = [...new Set(amostras.map(r => {
            const p = r.EnderecoArquivo;
            const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
            const arquivo = idx > 0 ? p.substring(idx + 1) : p;
            const dotIdx = arquivo.lastIndexOf('.');
            return dotIdx > 0 ? arquivo.substring(dotIdx).toUpperCase() : '';
        }))];

        // 4. Verifica configuracoes_internas por chave de caminho
        let configPath = null;
        try {
            const [cfg] = await req.tenantDbPool.execute(
                `SELECT chave, valor FROM configuracoes_internas
                 WHERE chave LIKE '%solidworks%' OR chave LIKE '%endereco%'
                    OR chave LIKE '%path%' OR chave LIKE '%arquivo%'
                 LIMIT 10`
            );
            configPath = cfg;
        } catch(e) { configPath = 'Tabela configuracoes_internas nao encontrada ou sem registros'; }

        // 5. Estatisticas: com/sem EnderecoArquivo
        const [[stats]] = await req.tenantDbPool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN EnderecoArquivo IS NOT NULL AND EnderecoArquivo <> '' THEN 1 ELSE 0 END) as com_endereco,
                SUM(CASE WHEN EnderecoArquivo IS NULL OR EnderecoArquivo = '' THEN 1 ELSE 0 END) as sem_endereco
            FROM ordemservicoitem
            WHERE D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = ''
        `);

        res.json({
            success: true,
            estatisticas: stats,
            basesEncontradas: bases,
            sufixosEncontrados: sufixos,
            amostras10: amostras.slice(0, 10),
            configuracoes: configPath
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── ENDPOINT ANALISE: Correlacao txtTipoDesenho x sufixo arquivo ───────────
app.get('/api/manutencao/analise-tipoarquivo', tenantMiddleware, async (req, res) => {
    if (req.query.key !== 'sinco-manut-2026') {
        return res.status(403).json({ success: false, message: 'Chave invalida' });
    }
    try {
        const [rows] = await req.tenantDbPool.execute(`
            SELECT 
                txtTipoDesenho,
                EnderecoArquivo,
                CodMatFabricante,
                CASE 
                    WHEN EnderecoArquivo LIKE '%.SLDASM' THEN 'SLDASM'
                    WHEN EnderecoArquivo LIKE '%.SLDPRT' THEN 'SLDPRT'
                    ELSE 'OUTRO'
                END as Sufixo
            FROM ordemservicoitem
            WHERE EnderecoArquivo IS NOT NULL AND EnderecoArquivo <> ''
              AND EnderecoArquivo <> 'IMPORTADO DA PLANILHA'
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            LIMIT 50
        `);

        // Agrupa por tipoDesenho x sufixo
        const correlacao = rows.reduce((acc, r) => {
            const tipo = r.txtTipoDesenho || '(vazio)';
            if (!acc[tipo]) acc[tipo] = { SLDPRT: 0, SLDASM: 0, OUTRO: 0 };
            acc[tipo][r.Sufixo]++;
            return acc;
        }, {});

        res.json({ success: true, correlacao, amostras: rows.slice(0, 15) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── ENDPOINT MANUTENCAO: Corrige EnderecoArquivo = 'IMPORTADO DA PLANILHA' ─
// GET /api/manutencao/fix-endereco-importado?key=sinco-manut-2026
app.get('/api/manutencao/fix-endereco-importado', tenantMiddleware, async (req, res) => {
    if (req.query.key !== 'sinco-manut-2026') {
        return res.status(403).json({ success: false, message: 'Chave invalida' });
    }
    try {
        // 1. Busca caminho base configurado (ou usa fallback padrao lynxlocal)
        let swBasePath = 'G:\\MEU DRIVE\\04-ARQUIVOS SOLIDWORKS';
        try {
            const [cfgRows] = await req.tenantDbPool.execute(
                `SELECT valor FROM configuracoes_internas WHERE chave = 'path_solidworks' LIMIT 1`
            );
            if (cfgRows.length > 0 && cfgRows[0].valor) {
                swBasePath = cfgRows[0].valor.trim().replace(/[\\/]+$/, '');
            }
        } catch(e) { /* usa fallback */ }

        // 2. Busca todos os itens com EnderecoArquivo = 'IMPORTADO DA PLANILHA'
        const [itens] = await req.tenantDbPool.execute(`
            SELECT IdOrdemServicoItem, CodMatFabricante, txtTipoDesenho
            FROM ordemservicoitem
            WHERE EnderecoArquivo = 'IMPORTADO DA PLANILHA'
              AND CodMatFabricante IS NOT NULL AND CodMatFabricante <> ''
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `);

        if (itens.length === 0) {
            return res.json({ success: true, message: 'Nenhum registro com IMPORTADO DA PLANILHA encontrado.', atualizados: 0 });
        }

        // 3. Atualiza cada registro com o caminho calculado
        let atualizados = 0;
        const detalhes = [];

        for (const item of itens) {
            const tipoDesenho = (item.txtTipoDesenho || '').trim().toUpperCase();
            const sufixo = (tipoDesenho === 'CONJUNTO') ? '.SLDASM' : '.SLDPRT';
            const codMat = (item.CodMatFabricante || '').trim();
            const novoEndereco = `${swBasePath}\\${codMat}${sufixo}`;

            await req.tenantDbPool.execute(
                `UPDATE ordemservicoitem SET EnderecoArquivo = ? WHERE IdOrdemServicoItem = ?`,
                [novoEndereco, item.IdOrdemServicoItem]
            );

            detalhes.push({ id: item.IdOrdemServicoItem, codMat, tipoDesenho, novoEndereco });
            atualizados++;
        }

        console.log(`[MANUTENCAO] fix-endereco-importado: ${atualizados} registros corrigidos. Base: ${swBasePath}`);

        res.json({
            success: true,
            message: `${atualizados} registros corrigidos com sucesso.`,
            basePath: swBasePath,
            atualizados,
            detalhes
        });
    } catch (e) {
        console.error('[MANUTENCAO] fix-endereco-importado erro:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// ─── ENDPOINT DIAGNOSTICO: Inspeciona item por ID ───────────────────────────
app.get('/api/manutencao/inspecionar-item', tenantMiddleware, async (req, res) => {
    if (req.query.key !== 'sinco-manut-2026') {
        return res.status(403).json({ success: false, message: 'Chave invalida' });
    }
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Parametro id obrigatorio' });
    try {
        const [rows] = await req.tenantDbPool.execute(
            `SELECT PlanejadoInicioCorte, PlanejadoFinalCorte, PlanejadoInicioDobra, PlanejadoFinalDobra, PlanejadoInicioSolda, PlanejadoFinalSolda, PlanejadoInicioPintura, PlanejadoFinalPintura, PlanejadoInicioMontagem, PlanejadoFinalMontagem, PlanejadoInicioCorteaLaser, PlanejadoFinalCorteaLaser, PlanejadoInicioPUNSIONADEIRA, PlanejadoFinalPUNSIONADEIRA, PlanejadoInicioGALVANIZAR, PlanejadoFinalGALVANIZAR, CorteDiasProducao, DobraDiasProducao, SoldaDiasProducao, PinturaDiasProducao, MontagemDiasProducao, CorteaLaserDiasProducao, PunsionadeiraDiasProducao, GalvanizarDiasProducao, CorteMinProd, DobraMinProd, SoldaMinProd, PinturaMinProd, MontagemMinProd, CorteaLaserMinProd, PUNSIONADEIRAMinProd, GALVANIZARMinProd, IdOrdemServicoItem, IdOrdemServico, CodMatFabricante,
                    EnderecoArquivo, txtTipoDesenho, D_E_L_E_T_E, DescResumo
             FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.json({ success: false, message: 'Item ' + id + ' nao encontrado.' });
        }
        const item = rows[0];
        const endAtual = (item.EnderecoArquivo || '').trim();
        const motivos = [];

        if (item.D_E_L_E_T_E && item.D_E_L_E_T_E !== '') {
            motivos.push('DELETADO: D_E_L_E_T_E = "' + item.D_E_L_E_T_E + '"');
        }
        if (!item.CodMatFabricante || item.CodMatFabricante.trim() === '') {
            motivos.push('CodMatFabricante vazio/nulo — filtro exige codigo preenchido');
        }
        if (endAtual !== 'IMPORTADO DA PLANILHA') {
            motivos.push('EnderecoArquivo nao bate exatamente com "IMPORTADO DA PLANILHA"');
            motivos.push('Valor atual: "' + endAtual + '" | Comprimento: ' + endAtual.length + ' chars');
            // Mostra char codes para detectar espacos/caracteres ocultos
            const charCodes = [...endAtual].slice(0, 30).map(c => c.charCodeAt(0));
            motivos.push('Primeiros char codes: [' + charCodes.join(',') + ']');
        }
        if (motivos.length === 0) {
            motivos.push('Nenhum motivo detectado — item deveria ter sido atualizado anteriormente');
        }

        res.json({ success: true, item, motivos_nao_atualizado: motivos });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROTA MANUTENÇÃO: Update EnderecoArquivo por OS e banco (sem tenant middleware)
// Acesso: chave interna 'SincoMasterKey2026!' + POST /api/manutencao/update-endereco-arquivo
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/manutencao/update-endereco-arquivo', tenantMiddleware, async (req, res) => {
    const MANUT_KEY = 'SincoMasterKey2026!';
    const { chave, dbName, osId, basePath } = req.body;

    if (chave !== MANUT_KEY) {
        return res.status(403).json({ success: false, message: 'Chave inválida.' });
    }
    if (!dbName || !osId || !basePath) {
        return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios: dbName, osId, basePath.' });
    }

    let conn = null;
    try {
        // Buscar credenciais do tenant no banco central
        const [rows] = await pool.executeOnDefault(
            'SELECT * FROM conexoes_bancos WHERE db_name = ? AND ativo = 1 LIMIT 1',
            [dbName]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: `Banco '${dbName}' não encontrado no registro.` });
        }
        const cfg = rows[0];

        // Criar conexão direta com o banco do tenant (mysql2 nativo)
        const mysql2 = require('mysql2/promise');
        conn = await mysql2.createConnection({
            host    : cfg.db_host,
            user    : cfg.db_user,
            password: cfg.db_pass,
            database: cfg.db_name,
            port    : cfg.db_port || 3306,
            charset : 'utf8mb4'
        });

        // Buscar todos os itens ativos da OS informada
        const [itens] = await conn.execute(
            `SELECT IdOrdemServicoItem, CodMatFabricante, txtTipoDesenho, EnderecoArquivo
             FROM ordemservicoitem
             WHERE IdOrdemServico = ?
               AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '' OR D_E_L_E_T_E != '*')`,
            [osId]
        );

        if (itens.length === 0) {
            return res.json({ success: false, message: `Nenhum item encontrado para OS ${osId} em ${dbName}.` });
        }

        let atualizados = 0;
        let ignorados   = 0;
        const detalhes  = [];

        for (const item of itens) {
            const cod = (item.CodMatFabricante || '').trim();
            if (!cod) { ignorados++; detalhes.push({ id: item.IdOrdemServicoItem, status: 'IGNORADO', motivo: 'CodMatFabricante vazio' }); continue; }

            const tipo   = (item.txtTipoDesenho || '').trim().toUpperCase();
            const sufixo = tipo === 'CONJUNTO' ? '.SLDASM' : '.SLDPRT';
            const novoEnd = `${basePath}\\${cod}${sufixo}`;

            await conn.execute(
                `UPDATE ordemservicoitem SET EnderecoArquivo = ? WHERE IdOrdemServicoItem = ?`,
                [novoEnd, item.IdOrdemServicoItem]
            );
            atualizados++;
            detalhes.push({ id: item.IdOrdemServicoItem, cod, tipo, sufixo, enderecoGerado: novoEnd, status: 'OK' });
        }

        console.log(`[MANUTENCAO] update-endereco-arquivo | DB: ${dbName} | OS: ${osId} | Atualizados: ${atualizados} | Ignorados: ${ignorados}`);
        res.json({ success: true, message: `${atualizados} itens atualizados. ${ignorados} ignorados.`, atualizados, ignorados, detalhes });

    } catch (e) {
        console.error('[MANUTENCAO] Erro:', e.message);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (conn) await conn.end();
    }
});


// --- MATERIAIS ARQUIVOS (PDF) CRUD ---

const ensureMaterialArquivosTable = async (pool) => {
    try {
        await req.tenantDbPool.execute(`
            CREATE TABLE IF NOT EXISTS material_arquivos (
                idArquivo INT AUTO_INCREMENT PRIMARY KEY,
                IdMaterial INT NOT NULL,
                NomeArquivo VARCHAR(255) NOT NULL,
                TipoArquivo VARCHAR(100) NOT NULL,
                Tamanho INT NOT NULL,
                Dados LONGBLOB NOT NULL,
                DataCriacao DATETIME NOT NULL,
                CriadoPor VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    } catch (error) {
        console.error('Error creating material_arquivos table:', error);
    }
};

// GET /api/materiais/:id/arquivos - Listar arquivos do material (sem os dados blob)
app.get('/api/materiais/:id/arquivos', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        await ensureMaterialArquivosTable(req.tenantDbPool);
        const [rows] = await req.tenantDbPool.execute(
            "SELECT idArquivo, IdMaterial, NomeArquivo, TipoArquivo, Tamanho, DataCriacao, CriadoPor FROM material_arquivos WHERE IdMaterial = ? ORDER BY DataCriacao DESC",
            [id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching material arquivos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar arquivos do material' });
    }
});

// POST /api/materiais/:id/arquivos - Fazer upload de um arquivo
app.post('/api/materiais/:id/arquivos', tenantMiddleware, uploadMemory.single('arquivo'), async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });

    const usuario = req.tenantUser?.login || req.tenantUser?.nomeCompleto || 'Sistema';
    const dbName = req.tenantUser?.dbName || 'default';
    const now = new Date();
    const nowFormat = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    try {
        await ensureMaterialArquivosTable(req.tenantDbPool);

        const dir = path.join(__dirname, '../public/uploads/materiais', dbName, String(id));
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filePath = path.join(dir, file.originalname);
        await fs.promises.writeFile(filePath, file.buffer);

        const marker = Buffer.from('[FILE_SYSTEM]');
        
        await req.tenantDbPool.execute(
            "INSERT INTO material_arquivos (IdMaterial, NomeArquivo, TipoArquivo, Tamanho, Dados, DataCriacao, CriadoPor) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, file.originalname, file.mimetype, file.size, marker, nowFormat, usuario]
        );
        res.json({ success: true, message: 'Arquivo salvo com sucesso' });
    } catch (error) {
        console.error('Error uploading material arquivo:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar arquivo' });
    }
});

// GET /api/materiais/arquivos/:idArquivo/download - Baixar/Visualizar o arquivo
app.get('/api/materiais/arquivos/:idArquivo/download', tenantMiddleware, async (req, res) => {
    const { idArquivo } = req.params;
    try {
        await ensureMaterialArquivosTable(req.tenantDbPool);
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdMaterial, NomeArquivo, TipoArquivo, Dados FROM material_arquivos WHERE idArquivo = ?",
            [idArquivo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Arquivo não encontrado' });
        }

        const file = rows[0];
        const dbName = req.tenantUser?.dbName || 'default';
        const diskPath = path.join(__dirname, '../public/uploads/materiais', dbName, String(file.IdMaterial), file.NomeArquivo);

        res.setHeader('Content-Disposition', `inline; filename="${file.NomeArquivo}"`);
        res.setHeader('Content-Type', file.TipoArquivo);

        if (fs.existsSync(diskPath)) {
            const fileStream = fs.createReadStream(diskPath);
            fileStream.pipe(res);
        } else {
            if (file.Dados) {
                 res.send(file.Dados);
            } else {
                 return res.status(404).json({ success: false, message: 'Arquivo não encontrado fisicamente ou no banco' });
            }
        }

    } catch (error) {
        console.error('Error downloading material arquivo:', error);
        res.status(500).json({ success: false, message: 'Erro ao baixar arquivo' });
    }
});

// DELETE /api/materiais/arquivos/:idArquivo - Excluir arquivo
app.delete('/api/materiais/arquivos/:idArquivo', tenantMiddleware, async (req, res) => {
    const { idArquivo } = req.params;
    try {
        await ensureMaterialArquivosTable(req.tenantDbPool);
        
        const [rows] = await req.tenantDbPool.execute(
            "SELECT IdMaterial, NomeArquivo FROM material_arquivos WHERE idArquivo = ?",
            [idArquivo]
        );

        if (rows.length > 0) {
            const file = rows[0];
            const dbName = req.tenantUser?.dbName || 'default';
            const diskPath = path.join(__dirname, '../public/uploads/materiais', dbName, String(file.IdMaterial), file.NomeArquivo);
            
            if (fs.existsSync(diskPath)) {
                fs.unlinkSync(diskPath);
            }
        }

        await req.tenantDbPool.execute(
            "DELETE FROM material_arquivos WHERE idArquivo = ?",
            [idArquivo]
        );
        res.json({ success: true, message: 'Arquivo excluído com sucesso' });
    } catch (error) {
        console.error('Error deleting material arquivo:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir arquivo' });
    }
});
