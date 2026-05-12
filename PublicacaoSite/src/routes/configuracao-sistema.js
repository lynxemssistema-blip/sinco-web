/**
 * API Routes - Configuração do Sistema
 * Endpoints para gerenciar configurações do sistema (admin only)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware de autenticação admin (adapte conforme sua implementação)
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado. Apenas administradores.'
        });
    }
    next();
};

/**
 * GET /api/configuracao-sistema
 * Lista todas as configurações do sistema
 */
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { tipo } = req.query;

        let query = 'SELECT * FROM configuracaosistema';
        const params = [];

        if (tipo) {
            query += ' WHERE tipo = ?';
            params.push(tipo);
        }

        query += ' ORDER BY tipo, chave';

        const [configs] = await db.execute(query, params);

        res.json({
            success: true,
            data: configs,
            total: configs.length
        });
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar configurações do sistema',
            error: error.message
        });
    }
});

/**
 * GET /api/configuracao-sistema/:chave
 * Busca configuração específica por chave
 */
router.get('/:chave', requireAdmin, async (req, res) => {
    try {
        const { chave } = req.params;

        const [configs] = await db.execute(
            'SELECT * FROM configuracaosistema WHERE chave = ?',
            [chave]
        );

        if (configs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuração não encontrada'
            });
        }

        res.json({
            success: true,
            data: configs[0]
        });
    } catch (error) {
        console.error('Erro ao buscar configuração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar configuração',
            error: error.message
        });
    }
});

/**
 * POST /api/configuracao-sistema
 * Cria nova configuração
 */
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { chave, valor, descricao, tipo } = req.body;

        if (!chave || !valor) {
            return res.status(400).json({
                success: false,
                message: 'Chave e valor são obrigatórios'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO configuracaosistema (chave, valor, descricao, tipo) 
       VALUES (?, ?, ?, ?)`,
            [chave, valor, descricao || null, tipo || 'outro']
        );

        res.status(201).json({
            success: true,
            message: 'Configuração criada com sucesso',
            data: {
                id: result.insertId,
                chave,
                valor,
                descricao,
                tipo
            }
        });
    } catch (error) {
        console.error('Erro ao criar configuração:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Já existe uma configuração com esta chave'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao criar configuração',
            error: error.message
        });
    }
});

/**
 * PUT /api/configuracao-sistema/:chave
 * Atualiza configuração existente
 */
router.put('/:chave', requireAdmin, async (req, res) => {
    try {
        const { chave } = req.params;
        const { valor, descricao, tipo } = req.body;

        if (!valor) {
            return res.status(400).json({
                success: false,
                message: 'Valor é obrigatório'
            });
        }

        const [result] = await db.execute(
            `UPDATE configuracaosistema 
       SET valor = ?, descricao = ?, tipo = ?
       WHERE chave = ?`,
            [valor, descricao || null, tipo || 'outro', chave]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuração não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Configuração atualizada com sucesso',
            data: { chave, valor, descricao, tipo }
        });
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar configuração',
            error: error.message
        });
    }
});

/**
 * DELETE /api/configuracao-sistema/:chave
 * Remove configuração
 */
router.delete('/:chave', requireAdmin, async (req, res) => {
    try {
        const { chave } = req.params;

        const [result] = await db.execute(
            'DELETE FROM configuracaosistema WHERE chave = ?',
            [chave]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Configuração não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Configuração removida com sucesso'
        });
    } catch (error) {
        console.error('Erro ao remover configuração:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao remover configuração',
            error: error.message
        });
    }
});

/**
 * GET /api/configuracao-sistema/tipos/list
 * Lista tipos de configuração disponíveis
 */
router.get('/tipos/list', requireAdmin, async (req, res) => {
    try {
        const [tipos] = await db.execute(
            'SELECT DISTINCT tipo FROM configuracaosistema ORDER BY tipo'
        );

        res.json({
            success: true,
            data: tipos.map(t => t.tipo)
        });
    } catch (error) {
        console.error('Erro ao buscar tipos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tipos de configuração',
            error: error.message
        });
    }
});

module.exports = router;
