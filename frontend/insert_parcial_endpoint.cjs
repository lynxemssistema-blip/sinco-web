const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', 'utf8');

const anchor = '// DELETE: Excluir apontamento parcial';
const idx = file.indexOf(anchor);
console.log('DELETE anchor at:', idx);

if (idx >= 0) {
  const newEndpoint = `// POST: Registrar apontamento PARCIAL como excecao (aceita qualquer recurso sem validacao de setor)
app.post('/api/apontamento-parcial', async (req, res) => {
    const { IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, CriadoPor } = req.body;

    if (!IdOrdemServicoItem || !Processo || !QtdeProduzida) {
        return res.status(400).json({ success: false, message: 'IdOrdemServicoItem, Processo e QtdeProduzida sao obrigatorios' });
    }

    const inputQty = parseFloat(QtdeProduzida);
    if (isNaN(inputQty) || inputQty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantidade deve ser maior que zero' });
    }

    const queryPool = req.tenantDbPool || pool;
    const conn = await queryPool.getConnection();
    try {
        await conn.beginTransaction();

        const now = getCurrentDateTimeBR();

        const [itemRows] = await conn.execute(
            'SELECT QtdeTotal FROM ordemservicoitem WHERE IdOrdemServicoItem = ?',
            [IdOrdemServicoItem]
        );
        if (itemRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Item nao encontrado' });
        }

        const qtdeTotal = parseFloat(itemRows[0].QtdeTotal) || 0;
        const usuario = CriadoPor || 'Sistema';
        const processoNormalizado = String(Processo).trim();

        await conn.execute(
            \`INSERT INTO ordemservicoitemcontrole (IdOrdemServicoItem, IdOrdemServico, Processo, QtdeProduzida, QtdeTotal, TipoApontamento, Situacao, CriadoPor, DataCriacao) VALUES (?, ?, ?, ?, ?, 'Parcial', 'P', ?, ?)\`,
            [IdOrdemServicoItem, IdOrdemServico || null, processoNormalizado, inputQty, qtdeTotal, usuario, now]
        );

        await conn.commit();
        console.log('[API Apontamento Parcial] Item=' + IdOrdemServicoItem + ' | Processo=' + processoNormalizado + ' | Qtde=' + inputQty);
        res.json({ success: true, message: 'Apontamento parcial registrado com sucesso.' });

    } catch (error) {
        await conn.rollback();
        console.error('[API Apontamento Parcial] Erro:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar apontamento parcial.' });
    } finally {
        conn.release();
    }
});

`;

  file = file.substring(0, idx) + newEndpoint + file.substring(idx);
  fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', file);
  console.log('✅ Endpoint /api/apontamento-parcial inserted');
} else {
  console.log('❌ Anchor not found');
  // Try first few chars
  const idx2 = file.indexOf('DELETE: Excluir apontamento');
  console.log('Alt search:', idx2);
}
