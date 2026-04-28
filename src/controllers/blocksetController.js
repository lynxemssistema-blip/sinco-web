const db = require('../config/db');

exports.getBlocksetFiles = async (req, res) => {
    try {
        // Fetch the uploaded files with project and tag information
        const [rows] = await db.query(`
            SELECT p.IdPlanilha, p.NomeArquivo, p.IdProjeto, p.IdTag, p.DataImportacao, p.Revisao,
                   proj.NomeProjeto, t.NomeTag
            FROM PlanilhasBlockSet p
            LEFT JOIN Projeto proj ON p.IdProjeto = proj.IdProjeto
            LEFT JOIN Tag t ON p.IdTag = t.IdTag
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
        // Fetch the specific file info
        const [planilhaRows] = await db.query(`
            SELECT p.IdPlanilha, p.NomeArquivo, p.IdProjeto, p.IdTag, p.DataImportacao, p.Revisao,
                   proj.NomeProjeto, t.NomeTag
            FROM PlanilhasBlockSet p
            LEFT JOIN Projeto proj ON p.IdProjeto = proj.IdProjeto
            LEFT JOIN Tag t ON p.IdTag = t.IdTag
            WHERE p.IdPlanilha = ?
        `, [idPlanilha]);

        if (planilhaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Planilha não encontrada.' });
        }

        // Fetch the data rows for this file
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
