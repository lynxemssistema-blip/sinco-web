const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(file, 'utf8');

const startMarker = `app.post('/api/ordemservico/:id/incluir-materiais-dinamico', async (req, res) => {`;
const startIndex = content.indexOf(startMarker);

if (startIndex === -1) {
    console.error("Endpoint not found!");
    process.exit(1);
}

// Find the end of the endpoint (first `});` at the same indentation level, or just by searching for it after startIndex)
const endStr = `});\n\n\n// --- Apontamento de Produ`; // Not reliable, let's find the exact text we injected
const endMarker = `        if (conn) conn.release();\n    }\n});`;
const endIndex = content.indexOf(endMarker, startIndex);

if (endIndex === -1) {
    console.error("End of endpoint not found!");
    process.exit(1);
}

const fullEndIndex = endIndex + endMarker.length;

const newEndpoint = `app.post('/api/ordemservico/:id/incluir-materiais-dinamico', async (req, res) => {
    let conn = null;
    try {
        const osId = req.params.id;
        const { itensSelecionados, osContext } = req.body;
        
        if (!itensSelecionados || !itensSelecionados.length) {
            return res.status(400).json({ success: false, message: 'Nenhum material selecionado.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [osRows] = await conn.execute(\`SELECT Liberado_Engenharia FROM ordemservico WHERE IdOrdemServico = ?\`, [osId]);
        if (osRows.length === 0) throw new Error('OS nÃ£o encontrada');
        if (osRows[0].Liberado_Engenharia === 'S' || osRows[0].Liberado_Engenharia === 'SIM') {
            throw new Error('OS jÃ¡ liberada, nÃ£o pode incluir materiais');
        }

        // Helper para checar e criar colunas dinamicamente
        async function ensureColumns(tableName, columnsToEnsure) {
            const [colRows] = await conn.execute(\`SHOW COLUMNS FROM \${tableName}\`);
            const existingCols = colRows.map(r => r.Field.toLowerCase());
            for (const col of columnsToEnsure) {
                if (!existingCols.includes(col.name.toLowerCase())) {
                    try {
                        await conn.execute(\`ALTER TABLE \${tableName} ADD COLUMN \\\`\${col.name}\\\` \${col.type}\`);
                    } catch(e) {
                        console.error(\`Erro ao adicionar coluna \${col.name} em \${tableName}:\`, e.message);
                    }
                }
            }
        }

        let adicionados = 0;
        
        for (const item of itensSelecionados) {
            const { codmatfabricante, qtde, acabamento } = item;
            
            const [matRows] = await conn.execute(
                \`SELECT * FROM material WHERE CodMatFabricante = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') LIMIT 1\`,
                [codmatfabricante]
            );
            
            if (matRows.length === 0) continue;
            const mat = matRows[0];
            
            const [procRows] = await conn.execute(\`
                SELECT pf.processofabricacao 
                FROM material_processo mp
                JOIN processofabricacao pf ON mp.IdProcesso = pf.IdProcessoFabricacao
                WHERE mp.codmatFabricante = ? AND mp.Ativo = 1
            \`, [codmatfabricante]);
            
            const processosNomes = procRows.map(r => (r.processofabricacao || '').trim().replace(/\\s+/g, ''));
            const colunasDinamicasVals = {};

            for (const procName of processosNomes) {
                if (!procName) continue;
                
                const colBase = procName;
                const columnsToEnsure = [
                    { name: \`txt\${colBase}\`, type: 'VARCHAR(1) DEFAULT \\'0\\'' },
                    { name: \`sttxt\${colBase}\`, type: 'VARCHAR(50) DEFAULT NULL' },
                    { name: \`PlanejadoInicio\${colBase}\`, type: 'DATE DEFAULT NULL' },
                    { name: \`PlanejadoFinal\${colBase}\`, type: 'DATE DEFAULT NULL' },
                    { name: \`RealizadoInicio\${colBase}\`, type: 'DATE DEFAULT NULL' },
                    { name: \`UsuarioRealizadoInicio\${colBase}\`, type: 'VARCHAR(100) DEFAULT NULL' },
                    { name: \`RealizadoFinal\${colBase}\`, type: 'DATE DEFAULT NULL' },
                    { name: \`UsuarioRealizadoFinal\${colBase}\`, type: 'VARCHAR(100) DEFAULT NULL' },
                    { name: \`\${colBase}TotalExecutado\`, type: 'DECIMAL(10,2) DEFAULT 0' },
                    { name: \`\${colBase}TotalExecutar\`, type: 'DECIMAL(10,2) DEFAULT 0' },
                    { name: \`\${colBase}Percentual\`, type: 'DECIMAL(5,2) DEFAULT 0' }
                ];
                
                // 1. Garantir colunas em TODA a hierarquia
                await ensureColumns('ordemservicoitem', columnsToEnsure);
                await ensureColumns('ordemservico', columnsToEnsure);
                await ensureColumns('tags', columnsToEnsure);
                await ensureColumns('projetos', columnsToEnsure);
                
                // 2. Atualizar as tabelas pai (OS, Tag, Projeto) para habilitar o processo
                if (osId) {
                    await conn.execute(\`UPDATE ordemservico SET \\\`txt\${colBase}\\\` = '1' WHERE IdOrdemServico = ?\`, [osId]);
                }
                if (osContext?.IdTag) {
                    await conn.execute(\`UPDATE tags SET \\\`txt\${colBase}\\\` = '1' WHERE IdTag = ?\`, [osContext.IdTag]);
                }
                if (osContext?.IdProjeto) {
                    await conn.execute(\`UPDATE projetos SET \\\`txt\${colBase}\\\` = '1' WHERE IdProjeto = ?\`, [osContext.IdProjeto]);
                }

                // Habilitar a flag deste processo no item
                colunasDinamicasVals[\`txt\${colBase}\`] = '1';
            }
            
            const qtdeTotalNum = Number(qtde) || 0;
            const pesoUnit = Number(mat.Peso) || 0;
            const areaUnit = Number(mat.AreaPintura) || 0;
            
            const cols = [
                'IdOrdemServico', 'CodMatFabricante', 'DescResumo', 'DescDetal', 'QtdeTotal',
                'Acabamento', 'Peso', 'AreaPintura', 'Espessura', 'Altura', 'Largura',
                'Unidade', 'MaterialSW', 'EnderecoArquivo', 'ProdutoPrincipal',
                'IdProjeto', 'IdTag', 'Projeto', 'Tag', 'DescTag', 'IdEmpresa', 'DescEmpresa',
                'UsuarioCriacao', 'CriadoPor', 'DataCriacao', 'Liberado_Engenharia', 'Fator'
            ];
            
            const vals = [
                osId, codmatfabricante, mat.DescResumo, mat.DescDetal, qtdeTotalNum,
                acabamento, (pesoUnit * qtdeTotalNum), (areaUnit * qtdeTotalNum), mat.Espessura, mat.Altura, mat.Largura,
                mat.Unidade, mat.MaterialSW, mat.EnderecoArquivo, mat.ProdutoPrincipal,
                osContext?.IdProjeto || null, osContext?.IdTag || null, osContext?.Projeto || null,
                osContext?.Tag || null, osContext?.DescTag || null, osContext?.IdEmpresa || null, osContext?.DescEmpresa || null,
                'Sistema', 'Sistema', new Date(), 'N', 1
            ];
            
            for (const [key, val] of Object.entries(colunasDinamicasVals)) {
                cols.push(key);
                vals.push(val);
            }
            
            const sqlInsert = \`
                INSERT INTO ordemservicoitem (\${cols.map(c => \`\\\`\${c}\\\`\`).join(', ')})
                VALUES (\${cols.map(()=>'?').join(', ')})
            \`;
            
            const [insertRes] = await conn.execute(sqlInsert, vals);
            await inicializarPrimeiroSetor(conn, insertRes.insertId);
            
            adicionados++;
        }

        await recalcularQuantidadesTotais(osId, conn);

        await conn.commit();
        res.json({ success: true, message: \`\${adicionados} materiais incluÃ­dos com sucesso!\`, adicionados });
    } catch (e) {
        if (conn) await conn.rollback();
        console.error(e);
        res.status(500).json({ success: false, message: e.message || 'Erro ao incluir materiais' });
    } finally {
        if (conn) conn.release();
    }
});`;

content = content.slice(0, startIndex) + newEndpoint + content.slice(fullEndIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('Endpoint atualizado com sucesso!');
