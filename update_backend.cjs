const fs = require('fs');

let fileContent = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');

// 1. GET /composicao/:idMaterialPeca -> ADD mp.QtdeUnitaria
const getRouteFind = "mp.PecaQtde,";
const getRouteReplace = "mp.PecaQtde,\n                        mp.QtdeUnitaria,";
if (fileContent.includes(getRouteFind) && !fileContent.includes("mp.QtdeUnitaria,")) {
    fileContent = fileContent.replace(getRouteFind, getRouteReplace);
}

// 2. POST /composicao-lote -> ADD QtdeUnitaria
const postInsertFind = `INSERT INTO montapeca
                 (TipoPeca, IdMaterial, PecaQtde, IdMaterialPeca, IdEmpresa, D_E_L_E_T_E,
                  Peso, Valor, UsuarioD_E_L_E_T_E, DataD_E_L_E_T_E, CodMatFabricante,
                  CodMatFabricantePeca, IdMatriz, UsuarioCriacao, DataCriacao)
                 VALUES (?, ?, ?, ?, ?, '', ?, ?, '', '', ?, ?, ?, ?, NOW())`;

const postInsertReplace = `INSERT INTO montapeca
                 (TipoPeca, IdMaterial, PecaQtde, QtdeUnitaria, IdMaterialPeca, IdEmpresa, D_E_L_E_T_E,
                  Peso, Valor, UsuarioD_E_L_E_T_E, DataD_E_L_E_T_E, CodMatFabricante,
                  CodMatFabricantePeca, IdMatriz, UsuarioCriacao, DataCriacao)
                 VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, '', '', ?, ?, ?, ?, NOW())`;

const postValuesFind = `[mat.FamiliaMat || 0, mat.IdMaterial, (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, dezenho.IdMaterial,
                 mat.IdEmpresa || 0, mat.Peso || 0, mat.Valor || 0,
                 cod, codMatFabricantePeca, idMatriz, usuario || 'Sistema']`;
                 
const postValuesReplace = `[mat.FamiliaMat || 0, mat.IdMaterial, 
                 (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, 
                 (mat.PecaQtde !== undefined && mat.PecaQtde !== null && mat.PecaQtde !== "") ? Number(mat.PecaQtde) : 1, 
                 dezenho.IdMaterial,
                 mat.IdEmpresa || 0, mat.Peso || 0, mat.Valor || 0,
                 cod, codMatFabricantePeca, idMatriz, usuario || 'Sistema']`;

if (fileContent.includes(postInsertFind)) {
    fileContent = fileContent.replace(postInsertFind, postInsertReplace);
    fileContent = fileContent.replace(postValuesFind, postValuesReplace);
}

// 3. PATCH /composicao-qtde/:idMontaPeca -> Recursive update
const patchFindRegex = /\/\/ ────────────────────────────────────────────────────────────────────────────────\r?\n\/\/ PATCH \/composicao-qtde\/:idMontaPeca — Atualiza a quantidade de um item na composição\r?\n\/\/ ────────────────────────────────────────────────────────────────────────────────\r?\nrouter\.patch\('\/composicao-qtde\/:idMontaPeca'[\s\S]*?}\);/g;

const patchReplace = `// ────────────────────────────────────────────────────────────────────────────────
// Função Auxiliar para Atualização Recursiva de Quantidades
// ────────────────────────────────────────────────────────────────────────────────
const updateRecursiveQtde = async (pool, idMaterialPecaAtual, multiplicador) => {
    const [filhos] = await pool.execute(
        \`SELECT IdMontaPeca, IdMaterial, QtdeUnitaria FROM montapeca WHERE IdMaterialPeca = ? AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')\`,
        [idMaterialPecaAtual]
    );

    for (const filho of filhos) {
        const novaQtde = (Number(filho.QtdeUnitaria) || 1) * multiplicador;
        await pool.execute(
            \`UPDATE montapeca SET PecaQtde = ? WHERE IdMontaPeca = ?\`,
            [novaQtde, filho.IdMontaPeca]
        );
        // Chamada recursiva para os filhos do filho atual
        if (filho.IdMaterial) {
            await updateRecursiveQtde(pool, filho.IdMaterial, novaQtde);
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
            \`UPDATE montapeca SET PecaQtde = ?, QtdeUnitaria = ? WHERE IdMontaPeca = ?\`,
            [newQtde, newQtde, idMontaPeca]
        );

        // 2. Buscar IdMaterial para cascata
        const [rows] = await pool.execute(
            \`SELECT IdMaterial FROM montapeca WHERE IdMontaPeca = ?\`,
            [idMontaPeca]
        );
        
        if (rows.length > 0 && rows[0].IdMaterial) {
            const idMaterialEditado = rows[0].IdMaterial;
            // 3. Cascata: recalcular a arvore de filhos
            await updateRecursiveQtde(pool, idMaterialEditado, newQtde);
        }

        res.json({ success: true, message: 'Quantidade atualizada (e cascata aplicada) com sucesso.' });
    } catch (error) {
        console.error('[PecaManufaturada] PATCH /composicao-qtde:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao atualizar quantidade: ' + error.message });
    }
});`;

fileContent = fileContent.replace(patchFindRegex, patchReplace);

fs.writeFileSync('src/routes/pecaManufaturada.js', fileContent);
console.log("Backend routes updated successfully.");
