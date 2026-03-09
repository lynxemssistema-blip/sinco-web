const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// The new routes to insert before the "--- CRUD: Tags (associadas a Projetos) ---" section
const newRoutes = `
// AÇÕES DO PROJETO

// ABRIR PASTA DO PROJETO NO SERVIDOR
app.post('/api/projeto/:id/open-folder', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT EnderecoProjeto FROM projetos WHERE IdProjeto = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Projeto não encontrado' });
        }
        
        const endereco = rows[0].EnderecoProjeto;
        
        if (!endereco) {
            return res.status(400).json({ success: false, message: 'Projeto não possui um endereço de pasta configurado.' });
        }

        const { exec } = require('child_process');
        
        // Usa o Windows Explorer para abrir a pasta no servidor
        exec(\`explorer "\${endereco}"\`, (error) => {
            if (error) {
                console.error(\`Erro ao abrir pasta: \${error}\`);
                return res.status(500).json({ success: false, message: 'Erro ao tentar abrir a pasta no servidor.', error: error.message });
            }
            res.json({ success: true, message: 'Pasta do projeto aberta no servidor com sucesso.' });
        });
        
    } catch (error) {
        console.error('Error opening project folder:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar a abertura de pasta.' });
    }
});

// LIBERAR PROJETO
app.post('/api/projeto/:id/liberar', async (req, res) => {
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
});

// --- CRUD: Tags`;

code = code.replace('// --- CRUD: Tags', newRoutes);

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Rotas do projeto inseridas no server.js');
