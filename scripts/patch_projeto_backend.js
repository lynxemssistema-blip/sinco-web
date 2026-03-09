const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Atualizar Rotas de Criação (POST) de Projetos 
const oldPostProject = `app.post('/api/projeto', async (req, res) => {
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto  obrigatrio' });
    }

    try {
        const now = getCurrentDateTimeBR();

        const [result] = await pool.execute(
            \`INSERT INTO projetos (
                Projeto, DescProjeto, ClienteProjeto, Responsavel,
                DataPrevisao, PrazoEntrega, StatusProj, DescStatus,
                Descricao, DataCriacao, CriadoPor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao || null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                data.Descricao?.trim() || null,
                now,
                'Sistema'
            ]
        );
        res.json({ success: true, message: 'Projeto cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});`;

const newPostProject = `app.post('/api/projeto', async (req, res) => {
    const data = req.body;

    // VALIDAÇÕES OBRIGATÓRIAS (BtnSalvar_Click)
    if (!data.Projeto) return res.status(400).json({ success: false, message: 'Informe Projeto !' });
    if (!data.Responsavel) return res.status(400).json({ success: false, message: 'Informe Responsavel pelo Projeto !' });
    if (!data.ClienteProjeto) return res.status(400).json({ success: false, message: 'Selecione Cliente!' });
    if (!data.Descricao) return res.status(400).json({ success: false, message: 'Informe descrição Projeto !' });
    if (!data.PrazoEntrega || isNaN(data.PrazoEntrega)) return res.status(400).json({ success: false, message: 'Informe número de dias para entrega do Projeto!' });

    try {
        const now = getCurrentDateTimeBR();
        
        // Regra EnderecoProjeto
        const nomeUpper = data.Projeto.trim().toUpperCase();
        let enderecoProjeto = null;
        
        // Define o base path, podemos configurar uma env var
        const baseEndereco = process.env.ENDERECO_PROJETO || "G:\\\\MEU DRIVE\\\\ESTRUTURA PADRÃO LYNX\\\\004-PROJETOS";
        if (baseEndereco) {
            enderecoProjeto = path.join(baseEndereco, nomeUpper);
            try {
                if (!fs.existsSync(enderecoProjeto)) {
                    fs.mkdirSync(enderecoProjeto, { recursive: true });
                    fs.mkdirSync(path.join(enderecoProjeto, "00-Projeto"), { recursive: true });
                    fs.mkdirSync(path.join(enderecoProjeto, "01-Tags"), { recursive: true });
                    fs.mkdirSync(path.join(enderecoProjeto, "02-Isometrico"), { recursive: true });
                    fs.mkdirSync(path.join(enderecoProjeto, "03-Medição"), { recursive: true });
                    fs.mkdirSync(path.join(enderecoProjeto, "04-Qualidade"), { recursive: true });
                }
            } catch (fsError) {
                console.error("Aviso: Falha ao criar as pastas do projeto no servidor:", fsError);
                // Não bloquear o salve se falhar 
            }
        }

        // Formatação de datas
        const formatBR = (d) => {
            if (!d) return null;
            if (d.includes('/')) return d; // Ja é DD/MM/YYYY
            const parts = d.split('-');
            if (parts.length === 3) return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
            return d;
        };

        const [result] = await pool.execute(
            \`INSERT INTO projetos (
                Projeto, DescProjeto, ClienteProjeto, Responsavel,
                DataPrevisao, PrazoEntrega, StatusProj, DescStatus,
                Descricao, DataCriacao, CriadoPor, EnderecoProjeto,
                DataEntradaPedido, DataPlanejadoFinanceiro
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
            [
                nomeUpper,
                data.DescProjeto?.trim().toUpperCase() || null,
                data.ClienteProjeto?.trim().toUpperCase() || null,
                data.Responsavel?.trim().toUpperCase() || null,
                formatBR(data.DataPrevisao),
                data.PrazoEntrega,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                data.Descricao?.trim().toUpperCase() || null,
                now,
                'Sistema',
                enderecoProjeto?.toUpperCase() || null,
                formatBR(data.EntradaPedido), // Campo novo
                formatBR(data.PlanejadoFinanceiro) // Campo novo
            ]
        );
        res.json({ success: true, message: 'Projeto cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});`;

// 2. Atualizar Rota PUT
const oldPutProject = `app.put('/api/projeto/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto  obrigatrio' });
    }

    try {
        await pool.execute(
            \`UPDATE projetos SET
                Projeto = ?, DescProjeto = ?, ClienteProjeto = ?, Responsavel = ?,
                DataPrevisao = ?, PrazoEntrega = ?, StatusProj = ?, DescStatus = ?,
                Descricao = ?
            WHERE IdProjeto = ?\`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao || null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                data.Descricao?.trim() || null,
                id
            ]
        );
        res.json({ success: true, message: 'Projeto atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});`;

