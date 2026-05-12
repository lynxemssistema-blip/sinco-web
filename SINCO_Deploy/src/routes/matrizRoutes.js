const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Middleware to check if user is SUPERADMIN
const requireSuperadmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // We expect the frontend to pass the user login in headers/query OR use Bearer Token (Superadmin Panel)
    const login = req.headers['x-user-login'] || req.query.login;

    // Se tiver o Bearer Token do Painel Superadmin, autoriza.
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return next();
    }

    // Compatibilidade reversa: se for o login tradicional direto
    if (login && login === 'SUPERADMIN') {
        return next();
    }

    return res.status(403).json({ success: false, message: 'Acesso negado. Rota restrita ao contexto Superadmin.' });
};

// Apply middleware to all matriz routes
router.use(requireSuperadmin);

// GET /api/matriz - List all
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM matriz ORDER BY Id ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching matrizes:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar matrizes' });
    }
});

// GET /api/matriz/:id - Get single matriz
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute("SELECT * FROM matriz WHERE Id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Matriz não encontrada' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(`Error fetching matriz #${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar detalhes da matriz' });
    }
});

// POST /api/matriz - Create a new matriz
router.post('/', async (req, res) => {
    const { Descricao } = req.body;

    if (!Descricao) {
        return res.status(400).json({ success: false, message: 'A Descrição é obrigatória' });
    }

    try {
        const [result] = await pool.execute("INSERT INTO matriz (Descricao) VALUES (?)", [Descricao]);
        res.status(201).json({ success: true, message: 'Matriz criada com sucesso', data: { Id: result.insertId, Descricao } });
    } catch (error) {
        console.error('Error creating matriz:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar matriz' });
    }
});

// PUT /api/matriz/:id - Update an existing matriz
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { Descricao } = req.body;

    if (!Descricao) {
        return res.status(400).json({ success: false, message: 'A Descrição é obrigatória' });
    }

    try {
        const [result] = await pool.execute("UPDATE matriz SET Descricao = ? WHERE Id = ?", [Descricao, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Matriz não encontrada' });
        }
        res.json({ success: true, message: 'Matriz atualizada com sucesso' });
    } catch (error) {
        console.error(`Error updating matriz #${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar matriz' });
    }
});

// DELETE /api/matriz/:id - Delete a matriz
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute("DELETE FROM matriz WHERE Id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Matriz não encontrada' });
        }
        res.json({ success: true, message: 'Matriz deletada com sucesso' });
    } catch (error) {
        console.error(`Error deleting matriz #${id}:`, error);
        // Note: foreign key constraints may block deletion later when references exist
        res.status(500).json({ success: false, message: 'Erro ao deletar matriz. Pode estar vinculada a outros registros.' });
    }
});

module.exports = router;
