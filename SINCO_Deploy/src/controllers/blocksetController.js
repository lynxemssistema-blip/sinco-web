const db = require('../config/db');
const ExcelJS = require('exceljs');

exports.getBlocksetFiles = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.IdPlanilha, p.NomeArquivo, p.IdProjeto, p.IdTag, p.DataImportacao, p.Revisao,
                   proj.Projeto as NomeProjeto, t.Tag as NomeTag
            FROM PlanilhasBlockSet p
            LEFT JOIN projetos proj ON p.IdProjeto = proj.IdProjeto
            LEFT JOIN tags t ON p.IdTag = t.IdTag
            ORDER BY p.DataImportacao DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar planilhas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar planilhas do banco de dados.' });
    }
};

exports.getBlocksetData = async (req, res) => {
    const { idPlanilha } = req.params;
    try {
        const [planilhaRows] = await db.query(`
            SELECT p.IdPlanilha, p.NomeArquivo, p.IdProjeto, p.IdTag, p.DataImportacao, p.Revisao,
                   proj.Projeto as NomeProjeto, t.Tag as NomeTag
            FROM PlanilhasBlockSet p
            LEFT JOIN projetos proj ON p.IdProjeto = proj.IdProjeto
            LEFT JOIN tags t ON p.IdTag = t.IdTag
            WHERE p.IdPlanilha = ?
        `, [idPlanilha]);

        if (planilhaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Planilha não encontrada.' });
        }

        const [dataRows] = await db.query(`
            SELECT *
            FROM DadosBlockSet
            WHERE IdPlanilha = ?
            ORDER BY IdDadosBlockSet ASC
        `, [idPlanilha]);

        res.json({
            success: true,
            planilha: planilhaRows[0],
            dados: dataRows
        });
    } catch (error) {
        console.error('Erro ao buscar dados da planilha:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados da planilha.' });
    }
};

exports.getProjetos = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT IdProjeto, Projeto 
            FROM projetos 
            WHERE (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '') 
              AND (LIBERADO = 'S') 
              AND (Finalizado IS NULL OR Finalizado = '')
            ORDER BY Projeto
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar projetos.' });
    }
};

exports.getOrdensServicoByTag = async (req, res) => {
    const { idTag } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT IdOrdemServico, CONCAT(IdOrdemServico, ' - ', COALESCE(Descricao, '')) as DescricaoOS
            FROM ordemservico
            WHERE IdTag = ? 
              AND (Liberado_Engenharia IS NULL OR Liberado_Engenharia <> 'S')
              AND (Finalizado IS NULL OR Finalizado <> 'S')
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')
            ORDER BY IdOrdemServico DESC
        `, [idTag]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar ordens de serviço por tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar ordens de serviço.' });
    }
};

// --- NEW FUNCTIONS FOR POWER BUILD IMPORT ---

/**
 * Ensures the database structure matches the requirements for Power Build.
 */
exports.initImportStructure = async (req, res) => {
    try {
        // 1. Create tables if not exist
        await db.execute(`
            CREATE TABLE IF NOT EXISTS pixeasy (
                IdDado INT AUTO_INCREMENT PRIMARY KEY, 
                IdPlanilha INT, 
                Revisao INT, 
                IdProjeto INT, 
                IdTag INT, 
                NomeProjeto VARCHAR(255), 
                NomeTag VARCHAR(255), 
                NomePlanilha VARCHAR(255), 
                Function_name VARCHAR(255), 
                GCR VARCHAR(255), 
                UG_SBU VARCHAR(255), 
                UG_SBU_Description TEXT, 
                UG_SBU_Quantity DECIMAL(18,4), 
                Referencia VARCHAR(255), 
                Referencia_P VARCHAR(255), 
                Reference_description TEXT, 
                Reference_quantity DECIMAL(18,4), 
                Unit VARCHAR(50), 
                Tipo_de_referencia VARCHAR(255),
                D_E_L_E_T_E VARCHAR(1) DEFAULT NULL
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS AglutinacaoPixeasy (
                IdAglutinacao INT AUTO_INCREMENT PRIMARY KEY,
                CodMatFabricante VARCHAR(100), 
                UG_SBU_Quantity DECIMAL(18,4), 
                Reference_quantity DECIMAL(18,4), 
                DataAglutinacao VARCHAR(20), 
                IdProjeto INT, 
                IdTag INT, 
                NomeProjeto VARCHAR(255), 
                NomeTag VARCHAR(255), 
                NomePlanilha VARCHAR(255), 
                Revisao INT
            )
        `);

        // 2. Add columns to existing tables
        const tablesToAlter = ["pixeasy", "AglutinacaoPixeasy", "DadosBlockSet", "PlanilhasBlockSet", "AglutinacaoBlockSet"];
        const columnsToAdd = [
            { name: "NomeProjeto", type: "VARCHAR(255)" },
            { name: "NomeTag", type: "VARCHAR(255)" },
            { name: "Revisao", type: "INT DEFAULT 0" },
            { name: "Referencia", type: "VARCHAR(255)" },
            { name: "Referencia_P", type: "VARCHAR(255)" }
        ];

        for (const table of tablesToAlter) {
            for (const col of columnsToAdd) {
                try {
                    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}`);
                } catch (e) {
                    // Ignore "Duplicate column name" error (1060)
                }
            }
        }

        // Specific alters for itenspendentes
        try { await db.execute("ALTER TABLE itenspendentes ADD COLUMN NomePlanilha VARCHAR(255)"); } catch (e) {}
        try { await db.execute("ALTER TABLE itenspendentes ADD COLUMN Revisao VARCHAR(50)"); } catch (e) {}

        res.json({ success: true, message: 'Estrutura do banco de dados verificada com sucesso.' });
    } catch (error) {
        console.error('Erro ao inicializar estrutura:', error);
        res.status(500).json({ success: false, message: 'Erro ao inicializar estrutura do banco.' });
    }
};

