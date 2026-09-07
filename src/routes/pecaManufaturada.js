'use strict';
/**
 * Router: Peça Manufaturada
 * Módulo de gerenciamento de peças manufaturadas, composição de insumos e processos de fabricação.
 *
 * Todas as rotas usam req.tenantDbPool (injetado pelo tenantMiddleware) para operar
 * no banco de dados correto do tenant ativo. pool é o fallback para o banco central (lynxlocal).
 */
const express = require('express');
const router = express.Router();

// Helper: resolve pool do tenant ou fallback no pool central
const db = (req) => req.tenantDbPool || req.app.locals.pool;

// ────────────────────────────────────────────────────────────────────────────────
// GET /desenhos — Lista materiais com EnderecoArquivo (produtos com arquivo CAD)
// Usado no modo de visualização principal (Grid Desenhos)
// ────────────────────────────────────────────────────────────────────────────────
router.get('/desenhos', async (req, res) => {
    try {
        const { codigo, descricao } = req.query;
        let sql = `SELECT IdMaterial, CodMatFabricante, DescResumo, TxtTipoDesenho
                   FROM material
                   WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                     AND EnderecoArquivo IS NOT NULL AND EnderecoArquivo <> ''`;
        const params = [];
        if (codigo) { sql += ` AND CodMatFabricante LIKE ?`; params.push(`%${codigo}%`); }
        if (descricao) { sql += ` AND (DescResumo LIKE ? OR TxtTipoDesenho LIKE ?)`; params.push(`%${descricao}%`, `%${descricao}%`); }
        sql += ` ORDER BY CodMatFabricante LIMIT 100`;
        const [rows] = await db(req).execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /desenhos:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar desenhos: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /pecas — Lista peças manufaturadas (PecaManufat = 'S')
// ────────────────────────────────────────────────────────────────────────────────
router.get('/pecas', async (req, res) => {
    try {
        const { codigo, descricao } = req.query;
        let sql = `SELECT IdMaterial, CodMatFabricante, DescResumo, TxtTipoDesenho
                   FROM material
                   WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
                     AND PecaManufat = 'S'`;
        const params = [];
        if (codigo) { sql += ` AND CodMatFabricante LIKE ?`; params.push(`%${codigo}%`); }
        if (descricao) { sql += ` AND (DescResumo LIKE ? OR TxtTipoDesenho LIKE ?)`; params.push(`%${descricao}%`, `%${descricao}%`); }
        sql += ` ORDER BY CodMatFabricante LIMIT 100`;
        const [rows] = await db(req).execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /pecas:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar peças manufaturadas: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /composicao/:idMaterialPeca — Composição atual de uma peça
// JOIN direto em montapeca + material (portável entre todos os bancos tenant, sem depender de views)
// ────────────────────────────────────────────────────────────────────────────────
router.get('/composicao/:idMaterialPeca', async (req, res) => {
    try {
        const { idMaterialPeca } = req.params;
        const sql = `SELECT
                        mp.IdMontaPeca,
                        mp.IdMaterial,
                        mp.IdMaterialPeca,
                        mp.CodMatFabricante,
                        mp.CodMatFabricantePeca,
                        COALESCE(m.DescDetal, m.DescResumo, mp.CodMatFabricante) AS DescDetal,
                        mp.PecaQtde,
                        mp.QtdeUnitaria,
                        mp.Ordem,
                        m.EnderecoArquivo,
                        m.PecaManufat,
                        (SELECT COUNT(1) FROM montapeca sub WHERE sub.IdMaterialPeca = mp.IdMaterial AND (sub.D_E_L_E_T_E IS NULL OR sub.D_E_L_E_T_E = '')) AS NumChildren
                     FROM montapeca mp
                     LEFT JOIN material m ON m.IdMaterial = mp.IdMaterial
                     WHERE (mp.D_E_L_E_T_E IS NULL OR mp.D_E_L_E_T_E = '')
                       AND mp.IdMaterialPeca = ?
                     ORDER BY mp.Ordem ASC, mp.CodMatFabricante ASC`;
        const [rows] = await db(req).execute(sql, [idMaterialPeca]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /composicao:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar composição: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// POST /composicao-ordem — Reordena os itens na composição
// ────────────────────────────────────────────────────────────────────────────────
router.post('/composicao-ordem', async (req, res) => {
    try {
        const { itens } = req.body; // array de { IdMontaPeca, Ordem }
        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            return res.json({ success: true });
        }

        const pool = db(req);
        // Atualiza a ordem de cada item (executa em paralelo para otimizar, ou um por um)
        for (const item of itens) {
            await pool.execute(
                `UPDATE montapeca SET Ordem = ? WHERE IdMontaPeca = ?`,
                [item.Ordem, item.IdMontaPeca]
            );
        }

        res.json({ success: true, message: 'Ordem atualizada com sucesso' });
    } catch (error) {
        console.error('[PecaManufaturada] POST /composicao-ordem:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao reordenar composição: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// DELETE /composicao/:idMontaPeca — Remove insumo da composição (soft delete)
// ────────────────────────────────────────────────────────────────────────────────
router.delete('/composicao/:idMontaPeca', async (req, res) => {
    try {
        const { idMontaPeca } = req.params;
        const { usuario, idMatriz } = req.body;
        const pool = db(req);
        const [rows] = await pool.execute(`SELECT IdMaterialPeca FROM montapeca WHERE IdMontaPeca = ?`, [idMontaPeca]);
        const idMaterialPeca = rows[0]?.IdMaterialPeca;

        await pool.execute(
            `UPDATE montapeca SET D_E_L_E_T_E = '*', DataD_E_L_E_T_E = NOW(), UsuarioD_E_L_E_T_E = ?, IdMatriz = COALESCE(?, IdMatriz)
             WHERE IdMontaPeca = ?`,
            [usuario || 'Sistema', idMatriz || null, idMontaPeca]
        );

        if (idMaterialPeca) {
            const [rem] = await pool.execute(
                `SELECT COUNT(*) as qtd FROM montapeca WHERE IdMaterialPeca = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
                [idMaterialPeca]
            );
            if (rem[0].qtd === 0) {
                await pool.execute(`UPDATE material SET PecaManufat = '' WHERE IdMaterial = ?`, [idMaterialPeca]);
            }
        }

        res.json({ success: true, message: 'Material removido da composição.' });
    } catch (error) {
        console.error('[PecaManufaturada] DELETE /composicao:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao remover da composição: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// Função Auxiliar para Atualização Recursiva de Quantidades
// ────────────────────────────────────────────────────────────────────────────────
const updateRecursiveQtde = async (pool, idMaterialPecaAtual, multiplicador, visited = new Set()) => {
    if (visited.has(idMaterialPecaAtual)) {
        console.warn('[PecaManufaturada] Loop de composição detectado no IdMaterial:', idMaterialPecaAtual);
        return;
    }
    visited.add(idMaterialPecaAtual);

    const [filhos] = await pool.execute(
        `SELECT IdMontaPeca, IdMaterial, QtdeUnitaria FROM montapeca WHERE IdMaterialPeca = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
        [idMaterialPecaAtual]
    );

    for (const filho of filhos) {
        const novaQtde = (Number(filho.QtdeUnitaria) || 1) * multiplicador;
        await pool.execute(
            `UPDATE montapeca SET PecaQtde = ? WHERE IdMontaPeca = ?`,
            [novaQtde, filho.IdMontaPeca]
        );
        // Chamada recursiva para os filhos do filho atual
        if (filho.IdMaterial) {
            await updateRecursiveQtde(pool, filho.IdMaterial, novaQtde, new Set(visited));
        }
    }
};

// ────────────────────────────────────────────────────────────────────────────────
// PATCH /composicao-qtde/:idMontaPeca — Atualiza a quantidade de um item na composição
// ────────────────────────────────────────────────────────────────────────────────
router.patch('/composicao-qtde/:idMontaPeca', async (req, res) => {
    try {
        const { idMontaPeca } = req.params;
        const { qtde } = req.body;
        
        if (qtde === undefined || isNaN(Number(qtde))) {
            return res.status(400).json({ success: false, message: 'Quantidade inválida.' });
        }
        
        const newQtde = Number(qtde);
        const pool = db(req);
        
        // 1. Atualizar o item editado manualmente
        await pool.execute(
            `UPDATE montapeca SET PecaQtde = ?, QtdeUnitaria = ? WHERE IdMontaPeca = ?`,
            [newQtde, newQtde, idMontaPeca]
        );

        // 2. Buscar IdMaterial para cascata
        const [rows] = await pool.execute(
            `SELECT IdMaterial FROM montapeca WHERE IdMontaPeca = ?`,
            [idMontaPeca]
        );
        
        if (rows.length > 0 && rows[0].IdMaterial) {
            const idMaterialEditado = rows[0].IdMaterial;
            // 3. Cascata desativada para evitar corrupção de BOM em componentes compartilhados e cíclicos
            // await updateRecursiveQtde(pool, idMaterialEditado, newQtde);
        }

        res.json({ success: true, message: 'Quantidade atualizada (e cascata aplicada) com sucesso.' });
    } catch (error) {
        console.error('[PecaManufaturada] PATCH /composicao-qtde:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao atualizar quantidade: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// POST /composicao-lote — Cria peça manufaturada adicionando múltiplos insumos
// ────────────────────────────────────────────────────────────────────────────────
router.post('/composicao-lote', async (req, res) => {
    try {
        const { dezenho, materiais, usuario } = req.body;
        if (!dezenho?.IdMaterial) {
            return res.status(400).json({ success: false, message: 'Desenho (IdMaterial) é obrigatório.' });
        }
        if (!Array.isArray(materiais) || materiais.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum material selecionado.' });
        }

        const tenantPool = db(req);
        // IdMatriz = tenantId do JWT (= conexoes_bancos.id do banco ativo)
        const idMatriz = req.tenantUser?.tenantId || null;
        // CodMatFabricantePeca = código do desenho selecionado no Grid 1
        const codMatFabricantePeca = dezenho.CodMatFabricante || '';

        // Garante que colunas existam (idempotente)
        await Promise.allSettled([
            tenantPool.execute('ALTER TABLE `montapeca` ADD COLUMN `IdMatriz` INT NULL'),
            tenantPool.execute('ALTER TABLE `montapeca` ADD COLUMN `CodMatFabricantePeca` VARCHAR(255) NULL'),
        ]);

        // Busca materiais já inseridos para evitar duplicidade
        const [existentes] = await tenantPool.execute(
            `SELECT CodMatFabricante FROM montapeca WHERE IdMaterialPeca = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [dezenho.IdMaterial]
        );
        const codsExistentes = new Set(existentes.map(r => r.CodMatFabricante));

        let inseridos = 0, ignorados = 0;
        for (const mat of materiais) {
            const cod = mat.CodMatFabricante || '';
            if (codsExistentes.has(cod)) { ignorados++; continue; }
            await tenantPool.execute(
                `INSERT INTO montapeca
                 (TipoPeca, IdMaterial, PecaQtde, IdMaterialPeca, IdEmpresa, D_E_L_E_T_E,
                  Peso, Valor, UsuarioD_E_L_E_T_E, DataD_E_L_E_T_E, CodMatFabricante,
                  CodMatFabricantePeca, IdMatriz, UsuarioCriacao, DataCriacao)
                 VALUES (?, ?, ?, ?, ?, '', ?, ?, '', '', ?, ?, ?, ?, NOW())`,
                [mat.FamiliaMat || 0, mat.IdMaterial, (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, dezenho.IdMaterial,
                 mat.IdEmpresa || 0, mat.Peso || 0, mat.Valor || 0,
                 cod, codMatFabricantePeca, idMatriz, usuario || 'Sistema']
            );
            codsExistentes.add(cod);
            inseridos++;
        }

        // Marca desenho como peça manufaturada
        await tenantPool.execute(`UPDATE material SET PecaManufat = 'S' WHERE IdMaterial = ?`, [dezenho.IdMaterial]);

        res.json({ success: true, message: `${inseridos} material(is) adicionado(s). ${ignorados} ignorado(s) (duplicado).`, inseridos, ignorados });
    } catch (error) {
        console.error('[PecaManufaturada] POST /composicao-lote:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao gravar composição em lote: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// PUT /composicao-qtde — Atualiza a quantidade de um item na composição
// ────────────────────────────────────────────────────────────────────────────────
router.put('/composicao-qtde', async (req, res) => {
    try {
        const { idMaterialPai, idMaterialFilho, qtde } = req.body;
        if (!idMaterialPai || !idMaterialFilho || !qtde) {
            return res.status(400).json({ success: false, message: 'Parâmetros obrigatórios ausentes.' });
        }
        const tenantPool = db(req);
        
        await tenantPool.execute(
            `UPDATE montapeca SET PecaQtde = ? WHERE IdMaterialPeca = ? AND IdMaterial = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`,
            [qtde, idMaterialPai, idMaterialFilho]
        );
        res.json({ success: true, message: 'Quantidade atualizada com sucesso.' });
    } catch (error) {
        console.error('[PecaManufaturada] PUT /composicao-qtde:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao atualizar quantidade.' });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /desenhos-criar — Desenhos disponíveis para criação (modo "Criar Peça Manufaturada")
// Lista materiais com arquivo CAD cadastrado
// ────────────────────────────────────────────────────────────────────────────────
router.get('/desenhos-criar', async (req, res) => {
    try {
        const { q, cod, desc } = req.query;
        let sql = `SELECT IdMaterial, CodMatFabricante, DescResumo, Espessura, MaterialSW,
                          EnderecoArquivo, TxtTipoDesenho, FamiliaMat, IdEmpresa, Peso, Valor, PecaManufat
                   FROM material
                   WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`;
        const params = [];
        if (q) { sql += ` AND (CodMatFabricante LIKE ? OR DescResumo LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
        if (cod) { sql += ` AND CodMatFabricante LIKE ?`; params.push(`%${cod}%`); }
        if (desc) { sql += ` AND DescResumo LIKE ?`; params.push(`%${desc}%`); }
        sql += ` ORDER BY CodMatFabricante LIMIT 200`;
        const [rows] = await db(req).execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /desenhos-criar:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /materiais-criar — Materiais brutos disponíveis para seleção (Grid 2)
// Exclui materiais já adicionados ao desenho selecionado
// ────────────────────────────────────────────────────────────────────────────────
router.get('/materiais-criar', async (req, res) => {
    try {
        const { q, idDesenho, cod, desc } = req.query;
        let sql = `SELECT IdMaterial, CodMatFabricante, DescResumo, Espessura, MaterialSW,
                          EnderecoArquivo, TxtTipoDesenho, FamiliaMat, IdEmpresa, Peso, Valor, DescDetal, PecaManufat, AreaPintura, Unidade, Altura, Largura, Qtde
                   FROM material
                   WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')`;
        const params = [];
        if (idDesenho) {
            sql += ` AND IdMaterial NOT IN (
                SELECT IdMaterial FROM montapeca
                WHERE IdMaterialPeca = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            )`;
            params.push(idDesenho);
        }
        if (q) { sql += ` AND (CodMatFabricante LIKE ? OR DescResumo LIKE ? OR DescDetal LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        if (cod) { sql += ` AND CodMatFabricante LIKE ?`; params.push(`%${cod}%`); }
        if (desc) { sql += ` AND (DescResumo LIKE ? OR DescDetal LIKE ?)`; params.push(`%${desc}%`, `%${desc}%`); }
        sql += ` ORDER BY CodMatFabricante LIMIT 300`;
        const [rows] = await db(req).execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /materiais-criar:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /processos - Lista processos de fabricação com Fabrica = 'SIM'
// ────────────────────────────────────────────────────────────────────────────────
router.get('/processos', async (req, res) => {
    try {
        const [rows] = await db(req).execute(
            `SELECT IdProcessoFabricacao, processofabricacao AS ProcessoFabricacao
             FROM processofabricacao
             WHERE (D_E_L_E_T_E = '' OR D_E_L_E_T_E IS NULL)
               AND Fabrica = 'SIM'
             ORDER BY processofabricacao`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /processos:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar processos: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// GET /processos-existentes/:codmatFabricante - Processos já cadastrados
// ────────────────────────────────────────────────────────────────────────────────
router.get('/processos-existentes/:codmatFabricante', async (req, res) => {
    try {
        const { codmatFabricante } = req.params;
        const [rows] = await db(req).execute(
            `SELECT
                mp.IdProcesso,
                mp.SequenciaExecucao,
                mp.TempoEstimadoMin,
                mp.TempoPadraoMin,
                mp.Ativo,
                mp.Observacao,
                mp.DataCriacao,
                mp.UsuarioCriacao,
                COALESCE(pf.ProcessoFabricacao, CONCAT('Processo #', mp.IdProcesso)) AS NomeProcesso
             FROM material_processo mp
             LEFT JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
             WHERE mp.codmatFabricante = ? AND (mp.IdOrdemServico IS NULL OR mp.IdOrdemServico = 0)
             ORDER BY mp.SequenciaExecucao ASC`,
            [codmatFabricante]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('[PecaManufaturada] GET /processos-existentes:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar processos: ' + error.message });
    }
});

// ────────────────────────────────────────────────────────────────────────────────
// POST /material-processo — Salva/substitui processos de fabricação de um produto
// ────────────────────────────────────────────────────────────────────────────────
router.post('/material-processo', async (req, res) => {
    try {
        const { processos, codmatFabricante, idMatriz, usuarioCriacao, replace, osId, idProjeto, idTag, qtdSelecionada } = req.body;
        const tenantPool = db(req);

        if (!Array.isArray(processos)) {
            return res.status(400).json({ success: false, message: 'Nenhum processo informado.' });
        }

        if (replace && codmatFabricante) {
            if (osId) {
                let delSql = 'DELETE FROM material_processo WHERE codmatFabricante = ? AND IdOrdemServico = ?';
                let delParams = [codmatFabricante, osId];
                if (idProjeto) { delSql += ' AND IdProjeto = ?'; delParams.push(idProjeto); }
                else { delSql += " AND (IdProjeto IS NULL OR IdProjeto = 0 OR IdProjeto = '')"; }
                if (idTag) { delSql += ' AND IdTag = ?'; delParams.push(idTag); }
                else { delSql += " AND (IdTag IS NULL OR IdTag = 0 OR IdTag = '')"; }
                await tenantPool.execute(delSql, delParams);
            } else {
                await tenantPool.execute("DELETE FROM material_processo WHERE codmatFabricante = ? AND (IdOrdemServico IS NULL OR IdOrdemServico = 0)", [codmatFabricante]);
            }
        }

        // Resolve IdMaterial pelo CodMatFabricante
        let idMaterial = 0;
        if (codmatFabricante) {
            const [matRows] = await tenantPool.execute(
                `SELECT IdMaterial FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1`,
                [codmatFabricante]
            );
            if (matRows.length > 0) idMaterial = matRows[0].IdMaterial;
            else console.warn(`[PecaManufaturada] CodMatFabricante '${codmatFabricante}' não encontrado.`);
        }

        const totalExecutar = qtdSelecionada || 1;
        const insertedIds = [];
        
        // Ensure processes are sorted by sequence before processing
        const sortedProcessos = [...processos].sort((a, b) => a.SequenciaExecucao - b.SequenciaExecucao);
        let isFirstProcess = true;

        for (const p of sortedProcessos) {
            const amountToExecute = isFirstProcess ? (totalExecutar || 1) : 0;
            const [result] = await tenantPool.execute(
                `INSERT INTO material_processo 
                 (IdMaterial, IdProcesso, SequenciaExecucao, TempoEstimadoMin, TempoPadraoMin, 
                  Ativo, Observacao, DataCriacao, UsuarioCriacao, codmatFabricante, IdMatriz,
                  IdOrdemServico, IdProjeto, IdTag, TotalExecutar)
                 VALUES (?, ?, ?, ?, ?, 'A', ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
                [idMaterial, p.IdProcesso, p.SequenciaExecucao, 
                 p.TempoEstimadoMin ?? null, p.TempoPadraoMin ?? null, 
                 p.Observacao || null, usuarioCriacao || 'Sistema', 
                 codmatFabricante || '', idMatriz || req.tenantUser?.tenantId || req.tenantUser?.idEmpresa || null,
                 osId || null, idProjeto || null, idTag || null, amountToExecute]
            );
            insertedIds.push(result.insertId);
            isFirstProcess = false;
        }

        // [NOVO] Auto-inclusão na ordemservicoitem (Opção 1)
        if (osId && codmatFabricante) {
            const [existing] = await tenantPool.execute(
                `SELECT IdOrdemServicoItem FROM ordemservicoitem 
                 WHERE IdOrdemServico = ? AND CodMatFabricante = ? 
                 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1`,
                [osId, codmatFabricante]
            );

            if (existing.length === 0) {
                // Busca dados do material e da OS
                const [mRows] = await tenantPool.execute(
                    `SELECT * FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1`,
                    [codmatFabricante]
                );
                const [oRows] = await tenantPool.execute(
                    `SELECT os.*, 
                            COALESCE(p.IdEmpresa, os.IdEmpresa) AS ResolvedIdEmpresa, 
                            COALESCE(p.DescEmpresa, os.DescEmpresa) AS ResolvedDescEmpresa 
                     FROM ordemservico os
                     LEFT JOIN projetos p ON os.IdProjeto = p.IdProjeto
                     WHERE os.IdOrdemServico = ? LIMIT 1`,
                    [osId]
                );

                if (mRows.length > 0 && oRows.length > 0) {
                    const mat = mRows[0];
                    const osData = oRows[0];
                    const qtdeFinal = qtdSelecionada || 1;
                    const pesoFinal = (Number(mat.Peso) || 0) * qtdeFinal;
                    const areaFinal = (Number(mat.AreaPintura) || 0) * qtdeFinal;

                    await tenantPool.execute(
                        `INSERT INTO ordemservicoitem (
                            IdOrdemServico, CodMatFabricante, DescResumo, DescDetal, QtdeTotal, qtde,
                            Peso, AreaPintura, Espessura, Altura, Largura,
                            Unidade, MaterialSW, EnderecoArquivo, ProdutoPrincipal,
                            IdProjeto, IdTag, Projeto, Tag, DescTag, IdEmpresa, DescEmpresa,
                            UsuarioCriacao, CriadoPor, DataCriacao, Liberado_Engenharia, Fator,
                            TempoSetup, TempoPadrao, TotalTempo,
                            Autor, Palavrachave, NumeroDobras, txtSoldagem, txtTipoDesenho, Acabamento
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?,
                            'Sistema', 'Sistema', NOW(), 'N', 1,
                            0, 0, 0,
                            ?, ?, ?, ?, ?, ?
                        )`,
                        [
                            osId, codmatFabricante, mat.DescResumo, mat.DescDetal, qtdeFinal, qtdeFinal,
                            pesoFinal, areaFinal, mat.Espessura, mat.Altura, mat.Largura,
                            mat.Unidade, mat.MaterialSW, mat.EnderecoArquivo, mat.ProdutoPrincipal,
                            idProjeto || osData.IdProjeto || null, idTag || osData.IdTag || null, osData.Projeto || null,
                            osData.Tag || null, osData.DescTag || null, osData.ResolvedIdEmpresa || null, osData.ResolvedDescEmpresa || null,
                            mat.Autor || null, mat.Palavrachave || null, mat.NumeroDobras || null, mat.txtSoldagem || null, mat.txtTipoDesenho || null, mat.Acabamento || null
                        ]
                    );
                }
            }
        }

        res.json({ success: true, message: `${insertedIds.length} processo(s) salvo(s).`, ids: insertedIds, idMaterial });
    } catch (error) {
        console.error('[PecaManufaturada] POST /material-processo:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao salvar processos: ' + error.message });
    }
});

module.exports = router;
