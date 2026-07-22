const fs = require('fs');

// 1. Add PATCH endpoint to backend
let routeContent = fs.readFileSync('src/routes/pecaManufaturada.js', 'utf8');

if (!routeContent.includes('PATCH /composicao-qtde')) {
  const newEndpoint = `
// ────────────────────────────────────────────────────────────────────────────────
// PATCH /composicao-qtde/:idMontaPeca — Atualiza a quantidade do material na composição
// ────────────────────────────────────────────────────────────────────────────────
router.patch('/composicao-qtde/:idMontaPeca', async (req, res) => {
    try {
        const { idMontaPeca } = req.params;
        const { qtde } = req.body;
        if (qtde === undefined) return res.status(400).json({ success: false, message: 'Quantidade não fornecida' });

        const sql = \`UPDATE montapeca SET PecaQtde = ? WHERE IdMontaPeca = ?\`;
        await db(req).execute(sql, [qtde, idMontaPeca]);

        res.json({ success: true, message: 'Quantidade atualizada' });
    } catch (error) {
        console.error('[PecaManufaturada] PATCH /composicao-qtde:', error.message);
        res.status(500).json({ success: false, message: 'Erro ao atualizar quantidade: ' + error.message });
    }
});

module.exports = router;
`;
  routeContent = routeContent.replace(/module\.exports\s*=\s*router;\s*$/, newEndpoint);
  fs.writeFileSync('src/routes/pecaManufaturada.js', routeContent);
  console.log("Backend route updated successfully.");
}

// 2. Fix the Title in App.tsx
let appContent = fs.readFileSync('frontend/src/App.tsx', 'utf8');

const titleTarget = "return item ? item.label : 'Dashbaord';";
const titleReplacement = `if (activePageId === 'peca-manufaturada' || activePageId === 'peça-manufaturada' || activePageId === 'monta-peca-manufaturada') {
      return 'Montagem Processo Fabricação';
    }
    return item ? item.label : 'Dashboard';`;

if (appContent.includes(titleTarget)) {
  appContent = appContent.replace(titleTarget, titleReplacement);
  fs.writeFileSync('frontend/src/App.tsx', appContent);
  console.log("App.tsx title fixed successfully.");
}
