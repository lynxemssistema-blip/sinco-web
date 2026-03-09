const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../src/server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// The replacement aims to fix the PROJECT INSERT and UPDATE functionalities.
// We are adding PlanejadoFinanceiro, EntradaPedido.
// We are also extracting IdEmpresa/DescEmpresa from the client combo (or defaulting to 7/'ALFATEC' if empty/not provided).
const startMarkerPost = "app.post('/api/projeto', async (req, res) => {";
const endMarkerPost = "app.put('/api/projeto/:id', async (req, res) => {";

const postReplacement = \`app.post('/api/projeto', async (req, res) => {
    const data = req.body;

    if (!data.Projeto) {
        return res.status(400).json({ success: false, message: 'Nome do projeto é obrigatório' });
    }

    try {
        const now = getCurrentDateTimeBR();
        
        // Tratar IdEmpresa e DescEmpresa na injeção baseando-se no que for possível.
        // O legado fala para captar 'IdEmpresa' baseando na combo de cliente, porém se não tiver a logica na UI, 
        // vamos tentar buscar no banco se o cliente for informado, ou assumir ALFATEC (7).
        let idEmpresa = 7;
        let descEmpresa = 'ALFATEC SISTEMAS EXAUSTAO';
        
        if (data.ClienteProjeto) {
             const [empRows] = await pool.execute('SELECT IdEmpresa, Descricao FROM empresa WHERE Descricao = ? LIMIT 1', [data.ClienteProjeto]);
             if (empRows && empRows.length > 0) {
                 idEmpresa = empRows[0].IdEmpresa;
                 descEmpresa = empRows[0].Descricao;
             }
        }

        // --- INÍCIO DA CRIAÇÃO DO ENDERECO DO PROJETO ---
        const projetoName = data.Projeto ? data.Projeto.trim() : 'PROJETO_SEM_NOME';
        const baseDrive = process.env.ENDERECO_PROJETO || 'G:\\\\MEU DRIVE\\\\ESTRUTURA PADRÃO LYNX\\\\004-PROJETOS';
        const EnderecoProjeto = path.join(baseDrive, projetoName);

        // Tentar criar diretórios (Opcional, não deve travar o insert se falhar)
        try {
            if (!fs.existsSync(EnderecoProjeto)) {
                fs.mkdirSync(EnderecoProjeto, { recursive: true });
                fs.mkdirSync(path.join(EnderecoProjeto, '00-Projeto'));
                fs.mkdirSync(path.join(EnderecoProjeto, '01-Tags'));
                fs.mkdirSync(path.join(EnderecoProjeto, '02-Isometrico'));
                fs.mkdirSync(path.join(EnderecoProjeto, '03-Medição'));
                fs.mkdirSync(path.join(EnderecoProjeto, '04-Qualidade'));
            }
        } catch (dirError) {
            console.error('Erro ao criar diretorio de projeto:', dirError);
        }
        // --- FIM DA CRIAÇÃO DO ENDERECO DO PROJETO ---

        const [result] = await pool.execute(
            \\\`INSERT INTO projetos (
                Projeto, DescProjeto, ClienteProjeto, Responsavel,
                DataPrevisao, PrazoEntrega, StatusProj, DescStatus,
                DataCriacao, CriadoPor, EnderecoProjeto, IdEmpresa, DescEmpresa,
                PlanejadoFinanceiro, EntradaPedido
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\\`,
            [
                data.Projeto?.trim(),
                data.DescProjeto?.trim() || null,
                data.ClienteProjeto?.trim() || null,
                data.Responsavel?.trim() || null,
                data.DataPrevisao ? formatBR(data.DataPrevisao) : null,
                data.PrazoEntrega || null,
                data.StatusProj || 'AT',
                data.DescStatus || 'Ativo',
                now,
                'Sistema',
                EnderecoProjeto,
                idEmpresa,
                descEmpresa,
                data.PlanejadoFinanceiro ? formatBR(data.PlanejadoFinanceiro) : null,
                data.EntradaPedido ? formatBR(data.EntradaPedido) : null
            ]
        );
        res.json({ success: true, message: 'Projeto cadastrado com sucesso', id: result.insertId });
    } catch (error) {
        console.error('Error creating projeto:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar: ' + error.message });
    }
});

\`;

const startIdx = code.indexOf(startMarkerPost);
const endIdx = code.indexOf(endMarkerPost);

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + postReplacement + code.substring(endIdx);
    fs.writeFileSync(serverFile, code, 'utf8');
    console.log("POST api/projeto atualizado.");
} else {
    console.log("Não localizou os marcadores do POST.");
}