const newPutProject = `app.put('/api/projeto/:id', async (req, res) => {
    const id = req.params.id;
    const data = req.body;

    if (!data.Projeto) return res.status(400).json({ success: false, message: 'Informe Projeto !' });
    if (!data.Responsavel) return res.status(400).json({ success: false, message: 'Informe Responsavel pelo Projeto !' });
    if (!data.ClienteProjeto) return res.status(400).json({ success: false, message: 'Selecione Cliente!' });
    if (!data.Descricao) return res.status(400).json({ success: false, message: 'Informe descrição Projeto !' });

    try {
        const formatBR = (d) => {
            if (!d) return null;
            if (d.includes('/')) return d; 
            const parts = d.split('-');
            if (parts.length === 3) return \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
            return d;
        };

        await pool.execute(
            \`UPDATE projetos SET
                Projeto = ?, DescProjeto = ?, ClienteProjeto = ?, Responsavel = ?,
                DataPrevisao = ?, PrazoEntrega = ?, StatusProj = ?, DescStatus = ?,
                Descricao = ?, DataEntradaPedido = ?, DataPlanejadoFinanceiro = ?
            WHERE IdProjeto = ?\`,
            [
                data.Projeto?.trim().toUpperCase(),
                data.DescProjeto?.trim().toUpperCase() || null,
                data.ClienteProjeto?.trim().toUpperCase() || null,
                data.Responsavel?.trim().toUpperCase() || null,
                formatBR(data.DataPrevisao),
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                data.Descricao?.trim().toUpperCase() || null,
                formatBR(data.EntradaPedido),
                formatBR(data.PlanejadoFinanceiro),
                id
            ]
        );
        res.json({ success: true, message: 'Projeto atualizado com sucesso' });
    } catch (error) {
        console.error('Error updating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar: ' + error.message });
    }
});`;

// 3. Modificar Liberação (Restrição se já liberado)
const oldLiberar = `app.post('/api/projeto/:id/liberar', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();
        
        // Lógica Não-Alfatec padrão (liberado = 'S', DataLiberacao)
        await pool.execute(
            \`UPDATE projetos SET 
                liberado = 'S', 
                DataLiberacao = ?
            WHERE IdProjeto = ?\`,
            [now, req.params.id]
        );
        
        res.json({ success: true, message: 'Projeto liberado com sucesso.' });
    } catch (error) {
        console.error('Error liberating project:', error);
        res.status(500).json({ success: false, message: 'Erro ao liberar o projeto.' });
    }
});`;

const newLiberar = `app.post('/api/projeto/:id/liberar', async (req, res) => {
    try {
        const { usuario } = req.body;
        const now = getCurrentDateTimeBR();
        
        const [rows] = await pool.execute('SELECT liberado FROM projetos WHERE IdProjeto = ?', [req.params.id]);
        if (rows.length > 0 && rows[0].liberado && rows[0].liberado.trim() !== '') {
            return res.status(400).json({ success: false, message: 'O projeto não pode ser liberado pois o status de liberação não está vazio.' });
        }
        
        // Lógica Não-Alfatec padrão (liberado = 'S', DataLiberacao)
        await pool.execute(
            \`UPDATE projetos SET 
                liberado = 'S', 
                DataLiberacao = ?
            WHERE IdProjeto = ?\`,
            [now, req.params.id]
        );
        
        res.json({ success: true, message: 'Projeto liberado com sucesso.' });
    } catch (error) {
        console.error('Error liberating project:', error);
        res.status(500).json({ success: false, message: 'Erro ao liberar o projeto.' });
    }
});`;

if (code.includes('app.post(\'/api/projeto\', async (req, res) => {')) {
    // Normalizing newlines 
    const normalizedCode = code.replace(/\r\n/g, '\n');
    let replaced = normalizedCode;

    // We should do a safer robust replace since spacing varies
    // Let's replace chunks carefully
}

// Since JS code replacement can be tricky, I'll rewrite the specific index ranges
const replaceBlock = (str, markerStart, markerEnd, newStr) => {
    const i = str.indexOf(markerStart);
    if (i === -1) return str;
    const j = str.indexOf(markerEnd, i);
    if (j === -1) return str;
    return str.substring(0, i) + newStr + str.substring(j + markerEnd.length);
};

// 1. Post Projeto
code = replaceBlock(
    code,
    "app.post('/api/projeto', async (req, res) => {",
    "// UPDATE (Put)\n",
    newPostProject + "\n\n// UPDATE (Put)\n"
);

// 2. Put Projeto
code = replaceBlock(
    code,
    "app.put('/api/projeto/:id', async (req, res) => {",
    "// DELETE (Soft Delete)\n",
    newPutProject + "\n\n// DELETE (Soft Delete)\n"
);

// 3. Liberar Projeto
code = replaceBlock(
    code,
    "app.post('/api/projeto/:id/liberar', async (req, res) => {",
    "// --- CRUD: Tags",
    newLiberar + "\n\n// --- CRUD: Tags"
);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Rotas de backend de Projetos atualizadas!');