/**
 * Performs a TRUNCATE on import tables.
 */
exports.truncateImportTables = async (req, res) => {
    try {
        await db.query("SET FOREIGN_KEY_CHECKS = 0");
        const tables = ["pixeasy", "DadosBlockSet", "PlanilhasBlockSet", "AglutinacaoPixeasy", "AglutinacaoBlockSet", "itenspendentes"];
        for (const table of tables) {
            await db.query(`DELETE FROM ${table}`);
            await db.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
        }
        await db.query("SET FOREIGN_KEY_CHECKS = 1");
        res.json({ success: true, message: 'Tabelas de importação limpas com sucesso.' });
    } catch (error) {
        console.error('Erro no truncate:', error);
        res.status(500).json({ success: false, message: 'Erro ao limpar tabelas.' });
    }
};

/**
 * Handles the Excel import process.
 */
exports.importPlanilha = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }

    const { 
        idProjeto, idTag, nomeProjeto, nomeTag, 
        isRevision, masterFileName 
    } = req.body;

    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(req.file.buffer);
        
        let sheet = workbook.getWorksheet('data') || workbook.getWorksheet('data$');
        let type = 'blockset';

        if (!sheet) {
            sheet = workbook.getWorksheet('bom') || workbook.getWorksheet('bom$');
            type = 'pixeasy';
        }

        if (!sheet) {
            return res.status(400).json({ success: false, message: 'Aba "data" ou "bom" não encontrada na planilha.' });
        }

        // Validation of mandatory columns
        const headers = sheet.getRow(1).values;
        if (type === 'blockset') {
            const hasCubicle = headers.some(h => h && h.toString().includes('Cubicle'));
            const hasPartRef = headers.some(h => h && h.toString().includes('Part reference'));
            if (!hasCubicle || !hasPartRef) {
                return res.status(400).json({ success: false, message: 'Planilha BlockSet inválida. Colunas "Cubicle" ou "Part reference" não encontradas.' });
            }
        } else {
            const hasFunc = headers.some(h => h && h.toString().includes('Function name'));
            const hasRef = headers.some(h => h && h.toString().includes('Referência')) || headers.some(h => h && h.toString().includes('Referencia'));
            if (!hasFunc || !hasRef) {
                return res.status(400).json({ success: false, message: 'Planilha PixEasy inválida. Colunas "Function name" ou "Referência" não encontradas.' });
            }
        }

        // Handle Revision Logic
        const originalFileName = req.file.originalname;
        let finalFileName = originalFileName;
        let referencia = "";
        let nextRevision = 0;

        if (isRevision === 'true') {
            finalFileName = masterFileName;
            referencia = originalFileName;
            
            const [maxRows] = await db.query(
                "SELECT MAX(Revisao) as maxRev FROM PlanilhasBlockSet WHERE NomeArquivo = ? AND IdProjeto = ? AND IdTag = ?",
                [finalFileName, idProjeto, idTag]
            );
            
            if (maxRows.length > 0 && maxRows[0].maxRev !== null) {
                nextRevision = maxRows[0].maxRev + 1;
            } else {
                nextRevision = 1;
            }
        }

        // Insert Master Record
        const [planilhaResult] = await db.query(
            `INSERT INTO PlanilhasBlockSet (NomeArquivo, IdProjeto, IdTag, NomeProjeto, NomeTag, DataImportacao, Revisao, Referencia) 
             VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [finalFileName, idProjeto, idTag, nomeProjeto, nomeTag, nextRevision, referencia]
        );
        const idPlanilha = planilhaResult.insertId;

        // Process Rows
        const rows = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip headers
            
            const getVal = (colNamePart) => {
                const colIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes(colNamePart.toLowerCase()));
                if (colIdx === -1) return null;
                const cell = row.getCell(colIdx);
                return cell ? cell.value : null;
            };

            if (type === 'blockset') {
                const cubicle = getVal('Cubicle');
                const partRef = getVal('Part reference');
                if (!cubicle && !partRef) return; // Skip empty rows

                rows.push([
                    idPlanilha, nextRevision, idProjeto, idTag, nomeProjeto, nomeTag, finalFileName, referencia,
                    cubicle, getVal('Cubicle type'), getVal('FU'), getVal('Info'), getVal('eFU type'),
                    getVal('Efu process'), getVal('eFU qty'), getVal('PD type'), getVal('PD Origin'),
                    getVal('PD reference'), getVal('PD revision'), getVal('PD description'), getVal('PD qty'),
                    getVal('Part material'), getVal('Part origin'), partRef, getVal('Part revision'),
                    getVal('Part description'), getVal('Part total qty'), getVal('Part process'),
                    getVal('Mass per part (kg)'), getVal('Volume per part (cm³)'), getVal('Surface per part (cm³)')
                ]);
            } else {
                const funcName = getVal('Function name');
                const ref = getVal('Referência') || getVal('Referencia');
                if (!funcName && !ref) return;

                rows.push([
                    idPlanilha, nextRevision, idProjeto, idTag, nomeProjeto, nomeTag, finalFileName, referencia,
                    funcName, getVal('GCR'), getVal('UG/SBU'), getVal('UG/SBU Description'), getVal('UG/SBU Quantity'),
                    getVal('Referência') || getVal('Referencia'), getVal('Reference description'), getVal('Reference quantity'),
                    getVal('Unit'), getVal('Tipo de referência')
                ]);
            }
        });

        // Batch Insert
        if (rows.length > 0) {
            if (type === 'blockset') {
                const sql = `INSERT INTO DadosBlockSet (IdPlanilha, Revisao, IdProjeto, IdTag, NomeProjeto, NomeTag, NomePlanilha, Referencia, Cubicle, Cubicle_type, FU, Info, eFU_type, Efu_process, eFU_qty, PD_type, PD_Origin, PD_reference, PD_revision, PD_description, PD_qty, Part_material, Part_origin, Part_reference, Part_revision, Part_description, Part_total_qty, Part_process, Mass_per_part_kg, Volume_per_part_cm3, Surface_per_part_cm3) VALUES ?`;
                await db.query(sql, [rows]);
            } else {
                const sql = `INSERT INTO pixeasy (IdPlanilha, Revisao, IdProjeto, IdTag, NomeProjeto, NomeTag, NomePlanilha, Referencia, Function_name, GCR, UG_SBU, UG_SBU_Description, UG_SBU_Quantity, Referencia_P, Reference_description, Reference_quantity, Unit, Tipo_de_referencia) VALUES ?`;
                await db.query(sql, [rows]);
            }
        }

        res.json({ 
            success: true, 
            message: `Planilha ${type === 'pixeasy' ? 'PixEasy' : 'BlockSet'} importada com sucesso!`,
            count: rows.length,
            idPlanilha
        });

    } catch (error) {
        console.error('Erro na importação:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar planilha: ' + error.message });
    }
};

exports.getTagsByProjeto = async (req, res) => {
    const { idProjeto } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT IdTag, NomeTag 
            FROM (
                SELECT IdTag, NomeTag FROM DadosBlockSet WHERE IdProjeto = ?
                UNION
                SELECT IdTag, NomeTag FROM pixeasy WHERE IdProjeto = ?
            ) as t
            ORDER BY NomeTag
        `, [idProjeto, idProjeto]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar tags por projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar tags.' });
    }
};

