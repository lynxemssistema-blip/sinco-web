/**
 * Script: update_idmatriz_montapeca.js
 * Objetivo: Adicionar coluna IdMatriz à tabela montapeca do lynxlocal
 *           e preencher os registros existentes com o IdMatriz correto.
 *
 * Como o IdMatriz é obtido:
 *   - Busca na tabela central 'conexoes_bancos' o registro do banco 'lynxlocal'
 *   - Usa o campo 'id_matriz' (ou similar) como IdMatriz
 *   - Atualiza todos os registros de montapeca que tenham IdMatriz NULL
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function main() {
    // --- Conexão central (para buscar o IdMatriz do lynxlocal) ---
    const centralPool = mysql.createPool({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port:     process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 2
    });

    // --- Conexão ao banco tenant lynxlocal ---
    const tenantPool = mysql.createPool({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
        database: 'lynxlocal',
        port:     process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 2
    });

    try {
        // 1. Busca o IdMatriz correspondente ao banco lynxlocal
        const [dbRows] = await centralPool.execute(
            `SELECT id, id_matriz FROM conexoes_bancos WHERE db_name = 'lynxlocal' AND ativo = 1 LIMIT 1`
        );

        let idMatriz = null;
        if (dbRows.length > 0) {
            idMatriz = dbRows[0].id_matriz || dbRows[0].id || null;
            console.log(`[INFO] Banco lynxlocal encontrado. id=${dbRows[0].id}, id_matriz=${dbRows[0].id_matriz}`);
        } else {
            console.warn('[WARN] Banco lynxlocal não encontrado em conexoes_bancos. Usando IdMatriz = 1 como fallback.');
            idMatriz = 1;
        }

        console.log(`[INFO] IdMatriz a usar: ${idMatriz}`);

        // 2. Garante que a coluna IdMatriz existe
        try {
            await tenantPool.execute('ALTER TABLE `montapeca` ADD COLUMN `IdMatriz` INT NULL');
            console.log('[INFO] Coluna IdMatriz adicionada à tabela montapeca.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('[INFO] Coluna IdMatriz já existe na tabela montapeca.');
            } else {
                console.error('[ERROR] Falha ao adicionar coluna:', e.message);
            }
        }

        // 3. Conta registros antes
        const [[countBefore]] = await tenantPool.execute(
            'SELECT COUNT(*) as total FROM montapeca WHERE IdMatriz IS NULL'
        );
        console.log(`[INFO] Registros com IdMatriz NULL: ${countBefore.total}`);

        if (countBefore.total === 0) {
            console.log('[INFO] Nenhum registro para atualizar. Finalizando.');
            return;
        }

        // 4. Atualiza todos os registros com IdMatriz NULL
        const [result] = await tenantPool.execute(
            'UPDATE montapeca SET IdMatriz = ? WHERE IdMatriz IS NULL',
            [idMatriz]
        );
        console.log(`[OK] ${result.affectedRows} registro(s) atualizados com IdMatriz = ${idMatriz}`);

        // 5. Verifica resultado
        const [[countAfter]] = await tenantPool.execute(
            'SELECT COUNT(*) as total FROM montapeca WHERE IdMatriz IS NULL'
        );
        console.log(`[INFO] Registros com IdMatriz NULL após update: ${countAfter.total}`);

    } finally {
        await centralPool.end();
        await tenantPool.end();
    }
}

main().catch(err => {
    console.error('[FATAL]', err.message);
    process.exit(1);
});
