const pool = require('./src/config/db');

async function fixOSItem() {
    let conn;
    try {
        conn = await pool.getConnection();
        const osId = 30;
        const itemId = 33238;
        
        const [osItemRows] = await conn.execute(`SELECT CodMatFabricante FROM ordemservicoitem WHERE IdOrdemServicoItem = ?`, [itemId]);
        if (osItemRows.length === 0) return console.log("Item não encontrado.");
        
        const codmatfabricante = osItemRows[0].CodMatFabricante;
        
        const [procRows] = await conn.execute(`
            SELECT pf.processofabricacao 
            FROM material_processo mp
            JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
            WHERE mp.codmatFabricante = ? AND mp.Ativo IN ('1', 'A')
        `, [codmatfabricante]);
        
        const processosNomes = procRows.map(r => (r.processofabricacao || '').trim().replace(/\s+/g, ''));
        console.log("Processos encontrados para o item:", processosNomes);
        
        for (const procName of processosNomes) {
            if (!procName) continue;
            
            const colBase = procName;
            const columnsToEnsure = [
                { name: `txt${colBase}`, type: 'VARCHAR(1) DEFAULT \'0\'' },
                { name: `sttxt${colBase}`, type: 'VARCHAR(50) DEFAULT NULL' },
                { name: `PlanejadoInicio${colBase}`, type: 'DATE DEFAULT NULL' },
                { name: `PlanejadoFinal${colBase}`, type: 'DATE DEFAULT NULL' },
                { name: `RealizadoInicio${colBase}`, type: 'DATE DEFAULT NULL' },
                { name: `UsuarioRealizadoInicio${colBase}`, type: 'VARCHAR(100) DEFAULT NULL' },
                { name: `RealizadoFinal${colBase}`, type: 'DATE DEFAULT NULL' },
                { name: `UsuarioRealizadoFinal${colBase}`, type: 'VARCHAR(100) DEFAULT NULL' },
                { name: `${colBase}TotalExecutado`, type: 'DECIMAL(10,2) DEFAULT 0' },
                { name: `${colBase}TotalExecutar`, type: 'DECIMAL(10,2) DEFAULT 0' },
                { name: `${colBase}Percentual`, type: 'DECIMAL(5,2) DEFAULT 0' }
            ];
            
            for (const tableName of ['ordemservicoitem', 'ordemservico', 'tags', 'projetos']) {
                const [colRows] = await conn.execute(`SHOW COLUMNS FROM ${tableName}`);
                const existingCols = colRows.map(r => r.Field.toLowerCase());
                for (const col of columnsToEnsure) {
                    if (!existingCols.includes(col.name.toLowerCase())) {
                        try {
                            await conn.execute(`ALTER TABLE ${tableName} ADD COLUMN \`${col.name}\` ${col.type}`);
                            console.log(`Adicionado ${col.name} em ${tableName}`);
                        } catch(e) {
                            console.error(`Erro ao adicionar ${col.name} em ${tableName}:`, e.message);
                        }
                    }
                }
            }
            
            // Habilitar no item
            await conn.execute(`UPDATE ordemservicoitem SET \`txt${colBase}\` = '1' WHERE IdOrdemServicoItem = ?`, [itemId]);
            
            // Habilitar nas tabelas pai (OS)
            await conn.execute(`UPDATE ordemservico SET \`txt${colBase}\` = '1' WHERE IdOrdemServico = ?`, [osId]);
            
            const [osInfo] = await conn.execute(`SELECT IdTag, IdProjeto FROM ordemservico WHERE IdOrdemServico = ?`, [osId]);
            if (osInfo.length > 0) {
                if (osInfo[0].IdTag) {
                    await conn.execute(`UPDATE tags SET \`txt${colBase}\` = '1' WHERE IdTag = ?`, [osInfo[0].IdTag]);
                }
                if (osInfo[0].IdProjeto) {
                    await conn.execute(`UPDATE projetos SET \`txt${colBase}\` = '1' WHERE IdProjeto = ?`, [osInfo[0].IdProjeto]);
                }
            }
        }
        
        console.log("Fix concluído!");
        
    } catch(e) {
        console.error(e);
    } finally {
        if (conn) conn.release();
        process.exit();
    }
}

fixOSItem();