exports.getPlanilhasByTag = async (req, res) => {
    const { idProjeto, idTag } = req.params;
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT NomePlanilha
            FROM (
                SELECT NomePlanilha FROM DadosBlockSet WHERE IdProjeto = ? AND IdTag = ?
                UNION
                SELECT NomePlanilha FROM pixeasy WHERE IdProjeto = ? AND IdTag = ?
            ) as t
            ORDER BY NomePlanilha
        `, [idProjeto, idTag, idProjeto, idTag]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar planilhas por tag:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar planilhas.' });
    }
};

exports.getRevisionsByPlanilha = async (req, res) => {
    const { idProjeto, idTag, nomePlanilha } = req.body;
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT Revisao
            FROM (
                SELECT Revisao FROM DadosBlockSet WHERE IdProjeto = ? AND IdTag = ? AND NomePlanilha = ?
                UNION
                SELECT Revisao FROM pixeasy WHERE IdProjeto = ? AND IdTag = ? AND NomePlanilha = ?
            ) as t
            ORDER BY Revisao
        `, [idProjeto, idTag, nomePlanilha, idProjeto, idTag, nomePlanilha]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar revisões:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar revisões.' });
    }
};

exports.getProcessableItems = async (req, res) => {
    const { idProjeto, idTag, nomePlanilha, revisao, codMatFilter } = req.body;
    try {
        let filter = "";
        const params = [];

        if (idProjeto) { filter += " AND tbl.IdProjeto = ?"; params.push(idProjeto); }
        if (idTag) { filter += " AND tbl.IdTag = ?"; params.push(idTag); }
        if (nomePlanilha) { filter += " AND tbl.NomePlanilha = ?"; params.push(nomePlanilha); }
        if (revisao !== undefined && revisao !== -1) { filter += " AND tbl.Revisao = ?"; params.push(revisao); }
        if (codMatFilter) { filter += " AND tbl.Part_Reference LIKE ?"; params.push(`%${codMatFilter}%`); }

        const query = `
            SELECT 
                MIN(tbl.IdDado) AS IdDado, 
                MAX(tbl.TabelaOrigem) AS TabelaOrigem, 
                SUM(tbl.PD_qty) as PD_qty, 
                tbl.Part_Reference, 
                SUM(tbl.Part_total_qty) as Part_total_qty, 
                tbl.Revisao as Revisao, 
                MAX(tbl.IdProjeto) as IdProjeto, 
                MAX(tbl.IdTag) as IdTag, 
                MAX(tbl.NomeProjeto) as NomeProjeto, 
                MAX(tbl.NomeTag) as NomeTag, 
                MAX(tbl.NomePlanilha) as NomePlanilha, 
                MAX(tbl.IdOrdemServico) as IdOrdemServico, 
                MAX(tbl.DescricaoOS) as DescricaoOS 
            FROM (
                SELECT d.IdDado, 'DadosBlockSet' AS TabelaOrigem, d.PD_qty, COALESCE(NULLIF(d.Part_reference, ''), d.PD_reference) as Part_Reference, COALESCE(NULLIF(d.Part_total_qty, 0), d.PD_qty) as Part_total_qty, d.Revisao, d.IdProjeto, d.IdTag, d.NomeProjeto, d.NomeTag, d.NomePlanilha, COALESCE(d.IdOrdemServico,0) as IdOrdemServico, COALESCE(d.DescricaoOS,'') as DescricaoOS FROM DadosBlockSet d 
                UNION ALL 
                SELECT p.IdDado, 'pixeasy' AS TabelaOrigem, p.UG_SBU_Quantity as PD_qty, COALESCE(NULLIF(p.Referencia_P, ''), p.Referencia) as Part_Reference, COALESCE(NULLIF(p.Reference_quantity, 0), p.UG_SBU_Quantity) as Part_total_qty, p.Revisao, p.IdProjeto, p.IdTag, p.NomeProjeto, p.NomeTag, p.NomePlanilha, COALESCE(p.IdOrdemServico,0) as IdOrdemServico, COALESCE(p.DescricaoOS,'') as DescricaoOS FROM pixeasy p 
            ) AS tbl 
            WHERE 1=1 ${filter}
            GROUP BY tbl.Revisao, tbl.Part_Reference 
            ORDER BY tbl.Revisao ASC, MIN(tbl.IdDado) ASC
        `;

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar itens processáveis:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar itens.' });
    }
};

exports.processItems = async (req, res) => {
    const { idOSDestino, items, usuario } = req.body;

    if (!idOSDestino || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Dados insuficientes para processamento.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get OS Info
        const [osRows] = await connection.query("SELECT Projeto, Tag, DescTag, IdProjeto, IdTag FROM ordemservico WHERE IdOrdemServico = ?", [idOSDestino]);
        if (osRows.length === 0) throw new Error("OS de destino não encontrada.");
        const osInfo = osRows[0];

        // 2. Prepare Tables (Check Columns) - Already handled by initStructure but let's be safe
        // Logic from VB.NET: Delete existing items from OS and reset associations
        await connection.query("DELETE FROM ordemservicoitem WHERE IdOrdemServico = ?", [idOSDestino]);
        await connection.query("UPDATE DadosBlockSet SET IdOrdemServico = 0, DescricaoOS = '' WHERE IdOrdemServico = ?", [idOSDestino]);
        await connection.query("UPDATE pixeasy SET IdOrdemServico = 0, DescricaoOS = '' WHERE IdOrdemServico = ?", [idOSDestino]);
        await connection.query("UPDATE ordemservico SET QtdeTotalItens = 0, QtdeTotalPecas = 0 WHERE IdOrdemServico = ?", [idOSDestino]);

        let itensProcessados = 0;
        let totalPecasIncluidas = 0;
        const missingMaterials = [];

        for (const item of items) {
            // DELTA LOGIC
            let processQty = item.Part_total_qty;
            let processPdQty = item.PD_qty;
            let prevIdOS = 0;
            let prevQty = 0;
            let isDelta = false;

            if (item.Revisao > 0) {
                const [prevRows] = await connection.query(`
                    SELECT MAX(IdOrdemServico) as IdOS, MAX(Reference_quantity) as Qty 
                    FROM (
                        SELECT IdOrdemServico, COALESCE(NULLIF(Part_total_qty, 0), PD_qty) as Reference_quantity FROM DadosBlockSet 
                        WHERE COALESCE(NULLIF(Part_reference, ''), PD_reference) = ? AND IdProjeto = ? AND IdTag = ? AND NomePlanilha = ? AND Revisao < ?
                        UNION ALL
                        SELECT IdOrdemServico, COALESCE(NULLIF(Reference_quantity, 0), UG_SBU_Quantity) as Reference_quantity FROM pixeasy 
                        WHERE COALESCE(NULLIF(Referencia_P, ''), Referencia) = ? AND IdProjeto = ? AND IdTag = ? AND NomePlanilha = ? AND Revisao < ?
                    ) AS all_prev
                `, [item.Part_Reference, item.IdProjeto, item.IdTag, item.NomePlanilha, item.Revisao, 
                    item.Part_Reference, item.IdProjeto, item.IdTag, item.NomePlanilha, item.Revisao]);

                if (prevRows.length > 0) {
                    prevIdOS = prevRows[0].IdOS || 0;
                    prevQty = prevRows[0].Qty || 0;
                }

                if (prevIdOS > 0) {
                    if (item.Part_total_qty <= prevQty) {
                        continue; // Skip already processed items with same or lower qty
                    } else {
                        processQty = item.Part_total_qty - prevQty;
                        processPdQty = processQty; // For simplicity in delta
                        isDelta = true;
                    }
                }
            }

            // CHECK MATERIAL
            const [matRows] = await connection.query("SELECT IdMaterial, DescResumo, DescDetal, Unidade FROM material WHERE CodMatFabricante = ? LIMIT 1", [item.Part_Reference]);
            
            if (matRows.length === 0) {
                missingMaterials.push(item.Part_Reference);
                // Insert into itenspendentes if not already there
                const [pendRows] = await connection.query("SELECT COUNT(1) as cnt FROM itenspendentes WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E <> '*')", [item.Part_Reference]);
                if (pendRows[0].cnt === 0) {
                    await connection.query(`
                        INSERT INTO itenspendentes (CodMatFabricante, DataCriacao, UsuarioCriacao, NomePlanilha, Revisao)
                        VALUES (?, NOW(), ?, ?, ?)
                    `, [item.Part_Reference, usuario, item.NomePlanilha, item.Revisao]);
                }
            } else {
                const mat = matRows[0];
                const typeDesc = isDelta ? `Delta: ${processQty}` : "Total";
                const descDetalhada = `${idOSDestino} [Rev ${item.Revisao} - ${typeDesc}]`;

                // INSERT INTO ordemservicoitem
                await connection.query(`
                    INSERT INTO ordemservicoitem (
                        IdOrdemServico, IdProjeto, Projeto, IdTag, Tag, DescTag, 
                        IdMaterial, CodMatFabricante, DescResumo, DescDetal, qtde, QtdeTotal, Unidade, 
                        DtCad, UsuarioCriacao, Liberado_Engenharia, EnderecoArquivo, Data_Liberacao_Engenharia
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 'S', 'IMPORTADO DA PLANILHA', NOW())
                `, [
                    idOSDestino, osInfo.IdProjeto, osInfo.Projeto, osInfo.IdTag, osInfo.Tag, osInfo.DescTag,
                    mat.IdMaterial, item.Part_Reference, mat.DescResumo, mat.DescDetal, processPdQty, processQty, mat.Unidade,
                    usuario
                ]);

                // UPDATE SOURCE TABLES
                const updateTables = ["DadosBlockSet", "pixeasy"];
                for (const table of updateTables) {
                    const refCol = table === "DadosBlockSet" ? "COALESCE(NULLIF(Part_reference, ''), PD_reference)" : "COALESCE(NULLIF(Referencia_P, ''), Referencia)";
                    
                    // Update exact revision
                    await connection.query(`
                        UPDATE ${table} SET IdOrdemServico = ?, DescricaoOS = ?
                        WHERE ${refCol} = ? AND IdProjeto = ? AND IdTag = ? AND NomePlanilha = ? AND Revisao = ?
                    `, [idOSDestino, descDetalhada, item.Part_Reference, item.IdProjeto, item.IdTag, item.NomePlanilha, item.Revisao]);

                    // Cascade to future revisions
                    await connection.query(`
                        UPDATE ${table} SET IdOrdemServico = ?, DescricaoOS = ?
                        WHERE ${refCol} = ? AND IdProjeto = ? AND IdTag = ? AND NomePlanilha = ? AND Revisao > ? 
                        AND (IdOrdemServico IS NULL OR IdOrdemServico = 0)
                    `, [idOSDestino, descDetalhada, item.Part_Reference, item.IdProjeto, item.IdTag, item.NomePlanilha, item.Revisao]);
                }

                // AGLUTINACAO LOGGING
                const agTable = item.TabelaOrigem === 'pixeasy' ? 'AglutinacaoPixeasy' : 'AglutinacaoBlockSet';
                const qtyCols = item.TabelaOrigem === 'pixeasy' ? 'UG_SBU_Quantity, Reference_quantity' : 'PD_qty, Part_total_qty';
                
                await connection.query(`
                    INSERT INTO ${agTable} (CodMatFabricante, ${qtyCols}, DataAglutinacao, IdProjeto, IdTag, NomeProjeto, NomeTag, NomePlanilha, Revisao)
                    VALUES (?, ?, ?, DATE_FORMAT(NOW(), '%d/%m/%Y %H:%i:%s'), ?, ?, ?, ?, ?, ?)
                `, [item.Part_Reference, processPdQty, processQty, item.IdProjeto, item.IdTag, item.NomeProjeto, item.NomeTag, item.NomePlanilha, item.Revisao]);

                itensProcessados++;
                totalPecasIncluidas += processQty;
            }
        }

        // 3. Update OS Totals
        await connection.query("UPDATE ordemservico SET QtdeTotalItens = ?, QtdeTotalPecas = ? WHERE IdOrdemServico = ?", [itensProcessados, totalPecasIncluidas, idOSDestino]);

        await connection.commit();
        res.json({ 
            success: true, 
            message: 'Processamento concluído com sucesso!',
            processedCount: itensProcessados,
            missingMaterials: missingMaterials
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erro no processamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao processar itens: ' + error.message });
    } finally {
        connection.release();
    }
};
